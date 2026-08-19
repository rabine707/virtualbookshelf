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
import styles from "./MobileShelfScene.module.css";

type MobileBookSpineProps = {
  book: Book;
  index: number;
  onSelect: (book: Book) => void;
};

function shortTitle(title: string) {
  if (title.length <= 42) return title;
  return `${title.slice(0, 39).trim()}…`;
}

export function MobileBookSpine({ book, index, onSelect }: MobileBookSpineProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const key = coverKey(book);
  const eager = index < 14;
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

    const cached = coverMemory.get(key);
    if (cached !== undefined) {
      setCover(cached && !rejectedUrls(book).has(cached.url) ? cached : null);
      setShouldLoad(true);
      return;
    }

    if (eager) {
      setShouldLoad(true);
      return;
    }

    const node = ref.current;
    if (!node || !("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, { rootMargin: "500px 0px" });

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
    "--mobile-spine-color": book.color,
    "--mobile-spine-width": `${34 + ((index * 7) % 10)}px`,
  } as CSSProperties;

  return (
    <button
      ref={ref}
      type="button"
      className={`${styles.bookSpine} ${displayedCover?.url ? styles.bookSpineWithCover : ""}`}
      style={style}
      onClick={() => onSelect(book)}
      aria-label={`${book.title} by ${book.author}`}
      title={`${book.title} — ${book.author}`}
    >
      {displayedCover?.url ? (
        <img
          className={styles.spineCover}
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
      <span className={styles.spineShade} aria-hidden="true" />
      <span className={styles.spineTitle}>{shortTitle(book.title)}</span>
      <span className={styles.spineAuthor}>{book.author}</span>
    </button>
  );
}
