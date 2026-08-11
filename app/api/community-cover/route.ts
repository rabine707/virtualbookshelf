import { createHash } from "node:crypto";
import { enforceApiRateLimit } from "../../../lib/rate-limit";
import { imageMimeMatches } from "../../../lib/image-signature";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vrkuimrfdkejfhpxlwlf.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_mf0u925xGBkP4iNgxSCjuQ_H4Dp8r1S";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type BookRow = { id: string; isbn?: string | null; title?: string; author?: string };
type CandidateRow = {
  id: string;
  book_id?: string | null;
  image_url: string;
  status?: string;
  source_title?: string | null;
  source_author?: string | null;
};
type UserRow = { id?: string };

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalize(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function cleanIsbn(value: string) {
  const cleaned = value.replace(/[^0-9Xx]/g, "");
  return /^(?:\d{13}|\d{9}[\dXx])$/.test(cleaned) ? cleaned : "";
}

function authHeader(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) {
    throw Object.assign(new Error("Sign in to upload a community cover."), { status: 401 });
  }
  return authorization;
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text) as T; } catch { return null; }
}

async function authenticatedUser(authorization: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: authorization },
    cache: "no-store",
  });
  const data = await readJson<UserRow>(response);
  if (!response.ok || !data?.id) throw Object.assign(new Error("Your sign-in session expired. Sign in again."), { status: 401 });
  return data.id;
}

async function restGet<T>(path: string, authorization: string): Promise<T[]> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: authorization },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Could not check the shared cover library.");
  return (await readJson<T[]>(response)) || [];
}

async function resolveBook(title: string, author: string, isbn: string, authorization: string): Promise<BookRow> {
  if (isbn) {
    const params = new URLSearchParams({ select: "id,isbn,title,author", isbn: `eq.${isbn}`, limit: "1" });
    const found = await restGet<BookRow>(`books?${params}`, authorization);
    if (found[0]) return found[0];
  }

  const normalizedTitle = normalize(title);
  const normalizedAuthor = normalize(author);
  const params = new URLSearchParams({
    select: "id,isbn,title,author",
    normalized_title: `eq.${normalizedTitle}`,
    normalized_author: `eq.${normalizedAuthor}`,
    limit: "1",
  });
  const found = await restGet<BookRow>(`books?${params}`, authorization);
  if (found[0]) return found[0];

  const response = await fetch(`${SUPABASE_URL}/rest/v1/books?select=id,isbn,title,author`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: authorization,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      isbn: isbn || null,
      title,
      author,
      normalized_title: normalizedTitle,
      normalized_author: normalizedAuthor,
    }),
    cache: "no-store",
  });
  const created = await readJson<BookRow[]>(response);
  if (response.ok && created?.[0]) return created[0];

  if (isbn) {
    const retryParams = new URLSearchParams({ select: "id,isbn,title,author", isbn: `eq.${isbn}`, limit: "1" });
    const retry = await restGet<BookRow>(`books?${retryParams}`, authorization);
    if (retry[0]) return retry[0];
  }
  throw new Error("Could not attach this cover to a book record.");
}

function publicCoverUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/covers/${path.split("/").map(encodeURIComponent).join("/")}`;
}

async function deleteUploadedObject(path: string, authorization: string) {
  try {
    await fetch(`${SUPABASE_URL}/storage/v1/object/covers/${path.split("/").map(encodeURIComponent).join("/")}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_KEY, Authorization: authorization },
    });
  } catch {
    // Best-effort cleanup only. The metadata unique index remains the source of truth.
  }
}

