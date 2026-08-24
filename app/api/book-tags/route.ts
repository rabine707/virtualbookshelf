import { NextRequest, NextResponse } from "next/server";
import { scoreBookCandidate } from "../../../lib/books/matching";
import { mergePublicTags } from "../../../lib/books/public-tags";
import { enforceApiRateLimit } from "../../../lib/rate-limit";

type GoogleItem = { volumeInfo?: { title?: string; authors?: string[]; categories?: string[] } };
type OpenLibraryDoc = { title?: string; author_name?: string[]; subject?: string[] };

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      next: { revalidate: 7 * 24 * 60 * 60 },
      headers: { Accept: "application/json", "User-Agent": "Shelf-of-Fame book tags" },
    });
    return response.ok ? await response.json() as T : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const rateLimited = await enforceApiRateLimit(request);
  if (rateLimited) return rateLimited;

  const title = request.nextUrl.searchParams.get("title")?.replace(/\s+/g, " ").trim() || "";
  const author = request.nextUrl.searchParams.get("author")?.replace(/\s+/g, " ").trim() || "";
  if (title.length < 2 || title.length > 160 || author.length > 120) {
    return NextResponse.json({ genres: [], subjects: [] }, { status: 400 });
  }

  const googleParams = new URLSearchParams({ q: author ? `intitle:${title} inauthor:${author}` : `intitle:${title}`, maxResults: "10", printType: "books" });
  const openParams = new URLSearchParams({ title, fields: "title,author_name,subject", limit: "10" });
  if (author) openParams.set("author", author);

  const [google, openLibrary] = await Promise.all([
    fetchJson<{ items?: GoogleItem[] }>(`https://www.googleapis.com/books/v1/volumes?${googleParams.toString()}`),
    fetchJson<{ docs?: OpenLibraryDoc[] }>(`https://openlibrary.org/search.json?${openParams.toString()}`),
  ]);

  const googleMatch = (google?.items || [])
    .map((item) => ({ item, score: scoreBookCandidate(title, author, item.volumeInfo?.title, item.volumeInfo?.authors || []) }))
    .sort((a, b) => b.score - a.score)[0];
  const openMatch = (openLibrary?.docs || [])
    .map((item) => ({ item, score: scoreBookCandidate(title, author, item.title, item.author_name || []) }))
    .sort((a, b) => b.score - a.score)[0];

  const tags = mergePublicTags(
    googleMatch?.score ? googleMatch.item.volumeInfo?.categories || [] : [],
    openMatch?.score ? openMatch.item.subject || [] : [],
  );
  return NextResponse.json(tags, { headers: { "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=2592000" } });
}
