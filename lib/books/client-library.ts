export type CoverResult = {
  url: string;
  source: string;
};

export type WebCoverResult = {
  url: string;
  thumbnailUrl?: string;
  source?: string;
  title?: string;
  pageUrl?: string | null;
  publisher?: string | null;
};

export type CoverResponse = {
  url: string | null;
  source: string | null;
  options?: CoverResult[];
  discoveredIsbn?: string;
  discoveredRomanceioId?: string;
};

export type CoverFeedback = {
  accepted?: string;
  rejected?: string[];
  wrongEdition?: string[];
};

export type IdentifierConfidence = "high" | "medium" | "low";

export type Book = {
  id: string;
  title: string;
  author: string;
  rating?: number;
  year?: string;
  shelf?: string;
  isbn?: string;
  isbnSource?: string;
  isbnConfidence?: IdentifierConfidence;
  asin?: string;
  romanceioId?: string;
  webCoverPageUrl?: string;
  webCoverTitle?: string;
  importSource?: string;
  color: string;
  preferredCover?: CoverResult;
  savedCovers?: CoverResult[];
  coverFeedback?: CoverFeedback;
  coverReviewStatus?: "skipped" | "no-match";
};

export const STORAGE_KEY = "shelf-of-fame-library-v1";
export const COVER_DATA_VERSION_KEY = "shelf-of-fame-cover-data-version";
export const COVER_DATA_VERSION = "multi-cover-v9-romanceio";

const palette = ["#6f4e37", "#8b5e3c", "#5a6b4f", "#8e3b46", "#46627f", "#aa7a3d", "#584b63", "#7b6f62"];

export const coverMemory = new Map<string, CoverResult | null>();
export const coverOptionsMemory = new Map<string, CoverResult[]>();

export const sampleBooks: Book[] = [
  { id: "1", title: "Fourth Wing", author: "Rebecca Yarros", rating: 5, color: palette[4] },
  { id: "2", title: "The Serpent and the Wings of Night", author: "Carissa Broadbent", rating: 4, color: palette[6] },
  { id: "3", title: "Credence", author: "Penelope Douglas", rating: 4, color: palette[2] },
  { id: "4", title: "Lights Out", author: "Navessa Allen", rating: 5, color: palette[3] },
  { id: "5", title: "Blood of Hercules", author: "Jasmine Mas", rating: 4, color: palette[0] },
  { id: "6", title: "Dungeon Crawler Carl", author: "Matt Dinniman", rating: 4, color: palette[5] },
  { id: "7", title: "Warlock", author: "Daniel Kensington", rating: 5, isbn: "9781948500500", isbnSource: "Goodreads", isbnConfidence: "high", color: palette[7] },
  { id: "8", title: "Coven King", author: "Virgil Knightley", rating: 4, color: palette[1] },
  { id: "9", title: "Quicksilver", author: "Callie Hart", rating: 5, color: palette[4] },
  { id: "10", title: "The Ritual", author: "Shantel Tessier", rating: 4, color: palette[6] },
  { id: "11", title: "Butcher & Blackbird", author: "Brynne Weaver", rating: 5, color: palette[2] },
  { id: "12", title: "Haunting Adeline", author: "H. D. Carlton", rating: 4, color: palette[3] },
];

