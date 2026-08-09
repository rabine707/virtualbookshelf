import { fetchPublicImage, RemoteImageError } from "../../../lib/remote-image";

type GeminiPart = {
  text?: string;
  inlineData?: {
    mimeType?: string;
    data?: string;
  };
  inline_data?: {
    mime_type?: string;
    data?: string;
  };
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
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
    `Using the supplied confirmed front cover for “${title}”${author ? ` by ${author}` : ""} as the visual reference, create new artwork designed specifically to become the narrow spine of this same book.`,
    "Preserve the reference cover's recognizable visual identity: palette, central subject or motif, clothing and character features when present, scenery, symbols, lighting, textures, and overall mood.",
    "Recompose rather than crop. The returned canvas is 9:16 for API compatibility, but design the important artwork inside a very narrow central vertical band so the app can crop it to approximately a 1:4 book-spine shape without losing the focal subject.",
    "Keep faces, characters, symbols, and other important details away from the far left and right edges. Extend background texture and scenery outward so side cropping remains safe.",
    "Avoid inventing unrelated characters, faces, objects, or a new genre aesthetic. This should clearly feel derived from the supplied cover.",
    "Do not include any title, author name, words, letters, logos, publisher marks, badges, barcodes, frames, borders, book mockups, or typography. The app adds accurate text separately.",
    "Return polished standalone spine artwork only, edge-to-edge, with no surrounding background outside the artwork.",
  ].join(" ");

  try {
    const confirmedCover = await fetchPublicImage(cover);

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: confirmedCover.contentType,
                  data: confirmedCover.base64,
                },
              },
            ],
          }],
          generationConfig: {
            responseModalities: ["IMAGE"],
            responseFormat: {
              image: {
                aspectRatio: "9:16",
              },
            },
          },
        }),
      },
    );

    const result = await response.json() as GeminiResponse;
    if (!response.ok) {
      return Response.json({
        error: result.error?.message || "Gemini spine generation failed.",
      }, { status: response.status });
    }

    const parts = result.candidates?.flatMap((candidate) => candidate.content?.parts || []) || [];
    const imagePart = parts.find((part) => part.inlineData?.data || part.inline_data?.data);
    const inline = imagePart?.inlineData;
    const snakeInline = imagePart?.inline_data;
    const data = inline?.data || snakeInline?.data;
    const mimeType = inline?.mimeType || snakeInline?.mime_type || "image/png";

    if (!data) {
      const text = parts.map((part) => part.text).filter(Boolean).join(" ").trim();
      return Response.json({
        error: text || "Gemini returned no spine artwork.",
      }, { status: 502 });
    }

    return Response.json({
      image: `data:${mimeType};base64,${data}`,
      model: "gemini-3.1-flash-image",
      aspectRatio: "9:16",
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
