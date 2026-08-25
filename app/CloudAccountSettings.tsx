"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CloudSettings, loadMyShelf, updateMyShelfSettings } from "./cloud-sync";

const SESSION_KEY = "shelf-of-fame-supabase-session";
const PUBLIC_KEY = "shelf-of-fame-public-v1";

type StoredSession = { access_token?: string; profile?: { username?: string }; user?: { user_metadata?: { username?: string } } };

function sessionInfo(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as StoredSession : null;
  } catch { return null; }
}

export default function CloudAccountSettings() {
  const [host, setHost] = useState<Element | null>(null);
  const [settings, setSettings] = useState<CloudSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const syncHost = () => setHost(document.querySelector(".sof-cloud-settings-host") || document.querySelector(".sof-account-shell"));
    syncHost();
    const observer = new MutationObserver(syncHost);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!host || !sessionInfo()?.access_token) return;
    let stopped = false;
    loadMyShelf().then((shelf) => {
      if (stopped) return;
      const next = shelf.settings || { shelf_public: false, community_stars: 0, plan: "free" as const };
      setSettings(next);
      window.localStorage.setItem(PUBLIC_KEY, next.shelf_public ? "on" : "off");
    }).catch(() => !stopped && setMessage("Cloud settings are temporarily unavailable."));
    return () => { stopped = true; };
  }, [host]);

  if (!host || !sessionInfo()?.access_token) return null;
  const session = sessionInfo();
  const username = session?.profile?.username || session?.user?.user_metadata?.username || "";
  const publicUrl = username && typeof window !== "undefined" ? `${window.location.origin}/u/${encodeURIComponent(username)}` : "";

  async function togglePublic() {
    if (!settings || busy) return;
    const next = !settings.shelf_public;
    setBusy(true); setMessage("");
    try {
      const saved = await updateMyShelfSettings({ shelf_public: next });
      setSettings((current) => ({ ...(current || {}), ...saved, shelf_public: next }));
      window.localStorage.setItem(PUBLIC_KEY, next ? "on" : "off");
      setMessage(next ? "Your shelf is now shareable." : "Your shelf is private again.");
    } catch {
      setMessage("Could not change shelf sharing right now.");
    } finally { setBusy(false); }
  }

  async function copy() {
    if (!publicUrl) return;
    try { await navigator.clipboard.writeText(publicUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1200); } catch { setMessage("Could not copy the link."); }
  }

  return createPortal(<>
    <style>{`
      .cloud-account-card{margin:0 0 18px;padding:18px;border:1px solid rgba(210,168,111,.16);border-radius:20px;background:linear-gradient(145deg,rgba(48,35,27,.94),rgba(23,17,14,.96));color:inherit}.cloud-account-card>header{display:flex;justify-content:space-between;gap:16px;align-items:start;margin-bottom:14px}.cloud-account-card>header small{font:800 9px/1 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#caa572}.cloud-account-card h2{margin:5px 0 3px;font-size:22px}.cloud-account-card header p{margin:0;color:#aaa096;font-size:12px}.cloud-sync-badge{padding:7px 10px;border-radius:999px;background:rgba(112,172,112,.1);color:#baddba;font:800 10px/1 Arial,sans-serif}.cloud-account-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.cloud-account-stat{padding:11px;border:1px solid rgba(255,255,255,.07);border-radius:13px;background:rgba(0,0,0,.09);display:grid;gap:4px}.cloud-account-stat small{font:800 8px/1 Arial,sans-serif;letter-spacing:.09em;text-transform:uppercase;color:#94887d}.cloud-account-stat strong{font-size:14px}.cloud-share-row{margin-top:12px;padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:14px;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}.cloud-share-row strong{font-size:14px}.cloud-share-row p{margin:3px 0 0;color:#aaa096;font-size:11px;line-height:1.35}.cloud-share-actions{display:flex;gap:7px}.cloud-share-actions button,.cloud-share-actions a{min-height:38px;padding:0 11px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:rgba(255,255,255,.055);color:inherit;text-decoration:none;font:inherit;font-size:11px;font-weight:750}.cloud-share-actions button.primary-share{background:#9db47f;color:#11180f;border-color:transparent}.cloud-account-message{margin-top:9px;font-size:11px;color:#c8bbaa}@media(max-width:620px){.cloud-account-stats{grid-template-columns:1fr 1fr}.cloud-account-stat:first-child{grid-column:1/-1}.cloud-share-row{grid-template-columns:1fr}.cloud-share-actions button,.cloud-share-actions a{flex:1}.cloud-share-actions{display:flex;flex-wrap:wrap}}
    `}</style>
    <section className="cloud-account-card">
      <header><div><small>PUBLISH & CONNECT</small><h2>Share your reading life</h2><p>Publish your shelf to join reader discovery and let people follow you.</p></div><span className="cloud-sync-badge">● Sync on</span></header>
      <div className="cloud-account-stats">
        <div className="cloud-account-stat"><small>Library</small><strong>Cross-device</strong></div>
        <div className="cloud-account-stat"><small>Community</small><strong>★ {Number(settings?.community_stars || 0)}</strong></div>
        <div className="cloud-account-stat"><small>Plan</small><strong>{(settings?.plan || "free").replace(/^./,(c) => c.toUpperCase())}</strong></div>
      </div>
      <div className="cloud-share-row"><div><strong>{settings?.shelf_public ? "Your shelf is public" : "Your shelf is private"}</strong><p>{settings?.shelf_public ? `Readers can discover @${username || "you"}, view your shelf, and follow you. Your email, notes, and account settings stay private.` : "Publish when you are ready to appear in reader discovery and accept followers."}</p></div><div className="cloud-share-actions"><button type="button" className="primary-share" disabled={busy || !settings} onClick={() => void togglePublic()}>{busy ? "Saving…" : settings?.shelf_public ? "Make private" : "Publish profile"}</button>{settings?.shelf_public && publicUrl && <><a href={`/u/${encodeURIComponent(username)}`}>View shelf</a><button type="button" onClick={() => void copy()}>{copied ? "Copied!" : "Copy link"}</button></>}</div></div>
      {message && <div className="cloud-account-message" role="status">{message}</div>}
    </section>
  </>, host);
}
