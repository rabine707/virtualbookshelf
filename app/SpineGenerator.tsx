"use client";

import { useEffect } from "react";

const DB_NAME = "shelf-of-fame-art";
const STORE_NAME = "generated-spines";
const DB_VERSION = 1;
const SESSION_KEY = "shelf-of-fame-supabase-session";
const POSITIONS = ["left", "center", "right"] as const;
type SpinePosition = (typeof POSITIONS)[number];

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

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveGeneratedSpine(coverUrl: string, image: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(image, coverUrl);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function getGeneratedSpine(coverUrl: string) {
  try {
    const db = await openDb();
    const value = await new Promise<string | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(coverUrl);
      request.onsuccess = () => resolve(typeof request.result === "string" ? request.result : undefined);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return value;
  } catch {
    return undefined;
  }
}

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

function detailValue(modal: HTMLElement, label: string) {
  for (const dt of modal.querySelectorAll<HTMLElement>(".details dt")) {
    if (dt.textContent?.trim().toLowerCase() !== label.toLowerCase()) continue;
    const dd = dt.nextElementSibling;
    return dd?.textContent?.trim() || "";
  }
  return "";
}

function selectedBookInfo() {
  const modal = document.querySelector<HTMLElement>(".modal");
  if (!modal) return null;
  const image = modal.querySelector<HTMLImageElement>(".cover-image");
  const title = modal.querySelector<HTMLElement>(".details h2")?.textContent?.trim() || "";
  const authorText = modal.querySelector<HTMLElement>(".details .author")?.textContent?.trim() || "";
  const author = authorText.replace(/^by\s+/i, "").trim();
  const cover = image?.currentSrc || image?.src || "";
  const isbnRaw = detailValue(modal, "ISBN");
  const asinRaw = detailValue(modal, "Audible ASIN");
  const isbn = isbnRaw && isbnRaw !== "N/A" ? isbnRaw : undefined;
  const asin = asinRaw || undefined;
  if (!cover || !title) return null;
  return { cover, title, author, isbn, asin };
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

function spineUrl(coverUrl: string, position: SpinePosition) {
  return `/api/spine?v=3&position=${position}&cover=${encodeURIComponent(coverUrl)}`;
}

function savedPosition(image?: string): SpinePosition | null {
  if (!image) return null;
  try {
    const url = new URL(image, window.location.origin);
    if (url.pathname !== "/api/spine") return null;
    const position = url.searchParams.get("position");
    return POSITIONS.includes(position as SpinePosition) ? position as SpinePosition : null;
  } catch {
    return null;
  }
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

function createPreview(current: { title: string; author: string }, image: string, headingText: string, detailText: string) {
  const editor = document.createElement("div");
  editor.className = "spine-crop-editor";
  editor.setAttribute("role", "group");

  const heading = document.createElement("div");
  heading.className = "spine-crop-heading";
  const headingTitle = document.createElement("strong");
  headingTitle.textContent = headingText;
  const detail = document.createElement("span");
  detail.textContent = detailText;
  heading.append(headingTitle, detail);

  const preview = document.createElement("div");
  preview.className = "spine-crop-preview";
  const art = document.createElement("img");
  art.alt = "";
  art.decoding = "async";
  art.src = image;
  const previewTitle = document.createElement("span");
  previewTitle.className = "spine-crop-preview-title";
  previewTitle.textContent = spineDisplayTitle(current.title);
  const previewAuthor = document.createElement("span");
  previewAuthor.className = "spine-crop-preview-author";
  previewAuthor.textContent = spineDisplayAuthor(current.author);
  preview.append(art, previewTitle, previewAuthor);

  const actions = document.createElement("div");
  actions.className = "spine-crop-actions";

  const reject = document.createElement("button");
  reject.type = "button";
  reject.className = "spine-crop-action spine-crop-reject";
  reject.textContent = "×";

  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "spine-crop-action spine-crop-cycle";
  retry.textContent = "↻";

  const accept = document.createElement("button");
  accept.type = "button";
  accept.className = "spine-crop-action spine-crop-accept";
  accept.textContent = "✓";

  actions.append(reject, retry, accept);

  const editorStatus = document.createElement("div");
  editorStatus.className = "spine-crop-editor-status";
  editorStatus.setAttribute("role", "status");

  editor.append(heading, preview, actions, editorStatus);
  return { editor, art, detail, reject, retry, accept, editorStatus };
}

export default function SpineGenerator() {
  useEffect(() => {
    const mount = () => {
      const modal = document.querySelector<HTMLElement>(".modal");
      if (!modal) return;
      const feedback = modal.querySelector<HTMLElement>('[aria-label="Cover feedback"]');
      if (!feedback) return;

      const info = selectedBookInfo();
      if (!info) return;

      const staleEditor = feedback.querySelector<HTMLElement>(".spine-crop-editor");
      if (staleEditor && staleEditor.dataset.cover !== info.cover) staleEditor.remove();

      if (feedback.querySelector(".generate-spine-button")) return;

      const aiButton = document.createElement("button");
      aiButton.type = "button";
      aiButton.className = "primary generate-spine-button";
      aiButton.textContent = "✨ Generate AI spine";
      aiButton.title = "Create dedicated spine artwork from this confirmed cover";

      const cropButton = document.createElement("button");
      cropButton.type = "button";
      cropButton.className = "primary spine-crop-button";
      cropButton.textContent = "▥ Choose cover crop";
      cropButton.title = "Use a narrow detail crop from this cover without AI";

      const status = document.createElement("div");
      status.className = "generate-spine-status";
      status.setAttribute("role", "status");
      status.textContent = "AI allows up to 3 generations per book. Shared spines are reused first.";

      const updateSavedLabels = async () => {
        const saved = await getGeneratedSpine(info.cover);
        if (!aiButton.isConnected) return;
        const position = savedPosition(saved);
        aiButton.textContent = saved && !position ? "✨ Try a different AI spine" : "✨ Generate AI spine";
        cropButton.textContent = position ? "▥ Change cover crop" : "▥ Choose cover crop";
      };

      void updateSavedLabels();

      const setBusy = (busy: boolean) => {
        aiButton.disabled = busy;
        cropButton.disabled = busy;
      };

      const generateAiPreview = async () => {
        const current = selectedBookInfo();
        if (!current) return;
        const token = accessToken();
        if (!token) {
          status.textContent = "Sign in first to generate AI spines. Cover crop is still free and available.";
          return;
        }

        feedback.querySelector<HTMLElement>(".spine-crop-editor")?.remove();
        setBusy(true);
        aiButton.textContent = "✨ Generating AI spine…";
        status.textContent = "Checking the shared library and your remaining generations…";

        try {
          const response = await fetch("/api/generate-spine", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              cover: current.cover,
              title: current.title,
              author: current.author,
              isbn: current.isbn,
              asin: current.asin,
            }),
          });
          const data = await response.json() as GenerateSpineResponse;

          if (data.sharedSpine) {
            await saveGeneratedSpine(current.cover, data.sharedSpine);
            window.dispatchEvent(new CustomEvent("shelf-spine-generated", {
              detail: { coverUrl: current.cover, image: data.sharedSpine },
            }));
            status.textContent = `Community spine found for ${current.title} — reused instantly, no AI credit used.${attemptText(data)}`;
            aiButton.textContent = "✨ Community spine in use";
            return;
          }

          if (!response.ok || !data.image) {
            throw new Error(data.error || (data.needsApiKey ? "AI image generation is not configured." : "AI spine generation failed."));
          }

          const preview = createPreview(current, data.image, "AI spine preview", `${providerLabel(data)}${attemptText(data)}`);
          preview.editor.dataset.cover = current.cover;
          preview.editor.dataset.mode = "ai";
          preview.editor.setAttribute("aria-label", "Review generated AI spine");
          preview.reject.setAttribute("aria-label", "Discard AI spine");
          preview.reject.title = "Discard this AI preview";
          preview.retry.setAttribute("aria-label", "Regenerate AI spine");
          preview.retry.title = data.remaining === 0 ? "No generations remaining for this book" : "Generate another AI spine";
          preview.retry.disabled = data.remaining === 0;
          preview.accept.setAttribute("aria-label", "Use this AI spine");
          preview.accept.title = "Save this AI artwork as the shelf spine";
          preview.editorStatus.textContent = `× discards • ↻ regenerates • ✓ saves${attemptText(data)}`;
          feedback.appendChild(preview.editor);
          status.textContent = `${data.provider || "AI"} spine ready — review it before saving.${attemptText(data)}`;
          aiButton.textContent = data.remaining === 0 ? "✨ Generation limit reached" : "✨ Try another AI spine";
          if (data.remaining === 0) aiButton.disabled = true;

          preview.reject.addEventListener("click", () => {
            preview.editor.remove();
            status.textContent = data.remaining === 0
              ? "Preview discarded. You've used all 3 AI generations for this book; use a saved/community spine or cover crop."
              : `AI preview discarded.${attemptText(data)}`;
          });

          preview.retry.addEventListener("click", () => {
            preview.editor.remove();
            void generateAiPreview();
          });

          preview.accept.addEventListener("click", async () => {
            preview.accept.disabled = true;
            preview.editorStatus.textContent = "Saving AI spine…";
            try {
              await saveGeneratedSpine(current.cover, data.image as string);
              window.dispatchEvent(new CustomEvent("shelf-spine-generated", {
                detail: { coverUrl: current.cover, image: data.image },
              }));
              status.textContent = `AI spine saved for ${current.title}.${attemptText(data)}`;
              cropButton.textContent = "▥ Choose cover crop";
              preview.editor.remove();
            } catch {
              preview.accept.disabled = false;
              preview.editorStatus.textContent = "Could not save that AI spine on this device.";
            }
          });
        } catch (error) {
          aiButton.textContent = "✨ Generate AI spine";
          status.textContent = error instanceof Error ? error.message : "AI spine generation failed.";
        } finally {
          if (!aiButton.disabled) setBusy(false);
          else cropButton.disabled = false;
        }
      };

      aiButton.addEventListener("click", () => void generateAiPreview());

      cropButton.addEventListener("click", async () => {
        const existing = feedback.querySelector<HTMLElement>(".spine-crop-editor");
        if (existing?.dataset.mode === "crop") {
          existing.remove();
          const saved = await getGeneratedSpine(info.cover);
          cropButton.textContent = savedPosition(saved) ? "▥ Change cover crop" : "▥ Choose cover crop";
          status.textContent = "AI allows up to 3 generations per book. Shared spines are reused first.";
          return;
        }
        existing?.remove();

        const current = selectedBookInfo();
        if (!current) return;

        const saved = await getGeneratedSpine(current.cover);
        let index = Math.max(0, POSITIONS.indexOf(savedPosition(saved) || "center"));
        const rejected = new Set<SpinePosition>();
        const preview = createPreview(current, spineUrl(current.cover, POSITIONS[index]), "Spine preview", positionLabel(POSITIONS[index]));
        preview.editor.dataset.cover = current.cover;
        preview.editor.dataset.mode = "crop";
        preview.editor.setAttribute("aria-label", "Choose a spine crop");
        preview.reject.setAttribute("aria-label", "Reject this crop");
        preview.reject.title = "Reject this crop and show another";
        preview.retry.setAttribute("aria-label", "Show next crop");
        preview.retry.title = "Cycle left, center, and right detail crops";
        preview.accept.setAttribute("aria-label", "Use this spine crop");
        preview.accept.title = "Save this crop as the spine";
        feedback.appendChild(preview.editor);
        cropButton.textContent = "▥ Close cover cropper";
        status.textContent = "Using the confirmed cover directly — no AI generation or image credits.";

        const render = () => {
          const position = POSITIONS[index];
          preview.art.src = spineUrl(current.cover, position);
          preview.editor.dataset.position = position;
          preview.detail.textContent = positionLabel(position);
          preview.editorStatus.textContent = "× rejects • ↻ cycles • ✓ saves";
        };

        const advance = () => {
          for (let step = 1; step <= POSITIONS.length; step += 1) {
            const nextIndex = (index + step) % POSITIONS.length;
            if (!rejected.has(POSITIONS[nextIndex])) {
              index = nextIndex;
              render();
              return;
            }
          }
          rejected.clear();
          index = (index + 1) % POSITIONS.length;
          render();
          preview.editorStatus.textContent = "All three reviewed — starting the crops over.";
        };

        preview.reject.addEventListener("click", () => {
          rejected.add(POSITIONS[index]);
          advance();
        });

        preview.retry.addEventListener("click", () => advance());

        preview.accept.addEventListener("click", async () => {
          const position = POSITIONS[index];
          const image = spineUrl(current.cover, position);
          preview.accept.disabled = true;
          preview.editorStatus.textContent = "Saving spine…";
          try {
            await saveGeneratedSpine(current.cover, image);
            window.dispatchEvent(new CustomEvent("shelf-spine-generated", {
              detail: { coverUrl: current.cover, image, position },
            }));
            status.textContent = `${positionLabel(position)} saved for ${current.title}.`;
            cropButton.textContent = "▥ Change cover crop";
            preview.editor.remove();
          } catch {
            preview.accept.disabled = false;
            preview.editorStatus.textContent = "Could not save that crop on this device.";
          }
        });

        render();
      });

      feedback.append(aiButton, cropButton, status);
    };

    mount();
    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
    return () => observer.disconnect();
  }, []);

  return null;
}
