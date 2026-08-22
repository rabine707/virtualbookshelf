import { createHmac } from "node:crypto";
import { spineRequestBookKey } from "../../../lib/spine-requests";
import { enforceApiRateLimit } from "../../../lib/rate-limit";

export const runtime = "nodejs";

function cleanText(value: unknown, max: number) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max)
    : "";
}

function requestAddress(request: Request) {
  return request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
}

export async function POST(request: Request) {
  const rateLimited = await enforceApiRateLimit(request);
  if (rateLimited) return rateLimited;

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vrkuimrfdkejfhpxlwlf.supabase.co").trim();
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) return Response.json({ error: "Spine recommendations are not configured yet." }, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return Response.json({ error: "Invalid recommendation." }, { status: 400 }); }

  const title = cleanText(body.title, 500);
  const author = cleanText(body.author, 500);
  const isbn = cleanText(body.isbn, 40);
  const asin = cleanText(body.asin, 40);
  const coverUrl = cleanText(body.coverUrl, 4000);
  if (!title) return Response.json({ error: "A book title is required." }, { status: 400 });

  const bookKey = spineRequestBookKey({ title, author, isbn, asin });
  const addressHash = createHmac("sha256", serviceRoleKey)
    .update(`spine-request:${requestAddress(request)}`)
    .digest("hex");
  const response = await fetch(`${supabaseUrl}/rest/v1/spine_requests`, {
    method: "POST",
    cache: "no-store",
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ requested_by: null, requester_ip_hash: addressHash, book_key: bookKey, title, author, isbn: isbn || null, asin: asin || null, cover_url: coverUrl || null }),
  });
  if (response.ok) return Response.json({ requested: true, duplicate: false });

  const error = await response.json().catch(() => null) as { code?: string; message?: string } | null;
  if (response.status === 409 || error?.code === "23505") return Response.json({ requested: true, duplicate: true });
  console.error("[spine-requests] insert failed", response.status, error?.code, error?.message);
  return Response.json({ error: "Could not save this recommendation." }, { status: 502 });
}
