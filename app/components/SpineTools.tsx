"use client";

import { useEffect, useRef, useState } from "react";
import {
  SPINE_POSITIONS,
  generatedSpineUrl,
  getGeneratedSpine,
  saveGeneratedSpine,
  storedSpinePosition,
  type SpineGeneratedEventDetail,
  type SpinePosition,
} from "../../lib/spines/client";

const SESSION_KEY = "shelf-of-fame-supabase-session";
const DEFAULT_STATUS = "Choose a cover crop, or revert to the default textured spine.";

type GenerateSpineResponse = {
  image?: string;
  error?: string;
  needsApiKey?: boolean;
  provider?: string;
  model?: string;
  fallbackFrom?: string | string[];
  attempts?: number;
  remaining?: number;
  sharedSpine?: string;
  limitReached?: boolean;
};

type AiPreview = {
  image: string;
  data: GenerateSpineResponse;
};

type SpineToolsProps = {
  title: string;
  author: string;
  coverUrl?: string;
  isbn?: string;
  asin?: string;
};

function accessToken() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { access_token?: string };
    return parsed.access_token || "";
  } catch {
    return "";
  }
}

function spineDisplayTitle(title: string) {
  let cleaned = title.trim();
  cleaned = cleaned.replace(/\s*[\(\[][^\)\]]*(?:book|volume|vol\.?|series|#)\s*[^\)\]]*[\)\]]\s*$/i, "").trim();
  if (cleaned.length > 34) cleaned = `${cleaned.slice(0, 31).trim()}…`;
  return cleaned || title.trim();
}

function spineDisplayAuthor(author: string) {
  const cleaned = author.replace(/\s*\([^\)]*\)\s*$/g, "").replace(/\s+/g, " ").trim();
  if (cleaned.length <= 24) return cleaned;
  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length > 2) return `${parts[0]} ${parts[parts.length - 1]}`;
  return `${cleaned.slice(0, 22).trim()}…`;
}

function positionLabel(position: SpinePosition) {
  if (position === "left") return "Left detail";
  if (position === "right") return "Right detail";
  return "Center detail";
}

function providerLabel(data: GenerateSpineResponse) {
  if (/gpt image 2/i.test(data.provider || "") || data.model === "gpt-image-2") return "GPT Image 2 recompose";
  if (/klein/i.test(data.provider || "") || data.model === "klein") return "Klein recompose";
  if (/gemini/i.test(data.provider || "") || /gemini/i.test(data.model || "")) return "Gemini recompose";
  return "AI recompose";
}

function attemptText(data: GenerateSpineResponse) {
  if (typeof data.attempts !== "number") return "";
  return ` • ${data.attempts} of 3 generations used${typeof data.remaining === "number" ? ` • ${data.remaining} left` : ""}`;
}

function emitSpine(detail: SpineGeneratedEventDetail) {
  window.dispatchEvent(new CustomEvent<SpineGeneratedEventDetail>("shelf-spine-generated", { detail }));
}

