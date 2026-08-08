"use client";

import { useEffect } from "react";

const LIBRARY_KEY = "shelf-of-fame-library-v1";
const REOPEN_KEY = "shelf-of-fame-web-cover-reopen-v1";

type StoredBook = {
  id?: string;
  title?: string;
  author?: string;
  preferredCover?: { url?: string; source?: string };
  coverFeedback?: {
    accepted?: string;
    rejected?: string[];
    wrongEdition?: string[];
  };
  webCoverPageUrl?: string;
  webCoverTitle?: string;
} & Record<string, unknown>;

type WebCoverResult = {
  url: string;
  thumbnailUrl?: string;
  source?: string;
  title?: string;
  pageUrl?: string | null;
  publisher?: string | null;
};

type WebCoverResponse = {
  results?: WebCoverResult[];
  error?: string;
  setupRequired?: boolean;
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

function modalBook(modal: Element) {
  const title = modal.querySelector(".details h2")?.textContent?.trim() || "";
  const author = (modal.querySelector(".details .author")?.textContent || "")
    .replace(/^by\s+/i, "")
    .trim();
  return { title, author, key: identity(title, author) };
}

function readLibrary(): StoredBook[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LIBRARY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed as StoredBook[] : [];
  } catch {
    return [];
  }
}

