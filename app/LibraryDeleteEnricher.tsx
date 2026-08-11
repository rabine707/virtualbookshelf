"use client";

import { useEffect } from "react";

const STORAGE_KEY = "shelf-of-fame-library-v1";

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function modalIdentity(modal: HTMLElement) {
  const title = modal.querySelector<HTMLElement>(".details h2")?.textContent?.trim() || "";
  const authorText = modal.querySelector<HTMLElement>(".details .author")?.textContent?.trim() || "";
  const author = authorText.replace(/^by\s+/i, "").trim();
  return { title, author };
}

function installDeleteButton(modal: HTMLElement) {
  if (modal.querySelector("[data-library-delete-button]")) return;
  const details = modal.querySelector<HTMLElement>(".details");
  if (!details) return;

  const button = document.createElement("button");
  button.type = "button";
  button.dataset.libraryDeleteButton = "1";
  button.textContent = "Delete from Library";
  button.setAttribute("aria-label", "Delete this book from your library");
  Object.assign(button.style, {
    width: "100%",
    minHeight: "42px",
    marginTop: "14px",
    padding: "0 14px",
    border: "1px solid rgba(255, 148, 148, 0.45)",
    borderRadius: "10px",
    background: "rgba(118, 38, 38, 0.88)",
    color: "#fff1f1",
    font: "inherit",
    fontWeight: "800",
    cursor: "pointer",
  });

  button.addEventListener("click", () => {
    const { title, author } = modalIdentity(modal);
    if (!title) return;

    const confirmed = window.confirm(
      `Delete “${title}” from your library?\n\nThis removes the saved book and any browser-stored cover/spine data attached to it.`,
    );
    if (!confirmed) return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) throw new Error("Library data is not an array.");

      const titleKey = normalize(title);
      const authorKey = normalize(author);
      const index = parsed.findIndex((value) => {
        if (!value || typeof value !== "object") return false;
        const book = value as { title?: unknown; author?: unknown };
        const savedTitle = typeof book.title === "string" ? normalize(book.title) : "";
        const savedAuthor = typeof book.author === "string" ? normalize(book.author) : "";
        return savedTitle === titleKey && savedAuthor === authorKey;
      });

      if (index < 0) {
        window.alert("That book could not be found in this browser library.");
        return;
      }

      parsed.splice(index, 1);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      button.disabled = true;
      button.textContent = "Deleted ✓";
      window.location.reload();
    } catch {
      window.alert("Could not delete this book from the browser library.");
    }
  });

  details.appendChild(button);
}

export default function LibraryDeleteEnricher() {
  useEffect(() => {
    let raf = 0;
    const scan = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        for (const modal of document.querySelectorAll<HTMLElement>(".modal")) installDeleteButton(modal);
      });
    };

    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    scan();

    return () => {
      observer.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
