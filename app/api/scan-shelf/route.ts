import { enforceApiRateLimit } from "../../../lib/rate-limit";
import { consumeGenerationAttempt } from "../../../lib/spine-generation-guard";
import { imageMimeMatches } from "../../../lib/image-signature";

export const runtime = "nodejs";

// Pass 1 finds physical books only. Pass 2 (/api/refine-spines) receives isolated
// book crops and finds the actual bound spine face without confusing page blocks.
const MODEL = "gemini-3.6-flash";
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_BOOKS = 30;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type InteractionBlock = { type?: string; text?: string };
type InteractionStep = { type?: string; content?: InteractionBlock[] };
type GeminiInteractionResponse = {
  status?: string;
  steps?: InteractionStep[];
  error?: { message?: string };
};

type RawBook = {
  box_2d?: unknown;
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

function sanitizeBox(value: unknown) {
  if (!Array.isArray(value) || value.length !== 4) return null;
  const numbers = value.map(Number);
  if (numbers.some((number) => !Number.isFinite(number))) return null;

  const [rawYMin, rawXMin, rawYMax, rawXMax] = numbers;
  const yMin = Math.max(0, Math.min(1000, Math.round(rawYMin)));
  const xMin = Math.max(0, Math.min(1000, Math.round(rawXMin)));
  const yMax = Math.max(0, Math.min(1000, Math.round(rawYMax)));
  const xMax = Math.max(0, Math.min(1000, Math.round(rawXMax)));

  if (yMax <= yMin || xMax <= xMin) return null;
  if (yMax - yMin < 18 || xMax - xMin < 4) return null;
  return [yMin, xMin, yMax, xMax] as const;
}

function sanitizeBooks(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const rows = (value as { books?: unknown }).books;
  if (!Array.isArray(rows)) return [];

  return rows.flatMap((raw): Array<{
    box_2d: readonly [number, number, number, number];
    title: string;
    author: string;
    visible_text: string;
    confidence: number;
  }> => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const row = raw as RawBook;
    const box = sanitizeBox(row.box_2d);
    if (!box) return [];

    return [{
      box_2d: box,
      title: cleanText(row.title, 240),
      author: cleanText(row.author, 180),
      visible_text: cleanText(row.visible_text, 500),
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

async function providerJson(response: Response): Promise<GeminiInteractionResponse> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as GeminiInteractionResponse;
  } catch {
    return { error: { message: text.slice(0, 500) } };
  }
}

async function consumeShelfScanPass(request: Request) {
  const day = new Date().toISOString().slice(0, 10);
  return consumeGenerationAttempt(request, {
    title: `Shelf scan ${day}`,
    author: "Shelf of Fame",
    usageKey: `shelf-scan:${day}`,
    // Two passes per full scan, so ten attempts = five complete scans/day.
    limit: 10,
  });
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

  const imageBytes = new Uint8Array(await image.arrayBuffer());
  if (!imageMimeMatches(imageBytes, image.type)) {
    return Response.json({ error: "That upload does not contain a valid JPEG, PNG, or WebP image." }, { status: 415 });
  }

  try {
    const allowance = await consumeShelfScanPass(request);
    if (!allowance.allowed) {
      return Response.json({
        error: "You have reached today’s shelf-scan preview limit. Try again tomorrow.",
        remaining: allowance.remaining,
      }, { status: 429 });
    }
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error
      ? Number((error as { status?: unknown }).status)
      : 500;
    const message = error instanceof Error ? error.message : "Could not verify shelf-scan access.";
    return Response.json({ error: message }, { status: status === 401 ? 401 : 502 });
  }

  const base64 = Buffer.from(imageBytes).toString("base64");
  const prompt = [
    "Analyze this photograph of physical books on shelves.",
    `Detect at most ${MAX_BOOKS} distinct physical books. If more are present, return the clearest ${MAX_BOOKS}.`,
    "Return exactly one box_2d around the visible physical body of each detected book. Do not box shelves, gaps, decor, labels, storage boxes, screens, or multiple books as one object.",
    "Books may be upright, stacked horizontally, leaning, upside down, or partly occluded.",
    "box_2d must be [ymin, xmin, ymax, xmax] normalized to integers from 0 to 1000.",
    "Read title and author when clearly visible anywhere on that same book. If uncertain, return empty strings and never borrow text from a neighboring book.",
    "visible_text may contain other legible identifying text from that same book. confidence is 0-100 confidence that the box is one physical book.",
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
                maxItems: MAX_BOOKS,
                items: {
                  type: "object",
                  properties: {
                    box_2d: {
                      type: "array",
                      minItems: 4,
                      maxItems: 4,
                      items: { type: "integer", minimum: 0, maximum: 1000 },
                      description: "Whole physical book: [ymin, xmin,ymax,xmax], normalized 0-1000",
                    },
                    title: { type: "string" },
                    author: { type: "string" },
                    visible_text: { type: "string" },
                    confidence: { type: "integer", minimum: 0, maximum: 100 },
                  },
                  required: ["box_2d", "title", "author", "visible_text", "confidence"],
                },
              },
            },
            required: ["books"],
          },
        },
        generation_config: {
          thinking_level: "minimal",
          max_output_tokens: 5000,
        },
      }),
    });

    const result = await providerJson(response);
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
