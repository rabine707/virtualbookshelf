import { enforceApiRateLimit } from "../../../lib/rate-limit";

export const runtime = "nodejs";

const MODEL = "gemini-3.6-flash";
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_BOOKS = 60;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type InteractionBlock = {
  type?: string;
  text?: string;
};

type InteractionStep = {
  type?: string;
  content?: InteractionBlock[];
};

type GeminiInteractionResponse = {
  status?: string;
  steps?: InteractionStep[];
  error?: { message?: string };
};

type RawBook = {
  box_2d?: unknown;
  spine_box_2d?: unknown;
  title?: unknown;
  author?: unknown;
  visible_text?: unknown;
  confidence?: unknown;
};

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function sanitizeBox(value: unknown, minimumWidth = 4, minimumHeight = 20) {
  if (!Array.isArray(value) || value.length !== 4) return null;
  const numbers = value.map(Number);
  if (numbers.some((number) => !Number.isFinite(number))) return null;

  const [rawYMin, rawXMin, rawYMax, rawXMax] = numbers;
  const yMin = Math.max(0, Math.min(1000, Math.round(rawYMin)));
  const xMin = Math.max(0, Math.min(1000, Math.round(rawXMin)));
  const yMax = Math.max(0, Math.min(1000, Math.round(rawYMax)));
  const xMax = Math.max(0, Math.min(1000, Math.round(rawXMax)));

  if (yMax <= yMin || xMax <= xMin) return null;
  if (yMax - yMin < minimumHeight || xMax - xMin < minimumWidth) return null;
  return [yMin, xMin, yMax, xMax] as const;
}

function sanitizeBooks(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const rows = (value as { books?: unknown }).books;
  if (!Array.isArray(rows)) return [];

  return rows.flatMap((raw): Array<{
    box_2d: readonly [number, number, number, number];
    spine_box_2d: readonly [number, number, number, number] | null;
    title: string;
    author: string;
    visible_text: string;
    confidence: number;
  }> => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const row = raw as RawBook;
    const box = sanitizeBox(row.box_2d);
    if (!box) return [];

    const spineBox = sanitizeBox(row.spine_box_2d, 2, 12);

    return [{
      box_2d: box,
      spine_box_2d: spineBox,
      title: spineBox ? cleanText(row.title, 240) : "",
      author: spineBox ? cleanText(row.author, 180) : "",
      visible_text: spineBox ? cleanText(row.visible_text, 500) : "",
      confidence: Math.max(0, Math.min(100, Math.round(Number(row.confidence) || 0))),
    }];
  }).slice(0, MAX_BOOKS);
}

function outputText(result: GeminiInteractionResponse) {
  const blocks = result.steps?.flatMap((step) => step.content || []) || [];
  return blocks
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text || "")
    .join("")
    .trim();
}

export async function POST(request: Request) {
  const limited = enforceApiRateLimit(request);
  if (limited) return limited;

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({ error: "Shelf scanning is not configured yet." }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Invalid shelf scan request." }, { status: 400 });
  }

  const image = form.get("image");
  if (!(image instanceof Blob)) {
    return Response.json({ error: "Choose a shelf photo first." }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.has(image.type)) {
    return Response.json({ error: "Use a JPEG, PNG, or WebP shelf photo." }, { status: 415 });
  }
  if (image.size <= 0 || image.size > MAX_IMAGE_BYTES) {
    return Response.json({ error: "Shelf photos must be 4 MB or smaller after preparation." }, { status: 413 });
  }

  const base64 = Buffer.from(await image.arrayBuffer()).toString("base64");
  const prompt = [
    "Analyze this photograph of physical books on shelves.",
    "Detect every distinct physical book and return one box_2d around the visible physical body of that book.",
    "For EACH detected book, also return spine_box_2d around ONLY the visible spine FACE: the narrow bound/bookbinding surface that normally carries spine artwork, title, author, publisher marks, or decoration.",
    "IMPORTANT: spine_box_2d is a PHYSICAL-SURFACE box, not a text box. It must cover the ENTIRE continuous visible spine face from one physical end of the binding to the other and across the full visible width/thickness of that face, including blank margins, artwork, publisher marks, and unprinted areas.",
    "Do not tighten spine_box_2d around only the readable title or author. If only part of the wording is legible but the rest of the physical spine surface is visible, still box the complete visible spine surface.",
    "spine_box_2d must EXCLUDE exposed page blocks/fore-edges, top or bottom page edges, front covers, back covers, neighboring books, shelf boards, and empty space.",
    "A book may be rotated, stacked horizontally, leaning, upside down, or partially occluded. Find the actual spine face regardless of orientation.",
    "If the physical book is visible but its spine face is genuinely not visible enough to crop, return an empty array for spine_box_2d and leave title, author, and visible_text empty. Do not substitute the page block/fore-edge as the spine.",
    "Read title and author ONLY from the pixels inside that book's visible spine face. Never infer a title from neighboring books, page edges, colors, series context, or artwork outside the spine face.",
    "box_2d and spine_box_2d use [ymin, xmin, ymax, xmax] coordinates normalized to integers from 0 to 1000.",
    "visible_text may contain other legible text from the spine face. confidence is 0-100 confidence that box_2d is one physical book.",
    "Order books top-to-bottom by shelf, then left-to-right within each shelf.",
  ].join(" ");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        input: [
          { type: "text", text: prompt },
          { type: "image", mime_type: image.type, data: base64 },
        ],
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: {
            type: "object",
            properties: {
              books: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    box_2d: {
                      type: "array",
                      items: { type: "integer" },
                      description: "Whole physical book: [ymin, xmin, ymax, xmax], normalized 0-1000",
                    },
                    spine_box_2d: {
                      type: "array",
                      items: { type: "integer" },
                      description: "Entire visible physical spine face, not just readable text: [ymin, xmin, ymax, xmax]; empty when no spine is visible",
                    },
                    title: { type: "string" },
                    author: { type: "string" },
                    visible_text: { type: "string" },
                    confidence: { type: "integer" },
                  },
                  required: ["box_2d", "spine_box_2d", "title", "author", "visible_text", "confidence"],
                },
              },
            },
            required: ["books"],
          },
        },
        generation_config: {
          thinking_level: "minimal",
        },
      }),
    });

    const result = await response.json() as GeminiInteractionResponse;
    if (!response.ok) {
      const message = cleanText(result.error?.message, 500) || "Gemini could not analyze this shelf photo.";
      return Response.json({ error: message }, { status: response.status === 429 ? 429 : 502 });
    }

    const text = outputText(result);
    if (!text) {
      return Response.json({ error: "Gemini returned no shelf detection data." }, { status: 502 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return Response.json({ error: "Gemini returned unreadable shelf detection data." }, { status: 502 });
    }

    const books = sanitizeBooks(parsed);
    return Response.json({ books, model: MODEL }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return Response.json({
      error: timedOut ? "Shelf detection took too long. Try a smaller photo." : "Could not reach Gemini for shelf detection.",
    }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
