import { NextRequest, NextResponse } from "next/server";
import { enforceApiRateLimit } from "../../../lib/rate-limit";

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  isbn?: string[];
  cover_i?: number;
  edition_count?: number;
};

type OpenLibraryResponse = {
  docs?: OpenLibraryDoc[];
};

type GoogleIdentifier = {
  type?: string;
  identifier?: string;
};

type GoogleBook = {
  id?: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
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

type GoogleBooksResponse = {
  items?: GoogleBook[];
};

type RomanceIoAuthor = {
  name?: string;
};

type RomanceIoBook = {
  _id?: string;
  info?: { title?: string };
  authors?: RomanceIoAuthor[];
};

type RomanceIoResponse = {
  success?: boolean;
  books?: RomanceIoBook[];
};

type SearchCandidate = {
  id: string;
  title: string;
  author: string;
  year?: number;
  isbn?: string;
  coverUrl?: string;
  source: "Google Books" | "Open Library" | "Romance.io";
  score: number;
};

const responseHeaders = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};

function normalizeText(value?: string) {
  return (value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactText(value?: string) {
  return normalizeText(value).replace(/ /g, "");
}

function words(value?: string) {
  return normalizeText(value).split(" ").filter(Boolean);
}

function cleanIsbn(value?: string) {
  const cleaned = (value || "").replace(/[^0-9Xx]/g, "");
  return /^(?:[0-9]{13}|[0-9]{9}[0-9Xx])$/.test(cleaned) ? cleaned : undefined;
}

function preferredIsbn(values: (string | undefined)[]) {
  const cleaned = values.map(cleanIsbn).filter((value): value is string => Boolean(value));
  return cleaned.find((value) => value.length === 13) || cleaned[0];
}

function titleScore(requestedTitle: string, candidateTitle?: string) {
  const wanted = normalizeText(requestedTitle);
  const found = normalizeText(candidateTitle);
  if (!wanted || !found) return 0;
  if (wanted === found) return 120;

  const wantedWords = words(wanted);
  const foundWords = words(found);
  const foundSet = new Set(foundWords);

  if (found.startsWith(`${wanted} `)) return 108;
  if (wantedWords.length >= 2 && found.includes(wanted)) return 100;
  if (wanted.startsWith(`${found} `)) return 90;

  const matches = wantedWords.filter((word) => foundSet.has(word)).length;
  if (!matches) return 0;
  const coverage = matches / wantedWords.length;
  return Math.round(coverage * 70) + Math.min(20, matches * 6);
}

function authorScore(requestedAuthor: string, candidateAuthors: string[]) {
  if (!normalizeText(requestedAuthor)) return 30;

  const wanted = normalizeText(requestedAuthor);
  const wantedCompact = compactText(requestedAuthor);
  const wantedWords = words(requestedAuthor);
  const wantedLast = wantedWords.at(-1);
  let best = 0;

  for (const candidate of candidateAuthors) {
    const found = normalizeText(candidate);
    if (!found) continue;
    const foundCompact = compactText(candidate);
    const foundWords = words(candidate);
    const foundSet = new Set(foundWords);

    if (found === wanted || foundCompact === wantedCompact) {
      best = Math.max(best, 105);
      continue;
    }

    if (found.includes(wanted) || foundCompact.includes(wantedCompact) || wanted.includes(found)) {
      best = Math.max(best, 92);
      continue;
    }

    if (wantedLast && foundSet.has(wantedLast)) {
      best = Math.max(best, 86);
      continue;
    }

    const shared = wantedWords.filter((word) => foundSet.has(word)).length;
    const overlap = wantedWords.length ? shared / wantedWords.length : 0;
    best = Math.max(best, Math.round(overlap * 72));
  }

  return best;
}

function candidateScore(
  requestedTitle: string,
  requestedAuthor: string,
  candidateTitle: string | undefined,
  candidateAuthors: string[],
) {
  const title = titleScore(requestedTitle, candidateTitle);
  if (title < 50) return 0;

  const author = authorScore(requestedAuthor, candidateAuthors);
  if (normalizeText(requestedAuthor) && author < 45) return 0;

  return title + author;
}

function yearBonus(year?: number) {
  if (!year) return 0;
  if (year >= 2010) return 8;
  if (year >= 2000) return 6;
  if (year >= 1980) return 3;
  if (year >= 1950) return 1;
  return 0;
}

function googleIsbn(item: GoogleBook) {
  const ids = item.volumeInfo?.industryIdentifiers || [];
  return preferredIsbn([
    ids.find((id) => id.type === "ISBN_13")?.identifier,
    ids.find((id) => id.type === "ISBN_10")?.identifier,
  ]);
}

function googleImage(item: GoogleBook) {
  const images = item.volumeInfo?.imageLinks;
  const url = images?.extraLarge
    || images?.large
    || images?.medium
    || images?.small
    || images?.thumbnail
    || images?.smallThumbnail;
  return url?.replace(/^http:/i, "https:");
}

function googleYear(item: GoogleBook) {
  const match = item.volumeInfo?.publishedDate?.match(/(?:18|19|20|21)[0-9]{2}/)?.[0];
  return match ? Number(match) : undefined;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 3600 },
      headers: {
        Accept: "application/json",
        "User-Agent": "Shelf-of-Fame book search",
      },
    });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function searchGoogle(title: string, author: string, broad: boolean): Promise<SearchCandidate[]> {
  const query = broad
    ? [title, author].filter(Boolean).join(" ")
    : author
      ? `intitle:${title} inauthor:${author}`
      : `intitle:${title}`;

  const params = new URLSearchParams({
    q: query,
    maxResults: "20",
    printType: "books",
  });
  const data = await fetchJson<GoogleBooksResponse>(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`);
  const results: SearchCandidate[] = [];

  for (const [index, item] of (data?.items || []).entries()) {
    const info = item.volumeInfo;
    const candidateTitle = info?.title?.trim();
    const authors = (info?.authors || []).map((value) => value.trim()).filter(Boolean);
    if (!candidateTitle || !authors.length) continue;

    const baseScore = candidateScore(title, author, candidateTitle, authors);
    if (!baseScore) continue;

    const coverUrl = googleImage(item);
    const isbn = googleIsbn(item);
    const year = googleYear(item);
    const quality = (coverUrl ? 10 : 0) + (isbn ? 4 : 0) + yearBonus(year) + 2;

    results.push({
      id: `google:${item.id || `${normalizeText(candidateTitle)}:${normalizeText(authors[0])}`}`,
      title: candidateTitle,
      author: authors.slice(0, 3).join(", "),
      year,
      isbn,
      coverUrl,
      source: "Google Books",
      score: baseScore + quality - index * 0.25,
    });
  }

  return results;
}

async function searchOpenLibrary(title: string, author: string, broad: boolean): Promise<SearchCandidate[]> {
  const params = broad
    ? new URLSearchParams({
      q: [title, author].filter(Boolean).join(" "),
      fields: "key,title,author_name,first_publish_year,isbn,cover_i,edition_count",
      limit: "24",
    })
    : new URLSearchParams({
      title,
      fields: "key,title,author_name,first_publish_year,isbn,cover_i,edition_count",
      limit: "24",
    });

  if (!broad && author) params.set("author", author);

  const data = await fetchJson<OpenLibraryResponse>(`https://openlibrary.org/search.json?${params.toString()}`);
  const results: SearchCandidate[] = [];

  for (const [index, doc] of (data?.docs || []).entries()) {
    const candidateTitle = doc.title?.trim();
    const authors = (doc.author_name || []).map((value) => value.trim()).filter(Boolean);
    if (!candidateTitle || !authors.length) continue;

    const baseScore = candidateScore(title, author, candidateTitle, authors);
    if (!baseScore) continue;

    const year = doc.first_publish_year;
    const isbn = preferredIsbn(doc.isbn || []);
    const coverUrl = doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
      : undefined;
    const editionBonus = Math.min(5, Math.log2(Math.max(1, (doc.edition_count || 0) + 1)));
    const quality = (coverUrl ? 9 : 0) + (isbn ? 4 : 0) + yearBonus(year) + editionBonus;

    results.push({
      id: `openlibrary:${doc.key || `${normalizeText(candidateTitle)}:${normalizeText(authors[0])}`}`,
      title: candidateTitle,
      author: authors.slice(0, 3).join(", "),
      year,
      isbn,
      coverUrl,
      source: "Open Library",
      score: baseScore + quality - index * 0.2,
    });
  }

  return results;
}

async function searchRomanceIo(title: string, author: string): Promise<SearchCandidate[]> {
  const searchText = [title, author].filter(Boolean).join(" ").trim();
  if (!searchText) return [];

  const params = new URLSearchParams({ search: searchText });
  const data = await fetchJson<RomanceIoResponse>(`https://www.romance.io/json/search_books?${params.toString()}`);
  if (data?.success !== true || !Array.isArray(data.books)) return [];

  const results: SearchCandidate[] = [];
  for (const [index, book] of data.books.entries()) {
    const id = (book._id || "").trim();
    const candidateTitle = book.info?.title?.trim();
    const authors = (book.authors || []).map((entry) => entry.name?.trim() || "").filter(Boolean);
    if (!/^[a-f0-9]{24}$/i.test(id) || !candidateTitle || !authors.length) continue;

    const baseScore = candidateScore(title, author, candidateTitle, authors);
    if (!baseScore) continue;

    results.push({
      id: `romanceio:${id}`,
      title: candidateTitle,
      author: authors.slice(0, 3).join(", "),
      coverUrl: `https://s3.amazonaws.com/romance.io/books/large/${id}.jpg`,
      source: "Romance.io",
      score: baseScore + 13 - index * 0.15,
    });
  }

  return results;
}

function mergeResults(candidates: SearchCandidate[]) {
  const byBook = new Map<string, SearchCandidate>();

  for (const candidate of candidates) {
    const key = `${normalizeText(candidate.title)}::${normalizeText(candidate.author)}`;
    const current = byBook.get(key);
    if (!current) {
      byBook.set(key, candidate);
      continue;
    }

    const better = candidate.score > current.score ? candidate : current;
    const other = better === candidate ? current : candidate;
    byBook.set(key, {
      ...better,
      coverUrl: better.coverUrl || other.coverUrl,
      isbn: better.isbn || other.isbn,
      year: better.year || other.year,
      score: Math.max(better.score, other.score) + 1,
    });
  }

  return [...byBook.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ score: _score, ...result }) => result);
}

export async function GET(request: NextRequest) {
  const rateLimited = await enforceApiRateLimit(request);
  if (rateLimited) return rateLimited;

  const title = request.nextUrl.searchParams.get("title")?.replace(/\s+/g, " ").trim() || "";
  const author = request.nextUrl.searchParams.get("author")?.replace(/\s+/g, " ").trim() || "";

  if (title.length < 2) {
    return NextResponse.json({ results: [], error: "Enter at least two title characters." }, { status: 400 });
  }
  if (title.length > 160 || author.length > 120) {
    return NextResponse.json({ results: [], error: "Search is too long." }, { status: 400 });
  }

  const [googleExact, googleBroad, openLibraryExact, openLibraryBroad, romance] = await Promise.all([
    searchGoogle(title, author, false),
    searchGoogle(title, author, true),
    searchOpenLibrary(title, author, false),
    searchOpenLibrary(title, author, true),
    searchRomanceIo(title, author),
  ]);

  const results = mergeResults([
    ...romance,
    ...googleExact,
    ...openLibraryExact,
    ...googleBroad,
    ...openLibraryBroad,
  ]);

  return NextResponse.json(
    { results },
    { status: 200, headers: responseHeaders },
  );
}