function persistWebCover(title: string, author: string, result: WebCoverResult) {
  const key = identity(title, author);
  const books = readLibrary();
  if (!books.length) return false;

  let changed = false;
  const next = books.map((book) => {
    if (identity(book.title || "", book.author || "") !== key) return book;
    changed = true;
    return {
      ...book,
      preferredCover: { url: result.url, source: "Web image" },
      coverFeedback: {
        ...book.coverFeedback,
        accepted: result.url,
        rejected: (book.coverFeedback?.rejected || []).filter((url) => url !== result.url),
        wrongEdition: (book.coverFeedback?.wrongEdition || []).filter((url) => url !== result.url),
      },
      webCoverPageUrl: result.pageUrl || undefined,
      webCoverTitle: result.title || undefined,
    };
  });

  if (!changed) return false;
  try {
    window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

function setPanelMessage(panel: HTMLElement, message: string, isError = false) {
  const status = panel.querySelector<HTMLElement>("[data-web-cover-status]");
  if (!status) return;
  status.textContent = message;
  status.style.opacity = isError ? "1" : "0.78";
}

function clearResults(panel: HTMLElement) {
  panel.querySelector<HTMLElement>("[data-web-cover-results]")?.replaceChildren();
}

function applyAndReload(modal: Element, result: WebCoverResult) {
  const { title, author, key } = modalBook(modal);
  if (!title || !persistWebCover(title, author, result)) return;

  try {
    window.sessionStorage.setItem(REOPEN_KEY, key);
  } catch {
    // Reload still preserves the cover even when sessionStorage is unavailable.
  }

  const image = modal.querySelector<HTMLImageElement>(".cover-image");
  if (image) image.src = result.url;
  const panel = modal.querySelector<HTMLElement>("[data-web-cover-panel]");
  if (panel) setPanelMessage(panel, "✓ Applied to shelf — loading saved choice…");

  window.setTimeout(() => window.location.reload(), 180);
}

function renderResults(modal: Element, panel: HTMLElement, results: WebCoverResult[]) {
  const holder = panel.querySelector<HTMLElement>("[data-web-cover-results]");
  if (!holder) return;
  holder.replaceChildren();

  if (!results.length) {
    setPanelMessage(panel, "No web images found for this search.");
    return;
  }

  for (const [index, result] of results.entries()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "web-cover-result";
    button.title = result.title || `Web cover result ${index + 1}`;
    button.setAttribute("aria-label", `Use web image ${index + 1} on the shelf`);

    const image = document.createElement("img");
    image.src = result.thumbnailUrl || result.url;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";

    const label = document.createElement("span");
    label.textContent = result.publisher || "Web";

    button.append(image, label);
    button.addEventListener("click", () => applyAndReload(modal, result));
    holder.appendChild(button);
  }

  setPanelMessage(panel, `${results.length} web result${results.length === 1 ? "" : "s"} — tap one to use it on your shelf.`);
}

async function search(modal: Element, panel: HTMLElement, mode: "covers" | "alternate" | "custom") {
  const { title, author } = modalBook(modal);
  if (!title) return;

  clearResults(panel);
  setPanelMessage(panel, mode === "custom"
    ? "Searching custom, special-edition, and Etsy-style covers…"
    : mode === "alternate"
      ? "Searching alternate and special editions…"
      : "Searching the web for book covers…");

  for (const button of panel.querySelectorAll<HTMLButtonElement>("button[data-web-mode]")) button.disabled = true;

  try {
    const params = new URLSearchParams({ title, author, mode });
    const response = await fetch(`/api/web-covers?${params.toString()}`, { cache: "no-store" });
    const data = await response.json() as WebCoverResponse;

    if (data.setupRequired) {
      setPanelMessage(panel, "Web cover search is ready, but the Brave Search API key still needs to be added in Vercel.", true);
      return;
    }
    if (!response.ok) {
      setPanelMessage(panel, data.error || "Web image search could not finish.", true);
      return;
    }

    renderResults(modal, panel, data.results || []);
  } catch {
    setPanelMessage(panel, "Web image search could not finish.", true);
  } finally {
    for (const button of panel.querySelectorAll<HTMLButtonElement>("button[data-web-mode]")) button.disabled = false;
  }
}

function hideLegacySearchControls(modal: Element) {
  const picker = modal.querySelector<HTMLElement>(".cover-picker");
  if (!picker) return;

  for (const button of picker.querySelectorAll<HTMLButtonElement>("button")) {
    const text = button.textContent?.replace(/\s+/g, " ").trim() || "";
    if (/^(Search more covers|Searching more editions…|More editions searched)$/i.test(text)) {
      button.hidden = true;
      button.setAttribute("aria-hidden", "true");
    }
  }

  const note = picker.querySelector<HTMLElement>(".cover-picker-note");
  if (note) {
    note.hidden = true;
    note.setAttribute("aria-hidden", "true");
  }
}

function buildPanel(modal: Element) {
  hideLegacySearchControls(modal);
  if (modal.querySelector("[data-web-cover-panel]")) return;
  const picker = modal.querySelector<HTMLElement>(".cover-picker");
  if (!picker) return;

  const panel = document.createElement("section");
  panel.className = "web-cover-panel";
  panel.setAttribute("data-web-cover-panel", "1");
  panel.innerHTML = `
    <div class="web-cover-heading">
      <strong>Browse web covers</strong>
      <span>5 images at a time</span>
    </div>
    <div class="web-cover-modes">
      <button type="button" data-web-mode="covers">Web covers</button>
      <button type="button" data-web-mode="alternate">Alternate editions</button>
      <button type="button" data-web-mode="custom">Custom & Etsy</button>
    </div>
    <div class="web-cover-results" data-web-cover-results></div>
    <p class="web-cover-status" data-web-cover-status>Search the wider web when the database covers aren't what you want.</p>
  `;

  panel.querySelector<HTMLButtonElement>('[data-web-mode="covers"]')
    ?.addEventListener("click", () => void search(modal, panel, "covers"));
  panel.querySelector<HTMLButtonElement>('[data-web-mode="alternate"]')
    ?.addEventListener("click", () => void search(modal, panel, "alternate"));
  panel.querySelector<HTMLButtonElement>('[data-web-mode="custom"]')
    ?.addEventListener("click", () => void search(modal, panel, "custom"));

  picker.appendChild(panel);
}

function reopenSavedBook() {
  let wanted = "";
  try {
    wanted = window.sessionStorage.getItem(REOPEN_KEY) || "";
    if (wanted) window.sessionStorage.removeItem(REOPEN_KEY);
  } catch {
    return;
  }
  if (!wanted) return;

  const attempt = (tries: number) => {
    for (const button of document.querySelectorAll<HTMLButtonElement>("button.book")) {
      const raw = button.title || "";
      const splitAt = raw.lastIndexOf(" — ");
      if (splitAt < 0) continue;
      const title = raw.slice(0, splitAt);
      const author = raw.slice(splitAt + 3);
      if (identity(title, author) === wanted) {
        button.click();
        return;
      }
    }
    if (tries < 20) window.setTimeout(() => attempt(tries + 1), 120);
  };
  window.setTimeout(() => attempt(0), 250);
}

export default function WebCoverEnricher() {
  useEffect(() => {
    let raf = 0;
    const refresh = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const modal = document.querySelector(".modal");
        if (modal) buildPanel(modal);
      });
    };

    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true });
    refresh();
    reopenSavedBook();

    return () => {
      observer.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
