import { NextRequest, NextResponse } from "next/server";

type OpenLibraryDoc = {
  title?: string;
  author_name?: string[];
  isbn?: string[];
};

type GoogleBook = {
  volumeInfo?: {
    title?: string;
    authors?: string[];
    industryIdentifiers?: { type?: string; identifier?: string }[];
  };
};

type Candidate = {
  isbn: string;
  score: number;
  source: string;
};

const STOP_WORDS = new Set(["a", "an", "and", "as", "at", "book", "by", "edition", "for", "from", "in", "into", "novel", "of", "on", "or", "series", "the", "to", "volume", "with"]);

function normalize(value?: string) {
  return (value || "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function words(value?: string) {
  return normalize(value).split(" ").filter(Boolean);
}

function titleWords(value?: string) {
  const all = words(value);
  const useful = all.filter((word) => word.length > 1 && !STOP_WORDS.has(word));
  return useful.length ? [...new Set(useful)] : [...new Set(all)];
}

function stripSeriesSuffix(title: string) {
  let cleaned = title.trim();
  for (let pass = 0; pass < 3; pass += 1) {
    const match = cleaned.match(/\s*[\(\[]([^\)\]]+)[\)\]]\s*$/);
    if (!match) break;
    const metadata = match[1];
    const looksLikeSeries = /#\s*\d+(?:\.\d+)?\b/i.test(metadata)
      || /\b(?:book|volume|vol\.?|part)\s*(?:#|no\.?\s*)?\d+(?:\.\d+)?\b/i.test(metadata)
      || /\b(?:series|duet|trilogy|saga)\b[^\d]{0,30}\d+(?:\.\d+)?\b/i.test(metadata);
    if (!looksLikeSeries) break;
    cleaned = cleaned.slice(0, match.index).trim();
  }
  return cleaned || title.trim();
}

function cleanIsbn(value?: string) {
  const cleaned = (value || "").replace(/[^0-9Xx]/g, "");
  return /^(?:\d{13}|\d{9}[\dXx])$/.test(cleaned) ? cleaned : null;
}

function authorScore(requested: string, candidates: string[]) {
  if (!requested.trim()) return 5;
  const wanted = words(requested);
  const wantedLast = wanted.at(-1);
  let best = 0;
  for (const candidate of candidates) {
    const found = words(candidate);
    const foundSet = new Set(found);
    const shared = wanted.filter((word) => foundSet.has(word)).length;
    const overlap = wanted.length ? shared / wanted.length : 0;
    if (normalize(candidate) === normalize(requested)) best = Math.max(best, 10);
    else if (wantedLast && foundSet.has(wantedLast) && overlap >= 0.5) best = Math.max(best, 8);
    else if (wantedLast && foundSet.has(wantedLast)) best = Math.max(best, 6);
    else if (overlap >= 0.67) best = Math.max(best, 5);
  }
  return best;
}

function titleScore(requested: string, candidate?: string) {
  const wanted = normalize(stripSeriesSuffix(requested));
  const found = normalize(candidate);
  if (!wanted || !found) return 0;
  if (wanted === found) return 14;
  if (wanted.includes(found) || found.includes(wanted)) return 11;

  const wantedWords = titleWords(wanted);
  const foundSet = new Set(titleWords(found));
  const matches = wantedWords.filter((word) => foundSet.has(word)).length;
  const coverage = wantedWords.length ? matches / wantedWords.length : 0;
  if (coverage >= 0.85 && matches >= 2) return 9;
  if (coverage >= 0.67 && matches >= 2) return 7;
  if (coverage >= 0.5 && matches >= 2) return 5;
  return 0;
}

function score(title: string, author: string, candidateTitle?: string, candidateAuthors: string[] = []) {
  const t = titleScore(title, candidateTitle);
  const a = authorScore(author, candidateAuthors);
  if (!t || (author.trim() && a < 5)) return 0;
  return t + a;
}

function googleIsbn(item: GoogleBook) {
  const ids = item.volumeInfo?.industryIdentifiers || [];
  return cleanIsbn(ids.find((id) => id.type === "ISBN_13")?.identifier)
    || cleanIsbn(ids.find((id) => id.type === "ISBN_10")?.identifier);
}

async function googleCandidates(title: string, author: string): Promise<Candidate[]> {
  const cleanTitle = stripSeriesSuffix(title);
  const queries = [
    author ? `intitle:${cleanTitle} inauthor:${author}` : `intitle:${cleanTitle}`,
    author ? `${cleanTitle} ${author}` : cleanTitle,
  ];
  const results: Candidate[] = [];

  for (const query of queries) {
    try {
      const params = new URLSearchParams({ q: query, maxResults: "30", printType: "books" });
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`, { next: { revalidate: 86400 } });
      if (!response.ok) continue;
      const data = await response.json() as { items?: GoogleBook[] };
      for (const item of data.items || []) {
        const isbn = googleIsbn(item);
        if (!isbn) continue;
        const candidateScore = score(title, author, item.volumeInfo?.title, item.volumeInfo?.authors || []);
        if (candidateScore >= 13) results.push({ isbn, score: candidateScore + 0.25, source: "Google Books" });
      }
    } catch {}
  }
  return results;
}

async function openLibraryCandidates(title: string, author: string): Promise<Candidate[]> {
  try {
    const params = new URLSearchParams({ title: stripSeriesSuffix(title), fields: "title,author_name,isbn", limit: "40" });
    if (author) params.set("author", author);
    const response = await fetch(`https://openlibrary.org/search.json?${params.toString()}`, { next: { revalidate: 86400 } });
    if (!response.ok) return [];
    const data = await response.json() as { docs?: OpenLibraryDoc[] };
    const results: Candidate[] = [];
    for (const doc of data.docs || []) {
      const candidateScore = score(title, author, doc.title, doc.author_name || []);
      if (candidateScore < 13) continue;
      const isbns = (doc.isbn || []).map(cleanIsbn).filter((value): value is string => Boolean(value));
      const preferred = isbns.find((value) => value.length === 13) || isbns[0];
      if (preferred) results.push({ isbn: preferred, score: candidateScore, source: "Open Library" });
    }
    return results;
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get("title")?.trim() || "";
  const author = request.nextUrl.searchParams.get("author")?.trim() || "";
  if (!title) return NextResponse.json({ isbn: null, source: null }, { status: 400 });

  const [google, openLibrary] = await Promise.all([googleCandidates(title, author), openLibraryCandidates(title, author)]);
  const byIsbn = new Map<string, Candidate>();
  for (const candidate of [...google, ...openLibrary]) {
    const existing = byIsbn.get(candidate.isbn);
    if (!existing || candidate.score > existing.score) byIsbn.set(candidate.isbn, candidate);
  }

  const ranked = [...byIsbn.values()].sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best) return NextResponse.json({ isbn: null, source: null }, { headers: { "Cache-Control": "no-store" } });

  const second = ranked[1];
  const confident = best.score >= 18 || (best.score >= 15 && (!second || best.score - second.score >= 2));
  if (!confident) {
    return NextResponse.json({ isbn: null, source: null, candidates: ranked.slice(0, 3).map((item) => ({ isbn: item.isbn, source: item.source, score: item.score })) }, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({ isbn: best.isbn, source: best.source, score: best.score }, { headers: { "Cache-Control": "no-store" } });
}
