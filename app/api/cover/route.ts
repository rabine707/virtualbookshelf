import { NextRequest, NextResponse } from "next/server";

type OpenLibraryBook = {
  cover?: {
    small?: string;
    medium?: string;
    large?: string;
  };
};

type OpenLibrarySearchDoc = {
  title?: string;
  author_name?: string[];
  cover_i?: number;
};

type OpenLibrarySearchResponse = {
  docs?: OpenLibrarySearchDoc[];
};

type GoogleBook = {
  volumeInfo?: {
    title?: string;
    authors?: string[];
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

type MatchResult = {
  score: number;
  accepted: boolean;
};

type CoverOption = {
  url: string;
  source: string;
  score: number;
};

const responseHeaders = {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
};

const TITLE_STOP_WORDS = new Set([
  "a", "an", "and", "as", "at", "book", "by", "for", "from", "in", "into",
  "novel", "of", "on", "or", "the", "to", "with",
]);

function httpsImage(url?: string) {
  return url?.replace(/^http:\/\//i, "https://");
}

function normalizeText(value?: string) {
  return (value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function textWords(value?: string) {
  return normalizeText(value).split(" ").filter(Boolean);
}

function titleKeywords(value?: string) {
  const allWords = textWords(value);
  const significant = allWords.filter((word) => word.length > 1 && !TITLE_STOP_WORDS.has(word));
  return significant.length ? [...new Set(significant)] : [...new Set(allWords)];
}

function authorEvidence(requestedAuthor: string, candidateAuthors: string[]) {
  const wanted = normalizeText(requestedAuthor);
  if (!wanted) return 0;

  const wantedWords = textWords(wanted);
  const wantedLastName = wantedWords.at(-1);
  let best = 0;

  for (const candidate of candidateAuthors) {
    const found = normalizeText(candidate);
    if (!found) continue;

    if (found === wanted || found.includes(wanted) || wanted.includes(found)) {
      best = Math.max(best, 8);
      continue;
    }

    const foundWords = textWords(found);
    const foundSet = new Set(foundWords);
    const shared = wantedWords.filter((word) => foundSet.has(word)).length;
    const overlap = wantedWords.length ? shared / wantedWords.length : 0;

    if (wantedLastName && foundSet.has(wantedLastName)) best = Math.max(best, 5);
    if (overlap >= 0.67) best = Math.max(best, 4);
    else if (overlap >= 0.5) best = Math.max(best, 3);
  }

  return best;
}

function matchCandidate(
  requestedTitle: string,
  requestedAuthor: string,
  candidateTitle?: string,
  candidateAuthors: string[] = [],
): MatchResult {
  const wantedTitle = normalizeText(requestedTitle);
  const foundTitle = normalizeText(candidateTitle);
  if (!wantedTitle || !foundTitle) return { score: 0, accepted: false };

  const wantedKeywords = titleKeywords(wantedTitle);
  const foundKeywordSet = new Set(titleKeywords(foundTitle));
  const keywordMatches = wantedKeywords.filter((word) => foundKeywordSet.has(word)).length;
  const keywordCoverage = wantedKeywords.length ? keywordMatches / wantedKeywords.length : 0;

  let titleScore = 0;
  let exactTitle = false;
  let adjacentTitle = false;

  if (foundTitle === wantedTitle) {
    titleScore = 14;
    exactTitle = true;
  } else if (foundTitle.includes(wantedTitle) || wantedTitle.includes(foundTitle)) {
    titleScore = 11;
    adjacentTitle = true;
  } else {
    titleScore = keywordCoverage * 9;
    if (keywordCoverage >= 0.75) titleScore += 1;
  }

  const authorScore = authorEvidence(requestedAuthor, candidateAuthors);
  const hasRequestedAuthor = Boolean(normalizeText(requestedAuthor));
  const score = titleScore + authorScore;

  let accepted = false;
  if (!hasRequestedAuthor) {
    accepted = exactTitle || adjacentTitle || keywordCoverage >= 0.7;
  } else if (authorScore >= 7) {
    accepted = exactTitle || adjacentTitle || keywordCoverage >= 0.34;
  } else if (authorScore >= 5) {
    accepted = exactTitle || adjacentTitle || keywordCoverage >= 0.5;
  } else if (authorScore >= 3) {
    accepted = exactTitle || adjacentTitle || keywordCoverage >= 0.75;
  }

  if (hasRequestedAuthor && wantedKeywords.length <= 1 && authorScore < 5) accepted = false;
  return { score, accepted };
}

function keywordSearchText(title: string, author: string) {
  const keywords = titleKeywords(title).slice(0, 6);
  const authorWords = textWords(author);
  const authorLastName = authorWords.at(-1);
  return [...keywords, authorLastName].filter(Boolean).join(" ");
}

function openLibraryCoverById(coverId?: number) {
  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;
}

async function openLibraryCoverByIsbn(isbn: string): Promise<CoverOption[]> {
  const key = `ISBN:${isbn}`;
  const url = `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(key)}&format=json&jscmd=data`;
  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) return [];

  const data = await response.json() as Record<string, OpenLibraryBook>;
  const cover = data[key]?.cover;
  const image = httpsImage(cover?.large || cover?.medium || cover?.small);
  return image ? [{ url: image, source: "Open Library", score: 30 }] : [];
}

async function openLibrarySearchByIsbn(isbn: string): Promise<CoverOption[]> {
  const params = new URLSearchParams({ isbn, fields: "cover_i", limit: "10" });
  const response = await fetch(`https://openlibrary.org/search.json?${params.toString()}`, {
    next: { revalidate: 86400 },
  });
  if (!response.ok) return [];

  const data = await response.json() as OpenLibrarySearchResponse;
  return (data.docs || []).flatMap((doc, index) => {
    const image = openLibraryCoverById(doc.cover_i);
    return image ? [{ url: image, source: "Open Library", score: 28 - index * 0.1 }] : [];
  });
}

async function openLibraryMatches(url: string, title: string, author: string): Promise<CoverOption[]> {
  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) return [];

  const data = await response.json() as OpenLibrarySearchResponse;
  const results: CoverOption[] = [];

  for (const doc of data.docs || []) {
    const image = openLibraryCoverById(doc.cover_i);
    if (!image) continue;
    const match = matchCandidate(title, author, doc.title, doc.author_name || []);
    if (match.accepted) results.push({ url: image, source: "Open Library", score: match.score });
  }

  return results;
}

async function openLibrarySearchByTitle(title: string, author: string) {
  const params = new URLSearchParams({ title, fields: "title,author_name,cover_i", limit: "30" });
  if (author) params.set("author", author);
  return openLibraryMatches(`https://openlibrary.org/search.json?${params.toString()}`, title, author);
}

async function openLibraryKeywordSearch(title: string, author: string) {
  const q = keywordSearchText(title, author);
  if (!q) return [];
  const params = new URLSearchParams({ q, fields: "title,author_name,cover_i", limit: "30" });
  return openLibraryMatches(`https://openlibrary.org/search.json?${params.toString()}`, title, author);
}

function googleImage(book: GoogleBook) {
  const images = book.volumeInfo?.imageLinks;
  return httpsImage(
    images?.extraLarge
      || images?.large
      || images?.medium
      || images?.small
      || images?.thumbnail
      || images?.smallThumbnail,
  ) || null;
}

async function googleBooksCovers(query: string, title = "", author = "", trustFirst = false): Promise<CoverOption[]> {
  const params = new URLSearchParams({ q: query, maxResults: "40", printType: "books" });
  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`, {
    next: { revalidate: 86400 },
  });
  if (!response.ok) return [];

  const data = await response.json() as GoogleBooksResponse;
  const results: CoverOption[] = [];

  for (const [index, item] of (data.items || []).entries()) {
    const image = googleImage(item);
    if (!image) continue;

    if (trustFirst) {
      results.push({ url: image, source: "Google Books", score: 29 - index * 0.1 });
      continue;
    }

    const match = matchCandidate(title, author, item.volumeInfo?.title, item.volumeInfo?.authors || []);
    if (match.accepted) results.push({ url: image, source: "Google Books", score: match.score + 0.25 });
  }

  return results;
}

function uniqueRanked(options: CoverOption[]) {
  const seen = new Set<string>();
  return options
    .sort((a, b) => b.score - a.score)
    .filter((option) => {
      const key = option.url.replace(/&zoom=\d+/i, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12)
    .map(({ url, source }) => ({ url, source }));
}

export async function GET(request: NextRequest) {
  const isbn = request.nextUrl.searchParams.get("isbn")?.trim() || "";
  const title = request.nextUrl.searchParams.get("title")?.trim() || "";
  const author = request.nextUrl.searchParams.get("author")?.trim() || "";

  try {
    const searches: Promise<CoverOption[]>[] = [];

    if (isbn) {
      searches.push(openLibraryCoverByIsbn(isbn));
      searches.push(openLibrarySearchByIsbn(isbn));
      searches.push(googleBooksCovers(`isbn:${isbn}`, title, author, true));
    }

    if (title) {
      searches.push(openLibrarySearchByTitle(title, author));
      searches.push(openLibraryKeywordSearch(title, author));

      const strictGoogleQuery = author ? `intitle:${title} inauthor:${author}` : `intitle:${title}`;
      searches.push(googleBooksCovers(strictGoogleQuery, title, author));
      searches.push(googleBooksCovers(author ? `${title} ${author}` : title, title, author));

      const keywordQuery = keywordSearchText(title, author);
      if (keywordQuery) searches.push(googleBooksCovers(keywordQuery, title, author));
    }

    const groups = await Promise.allSettled(searches);
    const candidates = groups.flatMap((group) => group.status === "fulfilled" ? group.value : []);
    const options = uniqueRanked(candidates);

    if (options.length) {
      return NextResponse.json(
        { ...options[0], options },
        { headers: responseHeaders },
      );
    }
  } catch {
    // Provider failures should never break the shelf.
  }

  return NextResponse.json(
    { url: null, source: null, options: [] },
    { status: 404, headers: { "Cache-Control": "public, s-maxage=3600" } },
  );
}
