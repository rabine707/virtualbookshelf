import { NextRequest, NextResponse } from "next/server";

type BraveImageResult = {
  title?: string;
  url?: string;
  source?: string;
  page_url?: string;
  thumbnail?: { src?: string };
  properties?: {
    url?: string;
    placeholder?: string;
    width?: number;
    height?: number;
  };
};

type BraveImageResponse = {
  results?: BraveImageResult[];
};

function safeHttpUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get("title")?.trim() || "";
  const author = request.nextUrl.searchParams.get("author")?.trim() || "";
  const mode = request.nextUrl.searchParams.get("mode")?.trim() || "covers";

  if (!title) {
    return NextResponse.json({ error: "Missing title", results: [] }, { status: 400 });
  }

  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      error: "BRAVE_SEARCH_API_KEY is not configured",
      setupRequired: true,
      results: [],
    }, { status: 503 });
  }

  const suffix = mode === "custom"
    ? "book cover special edition custom dust jacket Etsy"
    : mode === "alternate"
      ? "book cover alternate edition special edition"
      : "book cover";
  const query = [title, author, suffix].filter(Boolean).join(" ");

  const params = new URLSearchParams({
    q: query,
    count: "5",
    country: "US",
    search_lang: "en",
    safesearch: "strict",
    spellcheck: "true",
  });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const response = await fetch(`https://api.search.brave.com/res/v1/images/search?${params.toString()}`, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
    }).finally(() => clearTimeout(timer));

    if (!response.ok) {
      return NextResponse.json({
        error: `Image search returned ${response.status}`,
        results: [],
      }, { status: response.status === 429 ? 429 : 502 });
    }

    const data = await response.json() as BraveImageResponse;
    const seen = new Set<string>();
    const results = (data.results || []).flatMap((item) => {
      const original = safeHttpUrl(item.properties?.url || item.url);
      const thumbnail = safeHttpUrl(item.thumbnail?.src || item.properties?.placeholder);
      const imageUrl = original || thumbnail;
      if (!imageUrl || seen.has(imageUrl)) return [];
      seen.add(imageUrl);

      return [{
        url: imageUrl,
        thumbnailUrl: thumbnail || imageUrl,
        source: "Web image",
        title: item.title || "Web cover result",
        pageUrl: safeHttpUrl(item.page_url),
        publisher: item.source || null,
        width: item.properties?.width || null,
        height: item.properties?.height || null,
      }];
    }).slice(0, 5);

    return NextResponse.json({ query, mode, results });
  } catch {
    return NextResponse.json({ error: "Image search failed", results: [] }, { status: 502 });
  }
}
