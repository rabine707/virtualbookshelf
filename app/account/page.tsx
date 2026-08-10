"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

const SUPABASE_URL = "https://vrkuimrfdkejfhpxlwlf.supabase.co";
const SUPABASE_KEY = "sb_publishable_mf0u925xGBkP4iNgxSCjuQ_H4Dp8r1S";
const SESSION_KEY = "shelf-of-fame-supabase-session";

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

type Session = {
  access_token: string;
  refresh_token?: string;
  user?: User;
  profile?: Profile;
};

function cleanUsername(value: string) {
  return value.trim().toLowerCase();
}

function usernameFormatError(value: string) {
  if (value.length < 3 || value.length > 24) return "Username must be 3–24 characters.";
  if (!/^[a-z0-9][a-z0-9_.]*$/.test(value)) return "Use letters, numbers, underscores, or periods only.";
  if (/[_.]{2,}/.test(value)) return "Avoid repeated periods or underscores.";
  return "";
}

async function getUser(accessToken: string): Promise<User | undefined> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return undefined;
  return response.json();
}

async function getProfile(userId: string, accessToken: string): Promise<Profile | undefined> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?select=username,display_name,avatar_url,bio&id=eq.${encodeURIComponent(userId)}&limit=1`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
  );
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

function initials(displayName: string, username: string) {
  const source = displayName.trim() || username.trim() || "S";
  return source.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "S";
}

export default function AccountPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"ok" | "error" | "">("");
  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return;
        const stored = JSON.parse(raw) as Session;
        if (!stored.access_token) return;
        const user = stored.user || await getUser(stored.access_token);
        if (!user?.id) return;
        const profile = await getProfile(user.id, stored.access_token);
        const enriched = { ...stored, user, profile };
        localStorage.setItem(SESSION_KEY, JSON.stringify(enriched));
        setSession(enriched);
        const nextUsername = profile?.username || user.user_metadata?.username || "";
        setUsername(nextUsername);
        setOriginalUsername(nextUsername);
        setDisplayName(profile?.display_name || user.user_metadata?.display_name || "");
        setBio(profile?.bio || "");
        setAvatarUrl(profile?.avatar_url || "");
      } catch {
        setMessage("Could not load your account.");
        setMessageKind("error");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const avatarInitials = useMemo(() => initials(displayName, username), [displayName, username]);

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
            updated_at: new Date().toISOString(),
          }),
        },
      );

      const profileData = await profileResponse.json().catch(() => null);
      if (!profileResponse.ok) {
        const detail = profileData?.message || profileData?.details || "Could not save your profile.";
        throw new Error(String(detail));
      }

      const savedProfile: Profile = Array.isArray(profileData) ? profileData[0] : {
        username: clean,
        display_name: displayName.trim() || clean,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
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
      const updatedUser = authResponse.ok ? await authResponse.json() as User : session.user;

      const next: Session = { ...session, user: updatedUser, profile: savedProfile };
      localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      setSession(next);
      setOriginalUsername(clean);
      setUsername(clean);
      setMessage("Profile saved.");
      setMessageKind("ok");
      window.dispatchEvent(new CustomEvent("shelf-auth-changed", { detail: next }));
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

  function signOut() {
    localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new CustomEvent("shelf-auth-changed", { detail: null }));
    window.location.href = "/";
  }

  if (loading) {
    return <main className="sof-account-page"><div className="sof-account-panel"><p>Loading your account…</p></div></main>;
  }

  if (!session?.access_token || !session.user?.id) {
    return <main className="sof-account-page">
      <div className="sof-account-panel sof-account-empty">
        <div className="sof-account-kicker">SHELF OF FAME</div>
        <h1>Account</h1>
        <p>You need to sign in before editing your profile.</p>
        <Link className="sof-account-back" href="/">← Back to your shelf</Link>
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
          <button className="sof-account-signout" type="button" onClick={signOut}>Sign out</button>
        </div>
      </form>
    </div>
  </main>;
}
