"use client";

import Link from "next/link";
import {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Book } from "../../lib/books/client-library";
import { MobileBookSpine } from "./MobileBookSpine";
import { SPINE_SHELL_TEXTURES } from "./spineShellTextures";
import headStyles from "./CinematicHead.module.css";
import styles from "./MobileShelfScene.module.css";
import polish from "./MobileShelfPolish.module.css";

type MobileShelfSceneProps = {
  books: Book[];
  importMessage: string;
  onSelect: (book: Book) => void;
  onAddBook: () => void;
};

const BOOKS_PER_ROW = 6;

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
  const [activeShelf, setActiveShelf] = useState(books.length ? 1 : 0);
  const shelfViewport = useRef<HTMLDivElement>(null);
  const activeLightPointer = useRef<number | null>(null);
  const lightFrame = useRef<number | null>(null);
  const pendingLight = useRef<{ scene: HTMLDivElement; x: number; y: number } | null>(null);

  useEffect(() => () => {
    if (lightFrame.current !== null) cancelAnimationFrame(lightFrame.current);
  }, []);

  function queueTouchLight(event: ReactPointerEvent<HTMLDivElement>) {
    const scene = event.currentTarget;
    const bounds = scene.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100));
    pendingLight.current = { scene, x, y };

    if (lightFrame.current !== null) return;
    lightFrame.current = requestAnimationFrame(() => {
      const pending = pendingLight.current;
      if (pending) {
        pending.scene.style.setProperty("--touch-light-x", `${pending.x.toFixed(2)}%`);
        pending.scene.style.setProperty("--touch-light-y", `${pending.y.toFixed(2)}%`);
      }
      pendingLight.current = null;
      lightFrame.current = null;
    });
  }

  function startTouchLight(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (activeLightPointer.current !== null && activeLightPointer.current !== event.pointerId) return;
    activeLightPointer.current = event.pointerId;
    event.currentTarget.style.setProperty("--touch-light-strength", ".82");
    queueTouchLight(event);
  }

  function moveTouchLight(event: ReactPointerEvent<HTMLDivElement>) {
    if (activeLightPointer.current !== event.pointerId) return;
    queueTouchLight(event);
  }

  function endTouchLight(event: ReactPointerEvent<HTMLDivElement>) {
    if (activeLightPointer.current !== event.pointerId) return;
    activeLightPointer.current = null;
    event.currentTarget.style.setProperty("--touch-light-strength", "0");
  }

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

  const shelfCount = Math.ceil(visibleBooks.length / BOOKS_PER_ROW);
  const countLabel = query.trim()
    ? `${visibleBooks.length} ${visibleBooks.length === 1 ? "match" : "matches"}`
    : `${books.length} ${books.length === 1 ? "book" : "books"}`;

  useEffect(() => {
    const viewport = shelfViewport.current;
    if (!viewport || shelfCount === 0) {
      setActiveShelf(0);
      return;
    }

    setActiveShelf((current) => Math.min(Math.max(current, 1), shelfCount));
    const shelfElements = Array.from(
      viewport.querySelectorAll<HTMLElement>("[data-shelf-number]"),
    );
    if (!("IntersectionObserver" in window)) return;

    const chooseActiveShelf = () => {
      const viewportBounds = viewport.getBoundingClientRect();
      const readingLine = viewportBounds.top + Math.min(86, viewportBounds.height * .24);
      let closestShelf = 1;
      let closestDistance = Number.POSITIVE_INFINITY;

      shelfElements.forEach((element) => {
        const bounds = element.getBoundingClientRect();
        const distance = bounds.top <= readingLine && bounds.bottom >= readingLine
          ? 0
          : Math.min(Math.abs(bounds.top - readingLine), Math.abs(bounds.bottom - readingLine));
        if (distance < closestDistance) {
          closestDistance = distance;
          closestShelf = Number(element.dataset.shelfNumber) || 1;
        }
      });

      setActiveShelf((current) => current === closestShelf ? current : closestShelf);
    };

    const observer = new IntersectionObserver(chooseActiveShelf, {
      root: viewport,
      rootMargin: "-12% 0px -64% 0px",
      threshold: [0, .25, .5, .75, 1],
    });
    shelfElements.forEach((element) => observer.observe(element));
    chooseActiveShelf();

    return () => observer.disconnect();
  }, [books.length, query, shelfCount]);

  const sceneStyle = {
    "--shell-classic-image": `url("${SPINE_SHELL_TEXTURES.classic}")`,
    "--shell-rough-image": `url("${SPINE_SHELL_TEXTURES.rough}")`,
    "--shell-vintage-image": `url("${SPINE_SHELL_TEXTURES.vintage}")`,
    "--touch-light-x": "50%",
    "--touch-light-y": "48%",
    "--touch-light-strength": "0",
  } as CSSProperties;

  return (
    <div
      className={styles.scene}
      style={sceneStyle}
      onPointerDown={startTouchLight}
      onPointerMove={moveTouchLight}
      onPointerUp={endTouchLight}
      onPointerCancel={endTouchLight}
      onPointerLeave={endTouchLight}
    >
      <div className={headStyles.wallTexture} aria-hidden="true" />
      <div className={headStyles.wallDepth} aria-hidden="true" />
      <div className={headStyles.windowGlow} aria-hidden="true" />
      <img
        className={headStyles.windowAsset}
        src="/themes/botanical/v6/windowpng.png"
        alt=""
        aria-hidden="true"
      />
      <div className={headStyles.sunbeam} aria-hidden="true" />
      <div className={headStyles.windowShadowCast} aria-hidden="true" />
      <div className={headStyles.dust} aria-hidden="true" />
      <div className={styles.touchLight} aria-hidden="true" />

      <header className={`${styles.topBar} ${polish.topBar}`}>
        <div className={`${styles.brand} ${polish.brand}`} aria-label="Shelf of Fame">
          <span>SHELF</span>
          <i>of</i>
          <span>FAME</span>
        </div>
      </header>

      <img
        className={`${headStyles.quoteFrame} ${polish.quoteFrame}`}
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
          filter: "brightness(.98) saturate(.94) drop-shadow(7px 12px 10px rgba(19,13,8,.46)) drop-shadow(1px 3px 2px rgba(19,13,8,.28))",
          transform: "rotate(.25deg)",
        }}
      />

      <div className={`${styles.shelfStage} ${polish.shelfStage}`} role="main">
        <div className={`${styles.cabinetCap} ${polish.cabinetCap}`} aria-hidden="true" />

        <div
          className={styles.shelfStatus}
          aria-label={`${countLabel}, ${shelfCount ? `shelf ${activeShelf || 1} of ${shelfCount}` : "no shelves"}`}
        >
          <span>{countLabel}</span>
          <i aria-hidden="true">·</i>
          <strong>{shelfCount ? `shelf ${activeShelf || 1} of ${shelfCount}` : "no shelves"}</strong>
        </div>

        <div ref={shelfViewport} className={`${styles.shelfViewport} ${polish.shelfViewport}`}>
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

          <div className={`${styles.bookcase} ${polish.bookcase}`}>
            {rows.length ? rows.map((row, rowIndex) => {
              const continuationHint = !query.trim() && books.length > 0 && row.length === 0 && rowIndex === rows.length - 1;

              return (
                <section
                  className={`${styles.shelfRow} ${polish.shelfRow} ${continuationHint ? `${styles.shelfRowHint} ${polish.shelfRowHint}` : ""}`}
                  key={rowIndex}
                  aria-label={continuationHint ? "Shelf continues" : `Shelf row ${rowIndex + 1}`}
                  data-shelf-number={continuationHint ? undefined : rowIndex + 1}
                >
                  <div className={`${styles.booksRow} ${polish.booksRow}`}>
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
                  <div className={`${styles.shelfPlank} ${polish.shelfPlank}`} aria-hidden="true" />
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

      <div className={styles.dockScrim} aria-hidden="true" />
      <nav className={`${styles.bottomDock} ${polish.bottomDock}`} aria-label="Shelf navigation">
        <button
          type="button"
          className={searchOpen ? styles.activeDockButton : ""}
          onClick={() => {
            if (searchOpen) setQuery("");
            setSearchOpen((current) => !current);
          }}
          aria-pressed={searchOpen}
        >
          <SearchIcon />
          <span className={styles.dockLabel}>Search</span>
        </button>

        <button type="button" className={styles.addButton} onClick={onAddBook} aria-label="Add a book">
          <span className={styles.addCircle} aria-hidden="true">+</span>
          <span className={styles.dockLabel}>Add Book</span>
        </button>

        <Link href="/account" className={styles.dockLink}>
          <UserIcon />
          <span className={styles.dockLabel}>You</span>
        </Link>
      </nav>

      {importMessage ? <div className={styles.toast} role="status">{importMessage}</div> : null}
    </div>
  );
}
