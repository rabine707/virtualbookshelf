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

type PollinationsImage = {
  url?: string;
  b64_json?: string;
  media_type?: string;
};

type PollinationsResponse = {
  data?: PollinationsImage[];
  error?: {
    message?: string;
    code?: string;
    details?: { upstreamBody?: string };
  } | string;
};

type ProviderAttempt = {
  image?: string;
  model?: string;
  provider?: string;
  error?: string;
  status: number;
};

const MAX_TITLE_CHARS = 200;
const MAX_AUTHOR_CHARS = 120;
const MAX_COVER_URL_CHARS = 2_048;
const MAX_PROVIDER_ERROR_CHARS = 1_200;

export const runtime = "nodejs";

function promptText(value: unknown, maxChars: number) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
}

function compactError(value: string | undefined, fallback: string) {
  const cleaned = (value || fallback).replace(/\s+/g, " ").trim();
  return cleaned.slice(0, MAX_PROVIDER_ERROR_CHARS);
}

function pollinationsError(result: PollinationsResponse) {
  if (typeof result.error === "string") return result.error;
  return result.error?.message || result.error?.details?.upstreamBody;
}

async function generateWithGemini(
  apiKey: string,
  prompt: string,
  confirmedCover: { contentType: string; base64: string },
): Promise<ProviderAttempt> {
  try {
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
          },
        }),
      },
    );

    const result = await response.json() as GeminiInteractionResponse;
    if (!response.ok) {
      return {
        status: response.status,
        error: compactError(result.error?.message, "Gemini spine generation failed."),
      };
    }

    const blocks = result.steps?.flatMap((step) => step.content || []) || [];
    const imageBlock = [...blocks].reverse().find((block) => block.type === "image" && block.data);
    const data = imageBlock?.data;
    const mimeType = imageBlock?.mime_type || "image/jpeg";

    if (!data) {
      const text = blocks.map((block) => block.text).filter(Boolean).join(" ").trim();
      return {
        status: 502,
        error: compactError(text, "Gemini returned no spine artwork."),
      };
    }

    return {
      status: 200,
      image: `data:${mimeType};base64,${data}`,
      model: "gemini-3.1-flash-image",
      provider: "Gemini",
    };
  } catch (error) {
    return {
      status: 502,
      error: compactError(
        error instanceof Error ? error.message : undefined,
        "Could not reach the Gemini image generator.",
      ),
    };
  }
}

async function generateWithKlein(
  apiKey: string,
  prompt: string,
  cover: string,
): Promise<ProviderAttempt> {
  try {
    const response = await fetch("https://gen.pollinations.ai/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "klein",
        prompt,
        image: cover,
        n: 1,
        size: "512x2048",
        response_format: "b64_json",
        safe: true,
      }),
    });

    const result = await response.json() as PollinationsResponse;
    if (!response.ok) {
      return {
        status: response.status,
        error: compactError(pollinationsError(result), "Klein spine generation failed."),
      };
    }

    const generated = result.data?.[0];
    if (generated?.b64_json) {
      const mediaType = generated.media_type || "image/jpeg";
      return {
        status: 200,
        image: `data:${mediaType};base64,${generated.b64_json}`,
        model: "klein",
        provider: "Pollinations Klein",
      };
    }

    if (generated?.url) {
      return {
        status: 200,
        image: generated.url,
        model: "klein",
        provider: "Pollinations Klein",
      };
    }

    return {
      status: 502,
      error: "Klein returned no spine artwork.",
    };
  } catch (error) {
    return {
      status: 502,
      error: compactError(
        error instanceof Error ? error.message : undefined,
        "Could not reach the Klein image generator.",
      ),
    };
  }
}

function isQuotaFailure(attempt: ProviderAttempt) {
  const text = attempt.error || "";
  return attempt.status === 429
    || /RESOURCE_EXHAUSTED|quota exceeded|current quota|rate limit/i.test(text);
}

export async function POST(request: Request) {
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  const kleinApiKey = (process.env.POLLINATIONS_API_KEY || process.env.KLEIN_API_KEY)?.trim();

  if (!geminiApiKey && !kleinApiKey) {
    return Response.json({
      error: "AI spine generation is not configured yet.",
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
    // Validate the reference image once on our server before giving its public URL
    // to either provider. This preserves the SSRF/size/content-type protections.
    const confirmedCover = await fetchPublicImage(cover);
    const failures: string[] = [];
    let geminiAttempt: ProviderAttempt | null = null;

    if (geminiApiKey) {
      geminiAttempt = await generateWithGemini(geminiApiKey, prompt, confirmedCover);
      if (geminiAttempt.image) {
        return Response.json({
          image: geminiAttempt.image,
          model: geminiAttempt.model,
          provider: geminiAttempt.provider,
          aspectRatio: "1:4",
          intendedSpineCrop: "1:4",
        });
      }
      failures.push(`Gemini: ${geminiAttempt.error || "generation failed"}`);
    }

    if (kleinApiKey) {
      const kleinAttempt = await generateWithKlein(kleinApiKey, prompt, cover);
      if (kleinAttempt.image) {
        return Response.json({
          image: kleinAttempt.image,
          model: kleinAttempt.model,
          provider: kleinAttempt.provider,
          fallbackFrom: geminiApiKey ? "gemini-3.1-flash-image" : undefined,
          aspectRatio: "1:4",
          intendedSpineCrop: "1:4",
        });
      }
      failures.push(`Klein: ${kleinAttempt.error || "generation failed"}`);

      return Response.json({
        error: failures.join(" • ") || "AI spine generation failed.",
        providerErrors: failures,
      }, { status: kleinAttempt.status >= 400 ? kleinAttempt.status : 502 });
    }

    if (geminiAttempt) {
      const quotaExceeded = isQuotaFailure(geminiAttempt);
      const error = quotaExceeded
        ? `Gemini image quota is unavailable for this project, and the Klein fallback is not configured. Google said: ${geminiAttempt.error || "quota exceeded"}`
        : geminiAttempt.error || "Gemini spine generation failed.";

      return Response.json({
        error,
        quotaExceeded,
        needsFallbackKey: quotaExceeded,
        fallbackEnv: quotaExceeded ? ["POLLINATIONS_API_KEY", "KLEIN_API_KEY"] : undefined,
      }, { status: quotaExceeded ? 503 : geminiAttempt.status });
    }

    return Response.json({ error: "AI spine generation failed." }, { status: 502 });
  } catch (error) {
    if (error instanceof RemoteImageError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json({
      error: error instanceof Error ? error.message : "Could not reach the AI image generator.",
    }, { status: 502 });
  }
}
