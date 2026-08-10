import { BOOKTOK_TRENDING_TITLES } from "../../../../../lib/booktok-seed";
import { fetchBookTokStarterSeeds, starterPresetQueries } from "../../../../../lib/openlibrary-seed";
import { sanitizeSeedBooks, seedCommunityCatalog } from "../../../../../lib/community-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serviceHeaders(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

export async function GET() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vrkuimrfdkejfhpxlwlf.supabase.co").trim();
  if (!serviceRoleKey) return Response.json({ error: "Community seeding is not configured." }, { status: 503 });

  const existing = await fetch(`${supabaseUrl}/rest/v1/cover_candidates?select=id&limit=1`, {
    headers: serviceHeaders(serviceRoleKey),
    cache: "no-store",
  });
  if (!existing.ok) return Response.json({ error: "Could not check the community queue." }, { status: 500 });
  const rows = await existing.json();
  if (Array.isArray(rows) && rows.length) {
    return Response.json({ ok: true, skipped: true, reason: "Community queue is already seeded." });
  }

  try {
    const raw = await fetchBookTokStarterSeeds(BOOKTOK_TRENDING_TITLES, starterPresetQueries("core"), 150);
    const records = sanitizeSeedBooks(raw);
    const result = await seedCommunityCatalog(supabaseUrl, serviceRoleKey, records);
    return Response.json({ ok: true, strategy: "booktok-bootstrap", ...result });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Bootstrap seeding failed." }, { status: 500 });
  }
}
