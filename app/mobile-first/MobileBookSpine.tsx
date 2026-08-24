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
import { coverPaletteMemory, loadCoverSpineColor } from "../../lib/books/client-cover-palette";
import { balanceDefaultSpineColor } from "../../lib/books/cover-palette";
import {
  fitSpineTitle,
  pickSpineDesign,
  type FittedSpineTitle,
  type SpineDesign,
  type SpineLayoutId,
} from "./spineTemplates";
import { SpineOrnament } from "./SpineOrnament";
import { spineArtworkImage } from "./spineArtworkAssets";
import { spineTokensFor, stableSpineNumber } from "./spineTokens";
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

const SAFE_TITLE_FIT_WIDTH = 54;

function layoutClass(id: SpineLayoutId) {
  if (id === "clothbound-literary") return designStyles.clothbound;
  if (id === "contemporary-editorial") return designStyles.editorial;
  if (id === "decorative-special") return designStyles.decorative;
  return designStyles.publishedArt;
}

function printFinishFor(book: Book, design: SpineDesign): PrintFinish {
  const roll = stableSpineNumber(`${book.id}|${book.title}|${book.author}|finish`) % 20;
  if (design.layout.id === "decorative-special" && roll < 5) return "foil";
  if (design.layout.id === "clothbound-literary" && (roll === 6 || roll === 12)) return "debossed";
  return "ink";
}

function printedFaceFor(book: Book): PrintedFace {
  const roll = stableSpineNumber(`${book.id}|${book.title}|face`) % 3;
  if (roll === 0) return "left";
  if (roll === 2) return "right";
  return "center";
}

function colorChannels(color: string): [number, number, number] | null {
  const hex = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (hex) {
    const normalized = hex.length === 3
      ? hex.split("").map((channel) => `${channel}${channel}`).join("")
      : hex;
    return [
      Number.parseInt(normalized.slice(0, 2), 16),
      Number.parseInt(normalized.slice(2, 4), 16),
      Number.parseInt(normalized.slice(4, 6), 16),
    ];
  }

  const rgb = color.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (!rgb) return null;
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
}

function relativeLuminance(color: string) {
  const channels = colorChannels(color);
  if (!channels) return null;
  const linear = channels.map((channel) => {
    const value = Math.max(0, Math.min(255, channel)) / 255;
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  });
  return (.2126 * linear[0]) + (.7152 * linear[1]) + (.0722 * linear[2]);
}

function contrastRatio(first: string, second: string) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  if (firstLuminance === null || secondLuminance === null) return null;
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + .05) / (darker + .05);
}

function isWarmLeatherColor(color: string) {
  const channels = colorChannels(color);
  if (!channels) return false;
  const [red, green, blue] = channels;
  return red > green + 10
    && green > blue * 1.12
    && red > blue * 1.35;
}

function inkColors(design: SpineDesign, spineColor: string) {
  const lightInk = design.ink === "gold"
    ? "rgba(255, 229, 164, 1)"
    : design.ink === "white"
      ? "rgba(255, 252, 244, 1)"
      : "rgba(255, 246, 224, 1)";
  const darkInk = "rgba(48, 28, 18, .99)";
  const lightContrast = contrastRatio(lightInk, spineColor);
  const darkContrast = contrastRatio(darkInk, spineColor);
  const warmLeather = isWarmLeatherColor(spineColor);
  const useDarkInk = lightContrast !== null
    && darkContrast !== null
    && darkContrast > lightContrast
    && !warmLeather;

  if (useDarkInk) {
    return {
      tone: "dark",
      ink: darkInk,
      author: "rgba(45, 26, 17, .98)",
      stroke: "rgba(255, 239, 207, .24)",
      highlight: "rgba(255, 244, 221, .24)",
      shadow: "rgba(0, 0, 0, .42)",
    };
  }

  return {
    tone: "light",
    ink: lightInk,
    author: design.ink === "gold"
      ? "rgba(255, 232, 181, .98)"
      : "rgba(255, 244, 224, .98)",
    stroke: "rgba(48, 25, 12, .58)",
    highlight: "rgba(255, 247, 224, .2)",
    shadow: "rgba(35, 18, 8, .68)",
  };
}

