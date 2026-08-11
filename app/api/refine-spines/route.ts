import { enforceApiRateLimit } from "../../../lib/rate-limit";
import { consumeGenerationAttempt } from "../../../lib/spine-generation-guard";
import { imageMimeMatches } from "../../../lib/image-signature";

export const runtime = "nodejs";

const MODEL = "gemini-3.6-flash";
const MAX_BOOKS = 30;
const MAX_TOTAL_IMAGE_BYTES = 3_600_000;
const MAX_SINGLE_IMAGE_BYTES = 700_000;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type InteractionBlock = { type?: string; text?: string };
type InteractionStep = { type?: string; content?: InteractionBlock[] };
type GeminiInteractionResponse = {
  status?: string;
  steps?: InteractionStep[];
  error?: { message?: string };
};

type RawRefinement = {
  index?: unknown;
  spine_visible?: unknown;
  spine_box_2d?: unknown;
  title?: unknown;
  author?: unknown;
  visible_text?: unknown;
  confidence?: unknown;
};

type ImageInput = {
  index: number;
  type: string;
  base64: string;
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
  return [yMin, xMin, yMax, xMax] as const;
}

function sanitizeRefinements(value: unknown, imageCount: number) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const rows = (value as { books?: unknown }).books;
  if (!Array.isArray(rows)) return [];

  const seen = new Set<number>();
  const cleaned = rows.flatMap((raw): Array<{
    index: number;
    spine_visible: boolean;
    spine_box_2d: readonly [number, number, number, number] | null;
    spine_mask: Array<readonly [number, number]>;
    title: string;
    author: string;
    visible_text: string;
    confidence: number;
  }> => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const row = raw as RawRefinement;
    const index = Math.round(Number(row.index));
    if (!Number.isInteger(index) || index < 0 || index >= imageCount || seen.has(index)) return [];
    seen.add(index);

    const spineVisible = row.spine_visible === true;
    const box = spineVisible ? sanitizeBox(row.spine_box_2d) : null;

    return [{
      index,
      spine_visible: Boolean(box),
      spine_box_2d: box,
      spine_mask: [],
      title: box ? cleanText(row.title, 240) : "",
      author: box ? cleanText(row.author, 180) : "",
      visible_text: box ? cleanText(row.visible_text, 500) : "",
      confidence: box ? Math.max(0, Math.min(100, Math.round(Number(row.confidence) || 0))) : 0,
    }];
  });

  return cleaned.sort((left, right) => left.index - right.index);
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
    return Response.json({ error: "Invalid spine refinement request." }, { status: 400 });
  }

  const requestedCount = Math.round(Number(form.get("count")));
  if (!Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > MAX_BOOKS) {
    return Response.json({ error: `Refine between 1 and ${MAX_BOOKS} detected books at a time.` }, { status: 400 });
  }

  const images: ImageInput[] = [];
  let totalBytes = 0;
  for (let index = 0; index < requestedCount; index += 1) {
    const image = form.get(`book_${index}`);
    if (!(image instanceof Blob)) {
      return Response.json({ error: `Detected book ${index + 1} is missing its image crop.` }, { status: 400 });
    }
    if (!ALLOWED_MIME_TYPES.has(image.type)) {
      return Response.json({ error: "Detected book crops must be JPEG, PNG, or WebP." }, { status: 415 });
    }
    if (image.size <= 0 || image.size > MAX_SINGLE_IMAGE_BYTES) {
      return Response.json({ error: `Detected book ${index + 1} is too large to refine.` }, { status: 413 });
    }
    totalBytes += image.size;
    if (totalBytes > MAX_TOTAL_IMAGE_BYTES) {
      return Response.json({ error: "The detected-book crops are too large together. Try fewer books in one photo." }, { status: 413 });
    }

    const bytes = new Uint8Array(await image.arrayBuffer());
    if (!imageMimeMatches(bytes, image.type)) {
      return Response.json({ error: `Detected book ${index + 1} is not a valid image crop.` }, { status: 415 });
    }

    images.push({
      index,
      type: image.type,
      base64: Buffer.from(bytes).toString("base64"),
    });
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

  const prompt = [
    `You will receive ${images.length} isolated images, numbered 0 through ${images.length - 1}. Each image contains one physical book detected in a larger bookshelf photo.`,
    "For every numbered image, locate ONLY the complete visible bound spine face of that one book.",
    "The spine face is the binding surface that may carry title, author, publisher marks, artwork, or blank decoration. It is NOT the exposed page block/fore-edge, top or bottom page edges, front cover, or back cover.",
    "Books may be upright, horizontal, leaning, rotated, partially occluded, or viewed from above/below. Use the actual physical binding surface, regardless of orientation.",
    "spine_box_2d must surround the ENTIRE visible spine face, not merely the readable text. Include blank spine margins and artwork from one visible end of the binding to the other.",
    "If no actual spine face is visible, set spine_visible=false and return [0,0,0,0] for spine_box_2d. Never substitute pages as a spine.",
    "Read title, author, and visible_text only from that isolated book's actual spine face. Empty strings are better than guesses.",
    "Return one result for every numbered input image and preserve its index.",
  ].join(" ");

  const input: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
  for (const image of images) {
    input.push({ type: "text", text: `BOOK_IMAGE_INDEX=${image.index}` });
    input.push({ type: "image", mime_type: image.type, data: image.base64 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35_000);

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
        input,
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
                    index: { type: "integer" },
                    spine_visible: { type: "boolean" },
                    spine_box_2d: {
                      type: "array",
                      items: { type: "integer" },
                      description: "Complete visible spine face [ymin,xmin,ymax,xmax] normalized 0-1000 to the isolated book image; [0,0,0,0] when no spine is visible",
                    },
                    title: { type: "string" },
                    author: { type: "string" },
                    visible_text: { type: "string" },
                    confidence: { type: "integer" },
                  },
                  required: ["index", "spine_visible", "spine_box_2d", "title", "author", "visible_text", "confidence"],
                },
              },
            },
            required: ["books"],
          },
        },
        generation_config: {
          thinking_level: "minimal",
          max_output_tokens: 4200,
        },
      }),
    });

    const result = await providerJson(response);
    if (!response.ok) {
      const message = cleanText(result.error?.message, 500) || "Gemini could not isolate the detected spine faces.";
      return Response.json({ error: message }, { status: response.status === 429 ? 429 : 502 });
    }

    const text = outputText(result);
    if (!text) {
      return Response.json({ error: "Gemini returned no spine-refinement data." }, { status: 502 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return Response.json({ error: "Gemini returned unreadable spine-refinement data." }, { status: 502 });
    }

    const books = sanitizeRefinements(parsed, images.length);
    return Response.json({ books, model: MODEL }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return Response.json({
      error: timedOut ? "Spine refinement took too long. Try fewer books in one photo." : "Could not reach Gemini for spine refinement.",
    }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
