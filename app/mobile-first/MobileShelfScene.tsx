"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Book } from "../../lib/books/client-library";
import { MobileBookSpine } from "./MobileBookSpine";
import styles from "./MobileShelfScene.module.css";

type MobileShelfSceneProps = {
  books: Book[];
  storageReady: boolean;
  importMessage: string;
  onSelect: (book: Book) => void;
  onAddBook: () => void;
};

const BOOKS_PER_ROW = 7;

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20c.5-4.1 2.8-6.2 6.5-6.2s6 2.1 6.5 6.2" />
    </svg>
  );
}

export default function MobileShelfScene({
  books,
  storageReady,
  importMessage,
  onSelect,
  onAddBook,
}: MobileShelfSceneProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const visibleBooks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return books;
    return books.filter((book) => `${book.title} ${book.author}`.toLowerCase().includes(needle));
  }, [books, query]);

  const rows = useMemo(() => {
    const next: Book[][] = [];
    for (let index = 0; index < visibleBooks.length; index += BOOKS_PER_ROW) {
      next.push(visibleBooks.slice(index, index + BOOKS_PER_ROW));
    }
    if (!query.trim()) {
      while (next.length < 4) next.push([]);
    }
    return next;
  }, [query, visibleBooks]);

  return (
    <div className={styles.scene}>
      <div className={styles.wallTexture} aria-hidden="true" />
      <div className={styles.windowGlow} aria-hidden="true" />
      <img
        className={styles.windowAsset}
        src="/themes/botanical/v3/window-left.webp"
        alt=""
        aria-hidden="true"
      />
      <div className={styles.sunbeam} aria-hidden="true" />
      <div className={styles.dust} aria-hidden="true" />
      <img
        className={styles.hangingVine}
        src="/themes/botanical/v3/hanging-vine-right.webp"
        alt=""
        aria-hidden="true"
      />

      <header className={styles.topBar}>
        <div className={styles.brand} aria-label="Shelf of Fame">
          <span>SHELF</span>
          <i>of</i>
          <span>FAME</span>
        </div>
        <Link href="/account" className={styles.profileButton} aria-label="Open your profile">
          <UserIcon />
        </Link>
      </header>

      <div className={styles.quoteFrame} aria-hidden="true">
        <span>just</span>
        <span>one more</span>
        <span>chapter</span>
      </div>

      <div className={styles.scenePlant} aria-hidden="true">
        <img src="/themes/botanical/v3/ceramic-pothos-planter.webp" alt="" />
      </div>

      <div className={styles.shelfStage} role="main">
        <div className={styles.cabinetCap} aria-hidden="true" />

        <div className={styles.shelfViewport}>
          {searchOpen ? (
            <div className={styles.searchPanel}>
              <SearchIcon />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search your shelf"
                aria-label="Search your shelf"
              />
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSearchOpen(false);
                }}
                aria-label="Close search"
              >
                ×
              </button>
            </div>
          ) : null}

          <div className={styles.bookcase}>
            {rows.length ? rows.map((row, rowIndex) => (
              <section className={styles.shelfRow} key={rowIndex} aria-label={`Shelf row ${rowIndex + 1}`}>
                <div className={styles.booksRow}>
                  {row.map((book, bookIndex) => (
                    <MobileBookSpine
                      key={book.id}
                      book={book}
                      index={rowIndex * BOOKS_PER_ROW + bookIndex}
                      onSelect={onSelect}
                    />
                  ))}
                  {row.length === 0 && rowIndex === 0 ? (
                    <div className={styles.emptyShelfMessage}>Your books will live here.</div>
                  ) : null}
                </div>
                <div className={styles.shelfPlank} aria-hidden="true" />
              </section>
            )) : (
              <div className={styles.noResults}>
                <span>No books found.</span>
                <button type="button" onClick={() => setQuery("")}>Show all books</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.statusPill} aria-live="polite">
        <span>{books.length} {books.length === 1 ? "book" : "books"}</span>
        <b aria-hidden="true">·</b>
        <span>{storageReady ? "shelf ready" : "loading shelf"}</span>
      </div>

      <nav className={styles.bottomDock} aria-label="Shelf navigation">
        <button
          type="button"
          className={searchOpen ? styles.activeDockButton : ""}
          onClick={() => setSearchOpen((current) => !current)}
        >
          <SearchIcon />
          <span>Search</span>
        </button>

        <button type="button" className={styles.addButton} onClick={onAddBook}>
          <span className={styles.addCircle} aria-hidden="true">+</span>
          <span>Add Book</span>
        </button>

        <Link href="/account" className={styles.dockLink}>
          <UserIcon />
          <span>You</span>
        </Link>
      </nav>

      {importMessage ? <div className={styles.toast}>{importMessage}</div> : null}
    </div>
  );
}
