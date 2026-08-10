"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

const SUPABASE_URL = "https://vrkuimrfdkejfhpxlwlf.supabase.co";
const SUPABASE_KEY = "sb_publishable_mf0u925xGBkP4iNgxSCjuQ_H4Dp8r1S";
const SESSION_KEY = "shelf-of-fame-supabase-session";
const REFRESH_INTERVAL_MS = 45 * 60 * 1000;

type User = {
  id?: string;
  email?: string;
  user_metadata?: { username?: string; display_name?: string };
};

type Profile = {
  username?: string;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
};
type Session = { access_token: string; refresh_token?: string; user?: User; profile?: Profile };

async function auth(path: string, body: object) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.msg || data?.message || data?.error_description || "Account request failed");
  return data;
}

async function getUser(accessToken: string): Promise<User | undefined> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return undefined;
  return response.json();
}

async function getProfile(userId?: string, accessToken?: string): Promise<Profile | undefined> {
  if (!userId) return undefined;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=username,display_name,avatar_url,bio&id=eq.${encodeURIComponent(userId)}&limit=1`, {
    headers: {
      apikey: SUPABASE_KEY,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
  if (!response.ok) return undefined;
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] : undefined;
}

async function usernameAvailable(username: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/username_available`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ candidate: username }),
  });
  if (!response.ok) throw new Error("Could not check that username right now.");
  return Boolean(await response.json());
}

function cleanUsername(value: string) {
  return value.trim().toLowerCase();
}

function usernameFormatError(value: string) {
  if (value.length < 3 || value.length > 24) return "Username must be 3–24 characters.";
  if (!/^[a-z0-9][a-z0-9_.]*$/.test(value)) return "Use letters, numbers, underscores, or periods only.";
  if (/[_.]{2,}/.test(value)) return "Avoid repeated periods or underscores.";
  return "";
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "S";
}

