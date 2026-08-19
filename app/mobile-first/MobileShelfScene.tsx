"use client";

import Link from "next/link";
import { CSSProperties, useMemo, useState } from "react";
import { Book } from "../../lib/books/client-library";
import { MobileBookSpine } from "./MobileBookSpine";
import { SPINE_SHELL_TEXTURES } from "./spineShellTextures";
import headStyles from "./CinematicHead.module.css";
import styles from "./MobileShelfScene.module.css";

type MobileShelfSceneProps = {
  books: Book[];
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
      if (next.length === 0) next.push([]);
      else next.push([]);
    }

    return next;
  }, [query, visibleBooks]);

  const sceneStyle = {
    "--shelf-shell-image": `url("${SPINE_SHELL_TEXTURES.classic}")`,
  } as CSSProperties;

  return (
    <div className={styles.scene} style={sceneStyle}>
      <div className={headStyles.wallTexture} aria-hidden="true" />
      <div className={headStyles.wallDepth} aria-hidden="true" />
      <div className={headStyles.windowGlow} aria-hidden="true" />
      <img
        className={headStyles.windowAsset}
        src="/themes/botanical/v3/window-left.webp"
        alt=""
        aria-hidden="true"
      />
      <div className={headStyles.sunbeam} aria-hidden="true" />
      <div className={headStyles.windowShadowCast} aria-hidden="true" />
      <div className={headStyles.dust} aria-hidden="true" />

      <header className={styles.topBar}>
        <div className={styles.brand} aria-label="Shelf of Fame">
          <span>SHELF</span>
          <i>of</i>
          <span>FAME</span>
        </div>
      </header>

      <img
        className={headStyles.quoteFrame}
        src="/themes/botanical/v6/botanical-frame.webp"
        alt=""
        aria-hidden="true"
        style={{
          display: "block",
          width: "138px",
          height: "auto",
          minHeight: 0,
          padding: 0,
          border: "none",
          outline: "none",
          background: "transparent",
          objectFit: "contain",
          boxShadow: "none",
          filter: "drop-shadow(0 9px 9px rgba(0,0,0,.30))",
          transform: "rotate(.25deg)",
        }}
      />

      <img
        src="/themes/botanical/v6/hanging-pothos-shelf.webp"
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          zIndex: 12,
          top: "calc(27vh - 150px)",
          right: "0px",
          width: "188px",
          height: "auto",
          pointerEvents: "none",
          objectFit: "contain",
          filter: "brightness(.82) saturate(.9) contrast(1.04) drop-shadow(-5px 11px 9px rgba(0,0,0,.34))",
        }}
      />

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
            {rows.length ? rows.map((row, rowIndex) => {
              const continuationHint = !query.trim() && books.length > 0 && row.length === 0 && rowIndex === rows.length - 1;

              return (
                <section
                  className={`${styles.shelfRow} ${continuationHint ? styles.shelfRowHint : ""}`}
                  key={rowIndex}
                  aria-label={continuationHint ? "Shelf continues" : `Shelf row ${rowIndex + 1}`}
                >
                  <div className={styles.booksRow}>
                    {row.map((book, bookIndex) => (
                      <MobileBookSpine
                        key={book.id}
                        book={book}
                        index={rowIndex * BOOKS_PER_ROW + bookIndex}
                        onSelect={onSelect}
                      />
                    ))}
                    {row.length === 0 && books.length === 0 && rowIndex === 0 ? (
                      <div className={styles.emptyShelfMessage}>Your books will live here.</div>
                    ) : null}
                  </div>
                  <div className={styles.shelfPlank} aria-hidden="true" />
                </section>
              );
            }) : (
              <div className={styles.noResults}>
                <span>No books found.</span>
                <button type="button" onClick={() => setQuery("")}>Show all books</button>
              </div>
            )}
          </div>
        </div>
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

      {importMessage ? <div className={styles.toast} role="status">{importMessage}</div> : null}
    </div>
  );
}
