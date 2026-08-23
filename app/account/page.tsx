"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import CloudAccountSettings from "../CloudAccountSettings";
import {
  AUTH_CHANGED_EVENT,
  AUTH_ERROR_EVENT,
  SUPABASE_KEY,
  SUPABASE_URL,
  ShelfProfile,
  ShelfSession,
  cleanUsername,
  parseShelfAuthHash,
  persistShelfSession,
  readStoredShelfSession,
  signOutShelfSession,
  storeShelfSession,
  supabaseAuthRequest,
  usernameAvailable,
  usernameFormatError,
} from "../auth-client";

function initials(displayName: string, username: string) {
  const source = displayName.trim() || username.trim() || "S";
  return source.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "S";
}

export default function AccountPage() {
  const [session, setSession] = useState<ShelfSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [checking, setChecking] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authBusy, setAuthBusy] = useState(false);
  const [authCheckingUsername, setAuthCheckingUsername] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"ok" | "error" | "">("");
  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [favoriteGenres, setFavoriteGenres] = useState("");

  useEffect(() => {
    let stopped = false;
    let callbackTimer: number | undefined;

    function applySession(next: ShelfSession | null) {
      if (stopped) return;
      setSession(next);
      if (next?.user?.id) {
        const nextUsername = next.profile?.username || next.user.user_metadata?.username || "";
        setUsername(nextUsername);
        setOriginalUsername(nextUsername);
        setDisplayName(next.profile?.display_name || next.user.user_metadata?.display_name || "");
        setBio(next.profile?.bio || "");
        setAvatarUrl(next.profile?.avatar_url || "");
        setFavoriteGenres((next.profile?.favorite_genres || []).join(", "));
      }
      setLoading(false);
    }

    function onAuthChanged(event: Event) {
      applySession((event as CustomEvent<ShelfSession | null>).detail || null);
    }

    function onAuthError(event: Event) {
      if (stopped) return;
      setAuthMessage(String((event as CustomEvent<string>).detail || "Could not sign in."));
      setLoading(false);
    }

    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged as EventListener);
    window.addEventListener(AUTH_ERROR_EVENT, onAuthError as EventListener);

    async function load() {
      try {
        const stored = readStoredShelfSession();
        if (stored?.access_token) {
          applySession(stored);
          const enriched = await persistShelfSession(stored);
          applySession(enriched);
          return;
        }

        const callback = parseShelfAuthHash(window.location.hash);
        if (callback?.error) {
          setAuthMessage(callback.error);
          setLoading(false);
          return;
        }
        if (callback?.session) {
          callbackTimer = window.setTimeout(() => {
            if (!stopped) {
              setAuthMessage("Account confirmation is taking longer than expected. Refresh this page to try again.");
              setLoading(false);
            }
          }, 8000);
          return;
        }

        setLoading(false);
      } catch {
        setMessage("Could not load your account.");
        setMessageKind("error");
        setLoading(false);
      }
    }
    void load();

    return () => {
      stopped = true;
      if (callbackTimer) window.clearTimeout(callbackTimer);
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged as EventListener);
      window.removeEventListener(AUTH_ERROR_EVENT, onAuthError as EventListener);
    };
  }, []);

  const avatarInitials = useMemo(() => initials(displayName, username), [displayName, username]);

  async function checkSignupUsername(rawUsername: string) {
    const clean = cleanUsername(rawUsername);
    const formatError = usernameFormatError(clean);
    if (formatError) {
      setAuthMessage(formatError);
      return false;
    }
    setAuthCheckingUsername(true);
    try {
      const available = await usernameAvailable(clean);
      setAuthMessage(available ? `@${clean} is available.` : "That username is unavailable or not allowed.");
      return available;
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Could not check that username.");
      return false;
    } finally {
      setAuthCheckingUsername(false);
    }
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const signupUsername = cleanUsername(String(form.get("username") || ""));
    const signupDisplayName = String(form.get("display_name") || "").trim();

    try {
      let data;
      if (authMode === "signup") {
        const formatError = usernameFormatError(signupUsername);
        if (formatError) throw new Error(formatError);
        if (!(await usernameAvailable(signupUsername))) {
          throw new Error("That username is unavailable or not allowed.");
        }
        const redirectTo = `${window.location.origin}/account`;
        data = await supabaseAuthRequest(`signup?redirect_to=${encodeURIComponent(redirectTo)}`, {
          email,
          password,
          data: {
            username: signupUsername,
            display_name: signupDisplayName || signupUsername,
          },
        });
      } else {
        data = await supabaseAuthRequest("token?grant_type=password", { email, password });
      }

      if (data.access_token) {
        const next = await persistShelfSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          user: data.user,
        });
        setSession(next);
        setAuthMessage("");
      } else {
        setAuthMessage("Account created! Check your email to confirm it, then return here to sign in.");
        setAuthMode("login");
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "Could not continue.";
      setAuthMessage(text.includes("Database error saving new user")
        ? "That username is unavailable or not allowed."
        : text);
    } finally {
      setAuthBusy(false);
    }
  }

  async function checkUsername() {
    const clean = cleanUsername(username);
    const formatError = usernameFormatError(clean);
    if (formatError) {
      setMessage(formatError);
      setMessageKind("error");
      return false;
    }
    if (clean === cleanUsername(originalUsername)) {
      setMessage("That is already your username.");
      setMessageKind("ok");
      return true;
    }
    setChecking(true);
    try {
      const available = await usernameAvailable(clean);
      setMessage(available ? `@${clean} is available.` : "That username is unavailable or not allowed.");
      setMessageKind(available ? "ok" : "error");
      return available;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not check that username.");
      setMessageKind("error");
      return false;
    } finally {
      setChecking(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.access_token || !session.user?.id) return;
    setSaving(true);
    setMessage("");
    setMessageKind("");

    try {
      const clean = cleanUsername(username);
      const formatError = usernameFormatError(clean);
      if (formatError) throw new Error(formatError);
      if (bio.length > 240) throw new Error("Bio must be 240 characters or fewer.");
      if (displayName.trim().length > 50) throw new Error("Display name must be 50 characters or fewer.");
      const genres = [...new Set(favoriteGenres.split(",").map((genre) => genre.trim()).filter(Boolean))].slice(0, 8);
      if (clean !== cleanUsername(originalUsername) && !(await usernameAvailable(clean))) {
        throw new Error("That username is unavailable or not allowed.");
      }

      const profileResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(session.user.id)}`,
        {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            username: clean,
            display_name: displayName.trim() || clean,
            bio: bio.trim() || null,
            avatar_url: avatarUrl.trim() || null,
            favorite_genres: genres,
            updated_at: new Date().toISOString(),
          }),
        },
      );

      const profileData = await profileResponse.json().catch(() => null);
      if (!profileResponse.ok) {
        const detail = profileData?.message || profileData?.details || "Could not save your profile.";
        throw new Error(String(detail));
      }

      const savedProfile: ShelfProfile = Array.isArray(profileData) ? profileData[0] : {
        username: clean,
        display_name: displayName.trim() || clean,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        favorite_genres: genres,
      };

      const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: "PUT",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: { username: clean, display_name: savedProfile.display_name } }),
      });
      const updatedUser = authResponse.ok ? await authResponse.json() : session.user;

      const next: ShelfSession = { ...session, user: updatedUser, profile: savedProfile };
      storeShelfSession(next);
      setSession(next);
      setOriginalUsername(clean);
      setUsername(clean);
      setMessage("Profile saved.");
      setMessageKind("ok");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save your profile.");
      setMessageKind("error");
    } finally {
      setSaving(false);
    }
  }

  async function sendPasswordReset() {
    if (!session?.user?.email) return;
    setMessage("");
    setMessageKind("");
    try {
      const redirectTo = `${window.location.origin}/account`;
      const response = await fetch(`${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email: session.user.email }),
      });
      if (!response.ok) throw new Error("Could not send the password reset email.");
      setMessage("Password reset email sent.");
      setMessageKind("ok");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send reset email.");
      setMessageKind("error");
    }
  }

  async function signOut() {
    if (!session || signingOut) return;
    setSigningOut(true);
    setMessage("");
    setMessageKind("");
    try {
      await signOutShelfSession(session);
      window.location.assign("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not sign out right now.");
      setMessageKind("error");
      setSigningOut(false);
    }
  }

  if (loading) {
    return <main className="sof-account-page"><div className="sof-account-panel"><p>Loading your account…</p></div></main>;
  }

  if (!session?.access_token || !session.user?.id) {
    return <main className="sof-account-page">
      <div className="sof-auth-card sof-account-auth-card">
        <div className="sof-account-kicker">SHELF OF FAME</div>
        <h1>{authMode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p>{authMode === "login"
          ? "Sign in to sync this shelf across your devices."
          : "Choose a public username. Your email stays private."}</p>
        <form onSubmit={submitAuth}>
          {authMode === "signup" && <>
            <label>Username
              <input
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                minLength={3}
                maxLength={24}
                pattern="[A-Za-z0-9][A-Za-z0-9_.]{2,23}"
                placeholder="booklover92"
                onBlur={(event) => {
                  if (event.currentTarget.value) void checkSignupUsername(event.currentTarget.value);
                }}
                required
              />
            </label>
            <label>Display name <span className="sof-auth-optional">(optional)</span>
              <input name="display_name" type="text" autoComplete="name" maxLength={50} placeholder="Your name" />
            </label>
          </>}
          <label>Email
            <input name="email" type="email" autoComplete="email" inputMode="email" required />
          </label>
          <label>Password
            <input
              name="password"
              type="password"
              autoComplete={authMode === "login" ? "current-password" : "new-password"}
              minLength={6}
              required
            />
          </label>
          {authMessage && <div className="sof-auth-message" role="status">{authMessage}</div>}
          <button className="sof-auth-primary" type="submit" disabled={authBusy || authCheckingUsername}>
            {authBusy
              ? "Working…"
              : authCheckingUsername
                ? "Checking username…"
                : authMode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <button
          className="sof-auth-switch"
          type="button"
          onClick={() => {
            setAuthMessage("");
            setAuthMode((current) => current === "login" ? "signup" : "login");
          }}
        >
          {authMode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
        <p className="sof-account-sync-note">The books already on this device will sync after you sign in.</p>
        <Link className="sof-account-back sof-account-auth-back" href="/">← Back to your shelf</Link>
      </div>
    </main>;
  }

  return <main className="sof-account-page">
    <div className="sof-account-shell">
      <header className="sof-account-header">
        <div>
          <div className="sof-account-kicker">SHELF OF FAME</div>
          <h1>Your account</h1>
          <p>Manage the profile other readers see and your sign-in settings.</p>
        </div>
        <Link className="sof-account-back" href="/">← Back to shelf</Link>
      </header>

      <section className="sof-account-profile-card">
        <div className="sof-account-avatar-wrap">
          {avatarUrl ? <img className="sof-account-avatar" src={avatarUrl} alt="Profile avatar" /> : <div className="sof-account-avatar sof-account-avatar-fallback">{avatarInitials}</div>}
        </div>
        <div>
          <h2>{displayName || username || "Reader"}</h2>
          <p>{username ? `@${username}` : "Choose a username"}</p>
        </div>
        {session.profile?.trusted_curator ? (
          <Link className="sof-curator-link" href="/spine-requests">
            <span aria-hidden="true">✦</span>
            <span><small>Curator tools</small><strong>Open curator queue</strong></span>
            <b aria-hidden="true">→</b>
          </Link>
        ) : null}
      </section>

      <form className="sof-account-form" onSubmit={saveProfile}>
        <section className="sof-account-section">
          <div className="sof-account-section-heading"><h2>Public profile</h2><p>This is how you appear around Shelf of Fame.</p></div>
          <div className="sof-account-grid">
            <label>Display name
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} placeholder="Your name" />
              <small>{displayName.length}/50</small>
            </label>
            <label>Username
              <div className="sof-username-row">
                <input value={username} onChange={(e) => setUsername(e.target.value)} minLength={3} maxLength={24} autoCapitalize="none" autoCorrect="off" />
                <button type="button" onClick={() => void checkUsername()} disabled={checking}>{checking ? "Checking…" : "Check"}</button>
              </div>
              <small>3–24 characters. Letters, numbers, periods, and underscores.</small>
            </label>
            <label className="sof-account-full">Bio
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={240} rows={4} placeholder="A little about your reading taste…" />
              <small>{bio.length}/240</small>
            </label>
            <label className="sof-account-full">Avatar image URL <span>(optional)</span>
              <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} type="url" inputMode="url" placeholder="https://…" />
              <small>For now you can paste an image URL. Direct photo uploads can be added next.</small>
            </label>
            <label className="sof-account-full">Favorite genres <span>(optional)</span>
              <input value={favoriteGenres} onChange={(e) => setFavoriteGenres(e.target.value)} placeholder="Fantasy, romance, mystery" />
              <small>Separate up to 8 genres with commas. They’ll appear on your public profile.</small>
            </label>
          </div>
        </section>

        <section className="sof-account-section">
          <div className="sof-account-section-heading"><h2>Sign-in & security</h2><p>Your email is private and is never shown on your public profile.</p></div>
          <div className="sof-account-security-row">
            <div><span>Email</span><strong>{session.user.email || "No email available"}</strong></div>
            <button type="button" onClick={() => void sendPasswordReset()}>Send password reset</button>
          </div>
        </section>

        {message && <div className={`sof-account-message ${messageKind === "error" ? "is-error" : "is-ok"}`}>{message}</div>}

        <div className="sof-account-actions">
          <button className="sof-account-save" type="submit" disabled={saving || checking}>{saving ? "Saving…" : "Save changes"}</button>
          <button className="sof-account-signout" type="button" onClick={() => void signOut()} disabled={signingOut}>
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </form>
      <CloudAccountSettings />
    </div>
  </main>;
}
