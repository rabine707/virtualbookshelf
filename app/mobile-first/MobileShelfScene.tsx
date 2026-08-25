"use client";

import Link from "next/link";
import {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  useCallback,
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
  missingCoverCount: number;
  onFindCovers: () => void;
  onSelect: (book: Book) => void;
  onAddBook: () => void;
};

type SortMode = "recent" | "title" | "author" | "rating" | "status" | "color";
type SortDirection = "asc" | "desc";

const BOOKS_PER_ROW = 6;
const SHELF_ROW_HEIGHT = 199;
const SHELF_HINT_HEIGHT = 78;
const SHELF_OVERSCAN = 3;
const SHELF_SCROLL_KEY = "shelf-of-fame-mobile-scroll-v1";
const SORT_LABELS: Record<SortMode, string> = {
  recent: "Recently added",
  title: "Title",
  author: "Author",
  rating: "Rating",
  status: "Reading status",
  color: "Spine color",
};

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

function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 15, height: 15, fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" }}>
      <path d="M4 7h11" />
      <path d="M4 12h8" />
      <path d="M4 17h5" />
      <path d="m17 10 3-3 3 3" />
      <path d="M20 7v10" />
    </svg>
  );
}

function StyleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      <path d="m5.6 5.6 2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  );
}

function ReadersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <circle cx="16.5" cy="9.5" r="2.3" />
      <path d="M3.5 19c.5-3.7 2.4-5.6 5.5-5.6s5 1.9 5.5 5.6" />
      <path d="M14.2 14.3c3.5-.8 5.7.8 6.3 4.2" />
    </svg>
  );
}

function colorSortValue(color?: string) {
  const hex = color?.trim().match(/^#([0-9a-f]{6})$/i)?.[1];
  if (!hex) return 999;
  const r = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const g = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const b = Number.parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (!delta) return 0;
  let hue = max === r
    ? ((g - b) / delta) % 6
    : max === g
      ? ((b - r) / delta) + 2
      : ((r - g) / delta) + 4;
  hue *= 60;
  if (hue < 0) hue += 360;
  return hue;
}

function statusSortValue(shelf?: string) {
  if (shelf === "currently-reading") return 0;
  if (shelf === "to-read") return 1;
  if (shelf === "read") return 2;
  return 3;
}

function authorSortValue(author: string) {
  const suffixes = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);
  const parts = author
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  while (parts.length > 1) {
    const tail = parts[parts.length - 1].replace(/[.,]/g, "").toLowerCase();
    if (!suffixes.has(tail)) break;
    parts.pop();
  }

  if (!parts.length) return "";
  const lastName = parts[parts.length - 1].replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  return `${lastName} ${parts.slice(0, -1).join(" ")}`.trim();
}

