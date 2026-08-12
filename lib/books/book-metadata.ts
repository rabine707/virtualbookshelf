import { Book } from "./client-library";

export type BookMetadataConfidence = "high" | "medium";

export type BookMetadataUpdateInput = {
  title: string;
  author: string;
  isbn: string;
  asin: string;
  source: string;
  confidence: BookMetadataConfidence;
};

export type SaveBookMetadataResult =
  | { ok: true; book: Book }
  | { ok: false; error: string };

export type SpineCandidateIdentity = {
  title?: string;
  author?: string;
} & Record<string, unknown>;

export function normalizeBookIdentityText(value?: string) {
  return (value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function bookIdentity(title?: string, author?: string) {
  return `${normalizeBookIdentityText(title)}::${normalizeBookIdentityText(author)}`;
}

export function cleanBookIsbn(value: string) {
  const cleaned = value.replace(/[=\"'\s-]/g, "").trim().toUpperCase();
  return /^(?:\d{13}|\d{9}[\dX])$/.test(cleaned) ? cleaned : "";
}

export function cleanBookAsin(value: string) {
  const cleaned = value.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return /^[A-Z0-9]{10}$/.test(cleaned) ? cleaned : "";
}

export function applyBookMetadataUpdate(book: Book, input: BookMetadataUpdateInput): Book {
  const title = input.title.replace(/\s+/g, " ").trim();
  const author = input.author.replace(/\s+/g, " ").trim() || "Unknown author";
  if (!title) throw new Error("A title is required.");

  const isbn = input.isbn ? cleanBookIsbn(input.isbn) : "";
  const asin = input.asin ? cleanBookAsin(input.asin) : "";
  if (input.isbn.trim() && !isbn) throw new Error("Enter a valid ISBN.");
  if (input.asin.trim() && !asin) throw new Error("ASINs are 10 letters/numbers.");

  const updated: Book = {
    ...book,
    title,
    author,
  };

  if (isbn) {
    updated.isbn = isbn;
    updated.isbnSource = input.source;
    updated.isbnConfidence = input.confidence;
  } else {
    delete updated.isbn;
    delete updated.isbnSource;
    delete updated.isbnConfidence;
  }

  if (asin) updated.asin = asin;
  else delete updated.asin;

  return updated;
}

export function migrateSpineCandidateIdentity(
  candidates: SpineCandidateIdentity[],
  previous: Pick<Book, "title" | "author">,
  updated: Pick<Book, "title" | "author">,
) {
  const previousKey = bookIdentity(previous.title, previous.author);
  const nextKey = bookIdentity(updated.title, updated.author);
  if (!previousKey || previousKey === nextKey) {
    return { candidates, changed: false };
  }

  let changed = false;
  const next = candidates.map((candidate) => {
    if (bookIdentity(candidate.title, candidate.author) !== previousKey) return candidate;
    changed = true;
    return {
      ...candidate,
      title: updated.title,
      author: updated.author,
    };
  });

  return { candidates: next, changed };
}
