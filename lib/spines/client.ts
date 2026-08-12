const DB_NAME = "shelf-of-fame-art";
const STORE_NAME = "generated-spines";
const DB_VERSION = 1;
const MODE_KEY_PREFIX = "mode:";

export const SPINE_POSITIONS = ["left", "center", "right"] as const;
export type SpinePosition = (typeof SPINE_POSITIONS)[number];
export type SpineRenderMode = "integrated" | "overlay";

export type SpineGeneratedEventDetail = {
  coverUrl: string;
  image: string;
  position?: SpinePosition;
  renderMode?: SpineRenderMode;
  shared?: boolean;
};

function openSpineDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readStore<T>(key: string): Promise<T | undefined> {
  const db = await openSpineDb();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function getGeneratedSpine(coverUrl: string) {
  try {
    const value = await readStore<unknown>(coverUrl);
    return typeof value === "string" ? value : undefined;
  } catch {
    return undefined;
  }
}

export async function getGeneratedSpineMode(coverUrl: string): Promise<SpineRenderMode> {
  try {
    const value = await readStore<unknown>(`${MODE_KEY_PREFIX}${coverUrl}`);
    return value === "integrated" ? "integrated" : "overlay";
  } catch {
    return "overlay";
  }
}

export async function hasLocalSpine(coverUrl: string) {
  return Boolean(await getGeneratedSpine(coverUrl));
}

export async function saveGeneratedSpine(coverUrl: string, image: string, renderMode: SpineRenderMode) {
  const db = await openSpineDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(image, coverUrl);
      store.put(renderMode, `${MODE_KEY_PREFIX}${coverUrl}`);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export function generatedSpineUrl(coverUrl: string, position: SpinePosition = "center") {
  return `/api/spine?v=3&position=${position}&cover=${encodeURIComponent(coverUrl)}`;
}

export function storedSpinePosition(image?: string): SpinePosition | null {
  if (!image) return null;
  try {
    const url = new URL(image, "https://shelf-of-fame.local");
    if (url.pathname !== "/api/spine") return null;
    const position = url.searchParams.get("position");
    return SPINE_POSITIONS.includes(position as SpinePosition) ? position as SpinePosition : null;
  } catch {
    return null;
  }
}

export function storedSpineCrop(image: string): SpinePosition | "custom" {
  return storedSpinePosition(image) || "custom";
}

export function splitBookIdentity(raw: string) {
  const splitAt = raw.lastIndexOf(" — ");
  if (splitAt < 0) return { title: raw.trim(), author: "" };
  return {
    title: raw.slice(0, splitAt).trim(),
    author: raw.slice(splitAt + 3).trim(),
  };
}

export function shelfSpineDisplayTitle(title: string) {
  let cleaned = title.trim();
  cleaned = cleaned.replace(/\s*[\(\[][^\)\]]*(?:book|volume|vol\.?|series|#)\s*[^\)\]]*[\)\]]\s*$/i, "").trim();
  if (cleaned.length > 28) {
    const primary = cleaned.split(/\s+(?:—|–|-|:)\s+|:\s+/)[0]?.trim();
    if (primary && primary.length >= 5) cleaned = primary;
  }
  if (cleaned.length > 34) cleaned = `${cleaned.slice(0, 31).trim()}…`;
  return cleaned || title.trim();
}

export function shelfSpineDisplayAuthor(author: string) {
  const cleaned = author.replace(/\s*\([^\)]*\)\s*$/g, "").replace(/\s+/g, " ").trim();
  if (cleaned.length <= 22) return cleaned;
  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length > 2) return `${parts[0]} ${parts[parts.length - 1]}`;
  return `${cleaned.slice(0, 20).trim()}…`;
}

export function spineTitleScale(title: string) {
  if (title.length > 27) return "compact";
  if (title.length > 18) return "medium";
  return "normal";
}

export function applySpineTypographyMode(spine: HTMLElement, renderMode: SpineRenderMode) {
  spine.dataset.typography = renderMode;
  const hidden = renderMode === "integrated";
  const title = spine.querySelector<HTMLElement>(".generated-spine-title");
  const author = spine.querySelector<HTMLElement>(".generated-spine-author");
  if (title) title.hidden = hidden;
  if (author) author.hidden = hidden;
}
