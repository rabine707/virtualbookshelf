import { NextRequest, NextResponse } from "next/server";

type OpenLibraryBook = {
  cover?: {
    small?: string;
    medium?: string;
    large?: string;
  };
};

type GoogleBook = {
  volumeInfo?: {
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

async function openLibraryCover(isbn: string) {
  const key = `ISBN:${isbn}`;
  const url = `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(key)}&format=json&jscmd=data`;
  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) return null;

  const data = await response.json() as Record<string, OpenLibraryBook>;
  const cover = data[key]?.cover;
  return httpsImage(cover?.large || cover?.medium || cover?.small) || null;
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

async function googleBooksCover(query: string) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&printType=books`;
  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) return null;

  const data = await response.json() as GoogleBooksResponse;
  for (const item of data.items || []) {
    const image = googleImage(item);
    if (image) return image;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const isbn = request.nextUrl.searchParams.get("isbn")?.trim() || "";
  const title = request.nextUrl.searchParams.get("title")?.trim() || "";
  const author = request.nextUrl.searchParams.get("author")?.trim() || "";

  try {
    if (isbn) {
      const openLibrary = await openLibraryCover(isbn);
      if (openLibrary) {
        return NextResponse.json(
          { url: openLibrary, source: "Open Library" },
          { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
        );
      }

      const googleByIsbn = await googleBooksCover(`isbn:${isbn}`);
      if (googleByIsbn) {
        return NextResponse.json(
          { url: googleByIsbn, source: "Google Books" },
          { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
        );
      }
    }

    if (title) {
      const titleAuthorQuery = author
        ? `intitle:${title} inauthor:${author}`
        : `intitle:${title}`;
      const googleByTitle = await googleBooksCover(titleAuthorQuery);
      if (googleByTitle) {
        return NextResponse.json(
          { url: googleByTitle, source: "Google Books" },
          { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
        );
      }
    }
  } catch {
    // A failed provider should never break the book detail modal.
  }

  return NextResponse.json(
    { url: null, source: null },
    { status: 404, headers: { "Cache-Control": "public, s-maxage=3600" } },
  );
}
