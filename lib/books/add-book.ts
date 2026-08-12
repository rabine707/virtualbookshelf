import { Book, looksLikeSampleShelf, uniqueCovers } from "./client-library";

export type BookSearchResult = {
  id: string;
  title: string;
  author: string;
  year?: number;
  isbn?: string;
  coverUrl?: string;
  source: "Google Books" | "Open Library";
};

const PALETTE = ["#6f4e37", "#8b5e3c", "#5a6b4f", "#8e3b46", "#46627f", "#aa7a3d", "#584b63", "#7b6f62"];

function normalize(value?: string) {
  return (value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function looseAuthorMatch(existingAuthor: string, queryAuthor: string) {
  const existing = normalize(existingAuthor);
  const query = normalize(queryAuthor);
  if (!query) return true;
  if (!existing) return false;
  if (existing === query || existing.includes(query) || query.includes(existing)) return true;

  const existingWords = new Set(existing.split(" ").filter(Boolean));
  const queryWords = query.split(" ").filter(Boolean);
  return queryWords.length > 0 && queryWords.every((word) => existingWords.has(word));
}

export function mergeBookSearchResult(
  current: Book[],
  result: BookSearchResult,
  queryTitle: string,
  queryAuthor: string,
) {
  const base = looksLikeSampleShelf(current) ? [] : [...current];
  const canonicalTitle = normalize(result.title);
  const canonicalAuthor = normalize(result.author);

  let targetIndex = base.findIndex((book) =>
    normalize(book.title) === canonicalTitle && normalize(book.author) === canonicalAuthor
  );

  let upgradingManual = false;
  if (targetIndex < 0) {
    targetIndex = base.findIndex((book) =>
      book.importSource === "Added manually"
      && normalize(book.title) === normalize(queryTitle)
      && looseAuthorMatch(book.author, queryAuthor)
    );
    upgradingManual = targetIndex >= 0;
  }

  const existing = targetIndex >= 0 ? base[targetIndex] : undefined;
  const cover = result.coverUrl ? { url: result.coverUrl, source: result.source } : undefined;
  const existingSaved = existing?.savedCovers || [];
  const savedCovers = cover
    ? uniqueCovers([cover, ...existingSaved])
    : upgradingManual
      ? []
      : existingSaved;

  const nextBook: Book = {
    ...(existing || {}),
    id: existing?.id || result.isbn || `search:${result.id}:${Date.now()}`,
    title: result.title,
    author: result.author || "Unknown author",
    year: result.year ? String(result.year) : existing?.year,
    isbn: result.isbn || existing?.isbn,
    isbnSource: result.isbn ? `${result.source} search` : existing?.isbnSource,
    isbnConfidence: result.isbn ? "high" : existing?.isbnConfidence,
    importSource: "Book search",
    color: existing?.color || PALETTE[base.length % PALETTE.length],
    preferredCover: cover || (upgradingManual ? undefined : existing?.preferredCover),
    savedCovers,
    coverFeedback: upgradingManual ? undefined : existing?.coverFeedback,
  };

  if (targetIndex >= 0) base[targetIndex] = nextBook;
  else base.push(nextBook);

  return {
    books: base,
    replaced: upgradingManual,
    existed: Boolean(existing) && !upgradingManual,
    title: nextBook.title,
    author: nextBook.author,
  };
}

export function addTypedBook(current: Book[], title: string, author: string) {
  const cleanedTitle = title.replace(/\s+/g, " ").trim();
  const cleanedAuthor = author.replace(/\s+/g, " ").trim() || "Unknown author";
  if (!cleanedTitle) return { books: current, ok: false, message: "Enter a title first." };

  const base = looksLikeSampleShelf(current) ? [] : [...current];
  const duplicate = base.some((book) =>
    normalize(book.title) === normalize(cleanedTitle)
    && normalize(book.author) === normalize(cleanedAuthor)
  );
  if (duplicate) return { books: current, ok: false, message: "That exact entry is already on your shelf." };

  base.push({
    id: `manual:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: cleanedTitle,
    author: cleanedAuthor,
    importSource: "Added manually",
    color: PALETTE[base.length % PALETTE.length],
  });

  return { books: base, ok: true, message: `Added ${cleanedTitle}.` };
}
