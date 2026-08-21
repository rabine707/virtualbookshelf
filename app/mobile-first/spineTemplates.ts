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

export type SpineMotifId =
  | "celestial"
  | "botanical"
  | "floral"
  | "fantasy"
  | "dark-romance"
  | "nature"
  | "romance"
  | "sports"
  | "mystery";

export type SpineArtworkId =
  | "moon-forest"
  | "compass-star"
  | "leafy-sprig"
  | "botanical-key"
  | "rose-bloom"
  | "wildflowers"
  | "crossed-axes"
  | "crown-blade"
  | "serpent-rose"
  | "thorn-heart"
  | "mountain-pines"
  | "frost-mountain"
  | "heart-vine"
  | "playing-cards"
  | "hockey-heart"
  | "crossed-sticks"
  | "watching-eye"
  | "candle-key"
  | "fox-moon"
  | "sealed-letter"
  | "wedding-rings"
  | "moth-bloom"
  | "lips";

export type SpineDesign = {
  layout: SpineLayoutDefinition;
  fonts: SpineFontSet;
  variant: 0 | 1 | 2;
  motif: SpineMotifId | null;
  artwork: SpineArtworkId | null;
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
  detailLevel: "full" | "reduced" | "title-only";
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
    titleWeight: 650,
    textTransform: "uppercase",
    maxTitleSize: 12.9,
    minTitleSize: 8.6,
    maxLines: 5,
    lineHeight: 1.08,
    letterSpacingEm: .01,
    titleTop: 24,
    titleHeight: 88,
    titlePadding: 7,
    authorSize: 6.15,
  },
  "contemporary-editorial": {
    id: "contemporary-editorial",
    fontSets: [
      { titleFont: sansCondensed, authorFont: sansClean },
      { titleFont: serifDisplay, authorFont: sansClean },
      { titleFont: serifBook, authorFont: sansClean },
    ],
    titleWeight: 675,
    textTransform: "none",
    maxTitleSize: 13.8,
    minTitleSize: 8.6,
    maxLines: 4,
    lineHeight: 1.07,
    letterSpacingEm: .006,
    titleTop: 19,
    titleHeight: 90,
    titlePadding: 7,
    authorSize: 6.1,
  },
  "decorative-special": {
    id: "decorative-special",
    fontSets: [
      { titleFont: serifBook, authorFont: serifClassic },
      { titleFont: serifDisplay, authorFont: serifClassic },
      { titleFont: serifClassic, authorFont: sansClean },
    ],
    titleWeight: 650,
    textTransform: "uppercase",
    maxTitleSize: 12.5,
    minTitleSize: 8.6,
    maxLines: 5,
    lineHeight: 1.08,
    letterSpacingEm: .012,
    titleTop: 23,
    titleHeight: 82,
    titlePadding: 8,
    authorSize: 6.05,
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
    maxTitleSize: 14,
    minTitleSize: 8.6,
    maxLines: 4,
    lineHeight: 1.06,
    letterSpacingEm: .003,
    titleTop: 13,
    titleHeight: 78,
    titlePadding: 7,
    authorSize: 6.2,
  },
};

