"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ActiveBook = {
  button: HTMLButtonElement;
  title: string;
  author: string;
  hasCover: boolean;
  hasSpine: boolean;
};

type BulkProgress = {
  kind: "covers";
  done: number;
  total: number;
  success: number;
};

const SERIES_KEY = "shelf-of-fame-series-mode-v1";
const FAVORITES_KEY = "shelf-of-fame-favorites-v1";
const SKIPPED_COVERS_KEY = "shelf-of-fame-fix-skipped-covers-v1";

function waitFor<T extends Element>(selector: string, timeout = 6000): Promise<T | null> {
  const existing = document.querySelector<T>(selector);
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
    const observer = new MutationObserver(() => {
      const found = document.querySelector<T>(selector);
      if (!found) return;
      window.clearTimeout(timer);
      observer.disconnect();
      resolve(found);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "class", "data-generated-spine"],
    });
  });
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function buttonKey(button: HTMLButtonElement) {
  return (button.title || button.textContent || "unknown-book").replace(/\s+/g, " ").trim().slice(0, 500);
}

function readSkipped(key: string) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch { return new Set<string>(); }
}

function writeSkipped(key: string, values: Set<string>) {
  window.localStorage.setItem(key, JSON.stringify([...values]));
}

export default function QoLEnricher() {
  const [toolbar, setToolbar] = useState<Element | null>(null);
  const [active, setActive] = useState<ActiveBook | null>(null);
  const [fixOpen, setFixOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<BulkProgress | null>(null);
  const [version, setVersion] = useState(0);
  const bypass = useRef(false);
  const cancelBulk = useRef(false);
  const pendingKeys = useRef<string[]>([]);
  const pendingIndex = useRef(0);
  const pendingSkipStorageKey = useRef(SKIPPED_COVERS_KEY);

  useEffect(() => {
    window.localStorage.removeItem(SERIES_KEY);

    const sync = () => {
      setToolbar(document.querySelector(".toolbar"));
      setVersion((value) => value + 1);
    };
    sync();

    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        sync();
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-generated-spine"],
    });

    return () => {
      observer.disconnect();
      cancelBulk.current = true;
    };
  }, []);

  const counts = useMemo(() => {
    void version;
    const all = [...document.querySelectorAll<HTMLButtonElement>(".shelf-row .book")];
    const skippedCovers = readSkipped(SKIPPED_COVERS_KEY);
    const missingCovers = all.filter((button) => !button.classList.contains("has-cover"));
    const coverSkipped = missingCovers.filter((button) => skippedCovers.has(buttonKey(button))).length;
    return {
      covers: missingCovers.length - coverSkipped,
      skipped: coverSkipped,
      totalMissing: missingCovers.length,
    };
  }, [version, fixOpen, bulkBusy]);

  function openOriginal(button: HTMLButtonElement) {
    setActive(null);
    setFixOpen(false);
    bypass.current = true;
    button.click();
    window.setTimeout(() => { bypass.current = false; }, 0);
  }

  async function openAndFind(button: HTMLButtonElement, selector?: string) {
    openOriginal(button);
    const modal = await waitFor<HTMLElement>(".modal", 5000);
    if (!modal || !selector) return modal;
    const target = await waitFor<HTMLElement>(selector, 5000);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    return target;
  }

  function toggleFavorite(book: ActiveBook) {
    const identity = `${book.title}::${book.author}`;
    const stored = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || "[]") as string[];
    const next = stored.includes(identity) ? stored.filter((value) => value !== identity) : [...stored, identity];
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    book.button.classList.toggle("qol-favorite", next.includes(identity));
    setVersion((value) => value + 1);
  }

  function markSkipped(storageKey: string, key: string) {
    const skipped = readSkipped(storageKey);
    skipped.add(key);
    writeSkipped(storageKey, skipped);
  }

  function startBulk(targets: HTMLButtonElement[], kind: "covers") {
    setBulkBusy(true);
    cancelBulk.current = false;
    pendingKeys.current = targets.map(buttonKey);
    pendingIndex.current = 0;
    pendingSkipStorageKey.current = SKIPPED_COVERS_KEY;
    setBulkProgress({ kind, done: 0, total: targets.length, success: 0 });
  }

  function skipRemaining() {
    const skipped = readSkipped(pendingSkipStorageKey.current);
    for (const key of pendingKeys.current.slice(pendingIndex.current)) skipped.add(key);
    writeSkipped(pendingSkipStorageKey.current, skipped);
    cancelBulk.current = true;
    setBulkStatus("Skipping the remaining books after the current one…");
    setVersion((value) => value + 1);
  }

  function retrySkipped() {
    window.localStorage.removeItem(SKIPPED_COVERS_KEY);
    setBulkStatus("Skipped books are back in the queue.");
    setVersion((value) => value + 1);
  }

  async function fixMissingCovers() {
    if (bulkBusy) return;
    const skipped = readSkipped(SKIPPED_COVERS_KEY);
    const targets = [...document.querySelectorAll<HTMLButtonElement>(".shelf-row .book:not(.has-cover)")]
      .filter((button) => !skipped.has(buttonKey(button)));
    if (!targets.length) return;
    startBulk(targets, "covers");
    let fixed = 0;

    for (let index = 0; index < targets.length && !cancelBulk.current; index += 1) {
      pendingIndex.current = index;
      const button = targets[index];
      const key = buttonKey(button);
      setBulkStatus(`Finding covers… ${index + 1} of ${targets.length}`);
      setBulkProgress({ kind: "covers", done: index, total: targets.length, success: fixed });
      openOriginal(button);
      const modal = await waitFor<HTMLElement>(".modal", 5000);
      if (!modal) {
        markSkipped(SKIPPED_COVERS_KEY, key);
        continue;
      }

      let image = await waitFor<HTMLImageElement>(".modal .cover-image", 4500);
      if (!image) {
        const more = [...modal.querySelectorAll<HTMLButtonElement>("button")].find((candidate) => /search more covers|find more covers/i.test(candidate.textContent || ""));
        more?.click();
        image = await waitFor<HTMLImageElement>(".modal .cover-image", 7000);
      }

      if (image) {
        const correct = [...modal.querySelectorAll<HTMLButtonElement>("button")].find((candidate) => /correct cover|use this cover/i.test(candidate.textContent || ""));
        if (correct) {
          correct.click();
          fixed += 1;
        } else {
          markSkipped(SKIPPED_COVERS_KEY, key);
        }
      } else {
        markSkipped(SKIPPED_COVERS_KEY, key);
      }
      document.querySelector<HTMLButtonElement>(".modal .close")?.click();
      setBulkProgress({ kind: "covers", done: index + 1, total: targets.length, success: fixed });
      await delay(180);
    }

    pendingIndex.current = targets.length;
    setBulkStatus(cancelBulk.current ? `Stopped — fixed ${fixed} before pausing.` : `Finished — fixed ${fixed} of ${targets.length}. Unresolved books were moved to Skipped.`);
    setBulkProgress({ kind: "covers", done: Math.min(targets.length, pendingIndex.current), total: targets.length, success: fixed });
    setBulkBusy(false);
    setVersion((value) => value + 1);
    window.setTimeout(() => setFixOpen(true), 120);
  }

  if (!toolbar) return null;
  const pct = bulkProgress?.total ? Math.round((bulkProgress.done / bulkProgress.total) * 100) : 0;

  return (
    <>
      <style>{`
        .qol-bulk-floater{position:fixed;z-index:1800;right:18px;bottom:18px;width:min(360px,calc(100vw - 28px));padding:12px;border:1px solid rgba(255,255,255,.1);border-radius:16px;background:rgba(18,16,14,.97);color:#f4ead9;box-shadow:0 18px 45px rgba(0,0,0,.45);backdrop-filter:blur(14px)}
        .qol-bulk-head{display:flex;justify-content:space-between;gap:10px;align-items:center}.qol-bulk-head strong{font-size:13px}.qol-bulk-head span{font:800 10px/1 Arial,sans-serif;opacity:.62}.qol-bulk-track{height:6px;margin:9px 0;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}.qol-bulk-track i{display:block;height:100%;background:#b68a5d;transition:width .2s ease}.qol-bulk-copy{font-size:11px;line-height:1.35;opacity:.72}.qol-bulk-actions{display:flex;gap:7px;margin-top:9px}.qol-bulk-actions button{flex:1;min-height:34px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:rgba(255,255,255,.05);color:inherit;font:inherit;font-size:10px;font-weight:750}.qol-skipped-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding:9px 10px;border:1px solid rgba(255,255,255,.07);border-radius:11px;background:rgba(255,255,255,.025)}.qol-skipped-row span{font-size:11px;opacity:.67}.qol-skipped-row button{border:0;background:transparent;color:#dcb183;font:inherit;font-size:11px;font-weight:800;cursor:pointer}@media(max-width:720px){.qol-bulk-floater{left:14px;right:14px;bottom:calc(96px + env(safe-area-inset-bottom));width:auto}}
      `}</style>
      {createPortal(
        <div className="qol-toolbar" aria-label="Shelf quick actions">
          <button type="button" className="qol-fix-button" onClick={() => setFixOpen(true)}>
            <span aria-hidden="true">✦</span>
            <span><small>Library</small><strong>Fix Missing</strong></span>
            {counts.covers > 0 && <b>{counts.covers}</b>}
          </button>
        </div>,
        toolbar,
      )}

      {bulkBusy && bulkProgress && createPortal(
        <aside className="qol-bulk-floater" aria-live="polite">
          <div className="qol-bulk-head"><strong>Fixing covers</strong><span>{bulkProgress.done}/{bulkProgress.total} · {pct}%</span></div>
          <div className="qol-bulk-track"><i style={{ width: `${pct}%` }} /></div>
          <div className="qol-bulk-copy">{bulkStatus} · {bulkProgress.success} successful</div>
          <div className="qol-bulk-actions"><button type="button" onClick={() => { cancelBulk.current = true; setBulkStatus("Stopping after the current book…"); }}>Pause</button><button type="button" onClick={skipRemaining}>Skip remaining</button></div>
        </aside>, document.body
      )}

      {active && createPortal(
        <div className="qol-backdrop" onClick={() => setActive(null)}>
          <section className="qol-sheet" role="dialog" aria-modal="true" aria-label={`Actions for ${active.title}`} onClick={(event) => event.stopPropagation()}>
            <div className="qol-grabber" />
            <header>
              <div><small>Book actions</small><h2>{active.title}</h2><p>{active.author}</p></div>
              <button type="button" className="qol-close" onClick={() => setActive(null)} aria-label="Close">×</button>
            </header>
            <div className="qol-actions-grid">
              <button type="button" onClick={() => openOriginal(active.button)}><span>☰</span><strong>Details</strong><small>Book info & covers</small></button>
              <button type="button" onClick={() => openAndFind(active.button, ".modal .cover-picker")}><span>▣</span><strong>Change Cover</strong><small>Browse alternatives</small></button>
              <button type="button" onClick={() => openAndFind(active.button, ".modal .spine-selector")} disabled={!active.hasCover}><span>✦</span><strong>Choose Spine</strong><small>{active.hasCover ? "Manual & curator artwork" : "Needs a cover first"}</small></button>
              <button type="button" onClick={() => toggleFavorite(active)}><span>★</span><strong>Favorite</strong><small>Mark this book</small></button>
            </div>
          </section>
        </div>,
        document.body,
      )}

      {fixOpen && createPortal(
        <div className="qol-backdrop" onClick={() => !bulkBusy && setFixOpen(false)}>
          <section className="qol-sheet qol-fix-sheet" role="dialog" aria-modal="true" aria-label="Fix missing book artwork" onClick={(event) => event.stopPropagation()}>
            <div className="qol-grabber" />
            <header><div><small>Library cleanup</small><h2>Fix Missing</h2><p>{counts.totalMissing ? `${counts.totalMissing} books still need artwork. Work through them in batches.` : "Your visible shelf artwork is caught up."}</p></div><button type="button" className="qol-close" disabled={bulkBusy} onClick={() => setFixOpen(false)} aria-label="Close">×</button></header>
            <div className="qol-fix-options">
              <button type="button" disabled={bulkBusy || counts.covers === 0} onClick={() => void fixMissingCovers()}><span className="qol-count">{counts.covers}</span><span><strong>Find missing covers</strong><small>Search, save the strongest match, and skip unresolved books for later</small></span></button>
            </div>
            {counts.skipped > 0 && <div className="qol-skipped-row"><span>{counts.skipped} unresolved book{counts.skipped === 1 ? " is" : "s are"} skipped for now.</span><button type="button" onClick={retrySkipped}>Retry skipped</button></div>}
            {bulkStatus && !bulkBusy && <div className="qol-progress" role="status"><span>{bulkStatus}</span></div>}
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