export async function POST(request: Request) {
  const limited = enforceApiRateLimit(request);
  if (limited) return limited;

  let authorization: string;
  try { authorization = authHeader(request); }
  catch (error) {
    const message = error instanceof Error ? error.message : "Sign in to upload a community cover.";
    return Response.json({ error: message }, { status: 401 });
  }

  let form: FormData;
  try { form = await request.formData(); }
  catch { return Response.json({ error: "Invalid cover upload." }, { status: 400 }); }

  const image = form.get("image");
  const title = cleanText(form.get("title"), 300);
  const author = cleanText(form.get("author"), 200);
  const isbn = cleanIsbn(cleanText(form.get("isbn"), 40));
  const allowVariant = form.get("allowVariant") === "true";

  if (!(image instanceof Blob)) return Response.json({ error: "Choose a cover photo first." }, { status: 400 });
  if (!title || !author) return Response.json({ error: "Confirm the book title and author before uploading a cover." }, { status: 400 });
  if (!ALLOWED_MIME_TYPES.has(image.type)) return Response.json({ error: "Use a JPEG, PNG, or WebP cover photo." }, { status: 415 });
  if (image.size <= 0 || image.size > MAX_IMAGE_BYTES) return Response.json({ error: "Cover photos must be 5 MB or smaller." }, { status: 413 });

  const bytes = new Uint8Array(await image.arrayBuffer());
  if (!imageMimeMatches(bytes, image.type)) return Response.json({ error: "That file is not a valid JPEG, PNG, or WebP image." }, { status: 415 });

  try {
    const userId = await authenticatedUser(authorization);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const duplicateParams = new URLSearchParams({
      select: "id,book_id,image_url,status,source_title,source_author",
      image_sha256: `eq.${sha256}`,
      limit: "1",
    });
    const exact = await restGet<CandidateRow>(`cover_candidates?${duplicateParams}`, authorization);

    const book = await resolveBook(title, author, isbn, authorization);
    if (exact[0]) {
      if (exact[0].book_id && exact[0].book_id !== book.id) {
        return Response.json({
          error: "This exact cover image is already stored for a different book. Double-check the book before uploading it again.",
          exactDuplicate: true,
          duplicateOf: exact[0],
        }, { status: 409 });
      }
      return Response.json({
        duplicate: true,
        imageUrl: exact[0].image_url,
        candidate: exact[0],
        message: "That exact cover is already in the shared library, so we reused it instead of creating a duplicate.",
      });
    }

    const existingParams = new URLSearchParams({
      select: "id,image_url,status,source_title,source_author",
      book_id: `eq.${book.id}`,
      uploaded_by: "not.is.null",
      status: "neq.rejected",
      order: "created_at.desc",
      limit: "4",
    });
    const existing = await restGet<CandidateRow>(`cover_candidates?${existingParams}`, authorization);
    if (existing.length && !allowVariant) {
      return Response.json({
        error: "This book or edition already has a community-uploaded cover. Only add another if yours is genuinely a different cover or edition.",
        possibleDuplicate: true,
        existing,
      }, { status: 409 });
    }

    const extension = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
    const storagePath = `${userId}/${sha256}.${extension}`;
    const storageResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/covers/${storagePath.split("/").map(encodeURIComponent).join("/")}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: authorization,
        "Content-Type": image.type,
        "x-upsert": "false",
      },
      body: bytes,
    });
    if (!storageResponse.ok) {
      const data = await readJson<{ message?: string; error?: string }>(storageResponse);
      return Response.json({ error: data?.message || data?.error || "Could not store that cover photo." }, { status: storageResponse.status === 409 ? 409 : 502 });
    }

    const imageUrl = publicCoverUrl(storagePath);
    const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/cover_candidates?select=id,book_id,image_url,status,source_title,source_author`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: authorization,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        book_id: book.id,
        image_url: imageUrl,
        source: "Community upload",
        source_identifier: isbn || null,
        source_title: title,
        source_author: author,
        status: "pending",
        confidence: isbn ? 95 : 85,
        uploaded_by: userId,
        image_sha256: sha256,
        storage_path: storagePath,
      }),
      cache: "no-store",
    });
    const inserted = await readJson<CandidateRow[]>(insertResponse);
    if (!insertResponse.ok || !inserted?.[0]) {
      await deleteUploadedObject(storagePath, authorization);
      if (insertResponse.status === 409) {
        const raced = await restGet<CandidateRow>(`cover_candidates?${duplicateParams}`, authorization);
        if (raced[0]) {
          return Response.json({ duplicate: true, imageUrl: raced[0].image_url, candidate: raced[0] });
        }
      }
      return Response.json({ error: "The cover image uploaded, but its library record could not be saved." }, { status: 502 });
    }

    return Response.json({
      imageUrl,
      candidate: inserted[0],
      pendingReview: true,
      message: "Cover saved. You can use it immediately; the shared copy is pending community review.",
    }, { status: 201 });
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: unknown }).status) : 500;
    const message = error instanceof Error ? error.message : "Community cover upload failed.";
    return Response.json({ error: message }, { status: status === 401 ? 401 : 502 });
  }
}
