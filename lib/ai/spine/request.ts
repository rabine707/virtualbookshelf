import {
  DEFAULT_SPINE_STYLE_MODE,
  isSpineStyleMode,
  type SpineStyleMode,
} from "../../spine-prompt";

const MAX_TITLE_CHARS = 200;
const MAX_AUTHOR_CHARS = 120;
const MAX_GENRE_CHARS = 120;
const MAX_IDENTIFIER_CHARS = 64;
const MAX_COVER_URL_CHARS = 2_048;

export type SpineGenerationRequest = {
  cover: string;
  title: string;
  author: string;
  genre: string;
  styleMode: SpineStyleMode;
  isbn?: string;
  asin?: string;
};

export type SpineGenerationRequestResult =
  | { ok: true; value: SpineGenerationRequest }
  | { ok: false; error: string };

function promptText(value: unknown, maxChars: number) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
}

export function parseSpineGenerationRequest(body: unknown): SpineGenerationRequestResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid request." };
  }

  const payload = body as Record<string, unknown>;
  const cover = typeof payload.cover === "string" ? payload.cover.trim() : "";
  const title = promptText(payload.title, MAX_TITLE_CHARS) || "this book";
  const author = promptText(payload.author, MAX_AUTHOR_CHARS);
  const genre = promptText(payload.genre, MAX_GENRE_CHARS);
  const styleMode = isSpineStyleMode(payload.styleMode)
    ? payload.styleMode
    : DEFAULT_SPINE_STYLE_MODE;
  const isbn = promptText(payload.isbn, MAX_IDENTIFIER_CHARS) || undefined;
  const asin = promptText(payload.asin, MAX_IDENTIFIER_CHARS) || undefined;

  if (!cover || cover.length > MAX_COVER_URL_CHARS || !/^https?:\/\//i.test(cover)) {
    return { ok: false, error: "A valid confirmed cover is required." };
  }

  return {
    ok: true,
    value: {
      cover,
      title,
      author,
      genre,
      styleMode,
      isbn,
      asin,
    },
  };
}
