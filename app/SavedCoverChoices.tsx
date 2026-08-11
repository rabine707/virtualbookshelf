"use client";

import { useEffect } from "react";

const LIBRARY_KEY = "shelf-of-fame-library-v1";
const REOPEN_KEY = "shelf-of-fame-web-cover-reopen-v1";
const HISTORY_KEY = "shelf-of-fame-saved-cover-history-v1";
const STYLE_ID = "saved-cover-remove-style";
const inlineStyles = `
.saved-cover-item{position:relative;width:64px}
.saved-cover-remove{position:absolute;z-index:3;top:-7px;right:-7px;width:22px;height:22px;display:grid;place-items:center;padding:0;border:1px solid rgba(255,255,255,.18);border-radius:50%;background:rgba(24,18,15,.94);color:#f7eee2;font:700 16px/1 Arial,sans-serif;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.28)}
.saved-cover-remove:hover,.saved-cover-remove:focus-visible{transform:scale(1.06);outline:2px solid rgba(247,238,226,.35);outline-offset:1px}
@media(max-width:760px){.saved-cover-remove{width:26px;height:26px;top:-9px;right:-9px;font-size:18px}}
`;

type Cover = { url: string; source?: string };
type StoredBook = {
  title?: string;
  author?: string;
  preferredCover?: Cover;
  savedCovers?: Cover[];
  coverFeedback?: { accepted?: string; rejected?: string[]; wrongEdition?: string[] };
} & Record<string, unknown>;
type SavedCoverHistory = Record<string, Cover[]>;

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = inlineStyles;
  document.head.appendChild(style);
}
function normalize(value?: string) {
  return (value || "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function identity(title: string, author: string) { return `${normalize(title)}::${normalize(author)}`; }
function modalBook(modal: Element) {
  const title = modal.querySelector(".details h2")?.textContent?.trim() || "";
  const author = (modal.querySelector(".details .author")?.textContent || "").replace(/^by\s+/i, "").trim();
  return { title, author, key: identity(title, author) };
}
function readLibrary(): StoredBook[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(LIBRARY_KEY) || "[]");
    return Array.isArray(value) ? value as StoredBook[] : [];
  } catch { return []; }
}
function readHistory(): SavedCoverHistory {
  try {
    const value = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value as SavedCoverHistory : {};
  } catch { return {}; }
}
function uniqueCovers(covers: Cover[]) {
  const seen = new Set<string>();
  return covers.filter((cover) => {
    if (!cover?.url || seen.has(cover.url)) return false;
    seen.add(cover.url); return true;
  });
}
function sameCoverList(left: Cover[], right: Cover[]) {
  if (left.length !== right.length) return false;
  return left.every((cover, index) => cover.url === right[index]?.url && cover.source === right[index]?.source);
}
function historyFor(title: string, author: string) { return uniqueCovers(readHistory()[identity(title, author)] || []); }
function rememberHistory(title: string, author: string, covers: Cover[]) {
  const key = identity(title, author); if (!key) return [];
  const history = readHistory();
  const current = uniqueCovers(history[key] || []);
  const next = uniqueCovers([...current, ...covers]);
  if (sameCoverList(current, next)) return current;
  history[key] = next;
  try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { /* book local list remains */ }
  return next;
}
function forgetHistory(title: string, author: string, url: string) {
  const key = identity(title, author); if (!key || !url) return;
  const history = readHistory();
  const next = uniqueCovers(history[key] || []).filter((cover) => cover.url !== url);
  if (next.length) history[key] = next; else delete history[key];
  try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { /* book local list also updates */ }
}
function updateBook(title: string, author: string, updater: (book: StoredBook) => StoredBook) {
  const key = identity(title, author); const books = readLibrary(); let changed = false;
  const next = books.map((book) => {
    if (identity(book.title || "", book.author || "") !== key) return book;
    changed = true; return updater(book);
  });
  if (!changed) return false;
  try { window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(next)); return true; } catch { return false; }
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
  const history = rememberHistory(title, author, [...(previous?.url ? [previous] : []), ...(target?.url ? [target] : []), ...(current?.url ? [current] : [])]);
  return updateBook(title, author, (book) => ({ ...book, savedCovers: uniqueCovers([...(book.savedCovers || []), ...history, ...(previous?.url ? [previous] : []), ...(target?.url ? [target] : []), ...(current?.url ? [current] : [])]) }));
}
function applySavedCover(modal: Element, cover: Cover) {
  const { title, author, key } = modalBook(modal); if (!title) return;
  const currentBook = readLibrary().find((book) => identity(book.title || "", book.author || "") === key);
  const current = currentBook?.preferredCover;
  const history = rememberHistory(title, author, [...(currentBook?.savedCovers || []), ...(current?.url ? [current] : []), cover]);
  const ok = updateBook(title, author, (book) => ({
    ...book,
    preferredCover: { url: cover.url, source: cover.source || "Saved cover" },
    savedCovers: uniqueCovers([...(book.savedCovers || []), ...history, ...(current?.url ? [current] : []), cover]),
    coverFeedback: { ...book.coverFeedback, accepted: cover.url, rejected: (book.coverFeedback?.rejected || []).filter((url) => url !== cover.url), wrongEdition: (book.coverFeedback?.wrongEdition || []).filter((url) => url !== cover.url) },
  }));
  if (!ok) return;
  try { window.sessionStorage.setItem(REOPEN_KEY, key); } catch { /* optional */ }
  window.location.reload();
}
function removeSavedCover(modal: Element, cover: Cover) {
  const { title, author, key } = modalBook(modal); if (!title || !cover.url) return;
  forgetHistory(title, author, cover.url);
  const ok = updateBook(title, author, (book) => {
    const rejected = new Set(book.coverFeedback?.rejected || []); rejected.add(cover.url);
    return {
      ...book,
      preferredCover: book.preferredCover?.url === cover.url ? undefined : book.preferredCover,
      savedCovers: (book.savedCovers || []).filter((saved) => saved.url !== cover.url),
      coverFeedback: { ...book.coverFeedback, accepted: book.coverFeedback?.accepted === cover.url ? undefined : book.coverFeedback?.accepted, rejected: [...rejected], wrongEdition: (book.coverFeedback?.wrongEdition || []).filter((url) => url !== cover.url) },
    };
  });
  if (!ok) return;
  try { window.sessionStorage.setItem(REOPEN_KEY, key); } catch { /* optional */ }
  window.location.reload();
}
function renderSavedChoices(modal: Element) {
  const picker = modal.querySelector<HTMLElement>(".cover-picker"); if (!picker) return;
  const { title, author } = modalBook(modal); if (!title) return;
  const book = readLibrary().find((item) => identity(item.title || "", item.author || "") === identity(title, author));
  const priorHistory = historyFor(title, author);
  const rejected = new Set(book?.coverFeedback?.rejected || []);
  const covers = uniqueCovers([...priorHistory, ...(book?.savedCovers || []), ...(book?.preferredCover?.url ? [book.preferredCover] : [])]).filter((cover) => !rejected.has(cover.url));
  if (covers.length > priorHistory.filter((cover) => !rejected.has(cover.url)).length) rememberHistory(title, author, covers);
  let section = picker.querySelector<HTMLElement>("[data-saved-cover-choices]");
  if (!covers.length) { section?.remove(); return; }
  if (!section) {
    section = document.createElement("section"); section.className = "saved-cover-choices"; section.setAttribute("data-saved-cover-choices", "1");
    const heading = document.createElement("div"); heading.className = "saved-cover-heading"; heading.innerHTML = "<strong>Saved covers</strong><span>tap a cover to use it</span>";
    const holder = document.createElement("div"); holder.className = "saved-cover-grid"; holder.setAttribute("data-saved-cover-grid", "1");
    section.append(heading, holder); picker.querySelector(".cover-picker-heading")?.insertAdjacentElement("afterend", section);
  }
  const holder = section.querySelector<HTMLElement>("[data-saved-cover-grid]"); if (!holder) return;
  holder.replaceChildren();
  for (const cover of covers) {
    const item = document.createElement("div"); item.className = "saved-cover-item";
    const button = document.createElement("button"); const active = book?.preferredCover?.url === cover.url;
    button.type = "button"; button.className = `saved-cover-option${active ? " active" : ""}`; button.title = active ? "Currently on your shelf" : "Use this saved cover on the shelf"; button.setAttribute("aria-label", button.title);
    const image = document.createElement("img"); image.src = cover.url; image.alt = ""; image.loading = "lazy"; image.decoding = "async";
    const label = document.createElement("span"); label.textContent = cover.source || "Saved"; button.append(image, label);
    if (!active) button.addEventListener("click", () => applySavedCover(modal, cover));
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "saved-cover-remove"; remove.textContent = "×"; remove.title = "Remove this saved cover"; remove.setAttribute("aria-label", `Remove ${cover.source || "saved"} cover`);
    remove.addEventListener("click", (event) => { event.stopPropagation(); removeSavedCover(modal, cover); });
    item.append(button, remove); holder.appendChild(item);
  }
}

export default function SavedCoverChoices() {
  useEffect(() => {
    ensureStyles(); let raf = 0;
    const refresh = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => { raf = 0; const modal = document.querySelector(".modal"); if (modal) renderSavedChoices(modal); });
    };
    function handleClick(event: MouseEvent) {
      const target = event.target; if (!(target instanceof Element) || target.closest(".saved-cover-remove")) return;
      const choice = target.closest(".web-cover-result, .cover-option"); if (!choice) return;
      const modal = choice.closest(".modal"); if (!modal) return;
      const { title, author } = modalBook(modal); if (!title) return;
      const current = readLibrary().find((item) => identity(item.title || "", item.author || "") === identity(title, author));
      const previous = current?.preferredCover; const targetCover = coverFromChoice(choice);
      rememberHistory(title, author, [...(previous?.url ? [previous] : []), ...(targetCover?.url ? [targetCover] : [])]);
      window.setTimeout(() => { rememberTransition(title, author, previous, targetCover); refresh(); }, 120);
    }
    const observer = new MutationObserver(refresh); observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", handleClick, true); refresh();
    return () => { observer.disconnect(); document.removeEventListener("click", handleClick, true); if (raf) window.cancelAnimationFrame(raf); };
  }, []);
  return null;
}
