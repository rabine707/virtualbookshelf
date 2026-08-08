"use client";

import { useEffect } from "react";

const LIBRARY_KEY = "shelf-of-fame-library-v1";

type StoredBook = {
  id?: string;
  title?: string;
  author?: string;
  asin?: string;
  preferredCover?: { url?: string; source?: string };
} & Record<string, unknown>;

type AudibleLookup = {
  asin?: string | null;
  coverUrl?: string | null;
  coverSource?: string | null;
};

function normalize(value?: string) {
  return (value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function identity(title: string, author: string) {
  return `${normalize(title)}::${normalize(author)}`;
}

function persistMatch(title: string, author: string, result: AudibleLookup) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LIBRARY_KEY) || "[]");
    if (!Array.isArray(parsed)) return;
    const key = identity(title, author);
    const next = (parsed as StoredBook[]).map((book) => {
      if (identity(book.title || "", book.author || "") !== key) return book;
      return {
        ...book,
        asin: book.asin || result.asin || undefined,
        preferredCover: result.coverUrl
          ? { url: result.coverUrl, source: result.coverSource || "Audible" }
          : book.preferredCover,
      };
    });
    window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
  } catch {
    // The live fallback can still display even if storage is unavailable.
  }
}

function injectCover(modal: Element, title: string, result: AudibleLookup) {
  if (!result.coverUrl) return;
  const cover = modal.querySelector<HTMLElement>(".cover");
  if (!cover) return;

  let image = cover.querySelector<HTMLImageElement>('img[data-audible-fallback="1"]');
  const existing = cover.querySelector<HTMLImageElement>(".cover-image");
  if (existing?.src) return;

  if (!image) {
    image = document.createElement("img");
    image.className = "cover-image";
    image.setAttribute("data-audible-fallback", "1");
    image.alt = `Cover of ${title}`;
    image.loading = "eager";
    image.decoding = "async";
    cover.appendChild(image);
  }
  image.src = result.coverUrl;

  const sourceLabels = [...modal.querySelectorAll("dt")].find((node) => node.textContent?.trim() === "Cover source");
  if (!sourceLabels) {
    const dl = modal.querySelector("dl");
    if (dl) {
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = "Cover source";
      dd.textContent = result.coverSource || "Audible";
      dl.append(dt, dd);
    }
  }
}

function fixFinishedButton(modal: Element) {
  const matchText = modal.querySelector(".cover-picker-heading span")?.textContent?.trim() || "";
  if (!/^0\s+matches?$/i.test(matchText)) return;

  const buttons = [...modal.querySelectorAll<HTMLButtonElement>("button")];
  const button = buttons.find((node) => node.textContent?.trim() === "More editions searched");
  if (button) button.textContent = "No more covers found";
}

export default function AudibleCoverEnricher() {
  useEffect(() => {
    const inFlight = new Set<string>();
    const completed = new Set<string>();

    async function enrich() {
      const modal = document.querySelector(".modal");
      if (!modal) return;

      fixFinishedButton(modal);

      if (modal.querySelector(".cover-image")) return;
      const title = modal.querySelector(".details h2")?.textContent?.trim() || "";
      const authorText = modal.querySelector(".details .author")?.textContent?.trim() || "";
      const author = authorText.replace(/^by\s+/i, "").trim();
      if (!title) return;

      const key = identity(title, author);
      if (inFlight.has(key) || completed.has(key)) return;
      inFlight.add(key);

      try {
        const params = new URLSearchParams({ title, author });
        const response = await fetch(`/api/asin?${params.toString()}`, { cache: "no-store" });
        const result = response.ok ? await response.json() as AudibleLookup : null;
        if (!result?.asin && !result?.coverUrl) return;

        persistMatch(title, author, result);
        injectCover(modal, title, result);
        completed.add(key);
      } catch {
        // Audible is only a fallback; normal cover search remains untouched.
      } finally {
        inFlight.delete(key);
      }
    }

    const observer = new MutationObserver(() => { void enrich(); });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    void enrich();

    return () => observer.disconnect();
  }, []);

  return null;
}
