import { Book, rejectedUrls } from "./client-library";

export const ROMANCE_MISS_TTL_MS = 3 * 24 * 60 * 60 * 1000;

export type RomanceShelfBook = Book & {
  romanceioCoverUrl?: string;
  romanceioCheckedAt?: number;
  romanceioNoMatch?: boolean;
};

export type RomanceShelfLookup = {
  url?: string | null;
  source?: string | null;
  discoveredRomanceioId?: string | null;
};

function normalize(value?: string) {
  return (value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function romanceShelfIdentity(book: Pick<Book, "title" | "author">) {
  return `${normalize(book.title)}::${normalize(book.author)}`;
}

export function needsRomanceShelfLookup(book: RomanceShelfBook, now = Date.now()) {
  if (!book.title.trim()) return false;
  if (book.coverFeedback?.accepted) return false;
  if (book.romanceioId && book.romanceioCoverUrl) return false;

  if (book.romanceioNoMatch && book.romanceioCheckedAt) {
    if (now - book.romanceioCheckedAt < ROMANCE_MISS_TTL_MS) return false;
  }

  return true;
}

export function applyRomanceShelfOutcome(
  book: RomanceShelfBook,
  result: RomanceShelfLookup,
  checkedAt = Date.now(),
): RomanceShelfBook {
  const url = result.url?.trim() || undefined;
  const discoveredId = result.discoveredRomanceioId?.trim() || undefined;
  const rejected = url ? rejectedUrls(book).has(url) : false;
  const manuallyChosen = Boolean(book.coverFeedback?.accepted);

  return {
    ...book,
    romanceioId: discoveredId || book.romanceioId,
    romanceioCoverUrl: url || book.romanceioCoverUrl,
    romanceioCheckedAt: checkedAt,
    romanceioNoMatch: !url && !discoveredId,
    preferredCover: url && !rejected && !manuallyChosen
      ? { url, source: "Romance.io" }
      : book.preferredCover,
  };
}
