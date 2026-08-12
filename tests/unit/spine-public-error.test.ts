import { describe, expect, test } from "vitest";
import {
  AI_SPINE_UNAVAILABLE_MESSAGE,
  publicSpineGenerationFailure,
} from "../../lib/ai/spine/public-error";

describe("public AI spine errors", () => {
  test("returns a stable user-facing message without provider internals", () => {
    const failure = publicSpineGenerationFailure(2, 1);
    const serialized = JSON.stringify(failure);

    expect(failure).toEqual({
      error: AI_SPINE_UNAVAILABLE_MESSAGE,
      code: "generation_unavailable",
      attempts: 2,
      remaining: 1,
    });
    expect(serialized).not.toMatch(/gpt|klein|gemini|quota|pollen|providerErrors|attemptedProviders/i);
  });
});
