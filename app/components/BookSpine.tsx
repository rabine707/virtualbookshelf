"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import {
  allowedCovers,
  Book,
  coverKey,
  coverMemory,
  coverOptionsMemory,
  coverRequestUrl,
  CoverResponse,
  CoverResult,
  rejectedUrls,
} from "../../lib/books/client-library";

function spineTitle(title: string) {
  if (title.length <= 38) return title;
  return `${title.slice(0, 35).trim()}…`;
}

type BookSpineProps = {
  book: Book;
  bookNumber: number;
  onSelect: (book: Book) => void;
};

export function BookSpine({ book, bookNumber, onSelect }: BookSpineProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const key = coverKey(book);
  const eager = bookNumber < 8;
  const preferred = book.preferredCover && !rejectedUrls(book).has(book.preferredCover.url)
    ? book.preferredCover
    : undefined;
  const [cover, setCover] = useState<CoverResult | null>(() => preferred || coverMemory.get(key) || null);
  const [shouldLoad, setShouldLoad] = useState(() => eager || coverMemory.has(key));
  const displayedCover = preferred || cover;

  useEffect(() => {
    if (preferred) {
      coverMemory.set(key, preferred);
      setCover(preferred);
      setShouldLoad(true);
      return;
    }

    if (coverMemory.has(key)) {
      const cached = coverMemory.get(key) || null;
      setCover(cached && !rejectedUrls(book).has(cached.url) ? cached : null);
      setShouldLoad(true);
      return;
    }

    if (eager) {
      setShouldLoad(true);
      return;
    }

    const node = buttonRef.current;
    if (!node) return;

    if (!("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, { rootMargin: "650px 0px" });

    observer.observe(node);
    return () => observer.disconnect();
  }, [book.coverFeedback, eager, key, preferred]);

  useEffect(() => {
    if (preferred || !shouldLoad) return;

    const cached = coverMemory.get(key);
    if (cached !== undefined && (!cached || !rejectedUrls(book).has(cached.url))) return;

    const controller = new AbortController();
    fetch(coverRequestUrl(book), { signal: controller.signal, cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((result: CoverResponse | null) => {
        const fetched = result?.options || (result?.url && result?.source ? [{ url: result.url, source: result.source }] : []);
        const options = allowedCovers(book, fetched);
        if (options.length) coverOptionsMemory.set(key, options);
        const valid = options[0] || null;
        coverMemory.set(key, valid);
        setCover(valid);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [book, key, preferred, shouldLoad]);

  const style = {
    "--book-color": book.color,
    "--lean": `${((bookNumber % 7) - 3) * 0.42}deg`,
    "--book-height": `${180 + ((bookNumber * 17) % 38)}px`,
    "--book-width": `${66 + ((bookNumber * 11) % 34)}px`,
    "--band-offset": `${25 + ((bookNumber * 13) % 42)}%`,
  } as CSSProperties;

  return (
    <button
      ref={buttonRef}
      className={`book book-style-${bookNumber % 4}${displayedCover?.url ? " has-cover" : ""}`}
      style={style}
      onClick={() => onSelect(book)}
      title={`${book.title} — ${book.author}`}
    >
      {displayedCover?.url ? (
        <img
          className="book-cover-art"
          src={displayedCover.url}
          alt=""
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onError={() => {
            if (!preferred) {
              coverMemory.set(key, null);
              setCover(null);
            }
          }}
        />
      ) : null}
      {!displayedCover?.url ? <span className="spine-mark" aria-hidden="true">◆</span> : null}
      <span className="book-title">{spineTitle(book.title)}</span>
      <span className="book-author">{book.author}</span>
    </button>
  );
}
