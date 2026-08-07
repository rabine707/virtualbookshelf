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

const responseHeaders = {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
};

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

function matchScore(
  requestedTitle: string,
  requestedAuthor: string,
  candidateTitle?: string,
  candidateAuthors: string[] = [],
) {
  const wantedTitle = normalizeText(requestedTitle);
  const foundTitle = normalizeText(candidateTitle);
  if (!wantedTitle || !foundTitle) return 0;

  let score = 0;
  if (foundTitle === wantedTitle) {
    score += 12;
  } else if (foundTitle.includes(wantedTitle) || wantedTitle.includes(foundTitle)) {
    score += 8;
  } else {
    const wantedWords = wantedTitle.split(" ").filter((word) => word.length > 1);
    const foundWords = new Set(foundTitle.split(" "));
    const matches = wantedWords.filter((word) => foundWords.has(word)).length;
    if (wantedWords.length) score += (matches / wantedWords.length) * 6;
  }

  const wantedAuthor = normalizeText(requestedAuthor);
  if (wantedAuthor) {
    const authorValues = candidateAuthors.map(normalizeText).filter(Boolean);
    if (authorValues.some((author) => author === wantedAuthor || author.includes(wantedAuthor) || wantedAuthor.includes(author))) {
      score += 7;
    } else {
      const lastName = wantedAuthor.split(" ").filter(Boolean).at(-1);
      if (lastName && authorValues.some((author) => author.split(" ").includes(lastName))) score += 4;
    }
  }

  return score;
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

async function openLibrarySearchByTitle(title: string, author: string) {
  const params = new URLSearchParams({
    title,
    fields: "title,author_name,cover_i",
    limit: "15",
  });
  if (author) params.set("author", author);

  const response = await fetch(`https://openlibrary.org/search.json?${params.toString()}`, {
    next: { revalidate: 86400 },
  });
  if (!response.ok) return null;

  const data = await response.json() as OpenLibrarySearchResponse;
  let best: { image: string; score: number } | null = null;

  for (const doc of data.docs || []) {
    const image = openLibraryCoverById(doc.cover_i);
    if (!image) continue;
    const score = matchScore(title, author, doc.title, doc.author_name || []);
    if (!best || score > best.score) best = { image, score };
  }

  return best && best.score >= 6 ? best.image : null;
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
    maxResults: "20",
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
    const score = matchScore(title, author, item.volumeInfo?.title, item.volumeInfo?.authors || []);
    if (!best || score > best.score) best = { image, score };
  }

  return best && best.score >= 6 ? best.image : null;
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
    }
  } catch {
    // A failed provider should never break the shelf or book detail modal.
  }

  return NextResponse.json(
    { url: null, source: null },
    { status: 404, headers: { "Cache-Control": "public, s-maxage=3600" } },
  );
}
