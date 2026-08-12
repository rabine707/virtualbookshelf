import { generateSpineArtwork } from "../../../lib/ai/spine/generate";
import { parseSpineGenerationRequest } from "../../../lib/ai/spine/request";
import { fetchPublicImage, RemoteImageError } from "../../../lib/remote-image";
import { consumeGenerationAttempt } from "../../../lib/spine-generation-guard";
import { buildSpinePrompt } from "../../../lib/spine-prompt";

export const runtime = "nodejs";

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

  const parsedRequest = parseSpineGenerationRequest(body);
  if (!parsedRequest.ok) {
    return Response.json({ error: parsedRequest.error }, { status: 400 });
  }

  const {
    cover,
    title,
    author,
    genre,
    styleMode,
    isbn,
    asin,
  } = parsedRequest.value;

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
    const generation = await generateSpineArtwork({
      pollinationsApiKey,
      geminiApiKey,
      prompt,
      coverUrl: cover,
      confirmedCover,
    });

    if (generation.ok) {
      return Response.json({
        image: generation.image,
        model: generation.model,
        provider: generation.provider,
        styleMode,
        generatedAspectRatio: generation.generatedAspectRatio,
        fallbackFrom: generation.fallbackFrom,
        attempts: generationGuard.attempts,
        remaining: generationGuard.remaining,
        aspectRatio: "1:4",
        intendedSpineCrop: "1:4",
      });
    }

    return Response.json({
      error: generation.failures.join(" • ") || "AI spine generation failed.",
      providerErrors: generation.failures,
      attemptedProviders: generation.attemptedProviders,
      attempts: generationGuard.attempts,
      remaining: generationGuard.remaining,
    }, { status: 502 });
  } catch (error) {
    if (error instanceof RemoteImageError) {
      return Response.json({
        error: error.message,
        attempts: generationGuard.attempts,
        remaining: generationGuard.remaining,
      }, { status: error.status });
    }

    return Response.json({
      error: error instanceof Error ? error.message : "Could not reach the AI image generator.",
      attempts: generationGuard.attempts,
      remaining: generationGuard.remaining,
    }, { status: 502 });
  }
}
