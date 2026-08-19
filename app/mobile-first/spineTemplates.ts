export type SpineTemplateId =
  | "classic-cloth"
  | "modern-minimal"
  | "romantic-accent"
  | "ornamental-clothbound"
  | "dark-luxe";

export type SpineTemplateDefinition = {
  id: SpineTemplateId;
  titleFont: string;
  authorFont: string;
  accentFont?: string;
  ornament: string;
  titleWeight: number;
  letterSpacing: string;
  textTransform: "uppercase" | "none";
  maxTitleSize: number;
  minTitleSize: number;
  charWidthFactor: number;
  accentWords?: string[];
};

export type FittedSpineTitle = {
  title: string;
  lines: string[];
  fontSize: number;
  accentLine: number;
};

export const SPINE_TEMPLATES: Record<SpineTemplateId, SpineTemplateDefinition> = {
  "classic-cloth": {
    id: "classic-cloth",
    titleFont: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
    authorFont: '"Avenir Next", Avenir, "Helvetica Neue", Arial, sans-serif',
    ornament: "—",
    titleWeight: 600,
    letterSpacing: ".015em",
    textTransform: "uppercase",
    maxTitleSize: 10.8,
    minTitleSize: 6.5,
    charWidthFactor: .51,
  },
  "modern-minimal": {
    id: "modern-minimal",
    titleFont: '"Avenir Next Condensed", "Arial Narrow", "Helvetica Neue", Arial, sans-serif',
    authorFont: '"Avenir Next", Avenir, "Helvetica Neue", Arial, sans-serif',
    ornament: "·",
    titleWeight: 650,
    letterSpacing: ".055em",
    textTransform: "uppercase",
    maxTitleSize: 10.2,
    minTitleSize: 6.2,
    charWidthFactor: .48,
  },
  "romantic-accent": {
    id: "romantic-accent",
    titleFont: 'Baskerville, Georgia, "Times New Roman", serif',
    authorFont: 'Baskerville, Georgia, serif',
    accentFont: '"Snell Roundhand", "Brush Script MT", cursive',
    ornament: "❦",
    titleWeight: 500,
    letterSpacing: ".006em",
    textTransform: "none",
    maxTitleSize: 11,
    minTitleSize: 6.4,
    charWidthFactor: .52,
    accentWords: ["love", "kiss", "heart", "darling", "sweet", "beautiful", "dream", "forever"],
  },
  "ornamental-clothbound": {
    id: "ornamental-clothbound",
    titleFont: '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
    authorFont: '"Iowan Old Style", Georgia, serif',
    ornament: "✦",
    titleWeight: 600,
    letterSpacing: ".02em",
    textTransform: "uppercase",
    maxTitleSize: 10.5,
    minTitleSize: 6.3,
    charWidthFactor: .52,
  },
  "dark-luxe": {
    id: "dark-luxe",
    titleFont: 'Baskerville, "Iowan Old Style", Georgia, serif',
    authorFont: 'Baskerville, Georgia, serif',
    ornament: "◆",
    titleWeight: 600,
    letterSpacing: ".025em",
    textTransform: "uppercase",
    maxTitleSize: 10.5,
    minTitleSize: 6.3,
    charWidthFactor: .51,
  },
};

const DARK_WORDS = [
  "dark", "villain", "venom", "blood", "broken", "haunting", "sin", "devil",
  "king", "monster", "twisted", "cruel", "vicious", "butcher", "ritual", "wicked",
];

const ORNAMENTAL_WORDS = [
  "crown", "throne", "kingdom", "court", "magic", "shadow", "flame", "fate", "stars",
  "moon", "dragon", "witch", "curse", "serpent", "wings", "fae", "spell", "coven",
];

const ROMANTIC_WORDS = [
  "love", "kiss", "heart", "darling", "forever", "meet", "beautiful", "sweet", "charming",
  "dream", "romance", "bride", "wedding", "boyfriend", "girlfriend",
];

const MODERN_WORDS = [
  "hooked", "rivals", "pen pal", "dirty", "reckless", "play", "roommate", "boss", "crush",
];

function normalizedTitle(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9&'\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function stableBucket(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) % 100;
}

