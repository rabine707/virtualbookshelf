"use client";

import { useEffect } from "react";

const DB_NAME = "shelf-of-fame-art";
const STORE_NAME = "generated-spines";
const DB_VERSION = 1;
const SPINE_PROVIDER = "Gemini";

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

export default function SpineGenerator() {
  useEffect(() => {
    let busy = false;

    const mount = () => {
      const modal = document.querySelector<HTMLElement>(".modal");
      if (!modal) return;
      const feedback = modal.querySelector<HTMLElement>('[aria-label="Cover feedback"]');
      if (!feedback || feedback.querySelector(".generate-spine-button")) return;

      const info = selectedBookInfo();
      if (!info) return;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "primary generate-spine-button";
      button.textContent = "✦ Generate spine art";
      button.title = "Recompose this confirmed cover into narrow Gemini spine artwork";

      const status = document.createElement("div");
      status.className = "generate-spine-status";
      status.setAttribute("role", "status");

      button.addEventListener("click", async () => {
        if (busy) return;
        const current = selectedBookInfo();
        if (!current) return;

        busy = true;
        button.disabled = true;
        button.textContent = "✦ Generating…";
        status.textContent = `${SPINE_PROVIDER} is recomposing the confirmed cover into narrow spine artwork…`;

        try {
          const response = await fetch("/api/generate-spine", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(current),
          });
          const result = await response.json() as { image?: string; error?: string; needsApiKey?: boolean; model?: string };
          if (!response.ok || !result.image) {
            throw new Error(result.needsApiKey
              ? "AI spine generation needs GEMINI_API_KEY configured in Vercel."
              : result.error || "Spine generation failed.");
          }

          await saveGeneratedSpine(current.cover, result.image);
          window.dispatchEvent(new CustomEvent("shelf-spine-generated", {
            detail: { coverUrl: current.cover, image: result.image },
          }));
          status.textContent = `${SPINE_PROVIDER} spine saved on this device.`;
          button.textContent = "↻ Regenerate spine art";
        } catch (error) {
          status.textContent = error instanceof Error ? error.message : "Spine generation failed.";
          button.textContent = "✦ Generate spine art";
        } finally {
          busy = false;
          button.disabled = false;
        }
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
