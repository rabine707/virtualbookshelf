export type SpineStyleMode =
  | "classic-published"
  | "decorative-deluxe"
  | "minimal-modern";

export type SpinePromptInput = {
  title: string;
  author?: string;
  genre?: string;
  styleMode?: SpineStyleMode;
  hasCoverReference?: boolean;
  renderAuthorText?: boolean;
};

export const DEFAULT_SPINE_STYLE_MODE: SpineStyleMode = "decorative-deluxe";

const STYLE_INSTRUCTIONS: Record<SpineStyleMode, string> = {
  "classic-published":
    "Keep the design elegant, restrained, and realistic, with tasteful typography and minimal decorative accents like a traditionally published bookstore edition.",
  "decorative-deluxe":
    "Give the spine a premium, display-worthy special-edition feel. Use tasteful decorative details and richer visual styling while keeping it believable, refined, cohesive, and readable at shelf size.",
  "minimal-modern":
    "Keep the composition clean, modern, and typography-led, with strong hierarchy, fewer decorative elements, and a polished contemporary publishing aesthetic.",
};

export function isSpineStyleMode(value: unknown): value is SpineStyleMode {
  return value === "classic-published"
    || value === "decorative-deluxe"
    || value === "minimal-modern";
}

function cleanPromptValue(value: string | undefined) {
  return (value || "").replace(/\s+/g, " ").trim();
}

export function buildSpinePrompt(input: SpinePromptInput) {
  const title = cleanPromptValue(input.title) || "this book";
  const author = cleanPromptValue(input.author);
  const genre = cleanPromptValue(input.genre);
  const styleMode = input.styleMode || DEFAULT_SPINE_STYLE_MODE;
  const hasCoverReference = input.hasCoverReference !== false;
  const renderAuthorText = input.renderAuthorText === true;

  const prompt = [
    "Create a realistic, professionally designed physical book spine for this exact book.",
    hasCoverReference
      ? "Treat the supplied confirmed front cover as the authoritative design reference. Recompose its existing imagery, colors, textures, motifs, symbols, typography style, lighting, and mood into a narrow spine instead of inventing an unrelated design."
      : "Use the supplied book metadata to create a believable original spine that matches the book's genre and tone without imitating an unrelated existing edition.",
    `Book title: “${title}”.`,
    author ? `Book author: “${author}”.` : "No author name was supplied.",
    genre ? `Genre or tone: “${genre}”.` : "Genre or tone is unspecified; rely primarily on the cover reference and avoid inventing a strong unrelated genre aesthetic.",
    "OUTPUT FORMAT: return only flat, edge-to-edge 2D spine artwork on an exact 1:4 vertical canvas. Do not return a front cover, full-book mockup, 3D book, poster, bookmark, bookshelf scene, wraparound spread, borders around the asset, or empty black margins.",
    `TITLE: render the literal title exactly as “${title}”. Make it the primary typographic element and arrange it naturally along the long axis like a professionally published physical book spine. Preserve recognizable capitalization, approximate typography personality, colors, and branding from the cover when available.`,
    renderAuthorText && author
      ? `AUTHOR: render the literal author name exactly as “${author}”, smaller and secondary to the title, in a believable publisher-style placement.`
      : author
        ? `AUTHOR HANDLING: use “${author}” only for book identity and design context. Do not render the author name, initials, placeholders, or any other author text. Reserve the lower 24% as a visually quiet author zone by continuing the spine's colors and texture there while keeping it free of title text, logos, letters, faces, key objects, badges, or important artwork. The app will place the exact author name there after generation.`
        : "AUTHOR HANDLING: do not invent or render an author name. Keep the lower portion visually balanced and uncluttered.",
    "COMPOSITION: design specifically for a narrow physical spine. Do not stretch or squeeze the front cover. Simplify, extend, crop, or reposition artwork intentionally so the result feels designed for this shape.",
    "PUBLISHING QUALITY: use strong shelf readability, deliberate hierarchy, balanced spacing, clean margins, and one cohesive visual language. Decorative details may include restrained borders, florals, stars, celestial marks, filigree, line art, symbols, ornaments, or subtle print texture only when they genuinely fit the source material.",
    "Avoid generic blank-spine layouts, random filler imagery, fan-art poster composition, excessive tiny details, novelty typography, warped lettering, unrelated characters or objects, and any design that looks like an AI placeholder rather than a real published spine.",
    `STYLE MODE: ${STYLE_INSTRUCTIONS[styleMode]}`,
    "FINAL TEST: the finished asset should look believable as the real physical spine of this edition when placed beside other polished bookstore books on a shelf.",
  ];

  return prompt.join(" ");
}
