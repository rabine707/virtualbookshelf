import { NextRequest, NextResponse } from "next/server";
import { discoverIsbn, lightCoverLookup } from "./lib/books/discovery";
import { cleanIsbn } from "./lib/books/matching";
import { enforceApiRateLimit } from "./lib/rate-limit";

const lightHeaders = {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
};

export async function proxy(request: NextRequest) {
  const rateLimited = await enforceApiRateLimit(request);
  if (rateLimited) return rateLimited;

  if (request.nextUrl.pathname !== "/api/cover") return NextResponse.next();

  const params = request.nextUrl.searchParams;
  const title = params.get("title")?.trim() || "";
  const author = params.get("author")?.trim() || "";
  const existingIsbn = cleanIsbn(params.get("isbn") || "");
  const bypass = params.get("isbnDiscovery") === "done";
  const deepSearch = params.get("libraryThing") === "1";

  if (!title || bypass) return NextResponse.next();

  // Normal shelf/modal loading uses a deliberately small two-provider lookup.
  // The expensive fuzzy/edition fan-out remains behind "Search more covers".
  if (!deepSearch) {
    const options = await lightCoverLookup(title, author, existingIsbn);
    return NextResponse.json(
      options.length
        ? { ...options[0], options, lookupMode: "light" }
        : { url: null, source: null, options: [], lookupMode: "light" },
      { status: 200, headers: lightHeaders },
    );
  }

  if (existingIsbn) return NextResponse.next();

  const discoveredIsbn = await discoverIsbn(title, author);
  if (!discoveredIsbn) return NextResponse.next();

  const destination = request.nextUrl.clone();
  destination.searchParams.set("isbn", discoveredIsbn);
  destination.searchParams.set("isbnDiscovery", "done");

  try {
    const response = await fetch(destination, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const payload = await response.json() as Record<string, unknown>;
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store");
    return NextResponse.json({ ...payload, discoveredIsbn }, { status: 200, headers });
  } catch {
    return NextResponse.json(
      { url: null, source: null, options: [], discoveredIsbn },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export const config = {
  matcher: [
    "/api/generate-spine",
    "/api/web-covers",
    "/api/cover",
    "/api/romance-cover",
    "/api/asin",
  ],
};
