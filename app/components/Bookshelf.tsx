"use client";

import { Book } from "../../lib/books/client-library";
import { BookSpine } from "./BookSpine";

type BookshelfProps = {
  shelves: Book[][];
  onSelect: (book: Book) => void;
};

export function Bookshelf({ shelves, onSelect }: BookshelfProps) {
  return (
    <section className="bookcase" aria-label="Shelf of Fame bookshelf">
      {shelves.length ? shelves.map((shelf, shelfIndex) => (
        <div className="shelf-row" key={shelfIndex}>
          <div className="books">
            {shelf.map((book, index) => (
              <BookSpine
                key={book.id}
                book={book}
                bookNumber={shelfIndex * 8 + index}
                onSelect={onSelect}
              />
            ))}
          </div>
          <div className="wood-shelf" />
        </div>
      )) : (
        <div className="empty">No books match that search.</div>
      )}
    </section>
  );
}
