"use client";

import { useEffect } from "react";

const LIBRARY_KEY = "shelf-of-fame-library-v1";
const REOPEN_KEY = "shelf-of-fame-web-cover-reopen-v1";

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

function uniqueCovers(covers: Cover[]) {
  const seen = new Set<string>();
  return covers.filter((cover) => {
    if (!cover?.url || seen.has(cover.url)) return false;
    seen.add(cover.url);
    return true;
  });
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

function rememberTransition(title: string, author: string, previous?: Cover) {
  return updateBook(title, author, (book) => {
    const current = book.preferredCover;
    const saved = uniqueCovers([
      ...(book.savedCovers || []),
      ...(previous?.url ? [previous] : []),
      ...(current?.url ? [current] : []),
    ]);
    return { ...book, savedCovers: saved };
  });
}

function applySavedCover(modal: Element, cover: Cover) {
  const { title, author, key } = modalBook(modal);
  if (!title) return;

  const ok = updateBook(title, author, (book) => ({
    ...book,
    preferredCover: { url: cover.url, source: cover.source || "Saved cover" },
    savedCovers: uniqueCovers([...(book.savedCovers || []), cover]),
    coverFeedback: {
      ...book.coverFeedback,
      accepted: cover.url,
      rejected: (book.coverFeedback?.rejected || []).filter((url) => url !== cover.url),
      wrongEdition: (book.coverFeedback?.wrongEdition || []).filter((url) => url !== cover.url),
    },
  }));
  if (!ok) return;

  try {
    window.sessionStorage.setItem(REOPEN_KEY, key);
  } catch {
    // The cover still saves even if sessionStorage is unavailable.
  }
  window.location.reload();
}

function renderSavedChoices(modal: Element) {
  const picker = modal.querySelector<HTMLElement>(".cover-picker");
  if (!picker) return;

  const { title, author } = modalBook(modal);
  if (!title) return;

  const book = readLibrary().find((item) => identity(item.title || "", item.author || "") === identity(title, author));
  const covers = uniqueCovers([
    ...(book?.savedCovers || []),
    ...(book?.preferredCover?.url ? [book.preferredCover] : []),
  ]);

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
    heading.innerHTML = "<strong>Saved covers</strong><span>pick any previous choice</span>";

    const holder = document.createElement("div");
    holder.className = "saved-cover-grid";
    holder.setAttribute("data-saved-cover-grid", "1");

    section.append(heading, holder);
    const headingNode = picker.querySelector(".cover-picker-heading");
    headingNode?.insertAdjacentElement("afterend", section);
  }

  const holder = section.querySelector<HTMLElement>("[data-saved-cover-grid]");
  if (!holder) return;
  holder.replaceChildren();

  for (const cover of covers) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `saved-cover-option${book?.preferredCover?.url === cover.url ? " active" : ""}`;
    button.title = book?.preferredCover?.url === cover.url ? "Currently on your shelf" : "Use this saved cover on the shelf";
    button.setAttribute("aria-label", button.title);

    const image = document.createElement("img");
    image.src = cover.url;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";

    const label = document.createElement("span");
    label.textContent = cover.source || "Saved";

    button.append(image, label);
    if (book?.preferredCover?.url !== cover.url) {
      button.addEventListener("click", () => applySavedCover(modal, cover));
    }
    holder.appendChild(button);
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

      window.setTimeout(() => {
        rememberTransition(title, author, previous);
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
