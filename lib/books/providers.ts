import { cleanIsbn, scoreBookCandidate, stripSeriesSuffix } from "./matching";

export type IsbnCandidate = {
  isbn: string;
  score: number;
};

export type CoverCandidate = {
  url: string;
  source: string;
  score: number;
};

type OpenLibraryDoc = {
  title?: string;
  author_name?: string[];
  isbn?: string[];
  cover_i?: number;
};

type OpenLibraryResponse = {
  docs?: OpenLibraryDoc[];
};

type OpenLibraryBook = {
  cover?: { small?: string; medium?: string; large?: string };
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

function googleIsbn(item: GoogleBook) {
  const ids = item.volumeInfo?.industryIdentifiers || [];
  const isbn13 = ids.find((id) => id.type === "ISBN_13")?.identifier;
  const isbn10 = ids.find((id) => id.type === "ISBN_10")?.identifier;
  return cleanIsbn(isbn13) || cleanIsbn(isbn10);
}

function googleImage(item: GoogleBook) {
  const images = item.volumeInfo?.imageLinks;
  const url = images?.extraLarge || images?.large || images?.medium || images?.small || images?.thumbnail || images?.smallThumbnail;
  return url?.replace(/^http:\/\//i, "https://") || null;
}

export async function lookupGoogleCovers(
  title: string,
  author: string,
  isbn: string | null,
): Promise<CoverCandidate[]> {
  try {
    const query = isbn
      ? `isbn:${isbn}`
      : author
        ? `intitle:${stripSeriesSuffix(title)} inauthor:${author}`
        : `intitle:${stripSeriesSuffix(title)}`;
    const params = new URLSearchParams({ q: query, maxResults: "12", printType: "books" });
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`, {
      next: { revalidate: 86400 },
    });
    if (!response.ok) return [];
    const data = await response.json() as GoogleBooksResponse;
    const results: CoverCandidate[] = [];

    for (const [index, item] of (data.items || []).entries()) {
      const url = googleImage(item);
      if (!url) continue;
      if (isbn) {
        results.push({ url, source: "Google Books", score: 30 - index * 0.1 });
        continue;
      }
      const score = scoreBookCandidate(title, author, item.volumeInfo?.title, item.volumeInfo?.authors || []);
      if (score >= 13) results.push({ url, source: "Google Books", score: score + 0.25 });
    }
    return results;
  } catch {
    return [];
  }
}

export async function lookupOpenLibraryCovers(
  title: string,
  author: string,
  isbn: string | null,
): Promise<CoverCandidate[]> {
  try {
    if (isbn) {
      const key = `ISBN:${isbn}`;
      const response = await fetch(
        `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(key)}&format=json&jscmd=data`,
        { next: { revalidate: 86400 } },
      );
      if (!response.ok) return [];
      const data = await response.json() as Record<string, OpenLibraryBook>;
      const cover = data[key]?.cover;
      const url = (cover?.large || cover?.medium || cover?.small)?.replace(/^http:\/\//i, "https://");
      return url ? [{ url, source: "Open Library", score: 31 }] : [];
    }

    const params = new URLSearchParams({
      title: stripSeriesSuffix(title),
      fields: "title,author_name,cover_i",
      limit: "16",
    });
    if (author) params.set("author", author);
    const response = await fetch(`https://openlibrary.org/search.json?${params.toString()}`, {
      next: { revalidate: 86400 },
    });
    if (!response.ok) return [];
    const data = await response.json() as OpenLibraryResponse;
    const results: CoverCandidate[] = [];

    for (const doc of data.docs || []) {
      if (!doc.cover_i) continue;
      const score = scoreBookCandidate(title, author, doc.title, doc.author_name || []);
      if (score < 13) continue;
      results.push({
        url: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
        source: "Open Library",
        score,
      });
    }
    return results;
  } catch {
    return [];
  }
}

export async function discoverGoogleIsbns(title: string, author: string): Promise<IsbnCandidate[]> {
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
        const foundIsbn = googleIsbn(item);
        if (!foundIsbn) continue;
        const score = scoreBookCandidate(title, author, item.volumeInfo?.title, item.volumeInfo?.authors || []);
        if (score >= 13) results.push({ isbn: foundIsbn, score: score + 0.25 });
      }
    } catch {
      // Keep deeper lookup optional.
    }
  }
  return results;
}

export async function discoverOpenLibraryIsbns(title: string, author: string): Promise<IsbnCandidate[]> {
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
      const score = scoreBookCandidate(title, author, doc.title, doc.author_name || []);
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
