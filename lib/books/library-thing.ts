import type { CoverCandidate } from "./providers";
import {
  deepAuthorEvidence,
  deepTitleEvidence,
  deepTitleVariants,
  stripGoodreadsSeriesSuffix,
} from "./matching";

function cleanRelatedIsbn(value: string) {
  const cleaned = value.replace(/[^0-9Xx]/g, "");
  return /^(?:\d{13}|\d{9}[\dXx])$/.test(cleaned) ? cleaned : null;
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function htmlText(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim();
}

export async function libraryThingRelatedIsbns(isbn: string) {
  const token = process.env.LIBRARYTHING_API_TOKEN?.trim();
  if (!token || !isbn) return [];

  const response = await fetch(
    `https://www.librarything.com/api/${encodeURIComponent(token)}/thingISBN/${encodeURIComponent(isbn)}`,
    { next: { revalidate: 86400 } },
  );
  if (!response.ok) return [];

  const xml = await response.text();
  const related = [...xml.matchAll(/<isbn>([^<]+)<\/isbn>/gi)]
    .map((match) => cleanRelatedIsbn(match[1]))
    .filter((value): value is string => Boolean(value) && value !== isbn);

  return [...new Set(related)].slice(0, 10);
}

export async function libraryThingIsbnsByTitle(title: string) {
  const token = process.env.LIBRARYTHING_API_TOKEN?.trim();
  const searchTitle = stripGoodreadsSeriesSuffix(title);
  if (!token || !searchTitle) return [];

  const response = await fetch(
    `https://www.librarything.com/api/${encodeURIComponent(token)}/thingTitle/${encodeURIComponent(searchTitle)}`,
    { next: { revalidate: 86400 } },
  );
  if (!response.ok) return [];

  const xml = await response.text();
  const returnedTitle = xml.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
  if (returnedTitle) {
    const evidence = deepTitleEvidence(searchTitle, returnedTitle);
    if (!(evidence.exact || evidence.adjacent || evidence.coverage >= 0.5 || evidence.keywordMatches >= 2)) return [];
  }

  const isbns = [...xml.matchAll(/<isbn>([^<]+)<\/isbn>/gi)]
    .map((match) => cleanRelatedIsbn(match[1]))
    .filter((value): value is string => Boolean(value));

  return [...new Set(isbns)].slice(0, 10);
}

export async function libraryThingPopularCoversByTitle(
  title: string,
  author: string,
): Promise<CoverCandidate[]> {
  const searchTitle = stripGoodreadsSeriesSuffix(title);
  if (!searchTitle) return [];

  try {
    const response = await fetch(
      `https://www.librarything.com/title/${encodeURIComponent(searchTitle)}`,
      {
        redirect: "follow",
        next: { revalidate: 86400 },
        headers: { "User-Agent": "Shelf-of-Fame cover lookup" },
      },
    );
    if (!response.ok) return [];

    const html = await response.text();
    const heading = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
    const pageTitle = heading ? htmlText(heading) : "";
    if (pageTitle) {
      const evidence = deepTitleVariants(title)
        .map((variant) => deepTitleEvidence(variant, pageTitle))
        .sort((a, b) => b.score - a.score)[0];
      if (!evidence || !(evidence.exact || evidence.adjacent || evidence.coverage >= 0.5 || evidence.keywordMatches >= 2)) return [];
    }

    const headerRegion = html.slice(0, 30000);
    const authorMatch = headerRegion.match(/\bby\s*<a[^>]*>([\s\S]*?)<\/a>/i)?.[1];
    const pageAuthor = authorMatch ? htmlText(authorMatch) : "";
    if (author && pageAuthor && deepAuthorEvidence(author, [pageAuthor]) < 3) return [];

    const start = html.search(/Popular Covers/i);
    if (start < 0) return [];

    const tail = html.slice(start, start + 60000);
    const end = tail.search(/Find It/i);
    const section = end > 0 ? tail.slice(0, end) : tail;
    const urls: string[] = [];

    for (const match of section.matchAll(/<img\b[^>]*\b(?:src|data-src)=["']([^"']+)["'][^>]*>/gi)) {
      let url = decodeHtml(match[1]);
      if (!/^(?:https?:)?\/\/pics(?:\.cdn)?\.librarything\.com\/picsizes\//i.test(url)) continue;
      if (url.startsWith("//")) url = `https:${url}`;
      url = url.replace(/^http:\/\//i, "https://");
      if (!urls.includes(url)) urls.push(url);
      if (urls.length >= 20) break;
    }

    return urls.map((url, index) => ({
      url,
      source: "LibraryThing",
      score: 18.5 - index * 0.02,
    }));
  } catch {
    return [];
  }
}
