type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitPolicy = {
  limit: number;
  windowMs: number;
};

const POLICIES: Record<string, RateLimitPolicy> = {
  "/api/generate-spine": { limit: 10, windowMs: 10 * 60_000 },
  "/api/scan-shelf": { limit: 12, windowMs: 10 * 60_000 },
  "/api/refine-spines": { limit: 12, windowMs: 10 * 60_000 },
  "/api/scan-shelf-spines": { limit: 18, windowMs: 10 * 60_000 },
  "/api/resolve-scan-book": { limit: 30, windowMs: 60_000 },
  "/api/web-covers": { limit: 60, windowMs: 60_000 },
  "/api/cover": { limit: 240, windowMs: 60_000 },
  "/api/romance-cover": { limit: 120, windowMs: 60_000 },
  "/api/asin": { limit: 120, windowMs: 60_000 },
};

const globalRateLimit = globalThis as typeof globalThis & {
  __shelfOfFameRateLimitBuckets?: Map<string, RateLimitBucket>;
  __shelfOfFameRateLimitOperations?: number;
};

const buckets = globalRateLimit.__shelfOfFameRateLimitBuckets
  ?? (globalRateLimit.__shelfOfFameRateLimitBuckets = new Map<string, RateLimitBucket>());

function clientAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const value = forwarded?.split(",")[0]?.trim() || realIp?.trim() || "unknown";
  return value.slice(0, 128);
}

function cleanup(now: number) {
  globalRateLimit.__shelfOfFameRateLimitOperations = (globalRateLimit.__shelfOfFameRateLimitOperations || 0) + 1;
  const operations = globalRateLimit.__shelfOfFameRateLimitOperations;
  if (operations % 100 !== 0 && buckets.size <= 5_000) return;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }

  if (buckets.size <= 5_000) return;
  const overflow = buckets.size - 4_000;
  let removed = 0;
  for (const key of buckets.keys()) {
    buckets.delete(key);
    removed += 1;
    if (removed >= overflow) break;
  }
}

export function enforceApiRateLimit(request: Request) {
  const policy = POLICIES[new URL(request.url).pathname];
  if (!policy) return null;

  const now = Date.now();
  cleanup(now);

  const pathname = new URL(request.url).pathname;
  const key = `${pathname}:${clientAddress(request)}`;
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now
    ? { count: 1, resetAt: now + policy.windowMs }
    : { count: current.count + 1, resetAt: current.resetAt };

  buckets.set(key, bucket);
  if (bucket.count <= policy.limit) return null;

  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000));
  return Response.json(
    { error: "Too many requests. Please try again shortly." },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}
