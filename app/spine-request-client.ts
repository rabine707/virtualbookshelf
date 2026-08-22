import {
  AUTH_CHANGED_EVENT,
  SUPABASE_KEY,
  SUPABASE_URL,
  readStoredShelfSession,
  refreshShelfSession,
  type ShelfSession,
} from "./auth-client";

export { AUTH_CHANGED_EVENT, SUPABASE_KEY, SUPABASE_URL, readStoredShelfSession };

export async function freshShelfSession() {
  const session = readStoredShelfSession();
  if (!session?.access_token) return null;
  return session.refresh_token ? refreshShelfSession(session) : session;
}

export async function shelfAuthenticatedFetch(input: string, init: RequestInit = {}) {
  let session = readStoredShelfSession();
  if (!session?.access_token) return { response: null, session: null };

  const send = (current: ShelfSession) => fetch(input, {
    ...init,
    headers: {
      ...init.headers,
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${current.access_token}`,
    },
  });

  let response = await send(session);
  if ((response.status === 401 || response.status === 403) && session.refresh_token) {
    session = await refreshShelfSession(session);
    response = await send(session);
  }

  return { response, session };
}