export default function MobileShelfScene({
  books,
  importMessage,
  missingCoverCount,
  onFindCovers,
  onSelect,
  onAddBook,
}: MobileShelfSceneProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeShelf, setActiveShelf] = useState(books.length ? 1 : 0);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [renderWindow, setRenderWindow] = useState({ start: 0, end: 8 });
  const shelfViewport = useRef<HTMLDivElement>(null);
  const restoredScroll = useRef(false);
  const resetScrollAfterFirstRender = useRef(false);
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
    const filtered = needle
      ? books.filter((book) => `${book.title} ${book.author}`.toLowerCase().includes(needle))
      : [...books];

    const indexed = filtered.map((book) => ({ book, originalIndex: books.indexOf(book) }));
    indexed.sort((a, b) => {
      let comparison = 0;
      if (sortMode === "recent") comparison = a.originalIndex - b.originalIndex;
      if (sortMode === "title") comparison = a.book.title.localeCompare(b.book.title, undefined, { sensitivity: "base" });
      if (sortMode === "author") comparison = authorSortValue(a.book.author).localeCompare(authorSortValue(b.book.author), undefined, { sensitivity: "base" });
      if (sortMode === "rating") comparison = (a.book.rating || 0) - (b.book.rating || 0);
      if (sortMode === "status") comparison = statusSortValue(a.book.shelf) - statusSortValue(b.book.shelf);
      if (sortMode === "color") comparison = colorSortValue(a.book.color) - colorSortValue(b.book.color);
      if (comparison === 0) comparison = a.book.title.localeCompare(b.book.title, undefined, { sensitivity: "base" });
      return sortDirection === "asc" ? comparison : -comparison;
    });
    return indexed.map(({ book }) => book);
  }, [books, query, sortDirection, sortMode]);

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

  const syncVisibleRows = useCallback(() => {
    const viewport = shelfViewport.current;
    if (!viewport || rows.length === 0) {
      setActiveShelf(0);
      return;
    }

    const firstVisible = Math.max(0, Math.floor(viewport.scrollTop / SHELF_ROW_HEIGHT));
    const visibleCount = Math.ceil(viewport.clientHeight / SHELF_ROW_HEIGHT) + 1;
    const start = Math.max(0, firstVisible - SHELF_OVERSCAN);
    const end = Math.min(rows.length, firstVisible + visibleCount + SHELF_OVERSCAN);
    setRenderWindow((current) => current.start === start && current.end === end ? current : { start, end });
    if (shelfCount > 0) {
      const nextActive = Math.min(shelfCount, firstVisible + 1);
      setActiveShelf((current) => current === nextActive ? current : nextActive);
    }
    if (!query.trim() && sortMode === "recent" && sortDirection === "desc") {
      window.sessionStorage.setItem(SHELF_SCROLL_KEY, String(viewport.scrollTop));
    }
  }, [query, rows.length, shelfCount, sortDirection, sortMode]);

  useEffect(() => {
    const viewport = shelfViewport.current;
    if (!viewport) return;
    const onScroll = () => syncVisibleRows();
    viewport.addEventListener("scroll", onScroll, { passive: true });
    const resizeObserver = new ResizeObserver(syncVisibleRows);
    resizeObserver.observe(viewport);
    syncVisibleRows();
    return () => {
      viewport.removeEventListener("scroll", onScroll);
      resizeObserver.disconnect();
    };
  }, [syncVisibleRows]);

  useEffect(() => {
    const viewport = shelfViewport.current;
    if (!viewport || restoredScroll.current || !rows.length || !books.length) return;
    restoredScroll.current = true;
    const saved = Number(window.sessionStorage.getItem(SHELF_SCROLL_KEY));
    requestAnimationFrame(() => {
      if (Number.isFinite(saved) && saved > 0) viewport.scrollTop = Math.min(saved, viewport.scrollHeight - viewport.clientHeight);
      syncVisibleRows();
    });
  }, [books.length, rows.length, syncVisibleRows]);

  useEffect(() => {
    const viewport = shelfViewport.current;
    if (!viewport) return;
    if (!resetScrollAfterFirstRender.current) {
      resetScrollAfterFirstRender.current = true;
      return;
    }
    viewport.scrollTop = 0;
    setRenderWindow({ start: 0, end: 8 });
    setActiveShelf(1);
  }, [query, sortDirection, sortMode]);

  const renderedRows = rows.slice(renderWindow.start, renderWindow.end);
  const topSpacerHeight = renderWindow.start * SHELF_ROW_HEIGHT;
  const hiddenAfterWindow = rows.slice(renderWindow.end);
  const bottomSpacerHeight = hiddenAfterWindow.reduce((height, row, index) => {
    const absoluteIndex = renderWindow.end + index;
    const continuationHint = !query.trim() && books.length > 0 && row.length === 0 && absoluteIndex === rows.length - 1;
    return height + (continuationHint ? SHELF_HINT_HEIGHT : SHELF_ROW_HEIGHT);
  }, 0);

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
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <span>{countLabel}</span>
          <i aria-hidden="true">·</i>
          <strong>{shelfCount ? `shelf ${activeShelf || 1} of ${shelfCount}` : "no shelves"}</strong>
          <button
            type="button"
            onClick={() => setSortOpen(true)}
            aria-label={`Sort shelf, currently ${SORT_LABELS[sortMode]}`}
            title="Sort shelf"
            style={{
              marginLeft: 4,
              width: 30,
              height: 30,
              display: "grid",
              placeItems: "center",
              padding: 0,
              border: "1px solid rgba(255,255,255,.15)",
              borderRadius: 999,
              background: "rgba(49,33,22,.5)",
              color: "inherit",
            }}
          >
            <SortIcon />
          </button>
        </div>

        <div ref={shelfViewport} className={`${styles.shelfViewport} ${polish.shelfViewport}`}>
          <div className={`${styles.bookcase} ${polish.bookcase}`}>
            {rows.length ? <>
              {topSpacerHeight > 0 ? <div aria-hidden="true" style={{ height: topSpacerHeight }} /> : null}
              {renderedRows.map((row, windowIndex) => {
              const rowIndex = renderWindow.start + windowIndex;
              const continuationHint = !query.trim() && books.length > 0 && row.length === 0 && rowIndex === rows.length - 1;

              return (
                <section
                  className={`${styles.shelfRow} ${polish.shelfRow} ${continuationHint ? `${styles.shelfRowHint} ${polish.shelfRowHint}` : ""}`}
                  key={rowIndex}
                  aria-label={continuationHint ? "Shelf continues" : `Shelf row ${rowIndex + 1}`}
                  data-shelf-number={continuationHint ? undefined : rowIndex + 1}
                  data-shelf-variant={(rowIndex % 3) + 1}
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
              })}
              {bottomSpacerHeight > 0 ? <div aria-hidden="true" style={{ height: bottomSpacerHeight }} /> : null}
            </> : (
              <div className={styles.noResults}>
                <span>No books found.</span>
                <button type="button" onClick={() => setQuery("")}>Show all books</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {sortOpen ? (
        <div
          role="presentation"
          onClick={() => setSortOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 95, background: "rgba(15,10,7,.36)", display: "flex", alignItems: "flex-end" }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Sort shelf"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              padding: "18px 16px calc(22px + env(safe-area-inset-bottom))",
              borderRadius: "24px 24px 0 0",
              background: "#f4ecdf",
              color: "#2d2018",
              boxShadow: "0 -18px 44px rgba(0,0,0,.28)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ font: "800 11px/1 Arial, sans-serif", letterSpacing: ".1em", textTransform: "uppercase", opacity: .55 }}>Shelf order</div>
                <h2 style={{ margin: "4px 0 0", fontSize: 24 }}>Sort shelf</h2>
              </div>
              <button type="button" onClick={() => setSortOpen(false)} aria-label="Close sort" style={{ width: 38, height: 38, borderRadius: 999, border: "1px solid rgba(72,48,34,.18)", background: "rgba(255,255,255,.5)", fontSize: 24 }}>×</button>
            </div>

            <div style={{ display: "grid", gap: 7 }}>
              {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setSortMode(mode);
                    if (mode === "recent" || mode === "rating") setSortDirection("desc");
                    else if (sortMode !== mode) setSortDirection("asc");
                  }}
                  style={{
                    minHeight: 48,
                    padding: "0 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderRadius: 14,
                    border: sortMode === mode ? "1px solid rgba(76,52,36,.45)" : "1px solid rgba(76,52,36,.13)",
                    background: sortMode === mode ? "rgba(99,69,45,.12)" : "rgba(255,255,255,.42)",
                    color: "inherit",
                    font: "700 15px/1.2 Arial, sans-serif",
                  }}
                >
                  <span>{SORT_LABELS[mode]}</span>
                  {sortMode === mode ? <span aria-hidden="true">✓</span> : null}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(72,48,34,.12)" }}>
              <div style={{ font: "800 11px/1 Arial, sans-serif", letterSpacing: ".08em", textTransform: "uppercase", opacity: .55, marginBottom: 8 }}>Direction</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button type="button" onClick={() => setSortDirection("asc")} style={{ minHeight: 44, borderRadius: 12, border: sortDirection === "asc" ? "1px solid rgba(76,52,36,.45)" : "1px solid rgba(76,52,36,.13)", background: sortDirection === "asc" ? "rgba(99,69,45,.12)" : "rgba(255,255,255,.42)", color: "inherit", fontWeight: 700 }}>Ascending</button>
                <button type="button" onClick={() => setSortDirection("desc")} style={{ minHeight: 44, borderRadius: 12, border: sortDirection === "desc" ? "1px solid rgba(76,52,36,.45)" : "1px solid rgba(76,52,36,.13)", background: sortDirection === "desc" ? "rgba(99,69,45,.12)" : "rgba(255,255,255,.42)", color: "inherit", fontWeight: 700 }}>Descending</button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {searchOpen ? (
        <div
          className={styles.searchPanel}
          style={{
            position: "fixed",
            zIndex: 80,
            top: "auto",
            left: 12,
            right: 12,
            bottom: "calc(78px + env(safe-area-inset-bottom))",
            width: "auto",
            height: "auto",
            minHeight: 54,
            margin: 0,
            padding: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: 7,
            flexWrap: "nowrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", minHeight: 38 }}>
            <SearchIcon />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your shelf"
              aria-label="Search your shelf"
              style={{ fontSize: 16 }}
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
          {missingCoverCount > 0 ? (
            <button
              type="button"
              onClick={onFindCovers}
              style={{
                width: "100%",
                minHeight: 38,
                height: 38,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "0 12px",
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: 10,
                background: "rgba(64,45,33,.82)",
                color: "#f2e4d3",
                font: "600 13px/1 Arial, sans-serif",
              }}
            >
              <span>Find Covers</span>
              <small style={{ opacity: .68 }}>{missingCoverCount} missing</small>
            </button>
          ) : null}
        </div>
      ) : null}

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

        <Link href="/readers" className={styles.dockLink} aria-label="Find readers">
          <ReadersIcon />
          <span className={styles.dockLabel}>Readers</span>
        </Link>

        <button type="button" className={styles.addButton} onClick={onAddBook} aria-label="Add a book">
          <span className={styles.addCircle} aria-hidden="true">+</span>
          <span className={styles.dockLabel}>Add Book</span>
        </button>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("shelf-open-personalization"))}
          aria-label="Personalize your shelf"
        >
          <StyleIcon />
          <span className={styles.dockLabel}>Style</span>
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