export function SpineTools({ title, author, coverUrl, isbn, asin }: SpineToolsProps) {
  const [saved, setSaved] = useState<string>();
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const [busy, setBusy] = useState<"ai" | "ai-save" | "crop-save" | null>(null);
  const [aiLocked, setAiLocked] = useState(false);
  const [sharedInUse, setSharedInUse] = useState(false);
  const [aiPreview, setAiPreview] = useState<AiPreview | null>(null);
  const [cropPosition, setCropPosition] = useState<SpinePosition | null>(null);
  const [cropStatus, setCropStatus] = useState("× rejects • ↩ default • ✓ saves");
  const rejectedCrops = useRef(new Set<SpinePosition>());

  useEffect(() => {
    let cancelled = false;
    setSaved(undefined);
    setStatus(DEFAULT_STATUS);
    setBusy(null);
    setAiLocked(false);
    setSharedInUse(false);
    setAiPreview(null);
    setCropPosition(null);
    rejectedCrops.current.clear();
    if (!coverUrl) return () => { cancelled = true; };
    void getGeneratedSpine(coverUrl).then((image) => {
      if (!cancelled) setSaved(image);
    });
    return () => { cancelled = true; };
  }, [coverUrl]);

  if (!coverUrl) return null;

  const confirmedCoverUrl = coverUrl;

  const savedPosition = storedSpinePosition(saved);
  const aiButtonText = busy === "ai"
    ? "✨ Generating AI spine…"
    : aiLocked
      ? "✨ Generation limit reached"
      : sharedInUse
        ? "✨ Community spine in use"
        : saved && !savedPosition
          ? "✨ Try a different AI spine"
          : "✨ Generate AI spine";
  const cropButtonText = cropPosition
    ? "▥ Close cover cropper"
    : savedPosition
      ? "▥ Change cover crop"
      : "▥ Choose cover crop";

  async function generateAiPreview() {
    const token = accessToken();
    if (!token) {
      setStatus("Sign in first to generate AI spines. Cover crop is still free and available.");
      return;
    }

    setCropPosition(null);
    setAiPreview(null);
    setBusy("ai");
    setSharedInUse(false);
    setStatus("Checking the shared library and your remaining generations…");

    try {
      const response = await fetch("/api/generate-spine", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cover: coverUrl, title, author, isbn, asin }),
      });
      const data = await response.json() as GenerateSpineResponse;

      if (data.sharedSpine) {
        emitSpine({
          coverUrl: confirmedCoverUrl,
          image: data.sharedSpine,
          renderMode: "overlay",
          shared: true,
        });
        setSharedInUse(true);
        setStatus(`Community spine found for ${title} — reused instantly, no AI credit used.${attemptText(data)}`);
        return;
      }

      if (!response.ok || !data.image) {
        throw new Error(data.error || (data.needsApiKey ? "AI image generation is not configured." : "AI spine generation failed."));
      }

      setAiPreview({ image: data.image, data });
      setAiLocked(data.remaining === 0);
      setStatus(`${data.provider || "AI"} spine ready — review it before saving.${attemptText(data)}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "AI spine generation failed.");
    } finally {
      setBusy(null);
    }
  }

  async function saveAiPreview() {
    if (!aiPreview) return;
    setBusy("ai-save");
    try {
      await saveGeneratedSpine(confirmedCoverUrl, aiPreview.image, "integrated");
      setSaved(aiPreview.image);
      emitSpine({ coverUrl: confirmedCoverUrl, image: aiPreview.image, renderMode: "integrated" });
      setStatus(`AI spine saved for ${title}.${attemptText(aiPreview.data)}`);
      setAiPreview(null);
    } catch {
      setStatus("Could not save that AI spine on this device.");
    } finally {
      setBusy(null);
    }
  }

  function openOrCloseCrop() {
    if (cropPosition) {
      setCropPosition(null);
      setCropStatus("× rejects • ↩ default • ✓ saves");
      setStatus(DEFAULT_STATUS);
      return;
    }
    setAiPreview(null);
    rejectedCrops.current.clear();
    setCropStatus("× rejects • ↩ default • ✓ saves");
    setCropPosition(savedPosition || "center");
    setStatus("Using the confirmed cover directly — no AI generation or image credits.");
  }

  function advanceCrop(rejectCurrent = false) {
    if (!cropPosition) return;
    const rejected = rejectedCrops.current;
    if (rejectCurrent) rejected.add(cropPosition);
    const index = SPINE_POSITIONS.indexOf(cropPosition);
    for (let step = 1; step <= SPINE_POSITIONS.length; step += 1) {
      const next = SPINE_POSITIONS[(index + step) % SPINE_POSITIONS.length];
      if (!rejected.has(next)) {
        setCropPosition(next);
        setCropStatus("× rejects • ↩ default • ✓ saves");
        return;
      }
    }
    rejected.clear();
    setCropPosition(SPINE_POSITIONS[(index + 1) % SPINE_POSITIONS.length]);
    setCropStatus("All three reviewed — starting the crops over.");
  }

  async function revertToDefaultSpine() {
    setBusy("crop-save");
    setCropStatus("Restoring default spine…");
    try {
      await saveGeneratedSpine(confirmedCoverUrl, "", "overlay");
      setSaved(undefined);
      setSharedInUse(false);
      emitSpine({ coverUrl: confirmedCoverUrl, image: "", renderMode: "overlay" });
      setCropPosition(null);
      setStatus(`Default textured spine restored for ${title}.`);
      setCropStatus("× rejects • ↩ default • ✓ saves");
    } catch {
      setCropStatus("Could not restore the default spine on this device.");
    } finally {
      setBusy(null);
    }
  }

  async function saveCrop() {
    if (!cropPosition) return;
    const image = generatedSpineUrl(confirmedCoverUrl, cropPosition);
    setBusy("crop-save");
    setCropStatus("Saving spine…");
    try {
      await saveGeneratedSpine(confirmedCoverUrl, image, "overlay");
      setSaved(image);
      setSharedInUse(false);
      emitSpine({ coverUrl: confirmedCoverUrl, image, position: cropPosition, renderMode: "overlay" });
      setStatus(`${positionLabel(cropPosition)} saved for ${title}.`);
      setCropPosition(null);
      setCropStatus("× rejects • ↩ default • ✓ saves");
    } catch {
      setCropStatus("Could not save that crop on this device.");
    } finally {
      setBusy(null);
    }
  }

  return <>
    <button
      type="button"
      className="primary generate-spine-button"
      title="Create dedicated spine artwork from this confirmed cover"
      disabled={Boolean(busy) || aiLocked}
      onClick={() => void generateAiPreview()}
      hidden
    >
      {aiButtonText}
    </button>
    <button
      type="button"
      className="primary spine-crop-button"
      title="Use a narrow detail crop from this cover without AI"
      disabled={Boolean(busy)}
      onClick={openOrCloseCrop}
    >
      {cropButtonText}
    </button>
    <div className="generate-spine-status" role="status">{status}</div>

    {aiPreview ? (
      <div className="spine-crop-editor" data-cover={coverUrl} data-mode="ai" role="group" aria-label="Review generated AI spine">
        <div className="spine-crop-heading">
          <strong>AI spine preview</strong>
          <span>{providerLabel(aiPreview.data)}{attemptText(aiPreview.data)}</span>
        </div>
        <div className="spine-crop-preview">
          <img src={aiPreview.image} alt="" decoding="async" />
        </div>
        <div className="spine-crop-actions">
          <button
            type="button"
            className="spine-crop-action spine-crop-reject"
            aria-label="Discard AI spine"
            title="Discard this AI preview"
            disabled={Boolean(busy)}
            onClick={() => {
              setAiPreview(null);
              setStatus(aiPreview.data.remaining === 0
                ? "Preview discarded. You've used all 3 AI generations for this book; use a saved/community spine or cover crop."
                : `AI preview discarded.${attemptText(aiPreview.data)}`);
            }}
          >×</button>
          <button
            type="button"
            className="spine-crop-action spine-crop-cycle"
            aria-label="Regenerate AI spine"
            title={aiPreview.data.remaining === 0 ? "No generations remaining for this book" : "Generate another AI spine"}
            disabled={Boolean(busy) || aiPreview.data.remaining === 0}
            onClick={() => void generateAiPreview()}
          >↻</button>
          <button
            type="button"
            className="spine-crop-action spine-crop-accept"
            aria-label="Use this AI spine"
            title="Save this complete AI spine artwork"
            disabled={Boolean(busy)}
            onClick={() => void saveAiPreview()}
          >✓</button>
        </div>
        <div className="spine-crop-editor-status" role="status">
          {busy === "ai-save" ? "Saving AI spine…" : `× discards • ↻ regenerates • ✓ saves${attemptText(aiPreview.data)}`}
        </div>
      </div>
    ) : null}

    {cropPosition ? (
      <div
        className="spine-crop-editor"
        data-cover={coverUrl}
        data-mode="crop"
        data-position={cropPosition}
        role="group"
        aria-label="Choose a spine crop"
      >
        <div className="spine-crop-heading">
          <strong>Spine preview</strong>
          <span>{positionLabel(cropPosition)}</span>
        </div>
        <div className="spine-crop-preview">
          <img src={generatedSpineUrl(coverUrl, cropPosition)} alt="" decoding="async" />
          <span className="spine-crop-preview-title">{spineDisplayTitle(title)}</span>
          <span className="spine-crop-preview-author">{spineDisplayAuthor(author)}</span>
        </div>
        <div className="spine-crop-actions">
          <button
            type="button"
            className="spine-crop-action spine-crop-reject"
            aria-label="Reject this crop"
            title="Reject this crop and show another"
            disabled={Boolean(busy)}
            onClick={() => advanceCrop(true)}
          >×</button>
          <button
            type="button"
            className="spine-crop-action spine-crop-cycle"
            aria-label="Revert to default spine"
            title="Restore the default textured spine"
            disabled={Boolean(busy)}
            onClick={() => void revertToDefaultSpine()}
          >↩</button>
          <button
            type="button"
            className="spine-crop-action spine-crop-accept"
            aria-label="Use this spine crop"
            title="Save this crop as the spine"
            disabled={Boolean(busy)}
            onClick={() => void saveCrop()}
          >✓</button>
        </div>
        <div className="spine-crop-editor-status" role="status">{cropStatus}</div>
      </div>
    ) : null}
  </>;
}
