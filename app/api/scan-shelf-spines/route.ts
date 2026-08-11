import { enforceApiRateLimit } from "../../../lib/rate-limit";
import { consumeGenerationAttempt } from "../../../lib/spine-generation-guard";
import { imageMimeMatches } from "../../../lib/image-signature";

export const runtime = "nodejs";

const DEFAULT_SPINES_API_URL = "https://spins.app/api/v1";
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function cleanMessage(value: unknown) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 500)
    : "";
}

function authorizationHeader(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) {
    throw Object.assign(new Error("Sign in first to run a SPINES comparison."), { status: 401 });
  }
  return authorization;
}

function providerConfig() {
  const apiKey = process.env.SPINES_API_KEY?.trim();
  const apiUrl = (process.env.SPINES_API_URL?.trim() || DEFAULT_SPINES_API_URL).replace(/\/$/, "");
  return { apiKey, apiUrl };
}

async function providerPayload(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: { code: "UNREADABLE_RESPONSE", message: text.slice(0, 500) } };
  }
}

function unwrapData(payload: Record<string, unknown> | null) {
  if (!payload) return null;
  return payload.data ?? payload;
}

function providerError(payload: Record<string, unknown> | null, fallback: string) {
  const error = payload?.error;
  if (error && typeof error === "object" && !Array.isArray(error)) {
    const row = error as Record<string, unknown>;
    return cleanMessage(row.message) || cleanMessage(row.code) || fallback;
  }
  return cleanMessage(payload?.message) || fallback;
}

async function consumeComparisonCredit(request: Request) {
  const day = new Date().toISOString().slice(0, 10);
  return consumeGenerationAttempt(request, {
    title: `Shelf scan ${day}`,
    author: "Shelf of Fame",
    usageKey: `shelf-scan:${day}`,
    limit: 10,
  });
}

export async function POST(request: Request) {
  const limited = enforceApiRateLimit(request);
  if (limited) return limited;

  try {
    authorizationHeader(request);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Sign in required." }, { status: 401 });
  }

  const { apiKey, apiUrl } = providerConfig();
  if (!apiKey) {
    return Response.json({
      error: "SPINES is ready to test, but SPINES_API_KEY has not been added to this Vercel preview yet.",
      needsConfiguration: true,
    }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Invalid SPINES comparison request." }, { status: 400 });
  }

  const image = form.get("image");
  if (!(image instanceof Blob)) {
    return Response.json({ error: "Choose a bookshelf photo first." }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.has(image.type)) {
    return Response.json({ error: "Use a JPEG, PNG, or WebP bookshelf photo." }, { status: 415 });
  }
  if (image.size <= 0 || image.size > MAX_IMAGE_BYTES) {
    return Response.json({ error: "The prepared comparison image must be 4 MB or smaller." }, { status: 413 });
  }

  const bytes = new Uint8Array(await image.arrayBuffer());
  if (!imageMimeMatches(bytes, image.type)) {
    return Response.json({ error: "That upload is not a valid JPEG, PNG, or WebP image." }, { status: 415 });
  }

  try {
    const allowance = await consumeComparisonCredit(request);
    if (!allowance.allowed) {
      return Response.json({ error: "You have reached today’s shelf-scan preview limit." }, { status: 429 });
    }
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error
      ? Number((error as { status?: unknown }).status)
      : 502;
    return Response.json({
      error: error instanceof Error ? error.message : "Could not verify shelf-scan access.",
    }, { status: status === 401 ? 401 : 502 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${apiUrl}/recognize`, {
      method: "POST",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Shelf of Fame comparison",
        image_base64: Buffer.from(bytes).toString("base64"),
      }),
    });

    const payload = await providerPayload(response);
    if (!response.ok) {
      return Response.json({ error: providerError(payload, "SPINES could not start bookshelf recognition.") }, {
        status: response.status === 429 ? 429 : 502,
      });
    }

    return Response.json({ result: unwrapData(payload) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return Response.json({
      error: timedOut ? "SPINES took too long to accept this recognition job." : "Could not reach SPINES.",
    }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  const limited = enforceApiRateLimit(request);
  if (limited) return limited;

  try {
    authorizationHeader(request);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Sign in required." }, { status: 401 });
  }

  const { apiKey, apiUrl } = providerConfig();
  if (!apiKey) {
    return Response.json({ error: "SPINES_API_KEY is not configured." }, { status: 503 });
  }

  const jobId = new URL(request.url).searchParams.get("job_id")?.trim() || "";
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(jobId)) {
    return Response.json({ error: "Invalid SPINES recognition job id." }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${apiUrl}/recognize/${encodeURIComponent(jobId)}`, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const payload = await providerPayload(response);
    if (!response.ok) {
      return Response.json({ error: providerError(payload, "Could not read the SPINES recognition job.") }, {
        status: response.status === 429 ? 429 : 502,
      });
    }
    return Response.json({ result: unwrapData(payload) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return Response.json({ error: timedOut ? "SPINES status check timed out." : "Could not reach SPINES." }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
