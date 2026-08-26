"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { loadPublicShelf, publicSpineUrl } from "../../cloud-sync";
import { SUPABASE_KEY, SUPABASE_URL, readStoredShelfSession } from "../../auth-client";
import { listConnections, setReaderFollow, type SocialProfile } from "../../social-client";
import { localDemoReader, localDemoSocial } from "../../local-demo-readers";
import { MobileBookSpine } from "../../mobile-first/MobileBookSpine";
import type { Book } from "../../../lib/books/client-library";

type PublicProfile = { username?: string; display_name?: string; avatar_url?: string; bio?: string; trusted_curator?: boolean };
type PublicSettings = { theme?: string; community_stars?: number; plan?: string; profile_favorite_book_ids?: string[]; profile_favorites_style?: "covers" | "spines" };
type PublicBook = Book & {
  preferredCover?: { url: string; source: string };
  spineStoragePath?: string | null; spineProvider?: string | null;
  demoSpineUrl?: string;
};
type PublicShelf = { profile?: PublicProfile; settings?: PublicSettings; books?: PublicBook[] };
type ProfileSocial = { favorite_genres?: string[]; followers?: number; following?: number; is_following?: boolean; is_self?: boolean };

export default function PublicShelfPage() {
  const params = useParams<{ username: string }>();
  const username = decodeURIComponent(String(params?.username || "")).replace(/^@/, "");
  const [data, setData] = useState<PublicShelf | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [social, setSocial] = useState<ProfileSocial>({});
  const [followBusy, setFollowBusy] = useState(false);
  const [followMessage, setFollowMessage] = useState("");
  const [connectionKind, setConnectionKind] = useState<"followers" | "following" | null>(null);
  const [connections, setConnections] = useState<SocialProfile[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);

  useEffect(() => {
    let stopped = false;
    setLoading(true); setError("");
    loadPublicShelf(username)
      .then((value) => {
        if (stopped) return;
        if (!value) { setError("This shelf is private or does not exist."); return; }
        const shelf = value as PublicShelf;
        setData(shelf);
        if (shelf.settings?.theme) document.documentElement.dataset.shelfTheme = shelf.settings.theme;
      })
      .catch(() => !stopped && setError("Could not load this shelf right now."))
      .finally(() => !stopped && setLoading(false));
    return () => { stopped = true; };
  }, [username]);

  const loadSocial = useCallback(async () => {
    const demoSocial = localDemoSocial(username);
    if (demoSocial) { setSocial(demoSocial); return; }
    const session = readStoredShelfSession();
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_profile_social`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}), "Content-Type": "application/json" },
      body: JSON.stringify({ p_username: username }),
    });
    if (response.ok) setSocial(await response.json() || {});
  }, [username]);

  useEffect(() => { void loadSocial(); }, [loadSocial]);

  const books = useMemo(() => Array.isArray(data?.books) ? data!.books! : [], [data]);
  const favoriteBooks = useMemo(() => {
    const ids = Array.isArray(data?.settings?.profile_favorite_book_ids) ? data.settings.profile_favorite_book_ids : [];
    return ids.map((id) => books.find((book) => book.id === id)).filter((book): book is PublicBook => Boolean(book)).slice(0, 5);
  }, [books, data?.settings?.profile_favorite_book_ids]);
  const name = data?.profile?.display_name || data?.profile?.username || username;
  const initials = name.split(/\s+/).slice(0,2).map((part) => part[0]?.toUpperCase()).join("") || "S";

  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 1300); } catch { /* optional */ }
  }

  async function toggleFollow() {
    const session = readStoredShelfSession();
    if (!localDemoReader(username) && !session?.access_token) { window.location.assign("/account"); return; }
    setFollowBusy(true);
    setFollowMessage("");
    try {
      if (localDemoReader(username)) {
        setSocial(await setReaderFollow(username, !social.is_following) as ProfileSocial);
        setFollowMessage(social.is_following ? `You unfollowed ${name}.` : `You’re now following ${name}.`);
        return;
      }
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/set_profile_follow`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session?.access_token || ""}`, "Content-Type": "application/json" },
        body: JSON.stringify({ p_username: username, p_follow: !social.is_following }),
      });
      if (!response.ok) throw new Error();
      setSocial(await response.json());
      setFollowMessage(social.is_following ? `You unfollowed ${name}.` : `You’re now following ${name}.`);
    } catch { setFollowMessage("Could not update that follow right now."); }
    finally { setFollowBusy(false); }
  }

  async function openConnections(kind: "followers" | "following") {
    setConnectionKind(kind); setConnectionsLoading(true);
    try { setConnections((await listConnections(username, kind)).profiles || []); }
    catch { setConnections([]); }
    finally { setConnectionsLoading(false); }
  }

  async function toggleConnectionFollow(profile: SocialProfile) {
    const session = readStoredShelfSession();
    if (!localDemoReader(profile.username) && !session?.access_token) { window.location.assign("/account"); return; }
    await setReaderFollow(profile.username, !profile.is_following);
    setConnections((current) => current.map((item) => item.username === profile.username ? { ...item, is_following: !item.is_following, followers: Math.max(0, Number(item.followers || 0) + (item.is_following ? -1 : 1)) } : item));
  }

  return <main className="public-shelf-page">
    <style>{`
      .public-shelf-page{width:min(1160px,calc(100% - 28px));margin:0 auto;padding:28px 0 60px;color:var(--sof-ui-text,#f2eadf)}
      .public-shelf-nav{display:flex;justify-content:space-between;gap:8px;margin-bottom:12px}.public-shelf-nav a{display:grid;place-items:center;min-height:40px;padding:0 13px;border:1px solid var(--sof-ui-border,rgba(255,255,255,.1));border-radius:999px;background:var(--sof-ui-control,rgba(255,255,255,.05));color:inherit;text-decoration:none;font-size:11px;font-weight:800}
      .public-shelf-profile{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:16px;align-items:center;padding:18px;border:1px solid var(--sof-ui-border,rgba(255,255,255,.1));border-radius:22px;background:var(--sof-ui-hero,rgba(18,18,15,.9));box-shadow:0 18px 50px rgba(0,0,0,.22)}
      .public-shelf-avatar{width:68px;height:68px;border-radius:50%;object-fit:cover;display:grid;place-items:center;background:var(--sof-ui-accent-soft,rgba(255,255,255,.08));color:var(--sof-ui-accent,#d6b47c);font-size:24px;font-weight:800}.public-shelf-profile h1{margin:0;font-size:clamp(30px,5vw,48px);line-height:.95}.public-shelf-profile p{margin:6px 0 0;color:var(--sof-ui-muted,#aaa);font-size:13px}.public-shelf-handle{font:800 9px/1 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--sof-ui-accent,#d6b47c);margin-bottom:5px}.public-shelf-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}.public-shelf-meta span{padding:5px 8px;border-radius:999px;background:var(--sof-ui-accent-soft,rgba(255,255,255,.06));font:800 9px/1 Arial,sans-serif}.public-shelf-share{min-height:42px;padding:0 14px;border:1px solid var(--sof-ui-border,rgba(255,255,255,.1));border-radius:999px;background:var(--sof-ui-control,rgba(255,255,255,.05));color:inherit;font:inherit;font-weight:750;cursor:pointer}
      .public-shelf-profile-actions{display:flex;gap:7px}.public-shelf-follow{min-height:42px;padding:0 15px;border:1px solid var(--sof-ui-accent,#d6b47c);border-radius:999px;background:var(--sof-ui-accent,#d6b47c);color:#23170f;font:inherit;font-weight:850;cursor:pointer}.public-shelf-follow.is-following{background:transparent;color:inherit}.public-shelf-genres{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.public-shelf-genres span{font-size:10px;color:var(--sof-ui-muted,#aaa)}.public-shelf-social-count{padding:5px 8px;border:0;border-radius:999px;background:var(--sof-ui-accent-soft,rgba(255,255,255,.06));color:inherit;font:800 9px/1 Arial,sans-serif;cursor:pointer}.public-shelf-social-count:hover{text-decoration:underline}
      .public-shelf-title{display:flex;align-items:end;justify-content:space-between;gap:12px;margin:24px 2px 10px}.public-shelf-title h2{margin:0;font-size:20px}.public-shelf-title span{color:var(--sof-ui-muted,#aaa);font-size:12px}
      .public-follow-message{margin:9px 2px 0;color:var(--sof-ui-accent,#d6b47c);font-size:11px}.public-favorites{margin-top:20px;padding:18px;border:1px solid var(--sof-ui-border,rgba(255,255,255,.1));border-radius:20px;background:var(--sof-ui-hero,rgba(18,18,15,.72))}.public-favorites-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:14px}.public-favorites-head h2{margin:0;font-size:19px}.public-favorites-head span{color:var(--sof-ui-muted,#aaa);font-size:10px;text-transform:capitalize}.public-favorites-list{display:flex;align-items:end;gap:12px;overflow-x:auto;padding:2px 2px 10px}.public-favorite-cover{width:105px;flex:0 0 105px;margin:0}.public-favorite-cover img,.public-favorite-cover>span{display:grid;place-items:center;width:100%;aspect-ratio:2/3;border-radius:8px;object-fit:cover;background:var(--book-color,#5d493a);box-shadow:0 10px 24px rgba(0,0,0,.34);font:600 28px Georgia,serif}.public-favorite-cover figcaption{margin-top:7px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--sof-ui-muted,#aaa);font-size:10px}.public-shared-spine{display:flex;align-items:end;justify-content:center;flex:0 0 auto}.public-shared-spine>button{pointer-events:none}.public-shelf-row .public-shared-spine{min-width:58px}
      .public-bookcase{padding:18px 18px 26px;border:14px solid #4b2d1d;border-bottom-width:21px;border-radius:18px 18px 8px 8px;background:linear-gradient(180deg,rgba(0,0,0,.18),rgba(0,0,0,.36)),var(--sof-ui-input,#181914);box-shadow:inset 0 0 50px rgba(0,0,0,.38),0 22px 45px rgba(0,0,0,.26)}
      .public-shelf-row{min-height:238px;display:flex;align-items:end;justify-content:center;gap:7px;padding:18px 10px 22px;border-bottom:20px solid #4b2d1d;box-shadow:0 12px 13px rgba(0,0,0,.42),inset 0 -1px rgba(255,255,255,.04);overflow:hidden}.public-shelf-row:last-child{margin-bottom:0}.public-book{position:relative;flex:0 0 clamp(58px,7vw,86px);height:clamp(174px,20vw,218px);overflow:hidden;border-radius:5px 4px 2px 5px;background:var(--book-color,#5d493a);box-shadow:4px 5px 10px rgba(0,0,0,.36),inset 1px 0 rgba(255,255,255,.09);writing-mode:vertical-rl;color:#f7edde}.public-book img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}.public-book::after{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(90deg,rgba(0,0,0,.28),transparent 18%,transparent 78%,rgba(0,0,0,.3))}.public-book-copy{position:relative;z-index:2;display:flex;height:100%;align-items:center;gap:7px;padding:10px 7px;text-shadow:0 1px 3px rgba(0,0,0,.72)}.public-book-copy strong{font-size:12px;max-height:82%;overflow:hidden}.public-book-copy small{font-size:8px;opacity:.8}.public-shelf-empty{padding:70px 20px;text-align:center;color:var(--sof-ui-muted,#aaa)}.public-shelf-state{min-height:60vh;display:grid;place-items:center;text-align:center;color:var(--sof-ui-muted,#aaa)}.public-connections-backdrop{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:16px;background:rgba(5,4,3,.72);backdrop-filter:blur(8px)}.public-connections{width:min(520px,100%);max-height:min(76vh,680px);overflow:auto;padding:18px;border:1px solid rgba(255,255,255,.12);border-radius:22px;background:#17120f;box-shadow:0 28px 80px rgba(0,0,0,.55)}.public-connections>header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.public-connections h2{margin:0;text-transform:capitalize}.public-connections-close{width:38px;height:38px;border:1px solid rgba(255,255,255,.12);border-radius:50%;background:rgba(255,255,255,.05);color:inherit;font-size:20px;cursor:pointer}.public-connection{display:grid;grid-template-columns:44px 1fr auto;gap:10px;align-items:center;padding:10px 0;border-top:1px solid rgba(255,255,255,.07)}.public-connection img,.public-connection-avatar{width:44px;height:44px;display:grid;place-items:center;border-radius:50%;object-fit:cover;background:#4d382b;font-weight:800}.public-connection-copy{display:grid;gap:2px;min-width:0;color:inherit;text-decoration:none}.public-connection-copy strong,.public-connection-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.public-connection-copy small{color:var(--sof-ui-muted,#aaa)}.public-connection>button{min-height:34px;padding:0 10px;border:1px solid var(--sof-ui-accent,#d6b47c);border-radius:9px;background:var(--sof-ui-accent,#d6b47c);color:#23170f;font:inherit;font-size:10px;font-weight:800}.public-connection>button.is-following{background:transparent;color:inherit}.public-connections-empty{padding:30px;text-align:center;color:var(--sof-ui-muted,#aaa)}
      @media(max-width:650px){.public-shelf-page{padding-top:12px}.public-shelf-profile{grid-template-columns:auto 1fr;padding:14px}.public-shelf-avatar{width:54px;height:54px}.public-shelf-profile-actions{grid-column:1/-1}.public-shelf-profile-actions button{flex:1}.public-bookcase{padding-inline:5px;border-width:10px;border-bottom-width:15px}.public-shelf-row{justify-content:flex-start;overflow-x:auto;padding-inline:8px;min-height:222px}.public-favorites{padding:15px 12px}.public-favorites-list.is-spines{justify-content:space-between;gap:0;overflow-x:visible;padding-bottom:2px}.public-favorites-list.is-spines .public-shared-spine>button{--mobile-spine-render-width:min(var(--mobile-spine-width,56px),calc((100vw - 78px)/5))!important}.public-favorite-cover{width:90px;flex-basis:90px}}
    `}</style>
    <nav className="public-shelf-nav" aria-label="Public profile navigation"><Link href="/readers">← Readers</Link><Link href="/">My shelf</Link></nav>
    {loading ? <div className="public-shelf-state">Loading @{username}’s shelf…</div> : error ? <div className="public-shelf-state"><div><h1>This shelf isn’t public</h1><p>{error}</p><Link href="/readers">Discover public readers</Link></div></div> : data ? <>
      <section className="public-shelf-profile">
        {data.profile?.avatar_url ? <img className="public-shelf-avatar" src={data.profile.avatar_url} alt="" /> : <div className="public-shelf-avatar">{initials}</div>}
        <div><div className="public-shelf-handle">@{data.profile?.username || username}</div><h1>{name}’s shelf</h1>{data.profile?.bio && <p>{data.profile.bio}</p>}<div className="public-shelf-meta"><span>{books.length} books</span><span>★ {Number(data.settings?.community_stars || 0)} community stars</span><button className="public-shelf-social-count" type="button" onClick={() => void openConnections("followers")}>{Number(social.followers || 0)} followers</button><button className="public-shelf-social-count" type="button" onClick={() => void openConnections("following")}>{Number(social.following || 0)} following</button>{data.profile?.trusted_curator && <span>✓ Curator</span>}</div>{social.favorite_genres?.length ? <div className="public-shelf-genres">{social.favorite_genres.map((genre) => <span key={genre}>#{genre}</span>)}</div> : null}</div>
        <div className="public-shelf-profile-actions">{!social.is_self ? <button type="button" className={`public-shelf-follow${social.is_following ? " is-following" : ""}`} aria-pressed={Boolean(social.is_following)} disabled={followBusy} onClick={() => void toggleFollow()}>{followBusy ? "Saving…" : social.is_following ? "✓ Following" : "Follow"}</button> : <Link className="public-shelf-share" href="/account">Edit my profile</Link>}<button type="button" className="public-shelf-share" onClick={() => void copyLink()}>{copied ? "Copied!" : "Share shelf"}</button></div>
      </section>
      {followMessage ? <p className="public-follow-message" role="status">{followMessage}</p> : null}
      {connectionKind && <div className="public-connections-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConnectionKind(null); }}><section className="public-connections" role="dialog" aria-modal="true" aria-label={`${name}'s ${connectionKind}`}><header><h2>{connectionKind}</h2><button className="public-connections-close" type="button" aria-label="Close" onClick={() => setConnectionKind(null)}>×</button></header>{connectionsLoading ? <div className="public-connections-empty">Loading readers…</div> : connections.length ? connections.map((profile) => { const connectionName = profile.display_name || profile.username; const connectionInitials = connectionName.split(/\s+/).slice(0,2).map((part) => part[0]?.toUpperCase()).join("") || "S"; return <article className="public-connection" key={profile.username}>{profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : <span className="public-connection-avatar">{connectionInitials}</span>}<Link className="public-connection-copy" href={`/u/${encodeURIComponent(profile.username)}`}><strong>{connectionName}</strong><small>@{profile.username} · {Number(profile.followers || 0)} followers</small></Link>{!profile.is_self && <button type="button" className={profile.is_following ? "is-following" : ""} onClick={() => void toggleConnectionFollow(profile)}>{profile.is_following ? "Following" : "Follow"}</button>}</article>; }) : <div className="public-connections-empty">No public readers here yet.</div>}</section></div>}
      {favoriteBooks.length ? <section className="public-favorites" aria-labelledby="public-favorites-title"><div className="public-favorites-head"><h2 id="public-favorites-title">Books that feel like me</h2><span>{data.settings?.profile_favorites_style === "spines" ? "Spines" : "Covers"}</span></div><div className={`public-favorites-list ${data.settings?.profile_favorites_style === "spines" ? "is-spines" : "is-covers"}`}>{favoriteBooks.map((book, index) => data.settings?.profile_favorites_style === "spines" ? <article className="public-shared-spine" key={book.id}><MobileBookSpine book={book} index={index} onSelect={() => undefined} externalSpineUrl={book.demoSpineUrl || publicSpineUrl(book.spineStoragePath)} /></article> : <figure className="public-favorite-cover" key={book.id} style={{ "--book-color": book.color } as React.CSSProperties}>{book.preferredCover?.url ? <img src={book.preferredCover.url} alt="" /> : <span>{book.title.slice(0, 1)}</span>}<figcaption>{book.title}</figcaption></figure>)}</div></section> : null}
      <div className="public-shelf-title"><h2>Shelf of Fame</h2><span>Theme: {(data.settings?.theme || "classic").replace(/-/g," ")}</span></div>
      <section className="public-bookcase" aria-label={`${name}'s bookshelf`}>
        {books.length ? Array.from({length:Math.ceil(books.length/8)},(_,row) => <div className="public-shelf-row" key={row}>{books.slice(row*8,row*8+8).map((book,index) => <article className="public-shared-spine" key={book.id}><MobileBookSpine book={book} index={(row * 8) + index} onSelect={() => undefined} externalSpineUrl={book.demoSpineUrl || publicSpineUrl(book.spineStoragePath)} /></article>)}</div>) : <div className="public-shelf-empty">No books on this public shelf yet.</div>}
      </section>
    </> : null}
  </main>;
}
