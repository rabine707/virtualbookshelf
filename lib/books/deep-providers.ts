import type { CoverCandidate } from "./providers";
import {
  deepBareKeywords,
  deepKeywordSearchText,
  matchDeepBookCandidate,
} from "./matching";

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

function httpsImage(url?: string) {
  return url?.replace(/^http:\/\//i, "https://");
}

function openLibraryCoverById(coverId?: number) {
  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;
}

export async function openLibraryCoverByIsbn(isbn: string): Promise<CoverCandidate[]> {
  const key = `ISBN:${isbn}`;
  const url = `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(key)}&format=json&jscmd=data`;
  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) return [];

  const data = await response.json() as Record<string, OpenLibraryBook>;
  const cover = data[key]?.cover;
  const image = httpsImage(cover?.large || cover?.medium || cover?.small);
  return image ? [{ url: image, source: "Open Library", score: 30 }] : [];
}

export async function openLibrarySearchByIsbn(isbn: string): Promise<CoverCandidate[]> {
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

async function openLibraryMatches(
  url: string,
  requestedTitle: string,
  author: string,
): Promise<CoverCandidate[]> {
  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) return [];

  const data = await response.json() as OpenLibrarySearchResponse;
  const results: CoverCandidate[] = [];

  for (const doc of data.docs || []) {
    const image = openLibraryCoverById(doc.cover_i);
    if (!image) continue;
    const match = matchDeepBookCandidate(requestedTitle, author, doc.title, doc.author_name || []);
    if (match.accepted) results.push({ url: image, source: "Open Library", score: match.score });
  }

  return results;
}

export async function openLibrarySearchByTitle(
  searchTitle: string,
  requestedTitle: string,
  author: string,
) {
  const params = new URLSearchParams({ title: searchTitle, fields: "title,author_name,cover_i", limit: "40" });
  if (author) params.set("author", author);
  return openLibraryMatches(`https://openlibrary.org/search.json?${params.toString()}`, requestedTitle, author);
}

export async function openLibraryKeywordSearch(
  searchTitle: string,
  requestedTitle: string,
  author: string,
) {
  const q = deepKeywordSearchText(searchTitle, author);
  if (!q) return [];
  const params = new URLSearchParams({ q, fields: "title,author_name,cover_i", limit: "40" });
  return openLibraryMatches(`https://openlibrary.org/search.json?${params.toString()}`, requestedTitle, author);
}

export async function openLibraryBareKeywordSearch(
  searchTitle: string,
  requestedTitle: string,
  author: string,
) {
  const q = deepBareKeywords(searchTitle);
  if (!q) return [];
  const params = new URLSearchParams({ q, fields: "title,author_name,cover_i", limit: "40" });
  return openLibraryMatches(`https://openlibrary.org/search.json?${params.toString()}`, requestedTitle, author);
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

export async function googleBooksCovers(
  query: string,
  requestedTitle = "",
  author = "",
  trustFirst = false,
): Promise<CoverCandidate[]> {
  const params = new URLSearchParams({ q: query, maxResults: "40", printType: "books" });
  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`, {
    next: { revalidate: 86400 },
  });
  if (!response.ok) return [];

  const data = await response.json() as GoogleBooksResponse;
  const results: CoverCandidate[] = [];

  for (const [index, item] of (data.items || []).entries()) {
    const image = googleImage(item);
    if (!image) continue;

    if (trustFirst) {
      results.push({ url: image, source: "Google Books", score: 29 - index * 0.1 });
      continue;
    }

    const match = matchDeepBookCandidate(
      requestedTitle,
      author,
      item.volumeInfo?.title,
      item.volumeInfo?.authors || [],
    );
    if (match.accepted) results.push({ url: image, source: "Google Books", score: match.score + 0.25 });
  }

  return results;
}
