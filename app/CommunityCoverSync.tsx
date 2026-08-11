"use client";

import { useEffect } from "react";

const SUPABASE_URL = "https://vrkuimrfdkejfhpxlwlf.supabase.co";
const SUPABASE_KEY = "sb_publishable_mf0u925xGBkP4iNgxSCjuQ_H4Dp8r1S";
const SESSION_KEY = "shelf-of-fame-supabase-session";
const LIBRARY_KEY = "shelf-of-fame-library-v1";
const PENDING_WEB_COVER_KEY = "shelf-of-fame-community-cover-submit-v1";

type Cover = { url: string; source?: string };
type CoverFeedback = { accepted?: string; rejected?: string[]; wrongEdition?: string[] };
type StoredBook = {
  id?: string;
  title?: string;
  author?: string;
  isbn?: string;
  asin?: string;
  preferredCover?: Cover;
  savedCovers?: Cover[];
  coverFeedback?: CoverFeedback;
} & Record<string, unknown>;

type ApprovedCover = {
  client_key: string;
  image_url: string;
  source?: string | null;
  confidence?: number | null;
};

type ModalBook = {
  title: string;
  author: string;
  isbn: string;
  asin: string;
};

function normalize(value?: string) {
  return (value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function identity(title?: string, author?: string) {
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

function accessToken() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SESSION_KEY) || "null") as { access_token?: string } | null;
    return parsed?.access_token || "";
  } catch {
    return "";
  }
}

function headers(token?: string) {
  return {
    apikey: SUPABASE_KEY,
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function detailValue(modal: Element, wanted: string) {
  for (const dt of modal.querySelectorAll<HTMLElement>(".details dt")) {
    if ((dt.textContent || "").trim().toLowerCase() !== wanted.toLowerCase()) continue;
    const value = dt.nextElementSibling?.textContent?.trim() || "";
    return /^(?:n\/a|not set|none|—|-)$/i.test(value) ? "" : value;
  }
  return "";
}

function modalBook(modal: Element): ModalBook | null {
  const title = modal.querySelector<HTMLElement>(".details h2")?.textContent?.trim() || "";
  const author = (modal.querySelector<HTMLElement>(".details .author")?.textContent || "")
    .replace(/^by\s+/i, "")
    .trim();
  if (!title || !author) return null;
  return {
    title,
    author,
    isbn: detailValue(modal, "ISBN"),
    asin: detailValue(modal, "ASIN") || detailValue(modal, "Audible ASIN"),
  };
}

function expandedSource(value: string) {
  const label = value.trim();
  if (label === "OL") return "Open Library";
  if (label === "Google") return "Google Books";
  if (label === "LT") return "LibraryThing";
  if (label === "Romance") return "Romance.io";
  return label || "User verified";
}

function clickedCover(target: Element, modal: Element): Cover | null {
  if (target.closest(".saved-cover-remove, .web-cover-result")) return null;

  const option = target.closest(".saved-cover-option, .cover-option");
  if (option) {
    const image = option.querySelector<HTMLImageElement>("img");
    if (!image?.src) return null;
    const label = option.querySelector<HTMLElement>("span")?.textContent || option.getAttribute("title") || "";
    return { url: image.currentSrc || image.src, source: expandedSource(label) };
  }

  const button = target.closest("button");
  const text = (button?.textContent || "").replace(/\s+/g, " ").trim();
  if (!/^(?:✓\s*)?(?:use this cover|correct cover)$/i.test(text)) return null;
  const image = modal.querySelector<HTMLImageElement>(".cover-image");
  if (!image?.src) return null;
  return {
    url: image.currentSrc || image.src,
    source: detailValue(modal, "Cover source") || "User verified",
  };
}

async function submitCoverChoice(book: ModalBook, cover: Cover) {
  const token = accessToken();
  if (!token || !book.title || !book.author || !/^https?:\/\//i.test(cover.url)) return false;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_user_cover_choice`, {
      method: "POST",
      headers: headers(token),
      keepalive: true,
      body: JSON.stringify({
        p_title: book.title,
        p_author: book.author,
        p_image_url: cover.url,
        p_source: cover.source || "User verified",
        p_isbn: book.isbn || null,
        p_asin: book.asin || null,
      }),
    });
    return response.ok;
  } catch {
    // Personal cover selection still works even if community sync is unavailable.
    return false;
  }
}

