"use client";

import { useEffect } from "react";

const DB_NAME = "shelf-of-fame-art";
const STORE_NAME = "generated-spines";
const DB_VERSION = 1;
const POSITIONS = ["left", "center", "right"] as const;
type SpinePosition = (typeof POSITIONS)[number];

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

function selectedBookInfo() {
  const modal = document.querySelector<HTMLElement>(".modal");
  if (!modal) return null;
  const image = modal.querySelector<HTMLImageElement>(".cover-image");
  const title = modal.querySelector<HTMLElement>(".details h2")?.textContent?.trim() || "";
  const authorText = modal.querySelector<HTMLElement>(".details .author")?.textContent?.trim() || "";
  const author = authorText.replace(/^by\s+/i, "").trim();
  const cover = image?.currentSrc || image?.src || "";
  if (!cover || !title) return null;
  return { cover, title, author };
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

      const button = document.createElement("button");
      button.type = "button";
      button.className = "primary generate-spine-button";
      button.textContent = "▥ Choose spine crop";
      button.title = "Choose the best narrow detail crop from this cover";

      const status = document.createElement("div");
      status.className = "generate-spine-status";
      status.setAttribute("role", "status");
      status.textContent = "Uses the current cover directly — no AI generation or image credits.";

      void getGeneratedSpine(info.cover).then((saved) => {
        if (!button.isConnected || !saved) return;
        button.textContent = "▥ Change spine crop";
      });

      button.addEventListener("click", async () => {
        const existing = feedback.querySelector<HTMLElement>(".spine-crop-editor");
        if (existing) {
          existing.remove();
          button.textContent = "▥ Choose spine crop";
          status.textContent = "Uses the current cover directly — no AI generation or image credits.";
          return;
        }

        const current = selectedBookInfo();
        if (!current) return;

        const editor = document.createElement("div");
        editor.className = "spine-crop-editor";
        editor.dataset.cover = current.cover;
        editor.setAttribute("role", "group");
        editor.setAttribute("aria-label", "Choose a spine crop");

        const heading = document.createElement("div");
        heading.className = "spine-crop-heading";
        const headingTitle = document.createElement("strong");
        headingTitle.textContent = "Spine preview";
        const positionText = document.createElement("span");
        heading.append(headingTitle, positionText);

        const preview = document.createElement("div");
        preview.className = "spine-crop-preview";
        const art = document.createElement("img");
        art.alt = "";
        art.decoding = "async";
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
        reject.setAttribute("aria-label", "Reject this crop");
        reject.title = "Reject this crop and show another";

        const cycle = document.createElement("button");
        cycle.type = "button";
        cycle.className = "spine-crop-action spine-crop-cycle";
        cycle.textContent = "↻";
        cycle.setAttribute("aria-label", "Show next crop");
        cycle.title = "Cycle left, center, and right detail crops";

        const accept = document.createElement("button");
        accept.type = "button";
        accept.className = "spine-crop-action spine-crop-accept";
        accept.textContent = "✓";
        accept.setAttribute("aria-label", "Use this spine");
        accept.title = "Save this crop as the spine";

        actions.append(reject, cycle, accept);

        const editorStatus = document.createElement("div");
        editorStatus.className = "spine-crop-editor-status";
        editorStatus.setAttribute("role", "status");

        editor.append(heading, preview, actions, editorStatus);
        feedback.appendChild(editor);
        button.textContent = "▥ Close spine cropper";

        const rejected = new Set<SpinePosition>();
        const saved = await getGeneratedSpine(current.cover);
        let index = Math.max(0, POSITIONS.indexOf(savedPosition(saved) || "center"));

        const render = () => {
          const position = POSITIONS[index];
          art.src = spineUrl(current.cover, position);
          editor.dataset.position = position;
          positionText.textContent = positionLabel(position);
          editorStatus.textContent = "× rejects • ↻ cycles • ✓ saves";
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
          editorStatus.textContent = "All three reviewed — starting the crops over.";
        };

        reject.addEventListener("click", () => {
          rejected.add(POSITIONS[index]);
          advance();
        });

        cycle.addEventListener("click", () => advance());

        accept.addEventListener("click", async () => {
          const position = POSITIONS[index];
          const image = spineUrl(current.cover, position);
          accept.disabled = true;
          editorStatus.textContent = "Saving spine…";
          try {
            await saveGeneratedSpine(current.cover, image);
            window.dispatchEvent(new CustomEvent("shelf-spine-generated", {
              detail: { coverUrl: current.cover, image, position },
            }));
            status.textContent = `${positionLabel(position)} saved for ${current.title}.`;
            button.textContent = "▥ Change spine crop";
            editor.remove();
          } catch {
            accept.disabled = false;
            editorStatus.textContent = "Could not save that crop on this device.";
          }
        });

        render();
      });

      feedback.append(button, status);
    };

    mount();
    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
    return () => observer.disconnect();
  }, []);

  return null;
}
