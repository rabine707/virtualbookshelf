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

export type ProviderAttempt = {
  image?: string;
  model?: string;
  provider?: string;
  error?: string;
  status: number;
};

export type ConfirmedCover = {
  contentType: string;
  base64: string;
};

const MAX_PROVIDER_ERROR_CHARS = 1_200;

function compactError(value: string | undefined, fallback: string) {
  const cleaned = (value || fallback).replace(/\s+/g, " ").trim();
  return cleaned.slice(0, MAX_PROVIDER_ERROR_CHARS);
}

function pollinationsError(result: PollinationsResponse) {
  if (typeof result.error === "string") return result.error;
  return result.error?.details?.upstreamBody || result.error?.message;
}

export async function generateWithPollinationsImage(
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

export async function generateWithGemini(
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
