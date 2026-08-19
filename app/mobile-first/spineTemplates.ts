export type SpineLayoutId =
  | "clothbound-literary"
  | "contemporary-editorial"
  | "decorative-special"
  | "published-art";

export type SpineFontSet = {
  titleFont: string;
  authorFont: string;
  accentFont?: string;
};

export type SpineLayoutDefinition = {
  id: SpineLayoutId;
  fontSets: SpineFontSet[];
  titleWeight: number;
  textTransform: "uppercase" | "none";
  maxTitleSize: number;
  minTitleSize: number;
  maxLines: number;
  lineHeight: number;
  letterSpacingEm: number;
  titleTop: number;
  titleHeight: number;
  titlePadding: number;
  authorSize: number;
};

export type SpineDesign = {
  layout: SpineLayoutDefinition;
  fonts: SpineFontSet;
  variant: 0 | 1 | 2;
  motif: string | null;
  showFrame: boolean;
  showDivider: boolean;
  accentEligible: boolean;
  titleAlign: "center" | "left";
  ink: "cream" | "gold" | "white";
};

export type FittedSpineTitle = {
  title: string;
  lines: string[];
  fontSize: number;
  lineScales: number[];
  accentLine: number;
};

const serifClassic = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const serifBook = 'Baskerville, "Iowan Old Style", Georgia, "Times New Roman", serif';
const serifDisplay = 'Didot, "Bodoni 72", Baskerville, Georgia, serif';
const sansClean = '"Avenir Next", Avenir, "Helvetica Neue", Arial, sans-serif';
const sansCondensed = '"Avenir Next Condensed", "Arial Narrow", "Helvetica Neue", Arial, sans-serif';
const scriptSoft = '"Snell Roundhand", "Brush Script MT", cursive';

export const SPINE_LAYOUTS: Record<SpineLayoutId, SpineLayoutDefinition> = {
  "clothbound-literary": {
    id: "clothbound-literary",
    fontSets: [
      { titleFont: serifClassic, authorFont: sansClean },
      { titleFont: serifBook, authorFont: serifClassic },
      { titleFont: serifDisplay, authorFont: sansClean },
    ],
    titleWeight: 600,
    textTransform: "uppercase",
    maxTitleSize: 10.7,
    minTitleSize: 5.35,
    maxLines: 5,
    lineHeight: 1.07,
    letterSpacingEm: .012,
    titleTop: 24,
    titleHeight: 76,
    titlePadding: 7,
    authorSize: 5.2,
  },
  "contemporary-editorial": {
    id: "contemporary-editorial",
    fontSets: [
      { titleFont: sansCondensed, authorFont: sansClean },
      { titleFont: serifDisplay, authorFont: sansClean },
      { titleFont: serifBook, authorFont: sansClean },
    ],
    titleWeight: 650,
    textTransform: "none",
    maxTitleSize: 11.4,
    minTitleSize: 5.4,
    maxLines: 4,
    lineHeight: 1.03,
    letterSpacingEm: .008,
    titleTop: 18,
    titleHeight: 76,
    titlePadding: 7,
    authorSize: 5.1,
  },
  "decorative-special": {
    id: "decorative-special",
    fontSets: [
      { titleFont: serifBook, authorFont: serifClassic },
      { titleFont: serifDisplay, authorFont: serifClassic },
      { titleFont: serifClassic, authorFont: sansClean },
    ],
    titleWeight: 600,
    textTransform: "uppercase",
    maxTitleSize: 10.4,
    minTitleSize: 5.25,
    maxLines: 5,
    lineHeight: 1.06,
    letterSpacingEm: .016,
    titleTop: 22,
    titleHeight: 70,
    titlePadding: 8,
    authorSize: 5,
  },
  "published-art": {
    id: "published-art",
    fontSets: [
      { titleFont: sansCondensed, authorFont: sansClean },
      { titleFont: serifDisplay, authorFont: sansClean, accentFont: scriptSoft },
      { titleFont: serifBook, authorFont: sansClean },
    ],
    titleWeight: 650,
    textTransform: "none",
    maxTitleSize: 11.7,
    minTitleSize: 5.5,
    maxLines: 4,
    lineHeight: 1.02,
    letterSpacingEm: .004,
    titleTop: 13,
    titleHeight: 66,
    titlePadding: 7,
    authorSize: 5.35,
  },
};

const DARK_WORDS = [
  "dark", "villain", "venom", "blood", "broken", "haunting", "sin", "devil", "king",
  "monster", "twisted", "cruel", "vicious", "butcher", "ritual", "wicked", "deadly",
  "obsession", "stalker", "sinner", "revenge",
];

const FANTASY_WORDS = [
  "crown", "throne", "kingdom", "court", "magic", "shadow", "flame", "fate", "stars",
  "moon", "dragon", "witch", "curse", "serpent", "wings", "fae", "spell", "coven",
  "gods", "warlock", "heir", "queen", "prince",
];

