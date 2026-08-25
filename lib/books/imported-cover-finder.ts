import {
  allowedCovers,
  Book,
  CoverResponse,
  CoverResult,
  isbnForBook,
  uniqueCovers,
} from "./client-library";

export type ImportedCoverLookup = {
  options: CoverResult[];
  exactCover?: CoverResult;
  discoveredIsbn?: string;
};

export function importedCoverLookup(book: Book, response: CoverResponse | null): ImportedCoverLookup {
  const fetched = response?.options
    || (response?.url && response?.source ? [{ url: response.url, source: response.source }] : []);
  const options = allowedCovers(book, fetched);
  const hasTrustedIsbn = Boolean(isbnForBook(book) && book.isbnConfidence === "high");
  return {
    options,
    exactCover: hasTrustedIsbn ? options[0] : undefined,
    discoveredIsbn: response?.discoveredIsbn,
  };
}

export function applyImportedCoverLookup(book: Book, lookup: ImportedCoverLookup) {
  if (book.preferredCover?.url || book.coverFeedback?.accepted) return book;

  const next: Book = lookup.discoveredIsbn && !isbnForBook(book)
    ? {
        ...book,
        isbn: lookup.discoveredIsbn,
        isbnSource: "Cover lookup",
        isbnConfidence: "medium",
      }
    : { ...book };

  if (!lookup.exactCover) return next;
  return {
    ...next,
    preferredCover: lookup.exactCover,
    savedCovers: uniqueCovers([...(next.savedCovers || []), lookup.exactCover]),
  };
}
