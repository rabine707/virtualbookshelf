import { Book, looksLikeSampleShelf } from "./client-library";

export type CloudBookRecord = Record<string, unknown>;

function normalize(value?: string) {
  return (value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function cloudBookIdentity(book: { title?: string; author?: string }) {
  return `${normalize(book.title)}::${normalize(book.author)}`;
}

export function localBooksForCloud(books: Book[]) {
  return looksLikeSampleShelf(books) ? [] : books;
}

export function cloudBookToLocal(raw: CloudBookRecord): Book | null {
  const title = String(raw.title || "").trim();
  if (!title) return null;
  const author = String(raw.author || "").trim() || "Unknown author";
  const identity = cloudBookIdentity({ title, author });
  const id = String(raw.id || raw.cloudBookId || `cloud:${identity}`);
  const color = typeof raw.color === "string" && raw.color ? raw.color : "#6f4e37";
  const next = {
    ...raw,
    id,
    title,
    author,
    color,
  } as CloudBookRecord & Book;

  delete next.cloudBookId;
  delete next.updatedAt;
  delete next.spineStoragePath;
  delete next.spineProvider;
  delete next.spineModel;
  delete next.selectedSpineId;
  delete next.favorite;
  return next;
}

export function mergeCloudBooks(local: Book[], cloud: CloudBookRecord[]) {
  const result = new Map<string, Book>();
  const order: string[] = [];

  for (const raw of cloud) {
    const book = cloudBookToLocal(raw);
    if (!book) continue;
    const key = book.id || cloudBookIdentity(book);
    if (!result.has(key)) order.push(key);
    result.set(key, book);
  }

  for (const book of local) {
    const byId = book.id;
    const cloudKey = byId && result.has(byId)
      ? byId
      : [...result.entries()].find(([, candidate]) => cloudBookIdentity(candidate) === cloudBookIdentity(book))?.[0];
    const key = cloudKey || byId || cloudBookIdentity(book);
    const existing = result.get(key);
    if (!result.has(key)) order.push(key);
    result.set(key, existing ? {
      ...existing,
      ...book,
      preferredCover: book.preferredCover || existing.preferredCover,
      savedCovers: book.savedCovers?.length ? book.savedCovers : existing.savedCovers,
      coverFeedback: book.coverFeedback || existing.coverFeedback,
    } : book);
  }

  return order.map((key) => result.get(key)).filter((book): book is Book => Boolean(book));
}

export function cloudFavoriteIdentities(cloud: CloudBookRecord[]) {
  return cloud
    .filter((book) => book.favorite === true)
    .map((book) => cloudBookIdentity({
      title: String(book.title || ""),
      author: String(book.author || ""),
    }))
    .filter(Boolean);
}

export function cloudPayloadBooks(books: Book[], favorites: Set<string>) {
  return localBooksForCloud(books).map((book) => ({
    ...book,
    favorite: favorites.has(cloudBookIdentity(book)),
  }));
}
