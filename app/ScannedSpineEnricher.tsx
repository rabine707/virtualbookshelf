"use client";

import { useEffect } from "react";

const STORAGE_KEY = "shelf-of-fame-library-v1";
const SOURCE_STORAGE_KEY = "shelf-of-fame-spine-source-v1";

type StoredBook = {
  title?: unknown;
  author?: unknown;
  scannedSpine?: unknown;
};

type SpineSourcePreference = {
  mode?: unknown;
  coverUrl?: unknown;
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function splitBookIdentity(button: HTMLButtonElement) {
  const raw = button.title || "";
  const splitAt = raw.lastIndexOf(" — ");
  if (splitAt < 0) return { title: raw.trim(), author: "" };
  return {
    title: raw.slice(0, splitAt).trim(),
    author: raw.slice(splitAt + 3).trim(),
  };
}

function readCoverBasedIdentities() {
  const result = new Set<string>();
  try {
    const raw = window.localStorage.getItem(SOURCE_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return result;
    for (const [key, value] of Object.entries(parsed)) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const preference = value as SpineSourcePreference;
      if (preference.mode === "cover") result.add(key);
    }
  } catch {
    // Keep photographed spines as the safe default.
  }
  return result;
}

function readScannedSpines() {
  const byIdentity = new Map<string, string>();
  const byTitle = new Map<string, string | null>();
  const coverBased = readCoverBasedIdentities();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return { byIdentity, byTitle };

    for (const value of parsed) {
      if (!value || typeof value !== "object") continue;
      const book = value as StoredBook;
      const title = typeof book.title === "string" ? book.title.trim() : "";
      const author = typeof book.author === "string" ? book.author.trim() : "";
      const spine = typeof book.scannedSpine === "string" ? book.scannedSpine.trim() : "";
      const identity = `${normalize(title)}::${normalize(author)}`;
      if (!title || !spine.startsWith("data:image/") || coverBased.has(identity)) continue;

      byIdentity.set(identity, spine);
      const titleKey = normalize(title);
      if (!byTitle.has(titleKey)) byTitle.set(titleKey, spine);
      else if (byTitle.get(titleKey) !== spine) byTitle.set(titleKey, null);
    }
  } catch {
    // Ignore malformed browser storage and leave the normal shelf renderer intact.
  }
  return { byIdentity, byTitle };
}

function applyScannedSpine(button: HTMLButtonElement, image: string | null | undefined) {
  const current = button.querySelector<HTMLImageElement>(".scanned-spine-art");
  if (!image) {
    button.querySelector(".scanned-spine")?.remove();
    button.classList.remove("has-scanned-spine");
    return;
  }
  if (current?.src === image) return;

  button.querySelector(".scanned-spine")?.remove();
  const wrapper = document.createElement("span");
  wrapper.className = "scanned-spine";
  wrapper.setAttribute("aria-hidden", "true");

  const art = document.createElement("img");
  art.className = "scanned-spine-art";
  art.src = image;
  art.alt = "";
  art.decoding = "async";

  wrapper.appendChild(art);
  button.appendChild(wrapper);
  button.classList.add("has-scanned-spine");
}

export default function ScannedSpineEnricher() {
  useEffect(() => {
    let raf = 0;
    const scan = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const { byIdentity, byTitle } = readScannedSpines();
        for (const button of document.querySelectorAll<HTMLButtonElement>("button.book")) {
          const identity = splitBookIdentity(button);
          const exact = byIdentity.get(`${normalize(identity.title)}::${normalize(identity.author)}`);
          const titleOnly = byTitle.get(normalize(identity.title));
          applyScannedSpine(button, exact || titleOnly || undefined);
        }
      });
    };

    const observer = new MutationObserver(scan);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["title", "class"],
    });
    window.addEventListener("focus", scan);
    window.addEventListener("shelf-spine-source-changed", scan);
    scan();

    return () => {
      observer.disconnect();
      window.removeEventListener("focus", scan);
      window.removeEventListener("shelf-spine-source-changed", scan);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