function queueCanonicalWebCover(book: ModalBook) {
  try {
    window.sessionStorage.setItem(PENDING_WEB_COVER_KEY, JSON.stringify({
      title: book.title,
      author: book.author,
    }));
  } catch {
    // The personal web-cover selection can still complete without session storage.
  }
}

async function flushCanonicalWebCover() {
  let pending: { title?: string; author?: string } | null = null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_WEB_COVER_KEY);
    if (!raw) return;
    pending = JSON.parse(raw) as { title?: string; author?: string };
  } catch {
    return;
  }

  if (!pending?.title || !pending?.author) return;
  const key = identity(pending.title, pending.author);
  const stored = readLibrary().find((book) => identity(book.title, book.author) === key);
  const cover = stored?.preferredCover;
  if (!cover?.url) return;

  const ok = await submitCoverChoice({
    title: String(stored?.title || pending.title),
    author: String(stored?.author || pending.author),
    isbn: String(stored?.isbn || ""),
    asin: String(stored?.asin || ""),
  }, cover);

  if (ok) {
    try { window.sessionStorage.removeItem(PENDING_WEB_COVER_KEY); } catch { /* optional */ }
  }
}

function sameCover(left?: Cover, right?: Cover) {
  return Boolean(left?.url && right?.url && left.url === right.url);
}

async function syncApprovedCovers() {
  const books = readLibrary();
  if (!books.length) return false;

  const requestBooks = books.slice(0, 500).map((book, index) => ({
    key: String(index),
    title: String(book.title || ""),
    author: String(book.author || ""),
    isbn: String(book.isbn || ""),
    asin: String(book.asin || ""),
  })).filter((book) => book.title && book.author);

  if (!requestBooks.length) return false;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_approved_covers_for_library`, {
      method: "POST",
      headers: headers(),
      cache: "no-store",
      body: JSON.stringify({ p_books: requestBooks }),
    });
    if (!response.ok) return false;
    const rows = await response.json() as ApprovedCover[];
    if (!Array.isArray(rows) || !rows.length) return false;

    let activated = false;
    let changed = false;
    const next = [...books];

    for (const row of rows) {
      const index = Number(row.client_key);
      if (!Number.isInteger(index) || index < 0 || index >= next.length || !row.image_url) continue;
      const book = next[index];
      if (!book) continue;

      const blocked = new Set([
        ...(book.coverFeedback?.rejected || []),
        ...(book.coverFeedback?.wrongEdition || []),
      ]);
      if (blocked.has(row.image_url)) continue;

      const hasPersonalChoice = Boolean(book.preferredCover?.url || book.coverFeedback?.accepted);
      if (hasPersonalChoice) continue;

      const communityCover: Cover = {
        url: row.image_url,
        source: row.source ? `Community · ${row.source}` : "Community verified",
      };
      const saved = Array.isArray(book.savedCovers) ? book.savedCovers : [];
      const savedCovers = saved.some((cover) => sameCover(cover, communityCover))
        ? saved
        : [communityCover, ...saved];

      next[index] = {
        ...book,
        preferredCover: communityCover,
        savedCovers,
      };
      activated = true;
      changed = true;
    }

    if (!changed) return false;
    window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
    return activated;
  } catch {
    return false;
  }
}

export default function CommunityCoverSync() {
  useEffect(() => {
    let stopped = false;
    let syncing = false;
    let lastLibrary = "";

    const checkLibrary = async () => {
      if (stopped || syncing) return;
      const current = window.localStorage.getItem(LIBRARY_KEY) || "";
      if (!current || current === lastLibrary) return;
      lastLibrary = current;
      syncing = true;
      const activated = await syncApprovedCovers();
      syncing = false;
      lastLibrary = window.localStorage.getItem(LIBRARY_KEY) || current;
      if (activated && !stopped) window.location.reload();
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const modal = target.closest(".modal");
      if (!modal) return;
      const book = modalBook(modal);
      if (!book) return;

      if (target.closest(".web-cover-result")) {
        queueCanonicalWebCover(book);
        return;
      }

      const cover = clickedCover(target, modal);
      if (!cover) return;
      void submitCoverChoice(book, cover);
    };

    void flushCanonicalWebCover();
    void checkLibrary();
    const interval = window.setInterval(() => {
      void flushCanonicalWebCover();
      void checkLibrary();
    }, 7000);
    const onFocus = () => {
      void flushCanonicalWebCover();
      void checkLibrary();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("click", handleClick, true);

    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  return null;
}
