"use client";

import { useEffect } from "react";

const LIBRARY_KEY = "shelf-of-fame-library-v1";
const MISS_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const CONCURRENCY = 2;
const REQUEST_GAP_MS = 500;

type StoredBook = {
  id?: string;
  title?: string;
  author?: string;
  romanceioId?: string;
  romanceioCoverUrl?: string;
  romanceioCheckedAt?: number;
  romanceioNoMatch?: boolean;
  preferredCover?: { url?: string; source?: string };
  coverFeedback?: {
    accepted?: string;
    rejected?: string[];
    wrongEdition?: string[];
  };
} & Record<string, unknown>;

type RomanceLookup = {
  url?: string | null;
  source?: string | null;
  discoveredRomanceioId?: string | null;
};

type SavedMatch = {
  title: string;
  author: string;
  id?: string;
  url: string;
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

function readLibrary(): StoredBook[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LIBRARY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed as StoredBook[] : [];
  } catch {
    return [];
  }
}

function isManuallyChosen(book: StoredBook) {
  return Boolean(book.coverFeedback?.accepted);
}

function wasRejected(book: StoredBook, url: string) {
  return new Set([
    ...(book.coverFeedback?.rejected || []),
    ...(book.coverFeedback?.wrongEdition || []),
  ]).has(url);
}

function needsRomanceLookup(book: StoredBook) {
  if (!book.title?.trim()) return false;
  if (isManuallyChosen(book)) return false;

  if (book.romanceioId && book.romanceioCoverUrl) return false;

  if (book.romanceioNoMatch && book.romanceioCheckedAt) {
    if (Date.now() - book.romanceioCheckedAt < MISS_TTL_MS) return false;
  }

  return true;
}

function persistOutcome(title: string, author: string, result: RomanceLookup | null) {
  const books = readLibrary();
  if (!books.length) return;

  const key = identity(title, author);
  const checkedAt = Date.now();
  const url = result?.url || undefined;
  const id = result?.discoveredRomanceioId || undefined;

  const next = books.map((book) => {
    if (identity(book.title || "", book.author || "") !== key) return book;

    const rejected = url ? wasRejected(book, url) : false;
    const manuallyChosen = isManuallyChosen(book);

    return {
      ...book,
      romanceioId: id || book.romanceioId,
      romanceioCoverUrl: url || book.romanceioCoverUrl,
      romanceioCheckedAt: checkedAt,
      romanceioNoMatch: !url && !id,
      preferredCover: url && !rejected && !manuallyChosen
        ? { url, source: "Romance.io" }
        : book.preferredCover,
    };
  });

  try {
    window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
  } catch {
    // Shelf injection still works for this session if browser storage is unavailable.
  }
}

function repairSavedMatches(savedMatches: Map<string, SavedMatch>) {
  if (!savedMatches.size) return;
  const books = readLibrary();
  if (!books.length) return;

  let changed = false;
  const next = books.map((book) => {
    const match = savedMatches.get(identity(book.title || "", book.author || ""));
    if (!match) return book;

    const rejected = wasRejected(book, match.url);
    const manuallyChosen = isManuallyChosen(book);
    const alreadySaved = book.romanceioId === match.id
      && book.romanceioCoverUrl === match.url
      && (manuallyChosen || rejected || book.preferredCover?.url === match.url);
    if (alreadySaved) return book;

    changed = true;
    return {
      ...book,
      romanceioId: match.id || book.romanceioId,
      romanceioCoverUrl: match.url,
      romanceioCheckedAt: book.romanceioCheckedAt || Date.now(),
      romanceioNoMatch: false,
      preferredCover: !manuallyChosen && !rejected
        ? { url: match.url, source: "Romance.io" }
        : book.preferredCover,
    };
  });

  if (!changed) return;
  try {
    window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures; the visual shelf remains usable.
  }
}

function matchingShelfButton(title: string, author: string) {
  const wanted = `${title} — ${author}`;
  return [...document.querySelectorAll<HTMLButtonElement>("button.book")]
    .find((button) => button.title === wanted) || null;
}

function injectShelfCover(title: string, author: string, url: string) {
  const button = matchingShelfButton(title, author);
  if (!button) return;

  let image = button.querySelector<HTMLImageElement>(".book-cover-art");
  if (!image) {
    image = document.createElement("img");
    image.className = "book-cover-art";
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    button.insertBefore(image, button.firstChild);
  }

  image.setAttribute("data-romance-shelf", "1");
  if (image.src !== url) image.src = url;
  button.classList.add("has-cover");
}

