"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useMemo, useState } from "react";
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
const FULL_BOTANICAL_ASSET = "/themes/botanical/v3/botanical-sage-bluebell-fullframe.webp";
const BOTANICAL_FALLBACK = "/themes/botanical/v3/botanical-sage-bluebell.webp";

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

function FullBotanicalFrameImage() {
  const [src, setSrc] = useState(BOTANICAL_FALLBACK);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | undefined;

    void fetch(FULL_BOTANICAL_ASSET, { cache: "force-cache" })
      .then(async (response) => {
        if (!response.ok) return;

        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const startsWith = (...values: number[]) => values.every((value, index) => bytes[index] === value);

        let mime: string | undefined;
        if (startsWith(0xff, 0xd8, 0xff)) mime = "image/jpeg";
        else if (startsWith(0x89, 0x50, 0x4e, 0x47)) mime = "image/png";
        else if (
          bytes.length > 12 &&
          String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
          String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
        ) mime = "image/webp";

        if (mime) {
          objectUrl = URL.createObjectURL(new Blob([buffer], { type: mime }));
          if (!cancelled) setSrc(objectUrl);
          return;
        }

        // The first full-chart upload was accidentally stored as base64 text.
        // Decode that payload in the browser so the exact original artwork still renders.
        let encoded = new TextDecoder().decode(bytes).trim();
        if (!encoded) return;

        if (encoded.startsWith("data:image/")) {
          if (!cancelled) setSrc(encoded);
          return;
        }

        encoded = encoded.replace(/^\s+|\s+$/g, "");
        const decodedMime = encoded.startsWith("/9j/")
          ? "image/jpeg"
          : encoded.startsWith("iVBOR")
            ? "image/png"
            : encoded.startsWith("UklG")
              ? "image/webp"
              : undefined;

        if (decodedMime && !cancelled) {
          setSrc(`data:${decodedMime};base64,${encoded}`);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  return (
    <img
      src={src}
      alt=""
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        objectFit: "contain",
        objectPosition: "center",
        background: "#d4bda0",
      }}
    />
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
      <img
        className={headStyles.hangingVine}
        src="/themes/botanical/v3/hanging-pothos.webp"
        alt=""
        aria-hidden="true"
        style={{ top: "7.5vh", right: "-8vw", width: "min(33vw, 172px)", height: "43vh" }}
      />

      <header className={styles.topBar}>
        <div className={styles.brand} aria-label="Shelf of Fame">
          <span>SHELF</span>
          <i>of</i>
          <span>FAME</span>
        </div>
      </header>

      <div
        className={headStyles.quoteFrame}
        aria-hidden="true"
        style={{ padding: "8px", overflow: "hidden" }}
      >
        <FullBotanicalFrameImage />
      </div>

      <div className={headStyles.scenePlant} aria-hidden="true">
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
