import { enforceApiRateLimit } from "../../../lib/rate-limit";

export const runtime = "nodejs";

const MAX_TITLE_LENGTH = 240;
const MAX_AUTHOR_LENGTH = 180;
const MAX_VISIBLE_TEXT_LENGTH = 500;
const SOURCE_TIMEOUT_MS = 4_500;

type GoogleIdentifier = { type?: string; identifier?: string };
type GoogleItem = {
  volumeInfo?: {
    title?: string;
    authors?: string[];
    industryIdentifiers?: GoogleIdentifier[];
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
      extraLarge?: string;
    };
  };
};
type GoogleResponse = { items?: GoogleItem[] };

type OpenLibraryDoc = {
  title?: string;
  author_name?: string[];
  isbn?: string[];
  cover_i?: number;
};
type OpenLibraryResponse = { docs?: OpenLibraryDoc[] };

type RomanceBook = {
  _id?: string;
  info?: { title?: string };
  authors?: Array<{ name?: string }>;
};
type RomanceResponse = { success?: boolean; books?: RomanceBook[] };

type Candidate = {
  title: string;
  author: string;
  isbn?: string;
  coverUrl?: string;
  coverSource?: string;
  source: string;
  rank: number;
};

type Aggregate = {
  title: string;
  author: string;
  isbn?: string;
  coverUrl?: string;
  coverSource?: string;
  sources: Set<string>;
  bestEvidence: number;
};

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

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

function titleScore(requested: string, candidate: string) {
  const wanted = normalize(requested);
  const found = normalize(candidate);
  if (!wanted || !found) return 0;
  if (wanted === found) return 20;
  if (wanted.includes(found) || found.includes(wanted)) return 14;

  const wantedWords = [...new Set(words(wanted))];
  const foundWords = new Set(words(found));
  const shared = wantedWords.filter((word) => foundWords.has(word)).length;
  const coverage = wantedWords.length ? shared / wantedWords.length : 0;
  if (coverage >= 0.85 && shared >= 2) return 12;
  if (coverage >= 0.67 && shared >= 2) return 9;
  if (coverage >= 0.5 && shared >= 2) return 6;
  return 0;
}

function authorScore(requested: string, candidate: string) {
  if (!requested) return 0;
  const wanted = normalize(requested);
  const found = normalize(candidate);
  if (!wanted || !found) return 0;
  if (wanted === found) return 12;

  const wantedWords = words(wanted);
  const foundSet = new Set(words(found));
  const last = wantedWords.at(-1);
  const shared = wantedWords.filter((word) => foundSet.has(word)).length;
  if (last && foundSet.has(last) && shared >= Math.min(2, wantedWords.length)) return 9;
  if (last && foundSet.has(last)) return 7;
  return shared >= 2 ? 5 : 0;
}

function visibleAuthorEvidence(visibleText: string, candidateAuthor: string) {
  const visible = new Set(words(visibleText));
  const authorWords = words(candidateAuthor);
  const last = authorWords.at(-1);
  if (last && last.length >= 3 && visible.has(last)) return 5;
  return 0;
}

function cleanIsbn(value?: string) {
  const cleaned = (value || "").replace(/[^0-9Xx]/g, "");
  return /^(?:\d{13}|\d{9}[\dXx])$/.test(cleaned) ? cleaned : undefined;
}

function bestGoogleIsbn(item: GoogleItem) {
  const identifiers = item.volumeInfo?.industryIdentifiers || [];
  return cleanIsbn(identifiers.find((entry) => entry.type === "ISBN_13")?.identifier)
    || cleanIsbn(identifiers.find((entry) => entry.type === "ISBN_10")?.identifier);
}

