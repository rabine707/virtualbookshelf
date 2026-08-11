"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { loadPublicShelf, publicSpineUrl } from "../../cloud-sync";

type PublicProfile = { username?: string; display_name?: string; avatar_url?: string; bio?: string; trusted_curator?: boolean };
type PublicSettings = { theme?: string; community_stars?: number; plan?: string };
type PublicBook = {
  title?: string; author?: string; rating?: number; year?: string; color?: string;
  preferredCover?: { url?: string; source?: string } | null;
  spineStoragePath?: string | null; spineProvider?: string | null;
};
type PublicShelf = { profile?: PublicProfile; settings?: PublicSettings; books?: PublicBook[] };

export default function PublicShelfPage() {
  const params = useParams<{ username: string }>();
  const username = decodeURIComponent(String(params?.username || "")).replace(/^@/, "");
  const [data, setData] = useState<PublicShelf | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

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

  const books = useMemo(() => Array.isArray(data?.books) ? data!.books! : [], [data]);
  const name = data?.profile?.display_name || data?.profile?.username || username;
  const initials = name.split(/\s+/).slice(0,2).map((part) => part[0]?.toUpperCase()).join("") || "S";

  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 1300); } catch { /* optional */ }
  }

  return <main className="public-shelf-page">
    <style>{`
      .public-shelf-page{width:min(1160px,calc(100% - 28px));margin:0 auto;padding:28px 0 60px;color:var(--sof-ui-text,#f2eadf)}
      .public-shelf-profile{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:16px;align-items:center;padding:18px;border:1px solid var(--sof-ui-border,rgba(255,255,255,.1));border-radius:22px;background:var(--sof-ui-hero,rgba(18,18,15,.9));box-shadow:0 18px 50px rgba(0,0,0,.22)}
      .public-shelf-avatar{width:68px;height:68px;border-radius:50%;object-fit:cover;display:grid;place-items:center;background:var(--sof-ui-accent-soft,rgba(255,255,255,.08));color:var(--sof-ui-accent,#d6b47c);font-size:24px;font-weight:800}.public-shelf-profile h1{margin:0;font-size:clamp(30px,5vw,48px);line-height:.95}.public-shelf-profile p{margin:6px 0 0;color:var(--sof-ui-muted,#aaa);font-size:13px}.public-shelf-handle{font:800 9px/1 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--sof-ui-accent,#d6b47c);margin-bottom:5px}.public-shelf-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}.public-shelf-meta span{padding:5px 8px;border-radius:999px;background:var(--sof-ui-accent-soft,rgba(255,255,255,.06));font:800 9px/1 Arial,sans-serif}.public-shelf-share{min-height:42px;padding:0 14px;border:1px solid var(--sof-ui-border,rgba(255,255,255,.1));border-radius:999px;background:var(--sof-ui-control,rgba(255,255,255,.05));color:inherit;font:inherit;font-weight:750;cursor:pointer}
      .public-shelf-title{display:flex;align-items:end;justify-content:space-between;gap:12px;margin:24px 2px 10px}.public-shelf-title h2{margin:0;font-size:20px}.public-shelf-title span{color:var(--sof-ui-muted,#aaa);font-size:12px}
      .public-bookcase{padding:18px 18px 26px;border:14px solid #4b2d1d;border-bottom-width:21px;border-radius:18px 18px 8px 8px;background:linear-gradient(180deg,rgba(0,0,0,.18),rgba(0,0,0,.36)),var(--sof-ui-input,#181914);box-shadow:inset 0 0 50px rgba(0,0,0,.38),0 22px 45px rgba(0,0,0,.26)}
      .public-shelf-row{min-height:238px;display:flex;align-items:end;justify-content:center;gap:7px;padding:18px 10px 22px;border-bottom:20px solid #4b2d1d;box-shadow:0 12px 13px rgba(0,0,0,.42),inset 0 -1px rgba(255,255,255,.04);overflow:hidden}.public-shelf-row:last-child{margin-bottom:0}.public-book{position:relative;flex:0 0 clamp(58px,7vw,86px);height:clamp(174px,20vw,218px);overflow:hidden;border-radius:5px 4px 2px 5px;background:var(--book-color,#5d493a);box-shadow:4px 5px 10px rgba(0,0,0,.36),inset 1px 0 rgba(255,255,255,.09);writing-mode:vertical-rl;color:#f7edde}.public-book img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}.public-book::after{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(90deg,rgba(0,0,0,.28),transparent 18%,transparent 78%,rgba(0,0,0,.3))}.public-book-copy{position:relative;z-index:2;display:flex;height:100%;align-items:center;gap:7px;padding:10px 7px;text-shadow:0 1px 3px rgba(0,0,0,.72)}.public-book-copy strong{font-size:12px;max-height:82%;overflow:hidden}.public-book-copy small{font-size:8px;opacity:.8}.public-shelf-empty{padding:70px 20px;text-align:center;color:var(--sof-ui-muted,#aaa)}.public-shelf-state{min-height:60vh;display:grid;place-items:center;text-align:center;color:var(--sof-ui-muted,#aaa)}
      @media(max-width:650px){.public-shelf-page{padding-top:12px}.public-shelf-profile{grid-template-columns:auto 1fr;padding:14px}.public-shelf-avatar{width:54px;height:54px}.public-shelf-share{grid-column:1/-1;width:100%}.public-bookcase{padding-inline:5px;border-width:10px;border-bottom-width:15px}.public-shelf-row{justify-content:flex-start;overflow-x:auto;padding-inline:8px;min-height:222px}.public-book{flex-basis:70px;height:190px}}
    `}</style>
    {loading ? <div className="public-shelf-state">Loading @{username}’s shelf…</div> : error ? <div className="public-shelf-state"><div><h1>Shelf unavailable</h1><p>{error}</p><a href="/">Go to Shelf of Fame</a></div></div> : data ? <>
      <section className="public-shelf-profile">
        {data.profile?.avatar_url ? <img className="public-shelf-avatar" src={data.profile.avatar_url} alt="" /> : <div className="public-shelf-avatar">{initials}</div>}
        <div><div className="public-shelf-handle">@{data.profile?.username || username}</div><h1>{name}’s shelf</h1>{data.profile?.bio && <p>{data.profile.bio}</p>}<div className="public-shelf-meta"><span>{books.length} books</span><span>★ {Number(data.settings?.community_stars || 0)} community stars</span>{data.profile?.trusted_curator && <span>✓ Curator</span>}</div></div>
        <button type="button" className="public-shelf-share" onClick={() => void copyLink()}>{copied ? "Copied!" : "Share shelf"}</button>
      </section>
      <div className="public-shelf-title"><h2>Shelf of Fame</h2><span>Theme: {(data.settings?.theme || "classic").replace(/-/g," ")}</span></div>
      <section className="public-bookcase" aria-label={`${name}'s bookshelf`}>
        {books.length ? Array.from({length:Math.ceil(books.length/8)},(_,row) => <div className="public-shelf-row" key={row}>{books.slice(row*8,row*8+8).map((book,index) => { const spine=publicSpineUrl(book.spineStoragePath); const image=spine || book.preferredCover?.url || ""; return <div className="public-book" key={`${book.title}-${book.author}-${index}`} style={{"--book-color":book.color || "#5d493a"} as React.CSSProperties} title={`${book.title || "Untitled"} — ${book.author || "Unknown author"}`}>{image && <img src={image} alt="" />}<span className="public-book-copy"><strong>{book.title || "Untitled"}</strong><small>{book.author || "Unknown author"}</small></span></div>; })}</div>) : <div className="public-shelf-empty">No books on this public shelf yet.</div>}
      </section>
    </> : null}
  </main>;
}