export function cleanIsbn(value?: string) {
  if (!value) return undefined;
  const cleaned = value.replace(/[=\"'\s-]/g, "").trim();
  return /^(?:\d{13}|\d{9}[\dXx])$/.test(cleaned) ? cleaned : undefined;
}

export function isbnForBook(book: Book) {
  return cleanIsbn(book.isbn) || cleanIsbn(book.id);
}

export function coverKey(book: Book) {
  return isbnForBook(book) || `${book.title.toLowerCase().trim()}::${book.author.toLowerCase().trim()}`;
}

export function coverRequestUrl(book: Book, includeLibraryThing = false) {
  const params = new URLSearchParams({
    title: book.title,
    author: book.author,
    coverVersion: COVER_DATA_VERSION,
  });
  const isbn = isbnForBook(book);
  if (isbn) params.set("isbn", isbn);
  if (includeLibraryThing) params.set("libraryThing", "1");
  return `/api/cover?${params.toString()}`;
}

export function romanceCoverRequestUrl(book: Book) {
  const params = new URLSearchParams({
    title: book.title,
    author: book.author,
  });
  if (book.romanceioId) params.set("romanceio", book.romanceioId);
  return `/api/romance-cover?${params.toString()}`;
}

export function uniqueCovers(covers: CoverResult[]) {
  const seen = new Set<string>();
  return covers.filter((cover) => {
    if (!cover?.url || seen.has(cover.url)) return false;
    seen.add(cover.url);
    return true;
  });
}

export function rejectedUrls(book: Book) {
  return new Set([
    ...(book.coverFeedback?.rejected || []),
    ...(book.coverFeedback?.wrongEdition || []),
  ]);
}

export function allowedCovers(book: Book, covers: CoverResult[]) {
  const rejected = rejectedUrls(book);
  return uniqueCovers(covers).filter((option) => !rejected.has(option.url));
}

export function normalizeGoodreadsRow(row: Record<string, string>, index: number): Book | null {
  const title = row.Title?.trim();
  if (!title) return null;

  const author = row.Author?.trim() || "Unknown author";
  const rating = Number(row["My Rating"] || 0) || undefined;
  const year = row["Year Published"]?.trim() || row["Original Publication Year"]?.trim() || undefined;
  const shelf = row["Exclusive Shelf"]?.trim() || undefined;
  const isbn = cleanIsbn(row.ISBN13) || cleanIsbn(row.ISBN);

  return {
    id: isbn || `${title}-${author}-${index}`,
    title,
    author,
    rating,
    year,
    shelf,
    isbn,
    isbnSource: isbn ? "Goodreads export" : undefined,
    isbnConfidence: isbn ? "high" : undefined,
    importSource: "Goodreads",
    color: palette[index % palette.length],
  };
}

function audibleValue(row: Record<string, string>, wantedKey: string) {
  const wanted = wantedKey.toLowerCase();
  for (const [rawKey, rawValue] of Object.entries(row)) {
    const key = rawKey.replace(/^\uFEFF/, "").trim().toLowerCase();
    if (key === wanted) return rawValue?.trim() || "";
  }
  return "";
}

function safeCoverUrl(value?: string) {
  const url = (value || "").trim();
  if (!/^https?:\/\//i.test(url)) return undefined;
  return url.replace(/^http:\/\//i, "https://");
}

function canonicalImportTitle(title: string) {
  let cleaned = title.trim();
  for (let pass = 0; pass < 3; pass += 1) {
    const match = cleaned.match(/\s*[\(\[]([^\)\]]+)[\)\]]\s*$/);
    if (!match) break;
    const metadata = match[1];
    const looksLikeSeries = /#\s*\d+(?:\.\d+)?\b/i.test(metadata)
      || /\b(?:book|volume|vol\.?|part)\s*(?:#|no\.?\s*)?\d+(?:\.\d+)?\b/i.test(metadata);
    if (!looksLikeSeries) break;
    cleaned = cleaned.slice(0, match.index).trim();
  }
  return cleaned || title.trim();
}

function importIdentity(book: Book) {
  const title = canonicalImportTitle(book.title).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const author = book.author.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return `${title}::${author}`;
}

export function normalizeAudibleRow(row: Record<string, string>, index: number): Book | null {
  const title = audibleValue(row, "title");
  if (!title) return null;

  const author = audibleValue(row, "authors") || "Unknown author";
  const asin = audibleValue(row, "asin") || undefined;
  const releaseDate = audibleValue(row, "release_date");
  const year = releaseDate.match(/\b(19|20)\d{2}\b/)?.[0];
  const coverUrl = safeCoverUrl(audibleValue(row, "cover_url"));

  return {
    id: asin ? `audible:${asin}` : `audible:${title}-${author}-${index}`,
    title,
    author,
    year,
    asin,
    importSource: "Audible",
    color: palette[index % palette.length],
    preferredCover: coverUrl ? { url: coverUrl, source: "Audible" } : undefined,
  };
}

export function looksLikeSampleShelf(books: Book[]) {
  return books.length === sampleBooks.length && books.every((book, index) => book.id === sampleBooks[index]?.id);
}

export function mergeAudibleBooks(current: Book[], imported: Book[]) {
  const next = [...current];
  const indexByIdentity = new Map(next.map((book, index) => [importIdentity(book), index]));

  for (const audibleBook of imported) {
    const key = importIdentity(audibleBook);
    const existingIndex = indexByIdentity.get(key);

    if (existingIndex === undefined) {
      indexByIdentity.set(key, next.length);
      next.push(audibleBook);
      continue;
    }

    const existing = next[existingIndex];
    const sources = new Set(
      `${existing.importSource || ""},${audibleBook.importSource || ""}`
        .split(",")
        .map((source) => source.trim())
        .filter(Boolean),
    );

    next[existingIndex] = {
      ...existing,
      asin: existing.asin || audibleBook.asin,
      importSource: [...sources].join(" + ") || existing.importSource,
      preferredCover: existing.preferredCover || audibleBook.preferredCover,
    };
  }

  return next;
}

export function mergeGoodreadsFeedback(current: Book[], imported: Book[]) {
  const byIdentity = new Map(current.map((book) => [importIdentity(book), book]));
  return imported.map((book) => {
    const existing = byIdentity.get(importIdentity(book));
    if (!existing) return book;
    const importedHasIsbn = Boolean(book.isbn);
    return {
      ...book,
      isbn: book.isbn || existing.isbn,
      isbnSource: importedHasIsbn ? book.isbnSource : existing.isbnSource,
      isbnConfidence: importedHasIsbn ? book.isbnConfidence : existing.isbnConfidence,
      preferredCover: existing.preferredCover,
      savedCovers: existing.savedCovers,
      coverFeedback: existing.coverFeedback,
      asin: existing.asin,
      romanceioId: existing.romanceioId,
      webCoverPageUrl: existing.webCoverPageUrl,
      webCoverTitle: existing.webCoverTitle,
      importSource: existing.importSource?.includes("Audible") ? "Goodreads + Audible" : book.importSource,
    };
  });
}

export function isStoredBook(value: unknown): value is Book {
  if (!value || typeof value !== "object") return false;
  const book = value as Partial<Book>;
  return typeof book.id === "string"
    && typeof book.title === "string"
    && typeof book.author === "string"
    && typeof book.color === "string";
}

export function coverSourceLabel(source: string) {
  if (source === "Open Library") return "OL";
  if (source === "Google Books") return "Google";
  if (source === "LibraryThing") return "LT";
  if (source === "Romance.io") return "Romance";
  if (source === "Audible") return "Audible";
  return source;
}
