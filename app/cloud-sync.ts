const SUPABASE_URL = "https://vrkuimrfdkejfhpxlwlf.supabase.co";
const SUPABASE_KEY = "sb_publishable_mf0u925xGBkP4iNgxSCjuQ_H4Dp8r1S";
const SESSION_KEY = "shelf-of-fame-supabase-session";

export type CloudSettings = {
  theme?: string;
  spine_labels?: boolean;
  decor_owned?: unknown[];
  decor_active?: Record<string, string>;
  community_stars?: number;
  shelf_public?: boolean;
  plan?: "free" | "supporter" | "premium";
  premium_themes?: string[];
  updated_at?: string;
};

export type CloudShelf = {
  books?: Array<Record<string, unknown>>;
  settings?: CloudSettings | null;
};

type StoredSession = {
  access_token?: string;
  user?: { id?: string };
};

export function readShelfSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as StoredSession : null;
  } catch {
    return null;
  }
}

export function shelfAccessToken() {
  return readShelfSession()?.access_token || "";
}

async function rpc<T>(name: string, body: Record<string, unknown>, authenticated = true): Promise<T> {
  const token = authenticated ? shelfAccessToken() : "";
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    cache: "no-store",
    headers: {
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || data?.error || `Cloud request failed (${response.status})`);
  return data as T;
}

export function loadMyShelf() {
  return rpc<CloudShelf>("get_my_shelf", {});
}

export function syncMyShelf(books: unknown[], settings: CloudSettings, replace = true) {
  return rpc<CloudShelf>("sync_my_shelf", {
    p_books: books,
    p_settings: settings,
    p_replace: replace,
  });
}

export function updateMyShelfSettings(settings: Partial<CloudSettings>) {
  return rpc<CloudSettings>("update_my_shelf_settings", { p_settings: settings });
}

export function loadPublicShelf(username: string) {
  return rpc<Record<string, unknown> | null>("get_public_shelf", { p_username: username }, false);
}

export function publicSpineUrl(storagePath?: string | null) {
  const path = (storagePath || "").trim();
  if (!path) return "";
  return `${SUPABASE_URL}/storage/v1/object/public/spines/${path.split("/").map(encodeURIComponent).join("/")}`;
}
