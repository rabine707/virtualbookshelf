"use client";

import { useEffect } from "react";

const LIBRARY_KEY = "shelf-of-fame-library-v1";
const HISTORY_KEY = "shelf-of-fame-saved-cover-history-v1";
const SESSION_KEY = "shelf-of-fame-supabase-session";

type Cover = {
  url: string;
  source?: string;
};

type StoredBook = {
  title?: string;
  author?: string;
  preferredCover?: Cover;
  savedCovers?: Cover[];
  coverFeedback?: {
    accepted?: string;
    rejected?: string[];
    wrongEdition?: string[];
  };
} & Record<string, unknown>;

type SavedCoverHistory = Record<string, Cover[]>;

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
    const value = JSON.parse(window.localStorage.getItem(LIBRARY_KEY) || "[]");
    return Array.isArray(value) ? value as StoredBook[] : [];
  } catch {
    return [];
  }
}

function readHistory(): SavedCoverHistory {
  try {
    const value = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || "{}");
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as SavedCoverHistory
      : {};
  } catch {
    return {};
  }
}

function accessToken() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { access_token?: string };
    return parsed.access_token || "";
  } catch {
    return "";
  }
}

function uniqueCovers(covers: Cover[]) {
  const seen = new Set<string>();
  return covers.filter((cover) => {
    if (!cover?.url || seen.has(cover.url)) return false;
    seen.add(cover.url);
    return true;
  });
}

function sameCoverList(left: Cover[], right: Cover[]) {
  if (left.length !== right.length) return false;
  return left.every((cover, index) => cover.url === right[index]?.url && cover.source === right[index]?.source);
}

function historyFor(title: string, author: string) {
  return uniqueCovers(readHistory()[identity(title, author)] || []);
}

function rememberHistory(title: string, author: string, covers: Cover[]) {
  const key = identity(title, author);
  if (!key) return [];

  const history = readHistory();
  const current = uniqueCovers(history[key] || []);
  const next = uniqueCovers([...current, ...covers]);
  if (sameCoverList(current, next)) return current;

  history[key] = next;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // The book-local savedCovers field remains as a fallback.
  }
  return next;
}

function forgetHistory(title: string, author: string, url: string) {
  const key = identity(title, author);
  const history = readHistory();
  if (!history[key]) return;
  history[key] = uniqueCovers(history[key].filter((cover) => cover.url !== url));
  if (!history[key].length) delete history[key];
  try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch {}
}

