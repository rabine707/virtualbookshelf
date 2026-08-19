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
import {
  getGeneratedSpine,
  getGeneratedSpineMode,
  storedSpineCrop,
  type SpineGeneratedEventDetail,
  type SpineRenderMode,
} from "../../lib/spines/client";
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
  const [generatedSpine, setGeneratedSpine] = useState<string>();
  const [generatedMode, setGeneratedMode] = useState<SpineRenderMode>("overlay");
  const [spineCrop, setSpineCrop] = useState<string>();
  const displayedCover = preferred || cover;
  const coverUrl = displayedCover?.url;

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

  useEffect(() => {
    let cancelled = false;
    setGeneratedSpine(undefined);
    setGeneratedMode("overlay");
    setSpineCrop(undefined);
    if (!coverUrl) return () => { cancelled = true; };

    void Promise.all([getGeneratedSpine(coverUrl), getGeneratedSpineMode(coverUrl)]).then(([image, mode]) => {
      if (cancelled || !image) return;
      setGeneratedSpine(image);
      setGeneratedMode(mode);
      setSpineCrop(storedSpineCrop(image));
    });

    const onGenerated = (event: Event) => {
      const detail = (event as CustomEvent<SpineGeneratedEventDetail>).detail;
      if (!detail || detail.coverUrl !== coverUrl) return;
      setGeneratedSpine(detail.image);
      setGeneratedMode(detail.renderMode || "overlay");
      setSpineCrop(detail.position || storedSpineCrop(detail.image));
    };

    window.addEventListener("shelf-spine-generated", onGenerated);
    return () => {
      cancelled = true;
      window.removeEventListener("shelf-spine-generated", onGenerated);
    };
  }, [coverUrl]);

  const style = {
    "--mobile-spine-color": book.color,
    "--mobile-spine-width": `${34 + ((index * 7) % 10)}px`,
  } as CSSProperties;

  return (
    <button
      ref={ref}
      type="button"
      className={`${styles.bookSpine} ${coverUrl ? styles.bookSpineWithCover : ""}`}
      style={style}
      onClick={() => onSelect(book)}
      aria-label={`${book.title} by ${book.author}`}
      title={`${book.title} — ${book.author}`}
      data-book-id={book.id}
      data-spine-crop={spineCrop}
    >
      {coverUrl ? (
        <img
          className={styles.spineCover}
          src={coverUrl}
          alt=""
          data-shelf-cover="true"
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
      {generatedSpine ? (
        <img
          className={styles.generatedSpineArt}
          src={generatedSpine}
          alt=""
          data-shelf-generated-spine="true"
          decoding="async"
        />
      ) : null}
      <span className={styles.spineShade} aria-hidden="true" />
      {generatedMode !== "integrated" ? <span className={styles.spineTitle}>{shortTitle(book.title)}</span> : null}
      {generatedMode !== "integrated" ? <span className={styles.spineAuthor}>{book.author}</span> : null}
    </button>
  );
}
