"use client";

import { Book } from "../../lib/books/client-library";
import { BookSpine } from "./BookSpine";

type BookshelfProps = {
  shelves: Book[][];
  onSelect: (book: Book) => void;
};

type DecorKind =
  | "plant-bottles"
  | "lamp-frame"
  | "candle-stack"
  | "plant-frame"
  | "bottles"
  | "small-plant";

type DecorSpec = { left?: DecorKind; right?: DecorKind };

const DECOR_VARIATIONS: DecorSpec[] = [
  { left: "plant-bottles", right: "lamp-frame" },
  { right: "candle-stack" },
  {},
  { left: "plant-frame", right: "small-plant" },
  { left: "bottles" },
  {},
  { right: "small-plant" },
  {},
];

function getDeterministicDecor(rowNumber: number) {
  return DECOR_VARIATIONS[(rowNumber - 1) % DECOR_VARIATIONS.length];
}

function ApothecaryBottles() {
  return (
    <span className="botanical-bottle-group">
      <span className="botanical-apothecary botanical-apothecary-wide"><i /></span>
      <span className="botanical-apothecary botanical-apothecary-tall"><i /></span>
    </span>
  );
}

function MiniFrame() {
  return (
    <span className="botanical-mini-frame">
      <i className="botanical-mini-frame-sky" />
      <i className="botanical-mini-frame-hill botanical-mini-frame-hill-back" />
      <i className="botanical-mini-frame-hill botanical-mini-frame-hill-front" />
    </span>
  );
}

function ShelfDecor({ kind, side, eager }: { kind: DecorKind; side: "left" | "right"; eager: boolean }) {
  return (
    <div
      className={`botanical-row-decor botanical-row-decor-${side} botanical-row-decor-${kind}`}
      aria-hidden="true"
    >
      {kind === "plant-bottles" && (
        <>
          <img className="botanical-decor-plant botanical-decor-plant-large" src="/themes/botanical/v3/ceramic-pothos-planter.webp" alt="" loading={eager ? "eager" : "lazy"} decoding="async" />
          <ApothecaryBottles />
        </>
      )}
      {kind === "lamp-frame" && (
        <>
          <span className="botanical-lamp-aura" />
          <span className="botanical-lamp-glass"><i className="botanical-lamp-bulb" /><i className="botanical-lamp-highlight" /></span>
          <span className="botanical-lamp-cap" />
          <span className="botanical-lamp-stem" />
          <span className="botanical-lamp-foot" />
          <span className="botanical-frame-companion"><MiniFrame /></span>
        </>
      )}
      {kind === "candle-stack" && (
        <>
          <span className="botanical-stack-book botanical-stack-book-one" />
          <span className="botanical-stack-book botanical-stack-book-two" />
          <span className="botanical-stack-book botanical-stack-book-three" />
          <span className="botanical-stack-candle"><i /><b /></span>
        </>
      )}
      {kind === "plant-frame" && (
        <>
          <img className="botanical-decor-plant botanical-decor-plant-medium" src="/themes/botanical/v3/ceramic-pothos-planter.webp" alt="" loading={eager ? "eager" : "lazy"} decoding="async" />
          <span className="botanical-frame-companion botanical-frame-companion-low"><MiniFrame /></span>
        </>
      )}
      {kind === "bottles" && <ApothecaryBottles />}
      {kind === "small-plant" && (
        <img className="botanical-decor-plant botanical-decor-plant-small" src="/themes/botanical/v3/ceramic-pothos-planter.webp" alt="" loading={eager ? "eager" : "lazy"} decoding="async" />
      )}
    </div>
  );
}

export function Bookshelf({ shelves, onSelect }: BookshelfProps) {
  return (
    <section className="bookcase modular-bookcase" aria-label="Shelf of Fame bookshelf">
      {shelves.length ? shelves.map((shelf, shelfIndex) => {
        const rowNumber = shelfIndex + 1;
        const decor = getDeterministicDecor(rowNumber);
        const decorClass = decor.left && decor.right
          ? "botanical-decor-both"
          : decor.left
            ? "botanical-decor-left"
            : decor.right
              ? "botanical-decor-right"
              : "";

        return (
          <div
            className={`shelf-row modular-shelf-row ${decorClass}`.trim()}
            key={shelfIndex}
            data-shelf-row={rowNumber}
          >
            {decor.left && <ShelfDecor kind={decor.left} side="left" eager={shelfIndex < 2} />}
            <div className="books book-placement-layer">
              {shelf.map((book, index) => (
                <BookSpine
                  key={book.id}
                  book={book}
                  bookNumber={shelfIndex * 8 + index}
                  onSelect={onSelect}
                />
              ))}
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
