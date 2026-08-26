"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { readStoredShelfSession } from "../auth-client";
import { discoverReaders, listMyFollowing, loadReaderActivity, markReaderNotificationsSeen, setReaderFollow, updateActivityPrivacy, type ActivityPrivacy, type ReaderActivity, type SocialProfile } from "../social-client";
import { localDemoReader } from "../local-demo-readers";
import "./readers.css";
import "./readers-improvements.css";

const DISCOVERY_GENRES = ["Romance", "Fantasy", "Mystery", "Thriller", "Horror", "Sci-fi", "Contemporary", "Nonfiction"];
const DEFAULT_ACTIVITY_PRIVACY: ActivityPrivacy = { shelf_public: false, activity_sharing_enabled: false, activity_share_added: true, activity_share_finished: true, activity_share_rated: true, activity_share_favorited: true };

function activityCopy(activity: ReaderActivity) {
  if (activity.event_type === "finished") return "finished";
  if (activity.event_type === "favorited") return "favorited";
  if (activity.event_type === "rated") return `rated ${activity.rating || ""} ★`;
  return "added";
}

function relativeActivityTime(value: string) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function ReaderCard({ profile, onFollow }: { profile: SocialProfile; onFollow: (profile: SocialProfile) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const name = profile.display_name || profile.username;
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "S";
  return <article className="reader-card">
    <Link className="reader-card-main" href={`/u/${encodeURIComponent(profile.username)}`}>
      {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : <span className="reader-card-avatar">{initials}</span>}
      <span className="reader-card-copy"><small>@{profile.username}{profile.is_demo ? " · Demo" : profile.trusted_curator ? " · Curator" : ""}</small><strong>{name}</strong><span>{profile.bio || "A Shelf of Fame reader."}</span></span>
    </Link>
    <div className="reader-card-meta"><span>{Number(profile.followers || 0)} followers</span>{profile.favorite_genres?.slice(0, 3).map((genre) => <span key={genre}>#{genre}</span>)}</div>
    {!profile.is_self && <button type="button" className={profile.is_following ? "is-following" : ""} disabled={busy} onClick={async () => { setBusy(true); try { await onFollow(profile); } finally { setBusy(false); } }}>{busy ? "Saving…" : profile.is_following ? "Following" : "Follow"}</button>}
  </article>;
}

export default function ReadersPage() {
  const [profiles, setProfiles] = useState<SocialProfile[]>([]);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [view, setView] = useState<"discover" | "following" | "activity">("discover");
  const [followingProfiles, setFollowingProfiles] = useState<SocialProfile[]>([]);
  const [followingOffset, setFollowingOffset] = useState<number | null>(null);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followingMessage, setFollowingMessage] = useState("");
  const [activities, setActivities] = useState<ReaderActivity[]>([]);
  const [activityOffset, setActivityOffset] = useState<number | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityMessage, setActivityMessage] = useState("");
  const [activityPrivacy, setActivityPrivacy] = useState<ActivityPrivacy>(DEFAULT_ACTIVITY_PRIVACY);
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const [unreadActivity, setUnreadActivity] = useState(0);
  const [newFollowers, setNewFollowers] = useState(0);
  const [recentFollowers, setRecentFollowers] = useState(0);

  const load = useCallback(async (search: string, offset = 0) => {
    setLoading(true); setMessage("");
    try {
      const page = await discoverReaders(search, offset);
      setProfiles((current) => offset ? [...current, ...(page.profiles || [])] : page.profiles || []);
      setNextOffset(page.next_offset ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not find readers right now.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = query.trim();
      setActiveQuery(next);
      void load(next);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [load, query]);

  const loadActivity = useCallback(async (offset = 0) => {
    if (!readStoredShelfSession()?.access_token) return;
    setActivityLoading(true); setActivityMessage("");
    try {
      const page = await loadReaderActivity(offset);
      setActivities((current) => offset ? [...current, ...(page.events || [])] : page.events || []);
      setActivityOffset(page.next_offset ?? null);
      setActivityPrivacy(page.preferences || DEFAULT_ACTIVITY_PRIVACY);
      setUnreadActivity(Number(page.unread_activity || 0));
      setNewFollowers(Number(page.new_followers || 0));
    } catch (error) { setActivityMessage(error instanceof Error ? error.message : "Could not load reader activity."); }
    finally { setActivityLoading(false); }
  }, []);

  useEffect(() => { void loadActivity(); }, [loadActivity]);

  const loadFollowing = useCallback(async (offset = 0) => {
    setFollowingLoading(true); setFollowingMessage("");
    try {
      const page = await listMyFollowing(offset);
      setFollowingProfiles((current) => offset ? [...current, ...(page.profiles || [])] : page.profiles || []);
      setFollowingOffset(page.next_offset ?? null);
    } catch (error) {
      setFollowingMessage(error instanceof Error ? error.message : "Could not load followed readers.");
    } finally { setFollowingLoading(false); }
  }, []);

  function openFollowing() {
    setView("following");
    void loadFollowing();
  }

  async function openActivity() {
    if (!readStoredShelfSession()?.access_token) { window.location.assign("/account"); return; }
    setView("activity");
    if (unreadActivity || newFollowers) {
      setRecentFollowers(newFollowers);
      setUnreadActivity(0); setNewFollowers(0);
      await markReaderNotificationsSeen().catch(() => undefined);
    }
    if (!activities.length) void loadActivity();
  }

  async function saveActivityPrivacy(next: ActivityPrivacy) {
    setActivityPrivacy(next); setPrivacyBusy(true); setActivityMessage("");
    try { setActivityPrivacy(await updateActivityPrivacy(next)); }
    catch { setActivityMessage("Could not save your activity privacy settings."); }
    finally { setPrivacyBusy(false); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next = query.trim();
    setActiveQuery(next);
    await load(next);
  }

  async function inviteReader() {
    const share = { title: "Shelf of Fame", text: "Come build and share your bookshelf with me on Shelf of Fame.", url: window.location.origin };
    try {
      if (navigator.share) await navigator.share(share);
      else {
        await navigator.clipboard.writeText(`${share.text} ${share.url}`);
        setInviteMessage("Invite link copied.");
      }
    } catch {
      setInviteMessage("");
    }
  }

  async function toggleFollow(profile: SocialProfile) {
    if (!localDemoReader(profile.username) && !readStoredShelfSession()?.access_token) { window.location.assign("/account"); return; }
    await setReaderFollow(profile.username, !profile.is_following);
    setProfiles((current) => current.map((item) => item.username === profile.username ? {
      ...item,
      is_following: !item.is_following,
      followers: Math.max(0, Number(item.followers || 0) + (item.is_following ? -1 : 1)),
    } : item));
    setFollowingProfiles((current) => profile.is_following
      ? current.filter((item) => item.username !== profile.username)
      : current);
  }

  return <main className="readers-page"><div className="readers-shell">
    <header className="readers-header"><div><small>SHELF OF FAME COMMUNITY</small><h1>Find your next shelfmate</h1><p>Discover readers by name, username, or the stories they love.</p></div><div className="readers-header-actions"><Link href="/">← My shelf</Link><Link href="/account">My profile</Link></div></header>
    <nav className="reader-community-tabs" aria-label="Reader community sections"><button type="button" className={view === "discover" ? "is-active" : ""} aria-current={view === "discover" ? "page" : undefined} onClick={() => setView("discover")}>Discover</button><button type="button" className={view === "following" ? "is-active" : ""} aria-current={view === "following" ? "page" : undefined} onClick={openFollowing}>Following</button><button type="button" className={view === "activity" ? "is-active" : ""} aria-current={view === "activity" ? "page" : undefined} onClick={() => void openActivity()}>Activity{unreadActivity + newFollowers > 0 ? <span aria-label={`${unreadActivity + newFollowers} new updates`}>{Math.min(99, unreadActivity + newFollowers)}</span> : null}</button></nav>
    {view === "discover" ? <>
    <form className="reader-search" onSubmit={submit}><label><span className="sof-visually-hidden">Search readers</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try a name, @username, or genre" /></label>{query ? <button className="reader-search-clear" type="button" onClick={() => setQuery("")} aria-label="Clear reader search">×</button> : null}<button type="submit">Search</button></form>
    <div className="reader-genre-filters" aria-label="Browse readers by genre">
      {DISCOVERY_GENRES.map((genre) => <button type="button" className={query.toLowerCase() === genre.toLowerCase() ? "is-active" : ""} aria-pressed={query.toLowerCase() === genre.toLowerCase()} key={genre} onClick={() => setQuery((current) => current.toLowerCase() === genre.toLowerCase() ? "" : genre)}>{genre}</button>)}
    </div>
    <div className="reader-results-heading"><h2>{activeQuery ? `Results for “${activeQuery}”` : "Readers to discover"}</h2><span>{profiles.length} shown</span></div>
    {message && <div className="reader-state">{message}</div>}
    {!message && !loading && !profiles.length && <div className="reader-empty-state"><span aria-hidden="true">◎</span><h3>{activeQuery ? "No public readers found" : "The community is just getting started"}</h3><p>{activeQuery ? `Nobody public matches “${activeQuery}” yet. Try part of a name, another genre, or invite someone whose shelf you would love to see.` : "Only readers who choose to publish their profiles appear here. Private shelves always stay out of discovery."}</p><div><button type="button" onClick={() => void inviteReader()}>Invite a reader</button><Link href="/account">Review my privacy</Link></div>{inviteMessage ? <small role="status">{inviteMessage}</small> : null}</div>}
    <section className="reader-grid">{profiles.map((profile) => <ReaderCard key={profile.username} profile={profile} onFollow={toggleFollow} />)}</section>
    {loading && <div className="reader-state">Finding readers…</div>}
    {!loading && nextOffset !== null && <button className="reader-load-more" type="button" onClick={() => void load(activeQuery, nextOffset)}>Show more readers</button>}
    </> : view === "following" ? <section className="reader-following-view" aria-labelledby="reader-following-title">
      <div className="reader-activity-heading"><div><small>YOUR COMMUNITY</small><h2 id="reader-following-title">Readers you follow</h2><p>Return to the shelves and readers you want to keep up with.</p></div><button type="button" onClick={() => setView("discover")}>Find readers</button></div>
      {followingMessage ? <div className="reader-state">{followingMessage}</div> : null}
      {!followingMessage && !followingLoading && !followingProfiles.length ? <div className="reader-empty-state"><span aria-hidden="true">♡</span><h3>No followed readers yet</h3><p>Follow readers from Discover and they will stay collected here. Demo follows are saved in this browser; real reader follows sync with your account.</p><div><button type="button" onClick={() => setView("discover")}>Discover readers</button>{!readStoredShelfSession()?.access_token ? <Link href="/account">Sign in to sync follows</Link> : null}</div></div> : null}
      <section className="reader-grid">{followingProfiles.map((profile) => <ReaderCard key={profile.username} profile={profile} onFollow={toggleFollow} />)}</section>
      {followingLoading ? <div className="reader-state">Loading followed readers…</div> : null}
      {!followingLoading && followingOffset !== null ? <button className="reader-load-more" type="button" onClick={() => void loadFollowing(followingOffset)}>Show more</button> : null}
    </section> : <section className="reader-activity-view" aria-labelledby="reader-activity-title">
      <div className="reader-activity-heading"><div><small>FOLLOWING</small><h2 id="reader-activity-title">Your reader activity</h2><p>Recent reading moments shared by people you follow.</p></div><button type="button" onClick={() => setView("discover")}>Find readers</button></div>
      {recentFollowers > 0 ? <div className="reader-follow-notice">{recentFollowers} new {recentFollowers === 1 ? "reader follows" : "readers follow"} you.</div> : null}
      <details className="reader-privacy" open={!activityPrivacy.activity_sharing_enabled}><summary><span><strong>My activity sharing</strong><small>{activityPrivacy.activity_sharing_enabled ? activityPrivacy.shelf_public ? "Visible to followers" : "On · shelf private" : "Off"}</small></span><b>Privacy controls</b></summary><div className="reader-privacy-body"><label className="reader-privacy-master"><span><strong>Share my reading activity</strong><small>Off by default. Your shelf must also be public.</small></span><input type="checkbox" checked={activityPrivacy.activity_sharing_enabled} disabled={privacyBusy} onChange={(event) => void saveActivityPrivacy({ ...activityPrivacy, activity_sharing_enabled: event.target.checked })} /></label>{!activityPrivacy.shelf_public ? <p>Your shelf is private, so no activity is visible. You can publish it from <Link href="/account">Public shelf settings</Link>.</p> : null}<fieldset disabled={!activityPrivacy.activity_sharing_enabled || privacyBusy}><legend>Choose what followers may see</legend>{([['activity_share_added','Books I add'],['activity_share_finished','Books I finish'],['activity_share_rated','Ratings I give'],['activity_share_favorited','Books I favorite']] as const).map(([key,label]) => <label key={key}><input type="checkbox" checked={activityPrivacy[key]} onChange={(event) => void saveActivityPrivacy({ ...activityPrivacy, [key]: event.target.checked })} /><span>{label}</span></label>)}</fieldset>{privacyBusy ? <small role="status">Saving privacy…</small> : null}</div></details>
      {activityMessage ? <div className="reader-state">{activityMessage}</div> : null}
      {!activityMessage && !activityLoading && !activities.length ? <div className="reader-empty-state"><span aria-hidden="true">✦</span><h3>Your feed is ready for company</h3><p>Follow a few public readers to see the books they add, finish, rate, or favorite—only when they choose to share.</p><div><button type="button" onClick={() => setView("discover")}>Discover readers</button></div></div> : null}
      <div className="reader-activity-list">{activities.map((activity) => { const activityName = activity.display_name || activity.username; const initials = activityName.split(/\s+/).slice(0,2).map((part) => part[0]?.toUpperCase()).join("") || "S"; return <article className="reader-activity-card" key={activity.id}><Link className="reader-activity-avatar" href={`/u/${encodeURIComponent(activity.username)}`}>{activity.avatar_url ? <img src={activity.avatar_url} alt="" /> : <span>{initials}</span>}</Link><div className="reader-activity-copy"><p><Link href={`/u/${encodeURIComponent(activity.username)}`}>{activityName}</Link> {activityCopy(activity)} <strong>{activity.book_title}</strong></p><span>{activity.book_author} · {relativeActivityTime(activity.created_at)}</span></div>{activity.cover_url ? <img className="reader-activity-cover" src={activity.cover_url} alt="" /> : <span className="reader-activity-cover is-empty">{activity.book_title.slice(0,1)}</span>}</article>; })}</div>
      {activityLoading ? <div className="reader-state">Loading activity…</div> : null}
      {!activityLoading && activityOffset !== null ? <button className="reader-load-more" type="button" onClick={() => void loadActivity(activityOffset)}>Show older activity</button> : null}
    </section>}
  </div></main>;
}
