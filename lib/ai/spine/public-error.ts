export const AI_SPINE_UNAVAILABLE_MESSAGE = "AI spine generation is temporarily unavailable. Please try again later or use a cover crop.";

export function publicSpineGenerationFailure(attempts?: number, remaining?: number) {
  return {
    error: AI_SPINE_UNAVAILABLE_MESSAGE,
    code: "generation_unavailable",
    ...(typeof attempts === "number" ? { attempts } : {}),
    ...(typeof remaining === "number" ? { remaining } : {}),
  };
}
