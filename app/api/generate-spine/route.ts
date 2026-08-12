import { fetchPublicImage, RemoteImageError } from "../../../lib/remote-image";
import { consumeGenerationAttempt } from "../../../lib/spine-generation-guard";
import {
  buildSpinePrompt,
  DEFAULT_SPINE_STYLE_MODE,
  isSpineStyleMode,
} from "../../../lib/spine-prompt";

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

type ConfirmedCover = {
  contentType: string;
  base64: string;
};

const MAX_TITLE_CHARS = 200;
const MAX_AUTHOR_CHARS = 120;
const MAX_GENRE_CHARS = 120;
const MAX_IDENTIFIER_CHARS = 64;
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
  return result.error?.details?.upstreamBody || result.error?.message;
}

async function generateWithPollinationsImage(
  apiKey: string,
  prompt: string,
  cover: string,
  model: "gpt-image-2" | "klein",
): Promise<ProviderAttempt> {
  try {
    const size = model === "gpt-image-2" ? "512x1536" : "512x2048";
    const response = await fetch("https://gen.pollinations.ai/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        image: cover,
        n: 1,
        size,
        response_format: "b64_json",
        safe: true,
        ...(model === "gpt-image-2" ? { quality: "medium" } : {}),
      }),
    });

    const result = await response.json() as PollinationsResponse;
    const provider = model === "gpt-image-2" ? "GPT Image 2" : "Klein";

    if (!response.ok) {
      return {
        status: response.status,
        error: compactError(pollinationsError(result), `${provider} spine generation failed.`),
      };
    }

    const generated = result.data?.[0];
    if (generated?.b64_json) {
      const mediaType = generated.media_type || "image/jpeg";
      return {
        status: 200,
        image: `data:${mediaType};base64,${generated.b64_json}`,
        model,
        provider,
      };
    }

    if (generated?.url) {
      return {
        status: 200,
        image: generated.url,
        model,
        provider,
      };
    }

    return {
      status: 502,
      error: `${provider} returned no spine artwork.`,
    };
  } catch (error) {
    const provider = model === "gpt-image-2" ? "GPT Image 2" : "Klein";
    return {
      status: 502,
      error: compactError(
        error instanceof Error ? error.message : undefined,
        `Could not reach the ${provider} image generator.`,
      ),
    };
  }
}

