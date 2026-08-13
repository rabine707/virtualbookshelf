"use client";

import { Book } from "../../lib/books/client-library";
import { BookSpine } from "./BookSpine";

type BookshelfProps = {
  shelves: Book[][];
  onSelect: (book: Book) => void;
};

type DecorKind = "plant" | "plant-small" | "warm-glow";
type DecorSpec = { left?: DecorKind; right?: DecorKind };
type BookLayout = "center" | "left" | "right" | "split";

const DECOR_VARIATIONS: DecorSpec[] = [
  { left: "plant", right: "warm-glow" },
  { right: "plant-small" },
  {},
  { left: "warm-glow", right: "plant" },
  { left: "plant-small" },
  {},
  { right: "warm-glow" },
  {},
];

const BOOK_LAYOUTS: BookLayout[] = [
  "center",
  "left",
  "right",
  "split",
  "left",
  "center",
  "right",
  "split",
];

function getDeterministicDecor(rowNumber: number) {
  return DECOR_VARIATIONS[(rowNumber - 1) % DECOR_VARIATIONS.length];
}

function getBookLayout(rowNumber: number, bookCount: number): BookLayout {
  const layout = BOOK_LAYOUTS[(rowNumber - 1) % BOOK_LAYOUTS.length];
  return layout === "split" && bookCount < 6 ? "left" : layout;
}

function ShelfDecor({ kind, side, eager }: { kind: DecorKind; side: "left" | "right"; eager: boolean }) {
  if (kind === "warm-glow") {
    return (
      <div className={`botanical-row-decor botanical-row-decor-${side} botanical-row-decor-warm-glow`} aria-hidden="true">
        <span className="botanical-practical-glow" />
      </div>
    );
  }

  return (
    <div className={`botanical-row-decor botanical-row-decor-${side} botanical-row-decor-${kind}`} aria-hidden="true">
      <img
        className={`botanical-decor-plant ${kind === "plant" ? "botanical-decor-plant-large" : "botanical-decor-plant-small"}`}
        src="/themes/botanical/v3/ceramic-pothos-planter.webp"
        alt=""
        loading={eager ? "eager" : "lazy"}
        decoding="async"
      />
    </div>
  );
}

export function Bookshelf({ shelves, onSelect }: BookshelfProps) {
  return (
    <section className="bookcase modular-bookcase" aria-label="Shelf of Fame bookshelf">
      {shelves.length ? shelves.map((shelf, shelfIndex) => {
        const rowNumber = shelfIndex + 1;
        const decor = getDeterministicDecor(rowNumber);
        const layout = getBookLayout(rowNumber, shelf.length);
        const decorClass = decor.left && decor.right
          ? "botanical-decor-both"
          : decor.left
            ? "botanical-decor-left"
            : decor.right
              ? "botanical-decor-right"
              : "";

        const renderBook = (book: Book, index: number) => (
          <BookSpine
            key={book.id}
            book={book}
            bookNumber={shelfIndex * 14 + index}
            onSelect={onSelect}
          />
        );

        const splitAt = Math.ceil(shelf.length / 2);
        const firstCluster = layout === "split" ? shelf.slice(0, splitAt) : shelf;
        const secondCluster = layout === "split" ? shelf.slice(splitAt) : [];

        return (
          <div
            className={`shelf-row modular-shelf-row ${decorClass}`.trim()}
            key={shelfIndex}
            data-shelf-row={rowNumber}
            data-book-layout={layout}
          >
            {decor.left && <ShelfDecor kind={decor.left} side="left" eager={shelfIndex < 2} />}
            <div className={`books book-placement-layer book-layout-${layout}`}>
              <div className="book-cluster book-cluster-a">
                {firstCluster.map((book, index) => renderBook(book, index))}
              </div>
              {secondCluster.length ? (
                <div className="book-cluster book-cluster-b">
                  {secondCluster.map((book, index) => renderBook(book, splitAt + index))}
                </div>
              ) : null}
            </div>
            {decor.right && <ShelfDecor kind={decor.right} side="right" eager={shelfIndex < 2} />}
            <div className="wood-shelf" aria-hidden="true" />
          </div>
        );
      }) : (
        <div className="empty">No books match that search.</div>
      )}
    </section>
  );
}
