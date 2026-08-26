type RateLimitPolicy = {
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed?: boolean;
  remaining?: number;
  retry_after_seconds?: number;
};

const POLICIES: Record<string, RateLimitPolicy> = {
  "/api/generate-spine": { limit: 10, windowMs: 10 * 60_000 },
  "/api/web-covers": { limit: 60, windowMs: 60_000 },
  "/api/cover": { limit: 240, windowMs: 60_000 },
  "/api/romance-cover": { limit: 120, windowMs: 60_000 },
  "/api/asin": { limit: 120, windowMs: 60_000 },
  "/api/book-search": { limit: 90, windowMs: 60_000 },
  "/api/book-tags": { limit: 90, windowMs: 60_000 },
  "/api/cover-download": { limit: 30, windowMs: 60_000 },
  "/api/spine-requests": { limit: 60, windowMs: 60 * 60_000 },
};

function clientAddress(request: Request) {
  const vercelForwarded = request.headers.get("x-vercel-forwarded-for");
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const value = vercelForwarded?.split(",")[0]?.trim()
    || forwarded?.split(",")[0]?.trim()
    || realIp?.trim()
    || "unknown";
  return value.slice(0, 128);
}

async function hashBucketKey(pathname: string, address: string) {
  const input = new TextEncoder().encode(`${pathname}:${address}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function tooManyRequests(retryAfterSeconds: number) {
  return Response.json(
    { error: "Too many requests. Please try again shortly." },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(Math.max(1, retryAfterSeconds)),
      },
    },
  );
}

export async function enforceApiRateLimit(request: Request) {
  const pathname = new URL(request.url).pathname;
  const policy = POLICIES[pathname];
  if (!policy) return null;

  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vrkuimrfdkejfhpxlwlf.supabase.co").trim();

  // The paid AI endpoint still has its own authenticated, per-user generation
  // allowance. This shared limiter is defense-in-depth for distributed Vercel
  // traffic and for the public upstream-search endpoints.
  if (!serviceRoleKey || !supabaseUrl) return null;

  try {
    const bucketKey = await hashBucketKey(pathname, clientAddress(request));
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/consume_api_rate_limit`, {
      method: "POST",
      cache: "no-store",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_bucket_key: bucketKey,
        p_limit: policy.limit,
        p_window_seconds: Math.max(1, Math.ceil(policy.windowMs / 1_000)),
      }),
    });

    if (!response.ok) {
      console.warn("Shared API rate-limit check failed", response.status);
      return null;
    }

    const payload = await response.json() as RateLimitResult[] | RateLimitResult | null;
    const result = Array.isArray(payload) ? payload[0] : payload;
    if (!result || result.allowed !== false) return null;

    return tooManyRequests(Number(result.retry_after_seconds || 1));
  } catch (error) {
    console.warn(
      "Shared API rate-limit check failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return null;
  }
}