function displayAuthorLastName(author: string) {
  const cleaned = author.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return author.toUpperCase();
  const last = cleaned.split(" ").filter(Boolean).at(-1) || cleaned;
  return last.replace(/^[^A-Za-z0-9À-ÖØ-öø-ÿ'’-]+|[^A-Za-z0-9À-ÖØ-öø-ÿ'’-]+$/g, "").toUpperCase();
}

function displayedTitleFontSize(fit: FittedSpineTitle, design: SpineDesign) {
  const denseArtworkTitle = Boolean(design.motif)
    && fit.detailLevel === "reduced"
    && fit.lines.length >= 4;
  const ornamentedThreeLineTitle = Boolean(design.motif)
    && fit.detailLevel === "full"
    && fit.lines.length === 3;
  if (denseArtworkTitle) return Math.max(8.6, Math.min(11.4, fit.fontSize * .86));
  if (ornamentedThreeLineTitle) return Math.max(8.6, Math.min(13.2, fit.fontSize * .92));
  return fit.fontSize;
}

function titleAreaStyle(
  fit: FittedSpineTitle,
  design: SpineDesign,
  illustratedArtwork: boolean,
): CSSProperties {
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
  if (fit.detailLevel === "reduced") height += 7;
  if (fit.detailLevel === "title-only") {
    top = Math.max(10, top - 5);
    height += 16;
  }
  if (design.motif && fit.detailLevel === "full") {
    top = Math.max(fit.lines.length <= 2 ? 54 : 49, top);
    height = Math.min(fit.lines.length <= 2 ? 43 : 50, height);
  } else if (design.motif && fit.detailLevel === "reduced") {
    top = Math.max(52, top);
    height = Math.min(52, height);
  }
  if (illustratedArtwork && fit.detailLevel === "full") {
    top = Math.max(fit.lines.length <= 2 ? 66 : 61, top);
    height = Math.min(fit.lines.length <= 2 ? 34 : 42, height);
  } else if (illustratedArtwork && fit.detailLevel === "reduced") {
    top = Math.max(60, top);
    height = Math.min(46, height);
  }

  // The illustrated layout narrows the title zone, but it must never become
  // shorter than the fitted line stack. Otherwise glyph ascenders on the first
  // line and descenders on the last line are clipped by the title container.
  const displayFontSize = displayedTitleFontSize(fit, design);
  const lineGaps = Math.max(0, fit.lines.length - 1)
    * (layout.id === "contemporary-editorial" ? 1.5 : 1);
  const minimumTextHeight = Math.ceil(
    (displayFontSize * layout.lineHeight * fit.lines.length) + lineGaps + 3,
  );
  height = Math.max(height, minimumTextHeight);

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
    fontSize: `${displayFontSize}px`,
    fontWeight: layout.titleWeight,
    lineHeight: layout.lineHeight,
    letterSpacing: `${layout.letterSpacingEm}em`,
    textTransform: layout.textTransform,
    fontVariantCaps: layout.id === "decorative-special" && design.variant === 1 ? "small-caps" : undefined,
  };
}