function googleCover(item: GoogleItem) {
  const images = item.volumeInfo?.imageLinks;
  const url = images?.extraLarge || images?.large || images?.medium || images?.small || images?.thumbnail || images?.smallThumbnail;
  return url?.replace(/^http:\/\//i, "https://");
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": "Shelf-of-Fame scan metadata resolver",
      },
    });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function googleCandidates(title: string, author: string): Promise<Candidate[]> {
  const query = author ? `intitle:${title} inauthor:${author}` : `intitle:${title}`;
  const params = new URLSearchParams({ q: query, maxResults: "20", printType: "books" });
  const data = await fetchJson<GoogleResponse>(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`);
  return (data?.items || []).flatMap((item, index): Candidate[] => {
    const candidateTitle = cleanText(item.volumeInfo?.title, MAX_TITLE_LENGTH);
    const candidateAuthor = cleanText(item.volumeInfo?.authors?.[0], MAX_AUTHOR_LENGTH);
    if (!candidateTitle || !candidateAuthor) return [];
    return [{
      title: candidateTitle,
      author: candidateAuthor,
      isbn: bestGoogleIsbn(item),
      coverUrl: googleCover(item),
      coverSource: "Google Books",
      source: "Google Books",
      rank: index,
    }];
  });
}

async function openLibraryCandidates(title: string, author: string): Promise<Candidate[]> {
  const params = new URLSearchParams({
    title,
    fields: "title,author_name,isbn,cover_i",
    limit: "24",
  });
  if (author) params.set("author", author);
  const data = await fetchJson<OpenLibraryResponse>(`https://openlibrary.org/search.json?${params.toString()}`);
  return (data?.docs || []).flatMap((doc, index): Candidate[] => {
    const candidateTitle = cleanText(doc.title, MAX_TITLE_LENGTH);
    const candidateAuthor = cleanText(doc.author_name?.[0], MAX_AUTHOR_LENGTH);
    if (!candidateTitle || !candidateAuthor) return [];
    const isbn = (doc.isbn || []).map(cleanIsbn).filter((value): value is string => Boolean(value)).sort((a, b) => b.length - a.length)[0];
    return [{
      title: candidateTitle,
      author: candidateAuthor,
      isbn,
      coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : undefined,
      coverSource: doc.cover_i ? "Open Library" : undefined,
      source: "Open Library",
      rank: index,
    }];
  });
}

async function romanceCandidates(title: string, author: string): Promise<Candidate[]> {
  const search = [title, author].filter(Boolean).join(" ").trim();
  if (!search) return [];
  const params = new URLSearchParams({ search });
  const data = await fetchJson<RomanceResponse>(`https://www.romance.io/json/search_books?${params.toString()}`);
  if (data?.success !== true || !Array.isArray(data.books)) return [];
  return data.books.slice(0, 20).flatMap((book, index): Candidate[] => {
    const candidateTitle = cleanText(book.info?.title, MAX_TITLE_LENGTH);
    const candidateAuthor = cleanText(book.authors?.[0]?.name, MAX_AUTHOR_LENGTH);
    if (!candidateTitle || !candidateAuthor) return [];
    const id = cleanText(book._id, 40);
    return [{
      title: candidateTitle,
      author: candidateAuthor,
      coverUrl: /^[a-f0-9]{24}$/i.test(id) ? `https://s3.amazonaws.com/romance.io/books/large/${id}.jpg` : undefined,
      coverSource: /^[a-f0-9]{24}$/i.test(id) ? "Romance.io" : undefined,
      source: "Romance.io",
      rank: index,
    }];
  });
}

function candidateEvidence(requestedTitle: string, requestedAuthor: string, visibleText: string, candidate: Candidate) {
  const title = titleScore(requestedTitle, candidate.title);
  if (!title) return 0;
  const author = authorScore(requestedAuthor, candidate.author);
  if (requestedAuthor && author < 5) return 0;
  const visible = visibleAuthorEvidence(visibleText, candidate.author);
  const rankBonus = Math.max(0, 5 - candidate.rank * 0.35);
  const completeness = (candidate.isbn ? 1.5 : 0) + (candidate.coverUrl ? 1 : 0);
  return title + author + visible + rankBonus + completeness;
}

function aggregateCandidates(requestedTitle: string, requestedAuthor: string, visibleText: string, candidates: Candidate[]) {
  const byIdentity = new Map<string, Aggregate>();

  for (const candidate of candidates) {
    const evidence = candidateEvidence(requestedTitle, requestedAuthor, visibleText, candidate);
    if (evidence <= 0) continue;
    const key = `${normalize(candidate.title)}::${normalize(candidate.author)}`;
    const existing = byIdentity.get(key);
    if (!existing) {
      byIdentity.set(key, {
        title: candidate.title,
        author: candidate.author,
        isbn: candidate.isbn,
        coverUrl: candidate.coverUrl,
        coverSource: candidate.coverSource,
        sources: new Set([candidate.source]),
        bestEvidence: evidence,
      });
      continue;
    }

    existing.sources.add(candidate.source);
    existing.bestEvidence = Math.max(existing.bestEvidence, evidence);
    if (!existing.isbn && candidate.isbn) existing.isbn = candidate.isbn;
    if (!existing.coverUrl && candidate.coverUrl) {
      existing.coverUrl = candidate.coverUrl;
      existing.coverSource = candidate.coverSource;
    }
  }

  return [...byIdentity.values()]
    .map((entry) => ({
      ...entry,
      score: entry.bestEvidence + Math.max(0, entry.sources.size - 1) * 8,
      sourceCount: entry.sources.size,
    }))
    .sort((left, right) => right.score - left.score);
}

export async function POST(request: Request) {
  const limited = enforceApiRateLimit(request);
  if (limited) return limited;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid metadata request." }, { status: 400 });
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return Response.json({ error: "Invalid metadata request." }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const title = cleanText(body.title, MAX_TITLE_LENGTH);
  const author = cleanText(body.author, MAX_AUTHOR_LENGTH);
  const visibleText = cleanText(body.visibleText, MAX_VISIBLE_TEXT_LENGTH);
  if (!title) {
    return Response.json({ error: "A readable title is required before metadata can be resolved." }, { status: 400 });
  }

  const [google, openLibrary, romance] = await Promise.all([
    googleCandidates(title, author),
    openLibraryCandidates(title, author),
    romanceCandidates(title, author),
  ]);

  const ranked = aggregateCandidates(title, author, visibleText, [...google, ...openLibrary, ...romance]);
  const best = ranked[0];
  if (!best) {
    return Response.json({ book: null, alternatives: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const second = ranked[1];
  const exactTitle = normalize(best.title) === normalize(title);
  const separation = second ? best.score - second.score : best.score;
  const high = exactTitle && best.sourceCount >= 2 && (separation >= 3 || Boolean(author));
  const medium = exactTitle && (best.sourceCount >= 2 || best.score >= 25) && separation >= 1;
  const confidence = high ? "high" : medium ? "medium" : "low";

  const format = (entry: typeof best) => ({
    title: entry.title,
    author: entry.author,
    isbn: entry.isbn || null,
    coverUrl: entry.coverUrl || null,
    coverSource: entry.coverSource || null,
    confidence,
    sources: [...entry.sources],
  });

  return Response.json({
    book: format(best),
    alternatives: ranked.slice(1, 5).map((entry) => ({
      title: entry.title,
      author: entry.author,
      isbn: entry.isbn || null,
      coverUrl: entry.coverUrl || null,
      coverSource: entry.coverSource || null,
      sources: [...entry.sources],
    })),
  }, { headers: { "Cache-Control": "no-store" } });
}
