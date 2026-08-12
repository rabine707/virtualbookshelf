import { Book, CoverResult, rejectedUrls, uniqueCovers } from "./client-library";

export type ApprovedCommunityCover = {
  client_key: string;
  image_url: string;
  source?: string | null;
  confidence?: number | null;
};

export function communityCoverRequestBooks(books: Book[]) {
  return books.slice(0, 500).map((book) => ({
    key: book.id,
    title: book.title,
    author: book.author,
    isbn: book.isbn || "",
    asin: book.asin || "",
  })).filter((book) => Boolean(book.title && book.author));
}

export function applyApprovedCommunityCovers(books: Book[], rows: ApprovedCommunityCover[]) {
  if (!rows.length) return { books, changed: false };
  const byId = new Map(rows.map((row) => [row.client_key, row]));
  let changed = false;

  const next = books.map((book) => {
    const row = byId.get(book.id);
    if (!row?.image_url) return book;
    if (rejectedUrls(book).has(row.image_url)) return book;

    const hasPersonalChoice = Boolean(book.preferredCover?.url || book.coverFeedback?.accepted);
    if (hasPersonalChoice) return book;

    const cover: CoverResult = {
      url: row.image_url,
      source: row.source ? `Community · ${row.source}` : "Community verified",
    };
    const savedCovers = uniqueCovers([cover, ...(book.savedCovers || [])]);
    changed = true;
    return {
      ...book,
      preferredCover: cover,
      savedCovers,
    };
  });

  return { books: changed ? next : books, changed };
}
