"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import CloudAccountSettings from "../CloudAccountSettings";
import { updateProfileFavorites } from "../cloud-sync";
import { Book, STORAGE_KEY } from "../../lib/books/client-library";
import { MobileBookSpine } from "../mobile-first/MobileBookSpine";
import { getLocalDemoFollowingCount, getProfileSocial, listConnections, listMyFollowing, type SocialProfile } from "../social-client";
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

const GENRE_SUGGESTIONS = ["Romance", "Fantasy", "Mystery", "Thriller", "Horror", "Historical", "Sci-fi", "Contemporary", "Nonfiction", "Young adult"];
const FAVORITES_KEY = "shelf-of-fame-profile-favorites-v1";
const FAVORITES_STYLE_KEY = "shelf-of-fame-profile-favorites-style-v1";
type AccountView = "profile" | "public" | "account";

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
  const [books, setBooks] = useState<Book[]>([]);
  const [favoriteBookIds, setFavoriteBookIds] = useState<string[]>([]);
  const [bookPickerOpen, setBookPickerOpen] = useState(false);
  const [bookQuery, setBookQuery] = useState("");
  const [favoritesStyle, setFavoritesStyle] = useState<"covers" | "spines">("covers");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarCrop, setAvatarCrop] = useState<{ file: File; url: string } | null>(null);
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarX, setAvatarX] = useState(0);
  const [avatarY, setAvatarY] = useState(0);
  const [profileDirty, setProfileDirty] = useState(false);
  const [accountView, setAccountView] = useState<AccountView>("profile");
  const [socialCounts, setSocialCounts] = useState({ followers: 0, following: 0 });
  const [connectionsKind, setConnectionsKind] = useState<"followers" | "following" | null>(null);
  const [connections, setConnections] = useState<SocialProfile[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsMessage, setConnectionsMessage] = useState("");
  const avatarInput = useRef<HTMLInputElement>(null);
  const bioInput = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    if (!session?.access_token || !originalUsername) return;
    let stopped = false;
    getProfileSocial(originalUsername).then((social) => {
      if (!stopped) setSocialCounts({
        followers: Number(social.followers || 0),
        following: Number(social.following || 0) + getLocalDemoFollowingCount(),
      });
    }).catch(() => undefined);
    return () => { stopped = true; };
  }, [originalUsername, session?.access_token]);

  useEffect(() => {
    try {
      const savedBooks = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(savedBooks)) setBooks(savedBooks);
      const savedFavorites = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || "[]");
      if (Array.isArray(savedFavorites)) setFavoriteBookIds(savedFavorites.filter((id): id is string => typeof id === "string").slice(0, 5));
      setFavoritesStyle(window.localStorage.getItem(FAVORITES_STYLE_KEY) === "spines" ? "spines" : "covers");
    } catch {
      setBooks([]);
    }
  }, []);

  const avatarInitials = useMemo(() => initials(displayName, username), [displayName, username]);
  const genres = useMemo(() => [...new Set(favoriteGenres.split(",").map((genre) => genre.trim()).filter(Boolean))].slice(0, 8), [favoriteGenres]);
  const favoriteBooks = useMemo(() => favoriteBookIds.map((id) => books.find((book) => book.id === id)).filter((book): book is Book => Boolean(book)), [books, favoriteBookIds]);
  const matchingBooks = useMemo(() => {
    const query = bookQuery.trim().toLowerCase();
    const matches = query
      ? books.filter((book) => `${book.title} ${book.author}`.toLowerCase().includes(query))
      : books;
    return matches.slice(0, 60);
  }, [books, bookQuery]);
  const readingStats = useMemo(() => ({
    books: books.length,
    read: books.filter((book) => book.shelf?.toLowerCase() === "read").length,
    fiveStars: books.filter((book) => Number(book.rating) === 5).length,
  }), [books]);

  async function openConnections(kind: "followers" | "following") {
    setConnectionsKind(kind); setConnectionsLoading(true); setConnectionsMessage("");
    try {
      const page = kind === "following" ? await listMyFollowing(0, 50) : await listConnections(originalUsername, "followers", 0, 50);
      setConnections(page.profiles || []);
    } catch {
      setConnections([]);
      setConnectionsMessage(`Could not load ${kind} right now.`);
    } finally { setConnectionsLoading(false); }
  }

  function editBio() {
    setAccountView("profile");
    window.requestAnimationFrame(() => {
      bioInput.current?.focus();
      bioInput.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function toggleGenre(genre: string) {
    const exists = genres.some((item) => item.toLowerCase() === genre.toLowerCase());
    const next = exists ? genres.filter((item) => item.toLowerCase() !== genre.toLowerCase()) : [...genres, genre].slice(0, 8);
    setFavoriteGenres(next.join(", "));
    setProfileDirty(true);
  }

  function toggleFavoriteBook(id: string) {
    setFavoriteBookIds((current) => {
      const next = current.includes(id) ? current.filter((bookId) => bookId !== id) : [...current, id].slice(-5);
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      if (session?.access_token) void updateProfileFavorites(next, favoritesStyle).catch(() => undefined);
      return next;
    });
  }

  function setFavoriteDisplayStyle(style: "covers" | "spines") {
    setFavoritesStyle(style);
    window.localStorage.setItem(FAVORITES_STYLE_KEY, style);
    if (session?.access_token) void updateProfileFavorites(favoriteBookIds, style).catch(() => undefined);
  }

  function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !session?.access_token || !session.user?.id) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      setMessage("Choose a JPG, PNG, or WebP image under 2 MB."); setMessageKind("error"); return;
    }
    if (avatarCrop) URL.revokeObjectURL(avatarCrop.url);
    setAvatarCrop({ file, url: URL.createObjectURL(file) });
    setAvatarZoom(1); setAvatarX(0); setAvatarY(0);
  }

  function closeAvatarCrop() {
    if (avatarCrop) URL.revokeObjectURL(avatarCrop.url);
    setAvatarCrop(null);
  }

  async function uploadAvatar() {
    if (!avatarCrop || !session?.access_token || !session.user?.id) return;
    setUploadingAvatar(true); setMessage(""); setMessageKind("");
    try {
      const image = new Image();
      image.src = avatarCrop.url;
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Could not read that photo.")); });
      const size = 512;
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not prepare that photo.");
      const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight) * avatarZoom;
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      const offsetX = (size - width) / 2 + avatarX * Math.max(0, width - size) / 2;
      const offsetY = (size - height) / 2 + avatarY * Math.max(0, height - size) / 2;
      context.drawImage(image, offsetX, offsetY, width, height);
      const cropped = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not prepare that photo.")), "image/jpeg", .9));
      const path = `${session.user.id}/${Date.now()}.jpg`;
      const response = await fetch(`${SUPABASE_URL}/storage/v1/object/avatars/${path}`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, "Content-Type": "image/jpeg", "x-upsert": "false" },
        body: cropped,
      });
      if (!response.ok) throw new Error("Could not upload that photo yet.");
      setAvatarUrl(`${SUPABASE_URL}/storage/v1/object/public/avatars/${path}`);
      setProfileDirty(true);
      setMessage("Photo uploaded. Save your profile to keep it."); setMessageKind("ok");
      closeAvatarCrop();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload that photo."); setMessageKind("error");
    } finally { setUploadingAvatar(false); }
  }

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
      setProfileDirty(false);
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
          <h1>Your reading life</h1>
          <p>A home for your taste, favorites, and Shelf of Fame story.</p>
        </div>
        <div className="sof-account-header-actions">
          <Link className="sof-account-community" href="/readers">Find readers</Link>
          <Link className="sof-account-back" href="/">← Back to shelf</Link>
        </div>
      </header>

      <nav className="sof-account-tabs" aria-label="Account sections">
        <button type="button" className={accountView === "profile" ? "is-active" : ""} aria-current={accountView === "profile" ? "page" : undefined} onClick={() => setAccountView("profile")}><span>Profile</span><small>Your look & favorites</small></button>
        <button type="button" className={accountView === "public" ? "is-active" : ""} aria-current={accountView === "public" ? "page" : undefined} onClick={() => setAccountView("public")}><span>Public shelf</span><small>Privacy & sharing</small></button>
        <button type="button" className={accountView === "account" ? "is-active" : ""} aria-current={accountView === "account" ? "page" : undefined} onClick={() => setAccountView("account")}><span>Account</span><small>Sign-in & security</small></button>
      </nav>

      <div className="sof-account-view" hidden={accountView !== "profile"}>
      <section className="sof-reader-hero">
        <div className="sof-reader-identity">
          <button className="sof-avatar-button" type="button" onClick={() => avatarInput.current?.click()} aria-label="Change profile photo">
            {avatarUrl ? <img className="sof-account-avatar" src={avatarUrl} alt="Profile avatar" /> : <span className="sof-account-avatar sof-account-avatar-fallback">{avatarInitials}</span>}
            <span className="sof-avatar-edit">{uploadingAvatar ? "…" : "＋"}</span>
          </button>
          <input ref={avatarInput} className="sof-visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseAvatar} />
          <div><div className="sof-reader-eyebrow">MY READER PROFILE</div><h2>{displayName || username || "Reader"}</h2><p>{username ? `@${username}` : "Choose a username"}</p></div>
        </div>
        {bio ? <p className="sof-reader-bio">{bio}</p> : <button className="sof-reader-bio is-placeholder" type="button" onClick={editBio}>Add a bio so readers know what you love →</button>}
        <div className="sof-reader-genres">{genres.length ? genres.map((genre) => <span key={genre}>#{genre}</span>) : <span className="is-placeholder">Add a few favorite genres below</span>}</div>
        <div className="sof-reader-social" aria-label="Reader connections">
          <button type="button" onClick={() => void openConnections("followers")}><strong>{socialCounts.followers}</strong><span>Followers</span></button>
          <button type="button" onClick={() => void openConnections("following")}><strong>{socialCounts.following}</strong><span>Following</span></button>
        </div>
        <div className="sof-reader-stats">
          <div><strong>{readingStats.books}</strong><span>Total books</span></div><div><strong>{readingStats.read}</strong><span>Finished</span></div><div><strong>{readingStats.fiveStars}</strong><span>Five-star reads</span></div>
        </div>
        {session.profile?.trusted_curator ? (
          <Link className="sof-curator-link" href="/spine-requests">
            <span aria-hidden="true">✦</span>
            <span><small>Curator tools</small><strong>Open curator queue</strong></span>
            <b aria-hidden="true">→</b>
          </Link>
        ) : null}
      </section>

      {connectionsKind ? <div className="sof-connections-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConnectionsKind(null); }}><section className="sof-connections-dialog" role="dialog" aria-modal="true" aria-labelledby="sof-connections-title"><header><div><small>MY COMMUNITY</small><h2 id="sof-connections-title">{connectionsKind === "followers" ? "Followers" : "Following"}</h2></div><button type="button" aria-label="Close" onClick={() => setConnectionsKind(null)}>×</button></header>{connectionsLoading ? <p className="sof-connections-state">Loading readers…</p> : connectionsMessage ? <p className="sof-connections-state">{connectionsMessage}</p> : connections.length ? <div className="sof-connections-list">{connections.map((profile) => { const connectionName = profile.display_name || profile.username; return <Link href={`/u/${encodeURIComponent(profile.username)}`} key={profile.username}><span className="sof-connection-avatar">{profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : connectionName.slice(0, 1).toUpperCase()}</span><span><strong>{connectionName}</strong><small>@{profile.username}{profile.is_demo ? " · Demo" : ""}</small></span><b aria-hidden="true">→</b></Link>; })}</div> : <div className="sof-connections-empty"><span aria-hidden="true">♡</span><h3>No {connectionsKind} yet</h3><p>{connectionsKind === "following" ? "Readers you follow will appear here." : "When readers follow you, they will appear here."}</p>{connectionsKind === "following" ? <Link href="/readers">Find readers</Link> : null}</div>}</section></div> : null}

      <section className="sof-profile-favorites sof-account-section">
        <div className="sof-account-section-heading"><div><span className="sof-section-number">01</span><h2>Books that feel like me</h2></div><p>Choose up to five favorites from your shelf.</p></div>
        <div className="sof-favorite-style" role="group" aria-label="Favorite book display style"><span>Display as</span><div><button type="button" className={favoritesStyle === "covers" ? "is-selected" : ""} aria-pressed={favoritesStyle === "covers"} onClick={() => setFavoriteDisplayStyle("covers")}>Covers</button><button type="button" className={favoritesStyle === "spines" ? "is-selected" : ""} aria-pressed={favoritesStyle === "spines"} onClick={() => setFavoriteDisplayStyle("spines")}>Spines</button></div></div>
        {favoriteBooks.length ? <div className={`sof-favorite-showcase is-${favoritesStyle}`}>{favoriteBooks.map((book, index) => favoritesStyle === "covers" ? <article className="sof-favorite-cover" key={book.id} aria-label={`${book.title} by ${book.author}`}>{book.preferredCover?.url ? <img src={book.preferredCover.url} alt="" loading="lazy" decoding="async" /> : <span className="sof-favorite-cover-fallback" style={{ background: book.color }}>{book.title.slice(0, 1)}</span>}<small>{book.title}</small></article> : <article className="sof-favorite-shelf-spine" key={book.id}><MobileBookSpine book={book} index={index} onSelect={() => undefined} /></article>)}</div> : <button className="sof-favorites-empty" type="button" onClick={() => setBookPickerOpen(true)}>Choose the books that feel most like you →</button>}
        <details className="sof-book-picker" open={bookPickerOpen} onToggle={(event) => setBookPickerOpen(event.currentTarget.open)}>
          <summary>{favoriteBooks.length ? `Edit books (${favoriteBooks.length}/5)` : "Choose books"}</summary>
          {bookPickerOpen && <div className="sof-book-picker-panel">
            <label className="sof-book-search"><span>Find a book</span><input type="search" value={bookQuery} onChange={(event) => setBookQuery(event.target.value)} placeholder="Search by title or author" /></label>
            <div className="sof-book-picker-results">{matchingBooks.map((book) => <button type="button" className={favoriteBookIds.includes(book.id) ? "is-selected" : ""} aria-pressed={favoriteBookIds.includes(book.id)} key={book.id} onClick={() => toggleFavoriteBook(book.id)}>{book.preferredCover?.url ? <img src={book.preferredCover.url} alt="" loading="lazy" decoding="async" /> : <span style={{ background: book.color }}>{book.title.slice(0, 1)}</span>}<b>{book.title}</b><small>{book.author}</small></button>)}</div>
            {!matchingBooks.length && <p className="sof-book-picker-empty">No books match “{bookQuery}”.</p>}
            {!bookQuery && books.length > matchingBooks.length && <p className="sof-book-picker-note">Showing the first {matchingBooks.length} books. Search to find anything else on your shelf.</p>}
          </div>}
        </details>
      </section>
      </div>

      <section className="sof-account-view sof-public-shelf-view" hidden={accountView !== "public"} aria-labelledby="public-shelf-heading">
        <div className="sof-account-view-heading"><div><span className="sof-section-number">PUBLIC SHELF</span><h2 id="public-shelf-heading">Choose what readers can see</h2></div><p>Your shelf stays private until you publish it. You can make it private again at any time.</p></div>
        <div className="sof-cloud-settings-host" />
      </section>

      <form className="sof-account-form" onSubmit={saveProfile} onChange={() => setProfileDirty(true)}>
        <section className="sof-account-section" hidden={accountView !== "profile"}>
          <div className="sof-account-section-heading"><div><span className="sof-section-number">02</span><h2>Shape your profile</h2></div><p>These details appear on your public shelf.</p></div>
          <div className="sof-account-grid">
            <label>Display name
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} placeholder="Your name" />
              <small>{displayName.length}/50</small>
            </label>
            <label>Username
              <div className="sof-username-row">
                <input value={username} onChange={(e) => setUsername(e.target.value)} onBlur={() => { if (cleanUsername(username) !== cleanUsername(originalUsername)) void checkUsername(); }} minLength={3} maxLength={24} autoCapitalize="none" autoCorrect="off" />
                {checking && <span className="sof-field-inline-status">Checking…</span>}
              </div>
              <small>Availability is checked automatically. Use 3–24 letters, numbers, periods, or underscores.</small>
            </label>
            <label className="sof-account-full">Bio
              <textarea ref={bioInput} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={240} rows={4} placeholder="What do you chase in a story? What book do you never stop recommending?" />
              <small>{bio.length}/240</small>
            </label>
            <fieldset className="sof-account-full sof-genre-field"><legend>Genres and tags <span>(up to 8)</span></legend><div className="sof-genre-chips">{GENRE_SUGGESTIONS.map((genre) => <button type="button" className={genres.some((item) => item.toLowerCase() === genre.toLowerCase()) ? "is-selected" : ""} key={genre} onClick={() => toggleGenre(genre)}>{genre}</button>)}</div><label>Add or edit custom tags<input value={favoriteGenres} onChange={(e) => setFavoriteGenres(e.target.value)} placeholder="LitRPG, cozy mystery, romantasy" /></label><small>Separate tags with commas. They appear on your public profile.</small></fieldset>
          </div>
        </section>

        <section className="sof-account-section sof-account-security" hidden={accountView !== "account"}>
          <div className="sof-account-details-content">
          <div className="sof-account-section-heading"><div><span className="sof-section-number">ACCOUNT</span><h2>Sign-in & security</h2></div><p>Your email is private and is never shown on your public profile.</p></div>
          <div className="sof-account-security-row">
            <div><span>Email</span><strong>{session.user.email || "No email available"}</strong></div>
            <button type="button" onClick={() => void sendPasswordReset()}>Send password reset</button>
          </div>
          <div className="sof-account-security-row">
            <div><span>Getting started</span><strong>Replay the setup guide whenever you like</strong></div>
            <button type="button" onClick={() => { window.localStorage.setItem("shelf-of-fame-onboarding-eligible-v1", "1"); window.localStorage.removeItem("shelf-of-fame-onboarding-status-v1"); window.sessionStorage.removeItem("shelf-of-fame-onboarding-dismissed-this-visit-v1"); window.location.assign("/"); }}>Replay setup guide</button>
          </div>
          <nav className="sof-account-resource-links" aria-label="Privacy, terms, and support">
            <div><span>Privacy & support</span><strong>Understand your choices or get help</strong></div>
            <div>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/help-the-shelf">Support</Link>
              <Link href="/credits">Credits</Link>
            </div>
          </nav>
          <button className="sof-account-signout sof-account-signout-inline" type="button" onClick={() => void signOut()} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</button>
          </div>
        </section>

        {message && accountView === "profile" && <div className={`sof-account-message ${messageKind === "error" ? "is-error" : "is-ok"}`}>{message}</div>}

        <div className={`sof-account-actions ${profileDirty ? "is-dirty" : ""}`} hidden={accountView !== "profile"}>
          <span>{profileDirty ? "You have unsaved changes" : "Your profile is up to date"}</span>
          <button className="sof-account-save" type="submit" disabled={!profileDirty || saving || checking}>{saving ? "Saving…" : "Save changes"}</button>
        </div>
      </form>
      <CloudAccountSettings />
      {avatarCrop ? <div className="sof-avatar-crop-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeAvatarCrop(); }}>
        <section className="sof-avatar-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="avatar-crop-title">
          <div className="sof-avatar-crop-heading"><div><span className="sof-section-number">PROFILE PHOTO</span><h2 id="avatar-crop-title">Frame your photo</h2></div><button type="button" onClick={closeAvatarCrop} aria-label="Close photo editor">×</button></div>
          <div className="sof-avatar-crop-preview"><img src={avatarCrop.url} alt="Selected profile photo preview" style={{ transform: `translate(${avatarX * 18}%, ${avatarY * 18}%) scale(${avatarZoom})` }} /></div>
          <div className="sof-avatar-crop-controls">
            <label><span>Zoom</span><input type="range" min="1" max="2.5" step="0.01" value={avatarZoom} onChange={(event) => setAvatarZoom(Number(event.target.value))} /></label>
            <label><span>Move left or right</span><input type="range" min="-1" max="1" step="0.01" value={avatarX} onChange={(event) => setAvatarX(Number(event.target.value))} /></label>
            <label><span>Move up or down</span><input type="range" min="-1" max="1" step="0.01" value={avatarY} onChange={(event) => setAvatarY(Number(event.target.value))} /></label>
          </div>
          <div className="sof-avatar-crop-actions"><button type="button" className="sof-avatar-crop-cancel" onClick={closeAvatarCrop}>Cancel</button><button type="button" className="sof-account-save" disabled={uploadingAvatar} onClick={() => void uploadAvatar()}>{uploadingAvatar ? "Uploading…" : "Use this photo"}</button></div>
        </section>
      </div> : null}
    </div>
  </main>;
}
