import {
  Book,
  CoverResult,
  rejectedUrls,
  uniqueCovers,
} from "./client-library";

export type AudibleCoverLookup = {
  asin?: string | null;
  coverUrl?: string | null;
  coverSource?: string | null;
};

export function applyAudibleCoverFallback(book: Book, result: AudibleCoverLookup) {
  const coverUrl = result.coverUrl?.trim() || "";
  const source = result.coverSource?.trim() || "Audible";
  const fallback: CoverResult | undefined = coverUrl
    ? { url: coverUrl, source }
    : undefined;
  const blocked = fallback ? rejectedUrls(book).has(fallback.url) : false;
  const hasManualChoice = Boolean(book.coverFeedback?.accepted);
  const canUseFallback = Boolean(fallback && !blocked && !hasManualChoice && !book.preferredCover?.url);

  const nextAsin = book.asin || result.asin?.trim() || undefined;
  const nextPreferred = canUseFallback ? fallback : book.preferredCover;
  const nextSaved = canUseFallback && fallback
    ? uniqueCovers([...(book.savedCovers || []), fallback])
    : book.savedCovers;

  if (
    nextAsin === book.asin
    && nextPreferred === book.preferredCover
    && nextSaved === book.savedCovers
  ) {
    return book;
  }

  return {
    ...book,
    asin: nextAsin,
    preferredCover: nextPreferred,
    savedCovers: nextSaved,
  };
}
