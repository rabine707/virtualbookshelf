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

type BraveImageResponse = { results?: BraveImageResult[] };

function safeHttpUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch { return null; }
}

function normalized(value = "") {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
}

function scoreResult(item: BraveImageResult, title: string, author: string, mode: string) {
  const haystack = normalized([item.title, item.source, item.page_url].filter(Boolean).join(" "));
  const titleWords = normalized(title).split(" ").filter((word) => word.length > 2);
  const authorWords = normalized(author).split(" ").filter((word) => word.length > 2);
  const titleHits = titleWords.filter((word) => haystack.includes(word)).length;
  const authorHits = authorWords.filter((word) => haystack.includes(word)).length;
  let score = titleHits * 8 + authorHits * 3;

  if (titleWords.length && titleHits === titleWords.length) score += 18;
  if (authorWords.length && authorHits === authorWords.length) score += 6;

  const width = item.properties?.width || 0;
  const height = item.properties?.height || 0;
  if (width && height) {
    const ratio = width / height;
    if (ratio >= 0.55 && ratio <= 0.8) score += 6;
    else if (ratio >= 0.45 && ratio <= 0.9) score += 3;
    if (height >= 800) score += 2;
  }

  if (mode === "custom") {
    const genericPhrases = [
      "personalized", "personalisation", "personalization", "personalization example",
      "custom book cover design", "custom book cover service", "blank template",
      "custom dust jacket service", "design your own", "made to order",
    ];
    if (genericPhrases.some((phrase) => haystack.includes(phrase))) score -= 30;
    if (/etsy|rebind|rebinding|dust jacket|special edition|fanmade|fan made|custom cover/.test(haystack)) score += 4;
  }

  return score;
}

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get("title")?.trim() || "";
  const author = request.nextUrl.searchParams.get("author")?.trim() || "";
  const mode = request.nextUrl.searchParams.get("mode")?.trim() || "covers";

  if (!title) return NextResponse.json({ error: "Missing title", results: [] }, { status: 400 });

  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "BRAVE_SEARCH_API_KEY is not configured", setupRequired: true, results: [] }, { status: 503 });

  const quotedTitle = `\"${title.replaceAll('"', "")}\"`;
  const quotedAuthor = author ? `\"${author.replaceAll('"', "")}\"` : "";
  const suffix = mode === "custom"
    ? "custom book cover rebind dust jacket special edition Etsy fanmade cover art"
    : mode === "alternate"
      ? "book cover special edition alternate cover hardcover paperback"
      : "book cover ebook cover cover art";
  const query = [quotedTitle, quotedAuthor, suffix].filter(Boolean).join(" ");

  // Ask Brave for a wider candidate pool, then return the five most book-specific images.
  const params = new URLSearchParams({ q: query, count: "20", country: "US", search_lang: "en", safesearch: "strict", spellcheck: "true" });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const response = await fetch(`https://api.search.brave.com/res/v1/images/search?${params.toString()}`, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json", "Accept-Encoding": "gzip", "X-Subscription-Token": apiKey },
    }).finally(() => clearTimeout(timer));

    if (!response.ok) return NextResponse.json({ error: `Image search returned ${response.status}`, results: [] }, { status: response.status === 429 ? 429 : 502 });

    const data = await response.json() as BraveImageResponse;
    const seen = new Set<string>();
    const candidates = (data.results || []).flatMap((item, index) => {
      const original = safeHttpUrl(item.properties?.url || item.url);
      const thumbnail = safeHttpUrl(item.thumbnail?.src || item.properties?.placeholder);
      const imageUrl = original || thumbnail;
      if (!imageUrl || seen.has(imageUrl)) return [];
      seen.add(imageUrl);
      return [{ item, index, imageUrl, thumbnail }];
    });

    const results = candidates
      .map((candidate) => ({ ...candidate, score: scoreResult(candidate.item, title, author, mode) }))
      .filter((candidate) => mode !== "custom" || candidate.score > -5)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, 5)
      .map(({ item, imageUrl, thumbnail }) => ({
        url: imageUrl,
        thumbnailUrl: thumbnail || imageUrl,
        source: "Web image",
        title: item.title || "Web cover result",
        pageUrl: safeHttpUrl(item.page_url),
        publisher: item.source || null,
        width: item.properties?.width || null,
        height: item.properties?.height || null,
      }));

    return NextResponse.json({ query, mode, results });
  } catch {
    return NextResponse.json({ error: "Image search failed", results: [] }, { status: 502 });
  }
}
