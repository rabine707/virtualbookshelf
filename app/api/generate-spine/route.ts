import { fetchPublicImage, RemoteImageError } from "../../../lib/remote-image";

type InteractionBlock = {
  type?: string;
  text?: string;
  data?: string;
  mime_type?: string;
  uri?: string;
};

type InteractionStep = {
  type?: string;
  status?: string;
  content?: InteractionBlock[];
};

type GeminiInteractionResponse = {
  id?: string;
  status?: string;
  steps?: InteractionStep[];
  error?: {
    message?: string;
    status?: string;
  };
};

const MAX_TITLE_CHARS = 200;
const MAX_AUTHOR_CHARS = 120;
const MAX_COVER_URL_CHARS = 2_048;

export const runtime = "nodejs";

function promptText(value: unknown, maxChars: number) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({
      error: "Gemini spine generation is not configured yet.",
      needsApiKey: true,
    }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const cover = typeof payload.cover === "string" ? payload.cover.trim() : "";
  const title = promptText(payload.title, MAX_TITLE_CHARS) || "this book";
  const author = promptText(payload.author, MAX_AUTHOR_CHARS);

  if (!cover || cover.length > MAX_COVER_URL_CHARS || !/^https?:\/\//i.test(cover)) {
    return Response.json({ error: "A valid confirmed cover is required." }, { status: 400 });
  }

  const prompt = [
    `Using the supplied confirmed front cover for “${title}”${author ? ` by ${author}` : ""} as the visual reference, create new artwork specifically for the narrow physical spine of this same book.`,
    "The final canvas is an exact 1:4 vertical book-spine aspect ratio. Compose for that narrow format from the start; do not make a front cover, poster, mockup, or wide image that needs side cropping.",
    "Preserve the reference cover's recognizable visual identity: palette, central subject or motif, clothing and character features when present, scenery, symbols, lighting, textures, and overall mood.",
    "Recompose the important visual elements so they remain readable and attractive in a very narrow vertical strip. Simplify or extend background details as needed rather than stretching the original cover.",
    "Avoid inventing unrelated characters, faces, objects, or a new genre aesthetic. This should clearly feel derived from the supplied cover.",
    "Do not include any title, author name, words, letters, logos, publisher marks, badges, barcodes, frames, borders, book mockups, or typography. The app adds accurate text separately.",
    "Return polished standalone spine artwork only, edge-to-edge.",
  ].join(" ");

  try {
    const confirmedCover = await fetchPublicImage(cover);

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-3.1-flash-image",
          input: [
            { type: "text", text: prompt },
            {
              type: "image",
              mime_type: confirmedCover.contentType,
              data: confirmedCover.base64,
            },
          ],
          response_format: {
            type: "image",
            mime_type: "image/jpeg",
            aspect_ratio: "1:4",
            image_size: "1K",
            delivery: "inline",
          },
        }),
      },
    );

    const result = await response.json() as GeminiInteractionResponse;
    if (!response.ok) {
      return Response.json({
        error: result.error?.message || "Gemini spine generation failed.",
      }, { status: response.status });
    }

    const blocks = result.steps?.flatMap((step) => step.content || []) || [];
    const imageBlock = [...blocks].reverse().find((block) => block.type === "image" && block.data);
    const data = imageBlock?.data;
    const mimeType = imageBlock?.mime_type || "image/jpeg";

    if (!data) {
      const text = blocks.map((block) => block.text).filter(Boolean).join(" ").trim();
      return Response.json({
        error: text || "Gemini returned no spine artwork.",
      }, { status: 502 });
    }

    return Response.json({
      image: `data:${mimeType};base64,${data}`,
      model: "gemini-3.1-flash-image",
      aspectRatio: "1:4",
      intendedSpineCrop: "1:4",
    });
  } catch (error) {
    if (error instanceof RemoteImageError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json({
      error: error instanceof Error ? error.message : "Could not reach the Gemini image generator.",
    }, { status: 502 });
  }
}
