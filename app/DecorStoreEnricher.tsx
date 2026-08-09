"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const POINTS_KEY = "shelf-of-fame-community-points-v1";
const OWNED_KEY = "shelf-of-fame-decor-owned-v1";
const ACTIVE_KEY = "shelf-of-fame-decor-active-v1";

type Item = { id: string; name: string; category: "Bookcases" | "Decorations" | "Wallpapers" | "Theme Packs"; price: number; preview: string };
const ITEMS: Item[] = [
  { id: "case-walnut", name: "Walnut Library", category: "Bookcases", price: 18, preview: "▥" },
  { id: "case-floating", name: "Floating Shelves", category: "Bookcases", price: 28, preview: "═" },
  { id: "decor-plant", name: "Trailing Plant", category: "Decorations", price: 8, preview: "🪴" },
  { id: "decor-candle", name: "Candlelight", category: "Decorations", price: 8, preview: "🕯" },
  { id: "decor-crystal", name: "Fantasy Crystal", category: "Decorations", price: 12, preview: "🔮" },
  { id: "wall-botanical", name: "Botanical Paper", category: "Wallpapers", price: 10, preview: "❀" },
  { id: "wall-smoke", name: "Rose Smoke", category: "Wallpapers", price: 10, preview: "☁" },
  { id: "pack-fantasy", name: "Enchanted Shelf", category: "Theme Packs", price: 35, preview: "✦" },
];

function readOwned() { try { return JSON.parse(localStorage.getItem(OWNED_KEY) || "[]") as string[]; } catch { return []; } }
function readActive() { try { return JSON.parse(localStorage.getItem(ACTIVE_KEY) || "{}") as Record<string,string>; } catch { return {}; } }
function applyActive(active: Record<string,string>) {
  const root = document.documentElement;
  [...root.classList].filter((c) => c.startsWith("sof-decor-") || c.startsWith("sof-wall-") || c.startsWith("sof-case-") || c.startsWith("sof-pack-")).forEach((c) => root.classList.remove(c));
  Object.values(active).filter(Boolean).forEach((id) => root.classList.add(`sof-${id}`));
}

export default function DecorStoreEnricher() {
  const [toolbar, setToolbar] = useState<Element | null>(null);
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const points = Number(typeof window !== "undefined" ? localStorage.getItem(POINTS_KEY) || 0 : 0);
  const owned = useMemo(() => { void revision; return readOwned(); }, [revision]);
  const active = useMemo(() => { void revision; return readActive(); }, [revision]);

  useEffect(() => {
    const sync = () => setToolbar(document.querySelector(".toolbar")); sync();
    applyActive(readActive());
    const observer = new MutationObserver(sync); observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  function categoryKey(item: Item) { return item.category.toLowerCase().replace(/\s+/g, "-"); }
  function choose(item: Item) {
    const isOwned = owned.includes(item.id);
    if (!isOwned) {
      if (points < item.price) return;
      localStorage.setItem(POINTS_KEY, String(points - item.price));
      localStorage.setItem(OWNED_KEY, JSON.stringify([...owned, item.id]));
    }
    const next = { ...active, [categoryKey(item)]: item.id };
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(next)); applyActive(next); setRevision((v) => v + 1);
  }

  const categories = ["Bookcases", "Decorations", "Wallpapers", "Theme Packs"] as const;
  return <>
    {toolbar && createPortal(<button className="decor-store-launch" type="button" onClick={() => setOpen(true)}><span>✦</span><span><small>Rewards</small><strong>Decor Store</strong></span><b>★ {points}</b></button>, toolbar)}
    {open && createPortal(<div className="decor-store-backdrop" onClick={() => setOpen(false)}><section className="decor-store" onClick={(e) => e.stopPropagation()}><header><div><small>SHELF REWARDS</small><h2>Decor Store</h2><p>Earn stars by helping verify real spines.</p></div><div className="decor-balance">★ {points}</div><button onClick={() => setOpen(false)} aria-label="Close">×</button></header>{categories.map((category) => <section className="decor-category" key={category}><h3>{category}</h3><div className="decor-grid">{ITEMS.filter((item) => item.category === category).map((item) => { const isOwned = owned.includes(item.id); const isActive = active[categoryKey(item)] === item.id; return <button key={item.id} onClick={() => choose(item)} disabled={!isOwned && points < item.price}><span className="decor-preview">{item.preview}</span><strong>{item.name}</strong><small>{isActive ? "✓ Equipped" : isOwned ? "Owned · Equip" : `★ ${item.price}`}</small></button>; })}</div></section>)}</section></div>, document.body)}
  </>;
}
