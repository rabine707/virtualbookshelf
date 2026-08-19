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
import unifiedStyles from "./UnifiedSpine.module.css";

type MobileBookSpineProps = {
  book: Book;
  index: number;
  onSelect: (book: Book) => void;
};

type PrintFinish = "ink" | "debossed" | "foil";
type PrintedFace = "left" | "center" | "right";

const UNIFORM_SPINE_WIDTH = 49;

function stableNumber(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function layoutClass(id: SpineLayoutId) {
  if (id === "clothbound-literary") return designStyles.clothbound;
  if (id === "contemporary-editorial") return designStyles.editorial;
  if (id === "decorative-special") return designStyles.decorative;
  return designStyles.publishedArt;
}

function printFinishFor(book: Book, design: SpineDesign): PrintFinish {
  const roll = stableNumber(`${book.id}|${book.title}|${book.author}|finish`) % 20;
  if (design.layout.id === "decorative-special" && roll < 5) return "foil";
  if (design.layout.id === "clothbound-literary" && (roll === 6 || roll === 12)) return "debossed";
  return "ink";
}

function printedFaceFor(book: Book): PrintedFace {
  const roll = stableNumber(`${book.id}|${book.title}|face`) % 3;
  if (roll === 0) return "left";
  if (roll === 2) return "right";
  return "center";
}

function inkColors(design: SpineDesign) {
  if (design.ink === "gold") {
    return { ink: "rgba(239, 205, 142, .94)", author: "rgba(226, 200, 153, .82)" };
  }
  if (design.ink === "white") {
    return { ink: "rgba(255, 248, 236, .97)", author: "rgba(247, 236, 219, .88)" };
  }
  return { ink: "rgba(255, 241, 216, .95)", author: "rgba(241, 225, 199, .82)" };
}

function displayAuthorLastName(author: string) {
  const cleaned = author.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return author.toUpperCase();
  const last = cleaned.split(" ").filter(Boolean).at(-1) || cleaned;
  return last.replace(/^[^A-Za-z0-9À-ÖØ-öø-ÿ'’-]+|[^A-Za-z0-9À-ÖØ-öø-ÿ'’-]+$/g, "").toUpperCase();
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
    left: "5px",
    right: "5px",
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
    fontSize: `${Math.max(7.4, fit.fontSize)}px`,
    fontWeight: layout.titleWeight,
    lineHeight: layout.lineHeight,
    letterSpacing: `${layout.letterSpacingEm}em`,
    textTransform: layout.textTransform,
    fontVariantCaps: layout.id === "decorative-special" && design.variant === 1 ? "small-caps" : undefined,
  };
}

function titleLineStyle(fit: FittedSpineTitle, design: SpineDesign, lineIndex: number): CSSProperties {
  const accent = lineIndex === fit.accentLine && Boolean(design.fonts.accentFont);
  const baseScale = Math.max(.72, fit.lineScales[lineIndex] ?? 1);
  const scale = accent ? Math.min(baseScale, .86) : baseScale;

  return {
    fontFamily: accent ? design.fonts.accentFont : undefined,
    fontSize: accent ? `${Math.min(design.layout.maxTitleSize + .7, Math.max(7.4, fit.fontSize) * 1.14)}px` : undefined,
    fontWeight: accent ? 500 : undefined,
    fontStyle: accent ? "italic" : undefined,
    letterSpacing: accent ? "0" : undefined,
    textTransform: accent ? "none" : undefined,
    transform: `scaleX(${scale})`,
    transformOrigin: design.titleAlign === "left" ? "left center" : "center",
  };
}

function authorStyle(design: SpineDesign): CSSProperties {
  return {
    fontFamily: design.fonts.authorFont,
    fontSize: "5px",
    fontWeight: design.layout.id === "contemporary-editorial" ? 650 : 550,
    letterSpacing: ".055em",
  };
}

function SpineMotif({ type }: { type: NonNullable<SpineDesign["motif"]> }) {
  const src = type === "botanical"
    ? "/themes/botanical/v3/spine-ornaments/daisies.webp"
    : type === "crescent"
      ? "/themes/botanical/v3/spine-ornaments/crescent.webp"
      : "/themes/botanical/v3/spine-ornaments/starburst.webp";
  return <img className={unifiedStyles.ornament} src={src} alt="" aria-hidden="true" />;
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
  const design = pickSpineDesign(book.title, book.author, book.color, Boolean(coverUrl));
  const fittedTitle = fitSpineTitle(book.title, UNIFORM_SPINE_WIDTH, design);
  const colors = inkColors(design);
  const printFinish = printFinishFor(book, design);
  const printedFace = printedFaceFor(book);
  const displayAuthor = displayAuthorLastName(book.author);

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
    "--mobile-spine-width": `${UNIFORM_SPINE_WIDTH}px`,
    "--spine-ink": colors.ink,
    "--spine-author-ink": colors.author,
  } as CSSProperties;

  const showOverlayTypography = generatedMode !== "integrated";
  const publishedArt = design.layout.id === "published-art";

  return (
    <button
      ref={ref}
      type="button"
      className={`${styles.bookSpine} ${coverUrl ? styles.bookSpineWithCover : ""} ${unifiedStyles.book} ${layoutClass(design.layout.id)}`}
      style={style}
      onClick={() => onSelect(book)}
      aria-label={`${book.title} by ${book.author}`}
      title={`${book.title} — ${book.author}`}
      data-book-id={book.id}
      data-spine-crop={spineCrop}
      data-spine-layout={design.layout.id}
      data-spine-variant={design.variant}
      data-print-finish={printFinish}
    >
      <span className={unifiedStyles.physicalShell} aria-hidden="true" />

      <span className={`${unifiedStyles.printedDesign} ${unifiedStyles[printFinish]}`} data-face={printedFace}>
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
                  data-print-role="title-line"
                  key={`${line}-${lineIndex}`}
                  style={titleLineStyle(fittedTitle, design, lineIndex)}
                >
                  {line}
                </span>
              ))}
            </span>

            <span className={designStyles.author} data-print-role="author" style={authorStyle(design)}>
              {displayAuthor}
            </span>
          </>
        ) : null}
      </span>

      <span className={unifiedStyles.spineLighting} aria-hidden="true" />
    </button>
  );
}
