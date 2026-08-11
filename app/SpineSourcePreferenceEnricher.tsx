"use client";

import { useEffect } from "react";

const LIBRARY_STORAGE_KEY = "shelf-of-fame-library-v1";
const SOURCE_STORAGE_KEY = "shelf-of-fame-spine-source-v1";

type SpineSourcePreference = {
  mode: "scan" | "cover";
  coverUrl?: string;
};

type StoredBook = {
  title?: unknown;
  author?: unknown;
  scannedSpine?: unknown;
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function identityKey(title: string, author: string) {
  return `${normalize(title)}::${normalize(author)}`;
}

function selectedIdentity() {
  const modal = document.querySelector<HTMLElement>(".modal");
  if (!modal) return null;
  const title = modal.querySelector<HTMLElement>(".details h2")?.textContent?.trim() || "";
  const authorText = modal.querySelector<HTMLElement>(".details .author")?.textContent?.trim() || "";
  const author = authorText.replace(/^by\s+/i, "").trim();
  if (!title) return null;
  return { title, author, key: identityKey(title, author) };
}

function readPreferences() {
  try {
    const raw = window.localStorage.getItem(SOURCE_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {} as Record<string, SpineSourcePreference>;
    return parsed as Record<string, SpineSourcePreference>;
  } catch {
    return {} as Record<string, SpineSourcePreference>;
  }
}

function writePreference(key: string, preference: SpineSourcePreference) {
  const current = readPreferences();
  current[key] = preference;
  window.localStorage.setItem(SOURCE_STORAGE_KEY, JSON.stringify(current));
  window.dispatchEvent(new CustomEvent("shelf-spine-source-changed", { detail: { key, ...preference } }));
}

function hasPhotographedSpine(key: string) {
  try {
    const raw = window.localStorage.getItem(LIBRARY_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return false;
    return parsed.some((value) => {
      if (!value || typeof value !== "object") return false;
      const book = value as StoredBook;
      const title = typeof book.title === "string" ? book.title.trim() : "";
      const author = typeof book.author === "string" ? book.author.trim() : "";
      const spine = typeof book.scannedSpine === "string" ? book.scannedSpine.trim() : "";
      return identityKey(title, author) === key && spine.startsWith("data:image/");
    });
  } catch {
    return false;
  }
}

function updateControl() {
  const modal = document.querySelector<HTMLElement>(".modal");
  const feedback = modal?.querySelector<HTMLElement>('[aria-label="Cover feedback"]');
  const identity = selectedIdentity();
  if (!modal || !feedback || !identity || !hasPhotographedSpine(identity.key)) return;

  let control = feedback.querySelector<HTMLElement>(".spine-source-preference");
  if (!control) {
    control = document.createElement("div");
    control.className = "spine-source-preference";
    control.style.display = "grid";
    control.style.gap = "6px";
    control.style.marginTop = "2px";

    const note = document.createElement("small");
    note.className = "spine-source-note";
    note.style.opacity = "0.72";
    note.style.lineHeight = "1.35";

    const restore = document.createElement("button");
    restore.type = "button";
    restore.className = "primary spine-source-restore";
    restore.style.minHeight = "38px";
    restore.addEventListener("click", () => {
      const current = selectedIdentity();
      if (!current) return;
      writePreference(current.key, { mode: "scan" });
      updateControl();
    });

    control.append(note, restore);
    feedback.appendChild(control);
  }

  const preference = readPreferences()[identity.key];
  const usingCover = preference?.mode === "cover";
  const note = control.querySelector<HTMLElement>(".spine-source-note");
  const restore = control.querySelector<HTMLButtonElement>(".spine-source-restore");
  if (note) {
    note.textContent = usingCover
      ? "Cover-based spine active. Your photographed spine is still saved as a fallback."
      : "Photographed spine active. Preview any cover, then save a cover crop or AI spine to replace it.";
  }
  if (restore) {
    restore.textContent = usingCover ? "📷 Restore photographed spine" : "📷 Photographed spine active";
    restore.disabled = !usingCover;
  }
}

export default function SpineSourcePreferenceEnricher() {
  useEffect(() => {
    let raf = 0;
    const mount = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        updateControl();
      });
    };

    const onGenerated = (event: Event) => {
      const detail = (event as CustomEvent<{ coverUrl?: string }>).detail;
      const identity = selectedIdentity();
      const coverUrl = detail?.coverUrl?.trim() || "";
      if (!identity || !coverUrl || !hasPhotographedSpine(identity.key)) return;
      writePreference(identity.key, { mode: "cover", coverUrl });
      mount();
    };

    const observer = new MutationObserver(mount);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "class"],
    });
    window.addEventListener("shelf-spine-generated", onGenerated);
    window.addEventListener("shelf-spine-source-changed", mount);
    mount();

    return () => {
      observer.disconnect();
      window.removeEventListener("shelf-spine-generated", onGenerated);
      window.removeEventListener("shelf-spine-source-changed", mount);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
