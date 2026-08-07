import { createHash } from "crypto";
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

type MatchResult = {
  score: number;
  accepted: boolean;
};

type TitleEvidence = {
  score: number;
  exact: boolean;
  adjacent: boolean;
  coverage: number;
  keywordCount: number;
};

type CoverOption = {
  url: string;
  source: string;
  score: number;
  fingerprint?: string;
};

const responseHeaders = {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
};

const TITLE_STOP_WORDS = new Set([
  "a", "an", "and", "as", "at", "book", "by", "for", "from", "in", "into",
  "novel", "of", "on", "or", "the", "to", "with",
]);

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

function textWords(value?: string) {
  return normalizeText(value).split(" ").filter(Boolean);
}

function titleKeywords(value?: string) {
  const allWords = textWords(value);
  const significant = allWords.filter((word) => word.length > 1 && !TITLE_STOP_WORDS.has(word));
  return significant.length ? [...new Set(significant)] : [...new Set(allWords)];
}

function looksLikeSeriesMetadata(value: string) {
  const text = value.trim();
  return /#\s*\d+(?:\.\d+)?\b/i.test(text)
    || /\b(?:book|volume|vol\.?|part)\s*(?:#|no\.?\s*)?\d+(?:\.\d+)?\b/i.test(text)
    || /\b(?:series|duet|trilogy|saga)\b[^\d]{0,30}\d+(?:\.\d+)?\b/i.test(text);
}

function stripGoodreadsSeriesSuffix(title: string) {
  let cleaned = title.trim();

  for (let pass = 0; pass < 3; pass += 1) {
    const match = cleaned.match(/\s*[\(\[]([^\)\]]+)[\)\]]\s*$/);
    if (!match || !looksLikeSeriesMetadata(match[1])) break;
    cleaned = cleaned.slice(0, match.index).trim();
  }

  cleaned = cleaned
    .replace(/\s*[-–—:]\s*(?:book|volume|vol\.?|part)\s*(?:#|no\.?\s*)?\d+(?:\.\d+)?\s*$/i, "")
    .trim();

  return cleaned || title.trim();
}

function titleVariants(title: string) {
  const original = title.trim();
  const core = stripGoodreadsSeriesSuffix(original);
  const variants = core && normalizeText(core) !== normalizeText(original)
    ? [core, original]
    : [original];

  const seen = new Set<string>();
  return variants.filter((variant) => {
    const key = normalizeText(variant);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function authorEvidence(requestedAuthor: string, candidateAuthors: string[]) {
  const wanted = normalizeText(requestedAuthor);
  if (!wanted) return 0;

  const wantedWords = textWords(wanted);
  const wantedLastName = wantedWords.at(-1);
  let best = 0;

  for (const candidate of candidateAuthors) {
    const found = normalizeText(candidate);
    if (!found) continue;

    if (found === wanted || found.includes(wanted) || wanted.includes(found)) {
      best = Math.max(best, 8);
      continue;
    }

    const foundWords = textWords(found);
    const foundSet = new Set(foundWords);
    const shared = wantedWords.filter((word) => foundSet.has(word)).length;
    const overlap = wantedWords.length ? shared / wantedWords.length : 0;

    if (wantedLastName && foundSet.has(wantedLastName)) best = Math.max(best, 5);
    if (overlap >= 0.67) best = Math.max(best, 4);
    else if (overlap >= 0.5) best = Math.max(best, 3);
  }

  return best;
}

function titleEvidence(requestedTitle: string, candidateTitle?: string): TitleEvidence {
  const wantedTitle = normalizeText(requestedTitle);
  const foundTitle = normalizeText(candidateTitle);
  if (!wantedTitle || !foundTitle) {
    return { score: 0, exact: false, adjacent: false, coverage: 0, keywordCount: 0 };
  }

  const wantedKeywords = titleKeywords(wantedTitle);
  const foundKeywordSet = new Set(titleKeywords(foundTitle));
  const keywordMatches = wantedKeywords.filter((word) => foundKeywordSet.has(word)).length;
  const coverage = wantedKeywords.length ? keywordMatches / wantedKeywords.length : 0;

  let score = 0;
  let exact = false;
  let adjacent = false;

  if (foundTitle === wantedTitle) {
    score = 14;
    exact = true;
  } else if (foundTitle.includes(wantedTitle) || wantedTitle.includes(foundTitle)) {
    score = 11;
    adjacent = true;
  } else {
    score = coverage * 9;
    if (coverage >= 0.75) score += 1;
  }

  return { score, exact, adjacent, coverage, keywordCount: wantedKeywords.length };
}

function matchCandidate(
  requestedTitle: string,
  requestedAuthor: string,
  candidateTitle?: string,
  candidateAuthors: string[] = [],
): MatchResult {
  const titleMatches = titleVariants(requestedTitle)
    .map((variant) => titleEvidence(variant, candidateTitle))
    .sort((a, b) => b.score - a.score);
  const bestTitle = titleMatches[0];
  if (!bestTitle || bestTitle.score <= 0) return { score: 0, accepted: false };

  const authorScore = authorEvidence(requestedAuthor, candidateAuthors);
  const hasRequestedAuthor = Boolean(normalizeText(requestedAuthor));
  const score = bestTitle.score + authorScore;

  let accepted = false;
  if (!hasRequestedAuthor) {
    accepted = bestTitle.exact || bestTitle.adjacent || bestTitle.coverage >= 0.7;
  } else if (authorScore >= 7) {
    accepted = bestTitle.exact || bestTitle.adjacent || bestTitle.coverage >= 0.34;
  } else if (authorScore >= 5) {
    accepted = bestTitle.exact || bestTitle.adjacent || bestTitle.coverage >= 0.5;
  } else if (authorScore >= 3) {
    accepted = bestTitle.exact || bestTitle.adjacent || bestTitle.coverage >= 0.75;
  }

  if (hasRequestedAuthor && bestTitle.keywordCount <= 1 && authorScore < 5) accepted = false;
  return { score, accepted };
}

function keywordSearchText(title: string, author: string) {
  const keywords = titleKeywords(title).slice(0, 6);
  const authorWords = textWords(author);
  const authorLastName = authorWords.at(-1);
  return [...keywords, authorLastName].filter(Boolean).join(" ");
}

function cleanRelatedIsbn(value: string) {
  const cleaned = value.replace(/[^0-9Xx]/g, "");
  return /^(?:\d{13}|\d{9}[\dXx])$/.test(cleaned) ? cleaned : null;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function libraryThingRelatedIsbns(isbn: string) {
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

async function libraryThingIsbnsByTitle(title: string) {
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
    const evidence = titleEvidence(searchTitle, returnedTitle);
    if (!(evidence.exact || evidence.adjacent || evidence.coverage >= 0.75)) return [];
  }

  const isbns = [...xml.matchAll(/<isbn>([^<]+)<\/isbn>/gi)]
    .map((match) => cleanRelatedIsbn(match[1]))
    .filter((value): value is string => Boolean(value));

  return [...new Set(isbns)].slice(0, 10);
}

function libraryThingServiceUrl(isbn: string) {
  const token = process.env.LIBRARYTHING_API_TOKEN?.trim();
  if (!token) return null;
  return `https://covers.librarything.com/devkey/${encodeURIComponent(token)}/large/isbn/${encodeURIComponent(isbn)}`;
}

function isBlankLibraryThingGif(bytes: Uint8Array) {
  if (bytes.length < 10) return true;
  const signature = String.fromCharCode(...bytes.slice(0, 6));
  if (signature !== "GIF87a" && signature !== "GIF89a") return false;
  const width = bytes[6] | (bytes[7] << 8);
  const height = bytes[8] | (bytes[9] << 8);
  return width <= 1 && height <= 1;
}

async function libraryThingCoverByIsbn(isbn: string, score: number): Promise<CoverOption[]> {
  const serviceUrl = libraryThingServiceUrl(isbn);
  if (!serviceUrl) return [];

  const response = await fetch(serviceUrl, { next: { revalidate: 604800 } });
  if (!response.ok) return [];

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) return [];

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length || isBlankLibraryThingGif(bytes)) return [];

  const fingerprint = createHash("sha1").update(bytes).digest("hex");
  const proxyUrl = `/api/librarything-cover?isbn=${encodeURIComponent(isbn)}`;
  return [{ url: proxyUrl, source: "LibraryThing", score, fingerprint }];
}

async function libraryThingCoversSequential(isbns: string[], startScore = 22) {
  const results: CoverOption[] = [];
  const uniqueIsbns = [...new Set(isbns)].slice(0, 4);

  for (const [index, isbn] of uniqueIsbns.entries()) {
    await wait(1050);
    const covers = await libraryThingCoverByIsbn(isbn, startScore - index * 0.1);
    results.push(...covers);
  }

  return results;
}

function openLibraryCoverById(coverId?: number) {
  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;
}

async function openLibraryCoverByIsbn(isbn: string): Promise<CoverOption[]> {
  const key = `ISBN:${isbn}`;
  const url = `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(key)}&format=json&jscmd=data`;
  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) return [];

  const data = await response.json() as Record<string, OpenLibraryBook>;
  const cover = data[key]?.cover;
  const image = httpsImage(cover?.large || cover?.medium || cover?.small);
  return image ? [{ url: image, source: "Open Library", score: 30 }] : [];
}

async function openLibrarySearchByIsbn(isbn: string): Promise<CoverOption[]> {
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

async function openLibraryMatches(url: string, requestedTitle: string, author: string): Promise<CoverOption[]> {
  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) return [];

  const data = await response.json() as OpenLibrarySearchResponse;
  const results: CoverOption[] = [];

  for (const doc of data.docs || []) {
    const image = openLibraryCoverById(doc.cover_i);
    if (!image) continue;
    const match = matchCandidate(requestedTitle, author, doc.title, doc.author_name || []);
    if (match.accepted) results.push({ url: image, source: "Open Library", score: match.score });
  }

  return results;
}

async function openLibrarySearchByTitle(searchTitle: string, requestedTitle: string, author: string) {
  const params = new URLSearchParams({ title: searchTitle, fields: "title,author_name,cover_i", limit: "30" });
  if (author) params.set("author", author);
  return openLibraryMatches(`https://openlibrary.org/search.json?${params.toString()}`, requestedTitle, author);
}

async function openLibraryKeywordSearch(searchTitle: string, requestedTitle: string, author: string) {
  const q = keywordSearchText(searchTitle, author);
  if (!q) return [];
  const params = new URLSearchParams({ q, fields: "title,author_name,cover_i", limit: "30" });
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

async function googleBooksCovers(
  query: string,
  requestedTitle = "",
  author = "",
  trustFirst = false,
): Promise<CoverOption[]> {
  const params = new URLSearchParams({ q: query, maxResults: "40", printType: "books" });
  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`, {
    next: { revalidate: 86400 },
  });
  if (!response.ok) return [];

  const data = await response.json() as GoogleBooksResponse;
  const results: CoverOption[] = [];

  for (const [index, item] of (data.items || []).entries()) {
    const image = googleImage(item);
    if (!image) continue;

    if (trustFirst) {
      results.push({ url: image, source: "Google Books", score: 29 - index * 0.1 });
      continue;
    }

    const match = matchCandidate(requestedTitle, author, item.volumeInfo?.title, item.volumeInfo?.authors || []);
    if (match.accepted) results.push({ url: image, source: "Google Books", score: match.score + 0.25 });
  }

  return results;
}

function uniqueRanked(options: CoverOption[]) {
  const seen = new Set<string>();
  return options
    .sort((a, b) => b.score - a.score)
    .filter((option) => {
      const key = option.fingerprint || option.url.replace(/&zoom=\d+/i, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 20)
    .map(({ url, source }) => ({ url, source }));
}

export async function GET(request: NextRequest) {
  const isbn = request.nextUrl.searchParams.get("isbn")?.trim() || "";
  const title = request.nextUrl.searchParams.get("title")?.trim() || "";
  const author = request.nextUrl.searchParams.get("author")?.trim() || "";
  const includeLibraryThing = request.nextUrl.searchParams.get("libraryThing") === "1";
  let discoveredIsbn = "";

  try {
    const searches: Promise<CoverOption[]>[] = [];

    if (isbn) {
      searches.push(openLibraryCoverByIsbn(isbn));
      searches.push(openLibrarySearchByIsbn(isbn));
      searches.push(googleBooksCovers(`isbn:${isbn}`, title, author, true));
    }

    if (title) {
      for (const searchTitle of titleVariants(title)) {
        searches.push(openLibrarySearchByTitle(searchTitle, title, author));
        searches.push(openLibraryKeywordSearch(searchTitle, title, author));

        const strictGoogleQuery = author
          ? `intitle:${searchTitle} inauthor:${author}`
          : `intitle:${searchTitle}`;
        searches.push(googleBooksCovers(strictGoogleQuery, title, author));
        searches.push(googleBooksCovers(author ? `${searchTitle} ${author}` : searchTitle, title, author));

        const keywordQuery = keywordSearchText(searchTitle, author);
        if (keywordQuery) searches.push(googleBooksCovers(keywordQuery, title, author));
      }
    }

    const groups = await Promise.allSettled(searches);
    let candidates = groups.flatMap((group) => group.status === "fulfilled" ? group.value : []);

    if (includeLibraryThing) {
      try {
        let editionIsbns: string[] = [];

        if (isbn) {
          const relatedIsbns = await libraryThingRelatedIsbns(isbn);
          editionIsbns = [isbn, ...relatedIsbns];
        } else if (title) {
          editionIsbns = await libraryThingIsbnsByTitle(title);
          discoveredIsbn = editionIsbns[0] || "";
        }

        if (editionIsbns.length) {
          const nonLibraryThingSearches: Promise<CoverOption[]>[] = [];

          for (const [index, editionIsbn] of editionIsbns.entries()) {
            nonLibraryThingSearches.push(openLibraryCoverByIsbn(editionIsbn));
            nonLibraryThingSearches.push(openLibrarySearchByIsbn(editionIsbn));
            nonLibraryThingSearches.push(googleBooksCovers(`isbn:${editionIsbn}`, title, author, !discoveredIsbn));

            if (index >= 9) break;
          }

          const [nonLtGroups, ltCovers] = await Promise.all([
            Promise.allSettled(nonLibraryThingSearches),
            libraryThingCoversSequential(editionIsbns, isbn ? 22 : 21.5),
          ]);

          const relatedCandidates = nonLtGroups
            .flatMap((group) => group.status === "fulfilled" ? group.value : [])
            .map((option, index) => ({
              ...option,
              score: Math.min(option.score, 19.5 - index * 0.01),
            }));

          candidates = [...candidates, ...relatedCandidates, ...ltCovers];
        }
      } catch {
        // LibraryThing is an optional title, edition, and cover-discovery source.
      }
    }

    const options = uniqueRanked(candidates);

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
