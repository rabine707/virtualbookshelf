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
import {
  fitSpineTitle,
  pickSpineTemplate,
  type FittedSpineTitle,
  type SpineTemplateDefinition,
} from "./spineTemplates";
import styles from "./MobileShelfScene.module.css";

type MobileBookSpineProps = {
  book: Book;
  index: number;
  onSelect: (book: Book) => void;
};

function titleAreaStyle(fit: FittedSpineTitle, template: SpineTemplateDefinition): CSSProperties {
  return {
    top: "22px",
    left: "5px",
    right: "5px",
    width: "auto",
    height: "88px",
    maxHeight: "88px",
    transform: "none",
    writingMode: "horizontal-tb",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: template.id === "modern-minimal" ? "2px" : "1px",
    overflow: "visible",
    textAlign: "center",
    whiteSpace: "normal",
    fontFamily: template.titleFont,
    fontSize: `${fit.fontSize}px`,
    fontWeight: template.titleWeight,
    lineHeight: template.id === "romantic-accent" ? 1.02 : 1.08,
    letterSpacing: template.letterSpacing,
    textTransform: template.textTransform,
    fontVariantCaps: template.id === "dark-luxe" ? "small-caps" : undefined,
  };
}

function titleLineStyle(
  fit: FittedSpineTitle,
  template: SpineTemplateDefinition,
  lineIndex: number,
): CSSProperties {
  const accent = lineIndex === fit.accentLine && Boolean(template.accentFont);
  return {
    display: "block",
    maxWidth: "100%",
    whiteSpace: "nowrap",
    fontFamily: accent ? template.accentFont : undefined,
    fontSize: accent ? `${Math.min(template.maxTitleSize + .4, fit.fontSize * 1.08)}px` : undefined,
    fontWeight: accent ? 500 : undefined,
    fontStyle: accent ? "italic" : undefined,
    letterSpacing: accent ? "0" : undefined,
    textTransform: accent ? "none" : undefined,
    transform: accent ? "scaleX(.9)" : undefined,
    transformOrigin: "center",
  };
}

function ornamentStyle(template: SpineTemplateDefinition): CSSProperties {
  const color = template.id === "dark-luxe"
    ? "rgba(235, 196, 126, .82)"
    : template.id === "romantic-accent"
      ? "rgba(255, 226, 215, .8)"
      : "rgba(247, 230, 198, .7)";

  return {
    position: "absolute",
    zIndex: 4,
    top: template.id === "modern-minimal" ? "12px" : "10px",
    left: "50%",
    transform: "translateX(-50%)",
    color,
    textShadow: "0 1px 2px rgba(0, 0, 0, .7)",
    fontFamily: template.id === "modern-minimal" ? template.authorFont : template.titleFont,
    fontSize: template.id === "romantic-accent" ? "9px" : template.id === "ornamental-clothbound" ? "7px" : "6px",
    lineHeight: 1,
    letterSpacing: 0,
    pointerEvents: "none",
  };
}

function authorStyle(template: SpineTemplateDefinition): CSSProperties {
  return {
    fontFamily: template.authorFont,
    color: template.id === "dark-luxe" ? "rgba(239, 211, 159, .76)" : undefined,
    letterSpacing: template.id === "modern-minimal" ? ".055em" : ".02em",
  };
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
  const spineWidth = 42 + ((index * 5) % 12);
  const template = pickSpineTemplate(book.title, book.author, book.color);
  const fittedTitle = fitSpineTitle(book.title, spineWidth, template);

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
    "--mobile-spine-width": `${spineWidth}px`,
  } as CSSProperties;

  const showOverlayTypography = generatedMode !== "integrated";

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
      data-spine-template={template.id}
    >
      {coverUrl ? (
        <img
          className={`${styles.spineCover} ${styles.fallbackCover}`}
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
          className={`${styles.spineCover} ${styles.generatedSpineArt}`}
          src={generatedSpine}
          alt=""
          data-shelf-generated-spine="true"
          decoding="async"
        />
      ) : null}
      <span className={styles.spineShade} aria-hidden="true" />
      {showOverlayTypography ? (
        <>
          <span aria-hidden="true" style={ornamentStyle(template)}>{template.ornament}</span>
          <span className={styles.spineTitle} style={titleAreaStyle(fittedTitle, template)}>
            {fittedTitle.lines.map((line, lineIndex) => (
              <span key={`${line}-${lineIndex}`} style={titleLineStyle(fittedTitle, template, lineIndex)}>{line}</span>
            ))}
          </span>
          <span className={styles.spineAuthor} style={authorStyle(template)}>{book.author}</span>
        </>
      ) : null}
    </button>
  );
}
