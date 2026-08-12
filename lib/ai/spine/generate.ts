import {
  generateWithGemini,
  generateWithPollinationsImage,
  type ConfirmedCover,
} from "./providers";

export type GenerateSpineArtworkInput = {
  pollinationsApiKey?: string;
  geminiApiKey?: string;
  prompt: string;
  coverUrl: string;
  confirmedCover: ConfirmedCover;
};

export type GenerateSpineArtworkSuccess = {
  ok: true;
  image: string;
  model?: string;
  provider?: string;
  generatedAspectRatio: "1:3" | "1:4";
  fallbackFrom?: string | string[];
};

export type GenerateSpineArtworkFailure = {
  ok: false;
  failures: string[];
  attemptedProviders: string[];
};

export type GenerateSpineArtworkResult =
  | GenerateSpineArtworkSuccess
  | GenerateSpineArtworkFailure;

export async function generateSpineArtwork(
  input: GenerateSpineArtworkInput,
): Promise<GenerateSpineArtworkResult> {
  const failures: string[] = [];
  const attempted: string[] = [];

  if (input.pollinationsApiKey) {
    attempted.push("gpt-image-2");
    const gptAttempt = await generateWithPollinationsImage(
      input.pollinationsApiKey,
      input.prompt,
      input.coverUrl,
      "gpt-image-2",
    );
    if (gptAttempt.image) {
      return {
        ok: true,
        image: gptAttempt.image,
        model: gptAttempt.model,
        provider: gptAttempt.provider,
        generatedAspectRatio: "1:3",
      };
    }
    failures.push(`GPT Image 2: ${gptAttempt.error || "generation failed"}`);

    attempted.push("klein");
    const kleinAttempt = await generateWithPollinationsImage(
      input.pollinationsApiKey,
      input.prompt,
      input.coverUrl,
      "klein",
    );
    if (kleinAttempt.image) {
      return {
        ok: true,
        image: kleinAttempt.image,
        model: kleinAttempt.model,
        provider: kleinAttempt.provider,
        generatedAspectRatio: "1:4",
        fallbackFrom: "gpt-image-2",
      };
    }
    failures.push(`Klein: ${kleinAttempt.error || "generation failed"}`);
  }

  if (input.geminiApiKey) {
    attempted.push("gemini-3.1-flash-image");
    const geminiAttempt = await generateWithGemini(
      input.geminiApiKey,
      input.prompt,
      input.confirmedCover,
    );
    if (geminiAttempt.image) {
      return {
        ok: true,
        image: geminiAttempt.image,
        model: geminiAttempt.model,
        provider: geminiAttempt.provider,
        generatedAspectRatio: "1:4",
        fallbackFrom: attempted.length > 1 ? attempted.slice(0, -1) : undefined,
      };
    }
    failures.push(`Gemini: ${geminiAttempt.error || "generation failed"}`);
  }

  return {
    ok: false,
    failures,
    attemptedProviders: attempted,
  };
}
