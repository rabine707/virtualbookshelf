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
    // Strong author match: allow editions/subtitles that still share a meaningful piece of the title.
    accepted = exactTitle || adjacentTitle || keywordCoverage >= 0.34;
  } else if (authorScore >= 5) {
    // Last-name-level author confidence needs at least half of the meaningful title words.
    accepted = exactTitle || adjacentTitle || keywordCoverage >= 0.5;
  } else if (authorScore >= 3) {
    // Partial author evidence only passes with a very strong title match.
    accepted = exactTitle || adjacentTitle || keywordCoverage >= 0.75;
  }

  // One-word/generic titles are especially risky, so require a strong author match.
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

async function openLibraryCoverByIsbn(isbn: string) {
  const key = `ISBN:${isbn}`;
  const url = `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(key)}&format=json&jscmd=data`;
  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) return null;

  const data = await response.json() as Record<string, OpenLibraryBook>;
  const cover = data[key]?.cover;
  return httpsImage(cover?.large || cover?.medium || cover?.small) || null;
}

async function openLibrarySearchByIsbn(isbn: string) {
  const params = new URLSearchParams({
    isbn,
    fields: "cover_i",
    limit: "5",
  });
  const response = await fetch(`https://openlibrary.org/search.json?${params.toString()}`, {
    next: { revalidate: 86400 },
  });
  if (!response.ok) return null;

  const data = await response.json() as OpenLibrarySearchResponse;
  for (const doc of data.docs || []) {
    const image = openLibraryCoverById(doc.cover_i);
    if (image) return image;
  }
  return null;
}

async function bestOpenLibraryMatch(url: string, title: string, author: string) {
  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) return null;

  const data = await response.json() as OpenLibrarySearchResponse;
  let best: { image: string; score: number } | null = null;

  for (const doc of data.docs || []) {
    const image = openLibraryCoverById(doc.cover_i);
    if (!image) continue;

    const match = matchCandidate(title, author, doc.title, doc.author_name || []);
    if (!match.accepted) continue;
    if (!best || match.score > best.score) best = { image, score: match.score };
  }

  return best?.image || null;
}

async function openLibrarySearchByTitle(title: string, author: string) {
  const params = new URLSearchParams({
    title,
    fields: "title,author_name,cover_i",
    limit: "20",
  });
  if (author) params.set("author", author);

  return bestOpenLibraryMatch(
    `https://openlibrary.org/search.json?${params.toString()}`,
    title,
    author,
  );
}

async function openLibraryKeywordSearch(title: string, author: string) {
  const q = keywordSearchText(title, author);
  if (!q) return null;

  const params = new URLSearchParams({
    q,
    fields: "title,author_name,cover_i",
    limit: "25",
  });

  return bestOpenLibraryMatch(
    `https://openlibrary.org/search.json?${params.toString()}`,
    title,
    author,
  );
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

async function googleBooksCover(query: string, title = "", author = "", trustFirst = false) {
  const params = new URLSearchParams({
    q: query,
    maxResults: "25",
    printType: "books",
  });
  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`, {
    next: { revalidate: 86400 },
  });
  if (!response.ok) return null;

  const data = await response.json() as GoogleBooksResponse;
  if (trustFirst) {
    for (const item of data.items || []) {
      const image = googleImage(item);
      if (image) return image;
    }
    return null;
  }

  let best: { image: string; score: number } | null = null;
  for (const item of data.items || []) {
    const image = googleImage(item);
    if (!image) continue;

    const match = matchCandidate(title, author, item.volumeInfo?.title, item.volumeInfo?.authors || []);
    if (!match.accepted) continue;
    if (!best || match.score > best.score) best = { image, score: match.score };
  }

  return best?.image || null;
}

function coverResponse(url: string, source: string) {
  return NextResponse.json({ url, source }, { headers: responseHeaders });
}

export async function GET(request: NextRequest) {
  const isbn = request.nextUrl.searchParams.get("isbn")?.trim() || "";
  const title = request.nextUrl.searchParams.get("title")?.trim() || "";
  const author = request.nextUrl.searchParams.get("author")?.trim() || "";

  try {
    if (isbn) {
      const openLibrary = await openLibraryCoverByIsbn(isbn);
      if (openLibrary) return coverResponse(openLibrary, "Open Library");

      const openLibrarySearch = await openLibrarySearchByIsbn(isbn);
      if (openLibrarySearch) return coverResponse(openLibrarySearch, "Open Library");

      const googleByIsbn = await googleBooksCover(`isbn:${isbn}`, title, author, true);
      if (googleByIsbn) return coverResponse(googleByIsbn, "Google Books");
    }

    if (title) {
      const openLibraryByTitle = await openLibrarySearchByTitle(title, author);
      if (openLibraryByTitle) return coverResponse(openLibraryByTitle, "Open Library");

      const strictGoogleQuery = author
        ? `intitle:${title} inauthor:${author}`
        : `intitle:${title}`;
      const googleStrict = await googleBooksCover(strictGoogleQuery, title, author);
      if (googleStrict) return coverResponse(googleStrict, "Google Books");

      const broadGoogleQuery = author ? `${title} ${author}` : title;
      const googleBroad = await googleBooksCover(broadGoogleQuery, title, author);
      if (googleBroad) return coverResponse(googleBroad, "Google Books");

      const openLibraryKeywords = await openLibraryKeywordSearch(title, author);
      if (openLibraryKeywords) return coverResponse(openLibraryKeywords, "Open Library");

      const keywordQuery = keywordSearchText(title, author);
      if (keywordQuery) {
        const googleKeywords = await googleBooksCover(keywordQuery, title, author);
        if (googleKeywords) return coverResponse(googleKeywords, "Google Books");
      }
    }
  } catch {
    // A failed provider should never break the shelf or book detail modal.
  }

  return NextResponse.json(
    { url: null, source: null },
    { status: 404, headers: { "Cache-Control": "public, s-maxage=3600" } },
  );
}
