import { localDemoPublicShelf } from "./local-demo-readers";
import type { Database, Json } from "../lib/database.types";

const SUPABASE_URL = "https://vrkuimrfdkejfhpxlwlf.supabase.co";
const SUPABASE_KEY = "sb_publishable_mf0u925xGBkP4iNgxSCjuQ_H4Dp8r1S";
const SESSION_KEY = "shelf-of-fame-supabase-session";

export type CloudSettings = {
  theme?: string;
  spine_labels?: boolean;
  sideways_titles?: boolean;
  title_orientation?: "auto" | "upright" | "sideways";
  decor_owned?: unknown[];
  decor_active?: Record<string, string>;
  community_stars?: number;
  shelf_public?: boolean;
  plan?: "free" | "supporter" | "premium";
  premium_themes?: string[];
  profile_favorite_book_ids?: string[];
  profile_favorites_style?: "covers" | "spines";
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

type PublicFunctions = Database["public"]["Functions"];
type RpcName = keyof PublicFunctions;
type RpcArgs<Name extends RpcName> = PublicFunctions[Name]["Args"] extends never
  ? Record<string, never>
  : PublicFunctions[Name]["Args"];
type RpcResult<Name extends RpcName> = PublicFunctions[Name]["Returns"];

async function rpc<Name extends RpcName>(name: Name, body: RpcArgs<Name>, authenticated = true): Promise<RpcResult<Name>> {
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
  return data as RpcResult<Name>;
}

export function loadMyShelf() {
  return rpc("get_my_shelf", {}) as Promise<CloudShelf>;
}

export function syncMyShelf(books: unknown[], settings: CloudSettings, replace = true) {
  return rpc("sync_my_shelf", {
    p_books: books as Json,
    p_settings: settings as Json,
    p_replace: replace,
  }) as Promise<CloudShelf>;
}

export function updateMyShelfSettings(settings: Partial<CloudSettings>) {
  return rpc("update_my_shelf_settings", { p_settings: settings as Json }) as Promise<CloudSettings>;
}

export function updateProfileFavorites(bookIds: string[], style: "covers" | "spines") {
  return rpc("update_profile_favorites", {
    p_book_ids: bookIds.slice(0, 5),
    p_style: style,
  }) as Promise<Pick<CloudSettings, "profile_favorite_book_ids" | "profile_favorites_style">>;
}

export function loadPublicShelf(username: string) {
  const localShelf = localDemoPublicShelf(username);
  if (localShelf !== undefined) return Promise.resolve(localShelf);
  return rpc("get_public_shelf", { p_username: username }, false) as Promise<Record<string, unknown> | null>;
}

export function publicSpineUrl(storagePath?: string | null) {
  const path = (storagePath || "").trim();
  if (!path) return "";
  return `${SUPABASE_URL}/storage/v1/object/public/spines/${path.split("/").map(encodeURIComponent).join("/")}`;
}
