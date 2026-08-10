const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vrkuimrfdkejfhpxlwlf.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_mf0u925xGBkP4iNgxSCjuQ_H4Dp8r1S";

export type GenerationGuardInput = {
  title: string;
  author: string;
  isbn?: string;
  asin?: string;
};

export type GenerationGuardResult = {
  allowed: boolean;
  attempts: number;
  remaining: number;
  sharedSpineUrl?: string;
};

function normalize(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function bookKey(input: GenerationGuardInput) {
  if (input.isbn) return `isbn:${input.isbn}`;
  if (input.asin) return `asin:${input.asin}`;
  return `title:${normalize(input.title)}::${normalize(input.author)}`;
}

function publicSpineUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/spines/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export async function consumeGenerationAttempt(request: Request, input: GenerationGuardInput): Promise<GenerationGuardResult> {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) {
    throw Object.assign(new Error("Sign in to generate AI spines."), { status: 401 });
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consume_spine_generation_attempt`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_book_key: bookKey(input),
      p_title: input.title,
      p_author: input.author,
      p_isbn: input.isbn || null,
      p_asin: input.asin || null,
      p_limit: 3,
    }),
    cache: "no-store",
  });

  const text = await response.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch {}

  if (!response.ok) {
    const message = data && typeof data === "object" && "message" in data
      ? String((data as { message?: unknown }).message || "")
      : "";
    const status = response.status === 401 || response.status === 403 ? 401 : 502;
    throw Object.assign(new Error(message || "Could not verify AI generation allowance."), { status });
  }

  const row = Array.isArray(data) ? data[0] as Record<string, unknown> | undefined : undefined;
  const sharedPath = typeof row?.shared_storage_path === "string" ? row.shared_storage_path : "";
  return {
    allowed: Boolean(row?.allowed),
    attempts: Number(row?.attempts || 0),
    remaining: Number(row?.remaining || 0),
    sharedSpineUrl: sharedPath ? publicSpineUrl(sharedPath) : undefined,
  };
}
