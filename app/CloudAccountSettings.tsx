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
    const syncHost = () => setHost(document.querySelector(".sof-account-shell"));
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
      .cloud-account-card{margin-top:16px;padding:18px;border:1px solid rgba(255,255,255,.08);border-radius:20px;background:rgba(255,255,255,.035);color:inherit}.cloud-account-card>header{display:flex;justify-content:space-between;gap:16px;align-items:start;margin-bottom:14px}.cloud-account-card>header small{font:800 9px/1 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;opacity:.55}.cloud-account-card h2{margin:5px 0 3px;font-size:22px}.cloud-account-card header p{margin:0;opacity:.62;font-size:12px}.cloud-sync-badge{padding:7px 10px;border-radius:999px;background:rgba(112,172,112,.1);color:#baddba;font:800 10px/1 Arial,sans-serif}.cloud-account-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.cloud-account-stat{padding:11px;border:1px solid rgba(255,255,255,.07);border-radius:13px;background:rgba(0,0,0,.09);display:grid;gap:4px}.cloud-account-stat small{font:800 8px/1 Arial,sans-serif;letter-spacing:.09em;text-transform:uppercase;opacity:.5}.cloud-account-stat strong{font-size:14px}.cloud-share-row{margin-top:12px;padding:12px;border:1px solid rgba(255,255,255,.07);border-radius:14px;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}.cloud-share-row strong{font-size:14px}.cloud-share-row p{margin:3px 0 0;opacity:.58;font-size:11px;line-height:1.35}.cloud-share-actions{display:flex;gap:7px}.cloud-share-actions button{min-height:38px;padding:0 11px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:rgba(255,255,255,.055);color:inherit;font:inherit;font-size:11px;font-weight:750}.cloud-share-actions button.primary-share{background:#9db47f;color:#11180f;border-color:transparent}.cloud-account-message{margin-top:9px;font-size:11px;opacity:.7}@media(max-width:620px){.cloud-account-stats{grid-template-columns:1fr 1fr}.cloud-account-stat:first-child{grid-column:1/-1}.cloud-share-row{grid-template-columns:1fr}.cloud-share-actions button{flex:1}.cloud-share-actions{display:flex}}
    `}</style>
    <section className="cloud-account-card">
      <header><div><small>SHELF CLOUD</small><h2>Sync, rewards & sharing</h2><p>Your library, theme, artwork choices, rewards and decor now follow your account.</p></div><span className="cloud-sync-badge">● Sync on</span></header>
      <div className="cloud-account-stats">
        <div className="cloud-account-stat"><small>Library</small><strong>Cross-device</strong></div>
        <div className="cloud-account-stat"><small>Community</small><strong>★ {Number(settings?.community_stars || 0)}</strong></div>
        <div className="cloud-account-stat"><small>Plan</small><strong>{(settings?.plan || "free").replace(/^./,(c) => c.toUpperCase())}</strong></div>
      </div>
      <div className="cloud-share-row"><div><strong>{settings?.shelf_public ? "Public shelf is on" : "Public shelf is off"}</strong><p>{settings?.shelf_public ? `Anyone with your /u/${username || "username"} link can view your shelf. Your email and account settings stay private.` : "Turn this on when you want a shareable Shelf of Fame profile."}</p></div><div className="cloud-share-actions"><button type="button" className="primary-share" disabled={busy || !settings} onClick={() => void togglePublic()}>{busy ? "Saving…" : settings?.shelf_public ? "Make private" : "Make public"}</button>{settings?.shelf_public && publicUrl && <button type="button" onClick={() => void copy()}>{copied ? "Copied!" : "Copy link"}</button>}</div></div>
      {message && <div className="cloud-account-message" role="status">{message}</div>}
    </section>
  </>, host);
}
