"use client";

import { ChangeEvent, CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";

type CoverResult = {
  url: string;
  source: string;
};

type CoverResponse = {
  url: string | null;
  source: string | null;
  options?: CoverResult[];
  discoveredIsbn?: string;
};

type CoverFeedback = {
  accepted?: string;
  rejected?: string[];
  wrongEdition?: string[];
};

type Book = {
  id: string;
  title: string;
  author: string;
  rating?: number;
  year?: string;
  shelf?: string;
  isbn?: string;
  asin?: string;
  importSource?: string;
  color: string;
  preferredCover?: CoverResult;
  coverFeedback?: CoverFeedback;
};

const STORAGE_KEY = "shelf-of-fame-library-v1";
const COVER_DATA_VERSION_KEY = "shelf-of-fame-cover-data-version";
const COVER_DATA_VERSION = "multi-cover-v7-broad-feedback";
const palette = ["#6f4e37", "#8b5e3c", "#5a6b4f", "#8e3b46", "#46627f", "#aa7a3d", "#584b63", "#7b6f62"];
const coverMemory = new Map<string, CoverResult | null>();
const coverOptionsMemory = new Map<string, CoverResult[]>();

const sampleBooks: Book[] = [
  { id: "1", title: "Fourth Wing", author: "Rebecca Yarros", rating: 5, color: palette[4] },
  { id: "2", title: "The Serpent and the Wings of Night", author: "Carissa Broadbent", rating: 4, color: palette[6] },
  { id: "3", title: "Credence", author: "Penelope Douglas", rating: 4, color: palette[2] },
  { id: "4", title: "Lights Out", author: "Navessa Allen", rating: 5, color: palette[3] },
  { id: "5", title: "Blood of Hercules", author: "Jasmine Mas", rating: 4, color: palette[0] },
  { id: "6", title: "Dungeon Crawler Carl", author: "Matt Dinniman", rating: 4, color: palette[5] },
  { id: "7", title: "Warlock", author: "Daniel Kensington", rating: 5, color: palette[7] },
  { id: "8", title: "Coven King", author: "Virgil Knightley", rating: 4, color: palette[1] },
  { id: "9", title: "Quicksilver", author: "Callie Hart", rating: 5, color: palette[4] },
  { id: "10", title: "The Ritual", author: "Shantel Tessier", rating: 4, color: palette[6] },
  { id: "11", title: "Butcher & Blackbird", author: "Brynne Weaver", rating: 5, color: palette[2] },
  { id: "12", title: "Haunting Adeline", author: "H. D. Carlton", rating: 4, color: palette[3] },
];

function cleanIsbn(value?: string) {
  if (!value) return undefined;
  const cleaned = value.replace(/[=\"'\s-]/g, "").trim();
  return /^(?:\d{13}|\d{9}[\dXx])$/.test(cleaned) ? cleaned : undefined;
}

function isbnForBook(book: Book) {
  return cleanIsbn(book.isbn) || cleanIsbn(book.id);
}

function coverKey(book: Book) {
  return isbnForBook(book) || `${book.title.toLowerCase().trim()}::${book.author.toLowerCase().trim()}`;
}

function coverRequestUrl(book: Book, includeLibraryThing = false) {
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

function uniqueCovers(covers: CoverResult[]) {
  const seen = new Set<string>();
  return covers.filter((cover) => {
    if (!cover?.url || seen.has(cover.url)) return false;
    seen.add(cover.url);
    return true;
  });
}

function rejectedUrls(book: Book) {
  return new Set([
    ...(book.coverFeedback?.rejected || []),
    ...(book.coverFeedback?.wrongEdition || []),
  ]);
}

function allowedCovers(book: Book, covers: CoverResult[]) {
  const rejected = rejectedUrls(book);
  return uniqueCovers(covers).filter((option) => !rejected.has(option.url));
}

function normalizeGoodreadsRow(row: Record<string, string>, index: number): Book | null {
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

function normalizeAudibleRow(row: Record<string, string>, index: number): Book | null {
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

function looksLikeSampleShelf(books: Book[]) {
  return books.length === sampleBooks.length && books.every((book, index) => book.id === sampleBooks[index]?.id);
}

function mergeAudibleBooks(current: Book[], imported: Book[]) {
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

function mergeGoodreadsFeedback(current: Book[], imported: Book[]) {
  const byIdentity = new Map(current.map((book) => [importIdentity(book), book]));
  return imported.map((book) => {
    const existing = byIdentity.get(importIdentity(book));
    if (!existing) return book;
    return {
      ...book,
      preferredCover: existing.preferredCover,
      coverFeedback: existing.coverFeedback,
      asin: existing.asin,
      importSource: existing.importSource?.includes("Audible") ? "Goodreads + Audible" : book.importSource,
    };
  });
}

function isStoredBook(value: unknown): value is Book {
  if (!value || typeof value !== "object") return false;
  const book = value as Partial<Book>;
  return typeof book.id === "string"
    && typeof book.title === "string"
    && typeof book.author === "string"
    && typeof book.color === "string";
}

function spineTitle(title: string) {
  if (title.length <= 38) return title;
  return `${title.slice(0, 35).trim()}…`;
}

function coverSourceLabel(source: string) {
  if (source === "Open Library") return "OL";
  if (source === "Google Books") return "Google";
  if (source === "LibraryThing") return "LT";
  if (source === "Audible") return "Audible";
  return source;
}

type BookSpineProps = {
  book: Book;
  bookNumber: number;
  onSelect: (book: Book) => void;
};

function BookSpine({ book, bookNumber, onSelect }: BookSpineProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const key = coverKey(book);
  const eager = bookNumber < 8;
  const preferred = book.preferredCover && !rejectedUrls(book).has(book.preferredCover.url)
    ? book.preferredCover
    : undefined;
  const [cover, setCover] = useState<CoverResult | null>(() => preferred || coverMemory.get(key) || null);
  const [shouldLoad, setShouldLoad] = useState(() => eager || coverMemory.has(key));
  const displayedCover = preferred || cover;

  useEffect(() => {
    if (preferred) {
      coverMemory.set(key, preferred);
      setCover(preferred);
      setShouldLoad(true);
      return;
    }

    if (coverMemory.has(key)) {
      const cached = coverMemory.get(key) || null;
      setCover(cached && !rejectedUrls(book).has(cached.url) ? cached : null);
      setShouldLoad(true);
      return;
    }

    if (eager) {
      setShouldLoad(true);
      return;
    }

    const node = buttonRef.current;
    if (!node) return;

    if (!("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, { rootMargin: "650px 0px" });

    observer.observe(node);
    return () => observer.disconnect();
  }, [book.coverFeedback, eager, key, preferred]);

  useEffect(() => {
    if (preferred || !shouldLoad) return;

    const cached = coverMemory.get(key);
    if (cached !== undefined && (!cached || !rejectedUrls(book).has(cached.url))) return;

    const controller = new AbortController();
    fetch(coverRequestUrl(book), { signal: controller.signal, cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((result: CoverResponse | null) => {
        const fetched = result?.options || (result?.url && result?.source ? [{ url: result.url, source: result.source }] : []);
        const options = allowedCovers(book, fetched);
        if (options.length) coverOptionsMemory.set(key, options);
        const valid = options[0] || null;
        coverMemory.set(key, valid);
        setCover(valid);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [book, key, preferred, shouldLoad]);

  const style = {
    "--book-color": book.color,
    "--lean": `${((bookNumber % 7) - 3) * 0.42}deg`,
    "--book-height": `${180 + ((bookNumber * 17) % 38)}px`,
    "--book-width": `${66 + ((bookNumber * 11) % 34)}px`,
    "--band-offset": `${25 + ((bookNumber * 13) % 42)}%`,
  } as CSSProperties;

  return (
    <button
      ref={buttonRef}
      className={`book book-style-${bookNumber % 4}${displayedCover?.url ? " has-cover" : ""}`}
      style={style}
      onClick={() => onSelect(book)}
      title={`${book.title} — ${book.author}`}
    >
      {displayedCover?.url ? (
        <img
          className="book-cover-art"
          src={displayedCover.url}
          alt=""
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onError={() => {
            if (!preferred) {
              coverMemory.set(key, null);
              setCover(null);
            }
          }}
        />
      ) : null}
      {!displayedCover?.url ? <span className="spine-mark" aria-hidden="true">◆</span> : null}
      <span className="book-title">{spineTitle(book.title)}</span>
      <span className="book-author">{book.author}</span>
    </button>
  );
}

export default function Home() {
  const [books, setBooks] = useState<Book[]>(sampleBooks);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("title");
  const [selected, setSelected] = useState<Book | null>(null);
  const [cover, setCover] = useState<CoverResult | null>(null);
  const [coverOptions, setCoverOptions] = useState<CoverResult[]>([]);
  const [coverLoading, setCoverLoading] = useState(false);
  const [deepSearchLoading, setDeepSearchLoading] = useState(false);
  const [deepSearchDone, setDeepSearchDone] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const goodreadsInput = useRef<HTMLInputElement>(null);
  const audibleInput = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const savedBooks = parsed.filter(isStoredBook);
          if (savedBooks.length) setBooks(savedBooks);
        }
      }

      const storedCoverVersion = window.localStorage.getItem(COVER_DATA_VERSION_KEY);
      if (storedCoverVersion !== COVER_DATA_VERSION) {
        coverMemory.clear();
        coverOptionsMemory.clear();
        window.localStorage.setItem(COVER_DATA_VERSION_KEY, COVER_DATA_VERSION);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    } catch {
      // If browser storage is unavailable, the shelf still works for this session.
    }
  }, [books, storageReady]);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    if (!selected) {
      setCover(null);
      setCoverOptions([]);
      setCoverLoading(false);
      setDeepSearchLoading(false);
      setDeepSearchDone(false);
      return;
    }

    const key = coverKey(selected);
    const rejected = rejectedUrls(selected);
    const preferred = selected.preferredCover && !rejected.has(selected.preferredCover.url)
      ? selected.preferredCover
      : undefined;
    const cachedOptions = allowedCovers(selected, coverOptionsMemory.get(key) || []);
    const startingOptions = preferred
      ? allowedCovers(selected, [preferred, ...cachedOptions])
      : cachedOptions;
    const cachedCover = coverMemory.get(key);
    const safeCached = cachedCover && !rejected.has(cachedCover.url) ? cachedCover : null;

    setCover(preferred || safeCached || startingOptions[0] || null);
    setCoverOptions(startingOptions);
    setCoverLoading(true);
    setDeepSearchLoading(false);
    setDeepSearchDone(false);

    const controller = new AbortController();
    fetch(coverRequestUrl(selected), { signal: controller.signal, cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((result: CoverResponse | null) => {
        const fetched = result?.options || (result?.url && result?.source ? [{ url: result.url, source: result.source }] : []);
        const allOptions = allowedCovers(selected, preferred ? [preferred, ...fetched] : fetched);
        coverOptionsMemory.set(key, allOptions);
        setCoverOptions(allOptions);

        const next = preferred || safeCached || allOptions[0] || null;
        coverMemory.set(key, next);
        setCover(next);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setCoverLoading(false);
      });

    return () => controller.abort();
  }, [selected?.id, selected?.coverFeedback, selected?.preferredCover]);

  const visibleBooks = useMemo(() => {
    const q = query.toLowerCase().trim();
    const filtered = q
      ? books.filter((book) => `${book.title} ${book.author}`.toLowerCase().includes(q))
      : [...books];

    return filtered.sort((a, b) => {
      if (sort === "author") return a.author.localeCompare(b.author);
      if (sort === "rating") return (b.rating || 0) - (a.rating || 0);
      return a.title.localeCompare(b.title);
    });
  }, [books, query, sort]);

  const shelves = useMemo(() => {
    const result: Book[][] = [];
    for (let i = 0; i < visibleBooks.length; i += 8) result.push(visibleBooks.slice(i, i + 8));
    return result;
  }, [visibleBooks]);

  const selectedIsbn = selected ? isbnForBook(selected) : undefined;

  function showToast(message: string) {
    setImportMessage(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setImportMessage(""), 4200);
  }

  function chooseCover(option: CoverResult) {
    if (!selected) return;
    const feedback: CoverFeedback = {
      ...selected.coverFeedback,
      accepted: option.url,
      rejected: (selected.coverFeedback?.rejected || []).filter((url) => url !== option.url),
      wrongEdition: (selected.coverFeedback?.wrongEdition || []).filter((url) => url !== option.url),
    };
    const updated = { ...selected, preferredCover: option, coverFeedback: feedback };
    setBooks((current) => current.map((book) => book.id === selected.id ? updated : book));
    setSelected(updated);
    setCover(option);
    coverMemory.set(coverKey(updated), option);
    showToast(`Marked this ${option.source} cover as correct for ${selected.title}.`);
  }

  function rejectCurrentCover(kind: "wrong" | "edition") {
    if (!selected || !cover) return;
    const rejected = new Set(selected.coverFeedback?.rejected || []);
    const wrongEdition = new Set(selected.coverFeedback?.wrongEdition || []);
    if (kind === "edition") wrongEdition.add(cover.url);
    else rejected.add(cover.url);

    const feedback: CoverFeedback = {
      ...selected.coverFeedback,
      accepted: selected.coverFeedback?.accepted === cover.url ? undefined : selected.coverFeedback?.accepted,
      rejected: [...rejected],
      wrongEdition: [...wrongEdition],
    };
    const updated: Book = {
      ...selected,
      preferredCover: selected.preferredCover?.url === cover.url ? undefined : selected.preferredCover,
      coverFeedback: feedback,
    };
    const remaining = allowedCovers(updated, coverOptions.filter((option) => option.url !== cover.url));
    const next = remaining[0] || null;

    setBooks((current) => current.map((book) => book.id === selected.id ? updated : book));
    setSelected(updated);
    setCoverOptions(remaining);
    setCover(next);
    coverOptionsMemory.set(coverKey(updated), remaining);
    coverMemory.set(coverKey(updated), next);
    setDeepSearchDone(false);
    showToast(kind === "edition"
      ? `Rejected that edition for ${selected.title}. It won't be suggested again.`
      : `Rejected that cover for ${selected.title}. It won't be suggested again.`);
  }

  async function searchMoreCovers() {
    if (!selected || deepSearchLoading || deepSearchDone) return;

    const key = coverKey(selected);
    const preferred = selected.preferredCover;
    const before = allowedCovers(selected, preferred ? [preferred, ...coverOptions] : coverOptions);
    setDeepSearchLoading(true);

    try {
      const response = await fetch(coverRequestUrl(selected, true), { cache: "no-store" });
      const result: CoverResponse | null = response.ok ? await response.json() : null;
      const fetched = result?.options || (result?.url && result?.source ? [{ url: result.url, source: result.source }] : []);
      const allOptions = allowedCovers(selected, preferred ? [preferred, ...before, ...fetched] : [...before, ...fetched]);
      const added = Math.max(0, allOptions.length - before.length);

      coverOptionsMemory.set(key, allOptions);
      setCoverOptions(allOptions);

      if (!cover && allOptions[0]) {
        coverMemory.set(key, allOptions[0]);
        setCover(allOptions[0]);
      }

      if (result?.discoveredIsbn && !selectedIsbn) {
        const updated = { ...selected, isbn: result.discoveredIsbn };
        setBooks((current) => current.map((book) => book.id === selected.id ? updated : book));
        setSelected(updated);
      }

      setDeepSearchDone(true);
      showToast(added ? `Found ${added} more cover${added === 1 ? "" : "s"} for ${selected.title}.` : `No additional covers found for ${selected.title}.`);
    } catch {
      showToast(`Couldn't finish the deeper cover search for ${selected.title}.`);
    } finally {
      setDeepSearchLoading(false);
    }
  }

  function importGoodreadsCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const imported = results.data
          .map(normalizeGoodreadsRow)
          .filter((book): book is Book => Boolean(book));

        if (!imported.length) {
          showToast("I couldn't find any Goodreads books in that CSV.");
          return;
        }

        coverMemory.clear();
        coverOptionsMemory.clear();
        window.localStorage.setItem(COVER_DATA_VERSION_KEY, COVER_DATA_VERSION);
        setBooks((current) => mergeGoodreadsFeedback(current, imported));
        showToast(`Imported ${imported.length} Goodreads books. Your cover choices were kept.`);
      },
    });

    event.target.value = "";
  }

  function importAudibleCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const imported = results.data
          .map(normalizeAudibleRow)
          .filter((book): book is Book => Boolean(book));

        if (!imported.length) {
          showToast("I couldn't find Audible titles in that CSV. Use the audible-cli library export CSV.");
          return;
        }

        setBooks((current) => {
          const base = looksLikeSampleShelf(current) ? [] : current;
          return mergeAudibleBooks(base, imported);
        });
        showToast(`Processed ${imported.length} Audible titles and merged them into your shelf.`);
      },
    });

    event.target.value = "";
  }

  return (
    <main>
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">YOUR READING LIFE, ON DISPLAY</p>
          <h1>Shelf of Fame</h1>
          <p className="subhead">Turn the books you’ve read into a shelf worth showing off.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="primary" onClick={() => goodreadsInput.current?.click()}>Import Goodreads</button>
          <button
            className="primary"
            onClick={() => audibleInput.current?.click()}
            title="Use: audible library export --format csv --output audible-library.csv"
          >
            Import Audible CSV
          </button>
        </div>
        <input ref={goodreadsInput} type="file" accept=".csv,text/csv" hidden onChange={importGoodreadsCsv} />
        <input ref={audibleInput} type="file" accept=".csv,text/csv" hidden onChange={importAudibleCsv} />
      </header>

      <section className="toolbar" aria-label="Bookshelf controls">
        <div className="search-wrap">
          <span aria-hidden="true">⌕</span>
          <input
            className="search"
            type="search"
            placeholder="Search title or author…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort books">
          <option value="title">Title</option>
          <option value="author">Author</option>
          <option value="rating">Rating</option>
        </select>
        <div className="count-pill" aria-label={`${visibleBooks.length} books displayed`}>
          <strong>{visibleBooks.length}</strong>
          <span>books</span>
        </div>
      </section>

      <section className="bookcase" aria-label="Shelf of Fame bookshelf">
        {shelves.length ? shelves.map((shelf, shelfIndex) => (
          <div className="shelf-row" key={shelfIndex}>
            <div className="books">
              {shelf.map((book, index) => (
                <BookSpine
                  key={book.id}
                  book={book}
                  bookNumber={shelfIndex * 8 + index}
                  onSelect={setSelected}
                />
              ))}
            </div>
            <div className="wood-shelf" />
          </div>
        )) : (
          <div className="empty">No books match that search.</div>
        )}
      </section>

      <footer>
        <span>Real cover art loads onto the spines as you browse.</span>
        <span>{storageReady ? "Saved on this browser — refresh anytime." : "Loading your saved shelf…"}</span>
      </footer>

      {importMessage && (
        <div className="toast" role="status">
          <span className="toast-dot" aria-hidden="true">✓</span>
          {importMessage}
        </div>
      )}

      {selected && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <article className="modal" role="dialog" aria-modal="true" aria-label={selected.title} onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setSelected(null)} aria-label="Close">×</button>
            <div className="cover-column">
              <div className="cover">
                <div className="cover-fallback" style={{ background: selected.color }}>
                  <strong>{coverLoading ? "Finding covers…" : selected.title}</strong>
                  <span>{selected.author}</span>
                </div>
                {cover?.url ? (
                  <img
                    className="cover-image"
                    src={cover.url}
                    alt={`Cover of ${selected.title}`}
                    loading="eager"
                    decoding="async"
                    onError={() => setCover(null)}
                  />
                ) : null}
              </div>

              <div style={{ display: "grid", gap: 8, marginTop: 12 }} aria-label="Cover feedback">
                <button
                  type="button"
                  className="primary"
                  disabled={!cover}
                  onClick={() => cover && chooseCover(cover)}
                  title="Save this as the correct cover"
                >
                  ✓ Correct cover
                </button>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button
                    type="button"
                    className="primary"
                    disabled={!cover}
                    onClick={() => rejectCurrentCover("wrong")}
                    style={{ opacity: cover ? 0.78 : 0.45 }}
                  >
                    ✕ Wrong cover
                  </button>
                  <button
                    type="button"
                    className="primary"
                    disabled={!cover}
                    onClick={() => rejectCurrentCover("edition")}
                    style={{ opacity: cover ? 0.78 : 0.45 }}
                  >
                    Different edition
                  </button>
                </div>
              </div>
            </div>

            <div className="details">
              <p className="eyebrow">BOOK DETAILS</p>
              <h2>{selected.title}</h2>
              <p className="author">by {selected.author}</p>
              <dl>
                {selected.rating ? <><dt>Your rating</dt><dd>{"★".repeat(Math.min(selected.rating, 5))}</dd></> : null}
                {selected.year ? <><dt>Published</dt><dd>{selected.year}</dd></> : null}
                {selected.shelf ? <><dt>Goodreads shelf</dt><dd>{selected.shelf}</dd></> : null}
                {selected.importSource ? <><dt>Imported from</dt><dd>{selected.importSource}</dd></> : null}
                {selected.asin ? <><dt>Audible ASIN</dt><dd>{selected.asin}</dd></> : null}
                {selectedIsbn ? <><dt>ISBN</dt><dd>{selectedIsbn}</dd></> : null}
                {cover?.source ? <><dt>Cover source</dt><dd>{cover.source}</dd></> : null}
                {selected.coverFeedback?.rejected?.length ? <><dt>Rejected covers</dt><dd>{selected.coverFeedback.rejected.length}</dd></> : null}
                {selected.coverFeedback?.wrongEdition?.length ? <><dt>Wrong editions</dt><dd>{selected.coverFeedback.wrongEdition.length}</dd></> : null}
              </dl>

              <section className="cover-picker" aria-label="Choose a cover">
                <div className="cover-picker-heading">
                  <strong>Choose your cover</strong>
                  <span>{coverOptions.length} {coverOptions.length === 1 ? "match" : "matches"}</span>
                </div>

                {coverOptions.length ? (
                  <div className="cover-options">
                    {coverOptions.map((option, index) => (
                      <button
                        key={`${option.url}-${index}`}
                        type="button"
                        className={`cover-option${cover?.url === option.url ? " selected-cover" : ""}`}
                        onClick={() => setCover(option)}
                        onDoubleClick={() => chooseCover(option)}
                        aria-label={`Preview cover ${index + 1} from ${option.source}`}
                        title={`Preview ${option.source} cover. Double-click to mark correct.`}
                      >
                        <img src={option.url} alt="" loading="lazy" decoding="async" />
                        <span>{coverSourceLabel(option.source)}</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                <button
                  type="button"
                  className="primary"
                  style={{ marginTop: 10 }}
                  onClick={searchMoreCovers}
                  disabled={deepSearchLoading || deepSearchDone}
                >
                  {deepSearchLoading
                    ? "Searching more editions…"
                    : deepSearchDone
                      ? "More editions searched"
                      : "Search more covers"}
                </button>

                <p className="cover-picker-note">
                  {selectedIsbn
                    ? "Shelf of Fame now searches broad title and author variations automatically. Mark a cover correct, wrong, or the wrong edition to teach this shelf what to keep and what to stop suggesting."
                    : "No ISBN is stored for this book, so Shelf of Fame searches cleaned titles, keywords, author matches, and LibraryThing edition data. Your pass/fail choices are saved with the book."}
                </p>
              </section>
            </div>
          </article>
        </div>
      )}
    </main>
  );
}