function titleLineStyle(fit: FittedSpineTitle, design: SpineDesign, lineIndex: number): CSSProperties {
  const accent = lineIndex === fit.accentLine && Boolean(design.fonts.accentFont);
  const longSingleWord = fit.lines.length === 1 && !fit.title.includes(" ") && fit.title.length >= 10;
  const unbreakableLongLine = !fit.lines[lineIndex].includes(" ") && fit.lines[lineIndex].length >= 12;
  const displayFontSize = displayedTitleFontSize(fit, design);
  const fittedLineScale = fit.lineScales[lineIndex] ?? 1;
  const horizontalFit = unbreakableLongLine ? .86 : fittedLineScale < .84 ? .9 : .98;
  const baseScale = Math.max(.54, Math.min(1, fittedLineScale * horizontalFit));
  const scale = accent ? Math.min(baseScale, .86) : baseScale;

  return {
    fontFamily: accent
      ? design.fonts.accentFont
      : longSingleWord
        ? '"Bodoni MT Condensed", "Arial Narrow", "Times New Roman", serif'
        : undefined,
    fontSize: accent
      ? `${Math.min(design.layout.maxTitleSize + .7, displayFontSize * 1.12)}px`
      : longSingleWord
        ? `${Math.max(10.2, displayFontSize)}px`
        : undefined,
    fontWeight: accent ? 500 : undefined,
    fontStyle: accent ? "italic" : undefined,
    fontStretch: longSingleWord ? "condensed" : undefined,
    letterSpacing: accent ? "0" : undefined,
    textTransform: accent ? "none" : undefined,
    transform: `scaleX(${scale})`,
    transformOrigin: design.titleAlign === "left" ? "left center" : "center",
  };
}

function authorStyle(
  design: SpineDesign,
  author: string,
  spineWidth: number,
  sidewaysTitle: boolean,
): CSSProperties {
  const maxFontSize = sidewaysTitle ? 7 : 9;
  const availableWidth = Math.max(24, spineWidth - 8);
  const trackingEm = author.length >= 10
    ? .015
    : author.length >= 8
      ? .045
      : .075;
  const fittedFontSize = Math.max(
    5.8,
    Math.min(maxFontSize, availableWidth / Math.max(1, author.length * (.6 + trackingEm))),
  );

  return {
    fontFamily: design.fonts.authorFont,
    fontWeight: design.layout.id === "contemporary-editorial" ? 650 : 600,
    "--spine-author-size": `${fittedFontSize.toFixed(2)}px`,
    "--spine-author-tracking": `${trackingEm}em`,
  } as CSSProperties;
}

