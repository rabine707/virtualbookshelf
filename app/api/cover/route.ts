import { NextRequest, NextResponse } from "next/server";
import { searchDeepCovers } from "../../../lib/books/deep-cover-search";

const responseHeaders = {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
};

export async function GET(request: NextRequest) {
  const isbn = request.nextUrl.searchParams.get("isbn")?.trim() || "";
  const title = request.nextUrl.searchParams.get("title")?.trim() || "";
  const author = request.nextUrl.searchParams.get("author")?.trim() || "";
  const includeLibraryThing = request.nextUrl.searchParams.get("libraryThing") === "1";

  try {
    const { options, discoveredIsbn } = await searchDeepCovers({
      isbn,
      title,
      author,
      includeLibraryThing,
    });

    if (options.length) {
      return NextResponse.json(
        { ...options[0], options, ...(discoveredIsbn ? { discoveredIsbn } : {}) },
        { headers: includeLibraryThing ? { "Cache-Control": "no-store" } : responseHeaders },
      );
    }

    if (discoveredIsbn) {
      return NextResponse.json(
        { url: null, source: null, options: [], discoveredIsbn },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
  } catch {
    // Provider failures should never break the shelf.
  }

  return NextResponse.json(
    { url: null, source: null, options: [] },
    {
      status: 404,
      headers: { "Cache-Control": includeLibraryThing ? "no-store" : "public, s-maxage=3600" },
    },
  );
}
