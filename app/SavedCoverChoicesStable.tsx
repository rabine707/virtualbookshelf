"use client";

import { useEffect } from "react";

const LIBRARY_KEY = "shelf-of-fame-library-v1";
const HISTORY_KEY = "shelf-of-fame-saved-cover-history-v1";
const SESSION_KEY = "shelf-of-fame-supabase-session";

type Cover = { url: string; source?: string };
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
  return (value || "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function identity(title: string, author: string) {
  return `${normalize(title)}::${normalize(author)}`;
}

function modalBook(modal: Element) {
  const title = modal.querySelector(".details h2")?.textContent?.trim() || "";
  const author = (modal.querySelector(".details .author")?.textContent || "").replace(/^by\s+/i, "").trim();
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

function writeLibrary(books: StoredBook[]) {
  window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(books));
}

function readHistory(): SavedCoverHistory {
  try {
    const value = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value as SavedCoverHistory : {};
  } catch {
    return {};
  }
}

function writeHistory(history: SavedCoverHistory) {
  try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch {}
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

function findBook(title: string, author: string) {
  const key = identity(title, author);
  return readLibrary().find((book) => identity(book.title || "", book.author || "") === key) || null;
}

function coversFor(title: string, author: string, book = findBook(title, author)) {
  const history = readHistory()[identity(title, author)] || [];
  return uniqueCovers([
    ...history,
    ...(book?.savedCovers || []),
    ...(book?.preferredCover?.url ? [book.preferredCover] : []),
  ]);
}

function rememberCovers(title: string, author: string, covers: Cover[]) {
  const key = identity(title, author);
  if (!key) return;
  const history = readHistory();
  history[key] = uniqueCovers([...(history[key] || []), ...covers]);
  writeHistory(history);
}

function forgetCover(title: string, author: string, url: string) {
  const key = identity(title, author);
  const history = readHistory();
  if (!history[key]) return;
  const next = uniqueCovers(history[key].filter((cover) => cover.url !== url));
  if (next.length) history[key] = next;
  else delete history[key];
  writeHistory(history);
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
  writeLibrary(next);
  return true;
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

function coverFromChoice(choice: Element): Cover | null {
  if (choice.classList.contains("web-cover-result")) return null;
  const image = choice.querySelector<HTMLImageElement>("img");
  if (!image?.src) return null;
  return { url: image.src, source: sourceFromChoice(choice) };
}

function updateCoverSourceLabel(modal: Element, source?: string) {
  for (const dt of modal.querySelectorAll<HTMLElement>(".details dt")) {
    if (dt.textContent?.trim().toLowerCase() !== "cover source") continue;
    const value = dt.nextElementSibling;
    if (value) value.textContent = source || "Saved cover";
  }
}

function forceImageSource(image: HTMLImageElement | null | undefined, url: string) {
  if (!image) return;
  image.removeAttribute("srcset");
  image.src = url;
  const picture = image.closest("picture");
  for (const source of picture?.querySelectorAll<HTMLSourceElement>("source") || []) {
    source.srcset = url;
  }
}

function syncVisibleCover(modal: Element, cover: Cover) {
  const { title, author } = modalBook(modal);
  forceImageSource(modal.querySelector<HTMLImageElement>(".cover-image"), cover.url);
  updateCoverSourceLabel(modal, cover.source);

  const shelfButton = [...document.querySelectorAll<HTMLButtonElement>("button.book")]
    .find((button) => button.title === `${title} — ${author}`);
  forceImageSource(shelfButton?.querySelector<HTMLImageElement>(".book-cover-art"), cover.url);

  window.dispatchEvent(new CustomEvent("shelf-cover-changed", {
    detail: { title, author, coverUrl: cover.url, source: cover.source || "Saved cover" },
  }));
}

function applySavedCover(modal: Element, cover: Cover) {
  const { title, author } = modalBook(modal);
  if (!title || !cover.url) return;
  const current = findBook(title, author)?.preferredCover;
  rememberCovers(title, author, [...(current?.url ? [current] : []), cover]);

  const ok = updateBook(title, author, (book) => ({
    ...book,
    preferredCover: { url: cover.url, source: cover.source || "Saved cover" },
    savedCovers: uniqueCovers([
      ...(book.savedCovers || []),
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
  renderSavedChoices(modal, true);
}

function isCommunityUpload(cover: Cover) {
  return /uploaded cover|community cover/i.test(cover.source || "")
    || /\/storage\/v1\/object\/public\/covers\//i.test(cover.url);
}

async function deleteSharedUpload(cover: Cover) {
  if (!isCommunityUpload(cover)) return { ok: true };
  const token = accessToken();
  if (!token) return { ok: false, error: "Sign in before deleting an uploaded cover." };

  const response = await fetch("/api/community-cover", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrl: cover.url }),
  });
  let data: { error?: string } = {};
  try { data = await response.json() as { error?: string }; } catch {}
  if (response.status === 403) return { ok: true };
  return response.ok ? { ok: true } : { ok: false, error: data.error || "Could not delete that uploaded cover." };
}

async function deleteSavedCover(modal: Element, cover: Cover) {
  const { title, author } = modalBook(modal);
  if (!title) return;
  const book = findBook(title, author);
  if (!book) return;

  const active = book.preferredCover?.url === cover.url;
  const confirmed = window.confirm(
    `${active ? "This cover is currently active. " : ""}Delete this saved cover?${isCommunityUpload(cover) ? "\n\nIf you uploaded it, its shared copy will also be deleted." : ""}`,
  );
  if (!confirmed) return;

  const shared = await deleteSharedUpload(cover);
  if (!shared.ok) {
    window.alert(shared.error || "Could not delete that cover.");
    return;
  }

  forgetCover(title, author, cover.url);
  const remaining = uniqueCovers(coversFor(title, author, book).filter((item) => item.url !== cover.url));
  const fallback = active
    ? remaining.find((item) => !isCommunityUpload(item)) || remaining.at(-1)
    : book.preferredCover;

  updateBook(title, author, (current) => {
    const next: StoredBook = {
      ...current,
      savedCovers: uniqueCovers((current.savedCovers || []).filter((item) => item.url !== cover.url)),
      coverFeedback: {
        ...current.coverFeedback,
        accepted: current.coverFeedback?.accepted === cover.url ? fallback?.url : current.coverFeedback?.accepted,
        rejected: (current.coverFeedback?.rejected || []).filter((url) => url !== cover.url),
        wrongEdition: (current.coverFeedback?.wrongEdition || []).filter((url) => url !== cover.url),
      },
    };
    if (current.preferredCover?.url === cover.url) {
      if (fallback?.url) next.preferredCover = fallback;
      else delete next.preferredCover;
    }
    return next;
  });

  if (fallback?.url) syncVisibleCover(modal, fallback);
  renderSavedChoices(modal, true);
  if (!fallback?.url) window.location.reload();
}

function renderKey(book: StoredBook | null, covers: Cover[]) {
  return JSON.stringify({
    active: book?.preferredCover?.url || "",
    covers: covers.map((cover) => [cover.url, cover.source || ""]),
  });
}

function renderSavedChoices(modal: Element, force = false) {
  const picker = modal.querySelector<HTMLElement>(".cover-picker");
  if (!picker) return;
  const { title, author } = modalBook(modal);
  if (!title) return;

  const book = findBook(title, author);
  const covers = coversFor(title, author, book);
  if (covers.length) rememberCovers(title, author, covers);

  let section = picker.querySelector<HTMLElement>("[data-saved-cover-choices]");
  if (!covers.length) {
    section?.remove();
    return;
  }

  const key = renderKey(book, covers);
  if (!force && section?.dataset.savedCoverRenderKey === key) return;

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

    const use = document.createElement("button");
    use.type = "button";
    use.className = `saved-cover-option${book?.preferredCover?.url === cover.url ? " active" : ""}`;
    use.dataset.savedCoverUse = cover.url;
    use.title = book?.preferredCover?.url === cover.url ? "Currently on your shelf" : "Use this saved cover now";
    use.setAttribute("aria-label", use.title);

    const image = document.createElement("img");
    image.src = cover.url;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    const label = document.createElement("span");
    label.textContent = cover.source || "Saved";
    use.append(image, label);
    item.appendChild(use);

    if (isCommunityUpload(cover)) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.dataset.savedCoverDelete = cover.url;
      remove.textContent = "×";
      remove.title = "Delete this uploaded cover";
      remove.setAttribute("aria-label", "Delete this uploaded cover");
      Object.assign(remove.style, {
        position: "absolute",
        top: "-7px",
        right: "-7px",
        zIndex: "5",
        width: "26px",
        height: "26px",
        borderRadius: "999px",
        border: "1px solid rgba(255,255,255,.8)",
        background: "#8f3f3d",
        color: "#fff",
        fontWeight: "800",
        lineHeight: "1",
        cursor: "pointer",
        pointerEvents: "auto",
      });
      item.appendChild(remove);
    }
    holder.appendChild(item);
  }

  section.dataset.savedCoverRenderKey = key;
}

export default function SavedCoverChoicesStable() {
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

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const remove = target.closest<HTMLElement>("[data-saved-cover-delete]");
      if (remove) {
        const modal = remove.closest(".modal");
        const url = remove.dataset.savedCoverDelete || "";
        if (!modal || !url) return;
        event.preventDefault();
        event.stopPropagation();
        const { title, author } = modalBook(modal);
        const cover = coversFor(title, author).find((item) => item.url === url);
        if (cover) void deleteSavedCover(modal, cover);
        return;
      }

      const use = target.closest<HTMLElement>("[data-saved-cover-use]");
      if (use) {
        const modal = use.closest(".modal");
        const url = use.dataset.savedCoverUse || "";
        if (!modal || !url) return;
        event.preventDefault();
        event.stopPropagation();
        const { title, author } = modalBook(modal);
        const cover = coversFor(title, author).find((item) => item.url === url);
        if (cover) applySavedCover(modal, cover);
        return;
      }

      const choice = target.closest(".web-cover-result, .cover-option");
      if (!choice) return;
      const modal = choice.closest(".modal");
      if (!modal) return;
      const { title, author } = modalBook(modal);
      const previous = findBook(title, author)?.preferredCover;
      const chosen = coverFromChoice(choice);
      rememberCovers(title, author, [
        ...(previous?.url ? [previous] : []),
        ...(chosen?.url ? [chosen] : []),
      ]);
      window.setTimeout(refresh, 180);
    };

    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", handleClick, true);
    window.addEventListener("shelf-cover-changed", refresh);
    refresh();

    return () => {
      observer.disconnect();
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("shelf-cover-changed", refresh);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
