"use client";

import { useEffect, useRef } from "react";
import { CloudSettings, loadMyShelf, readShelfSession, syncMyShelf } from "./cloud-sync";

const LIBRARY_KEY = "shelf-of-fame-library-v1";
const THEME_KEY = "shelf-of-fame-theme-v1";
const SPINE_LABELS_KEY = "shelf-of-fame-spine-labels-v1";
const OWNED_KEY = "shelf-of-fame-decor-owned-v1";
const ACTIVE_KEY = "shelf-of-fame-decor-active-v1";
const POINTS_KEY = "shelf-of-fame-community-points-v1";
const FAVORITES_KEY = "shelf-of-fame-favorites-v1";
const PUBLIC_KEY = "shelf-of-fame-public-v1";
const INITIALIZED_KEY = "shelf-of-fame-cloud-initialized-v1";
const SAMPLE_IDS = new Set(["1","2","3","4","5","6","7","8","9","10","11","12"]);

type StoredBook = {
  id?: string;
  title?: string;
  author?: string;
  isbn?: string;
  asin?: string;
  preferredCover?: { url?: string; source?: string };
  savedCovers?: Array<{ url?: string; source?: string }>;
  coverFeedback?: unknown;
  favorite?: boolean;
} & Record<string, unknown>;

function normalize(value?: string) {
  return (value || "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function identity(book: StoredBook) {
  return `${normalize(book.title)}::${normalize(book.author)}`;
}

function safeJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function readLibrary() {
  const books = safeJson<StoredBook[]>(LIBRARY_KEY, []);
  if (books.length === 12 && books.every((book) => SAMPLE_IDS.has(String(book.id || "")))) return [];
  return books;
}

function readFavorites() {
  return new Set(safeJson<string[]>(FAVORITES_KEY, []));
}

function payloadBooks() {
  const favorites = readFavorites();
  return readLibrary().map((book) => ({
    ...book,
    favorite: favorites.has(identity(book)) || Boolean(book.favorite),
  }));
}

function currentSettings(fallbackPublic = false): CloudSettings {
  const decorOwned = safeJson<unknown[]>(OWNED_KEY, []);
  const decorActive = safeJson<Record<string, string>>(ACTIVE_KEY, {});
  const points = Math.max(0, Number(window.localStorage.getItem(POINTS_KEY) || 0) || 0);
  const publicRaw = window.localStorage.getItem(PUBLIC_KEY);
  return {
    theme: window.localStorage.getItem(THEME_KEY) || "classic",
    spine_labels: window.localStorage.getItem(SPINE_LABELS_KEY) !== "off",
    decor_owned: decorOwned,
    decor_active: decorActive,
    community_stars: points,
    shelf_public: publicRaw === null ? fallbackPublic : publicRaw === "on",
  };
}

function cloudBookToLocal(book: Record<string, unknown>): StoredBook {
  const next = { ...book } as StoredBook;
  delete next.cloudBookId;
  delete next.updatedAt;
  delete next.spineStoragePath;
  delete next.spineProvider;
  delete next.spineModel;
  delete next.selectedSpineId;
  delete next.favorite;
  return next;
}

function mergeBooks(local: StoredBook[], cloud: Array<Record<string, unknown>>) {
  const result = new Map<string, StoredBook>();
  const order: string[] = [];

  for (const raw of cloud) {
    const book = cloudBookToLocal(raw);
    const key = String(book.id || identity(book));
    if (!result.has(key)) order.push(key);
    result.set(key, book);
  }

  for (const book of local) {
    const byId = String(book.id || "");
    const cloudKey = byId && result.has(byId)
      ? byId
      : [...result.entries()].find(([, candidate]) => identity(candidate) === identity(book))?.[0];
    const key = cloudKey || byId || identity(book);
    const existing = result.get(key);
    if (!result.has(key)) order.push(key);
    result.set(key, existing ? {
      ...existing,
      ...book,
      preferredCover: book.preferredCover || existing.preferredCover,
      savedCovers: Array.isArray(book.savedCovers) && book.savedCovers.length ? book.savedCovers : existing.savedCovers,
      coverFeedback: book.coverFeedback || existing.coverFeedback,
    } : book);
  }

  return order.map((key) => result.get(key)).filter(Boolean) as StoredBook[];
}

function applyCloudFavorites(cloud: Array<Record<string, unknown>>) {
  const favorites = cloud
    .filter((book) => book.favorite === true)
    .map((book) => identity(book as StoredBook));
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

function applyCloudSettings(settings: CloudSettings) {
  if (settings.theme) window.localStorage.setItem(THEME_KEY, settings.theme);
  window.localStorage.setItem(SPINE_LABELS_KEY, settings.spine_labels === false ? "off" : "on");
  window.localStorage.setItem(OWNED_KEY, JSON.stringify(Array.isArray(settings.decor_owned) ? settings.decor_owned : []));
  window.localStorage.setItem(ACTIVE_KEY, JSON.stringify(settings.decor_active && typeof settings.decor_active === "object" ? settings.decor_active : {}));
  window.localStorage.setItem(POINTS_KEY, String(Math.max(0, Number(settings.community_stars || 0))));
  window.localStorage.setItem(PUBLIC_KEY, settings.shelf_public ? "on" : "off");
  if (settings.theme) document.documentElement.dataset.shelfTheme = settings.theme;
  document.documentElement.dataset.spineLabels = settings.spine_labels === false ? "off" : "on";
}

function fingerprint(publicFallback = false) {
  return JSON.stringify({ books: payloadBooks(), settings: currentSettings(publicFallback) });
}

export default function CloudSyncEnricher() {
  const running = useRef(false);
  const lastSynced = useRef("");
  const publicFallback = useRef(false);

  useEffect(() => {
    let stopped = false;

    const initialize = async () => {
      if (running.current || stopped || !readShelfSession()?.access_token) return;
      running.current = true;
      try {
        const cloud = await loadMyShelf();
        if (stopped) return;
        const local = readLibrary();
        const cloudBooks = Array.isArray(cloud.books) ? cloud.books : [];
        const cloudSettings = cloud.settings || null;
        let changed = false;

        if (cloudBooks.length) {
          const merged = mergeBooks(local, cloudBooks);
          const nextLibrary = JSON.stringify(merged);
          if ((window.localStorage.getItem(LIBRARY_KEY) || "[]") !== nextLibrary) {
            window.localStorage.setItem(LIBRARY_KEY, nextLibrary);
            changed = true;
          }
          applyCloudFavorites(cloudBooks);
        }

        if (cloudSettings) {
          publicFallback.current = Boolean(cloudSettings.shelf_public);
          const before = currentSettings(publicFallback.current);
          applyCloudSettings(cloudSettings);
          const after = currentSettings(publicFallback.current);
          changed ||= JSON.stringify(before) !== JSON.stringify(after);
        }

        if (!cloudBooks.length && !cloudSettings) {
          await syncMyShelf(payloadBooks(), currentSettings(false), true);
        } else if (local.length) {
          await syncMyShelf(payloadBooks(), currentSettings(publicFallback.current), true);
        }

        window.localStorage.setItem(INITIALIZED_KEY, "1");
        lastSynced.current = fingerprint(publicFallback.current);

        if (changed && window.location.pathname === "/") {
          const reloadKey = "shelf-of-fame-cloud-reload-once";
          if (!window.sessionStorage.getItem(reloadKey)) {
            window.sessionStorage.setItem(reloadKey, "1");
            window.location.reload();
          }
        }
      } catch {
        // The shelf remains fully usable offline/local if cloud sync is unavailable.
      } finally {
        running.current = false;
      }
    };

    const flush = async () => {
      if (running.current || stopped || !readShelfSession()?.access_token) return;
      const next = fingerprint(publicFallback.current);
      if (!next || next === lastSynced.current) return;
      running.current = true;
      try {
        const result = await syncMyShelf(payloadBooks(), currentSettings(publicFallback.current), true);
        publicFallback.current = Boolean(result.settings?.shelf_public);
        lastSynced.current = fingerprint(publicFallback.current);
      } catch {
        // Retry on the next interval/focus without interrupting the reader.
      } finally {
        running.current = false;
      }
    };

    void initialize();
    const interval = window.setInterval(() => void flush(), 5000);
    const onFocus = () => void flush();
    const onAuth = () => {
      lastSynced.current = "";
      void initialize();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("shelf-auth-changed", onAuth as EventListener);
    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("shelf-auth-changed", onAuth as EventListener);
    };
  }, []);

  return null;
}
