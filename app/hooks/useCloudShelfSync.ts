"use client";

import { Dispatch, SetStateAction, useEffect, useRef } from "react";
import {
  cloudFavoriteIdentities,
  cloudPayloadBooks,
  localBooksForCloud,
  mergeCloudBooks,
} from "../../lib/books/cloud-library";
import { Book } from "../../lib/books/client-library";
import { CloudSettings, loadMyShelf, readShelfSession, syncMyShelf } from "../cloud-sync";

const THEME_KEY = "shelf-of-fame-theme-v1";
const SPINE_LABELS_KEY = "shelf-of-fame-spine-labels-v1";
const SIDEWAYS_TITLES_KEY = "shelf-of-fame-sideways-titles-v1";
const TITLE_ORIENTATION_KEY = "shelf-of-fame-title-orientation-v1";
const OWNED_KEY = "shelf-of-fame-decor-owned-v1";
const ACTIVE_KEY = "shelf-of-fame-decor-active-v1";
const POINTS_KEY = "shelf-of-fame-community-points-v1";
const FAVORITES_KEY = "shelf-of-fame-favorites-v1";
const PROFILE_FAVORITES_KEY = "shelf-of-fame-profile-favorites-v1";
const PROFILE_FAVORITES_STYLE_KEY = "shelf-of-fame-profile-favorites-style-v1";
const PUBLIC_KEY = "shelf-of-fame-public-v1";
const INITIALIZED_KEY = "shelf-of-fame-cloud-initialized-v1";

type UseCloudShelfSyncOptions = {
  books: Book[];
  setBooks: Dispatch<SetStateAction<Book[]>>;
  storageReady: boolean;
};

function safeJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function readFavorites() {
  return new Set(safeJson<string[]>(FAVORITES_KEY, []));
}

function payloadBooks(books: Book[]) {
  return cloudPayloadBooks(books, readFavorites());
}

function currentSettings(fallbackPublic = false): CloudSettings {
  const decorOwned = safeJson<unknown[]>(OWNED_KEY, []);
  const decorActive = safeJson<Record<string, string>>(ACTIVE_KEY, {});
  const points = Math.max(0, Number(window.localStorage.getItem(POINTS_KEY) || 0) || 0);
  const publicRaw = window.localStorage.getItem(PUBLIC_KEY);
  return {
    theme: window.localStorage.getItem(THEME_KEY) || "classic",
    spine_labels: window.localStorage.getItem(SPINE_LABELS_KEY) !== "off",
    sideways_titles: window.localStorage.getItem(TITLE_ORIENTATION_KEY) !== "upright",
    title_orientation: (window.localStorage.getItem(TITLE_ORIENTATION_KEY) || "auto") as "auto" | "upright" | "sideways",
    decor_owned: decorOwned,
    decor_active: decorActive,
    community_stars: points,
    shelf_public: publicRaw === null ? fallbackPublic : publicRaw === "on",
    profile_favorite_book_ids: safeJson<string[]>(PROFILE_FAVORITES_KEY, []).slice(0, 5),
    profile_favorites_style: window.localStorage.getItem(PROFILE_FAVORITES_STYLE_KEY) === "spines" ? "spines" : "covers",
  };
}

function applyCloudFavorites(cloudBooks: Array<Record<string, unknown>>) {
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(cloudFavoriteIdentities(cloudBooks)));
}

