export const SUPABASE_URL = "https://vrkuimrfdkejfhpxlwlf.supabase.co";
export const SUPABASE_KEY = "sb_publishable_mf0u925xGBkP4iNgxSCjuQ_H4Dp8r1S";
export const AUTH_CHANGED_EVENT = "shelf-auth-changed";

const SESSION_KEY = "shelf-of-fame-supabase-session";

export type StoredShelfSession = {
  access_token?: string;
  user?: { id?: string };
};

export function readStoredShelfSession(): StoredShelfSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as StoredShelfSession : null;
  } catch {
    return null;
  }
}