async function generateWithGemini(
  apiKey: string,
  prompt: string,
  confirmedCover: ConfirmedCover,
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

export async function POST(request: Request) {
  // Premium Pollinations-backed models are opt-in. Leaving this env var unset
  // guarantees GPT Image 2 and Klein cannot spend balance while paused.
  const premiumGeneratorsEnabled = process.env.ENABLE_PREMIUM_SPINE_GENERATORS === "true";
  const pollinationsApiKey = premiumGeneratorsEnabled
    ? (process.env.POLLINATIONS_API_KEY || process.env.KLEIN_API_KEY)?.trim()
    : undefined;
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

  if (!pollinationsApiKey && !geminiApiKey) {
    return Response.json({
      error: premiumGeneratorsEnabled
        ? "AI spine generation is not configured yet."
        : "Premium AI spine generation is paused. Free cover-crop spines are still available.",
      needsApiKey: premiumGeneratorsEnabled,
      premiumGeneratorsPaused: !premiumGeneratorsEnabled,
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
  const genre = promptText(payload.genre, MAX_GENRE_CHARS);
  const styleMode = isSpineStyleMode(payload.styleMode)
    ? payload.styleMode
    : DEFAULT_SPINE_STYLE_MODE;
  const isbn = promptText(payload.isbn, MAX_IDENTIFIER_CHARS) || undefined;
  const asin = promptText(payload.asin, MAX_IDENTIFIER_CHARS) || undefined;

  if (!cover || cover.length > MAX_COVER_URL_CHARS || !/^https?:\/\//i.test(cover)) {
    return Response.json({ error: "A valid confirmed cover is required." }, { status: 400 });
  }

  let generationGuard;
  try {
    generationGuard = await consumeGenerationAttempt(request, { title, author, isbn, asin });
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error
      ? Number((error as { status?: unknown }).status) || 502
      : 502;
    return Response.json({
      error: error instanceof Error ? error.message : "Could not verify AI generation allowance.",
    }, { status });
  }

  if (generationGuard.sharedSpineUrl) {
    return Response.json({
      error: "An approved community spine already exists for this book, so no AI credit was used.",
      sharedSpine: generationGuard.sharedSpineUrl,
      attempts: generationGuard.attempts,
      remaining: generationGuard.remaining,
    }, { status: 409 });
  }

  if (!generationGuard.allowed) {
    return Response.json({
      error: "You've used all 3 AI spine generations for this book. Use one of the saved/community spines instead.",
      attempts: generationGuard.attempts,
      remaining: 0,
      limitReached: true,
    }, { status: 429 });
  }

  const prompt = buildSpinePrompt({
    title,
    author,
    genre,
    styleMode,
    hasCoverReference: true,
    // Exact author text is deliberately added by the app after generation.
    // This avoids misspellings while preserving the model-designed title/artwork.
    renderAuthorText: false,
  });

  try {
    // Validate the reference image once on our server before giving its public URL
    // to Pollinations. This preserves the SSRF, timeout, size, and content-type protections.
    const confirmedCover = await fetchPublicImage(cover);
    const failures: string[] = [];
    const attempted: string[] = [];

    if (pollinationsApiKey) {
      attempted.push("gpt-image-2");
      const gptAttempt = await generateWithPollinationsImage(
        pollinationsApiKey,
        prompt,
        cover,
        "gpt-image-2",
      );
      if (gptAttempt.image) {
        return Response.json({
          image: gptAttempt.image,
          model: gptAttempt.model,
          provider: gptAttempt.provider,
          styleMode,
          generatedAspectRatio: "1:3",
          attempts: generationGuard.attempts,
          remaining: generationGuard.remaining,
          aspectRatio: "1:4",
          intendedSpineCrop: "1:4",
        });
      }
      failures.push(`GPT Image 2: ${gptAttempt.error || "generation failed"}`);

      attempted.push("klein");
      const kleinAttempt = await generateWithPollinationsImage(
        pollinationsApiKey,
        prompt,
        cover,
        "klein",
      );
      if (kleinAttempt.image) {
        return Response.json({
          image: kleinAttempt.image,
          model: kleinAttempt.model,
          provider: kleinAttempt.provider,
          styleMode,
          generatedAspectRatio: "1:4",
          fallbackFrom: "gpt-image-2",
          attempts: generationGuard.attempts,
          remaining: generationGuard.remaining,
          aspectRatio: "1:4",
          intendedSpineCrop: "1:4",
        });
      }
      failures.push(`Klein: ${kleinAttempt.error || "generation failed"}`);
    }

    if (geminiApiKey) {
      attempted.push("gemini-3.1-flash-image");
      const geminiAttempt = await generateWithGemini(geminiApiKey, prompt, confirmedCover);
      if (geminiAttempt.image) {
        return Response.json({
          image: geminiAttempt.image,
          model: geminiAttempt.model,
          provider: geminiAttempt.provider,
          styleMode,
          generatedAspectRatio: "1:4",
          fallbackFrom: attempted.length > 1 ? attempted.slice(0, -1) : undefined,
          attempts: generationGuard.attempts,
          remaining: generationGuard.remaining,
          aspectRatio: "1:4",
          intendedSpineCrop: "1:4",
        });
      }
      failures.push(`Gemini: ${geminiAttempt.error || "generation failed"}`);
    }

    return Response.json({
      error: failures.join(" • ") || "AI spine generation failed.",
      providerErrors: failures,
      attemptedProviders: attempted,
      attempts: generationGuard.attempts,
      remaining: generationGuard.remaining,
    }, { status: 502 });
  } catch (error) {
    if (error instanceof RemoteImageError) {
      return Response.json({ error: error.message, attempts: generationGuard.attempts, remaining: generationGuard.remaining }, { status: error.status });
    }

    return Response.json({
      error: error instanceof Error ? error.message : "Could not reach the AI image generator.",
      attempts: generationGuard.attempts,
      remaining: generationGuard.remaining,
    }, { status: 502 });
  }
}
