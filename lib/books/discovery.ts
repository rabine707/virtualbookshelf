import {
  discoverGoogleIsbns,
  discoverOpenLibraryIsbns,
  lookupGoogleCovers,
  lookupOpenLibraryCovers,
  type CoverCandidate,
} from "./providers";

function uniqueCovers(covers: CoverCandidate[]) {
  const seen = new Set<string>();
  return covers
    .sort((a, b) => b.score - a.score)
    .filter((cover) => {
      const key = cover.url.replace(/&zoom=\d+/i, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8)
    .map(({ url, source }) => ({ url, source }));
}

export async function lightCoverLookup(title: string, author: string, isbn: string | null) {
  const [google, openLibrary] = await Promise.all([
    lookupGoogleCovers(title, author, isbn),
    lookupOpenLibraryCovers(title, author, isbn),
  ]);
  return uniqueCovers([...openLibrary, ...google]);
}

export async function discoverIsbn(title: string, author: string) {
  const [google, openLibrary] = await Promise.all([
    discoverGoogleIsbns(title, author),
    discoverOpenLibraryIsbns(title, author),
  ]);
  const byIsbn = new Map<string, number>();
  for (const candidate of [...google, ...openLibrary]) {
    byIsbn.set(candidate.isbn, Math.max(candidate.score, byIsbn.get(candidate.isbn) || 0));
  }
  const ranked = [...byIsbn.entries()]
    .map(([isbn, score]) => ({ isbn, score }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best) return null;
  const second = ranked[1];
  const confident = best.score >= 18 || (best.score >= 15 && (!second || best.score - second.score >= 2));
  return confident ? best.isbn : null;
}