function applyCloudSettings(settings: CloudSettings) {
  if (settings.theme) window.localStorage.setItem(THEME_KEY, settings.theme);
  window.localStorage.setItem(SPINE_LABELS_KEY, settings.spine_labels === false ? "off" : "on");
  const titleOrientation = settings.title_orientation
    || (settings.sideways_titles === false ? "upright" : settings.sideways_titles === true ? "sideways" : "auto");
  const sidewaysTitles = titleOrientation !== "upright";
  window.localStorage.setItem(SIDEWAYS_TITLES_KEY, sidewaysTitles ? "on" : "off");
  window.localStorage.setItem(TITLE_ORIENTATION_KEY, titleOrientation);
  window.localStorage.setItem(OWNED_KEY, JSON.stringify(Array.isArray(settings.decor_owned) ? settings.decor_owned : []));
  window.localStorage.setItem(ACTIVE_KEY, JSON.stringify(settings.decor_active && typeof settings.decor_active === "object" ? settings.decor_active : {}));
  window.localStorage.setItem(POINTS_KEY, String(Math.max(0, Number(settings.community_stars || 0))));
  window.localStorage.setItem(PUBLIC_KEY, settings.shelf_public ? "on" : "off");
  window.localStorage.setItem(PROFILE_FAVORITES_KEY, JSON.stringify(Array.isArray(settings.profile_favorite_book_ids) ? settings.profile_favorite_book_ids.slice(0, 5) : []));
  window.localStorage.setItem(PROFILE_FAVORITES_STYLE_KEY, settings.profile_favorites_style === "spines" ? "spines" : "covers");
  if (settings.theme) document.documentElement.dataset.shelfTheme = settings.theme;
  document.documentElement.dataset.spineLabels = settings.spine_labels === false ? "off" : "on";
  document.documentElement.dataset.titleOrientation = titleOrientation;
  window.dispatchEvent(new CustomEvent<string>("shelf-title-orientation-changed", { detail: titleOrientation }));
}

function fingerprint(books: Book[], publicFallback = false) {
  return JSON.stringify({
    books: payloadBooks(books),
    settings: currentSettings(publicFallback),
  });
}

export function useCloudShelfSync({ books, setBooks, storageReady }: UseCloudShelfSyncOptions) {
  const booksRef = useRef(books);
  const running = useRef(false);
  const lastSynced = useRef("");
  const publicFallback = useRef(false);
  const storageReadyRef = useRef(storageReady);

  useEffect(() => {
    booksRef.current = books;
  }, [books]);

  useEffect(() => {
    storageReadyRef.current = storageReady;
  }, [storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    let stopped = false;

    const initialize = async () => {
      if (running.current || stopped || !storageReadyRef.current || !readShelfSession()?.access_token) return;
      running.current = true;
      try {
        const cloud = await loadMyShelf();
        if (stopped) return;

        const local = localBooksForCloud(booksRef.current);
        const cloudBooks = Array.isArray(cloud.books) ? cloud.books : [];
        const cloudSettings = cloud.settings || null;
        let merged = local;

        if (cloudBooks.length) {
          merged = mergeCloudBooks(local, cloudBooks);
          applyCloudFavorites(cloudBooks);
          booksRef.current = merged;
          setBooks(merged);
        }

        if (cloudSettings) {
          publicFallback.current = Boolean(cloudSettings.shelf_public);
          applyCloudSettings(cloudSettings);
        }

        const settings = currentSettings(publicFallback.current);
        if (!cloudBooks.length && !cloudSettings) {
          await syncMyShelf(payloadBooks(local), settings, true);
        } else if (local.length) {
          await syncMyShelf(payloadBooks(merged), settings, true);
        }

        window.localStorage.setItem(INITIALIZED_KEY, "1");
        lastSynced.current = fingerprint(merged, publicFallback.current);
      } catch {
        // The shelf remains fully usable offline/local if cloud sync is unavailable.
      } finally {
        running.current = false;
      }
    };

    const flush = async () => {
      if (running.current || stopped || !storageReadyRef.current || !readShelfSession()?.access_token) return;
      const currentBooks = localBooksForCloud(booksRef.current);
      const next = fingerprint(currentBooks, publicFallback.current);
      if (!next || next === lastSynced.current) return;
      running.current = true;
      try {
        const result = await syncMyShelf(payloadBooks(currentBooks), currentSettings(publicFallback.current), true);
        publicFallback.current = Boolean(result.settings?.shelf_public);
        lastSynced.current = fingerprint(currentBooks, publicFallback.current);
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
  }, [setBooks, storageReady]);
}
