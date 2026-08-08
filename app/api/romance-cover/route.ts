import { NextRequest, NextResponse } from "next/server";

type RomanceIoAuthor = {
  name?: string;
};

type RomanceIoSearchBook = {
  _id?: string;
  info?: {
    title?: string;
  };
  authors?: RomanceIoAuthor[];
};

type RomanceIoSearchResponse = {
  success?: boolean;
  books?: RomanceIoSearchBook[];
};

type RankedMatch = {
  id: string;
  score: number;
};

const STOP_WORDS = new Set([
  "a", "an", "and", "as", "at", "book", "by", "edition", "for", "from", "in", "into",
  "novel", "of", "on", "or", "series", "the", "to", "volume", "with",
]);

const responseHeaders = {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
};

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

function significantWords(value?: string) {
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

function titleScore(requestedTitle: string, candidateTitle?: string) {
  const wanted = normalize(stripSeriesSuffix(requestedTitle));
  const found = normalize(candidateTitle);
  if (!wanted || !found) return 0;
  if (wanted === found) return 10;
  if (wanted.includes(found) || found.includes(wanted)) return 8;

  const wantedWords = significantWords(wanted);
  const foundSet = new Set(significantWords(found));
  const matches = wantedWords.filter((word) => foundSet.has(word)).length;
  const coverage = wantedWords.length ? matches / wantedWords.length : 0;

  if (coverage >= 0.85 && matches >= 2) return 7;
  if (coverage >= 0.67 && matches >= 2) return 6;
  if (coverage >= 0.5 && matches >= 2) return 4;
  return 0;
}

function authorScore(requestedAuthor: string, candidateAuthors: string[]) {
  const wanted = words(requestedAuthor);
  if (!wanted.length) return 0;
  const wantedFull = normalize(requestedAuthor);
  const firstName = wanted[0];
  const lastName = wanted.at(-1);
  let best = 0;

  for (const candidate of candidateAuthors) {
    const foundFull = normalize(candidate);
    const found = words(candidate);
    const foundSet = new Set(found);
    if (!foundFull) continue;

    if (foundFull === wantedFull) {
      best = Math.max(best, 6);
      continue;
    }

    const hasLast = Boolean(lastName && foundSet.has(lastName));
    const hasFirst = Boolean(firstName && foundSet.has(firstName));
    if (hasLast && hasFirst) best = Math.max(best, 5);
    else if (hasLast) best = Math.max(best, 3);
  }

  return best;
}

function romanceIoId(value?: string) {
  const id = (value || "").trim();
  return /^[a-f0-9]{24}$/i.test(id) ? id : null;
}

function coverUrl(id: string) {
  return `https://s3.amazonaws.com/romance.io/books/large/${id}.jpg`;
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function htmlText(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim();
}

function acceptedMatch(title: string, author: string, candidateTitle?: string, candidateAuthors: string[] = []) {
  const t = titleScore(title, candidateTitle);
  const a = authorScore(author, candidateAuthors);
  const score = t + a;
  const accepted = (t >= 8 && (!author || a >= 3)) || (t >= 6 && a >= 5);
  return { accepted: accepted && score >= 11, score };
}

function rankedMatches(books: RomanceIoSearchBook[], title: string, author: string): RankedMatch[] {
  const results: RankedMatch[] = [];

  for (const book of books) {
    const id = romanceIoId(book._id);
    if (!id) continue;

    const candidateAuthors = (book.authors || [])
      .map((entry) => entry.name || "")
      .filter(Boolean);
    const match = acceptedMatch(title, author, book.info?.title, candidateAuthors);
    if (match.accepted) results.push({ id, score: match.score });
  }

  return results.sort((a, b) => b.score - a.score);
}

async function fetchWithTimeout(url: string, timeoutMs: number, accept: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: accept,
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": "Shelf-of-Fame cover lookup",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function searchRomanceIoJson(title: string, author: string): Promise<RankedMatch | null> {
  const searchText = [stripSeriesSuffix(title), author].filter(Boolean).join(" ").trim();
  if (!searchText) return null;

  try {
    const params = new URLSearchParams({ search: searchText });
    const response = await fetchWithTimeout(
      `https://www.romance.io/json/search_books?${params.toString()}`,
      2800,
      "application/json",
    );
    if (!response.ok) return null;

    const data = await response.json() as RomanceIoSearchResponse;
    if (data.success !== true || !Array.isArray(data.books)) return null;
    return rankedMatches(data.books, title, author)[0] || null;
  } catch {
    return null;
  }
}

function matchesFromHtml(html: string, title: string, author: string): RankedMatch[] {
  const results: RankedMatch[] = [];
  const pattern = /<h3[^>]*>\s*<a[^>]*href=["']\/books\/([a-f0-9]{24})\/[^"']*["'][^>]*>([\s\S]*?)<\/a>[\s\S]{0,1800}?<h4[^>]*>[\s\S]{0,1200}?<a[^>]*href=["']\/authors\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(pattern)) {
    const id = romanceIoId(match[1]);
    if (!id) continue;
    const candidateTitle = htmlText(match[2]);
    const candidateAuthor = htmlText(match[3]);
    const evidence = acceptedMatch(title, author, candidateTitle, candidateAuthor ? [candidateAuthor] : []);
    if (evidence.accepted) results.push({ id, score: evidence.score });
  }

  return results.sort((a, b) => b.score - a.score);
}

async function searchRomanceIoHtml(title: string, author: string): Promise<RankedMatch | null> {
  const query = [stripSeriesSuffix(title), author].filter(Boolean).join(" - ").trim();
  if (!query) return null;

  try {
    const params = new URLSearchParams({ q: query });
    const response = await fetchWithTimeout(
      `https://www.romance.io/search?${params.toString()}`,
      3800,
      "text/html,application/xhtml+xml",
    );
    if (!response.ok) return null;
    const html = await response.text();
    return matchesFromHtml(html, title, author)[0] || null;
  } catch {
    return null;
  }
}

async function searchRomanceIo(title: string, author: string) {
  const jsonMatch = await searchRomanceIoJson(title, author);
  if (jsonMatch) return jsonMatch;
  return searchRomanceIoHtml(title, author);
}

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get("title")?.trim() || "";
  const author = request.nextUrl.searchParams.get("author")?.trim() || "";
  const knownId = romanceIoId(request.nextUrl.searchParams.get("romanceio") || "");

  if (!title && !knownId) {
    return NextResponse.json(
      { url: null, source: null, options: [] },
      { status: 200, headers: responseHeaders },
    );
  }

  const match = knownId ? { id: knownId, score: 99 } : await searchRomanceIo(title, author);
  if (!match) {
    return NextResponse.json(
      { url: null, source: null, options: [] },
      { status: 200, headers: responseHeaders },
    );
  }

  const option = { url: coverUrl(match.id), source: "Romance.io" };
  return NextResponse.json(
    {
      ...option,
      options: [option],
      discoveredRomanceioId: match.id,
    },
    { status: 200, headers: responseHeaders },
  );
}
