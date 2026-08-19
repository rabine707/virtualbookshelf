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
  pickSpineDesign,
  type FittedSpineTitle,
  type SpineDesign,
  type SpineLayoutId,
} from "./spineTemplates";
import styles from "./MobileShelfScene.module.css";
import designStyles from "./SpineDesign.module.css";

type MobileBookSpineProps = {
  book: Book;
  index: number;
  onSelect: (book: Book) => void;
};

function stableNumber(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function spineWidthFor(book: Book) {
  return 43 + (stableNumber(`${book.id}|${book.title}|${book.author}`) % 10);
}

function layoutClass(id: SpineLayoutId) {
  if (id === "clothbound-literary") return designStyles.clothbound;
  if (id === "contemporary-editorial") return designStyles.editorial;
  if (id === "decorative-special") return designStyles.decorative;
  return designStyles.publishedArt;
}

function inkColors(design: SpineDesign) {
  if (design.ink === "gold") {
    return {
      ink: "rgba(239, 205, 142, .94)",
      author: "rgba(226, 200, 153, .78)",
    };
  }
  if (design.ink === "white") {
    return {
      ink: "rgba(255, 248, 236, .97)",
      author: "rgba(247, 236, 219, .84)",
    };
  }
  return {
    ink: "rgba(255, 241, 216, .95)",
    author: "rgba(241, 225, 199, .76)",
  };
}

function titleAreaStyle(fit: FittedSpineTitle, design: SpineDesign): CSSProperties {
  const { layout } = design;
  const leftAligned = design.titleAlign === "left";
  let top = layout.titleTop;
  let height = layout.titleHeight;

  if (layout.id === "clothbound-literary" && design.variant === 2) top += 5;
  if (layout.id === "contemporary-editorial" && design.variant === 2) {
    top += 11;
    height -= 6;
  }
  if (layout.id === "decorative-special") top += 2;
  if (layout.id === "published-art" && design.variant === 0) height += 4;

  return {
    top: `${top}px`,
    left: `${layout.titlePadding}px`,
    right: `${layout.titlePadding}px`,
    width: "auto",
    height: `${height}px`,
    maxHeight: `${height}px`,
    display: "flex",
    flexDirection: "column",
    alignItems: leftAligned ? "flex-start" : "center",
    justifyContent: "center",
    gap: layout.id === "contemporary-editorial" ? "1.5px" : "1px",
    textAlign: leftAligned ? "left" : "center",
    fontFamily: design.fonts.titleFont,
    fontSize: `${fit.fontSize}px`,
    fontWeight: layout.titleWeight,
    lineHeight: layout.lineHeight,
    letterSpacing: `${layout.letterSpacingEm}em`,
    textTransform: layout.textTransform,
    fontVariantCaps: layout.id === "decorative-special" && design.variant === 1 ? "small-caps" : undefined,
  };
}

function titleLineStyle(
  fit: FittedSpineTitle,
  design: SpineDesign,
  lineIndex: number,
): CSSProperties {
  const accent = lineIndex === fit.accentLine && Boolean(design.fonts.accentFont);
  const baseScale = fit.lineScales[lineIndex] ?? 1;
  const scale = accent ? Math.min(baseScale, .84) : baseScale;

  return {
    fontFamily: accent ? design.fonts.accentFont : undefined,
    fontSize: accent ? `${Math.min(design.layout.maxTitleSize + .7, fit.fontSize * 1.14)}px` : undefined,
    fontWeight: accent ? 500 : undefined,
    fontStyle: accent ? "italic" : undefined,
    letterSpacing: accent ? "0" : undefined,
    textTransform: accent ? "none" : undefined,
    transform: `scaleX(${scale})`,
    transformOrigin: design.titleAlign === "left" ? "left center" : "center",
  };
}

function authorStyle(book: Book, design: SpineDesign): CSSProperties {
  const extra = Math.max(0, book.author.trim().length - 15);
  const fontSize = Math.max(4.25, design.layout.authorSize - (extra * .055));

  return {
    fontFamily: design.fonts.authorFont,
    fontSize: `${fontSize}px`,
    fontWeight: design.layout.id === "contemporary-editorial" ? 600 : 500,
    letterSpacing: design.layout.id === "contemporary-editorial" ? ".045em" : ".018em",
  };
}

function SpineMotif({ type }: { type: NonNullable<SpineDesign["motif"]> }) {
  if (type === "botanical") {
    return (
      <svg viewBox="0 0 18 18" aria-hidden="true">
        <g fill="currentColor" opacity=".94">
          <ellipse cx="9" cy="3.4" rx="1.25" ry="2.4" />
          <ellipse cx="9" cy="14.6" rx="1.25" ry="2.4" />
          <ellipse cx="3.4" cy="9" rx="2.4" ry="1.25" />
          <ellipse cx="14.6" cy="9" rx="2.4" ry="1.25" />
          <ellipse cx="5.05" cy="5.05" rx="1.15" ry="2.15" transform="rotate(-45 5.05 5.05)" />
          <ellipse cx="12.95" cy="5.05" rx="1.15" ry="2.15" transform="rotate(45 12.95 5.05)" />
          <ellipse cx="5.05" cy="12.95" rx="1.15" ry="2.15" transform="rotate(45 5.05 12.95)" />
          <ellipse cx="12.95" cy="12.95" rx="1.15" ry="2.15" transform="rotate(-45 12.95 12.95)" />
          <circle cx="9" cy="9" r="1.9" />
        </g>
      </svg>
    );
  }

  if (type === "crescent") {
    return (
      <svg viewBox="0 0 18 18" aria-hidden="true">
        <path
          d="M12.9 13.8A6.2 6.2 0 0 1 5.1 4.2a5.45 5.45 0 1 0 7.8 9.6Z"
          fill="currentColor"
        />
        <circle cx="13.3" cy="4.8" r=".75" fill="currentColor" opacity=".8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="m9 1.9 1.25 4.05L14.3 7.2l-4.05 1.25L9 12.5 7.75 8.45 3.7 7.2l4.05-1.25L9 1.9Z"
        fill="currentColor"
      />
      <circle cx="14.2" cy="12.8" r=".65" fill="currentColor" opacity=".75" />
      <circle cx="4.15" cy="13.3" r=".45" fill="currentColor" opacity=".55" />
    </svg>
  );
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
  const spineWidth = spineWidthFor(book);
  const design = pickSpineDesign(book.title, book.author, book.color, Boolean(coverUrl));
  const fittedTitle = fitSpineTitle(book.title, spineWidth, design);
  const colors = inkColors(design);

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
    "--spine-ink": colors.ink,
    "--spine-author-ink": colors.author,
  } as CSSProperties;

  const showOverlayTypography = generatedMode !== "integrated";
  const publishedArt = design.layout.id === "published-art";

  return (
    <button
      ref={ref}
      type="button"
      className={`${styles.bookSpine} ${coverUrl ? styles.bookSpineWithCover : ""} ${designStyles.publisherSpine} ${layoutClass(design.layout.id)}`}
      style={style}
      onClick={() => onSelect(book)}
      aria-label={`${book.title} by ${book.author}`}
      title={`${book.title} — ${book.author}`}
      data-book-id={book.id}
      data-spine-crop={spineCrop}
      data-spine-layout={design.layout.id}
      data-spine-variant={design.variant}
    >
      {coverUrl ? (
        <img
          className={`${styles.spineCover} ${publishedArt ? designStyles.artCover : designStyles.quietCover}`}
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

      <span className={designStyles.material} aria-hidden="true" />
      {publishedArt && coverUrl ? <span className={designStyles.artWash} aria-hidden="true" /> : null}

      {generatedSpine ? (
        <img
          className={`${styles.spineCover} ${designStyles.generatedArt}`}
          src={generatedSpine}
          alt=""
          data-shelf-generated-spine="true"
          decoding="async"
        />
      ) : null}

      {showOverlayTypography ? (
        <>
          {design.showFrame ? <span className={designStyles.frame} aria-hidden="true" /> : null}
          {design.showDivider ? <span className={designStyles.divider} aria-hidden="true" /> : null}
          {design.motif ? (
            <span className={designStyles.motifBand} aria-hidden="true">
              <i />
              <SpineMotif type={design.motif} />
              <i />
            </span>
          ) : null}

          <span
            className={`${designStyles.title} ${design.titleAlign === "left" ? designStyles.titleLeft : ""}`}
            style={titleAreaStyle(fittedTitle, design)}
          >
            {fittedTitle.lines.map((line, lineIndex) => (
              <span
                className={designStyles.titleLine}
                key={`${line}-${lineIndex}`}
                style={titleLineStyle(fittedTitle, design, lineIndex)}
              >
                {line}
              </span>
            ))}
          </span>

          <span className={designStyles.author} style={authorStyle(book, design)}>{book.author}</span>
        </>
      ) : null}
    </button>
  );
}
