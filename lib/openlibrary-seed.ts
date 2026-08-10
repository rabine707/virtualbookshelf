import { BOOKTOK_TRENDING_TITLES, type TrendingSeedTitle } from "./booktok-seed";

type OpenLibraryDoc = { key?: string; title?: string; author_name?: string[]; cover_i?: number; isbn?: string[] };
type OpenLibrarySearch = { docs?: OpenLibraryDoc[] };
const USER_AGENT = "ShelfOfFame/0.1 (community catalog seeding; https://github.com/rabine707/virtualbookshelf)";

export const STARTER_SEED_PRESETS = {
  core: [
    "subject:dark_romance",
    "subject:litrpg",
    "subject:mafia_romance",
    "subject:progression_fantasy",
    "subject:enemies_to_lovers",
    "subject:isekai",
    "subject:contemporary_romance",
    "subject:romance",
  ],
  romance: ["subject:romance", "subject:contemporary_romance", "subject:romantic_suspense"],
  darkRomance: ["subject:dark_romance", "subject:mafia_romance", "subject:enemies_to_lovers"],
  litrpg: ["subject:litrpg", "subject:progression_fantasy", "subject:isekai"],
} as const;

function bestIsbn(values?: string[]) {
  if (!Array.isArray(values)) return null;
  return values.find((v) => /^978\d{10}$/.test(v)) || values.find((v) => /^\d{13}$/.test(v)) || values.find((v) => /^\d{9}[\dX]$/i.test(v)) || null;
}

export function starterPresetQueries(preset: unknown) {
  if (preset === "romance") return [...STARTER_SEED_PRESETS.romance];
  if (preset === "dark-romance") return [...STARTER_SEED_PRESETS.darkRomance];
  if (preset === "litrpg") return [...STARTER_SEED_PRESETS.litrpg];
  return [...STARTER_SEED_PRESETS.core];
}

async function searchOne(query: string, limit: number) {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("fields", "key,title,author_name,cover_i,isbn");
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) throw new Error(`Open Library search failed for “${query}”.`);
  return response.json() as Promise<OpenLibrarySearch>;
}

function pushDocs(records: Array<Record<string, unknown>>, seen: Set<string>, data: OpenLibrarySearch, confidence = 80) {
  for (const doc of data.docs || []) {
    const title = doc.title?.trim(); const author = doc.author_name?.[0]?.trim();
    if (!title || !author || !doc.cover_i) continue;
    const sourceIdentifier = doc.key || `cover:${doc.cover_i}`;
    const dedupe = `${sourceIdentifier}:${doc.cover_i}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    records.push({ title, author, isbn: bestIsbn(doc.isbn), coverUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`, source: "openlibrary", sourceIdentifier, sourceTitle: title, sourceAuthor: author, confidence: doc.isbn?.length ? Math.max(confidence, 90) : confidence });
  }
}

export async function fetchBookTokStarterSeeds(
  titles: TrendingSeedTitle[] = BOOKTOK_TRENDING_TITLES,
  fallbackQueries: readonly string[] = STARTER_SEED_PRESETS.core,
  maxCandidates = 150,
) {
  const records: Array<Record<string, unknown>> = []; const seen = new Set<string>();
  const curated = await Promise.all(titles.slice(0, 100).map(async (row) => {
    const query = `title:\"${row.title.replace(/\"/g, "")}\" author:\"${row.author.replace(/\"/g, "")}\"`;
    try { return await searchOne(query, 3); } catch { return { docs: [] } as OpenLibrarySearch; }
  }));
  curated.forEach((data) => pushDocs(records, seen, data, 96));
  if (records.length >= maxCandidates) return records.slice(0, maxCandidates);

  const fallback = await Promise.all([...new Set(fallbackQueries)].slice(0, 8).map(async (query) => {
    try { return await searchOne(query, 25); } catch { return { docs: [] } as OpenLibrarySearch; }
  }));
  fallback.forEach((data) => pushDocs(records, seen, data, 74));
  return records.slice(0, maxCandidates);
}

export async function fetchOpenLibraryStarterSeeds(queries: string[], limitPerQuery = 20) {
  const uniqueQueries = [...new Set(queries.map((q) => q.trim()).filter(Boolean))].slice(0, 8);
  const perQuery = Math.max(1, Math.min(25, limitPerQuery));
  const records: Array<Record<string, unknown>> = []; const seen = new Set<string>();
  const batches = await Promise.all(uniqueQueries.map(async (query) => {
    try { return await searchOne(query, perQuery); } catch { return { docs: [] } as OpenLibrarySearch; }
  }));
  batches.forEach((data) => pushDocs(records, seen, data, 72));
  return records.slice(0, 150);
}