const CONTEMPORARY_WORDS = [
  "rivals", "pen pal", "dirty", "reckless", "play", "roommate", "boss", "crush", "daddy",
  "billionaire", "hockey", "football", "neighbor", "summer", "beach", "holiday",
];

const ART_FRIENDLY_WORDS = [
  "girl", "guide", "murder", "meet", "cute", "love", "weeds", "opposite", "always", "flirt",
  "summer", "beach", "thing", "tell", "beautiful", "sweet", "heart", "darling", "kiss",
];

const ACCENT_WORDS = [
  "love", "kiss", "heart", "darling", "sweet", "beautiful", "dream", "forever", "meet", "cute",
];

function normalizedTitle(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9&'\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stableBucket(value: string) {
  return stableHash(value) % 100;
}

function colorMood(color: string): "dark" | "jewel" | "soft" | "neutral" | null {
  const match = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return null;

  const value = Number.parseInt(match[1], 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / Math.max(.001, 1 - Math.abs(2 * lightness - 1));

  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * (((b - r) / delta) + 2);
    else hue = 60 * (((r - g) / delta) + 4);
  }
  if (hue < 0) hue += 360;

  if (lightness < .27) return "dark";
  if (saturation < .14) return "neutral";
  if (lightness > .48 && ((hue >= 300 && hue <= 360) || hue < 35)) return "soft";
  if (lightness < .52 && hue >= 70 && hue <= 300) return "jewel";
  return null;
}

function variantFor(title: string, author: string): 0 | 1 | 2 {
  return (stableHash(`${title}|${author}|variant`) % 3) as 0 | 1 | 2;
}

export function pickSpineDesign(
  title: string,
  author: string,
  color: string,
  hasCover: boolean,
): SpineDesign {
  const text = normalizedTitle(title);
  const mood = colorMood(color);
  const bucket = stableBucket(`${title}|${author}|layout`);
  const variant = variantFor(title, author);

  let layout: SpineLayoutDefinition;

  if (includesAny(text, DARK_WORDS) || includesAny(text, FANTASY_WORDS)) {
    layout = bucket < 78 ? SPINE_LAYOUTS["decorative-special"] : SPINE_LAYOUTS["clothbound-literary"];
  } else if (hasCover && includesAny(text, ART_FRIENDLY_WORDS)) {
    layout = bucket < 68 ? SPINE_LAYOUTS["published-art"] : SPINE_LAYOUTS["contemporary-editorial"];
  } else if (includesAny(text, CONTEMPORARY_WORDS)) {
    layout = bucket < 68 ? SPINE_LAYOUTS["contemporary-editorial"] : SPINE_LAYOUTS["published-art"];
    if (!hasCover && layout.id === "published-art") layout = SPINE_LAYOUTS["contemporary-editorial"];
  } else if (mood === "dark" || mood === "jewel") {
    layout = bucket < 28 ? SPINE_LAYOUTS["decorative-special"] : SPINE_LAYOUTS["clothbound-literary"];
  } else if (hasCover && bucket >= 86) {
    layout = SPINE_LAYOUTS["published-art"];
  } else if (bucket < 44) {
    layout = SPINE_LAYOUTS["clothbound-literary"];
  } else if (bucket < 74) {
    layout = SPINE_LAYOUTS["contemporary-editorial"];
  } else if (bucket < 88) {
    layout = SPINE_LAYOUTS["decorative-special"];
  } else {
    layout = SPINE_LAYOUTS["clothbound-literary"];
  }

  const fonts = layout.fontSets[variant % layout.fontSets.length];
  const decorativeMotifs = ["✦", "❦", "✿"];
  const motif = layout.id === "decorative-special" ? decorativeMotifs[variant] : null;
  const showFrame = layout.id === "decorative-special" || (layout.id === "clothbound-literary" && variant === 1);
  const showDivider = layout.id === "clothbound-literary"
    ? variant !== 0
    : layout.id === "contemporary-editorial"
      ? variant === 1
      : layout.id === "published-art"
        ? variant === 2
        : false;
  const accentEligible = layout.id === "published-art" && variant === 1 && Boolean(fonts.accentFont);
  const titleAlign = layout.id === "contemporary-editorial" && variant === 1 ? "left" : "center";
  const ink = layout.id === "decorative-special" && (mood === "dark" || mood === "jewel")
    ? "gold"
    : layout.id === "published-art"
      ? "white"
      : "cream";

  return {
    layout,
    fonts,
    variant,
    motif,
    showFrame,
    showDivider,
    accentEligible,
    titleAlign,
    ink,
  };
}