export default function AuthEnricher() {
  const [session, setSession] = useState<Session | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);

  async function saveSession(next: Session) {
    const user = next.user || await getUser(next.access_token);
    const profile = await getProfile(user?.id, next.access_token);
    const enriched = { ...next, user, profile };
    localStorage.setItem(SESSION_KEY, JSON.stringify(enriched));
    setSession(enriched);
    window.dispatchEvent(new CustomEvent("shelf-auth-changed", { detail: enriched }));
  }

  useEffect(() => {
    let refreshTimer: number | undefined;

    function onAuthChanged(event: Event) {
      const detail = (event as CustomEvent<Session | null>).detail;
      setSession(detail || null);
    }
    window.addEventListener("shelf-auth-changed", onAuthChanged as EventListener);

    const refreshStoredSession = async () => {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return;
        const stored = JSON.parse(raw) as Session;
        if (!stored.refresh_token) return;
        const data = await auth("token?grant_type=refresh_token", { refresh_token: stored.refresh_token });
        if (!data?.access_token) return;
        await saveSession({
          ...stored,
          access_token: data.access_token,
          refresh_token: data.refresh_token || stored.refresh_token,
          user: data.user || stored.user,
        });
      } catch {
        // Keep the saved session in place on a transient refresh failure.
        // A later refresh or explicit sign-in can recover it.
      }
    };

    try {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token") || undefined;
      const authError = hash.get("error_description") || hash.get("error");

      if (authError) {
        setMessage(authError.replace(/\+/g, " "));
        setOpen(true);
        setMode("login");
        window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}`);
      } else if (accessToken) {
        void saveSession({ access_token: accessToken, refresh_token: refreshToken }).then(() => {
          setMessage("");
          setOpen(false);
          window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}`);
        });
      } else {
        const raw = localStorage.getItem(SESSION_KEY);
        if (raw) {
          const stored = JSON.parse(raw) as Session;
          setSession(stored);
          void refreshStoredSession();
        }
      }
    } catch {}

    refreshTimer = window.setInterval(() => { void refreshStoredSession(); }, REFRESH_INTERVAL_MS);

    return () => {
      window.removeEventListener("shelf-auth-changed", onAuthChanged as EventListener);
      if (refreshTimer) window.clearInterval(refreshTimer);
    };
  }, []);

  async function checkUsernameField(rawUsername: string) {
    const username = cleanUsername(rawUsername);
    const formatError = usernameFormatError(username);
    if (formatError) {
      setMessage(formatError);
      return false;
    }
    setCheckingUsername(true);
    try {
      const available = await usernameAvailable(username);
      setMessage(available ? `@${username} is available.` : "That username is unavailable or not allowed.");
      return available;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not check that username.");
      return false;
    } finally {
      setCheckingUsername(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const username = cleanUsername(String(form.get("username") || ""));
    const displayName = String(form.get("display_name") || "").trim();

    try {
      let data;
      if (mode === "signup") {
        const formatError = usernameFormatError(username);
        if (formatError) throw new Error(formatError);
        if (!(await usernameAvailable(username))) throw new Error("That username is unavailable or not allowed.");

        const redirectTo = `${window.location.origin}${window.location.pathname}`;
        data = await auth(`signup?redirect_to=${encodeURIComponent(redirectTo)}`, {
          email,
          password,
          data: { username, display_name: displayName || username },
        });
      } else {
        data = await auth("token?grant_type=password", { email, password });
      }

      if (data.access_token) {
        const next = { access_token: data.access_token, refresh_token: data.refresh_token, user: data.user };
        await saveSession(next);
        setOpen(false);
      } else {
        setMessage("Account created! Check your email to confirm it, then come back here.");
        setMode("login");
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "Could not continue";
      setMessage(text.includes("Database error saving new user") ? "That username is unavailable or not allowed." : text);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY); setSession(null); setOpen(false);
    window.dispatchEvent(new CustomEvent("shelf-auth-changed", { detail: null }));
  }

  const visibleUsername = session?.profile?.username || session?.user?.user_metadata?.username;
  const visibleName = session?.profile?.display_name || session?.user?.user_metadata?.display_name || visibleUsername || "Profile";
  const avatarUrl = session?.profile?.avatar_url || "";

  return <>
    <div className="sof-account">
      {session ? <>
        <Link className="sof-profile-link" href="/account" aria-label="Open account settings">
          {avatarUrl
            ? <img className="sof-profile-mini-avatar" src={avatarUrl} alt="" />
            : <span className="sof-profile-mini-avatar">{initials(visibleName)}</span>}
          <span>{visibleUsername ? `@${visibleUsername}` : visibleName}</span>
        </Link>
        <button className="sof-account-signout-mini" type="button" onClick={logout}>Sign out</button>
      </> : <button type="button" onClick={() => setOpen(true)}>Sign in / Create account</button>}
    </div>
    {open && !session && <div className="sof-auth-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="sof-auth-card" role="dialog" aria-modal="true" aria-label="Shelf of Fame account">
        <button className="sof-auth-close" type="button" onClick={() => setOpen(false)} aria-label="Close">×</button>
        <div className="sof-auth-brand">SHELF OF FAME</div>
        <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
        <p>{mode === "login" ? "Sign in to your shelf." : "Pick a public username. Your email stays private."}</p>
        <form onSubmit={submit}>
          {mode === "signup" && <>
            <label>Username
              <input
                name="username"
                type="text"
                autoComplete="username"
                minLength={3}
                maxLength={24}
                pattern="[A-Za-z0-9][A-Za-z0-9_.]{2,23}"
                placeholder="booklover92"
                onBlur={(e) => { if (e.currentTarget.value) void checkUsernameField(e.currentTarget.value); }}
                required
              />
            </label>
            <label>Display name <span style={{ opacity: .6 }}>(optional)</span>
              <input name="display_name" type="text" autoComplete="name" maxLength={50} placeholder="Kenny" />
            </label>
          </>}
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} required /></label>
          {message && <div className="sof-auth-message">{message}</div>}
          <button className="sof-auth-primary" type="submit" disabled={busy || checkingUsername}>{busy ? "Working…" : checkingUsername ? "Checking username…" : mode === "login" ? "Sign in" : "Create account"}</button>
        </form>
        <button className="sof-auth-switch" type="button" onClick={() => { setMessage(""); setMode(mode === "login" ? "signup" : "login"); }}>
          {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>}
  </>;
}