function updateBook(title: string, author: string, updater: (book: StoredBook) => StoredBook) {
  const key = identity(title, author);
  const books = readLibrary();
  let changed = false;
  const next = books.map((book) => {
    if (identity(book.title || "", book.author || "") !== key) return book;
    changed = true;
    return updater(book);
  });
  if (!changed) return false;
  try {
    window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

function sourceFromChoice(choice: Element) {
  const title = choice.getAttribute("title") || "";
  const titleMatch = title.match(/(?:use this|preview)\s+(.+?)\s+cover/i);
  if (titleMatch?.[1]) return titleMatch[1].trim();

  const label = choice.querySelector("span")?.textContent?.trim() || "";
  if (label === "OL") return "Open Library";
  if (label === "Google") return "Google Books";
  if (label === "LT") return "LibraryThing";
  if (label === "Romance") return "Romance.io";
  return label || "Saved cover";
}

function coverFromChoice(choice: Element): Cover | undefined {
  if (choice.classList.contains("web-cover-result")) return undefined;
  const image = choice.querySelector<HTMLImageElement>("img");
  if (!image?.src) return undefined;
  return { url: image.src, source: sourceFromChoice(choice) };
}

function rememberTransition(title: string, author: string, previous?: Cover, target?: Cover) {
  const currentBook = readLibrary().find((book) => identity(book.title || "", book.author || "") === identity(title, author));
  const current = currentBook?.preferredCover;
  const history = rememberHistory(title, author, [
    ...(previous?.url ? [previous] : []),
    ...(target?.url ? [target] : []),
    ...(current?.url ? [current] : []),
  ]);

  return updateBook(title, author, (book) => ({
    ...book,
    savedCovers: uniqueCovers([
      ...(book.savedCovers || []),
      ...history,
      ...(previous?.url ? [previous] : []),
      ...(target?.url ? [target] : []),
      ...(current?.url ? [current] : []),
    ]),
  }));
}

function updateCoverSourceLabel(modal: Element, source?: string) {
  for (const dt of modal.querySelectorAll<HTMLElement>(".details dt")) {
    if (dt.textContent?.trim().toLowerCase() !== "cover source") continue;
    const value = dt.nextElementSibling;
    if (value) value.textContent = source || "Saved cover";
  }
}

function syncVisibleCover(modal: Element, cover: Cover) {
  const { title, author } = modalBook(modal);
  const modalImage = modal.querySelector<HTMLImageElement>(".cover-image");
  if (modalImage) modalImage.src = cover.url;
  updateCoverSourceLabel(modal, cover.source);

  const shelfButton = [...document.querySelectorAll<HTMLButtonElement>("button.book")]
    .find((button) => button.title === `${title} — ${author}`);
  const shelfImage = shelfButton?.querySelector<HTMLImageElement>(".book-cover-art");
  if (shelfImage) shelfImage.src = cover.url;

  window.dispatchEvent(new CustomEvent("shelf-cover-changed", {
    detail: { title, author, coverUrl: cover.url, source: cover.source || "Saved cover" },
  }));
}

function applySavedCover(modal: Element, cover: Cover) {
  const { title, author, key } = modalBook(modal);
  if (!title) return;

  const currentBook = readLibrary().find((book) => identity(book.title || "", book.author || "") === key);
  const current = currentBook?.preferredCover;
  const history = rememberHistory(title, author, [
    ...(currentBook?.savedCovers || []),
    ...(current?.url ? [current] : []),
    cover,
  ]);

  const ok = updateBook(title, author, (book) => ({
    ...book,
    preferredCover: { url: cover.url, source: cover.source || "Saved cover" },
    savedCovers: uniqueCovers([
      ...(book.savedCovers || []),
      ...history,
      ...(current?.url ? [current] : []),
      cover,
    ]),
    coverFeedback: {
      ...book.coverFeedback,
      accepted: cover.url,
      rejected: (book.coverFeedback?.rejected || []).filter((url) => url !== cover.url),
      wrongEdition: (book.coverFeedback?.wrongEdition || []).filter((url) => url !== cover.url),
    },
  }));
  if (!ok) return;

  syncVisibleCover(modal, cover);
  renderSavedChoices(modal);
}

function isCommunityUpload(cover: Cover) {
  return /uploaded cover|community cover/i.test(cover.source || "")
    || /\/storage\/v1\/object\/public\/covers\//i.test(cover.url);
}

async function deleteSharedUpload(cover: Cover) {
  if (!isCommunityUpload(cover)) return { ok: true, sharedDeleted: false };
  const token = accessToken();
  if (!token) return { ok: false, error: "Sign in before deleting an uploaded cover." };

  const response = await fetch("/api/community-cover", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imageUrl: cover.url }),
  });
  let data: { error?: string; sharedDeleted?: boolean } = {};
  try { data = await response.json() as { error?: string; sharedDeleted?: boolean }; } catch {}

  if (response.status === 403) {
    // The user may have reused someone else's community upload. Removing it from
    // their own saved choices is still safe; only the shared object remains.
    return { ok: true, sharedDeleted: false };
  }
  if (!response.ok) return { ok: false, error: data.error || "Could not delete that uploaded cover." };
  return { ok: true, sharedDeleted: Boolean(data.sharedDeleted) };
}

async function deleteSavedCover(modal: Element, cover: Cover) {
  const { title, author, key } = modalBook(modal);
  if (!title) return;
  const currentBook = readLibrary().find((book) => identity(book.title || "", book.author || "") === key);
  if (!currentBook) return;

  const isActive = currentBook.preferredCover?.url === cover.url;
  const confirmed = window.confirm(
    `${isActive ? "This cover is currently active. " : ""}Remove this saved cover?${isCommunityUpload(cover) ? "\n\nIf this is your own community upload, its shared file will also be removed." : ""}`,
  );
  if (!confirmed) return;

  const shared = await deleteSharedUpload(cover);
  if (!shared.ok) {
    window.alert(shared.error || "Could not delete that cover.");
    return;
  }

  forgetHistory(title, author, cover.url);
  const remaining = uniqueCovers([
    ...(currentBook.savedCovers || []),
    ...historyFor(title, author),
  ].filter((item) => item.url !== cover.url));
  const fallback = isActive ? remaining.at(-1) : currentBook.preferredCover;

  updateBook(title, author, (book) => {
    const next: StoredBook = {
      ...book,
      savedCovers: uniqueCovers((book.savedCovers || []).filter((item) => item.url !== cover.url)),
      coverFeedback: {
        ...book.coverFeedback,
        accepted: book.coverFeedback?.accepted === cover.url ? fallback?.url : book.coverFeedback?.accepted,
        rejected: (book.coverFeedback?.rejected || []).filter((url) => url !== cover.url),
        wrongEdition: (book.coverFeedback?.wrongEdition || []).filter((url) => url !== cover.url),
      },
    };
    if (book.preferredCover?.url === cover.url) {
      if (fallback?.url) next.preferredCover = fallback;
      else delete next.preferredCover;
    }
    return next;
  });

  if (fallback?.url) syncVisibleCover(modal, fallback);
  renderSavedChoices(modal);
}

