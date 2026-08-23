export const SUPABASE_URL = "https://vrkuimrfdkejfhpxlwlf.supabase.co";
export const SUPABASE_KEY = "sb_publishable_mf0u925xGBkP4iNgxSCjuQ_H4Dp8r1S";
export const SESSION_KEY = "shelf-of-fame-supabase-session";
export const AUTH_CHANGED_EVENT = "shelf-auth-changed";
export const AUTH_ERROR_EVENT = "shelf-auth-error";

export type ShelfUser = {
  id?: string;
  email?: string;
  user_metadata?: { username?: string; display_name?: string };
};

export type ShelfProfile = {
  username?: string;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  favorite_genres?: string[];
  trusted_curator?: boolean;
};

export type ShelfSession = {
  access_token: string;
  refresh_token?: string;
  user?: ShelfUser;
  profile?: ShelfProfile;
};

type Fetcher = typeof fetch;
type AuthResponse = ShelfSession & { user?: ShelfUser };

function responseMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;
  const record = data as Record<string, unknown>;
  return String(record.msg || record.message || record.error_description || record.error || fallback);
}

export async function supabaseAuthRequest(path: string, body: object, fetcher: Fetcher = fetch) {
  const response = await fetcher(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(responseMessage(data, "Account request failed"));
  return (data || {}) as AuthResponse;
}

export async function getShelfUser(accessToken: string, fetcher: Fetcher = fetch): Promise<ShelfUser | undefined> {
  const response = await fetcher(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return undefined;
  return response.json();
}

export async function getShelfProfile(userId: string, accessToken: string, fetcher: Fetcher = fetch): Promise<ShelfProfile | undefined> {
  const response = await fetcher(
    `${SUPABASE_URL}/rest/v1/profiles?select=username,display_name,avatar_url,bio,favorite_genres,trusted_curator&id=eq.${encodeURIComponent(userId)}&limit=1`,
    {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );
  if (!response.ok) return undefined;
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] : undefined;
}

export function readStoredShelfSession(): ShelfSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as ShelfSession : null;
  } catch {
    return null;
  }
}

export function dispatchShelfAuthChanged(session: ShelfSession | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, { detail: session }));
}

export function dispatchShelfAuthError(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_ERROR_EVENT, { detail: message }));
}

export function storeShelfSession(session: ShelfSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  dispatchShelfAuthChanged(session);
}

export async function persistShelfSession(session: ShelfSession, fetcher: Fetcher = fetch) {
  const user = session.user || await getShelfUser(session.access_token, fetcher);
  const profile = user?.id ? await getShelfProfile(user.id, session.access_token, fetcher) : session.profile;
  const enriched: ShelfSession = { ...session, user, profile: profile || session.profile };
  storeShelfSession(enriched);
  return enriched;
}

export async function refreshShelfSession(session: ShelfSession, fetcher: Fetcher = fetch) {
  if (!session.refresh_token) return session;
  const data = await supabaseAuthRequest(
    "token?grant_type=refresh_token",
    { refresh_token: session.refresh_token },
    fetcher,
  );
  if (!data.access_token) throw new Error("Could not refresh your account session.");
  return persistShelfSession({
    ...session,
    access_token: data.access_token,
    refresh_token: data.refresh_token || session.refresh_token,
    user: data.user || session.user,
  }, fetcher);
}

export async function revokeShelfSession(accessToken: string, fetcher: Fetcher = fetch) {
  const response = await fetcher(`${SUPABASE_URL}/auth/v1/logout?scope=local`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok && response.status !== 401 && response.status !== 403) {
    const data = await response.json().catch(() => null);
    throw new Error(responseMessage(data, "Could not sign out right now."));
  }
}

export async function signOutShelfSession(session: ShelfSession, fetcher: Fetcher = fetch) {
  await revokeShelfSession(session.access_token, fetcher);
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(SESSION_KEY);
    dispatchShelfAuthChanged(null);
  }
}

export type ShelfAuthCallback = {
  session?: ShelfSession;
  error?: string;
};

export function parseShelfAuthHash(hash: string): ShelfAuthCallback | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const error = params.get("error_description") || params.get("error");
  if (error) return { error: error.replace(/\+/g, " ") };
  const accessToken = params.get("access_token");
  if (!accessToken) return null;
  return {
    session: {
      access_token: accessToken,
      refresh_token: params.get("refresh_token") || undefined,
    },
  };
}

export function cleanUsername(value: string) {
  return value.trim().toLowerCase();
}

export function usernameFormatError(value: string) {
  if (value.length < 3 || value.length > 24) return "Username must be 3–24 characters.";
  if (!/^[a-z0-9][a-z0-9_.]*$/.test(value)) return "Use letters, numbers, underscores, or periods only.";
  if (/[_.]{2,}/.test(value)) return "Avoid repeated periods or underscores.";
  return "";
}

export async function usernameAvailable(username: string, fetcher: Fetcher = fetch) {
  const response = await fetcher(`${SUPABASE_URL}/rest/v1/rpc/username_available`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ candidate: username }),
  });
  if (!response.ok) throw new Error("Could not check that username right now.");
  return Boolean(await response.json());
}
