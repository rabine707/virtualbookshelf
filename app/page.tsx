"use client";

import { ChangeEvent, CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";

type Book = {
  id: string;
  title: string;
  author: string;
  rating?: number;
  year?: string;
  shelf?: string;
  isbn?: string;
  color: string;
};

type CoverResult = {
  url: string;
  source: string;
};

const STORAGE_KEY = "shelf-of-fame-library-v1";
const palette = ["#6f4e37", "#8b5e3c", "#5a6b4f", "#8e3b46", "#46627f", "#aa7a3d", "#584b63", "#7b6f62"];

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
    color: palette[index % palette.length],
  };
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

export default function Home() {
  const [books, setBooks] = useState<Book[]>(sampleBooks);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("title");
  const [selected, setSelected] = useState<Book | null>(null);
  const [cover, setCover] = useState<CoverResult | null>(null);
  const [coverLoading, setCoverLoading] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!selected) {
      setCover(null);
      setCoverLoading(false);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      title: selected.title,
      author: selected.author,
    });
    const isbn = isbnForBook(selected);
    if (isbn) params.set("isbn", isbn);

    setCover(null);
    setCoverLoading(true);

    fetch(`/api/cover?${params.toString()}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((result: CoverResult | null) => {
        if (result?.url) setCover(result);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setCoverLoading(false);
      });

    return () => controller.abort();
  }, [selected]);

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

  function importCsv(event: ChangeEvent<HTMLInputElement>) {
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

        setBooks(imported);
        showToast(`Imported ${imported.length} books. Saved on this browser.`);
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
        <button className="primary" onClick={() => fileInput.current?.click()}>Import Goodreads</button>
        <input ref={fileInput} type="file" accept=".csv,text/csv" hidden onChange={importCsv} />
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
              {shelf.map((book, index) => {
                const bookNumber = shelfIndex * 8 + index;
                const style = {
                  "--book-color": book.color,
                  "--lean": `${((bookNumber % 7) - 3) * 0.42}deg`,
                  "--book-height": `${180 + ((bookNumber * 17) % 38)}px`,
                  "--book-width": `${66 + ((bookNumber * 11) % 34)}px`,
                  "--band-offset": `${25 + ((bookNumber * 13) % 42)}%`,
                } as CSSProperties;

                return (
                  <button
                    className={`book book-style-${bookNumber % 4}`}
                    style={style}
                    key={book.id}
                    onClick={() => setSelected(book)}
                    title={`${book.title} — ${book.author}`}
                  >
                    <span className="spine-mark" aria-hidden="true">◆</span>
                    <span className="book-title">{spineTitle(book.title)}</span>
                    <span className="book-author">{book.author}</span>
                  </button>
                );
              })}
            </div>
            <div className="wood-shelf" />
          </div>
        )) : (
          <div className="empty">No books match that search.</div>
        )}
      </section>

      <footer>
        <span>Export your Goodreads library, then import the CSV here.</span>
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
            <div className="cover">
              <div className="cover-fallback" style={{ background: selected.color }}>
                <strong>{coverLoading ? "Finding cover…" : selected.title}</strong>
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
            <div className="details">
              <p className="eyebrow">BOOK DETAILS</p>
              <h2>{selected.title}</h2>
              <p className="author">by {selected.author}</p>
              <dl>
                {selected.rating ? <><dt>Your rating</dt><dd>{"★".repeat(Math.min(selected.rating, 5))}</dd></> : null}
                {selected.year ? <><dt>Published</dt><dd>{selected.year}</dd></> : null}
                {selected.shelf ? <><dt>Goodreads shelf</dt><dd>{selected.shelf}</dd></> : null}
                {selectedIsbn ? <><dt>ISBN</dt><dd>{selectedIsbn}</dd></> : null}
                {cover?.source ? <><dt>Cover source</dt><dd>{cover.source}</dd></> : null}
              </dl>
            </div>
          </article>
        </div>
      )}
    </main>
  );
}
