"use client";

import { useMemo, useRef, useState } from "react";
import { BookDetailsModal } from "./components/BookDetailsModal";
import { Bookshelf } from "./components/Bookshelf";
import { ShelfToolbar } from "./components/ShelfToolbar";
import { useBookCoverManager } from "./hooks/useBookCoverManager";
import { useShelfLibrary } from "./hooks/useShelfLibrary";
import { Book } from "../lib/books/client-library";

export default function Home() {
  const {
    books,
    setBooks,
    storageReady,
    importMessage,
    showToast,
    importGoodreadsCsv,
    importAudibleCsv,
  } = useShelfLibrary();
  const {
    selected,
    setSelected,
    selectedIsbn,
    cover,
    setCover,
    coverOptions,
    coverLoading,
    deepSearchLoading,
    deepSearchDone,
    chooseCover,
    rejectCurrentCover,
    searchMoreCovers,
  } = useBookCoverManager({ setBooks, showToast });
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("title");
  const goodreadsInput = useRef<HTMLInputElement>(null);
  const audibleInput = useRef<HTMLInputElement>(null);

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

      <ShelfToolbar
        query={query}
        sort={sort}
        count={visibleBooks.length}
        onQueryChange={setQuery}
        onSortChange={setSort}
      />

      <Bookshelf shelves={shelves} onSelect={setSelected} />

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
        <BookDetailsModal
          selected={selected}
          selectedIsbn={selectedIsbn}
          cover={cover}
          coverOptions={coverOptions}
          coverLoading={coverLoading}
          deepSearchLoading={deepSearchLoading}
          deepSearchDone={deepSearchDone}
          onClose={() => setSelected(null)}
          onClearCover={() => setCover(null)}
          onPreviewCover={setCover}
          onChooseCover={chooseCover}
          onRejectCurrentCover={rejectCurrentCover}
          onSearchMoreCovers={searchMoreCovers}
        />
      )}
    </main>
  );
}