function colorMood(color: string): "dark" | "ornamental" | "romantic" | "modern" | null {
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
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * (((b - r) / delta) + 2);
    else hue = 60 * (((r - g) / delta) + 4);
  }
  if (hue < 0) hue += 360;

  if (lightness < .25 || ((hue >= 335 || hue < 12) && saturation > .3 && lightness < .5)) return "dark";
  if (hue >= 80 && hue <= 285 && lightness < .48 && saturation > .12) return "ornamental";
  if (((hue >= 285 && hue < 335) || (hue >= 345 || hue < 12)) && lightness >= .38) return "romantic";
  if (saturation < .16) return "modern";
  return null;
}

export function pickSpineTemplate(title: string, author: string, color: string): SpineTemplateDefinition {
  const text = normalizedTitle(title);
  const words = text.split(/\s+/).filter(Boolean);

  if (includesAny(text, DARK_WORDS)) return SPINE_TEMPLATES["dark-luxe"];
  if (includesAny(text, ORNAMENTAL_WORDS)) return SPINE_TEMPLATES["ornamental-clothbound"];
  if (includesAny(text, ROMANTIC_WORDS)) return SPINE_TEMPLATES["romantic-accent"];

  const mood = colorMood(color);
  const bucket = stableBucket(`${title}|${author}`);
  if (mood === "dark" && bucket < 72) return SPINE_TEMPLATES["dark-luxe"];
  if (mood === "ornamental" && bucket < 62) return SPINE_TEMPLATES["ornamental-clothbound"];
  if (mood === "romantic" && bucket < 62) return SPINE_TEMPLATES["romantic-accent"];

  if (includesAny(text, MODERN_WORDS) || words.length <= 2) return SPINE_TEMPLATES["modern-minimal"];
  if (mood === "modern" && bucket < 70) return SPINE_TEMPLATES["modern-minimal"];

  if (bucket < 48) return SPINE_TEMPLATES["classic-cloth"];
  if (bucket < 68) return SPINE_TEMPLATES["modern-minimal"];
  if (bucket < 80) return SPINE_TEMPLATES["romantic-accent"];
  if (bucket < 92) return SPINE_TEMPLATES["ornamental-clothbound"];
  return SPINE_TEMPLATES["dark-luxe"];
}

export function cleanSpineDisplayTitle(title: string) {
  let cleaned = title.replace(/\s+/g, " ").trim();
  while (/\s*\([^()]*\)\s*$/.test(cleaned)) {
    cleaned = cleaned.replace(/\s*\([^()]*\)\s*$/, "").trim();
  }
  if (cleaned.length > 54) cleaned = `${cleaned.slice(0, 51).trim()}…`;
  return cleaned || title.trim();
}

function wrapWords(words: string[], capacity: number) {
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const proposed = current ? `${current} ${word}` : word;
    if (current && proposed.length > capacity) {
      lines.push(current);
      current = word;
    } else {
      current = proposed;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function truncateLines(lines: string[], maxLines: number) {
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines - 1);
  const rest = lines.slice(maxLines - 1).join(" ");
  const maxLast = 12;
  kept.push(rest.length > maxLast ? `${rest.slice(0, maxLast - 1).trim()}…` : rest);
  return kept;
}

export function fitSpineTitle(
  rawTitle: string,
  spineWidth: number,
  template: SpineTemplateDefinition,
): FittedSpineTitle {
  const title = cleanSpineDisplayTitle(rawTitle);
  const words = title.split(/\s+/).filter(Boolean);
  const longestWord = Math.max(1, ...words.map((word) => word.length));
  const innerWidth = Math.max(26, spineWidth - 10);

  let fontSize = template.maxTitleSize;
  const longestWordFit = innerWidth / (longestWord * template.charWidthFactor);
  fontSize = Math.min(fontSize, longestWordFit);

  const compactLength = title.replace(/\s+/g, "").length;
  if (compactLength > 34) fontSize -= 1.25;
  else if (compactLength > 26) fontSize -= .7;
  else if (compactLength > 20) fontSize -= .25;
  fontSize = Math.max(template.minTitleSize, fontSize);

  let lines: string[] = [];
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const capacity = Math.max(4, Math.floor(innerWidth / (fontSize * template.charWidthFactor)));
    lines = wrapWords(words, capacity);
    if (lines.length <= 5) break;
    fontSize = Math.max(template.minTitleSize, fontSize - .35);
  }

  lines = truncateLines(lines, 5);

  let accentLine = -1;
  if (template.accentWords?.length) {
    accentLine = lines.findIndex((line) => {
      const normalized = line.toLowerCase();
      return template.accentWords?.some((word) => normalized.includes(word));
    });
  }

  return {
    title,
    lines,
    fontSize: Math.round(fontSize * 10) / 10,
    accentLine,
  };
}
