"use client";

import { useEffect } from "react";
import {
  dispatchShelfAuthError,
  parseShelfAuthHash,
  persistShelfSession,
  readStoredShelfSession,
  refreshShelfSession,
} from "./auth-client";

const REFRESH_INTERVAL_MS = 45 * 60 * 1000;

export default function AuthSessionManager() {
  useEffect(() => {
    let stopped = false;
    let refreshing = false;

    const cleanAuthHash = () => {
      window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}`);
    };

    const refreshStoredSession = async () => {
      if (refreshing || stopped) return;
      const stored = readStoredShelfSession();
      if (!stored?.refresh_token) return;
      refreshing = true;
      try {
        await refreshShelfSession(stored);
      } catch {
        // Keep the saved session during a transient network failure. A later
        // refresh, focus, or explicit sign-in can recover it.
      } finally {
        refreshing = false;
      }
    };

    const callback = parseShelfAuthHash(window.location.hash);
    if (callback?.error) {
      dispatchShelfAuthError(callback.error);
      cleanAuthHash();
    } else if (callback?.session) {
      void persistShelfSession(callback.session)
        .then(cleanAuthHash)
        .catch(() => dispatchShelfAuthError("We could not finish signing you in. Please try again."));
    } else {
      void refreshStoredSession();
    }

    const interval = window.setInterval(() => void refreshStoredSession(), REFRESH_INTERVAL_MS);
    const onFocus = () => void refreshStoredSession();
    window.addEventListener("focus", onFocus);

    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return null;
}
