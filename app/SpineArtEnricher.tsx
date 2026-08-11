"use client";

import { useEffect } from "react";

const DB_NAME = "shelf-of-fame-art";
const STORE_NAME = "generated-spines";
const DB_VERSION = 1;
const MODE_KEY_PREFIX = "mode:";

type SpinePosition = "left" | "center" | "right";
type SpineRenderMode = "integrated" | "overlay";

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

async function getGeneratedSpineMode(coverUrl: string): Promise<SpineRenderMode> {
  try {
    const db = await openDb();
    const value = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(`${MODE_KEY_PREFIX}${coverUrl}`);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return value === "integrated" ? "integrated" : "overlay";
  } catch {
    return "overlay";
  }
}

function splitBookIdentity(button: HTMLButtonElement) {
  const raw = button.title || "";
  const splitAt = raw.lastIndexOf(" — ");
  if (splitAt < 0) return { title: raw, author: "" };
  return { title: raw.slice(0, splitAt).trim(), author: raw.slice(splitAt + 3).trim() };
}

function spineDisplayTitle(title: string) {
  let cleaned = title.trim();
  cleaned = cleaned.replace(/\s*[\(\[][^\)\]]*(?:book|volume|vol\.?|series|#)\s*[^\)\]]*[\)\]]\s*$/i, "").trim();
  if (cleaned.length > 28) {
    const primary = cleaned.split(/\s+(?:—|–|-|:)\s+|:\s+/)[0]?.trim();
    if (primary && primary.length >= 5) cleaned = primary;
  }
  if (cleaned.length > 34) cleaned = `${cleaned.slice(0, 31).trim()}…`;
  return cleaned || title.trim();
}

function spineDisplayAuthor(author: string) {
  const cleaned = author.replace(/\s*\([^\)]*\)\s*$/g, "").replace(/\s+/g, " ").trim();
  if (cleaned.length <= 22) return cleaned;
  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length > 2) return `${parts[0]} ${parts[parts.length - 1]}`;
  return `${cleaned.slice(0, 20).trim()}…`;
}

function titleScale(title: string) {
  if (title.length > 27) return "compact";
  if (title.length > 18) return "medium";
  return "normal";
}

function generatedSpineUrl(coverUrl: string, position: SpinePosition = "center") {
  return `/api/spine?v=3&position=${position}&cover=${encodeURIComponent(coverUrl)}`;
}

function storedPosition(image: string): SpinePosition | "custom" {
  try {
    const url = new URL(image, window.location.origin);
    const value = url.searchParams.get("position");
    if (value === "left" || value === "center" || value === "right") return value;
  } catch {
    // Older saved AI/data URL spines remain valid custom artwork.
  }
  return "custom";
}

function applyTypographyMode(spine: HTMLElement, renderMode: SpineRenderMode) {
  spine.dataset.typography = renderMode;
  const hidden = renderMode === "integrated";
  const title = spine.querySelector<HTMLElement>(".generated-spine-title");
  const author = spine.querySelector<HTMLElement>(".generated-spine-author");
  if (title) title.hidden = hidden;
  if (author) author.hidden = hidden;
}

function buildSpine(button: HTMLButtonElement, sourceImage: HTMLImageElement) {
  const src = sourceImage.currentSrc || sourceImage.src;
  if (!src) return;
  const existing = button.querySelector<HTMLElement>(".generated-spine");
  if (existing?.dataset.source === src) return;
  existing?.remove();

  const identity = splitBookIdentity(button);
  const title = spineDisplayTitle(identity.title);
  const author = spineDisplayAuthor(identity.author);
  const spine = document.createElement("span");
  spine.className = "generated-spine";
  spine.dataset.source = src;
  spine.dataset.titleScale = titleScale(title);
  spine.dataset.typography = "overlay";
  spine.setAttribute("aria-hidden", "true");

  const art = document.createElement("img");
  art.className = "generated-spine-art generated-spine-art-dedicated";
  art.src = generatedSpineUrl(src);
  art.alt = "";
  art.decoding = "async";
  art.loading = "lazy";
  art.addEventListener("error", () => {
    art.src = src;
    art.classList.add("generated-spine-art-fallback");
  }, { once: true });

  getGeneratedSpine(src).then(async (saved) => {
    if (!saved || !art.isConnected) return;
    art.src = saved;
    art.classList.add("generated-spine-art-picked");
    art.classList.remove("generated-spine-art-fallback");
    button.dataset.spineCrop = storedPosition(saved);
    applyTypographyMode(spine, await getGeneratedSpineMode(src));
  });

  const wash = document.createElement("span");
  wash.className = "generated-spine-wash";
  const textLane = document.createElement("span");
  textLane.className = "generated-spine-text-lane";
  const topRule = document.createElement("span");
  topRule.className = "generated-spine-rule generated-spine-rule-top";
  const titleNode = document.createElement("span");
  titleNode.className = "generated-spine-title";
  titleNode.textContent = title;
  const authorNode = document.createElement("span");
  authorNode.className = "generated-spine-author";
  authorNode.textContent = author;
  const bottomRule = document.createElement("span");
  bottomRule.className = "generated-spine-rule generated-spine-rule-bottom";

  spine.append(art, wash, textLane, topRule, titleNode, authorNode, bottomRule);
  button.appendChild(spine);
  button.dataset.generatedSpine = "1";
  // Geometry is shelf-controlled. The generated image is only the printed texture.
  // Match the regular shelf-book height instead of inheriting the source image ratio.
  button.style.setProperty("--generated-spine-width", "48px");
  button.style.setProperty("--generated-spine-height", "204px");
}

function wireBook(button: HTMLButtonElement) {
  const image = button.querySelector<HTMLImageElement>(".book-cover-art");
  if (!image) {
    button.querySelector(".generated-spine")?.remove();
    delete button.dataset.generatedSpine;
    delete button.dataset.spineCrop;
    button.style.removeProperty("--generated-spine-width");
    button.style.removeProperty("--generated-spine-height");
    return;
  }
  const refresh = () => buildSpine(button, image);
  if (image.dataset.spineArtWired !== "1") {
    image.dataset.spineArtWired = "1";
    image.addEventListener("load", refresh);
    image.addEventListener("error", refresh);
  }
  refresh();
}

export default function SpineArtEnricher() {
  useEffect(() => {
    let raf = 0;
    const scan = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        for (const button of document.querySelectorAll<HTMLButtonElement>("button.book")) wireBook(button);
      });
    };

    const onGenerated = (event: Event) => {
      const detail = (event as CustomEvent<{
        coverUrl: string;
        image: string;
        position?: SpinePosition;
        renderMode?: SpineRenderMode;
      }>).detail;
      if (!detail) return;
      for (const button of document.querySelectorAll<HTMLButtonElement>("button.book")) {
        const cover = button.querySelector<HTMLImageElement>(".book-cover-art");
        const src = cover?.currentSrc || cover?.src;
        if (src !== detail.coverUrl) continue;
        const art = button.querySelector<HTMLImageElement>(".generated-spine-art-dedicated");
        const spine = button.querySelector<HTMLElement>(".generated-spine");
        if (art) {
          art.src = detail.image;
          art.classList.add("generated-spine-art-picked");
          art.classList.remove("generated-spine-art-fallback");
          button.dataset.spineCrop = detail.position || storedPosition(detail.image);
        }
        if (spine) applyTypographyMode(spine, detail.renderMode || "overlay");
      }
    };

    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src", "class"] });
    window.addEventListener("shelf-spine-generated", onGenerated);
    scan();
    return () => {
      observer.disconnect();
      window.removeEventListener("shelf-spine-generated", onGenerated);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
