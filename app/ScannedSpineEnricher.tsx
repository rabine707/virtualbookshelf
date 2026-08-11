"use client";

import { useEffect } from "react";

const STORAGE_KEY = "shelf-of-fame-library-v1";

type StoredBook = {
  title?: unknown;
  author?: unknown;
  scannedSpine?: unknown;
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

function readScannedSpines() {
  const byIdentity = new Map<string, string>();
  const byTitle = new Map<string, string | null>();
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
      if (!title || !spine.startsWith("data:image/")) continue;

      byIdentity.set(`${normalize(title)}::${normalize(author)}`, spine);
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
    scan();

    return () => {
      observer.disconnect();
      window.removeEventListener("focus", scan);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