function sidewaysTitleLayout(
  fit: FittedSpineTitle,
  design: SpineDesign,
  spineHeight: number,
  spineWidth: number,
  forced = false,
) {
  const topInset = forced ? 5 : 8;
  const availableLength = Math.max(98, spineHeight - (forced ? 31 : 44));
  const verticalPadding = forced ? 5 : 12;
  const printableLength = Math.max(74, availableLength - (verticalPadding * 2));
  const laneHeight = Math.max(30, Math.min(44, spineWidth - (forced ? 6 : 9)));
  const titleLength = Math.max(1, fit.title.length);
  const letterSpacingEm = titleLength >= 20
    ? -.04
    : titleLength >= 17
      ? -.02
      : Math.min(.018, design.layout.letterSpacingEm);
  const fontSize = Math.min(
    laneHeight * .78,
    printableLength / (titleLength * (
      forced
        ? Math.max(.58, .64 + letterSpacingEm)
        : Math.max(.67, .75 + letterSpacingEm)
    )),
  );
  if (fontSize < (forced ? 6.6 : 11.5)) return null;
  const titleFont = 'Rockwell, Georgia, "Times New Roman", serif';

  const containerStyle: CSSProperties = {
    top: `${topInset}px`,
    left: `${(spineWidth - laneHeight) / 2}px`,
    right: "auto",
    width: `${laneHeight}px`,
    height: `${availableLength}px`,
    maxHeight: "none",
    boxSizing: "border-box",
    paddingInline: `${verticalPadding}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
    overflow: "visible",
    textAlign: "center",
    textTransform: design.layout.textTransform,
  };

  const titleStyle: CSSProperties = {
    flex: "0 0 auto",
    width: "auto",
    height: "max-content",
    fontFamily: titleFont,
    fontSize: `${fontSize}px`,
    fontWeight: 700,
    lineHeight: 1.08,
    letterSpacing: `${letterSpacingEm}em`,
    overflow: "visible",
    whiteSpace: "nowrap",
    writingMode: "vertical-rl",
    textOrientation: "mixed",
  };

  return { containerStyle, titleStyle };
}

export function MobileBookSpine({ book, index, onSelect }: MobileBookSpineProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const key = coverKey(book);
  const eager = index < 12;
  const preferred = book.preferredCover && !rejectedUrls(book).has(book.preferredCover.url)
    ? book.preferredCover
    : undefined;
  const [cover, setCover] = useState<CoverResult | null>(() => preferred || coverMemory.get(key) || null);
  const [shouldLoad, setShouldLoad] = useState(() => eager || coverMemory.has(key));
  const [generatedSpine, setGeneratedSpine] = useState<string>();
  const [generatedSpineFailed, setGeneratedSpineFailed] = useState(false);
  const [generatedMode, setGeneratedMode] = useState<SpineRenderMode>("overlay");
  const [spineCrop, setSpineCrop] = useState<string>();
  const [titleOrientation, setTitleOrientation] = useState<"auto" | "upright" | "sideways">("auto");
  const displayedCover = preferred || cover;
  const coverUrl = displayedCover?.url;
  const [coverSpineColor, setCoverSpineColor] = useState<string | undefined>(() => (
    coverUrl ? coverPaletteMemory.get(coverUrl) || undefined : undefined
  ));
  const spineColor = balanceDefaultSpineColor(
    coverSpineColor || book.color,
    `${book.id}|${book.title}|${book.author}|cloth-color`,
  );
  const tokens = spineTokensFor(book.id, book.title, book.author);
  // Automatic defaults always use the Shelf of Fame cloth system. A cover may
  // inform the cloth color, but full-color art belongs to a selected manual spine.
  const design = pickSpineDesign(book.title, book.author, spineColor, false);
  const fittedTitle = fitSpineTitle(book.title, Math.min(tokens.width, SAFE_TITLE_FIT_WIDTH), design);
  const colors = inkColors(design, spineColor);
  const printFinish = printFinishFor(book, design);
  const printedFace = printedFaceFor(book);
  const displayAuthor = displayAuthorLastName(book.author);
  const authorFit = displayAuthor.length >= 10
    ? "tight"
    : displayAuthor.length >= 8
      ? "condensed"
      : "normal";

  useEffect(() => {
    const applyPreference = (event?: Event) => {
      const eventPreference = event ? (event as CustomEvent<string>).detail : undefined;
      const stored = eventPreference || window.localStorage.getItem("shelf-of-fame-title-orientation-v1");
      const legacy = window.localStorage.getItem("shelf-of-fame-sideways-titles-v1");
      setTitleOrientation(stored === "upright" || stored === "sideways" || stored === "auto"
        ? stored
        : legacy === "off" ? "upright" : legacy === "on" ? "sideways" : "auto");
    };
    applyPreference();
    window.addEventListener("shelf-title-orientation-changed", applyPreference);
    return () => window.removeEventListener("shelf-title-orientation-changed", applyPreference);
  }, []);

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
    setCoverSpineColor(undefined);
    if (!coverUrl) return () => { cancelled = true; };

    if (coverPaletteMemory.has(coverUrl)) {
      setCoverSpineColor(coverPaletteMemory.get(coverUrl) || undefined);
      return () => { cancelled = true; };
    }

    void loadCoverSpineColor(coverUrl).then((color) => {
      if (!cancelled) setCoverSpineColor(color || undefined);
    });

    return () => { cancelled = true; };
  }, [coverUrl]);

  useEffect(() => {
    let cancelled = false;
    setGeneratedSpine(undefined);
    setGeneratedSpineFailed(false);
    setGeneratedMode("overlay");
    setSpineCrop(undefined);
    if (!coverUrl) return () => { cancelled = true; };

    void Promise.all([getGeneratedSpine(coverUrl), getGeneratedSpineMode(coverUrl)]).then(([image, mode]) => {
      if (cancelled || !image) return;
      setGeneratedSpine(image);
      setGeneratedSpineFailed(false);
      setGeneratedMode(mode);
      setSpineCrop(storedSpineCrop(image));
    });

    const onGenerated = (event: Event) => {
      const detail = (event as CustomEvent<SpineGeneratedEventDetail>).detail;
      if (!detail || detail.coverUrl !== coverUrl) return;
      setGeneratedSpine(detail.image);
      setGeneratedSpineFailed(false);
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
    "--mobile-spine-color": spineColor,
    "--mobile-spine-width": `${tokens.width}px`,
    "--mobile-spine-height": `${tokens.height}px`,
    "--spine-ink": colors.ink,
    "--spine-author-ink": colors.author,
    "--spine-title-stroke": colors.stroke,
    "--spine-title-highlight": colors.highlight,
    "--spine-title-shadow": colors.shadow,
    "--spine-foil-dark": tokens.foil.dark,
    "--spine-foil-mid": tokens.foil.mid,
    "--spine-foil-light": tokens.foil.light,
    "--spine-wear-opacity": tokens.wearOpacity,
  } as CSSProperties;

  const showOverlayTypography = generatedMode !== "integrated" || generatedSpineFailed;
  const customSpineArt = Boolean(generatedSpine && !generatedSpineFailed);
  const publishedArt = design.layout.id === "published-art";
  const showGhostArtwork = !publishedArt && !generatedSpine && Boolean(design.artwork);
  const showDecoration = fittedTitle.detailLevel !== "title-only" && !customSpineArt;
  const showStructuralDetail = fittedTitle.detailLevel !== "title-only" && !customSpineArt;
  const artworkImage = spineArtworkImage(design.artwork);
  const ghostComposition = stableSpineNumber(`${book.id}|${book.title}|${book.author}|ghost-composition`) % 8;
  const automaticSideways = stableSpineNumber(`${book.id}|${book.title}|${book.author}|title-orientation`) % 2 === 0;
  const forceSideways = titleOrientation === "sideways";
  const sidewaysEligible = titleOrientation !== "upright"
    && (forceSideways || automaticSideways)
    && (forceSideways || fittedTitle.detailLevel !== "title-only")
    && fittedTitle.title.length >= (forceSideways ? 4 : 8)
    && fittedTitle.title.length <= (forceSideways ? 44 : 22);
  const sidewaysLayout = sidewaysEligible
    ? sidewaysTitleLayout(
      fittedTitle,
      design,
      tokens.height,
      tokens.width,
      forceSideways,
    )
    : null;
  const sidewaysTitle = Boolean(sidewaysLayout);
  const showSpineArtwork = Boolean(design.motif) && showDecoration && !sidewaysTitle;

  return (
    <button
      ref={ref}
      type="button"
      className={`${styles.bookSpine} ${coverUrl ? styles.bookSpineWithCover : ""} ${unifiedStyles.book} ${designStyles.publisherSpine} ${layoutClass(design.layout.id)}`}
      style={style}
      onClick={() => onSelect(book)}
      aria-label={`${book.title} by ${book.author}`}
      title={`${book.title} — ${book.author}`}
      data-book-id={book.id}
      data-spine-crop={spineCrop}
      data-spine-layout={design.layout.id}
      data-spine-variant={design.variant}
      data-print-finish={printFinish}
      data-ink-tone={colors.tone}
      data-shell={tokens.shell}
      data-material={tokens.material}
      data-detail-level={fittedTitle.detailLevel}
      data-title-lines={fittedTitle.lines.length}
      data-top-rule={customSpineArt ? false : tokens.topRule}
      data-bottom-rule={customSpineArt ? false : tokens.bottomRule}
      data-color-source={coverSpineColor ? "cover" : "fallback"}
      data-ornament-motif={design.motif || undefined}
      data-spine-artwork={design.artwork || undefined}
      data-artwork-render={artworkImage ? "illustrated" : "vector"}
      data-title-orientation={sidewaysTitle ? "sideways" : "upright"}
    >
      <span className={unifiedStyles.physicalShell} aria-hidden="true" />
      <span className={unifiedStyles.bindingDepth} aria-hidden="true" />

      <span className={`${unifiedStyles.printedDesign} ${unifiedStyles[printFinish]}`} data-face={printedFace}>
        {showGhostArtwork ? (
          <span
            className={designStyles.ghostArtwork}
            aria-hidden="true"
            data-shelf-ghost-artwork="true"
            data-ghost-composition={ghostComposition}
          >
            {artworkImage ? (
              <img src={artworkImage} alt="" decoding="async" />
            ) : (
              <span className={designStyles.ghostEngraving}>
                <SpineOrnament artwork={design.artwork!} className={designStyles.ghostArtworkVector} variant="primary" />
                <SpineOrnament artwork={design.artwork!} className={`${designStyles.ghostArtworkDetail} ${designStyles.ghostArtworkDetailTop}`} variant="secondary" />
                <SpineOrnament artwork={design.artwork!} className={`${designStyles.ghostArtworkDetail} ${designStyles.ghostArtworkDetailBottom}`} variant="secondary" />
              </span>
            )}
          </span>
        ) : null}

        {publishedArt && coverUrl ? (
          <img
            className={`${styles.spineCover} ${designStyles.artCover}`}
            src={coverUrl}
            alt=""
            aria-hidden="true"
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

        {generatedSpine && !generatedSpineFailed ? (
          <img
            className={`${styles.spineCover} ${designStyles.generatedArt}`}
            src={generatedSpine}
            alt=""
            data-shelf-generated-spine="true"
            decoding="async"
            onError={() => setGeneratedSpineFailed(true)}
          />
        ) : null}

        {showOverlayTypography ? (
          <>
            {design.showFrame && showStructuralDetail && !sidewaysTitle ? <span className={designStyles.frame} aria-hidden="true" /> : null}
            {design.showDivider && showStructuralDetail && !sidewaysTitle ? <span className={designStyles.divider} aria-hidden="true" /> : null}
            {design.artwork && showSpineArtwork && publishedArt ? (
              <span
                className={`${designStyles.ornamentPlate} ${designStyles.ornamentTop}`}
                data-ornament-placement="primary"
                aria-hidden="true"
              >
                {artworkImage ? (
                  <img
                    className={designStyles.illustratedOrnament}
                    src={artworkImage}
                    alt=""
                    decoding="async"
                  />
                ) : (
                  <SpineOrnament
                    artwork={design.artwork}
                    className={designStyles.ornamentArt}
                    variant="primary"
                  />
                )}
              </span>
            ) : null}
            {design.artwork && showSpineArtwork && publishedArt && !artworkImage && !sidewaysTitle ? (
              <span
                className={`${designStyles.ornamentPlate} ${designStyles.ornamentBottom}`}
                data-ornament-placement="secondary"
                aria-hidden="true"
              >
                <SpineOrnament
                  artwork={design.artwork}
                  className={designStyles.ornamentArt}
                  variant="secondary"
                />
              </span>
            ) : null}

            {sidewaysLayout ? (
              <span
                className={`${designStyles.title} ${designStyles.titleSideways}`}
                style={sidewaysLayout.containerStyle}
              >
                <span
                  className={`${designStyles.titleLine} ${designStyles.sidewaysMainTitle}`}
                  data-print-role="title-line"
                  style={sidewaysLayout.titleStyle}
                >
                  {fittedTitle.title}
                </span>
              </span>
            ) : (
              <span
                className={`${designStyles.title} ${design.titleAlign === "left" ? designStyles.titleLeft : ""}`}
                style={titleAreaStyle(fittedTitle, design, Boolean(artworkImage))}
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
            )}

            <span
              className={designStyles.author}
              data-author-fit={authorFit}
              data-print-role="author"
              style={authorStyle(design, displayAuthor, tokens.width, sidewaysTitle)}
            >
              {displayAuthor}
            </span>
          </>
        ) : null}
      </span>

      <span className={unifiedStyles.edgeWear} aria-hidden="true" />
      <span className={unifiedStyles.spineLighting} aria-hidden="true" />
    </button>
  );
}
