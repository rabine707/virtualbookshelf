import { NextRequest, NextResponse } from "next/server";

type OpenLibraryDoc = {
  title?: string;
  author_name?: string[];
  isbn?: string[];
};

type OpenLibraryResponse = {
  docs?: OpenLibraryDoc[];
};

type GoogleIdentifier = {
  type?: string;
  identifier?: string;
};

type GoogleBook = {
  volumeInfo?: {
    title?: string;
    authors?: string[];
    industryIdentifiers?: GoogleIdentifier[];
  };
};

type GoogleBooksResponse = {
  items?: GoogleBook[];
};

type IsbnCandidate = {
  isbn: string;
  score: number;
};

const STOP_WORDS = new Set([
  "a", "an", "and", "as", "at", "book", "by", "edition", "for", "from", "in", "into",
  "novel", "of", "on", "or", "series", "the", "to", "volume", "with",
]);

function normalize(value?: string) {
  return (value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function words(value?: string) {
  return normalize(value).split(" ").filter(Boolean);
}

function titleWords(value?: string) {
  const all = words(value);
  const useful = all.filter((word) => word.length > 1 && !STOP_WORDS.has(word));
  return useful.length ? [...new Set(useful)] : [...new Set(all)];
}

function stripSeriesSuffix(title: string) {
  let cleaned = title.trim();
  for (let pass = 0; pass < 3; pass += 1) {
    const match = cleaned.match(/\s*[\(\[]([^\)\]]+)[\)\]]\s*$/);
    if (!match) break;
    const metadata = match[1];
    const looksLikeSeries = /#\s*\d+(?:\.\d+)?\b/i.test(metadata)
      || /\b(?:book|volume|vol\.?|part)\s*(?:#|no\.?\s*)?\d+(?:\.\d+)?\b/i.test(metadata)
      || /\b(?:series|duet|trilogy|saga)\b[^\d]{0,30}\d+(?:\.\d+)?\b/i.test(metadata);
    if (!looksLikeSeries) break;
    cleaned = cleaned.slice(0, match.index).trim();
  }
  return cleaned || title.trim();
}

function cleanIsbn(value?: string) {
  const cleaned = (value || "").replace(/[^0-9Xx]/g, "");
  return /^(?:\d{13}|\d{9}[\dXx])$/.test(cleaned) ? cleaned : null;
}

function authorScore(requestedAuthor: string, candidates: string[]) {
  const wanted = words(requestedAuthor);
  if (!wanted.length) return 0;
  const lastName = wanted.at(-1);
  let best = 0;

  for (const candidate of candidates) {
    const found = words(candidate);
    if (!found.length) continue;
    const foundSet = new Set(found);
    const shared = wanted.filter((word) => foundSet.has(word)).length;
    const overlap = shared / wanted.length;

    if (normalize(candidate) === normalize(requestedAuthor)) best = Math.max(best, 10);
    else if (lastName && foundSet.has(lastName) && overlap >= 0.5) best = Math.max(best, 8);
    else if (lastName && foundSet.has(lastName)) best = Math.max(best, 6);
    else if (overlap >= 0.67) best = Math.max(best, 5);
  }

  return best;
}

function titleScore(requestedTitle: string, candidateTitle?: string) {
  const wanted = normalize(stripSeriesSuffix(requestedTitle));
  const found = normalize(candidateTitle);
  if (!wanted || !found) return 0;
  if (wanted === found) return 14;
  if (wanted.includes(found) || found.includes(wanted)) return 11;

  const wantedKeywords = titleWords(wanted);
  const foundSet = new Set(titleWords(found));
  const matches = wantedKeywords.filter((word) => foundSet.has(word)).length;
  const coverage = wantedKeywords.length ? matches / wantedKeywords.length : 0;

  if (coverage >= 0.85 && matches >= 2) return 9;
  if (coverage >= 0.67 && matches >= 2) return 7;
  if (coverage >= 0.5 && matches >= 2) return 5;
  return 0;
}

function candidateScore(title: string, author: string, candidateTitle?: string, candidateAuthors: string[] = []) {
  const t = titleScore(title, candidateTitle);
  if (!t) return 0;

  const a = authorScore(author, candidateAuthors);
  if (author && a < 5) return 0;
  return t + a;
}

function googleIsbn(item: GoogleBook) {
  const ids = item.volumeInfo?.industryIdentifiers || [];
  const isbn13 = ids.find((id) => id.type === "ISBN_13")?.identifier;
  const isbn10 = ids.find((id) => id.type === "ISBN_10")?.identifier;
  return cleanIsbn(isbn13) || cleanIsbn(isbn10);
}

async function discoverFromGoogle(title: string, author: string): Promise<IsbnCandidate[]> {
  const cleanTitle = stripSeriesSuffix(title);
  const queries = [
    author ? `intitle:${cleanTitle} inauthor:${author}` : `intitle:${cleanTitle}`,
    author ? `${cleanTitle} ${author}` : cleanTitle,
  ];
  const results: IsbnCandidate[] = [];

  for (const query of queries) {
    try {
      const params = new URLSearchParams({ q: query, maxResults: "20", printType: "books" });
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`);
      if (!response.ok) continue;
      const data = await response.json() as GoogleBooksResponse;

      for (const item of data.items || []) {
        const isbn = googleIsbn(item);
        if (!isbn) continue;
        const score = candidateScore(title, author, item.volumeInfo?.title, item.volumeInfo?.authors || []);
        if (score >= 13) results.push({ isbn, score: score + 0.25 });
      }
    } catch {
      // A provider miss should not block the normal cover route.
    }
  }

  return results;
}

async function discoverFromOpenLibrary(title: string, author: string): Promise<IsbnCandidate[]> {
  try {
    const params = new URLSearchParams({
      title: stripSeriesSuffix(title),
      fields: "title,author_name,isbn",
      limit: "30",
    });
    if (author) params.set("author", author);

    const response = await fetch(`https://openlibrary.org/search.json?${params.toString()}`);
    if (!response.ok) return [];
    const data = await response.json() as OpenLibraryResponse;
    const results: IsbnCandidate[] = [];

    for (const doc of data.docs || []) {
      const score = candidateScore(title, author, doc.title, doc.author_name || []);
      if (score < 13) continue;

      const preferred = (doc.isbn || [])
        .map(cleanIsbn)
        .filter((value): value is string => Boolean(value))
        .sort((a, b) => b.length - a.length)[0];

      if (preferred) results.push({ isbn: preferred, score });
    }

    return results;
  } catch {
    return [];
  }
}

async function discoverIsbn(title: string, author: string) {
  const [google, openLibrary] = await Promise.all([
    discoverFromGoogle(title, author),
    discoverFromOpenLibrary(title, author),
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

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname !== "/api/cover") return NextResponse.next();

  const params = request.nextUrl.searchParams;
  const title = params.get("title")?.trim() || "";
  const author = params.get("author")?.trim() || "";
  const existingIsbn = cleanIsbn(params.get("isbn") || "");
  const bypass = params.get("isbnDiscovery") === "done";

  if (bypass || existingIsbn || !title) return NextResponse.next();

  const discoveredIsbn = await discoverIsbn(title, author);
  if (!discoveredIsbn) return NextResponse.next();

  const destination = request.nextUrl.clone();
  destination.searchParams.set("isbn", discoveredIsbn);
  destination.searchParams.set("isbnDiscovery", "done");

  try {
    const response = await fetch(destination, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const payload = await response.json() as Record<string, unknown>;
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store");

    return NextResponse.json(
      { ...payload, discoveredIsbn },
      { status: response.status, headers },
    );
  } catch {
    return NextResponse.rewrite(destination);
  }
}

export const config = {
  matcher: "/api/cover",
};