function renderSavedChoices(modal: Element) {
  const picker = modal.querySelector<HTMLElement>(".cover-picker");
  if (!picker) return;

  const { title, author } = modalBook(modal);
  if (!title) return;

  const book = readLibrary().find((item) => identity(item.title || "", item.author || "") === identity(title, author));
  const priorHistory = historyFor(title, author);
  const covers = uniqueCovers([
    ...priorHistory,
    ...(book?.savedCovers || []),
    ...(book?.preferredCover?.url ? [book.preferredCover] : []),
  ]);

  if (covers.length > priorHistory.length) rememberHistory(title, author, covers);

  let section = picker.querySelector<HTMLElement>("[data-saved-cover-choices]");
  if (!covers.length) {
    section?.remove();
    return;
  }

  if (!section) {
    section = document.createElement("section");
    section.className = "saved-cover-choices";
    section.setAttribute("data-saved-cover-choices", "1");

    const heading = document.createElement("div");
    heading.className = "saved-cover-heading";
    heading.innerHTML = "<strong>Saved covers</strong><span>click any cover to use it instantly</span>";

    const holder = document.createElement("div");
    holder.className = "saved-cover-grid";
    holder.setAttribute("data-saved-cover-grid", "1");

    section.append(heading, holder);
    const upload = picker.querySelector("[data-community-cover-upload]");
    if (upload) upload.insertAdjacentElement("afterend", section);
    else picker.querySelector(".cover-picker-heading")?.insertAdjacentElement("afterend", section);
  }

  const holder = section.querySelector<HTMLElement>("[data-saved-cover-grid]");
  if (!holder) return;
  holder.replaceChildren();

  for (const cover of covers) {
    const item = document.createElement("div");
    item.style.position = "relative";
    item.style.display = "inline-grid";
    item.style.justifyItems = "center";

    const button = document.createElement("button");
    button.type = "button";
    button.className = `saved-cover-option${book?.preferredCover?.url === cover.url ? " active" : ""}`;
    button.title = book?.preferredCover?.url === cover.url ? "Currently on your shelf — click another cover to switch" : "Use this saved cover now";
    button.setAttribute("aria-label", button.title);

    const image = document.createElement("img");
    image.src = cover.url;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";

    const label = document.createElement("span");
    label.textContent = cover.source || "Saved";

    button.append(image, label);
    button.addEventListener("click", () => applySavedCover(modal, cover));
    item.appendChild(button);

    if (isCommunityUpload(cover)) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.title = "Delete this uploaded cover";
      remove.setAttribute("aria-label", "Delete this uploaded cover");
      remove.style.position = "absolute";
      remove.style.top = "-7px";
      remove.style.right = "-7px";
      remove.style.zIndex = "2";
      remove.style.width = "24px";
      remove.style.height = "24px";
      remove.style.borderRadius = "999px";
      remove.style.border = "1px solid rgba(255,255,255,.7)";
      remove.style.background = "#8f3f3d";
      remove.style.color = "#fff";
      remove.style.fontWeight = "800";
      remove.style.lineHeight = "1";
      remove.style.cursor = "pointer";
      remove.addEventListener("click", (event) => {
        event.stopPropagation();
        void deleteSavedCover(modal, cover);
      });
      item.appendChild(remove);
    }

    holder.appendChild(item);
  }
}

export default function SavedCoverChoices() {
  useEffect(() => {
    let raf = 0;

    const refresh = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const modal = document.querySelector(".modal");
        if (modal) renderSavedChoices(modal);
      });
    };

    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const choice = target.closest(".web-cover-result, .cover-option");
      if (!choice) return;
      const modal = choice.closest(".modal");
      if (!modal) return;

      const { title, author } = modalBook(modal);
      if (!title) return;
      const current = readLibrary().find((item) => identity(item.title || "", item.author || "") === identity(title, author));
      const previous = current?.preferredCover;
      const targetCover = coverFromChoice(choice);

      rememberHistory(title, author, [
        ...(previous?.url ? [previous] : []),
        ...(targetCover?.url ? [targetCover] : []),
      ]);

      window.setTimeout(() => {
        rememberTransition(title, author, previous, targetCover);
        refresh();
      }, 120);
    }

    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", handleClick, true);
    refresh();

    return () => {
      observer.disconnect();
      document.removeEventListener("click", handleClick, true);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