const DARK_WORDS = [
  "dark", "villain", "venom", "blood", "broken", "haunting", "sin", "devil", "king",
  "monster", "twisted", "cruel", "vicious", "butcher", "ritual", "wicked", "deadly",
  "obsession", "stalker", "sinner", "revenge", "bleed", "killer", "murder",
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

const DECORATIVE_MOTIFS: SpineMotifId[] = [
  "celestial",
  "botanical",
  "floral",
  "fantasy",
  "dark-romance",
  "nature",
];

const FANTASY_MOTIFS: SpineMotifId[] = ["celestial", "fantasy", "nature"];
const DARK_MOTIFS: SpineMotifId[] = ["dark-romance", "celestial", "floral", "fantasy"];

const CELESTIAL_MOTIF_WORDS = ["light", "moon", "star", "night", "axis", "sky"];
const BOTANICAL_MOTIF_WORDS = ["sap", "leaf", "garden", "vine", "weeds", "herb"];
const FLORAL_MOTIF_WORDS = ["rose", "flower", "bloom", "floral", "daisy"];
const FANTASY_MOTIF_WORDS = ["axe", "warlock", "coven", "king", "queen", "court", "crown", "wing", "dragon"];
const NATURE_MOTIF_WORDS = ["mountain", "ice", "forest", "woods", "maple", "rivals"];
const ROMANCE_MOTIF_WORDS = [
  "love", "sweet", "beautiful", "kiss", "heart", "darling", "crush", "pretty", "redeem",
  "romance", "bride", "groom", "wedding", "tempting", "hitched", "like you", "marry",
  "pen pal", "letter", "mail", "vixen", "fox", "wreck", "moth", "butterfly", "dirty love", "lipstick", "lips",
];
const SPORTS_MOTIF_WORDS = [
  "hockey", "puck", "ice", "rival", "goal", "team", "player", "playing", "league", "football", "baseball",
];
const MYSTERY_MOTIF_WORDS = [
  "murder", "mystery", "secret", "ritual", "haunt", "killer", "dead", "death", "lies", "missing", "stalker",
];
const DARK_ROMANCE_MOTIF_WORDS = [
  "blood", "bleed", "venom", "viper", "villain", "sinner", "obsession", "stalker", "butcher", "haunt",
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

function artworkFor(text: string, motif: SpineMotifId, seed: string): SpineArtworkId {
  const alternate = stableHash(`${seed}|artwork`) % 2 === 1;

  if (includesAny(text, ["vixen", "fox"])) return "fox-moon";
  if (includesAny(text, ["pen pal", "letter", "mail"])) return "sealed-letter";
  if (includesAny(text, ["hitched", "wedding", "bride", "groom", "marry"])) return "wedding-rings";
  if (includesAny(text, ["wreck me", "moth", "butterfly"])) return "moth-bloom";
  if (includesAny(text, ["dirty love", "lipstick", "lips"])) return "lips";
  if (includesAny(text, ["beautiful venom"])) return "wildflowers";
  if (includesAny(text, ["axe", "axes", "hatchet"])) return "crossed-axes";
  if (includesAny(text, ["crown", "throne", "queen", "prince", "kingdom", "court"])) return "crown-blade";
  if (includesAny(text, ["venom", "viper", "serpent", "snake"])) return "serpent-rose";
  if (includesAny(text, ["bleed", "blood", "broken", "redeem", "wound"])) return "thorn-heart";
  if (includesAny(text, ["hockey", "puck", "ice rink", "goalie"])) {
    return includesAny(text, ["love", "crush", "heart", "kiss"]) ? "hockey-heart" : "crossed-sticks";
  }
  if (includesAny(text, ["playing", "cards", "poker", "game"])) return "playing-cards";
  if (includesAny(text, ["moon", "moonlight", "night", "lights out"])) return "moon-forest";
  if (includesAny(text, ["axis", "compass", "star", "starlight", "sky"])) return "compass-star";
  if (includesAny(text, ["sap", "leaf", "garden", "vine", "weeds", "herb"])) {
    return includesAny(text, ["secret", "mystery", "hidden"]) ? "botanical-key" : "leafy-sprig";
  }
  if (includesAny(text, ["rose", "bloom"])) return "rose-bloom";
  if (includesAny(text, ["flower", "floral", "daisy"])) return "wildflowers";
  if (includesAny(text, ["ice", "frost", "snow", "winter"])) return "frost-mountain";
  if (includesAny(text, ["mountain", "forest", "woods", "maple"])) return "mountain-pines";
  if (includesAny(text, ["murder", "mystery", "killer", "stalker", "watching", "lies"])) return "watching-eye";
  if (includesAny(text, ["secret", "ritual", "haunt", "dead", "death", "missing"])) return "candle-key";
  if (includesAny(text, ["love", "sweet", "beautiful", "kiss", "heart", "darling", "crush", "pretty"])) {
    return alternate ? "heart-vine" : "thorn-heart";
  }

  if (motif === "celestial") return alternate ? "moon-forest" : "compass-star";
  if (motif === "botanical") return alternate ? "botanical-key" : "leafy-sprig";
  if (motif === "floral") return alternate ? "wildflowers" : "rose-bloom";
  if (motif === "fantasy") return alternate ? "crown-blade" : "crossed-axes";
  if (motif === "dark-romance") return alternate ? "serpent-rose" : "thorn-heart";
  if (motif === "nature") return alternate ? "frost-mountain" : "mountain-pines";
  if (motif === "romance") return alternate ? "heart-vine" : "thorn-heart";
  if (motif === "sports") return alternate ? "hockey-heart" : "crossed-sticks";
  return alternate ? "watching-eye" : "candle-key";
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
  const detailBucket = stableBucket(`${title}|${author}|details`);
  const variant = variantFor(title, author);
  const isDarkOrFantasy = includesAny(text, DARK_WORDS) || includesAny(text, FANTASY_WORDS);
  const isContemporary = includesAny(text, CONTEMPORARY_WORDS);
  const isArtFriendly = hasCover && includesAny(text, ART_FRIENDLY_WORDS);

  let layout: SpineLayoutDefinition;

  // Most shelves should read like a mixed bookstore, not a matching special-edition set.
  // Strong genre signals influence the design language, but they do not force decoration.
  if (isDarkOrFantasy) {
    if (hasCover && bucket >= 84) layout = SPINE_LAYOUTS["published-art"];
    else if (bucket < 22) layout = SPINE_LAYOUTS["decorative-special"];
    else if (bucket < 72) layout = SPINE_LAYOUTS["clothbound-literary"];
    else layout = SPINE_LAYOUTS["contemporary-editorial"];
  } else if (isArtFriendly) {
    if (bucket < 34) layout = SPINE_LAYOUTS["published-art"];
    else if (bucket < 64) layout = SPINE_LAYOUTS["contemporary-editorial"];
    else layout = SPINE_LAYOUTS["clothbound-literary"];
  } else if (isContemporary) {
    if (hasCover && bucket >= 90) layout = SPINE_LAYOUTS["published-art"];
    else if (bucket < 48) layout = SPINE_LAYOUTS["contemporary-editorial"];
    else layout = SPINE_LAYOUTS["clothbound-literary"];
  } else if (mood === "dark" || mood === "jewel") {
    if (bucket < 12) layout = SPINE_LAYOUTS["decorative-special"];
    else if (hasCover && bucket >= 92) layout = SPINE_LAYOUTS["published-art"];
    else if (bucket < 70) layout = SPINE_LAYOUTS["clothbound-literary"];
    else layout = SPINE_LAYOUTS["contemporary-editorial"];
  } else {
    if (bucket < 58) layout = SPINE_LAYOUTS["clothbound-literary"];
    else if (bucket < 83) layout = SPINE_LAYOUTS["contemporary-editorial"];
    else if (hasCover && bucket < 94) layout = SPINE_LAYOUTS["published-art"];
    else if (bucket < 98) layout = SPINE_LAYOUTS["decorative-special"];
    else layout = SPINE_LAYOUTS["clothbound-literary"];
  }

  const fonts = layout.fontSets[variant % layout.fontSets.length];
  const motifIndex = stableHash(`${title}|${author}|motif`) % DECORATIVE_MOTIFS.length;
  const genreMotif: SpineMotifId = includesAny(text, CELESTIAL_MOTIF_WORDS)
    ? "celestial"
    : includesAny(text, BOTANICAL_MOTIF_WORDS)
      ? "botanical"
      : includesAny(text, SPORTS_MOTIF_WORDS)
        ? "sports"
        : includesAny(text, MYSTERY_MOTIF_WORDS)
          ? "mystery"
          : includesAny(text, DARK_ROMANCE_MOTIF_WORDS)
            ? "dark-romance"
            : includesAny(text, DARK_WORDS)
              ? DARK_MOTIFS[(motifIndex + variant) % DARK_MOTIFS.length]
              : includesAny(text, ROMANCE_MOTIF_WORDS)
                ? "romance"
                : includesAny(text, FLORAL_MOTIF_WORDS)
                  ? "floral"
                  : includesAny(text, FANTASY_MOTIF_WORDS)
                    ? "fantasy"
                    : includesAny(text, NATURE_MOTIF_WORDS)
                      ? "nature"
                      : includesAny(text, FANTASY_WORDS)
                        ? FANTASY_MOTIFS[variant]
                        : DECORATIVE_MOTIFS[motifIndex];
  const motifThreshold = layout.id === "decorative-special"
    ? 96
    : layout.id === "clothbound-literary"
      ? 82
      : layout.id === "contemporary-editorial"
        ? 72
        : 56;
  const hasSemanticMotif = includesAny(text, [
    ...CELESTIAL_MOTIF_WORDS,
    ...BOTANICAL_MOTIF_WORDS,
    ...FLORAL_MOTIF_WORDS,
    ...FANTASY_MOTIF_WORDS,
    ...NATURE_MOTIF_WORDS,
    ...ROMANCE_MOTIF_WORDS,
    ...SPORTS_MOTIF_WORDS,
    ...MYSTERY_MOTIF_WORDS,
    ...DARK_ROMANCE_MOTIF_WORDS,
  ]);
  const motif = hasSemanticMotif || detailBucket < motifThreshold ? genreMotif : null;
  const artwork = motif ? artworkFor(text, motif, `${title}|${author}`) : null;
  const showFrame = layout.id === "decorative-special"
    ? detailBucket < 72
    : layout.id === "clothbound-literary"
      ? detailBucket < 11
      : false;
  const showDivider = layout.id === "clothbound-literary"
    ? detailBucket >= 76 && detailBucket < 91
    : layout.id === "contemporary-editorial"
      ? detailBucket >= 82
      : layout.id === "published-art"
        ? detailBucket >= 88
        : false;
  const accentEligible = layout.id === "published-art"
    && variant === 1
    && detailBucket < 58
    && Boolean(fonts.accentFont);
  const titleAlign: "center" = "center";
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
    artwork,
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
  const compactLength = title.replace(/\s+/g, "").length;
  const hasUnbreakableLongWord = words.some((word) => word.length >= 12);
  const minimumLineScale = hasUnbreakableLongWord ? .58 : words.length <= 2 ? .66 : .72;
  const shortBoost = compactLength <= 10 ? 1.9 : compactLength <= 16 ? 1.05 : compactLength <= 22 ? .45 : 0;
  const candidateMaxSize = layout.maxTitleSize + shortBoost;

  let bestLines = [title];
  let bestFontSize = layout.minTitleSize;
  let bestScales = [1];
  let bestScore = -Infinity;

  for (let lineCount = 1; lineCount <= maxLines; lineCount += 1) {
    const lines = balancedPartition(words, lineCount, layout);
    const heightFit = (layout.titleHeight * .94) / (lineCount * layout.lineHeight);
    let fontSize = Math.min(candidateMaxSize, heightFit);

    // Protect readability first. Long lines may condense horizontally before the type gets tiny.
    const maxEm = Math.max(...lines.map((line) => measureTextEm(line, layout)));
    const scaleAtSize = (innerWidth * .9) / (maxEm * fontSize);
    if (scaleAtSize < minimumLineScale) {
      fontSize = Math.min(fontSize, (innerWidth * .9) / (maxEm * minimumLineScale));
    }
    fontSize = Math.max(layout.minTitleSize, fontSize);

    const lineScales = lines.map((line) => {
      const measured = measureTextEm(line, layout) * fontSize;
      if (measured <= 0) return 1;
      return Math.max(minimumLineScale, Math.min(1, (innerWidth * .9) / measured));
    });

    const compressionPenalty = lineScales.reduce((sum, scale) => sum + ((1 - scale) * 2.5), 0);
    const unresolvedOverflow = Math.max(...lines.map((line, index) => {
      const renderedWidth = measureTextEm(line, layout) * fontSize * lineScales[index];
      return Math.max(0, (renderedWidth / (innerWidth * .9)) - 1);
    }));
    const overflowPenalty = unresolvedOverflow * 30;
    const linePenalty = Math.abs(lineCount - Math.min(3, words.length)) * .12;
    const tinyPenalty = fontSize < layout.minTitleSize + .35 ? 1.1 : 0;
    const score = fontSize - compressionPenalty - overflowPenalty - linePenalty - tinyPenalty;

    if (score > bestScore) {
      bestScore = score;
      bestLines = lines;
      bestFontSize = fontSize;
      bestScales = lineScales;
    }
  }

  const fontSize = Math.round(bestFontSize * 10) / 10;
  const lineScales = bestScales.map((scale) => Math.round(scale * 100) / 100);
  const narrowestLine = Math.min(...lineScales);
  const detailLevel = fontSize >= 9.3 && bestLines.length <= 3 && narrowestLine >= .82 && compactLength <= 28
    ? "full"
    : fontSize >= 8.6 && bestLines.length <= 4 && narrowestLine >= minimumLineScale && compactLength <= 42
      ? "reduced"
      : "title-only";

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
    detailLevel,
  };
}