function injectOpenModal(title: string, author: string, url: string) {
  const modal = document.querySelector(".modal");
  if (!modal) return;

  const modalTitle = modal.querySelector(".details h2")?.textContent?.trim() || "";
  const modalAuthor = (modal.querySelector(".details .author")?.textContent || "")
    .replace(/^by\s+/i, "")
    .trim();
  if (identity(modalTitle, modalAuthor) !== identity(title, author)) return;

  const cover = modal.querySelector<HTMLElement>(".cover");
  if (!cover) return;

  let image = cover.querySelector<HTMLImageElement>(".cover-image");
  if (!image) {
    image = document.createElement("img");
    image.className = "cover-image";
    image.alt = `Cover of ${title}`;
    image.loading = "eager";
    image.decoding = "async";
    cover.appendChild(image);
  }
  image.setAttribute("data-romance-shelf", "1");
  image.src = url;
}

function injectSavedMatches(savedMatches: Map<string, SavedMatch>) {
  for (const match of savedMatches.values()) {
    const latestBook = readLibrary().find((book) => identity(book.title || "", book.author || "") === identity(match.title, match.author));
    if (latestBook && (isManuallyChosen(latestBook) || wasRejected(latestBook, match.url))) continue;
    injectShelfCover(match.title, match.author, match.url);
    injectOpenModal(match.title, match.author, match.url);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function RomanceShelfEnricher() {
  useEffect(() => {
    let stopped = false;
    let active = 0;
    const queued = new Set<string>();
    const completed = new Set<string>();
    const queue: StoredBook[] = [];
    const savedMatches = new Map<string, SavedMatch>();

    function rememberExistingMatches() {
      for (const book of readLibrary()) {
        const url = book.romanceioCoverUrl
          || (book.preferredCover?.source === "Romance.io" ? book.preferredCover.url : undefined);
        if (!book.title || !url) continue;
        savedMatches.set(identity(book.title, book.author || ""), {
          title: book.title,
          author: book.author || "",
          id: book.romanceioId,
          url,
        });
      }
    }

    async function processBook(book: StoredBook) {
      const title = book.title?.trim() || "";
      const author = book.author?.trim() || "";
      const key = identity(title, author);
      if (!title || stopped) return;

      try {
        const params = new URLSearchParams({
          title,
          author,
          shelfFill: `${Date.now()}`,
        });
        if (book.romanceioId) params.set("romanceio", book.romanceioId);

        const response = await fetch(`/api/romance-cover?${params.toString()}`, { cache: "no-store" });
        const result = response.ok ? await response.json() as RomanceLookup : null;

        persistOutcome(title, author, result);

        if (result?.url) {
          const match: SavedMatch = {
            title,
            author,
            id: result.discoveredRomanceioId || book.romanceioId,
            url: result.url,
          };
          savedMatches.set(key, match);
          injectShelfCover(title, author, match.url);
          injectOpenModal(title, author, match.url);
        }
      } catch {
        // Romance.io is opportunistic; a failed lookup stays eligible for a later session.
      } finally {
        completed.add(key);
        queued.delete(key);
        await delay(REQUEST_GAP_MS);
      }
    }

    function pump() {
      if (stopped) return;
      while (active < CONCURRENCY && queue.length) {
        const book = queue.shift();
        if (!book) break;
        active += 1;
        void processBook(book).finally(() => {
          active -= 1;
          pump();
        });
      }
    }

    function enqueueMissing() {
      if (stopped) return;
      rememberExistingMatches();
      injectSavedMatches(savedMatches);

      const books = readLibrary();
      for (const book of books) {
        const key = identity(book.title || "", book.author || "");
        if (!key || queued.has(key) || completed.has(key) || !needsRomanceLookup(book)) continue;
        queued.add(key);
        queue.push(book);
      }
      pump();
    }

    const initialTimer = window.setTimeout(enqueueMissing, 1400);
    const scanTimer = window.setInterval(enqueueMissing, 20000);
    const repairTimer = window.setInterval(() => {
      repairSavedMatches(savedMatches);
      injectSavedMatches(savedMatches);
    }, 5000);

    const observer = new MutationObserver(() => {
      injectSavedMatches(savedMatches);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      stopped = true;
      window.clearTimeout(initialTimer);
      window.clearInterval(scanTimer);
      window.clearInterval(repairTimer);
      observer.disconnect();
    };
  }, []);

  return null;
}
