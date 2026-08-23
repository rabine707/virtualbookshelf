import type { SpineRenderMode } from "./client";

export function sharedSpineRenderMode(provider?: string | null): SpineRenderMode {
  const normalized = provider?.trim().toLowerCase() || "";
  return normalized === "ai-integrated" || normalized.startsWith("curator-")
    ? "integrated"
    : "overlay";
}