export function cleanSpineDisplayTitle(title: string) {
  let cleaned = title.replace(/\s+/g, " ").trim();
  while (/\s*\([^()]*\)\s*$/.test(cleaned)) {
    cleaned = cleaned.replace(/\s*\([^()]*\)\s*$/, "").trim();
  }
  if (cleaned.length > 58) cleaned = `${cleaned.slice(0, 55).trim()}…`;
  return cleaned || title.trim();
}

function glyphWidthEm(char: string) {
  if (/\s/.test(char)) return .28;
  if (/[MW@%]/.test(char)) return .88;
  if (/[QOCDGHNUR]/.test(char)) return .66;
  if (/[ABCDEFGHJKLMNOPQRSTUVWXYZ]/.test(char)) return .61;
  if (/[mw]/.test(char)) return .78;
  if (/[ilIjtfr]/.test(char)) return .31;
  if (/[0-9]/.test(char)) return .55;
  if (/[&]/.test(char)) return .72;
  if (/[-–—.,:;'’]/.test(char)) return .3;
  return .53;
}

function transformedText(text: string, layout: SpineLayoutDefinition) {
  return layout.textTransform === "uppercase" ? text.toUpperCase() : text;
}

function measureTextEm(text: string, layout: SpineLayoutDefinition) {
  const transformed = transformedText(text, layout);
  let width = 0;
  for (const char of transformed) width += glyphWidthEm(char);
  if (transformed.length > 1) width += (transformed.length - 1) * layout.letterSpacingEm;
  return Math.max(.1, width);
}

function balancedPartition(words: string[], lineCount: number, layout: SpineLayoutDefinition) {
  const count = words.length;
  const dp = Array.from({ length: lineCount + 1 }, () => Array<number>(count + 1).fill(Number.POSITIVE_INFINITY));
  const back = Array.from({ length: lineCount + 1 }, () => Array<number>(count + 1).fill(-1));
  dp[0][0] = 0;

  for (let lines = 1; lines <= lineCount; lines += 1) {
    for (let end = lines; end <= count; end += 1) {
      for (let start = lines - 1; start < end; start += 1) {
        const previous = dp[lines - 1][start];
        if (!Number.isFinite(previous)) continue;
        const line = words.slice(start, end).join(" ");
        const width = measureTextEm(line, layout);
        const shortPenalty = line.length <= 2 ? 1.4 : 0;
        const cost = previous + (width * width) + shortPenalty;
        if (cost < dp[lines][end]) {
          dp[lines][end] = cost;
          back[lines][end] = start;
        }
      }
    }
  }

  const lines: string[] = [];
  let end = count;
  for (let line = lineCount; line > 0; line -= 1) {
    const start = back[line][end];
    if (start < 0) return [words.join(" ")];
    lines.unshift(words.slice(start, end).join(" "));
    end = start;
  }
  return lines;
}

export function fitSpineTitle(
  rawTitle: string,
  spineWidth: number,
  design: SpineDesign,
): FittedSpineTitle {
  const title = cleanSpineDisplayTitle(rawTitle);
  const words = title.split(/\s+/).filter(Boolean);
  const layout = design.layout;
  const innerWidth = Math.max(22, spineWidth - (layout.titlePadding * 2));
  const maxLines = Math.min(layout.maxLines, Math.max(1, words.length));

  let bestLines = [title];
  let bestFontSize = layout.minTitleSize;
  let bestScore = -Infinity;

  for (let lineCount = 1; lineCount <= maxLines; lineCount += 1) {
    const lines = balancedPartition(words, lineCount, layout);
    const maxEm = Math.max(...lines.map((line) => measureTextEm(line, layout)));
    const widthFit = (innerWidth * .94) / maxEm;
    const heightFit = (layout.titleHeight * .94) / (lineCount * layout.lineHeight);
    const fontSize = Math.min(layout.maxTitleSize, widthFit, heightFit);
    const clamped = Math.max(4.9, fontSize);
    const readabilityPenalty = clamped < layout.minTitleSize ? (layout.minTitleSize - clamped) * 1.6 : 0;
    const linePenalty = lineCount * .08;
    const score = clamped - readabilityPenalty - linePenalty;

    if (score > bestScore) {
      bestScore = score;
      bestLines = lines;
      bestFontSize = clamped;
    }
  }

  const fontSize = Math.round(Math.max(4.9, bestFontSize) * 10) / 10;
  const lineScales = bestLines.map((line) => {
    const measured = measureTextEm(line, layout) * fontSize;
    if (measured <= 0) return 1;
    return Math.max(.78, Math.min(1, (innerWidth * .92) / measured));
  });

  let accentLine = -1;
  if (design.accentEligible) {
    accentLine = bestLines.findIndex((line) => {
      const normalized = line.toLowerCase();
      return line.length <= 9 && ACCENT_WORDS.some((word) => normalized.includes(word));
    });
  }

  return {
    title,
    lines: bestLines,
    fontSize,
    lineScales,
    accentLine,
  };
}
