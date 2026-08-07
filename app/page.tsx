"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import Papa from "papaparse";

type Book = {
  id: string;
  title: string;
  author: string;
  rating?: number;
  year?: string;
  shelf?: string;
  color: string;
};

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

function normalizeGoodreadsRow(row: Record<string, string>, index: number): Book | null {
  const title = row.Title?.trim();
  if (!title) return null;

  const author = row.Author?.trim() || "Unknown author";
  const rating = Number(row["My Rating"] || 0) || undefined;
  const year = row["Year Published"]?.trim() || row["Original Publication Year"]?.trim() || undefined;
  const shelf = row["Exclusive Shelf"]?.trim() || undefined;
  const isbn = row.ISBN13?.replace(/[="']/g, "").trim() || row.ISBN?.replace(/[="']/g, "").trim();

  return {
    id: isbn || `${title}-${author}-${index}`,
    title,
    author,
    rating,
    year,
    shelf,
    color: palette[index % palette.length],
  };
}

export default function Home() {
  const [books, setBooks] = useState<Book[]>(sampleBooks);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("title");
  const [selected, setSelected] = useState<Book | null>(null);
  const [importMessage, setImportMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

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
          setImportMessage("I couldn't find any Goodreads books in that CSV.");
          return;
        }

        setBooks(imported);
        setImportMessage(`Imported ${imported.length} books from Goodreads.`);
      },
    });

    event.target.value = "";
  }

  return (
    <main>
      <header className="hero">
        <div>
          <p className="eyebrow">YOUR READING LIFE, ON A SHELF</p>
          <h1>Virtual Bookshelf</h1>
          <p className="subhead">A cozy, visual home for the books you’ve read, loved, and want to remember.</p>
        </div>
        <button className="primary" onClick={() => fileInput.current?.click()}>Import Goodreads CSV</button>
        <input ref={fileInput} type="file" accept=".csv,text/csv" hidden onChange={importCsv} />
      </header>

      <section className="toolbar" aria-label="Bookshelf controls">
        <input
          className="search"
          type="search"
          placeholder="Search title or author…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort books">
          <option value="title">Sort: Title</option>
          <option value="author">Sort: Author</option>
          <option value="rating">Sort: Rating</option>
        </select>
        <span className="count">{visibleBooks.length} books</span>
      </section>

      {importMessage && <p className="notice">{importMessage}</p>}

      <section className="bookcase" aria-label="Virtual bookshelf">
        {shelves.length ? shelves.map((shelf, shelfIndex) => (
          <div className="shelf-row" key={shelfIndex}>
            <div className="books">
              {shelf.map((book, index) => (
                <button
                  className="book"
                  style={{ "--book-color": book.color, "--lean": `${((index % 5) - 2) * 0.7}deg` } as React.CSSProperties}
                  key={book.id}
                  onClick={() => setSelected(book)}
                  title={`${book.title} — ${book.author}`}
                >
                  <span className="book-title">{book.title}</span>
                  <span className="book-author">{book.author}</span>
                </button>
              ))}
            </div>
            <div className="wood-shelf" />
          </div>
        )) : (
          <div className="empty">No books match that search.</div>
        )}
      </section>

      <footer>
        <span>Tip: export your library from Goodreads, then import the CSV here.</span>
        <span>Your books stay in this browser session for this prototype.</span>
      </footer>

      {selected && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <article className="modal" role="dialog" aria-modal="true" aria-label={selected.title} onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setSelected(null)} aria-label="Close">×</button>
            <div className="cover" style={{ background: selected.color }}>
              <strong>{selected.title}</strong>
              <span>{selected.author}</span>
            </div>
            <div className="details">
              <p className="eyebrow">BOOK DETAILS</p>
              <h2>{selected.title}</h2>
              <p className="author">by {selected.author}</p>
              <dl>
                {selected.rating ? <><dt>Your rating</dt><dd>{"★".repeat(Math.min(selected.rating, 5))}</dd></> : null}
                {selected.year ? <><dt>Published</dt><dd>{selected.year}</dd></> : null}
                {selected.shelf ? <><dt>Goodreads shelf</dt><dd>{selected.shelf}</dd></> : null}
              </dl>
            </div>
          </article>
        </div>
      )}
    </main>
  );
}
