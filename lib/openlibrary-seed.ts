type OpenLibraryDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  isbn?: string[];
};

type OpenLibrarySearch = { docs?: OpenLibraryDoc[] };

const USER_AGENT = "ShelfOfFame/0.1 (community catalog seeding; https://github.com/rabine707/virtualbookshelf)";

export const STARTER_SEED_PRESETS = {
  core: [
    "subject:romance",
    "subject:dark_romance",
    "subject:litrpg",
  ],
  romance: [
    "subject:romance",
    "subject:contemporary_romance",
    "subject:romantic_suspense",
  ],
  darkRomance: [
    "subject:dark_romance",
    "subject:mafia_romance",
    "subject:enemies_to_lovers",
  ],
  litrpg: [
    "subject:litrpg",
    "subject:progression_fantasy",
    "subject:isekai",
  ],
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

export async function fetchOpenLibraryStarterSeeds(queries: string[], limitPerQuery = 20) {
  const uniqueQueries = [...new Set(queries.map((q) => q.trim()).filter(Boolean))].slice(0, 6);
  const perQuery = Math.max(1, Math.min(25, limitPerQuery));
  const records: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();

  for (const query of uniqueQueries) {
    const url = new URL("https://openlibrary.org/search.json");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", String(perQuery));
    url.searchParams.set("fields", "key,title,author_name,cover_i,isbn");
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Open Library search failed for “${query}”.`);
    const data = await response.json() as OpenLibrarySearch;
    for (const doc of data.docs || []) {
      const title = doc.title?.trim();
      const author = doc.author_name?.[0]?.trim();
      if (!title || !author || !doc.cover_i) continue;
      const sourceIdentifier = doc.key || `cover:${doc.cover_i}`;
      const dedupe = `${sourceIdentifier}:${doc.cover_i}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      records.push({
        title,
        author,
        isbn: bestIsbn(doc.isbn),
        coverUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
        source: "openlibrary",
        sourceIdentifier,
        sourceTitle: title,
        sourceAuthor: author,
        confidence: doc.isbn?.length ? 88 : 72,
      });
    }
  }
  return records.slice(0, 150);
}
