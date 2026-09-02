"use client";

import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import {
  cloudFavoriteIdentities,
  cloudPayloadBooks,
  localBooksForCloud,
  mergeCloudBooks,
} from "../../lib/books/cloud-library";
import { Book } from "../../lib/books/client-library";
import { CloudSettings, loadMyShelf, readShelfSession, syncMyShelf } from "../cloud-sync";
import type { ShelfPreferences } from "./useShelfPreferences";

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
const PENDING_SYNC_KEY = "shelf-of-fame-cloud-pending-v1";
const DEBOUNCE_MS = 1_500;
const MAX_RETRY_MS = 30_000;

type UseCloudShelfSyncOptions = {
  books: Book[];
  setBooks: Dispatch<SetStateAction<Book[]>>;
  storageReady: boolean;
  onCloudSettings?: (settings: CloudSettings) => void;
  preferences: ShelfPreferences;
};

export type CloudSyncStatus = "local" | "saving" | "saved" | "offline" | "retrying";

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

function currentSettings(fallbackPublic = false, preferences?: ShelfPreferences): CloudSettings {
  const decorOwned = safeJson<unknown[]>(OWNED_KEY, []);
  const decorActive = safeJson<Record<string, string>>(ACTIVE_KEY, {});
  const points = Math.max(0, Number(window.localStorage.getItem(POINTS_KEY) || 0) || 0);
  const publicRaw = window.localStorage.getItem(PUBLIC_KEY);
  return {
    theme: preferences?.theme || window.localStorage.getItem(THEME_KEY) || "botanical",
    spine_labels: preferences?.spineLabels ?? window.localStorage.getItem(SPINE_LABELS_KEY) !== "off",
    sideways_titles: (preferences?.titleOrientation || window.localStorage.getItem(TITLE_ORIENTATION_KEY)) !== "upright",
    title_orientation: preferences?.titleOrientation || (window.localStorage.getItem(TITLE_ORIENTATION_KEY) || "auto") as "auto" | "upright" | "sideways",
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
  window.localStorage.setItem(OWNED_KEY, JSON.stringify(Array.isArray(settings.decor_owned) ? settings.decor_owned : []));
  window.localStorage.setItem(ACTIVE_KEY, JSON.stringify(settings.decor_active && typeof settings.decor_active === "object" ? settings.decor_active : {}));
  window.localStorage.setItem(POINTS_KEY, String(Math.max(0, Number(settings.community_stars || 0))));
  window.localStorage.setItem(PUBLIC_KEY, settings.shelf_public ? "on" : "off");
  window.localStorage.setItem(PROFILE_FAVORITES_KEY, JSON.stringify(Array.isArray(settings.profile_favorite_book_ids) ? settings.profile_favorite_book_ids.slice(0, 5) : []));
  window.localStorage.setItem(PROFILE_FAVORITES_STYLE_KEY, settings.profile_favorites_style === "spines" ? "spines" : "covers");
}

function fingerprint(books: Book[], publicFallback = false, preferences?: ShelfPreferences) {
  return JSON.stringify({
    books: payloadBooks(books),
    settings: currentSettings(publicFallback, preferences),
  });
}

export function useCloudShelfSync({ books, setBooks, storageReady, onCloudSettings, preferences }: UseCloudShelfSyncOptions) {
  const [status, setStatus] = useState<CloudSyncStatus>("local");
  const booksRef = useRef(books);
  const preferencesRef = useRef(preferences);
  const preferencesInitialized = useRef(false);
  const running = useRef(false);
  const lastSynced = useRef("");
  const publicFallback = useRef(false);
  const storageReadyRef = useRef(storageReady);
  const retryCount = useRef(0);
  const retryTimer = useRef<number | null>(null);
  const debounceTimer = useRef<number | null>(null);
  const requestFlush = useRef<(delay?: number) => void>(() => undefined);

  useEffect(() => {
    booksRef.current = books;
    if (storageReady) {
      if (readShelfSession()?.access_token) setStatus(navigator.onLine ? "saving" : "offline");
      requestFlush.current(DEBOUNCE_MS);
    }
  }, [books, storageReady]);

  useEffect(() => {
    preferencesRef.current = preferences;
    if (!preferencesInitialized.current) {
      preferencesInitialized.current = true;
      return;
    }
    if (storageReady) requestFlush.current(DEBOUNCE_MS);
  }, [preferences, storageReady]);

  useEffect(() => {
    storageReadyRef.current = storageReady;
  }, [storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    let stopped = false;

    const clearRetry = () => {
      if (retryTimer.current !== null) window.clearTimeout(retryTimer.current);
      retryTimer.current = null;
    };

    const clearDebounce = () => {
      if (debounceTimer.current !== null) window.clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    };

    const scheduleRetry = () => {
      if (stopped || !navigator.onLine) return;
      clearRetry();
      const delay = Math.min(MAX_RETRY_MS, 1_000 * (2 ** retryCount.current));
      retryCount.current += 1;
      retryTimer.current = window.setTimeout(() => void flush(), delay);
    };

    const initialize = async () => {
      if (running.current || stopped || !storageReadyRef.current || !readShelfSession()?.access_token) return;
      running.current = true;
      setStatus(navigator.onLine ? "saving" : "offline");
      let failed = false;
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
          const cloudOrientation = cloudSettings.title_orientation
            || (cloudSettings.sideways_titles === false ? "upright" : cloudSettings.sideways_titles === true ? "sideways" : "auto");
          preferencesRef.current = {
            theme: "botanical",
            spineLabels: cloudSettings.spine_labels !== false,
            titleOrientation: cloudOrientation,
          };
          onCloudSettings?.(cloudSettings);
        }

        const settings = currentSettings(publicFallback.current, preferencesRef.current);
        if (!cloudBooks.length && !cloudSettings) {
          await syncMyShelf(payloadBooks(local), settings, true);
        } else if (local.length) {
          await syncMyShelf(payloadBooks(merged), settings, true);
        }

        window.localStorage.setItem(INITIALIZED_KEY, "1");
        lastSynced.current = fingerprint(merged, publicFallback.current, preferencesRef.current);
        setStatus("saved");
      } catch {
        // The shelf remains fully usable offline/local if cloud sync is unavailable.
        failed = true;
        setStatus(navigator.onLine ? "retrying" : "offline");
        scheduleRetry();
      } finally {
        running.current = false;
        if (!failed) requestFlush.current(DEBOUNCE_MS);
      }
    };

    const flush = async () => {
      if (stopped || !storageReadyRef.current || !readShelfSession()?.access_token) return;
      if (running.current) {
        requestFlush.current(250);
        return;
      }
      const currentBooks = localBooksForCloud(booksRef.current);
      const next = fingerprint(currentBooks, publicFallback.current, preferencesRef.current);
      if (!next || next === lastSynced.current) {
        setStatus("saved");
        return;
      }
      running.current = true;
      setStatus(navigator.onLine ? "saving" : "offline");
      let failed = false;
      clearRetry();
      try { window.localStorage.setItem(PENDING_SYNC_KEY, next); } catch { /* best effort */ }
      try {
        const result = await syncMyShelf(payloadBooks(currentBooks), currentSettings(publicFallback.current, preferencesRef.current), true);
        publicFallback.current = Boolean(result.settings?.shelf_public);
        lastSynced.current = next;
        retryCount.current = 0;
        setStatus("saved");
        if (window.localStorage.getItem(PENDING_SYNC_KEY) === next) {
          window.localStorage.removeItem(PENDING_SYNC_KEY);
        }
      } catch {
        // Keep the pending fingerprint across reloads and retry with backoff.
        failed = true;
        setStatus(navigator.onLine ? "retrying" : "offline");
        scheduleRetry();
      } finally {
        running.current = false;
        const latest = fingerprint(localBooksForCloud(booksRef.current), publicFallback.current, preferencesRef.current);
        if (!failed && latest !== lastSynced.current) requestFlush.current(DEBOUNCE_MS);
      }
    };

    requestFlush.current = (delay = DEBOUNCE_MS) => {
      if (stopped) return;
      clearDebounce();
      debounceTimer.current = window.setTimeout(() => void flush(), delay);
    };

    void initialize();
    const interval = window.setInterval(() => requestFlush.current(0), 5_000);
    const onFocus = () => requestFlush.current(0);
    const onOnline = () => {
      retryCount.current = 0;
      setStatus(readShelfSession()?.access_token ? "saving" : "local");
      requestFlush.current(0);
    };
    const onOffline = () => setStatus(readShelfSession()?.access_token ? "offline" : "local");
    const onAuth = () => {
      lastSynced.current = "";
      retryCount.current = 0;
      setStatus(readShelfSession()?.access_token ? "saving" : "local");
      void initialize();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("shelf-auth-changed", onAuth as EventListener);

    return () => {
      stopped = true;
      window.clearInterval(interval);
      clearRetry();
      clearDebounce();
      requestFlush.current = () => undefined;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("shelf-auth-changed", onAuth as EventListener);
    };
  }, [onCloudSettings, setBooks, storageReady]);

  return status;
}
