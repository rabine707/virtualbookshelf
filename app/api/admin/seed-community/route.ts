import { sanitizeSeedBooks, seedCommunityCatalog } from "../../../../lib/community-seed";
import { BOOKTOK_TRENDING_TITLES, sanitizeTrendingTitles } from "../../../../lib/booktok-seed";
import { fetchBookTokStarterSeeds, fetchOpenLibraryStarterSeeds, starterPresetQueries } from "../../../../lib/openlibrary-seed";

export const runtime = "nodejs";

function unauthorized() { return Response.json({ error: "Unauthorized." }, { status: 401 }); }

export async function POST(request: Request) {
  const adminSecret = process.env.SEED_ADMIN_SECRET?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vrkuimrfdkejfhpxlwlf.supabase.co").trim();
  if (!adminSecret || !serviceRoleKey) return Response.json({ error: "Community seeding is not configured." }, { status: 503 });
  const supplied = request.headers.get("x-seed-admin-secret") || "";
  if (supplied !== adminSecret) return unauthorized();

  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ error: "Invalid seed request." }, { status: 400 });
  const payload = body as Record<string, unknown>;

  try {
    let rawRecords: unknown;
    if (payload.mode === "openlibrary") {
      const explicitQueries = Array.isArray(payload.queries) ? payload.queries.filter((x): x is string => typeof x === "string") : [];
      const queries = explicitQueries.length ? explicitQueries : starterPresetQueries(payload.preset);
      rawRecords = await fetchOpenLibraryStarterSeeds(queries, Number(payload.limitPerQuery) || 20);
    } else if (payload.mode === "records") {
      rawRecords = payload.records;
    } else {
      const customTitles = sanitizeTrendingTitles(payload.titles);
      const titles = customTitles.length ? customTitles : BOOKTOK_TRENDING_TITLES;
      const fallbackQueries = starterPresetQueries(payload.preset);
      rawRecords = await fetchBookTokStarterSeeds(titles, fallbackQueries, Math.max(1, Math.min(150, Number(payload.maxCandidates) || 150)));
    }
    const records = sanitizeSeedBooks(rawRecords);
    const result = await seedCommunityCatalog(supabaseUrl, serviceRoleKey, records);
    return Response.json({ ok: true, strategy: payload.mode || "booktok", ...result });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Seeding failed." }, { status: 400 });
  }
}
