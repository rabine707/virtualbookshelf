"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const LIBRARY_KEY = "shelf-of-fame-library-v1";
const ASIN_REGISTRY_KEY = "shelf-of-fame-asin-registry-v1";
const COVER_HISTORY_KEY = "shelf-of-fame-saved-cover-history-v1";
const SPINE_CANDIDATES_KEY = "shelf-of-fame-spine-candidates-v1";
const REOPEN_KEY = "shelf-of-fame-web-cover-reopen-v1";

type StoredBook = {
  id?: string;
  title?: string;
  author?: string;
  isbn?: string;
  isbnSource?: string;
  isbnConfidence?: "high" | "medium" | "low";
  asin?: string;
} & Record<string, unknown>;

type ActiveBook = { title: string; author: string; isbn: string; asin: string };
type SearchResult = { title?: string; author?: string; isbn?: string; source?: string };
type Proposal = {
  title: string;
  author: string;
  isbn: string;
  asin: string;
  confidence: "high" | "medium";
  source: string;
};
type Cover = { url?: string; source?: string };
type Candidate = { title?: string; author?: string } & Record<string, unknown>;

function normalize(value?: string) {
  return (value || "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function identity(title?: string, author?: string) { return `${normalize(title)}::${normalize(author)}`; }
function cleanIsbn(value: string) {
  const cleaned = value.replace(/[=\"'\s-]/g, "").trim().toUpperCase();
  return /^(?:\d{13}|\d{9}[\dX])$/.test(cleaned) ? cleaned : "";
}
function cleanAsin(value: string) {
  const cleaned = value.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return /^[A-Z0-9]{10}$/.test(cleaned) ? cleaned : "";
}
function emptyish(value: string) {
  const cleaned = value.trim();
  return !cleaned || /^(?:n\/a|not set|none|—|-)$/i.test(cleaned);
}
function detailValue(details: Element, wanted: string) {
  for (const dt of details.querySelectorAll("dt")) {
    if (dt.textContent?.trim().toLowerCase() !== wanted.toLowerCase()) continue;
    const value = dt.nextElementSibling?.textContent?.trim() || "";
    return emptyish(value) ? "" : value;
  }
  return "";
}
function readLibrary(): StoredBook[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LIBRARY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed as StoredBook[] : [];
  } catch { return []; }
}
function readModalBook(): ActiveBook | null {
  const details = document.querySelector<HTMLElement>(".modal .details");
  if (!details) return null;
  const title = details.querySelector("h2")?.textContent?.trim() || "";
  const author = (details.querySelector(".author")?.textContent || "").replace(/^by\s+/i, "").trim();
  if (!title) return null;
  const stored = readLibrary().find((item) => identity(item.title, item.author) === identity(title, author));
  const isbn = cleanIsbn(String(stored?.isbn || detailValue(details, "ISBN") || ""));
  const asin = cleanAsin(String(stored?.asin || detailValue(details, "ASIN") || detailValue(details, "Audible ASIN") || ""));
  return { title, author, isbn, asin };
}
function uniqueCovers(values: unknown[]) {
  const seen = new Set<string>();
  return values.filter((value): value is Cover => {
    if (!value || typeof value !== "object") return false;
    const url = String((value as Cover).url || "");
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}
function migrateCoverHistory(oldKey: string, newKey: string) {
  if (!oldKey || !newKey || oldKey === newKey) return;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(COVER_HISTORY_KEY) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
    const history = parsed as Record<string, unknown[]>;
    const merged = uniqueCovers([...(history[newKey] || []), ...(history[oldKey] || [])]);
    if (merged.length) history[newKey] = merged; else delete history[newKey];
    delete history[oldKey];
    window.localStorage.setItem(COVER_HISTORY_KEY, JSON.stringify(history));
  } catch { /* metadata still saves */ }
}
function migrateSpineCandidates(oldKey: string, nextTitle: string, nextAuthor: string) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SPINE_CANDIDATES_KEY) || "[]");
    if (!Array.isArray(parsed)) return;
    let changed = false;
    const next = (parsed as Candidate[]).map((candidate) => {
      if (identity(candidate.title, candidate.author) !== oldKey) return candidate;
      changed = true;
      return { ...candidate, title: nextTitle, author: nextAuthor };
    });
    if (changed) window.localStorage.setItem(SPINE_CANDIDATES_KEY, JSON.stringify(next));
  } catch { /* best effort */ }
}
function saveBookInfo(book: ActiveBook, nextTitleRaw: string, nextAuthorRaw: string, isbn: string, asin: string, source: string, confidence: "high" | "medium") {
  const nextTitle = nextTitleRaw.replace(/\s+/g, " ").trim();
  const nextAuthor = nextAuthorRaw.replace(/\s+/g, " ").trim() || "Unknown author";
  if (!nextTitle) throw new Error("A title is required.");
  const oldKey = identity(book.title, book.author);
  const newKey = identity(nextTitle, nextAuthor);
  const parsed = readLibrary();
  let changed = false;
  const next = parsed.map((item) => {
    if (identity(item.title, item.author) !== oldKey) return item;
    changed = true;
    const updated: StoredBook = { ...item, title: nextTitle, author: nextAuthor };
    if (isbn) {
      updated.isbn = isbn; updated.isbnSource = source; updated.isbnConfidence = confidence;
    } else {
      delete updated.isbn; delete updated.isbnSource; delete updated.isbnConfidence;
    }
    if (asin) updated.asin = asin; else delete updated.asin;
    return updated;
  });
  if (!changed) throw new Error("That book could not be found in your saved shelf.");
  window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
  migrateCoverHistory(oldKey, newKey);
  migrateSpineCandidates(oldKey, nextTitle, nextAuthor);
  let registry: Record<string, string> = {};
  try { registry = JSON.parse(window.localStorage.getItem(ASIN_REGISTRY_KEY) || "{}") || {}; } catch { registry = {}; }
  delete registry[oldKey];
  if (asin) registry[newKey] = asin; else delete registry[newKey];
  window.localStorage.setItem(ASIN_REGISTRY_KEY, JSON.stringify(registry));
  try { window.sessionStorage.setItem(REOPEN_KEY, newKey); } catch { /* optional */ }
  return { title: nextTitle, author: nextAuthor };
}

const inlineStyles = `
.book-info-card{margin-top:18px;padding:14px;border:1px solid rgba(197,154,109,.18);border-radius:18px;background:rgba(255,255,255,.025)}
.book-info-card-header{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:10px}.book-info-card-header>div{display:grid;gap:2px}.book-info-card-header small{font:800 9px/1 Arial,sans-serif;letter-spacing:.14em;opacity:.55}.book-info-card-header strong{font-size:14px}.book-info-card-header button{min-height:34px;padding:0 13px;border-radius:999px;border:1px solid rgba(197,154,109,.24);background:rgba(255,255,255,.045);color:inherit;font:inherit;font-size:12px;font-weight:800}
.book-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.book-info-row{min-width:0;display:grid;gap:3px;padding:10px 11px;border-radius:12px;background:rgba(255,255,255,.025)}.book-info-row span{font:800 9px/1 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;opacity:.48}.book-info-row b{min-width:0;overflow-wrap:anywhere;font-size:13px;line-height:1.25}.book-info-row em{font-style:normal;font-weight:500;opacity:.42}
.identifier-edit-button{width:100%;margin-top:10px;padding:11px 12px;border-radius:14px;border:1px solid rgba(197,154,109,.18);background:rgba(255,255,255,.025);color:inherit;display:flex;align-items:center;gap:10px;text-align:left}.identifier-edit-button>span:first-child{font-size:20px}.identifier-edit-button span:last-child{display:grid;gap:2px}.identifier-edit-button small{opacity:.58;font-size:11px}
.identifier-proposal-grid{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px 12px;margin:14px 0;font-size:13px}.identifier-proposal-grid span{opacity:.55}.identifier-proposal-grid b{overflow-wrap:anywhere}.identifier-fields{margin-top:12px}
@media(max-width:560px){.book-info-grid{grid-template-columns:1fr}.identifier-sheet{padding:18px}}
`;

export default function IdentifierEditor() {
  const [details, setDetails] = useState<Element | null>(null);
  const [active, setActive] = useState<ActiveBook | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [asin, setAsin] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sync = () => {
      const next = document.querySelector(".modal .details");
      setDetails(next);
      if (!open) setActive(readModalBook());
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [open]);

  const canSave = useMemo(() => Boolean(title.trim()) && (!isbn.trim() || Boolean(cleanIsbn(isbn))) && (!asin.trim() || Boolean(cleanAsin(asin))), [asin, isbn, title]);

  function showEditor() {
    const current = readModalBook(); if (!current) return;
    setActive(current); setTitle(current.title); setAuthor(current.author); setIsbn(current.isbn); setAsin(current.asin);
    setProposal(null); setStatus(""); setOpen(true);
  }
  function persist(nextTitle: string, nextAuthor: string, nextIsbn: string, nextAsin: string, source: string, confidence: "high" | "medium") {
    if (!active) return;
    try {
      const saved = saveBookInfo(active, nextTitle, nextAuthor, nextIsbn, nextAsin, source, confidence);
      setStatus(`Saved ${saved.title} by ${saved.author}. Refreshing the book view…`);
      window.setTimeout(() => window.location.reload(), 450);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save those book details.");
    }
  }
  async function findBookDetails() {
    if (!active || busy) return;
    setBusy(true); setProposal(null); setStatus("Searching for the most likely book match…");
    try {
      const searchParams = new URLSearchParams({ title: active.title, author: active.author });
      const asinParams = new URLSearchParams({ title: active.title, author: active.author });
      const [bookResponse, asinResponse] = await Promise.all([
        fetch(`/api/book-search?${searchParams.toString()}`, { cache: "no-store" }),
        fetch(`/api/asin?${asinParams.toString()}`, { cache: "no-store" }),
      ]);
      const bookPayload = bookResponse.ok ? await bookResponse.json() as { results?: SearchResult[] } : {};
      const asinPayload = asinResponse.ok ? await asinResponse.json() as { asin?: string | null } : {};
      const best = Array.isArray(bookPayload.results) ? bookPayload.results[0] : undefined;
      const foundTitle = best?.title?.trim() || active.title;
      const foundAuthor = best?.author?.trim() || active.author;
      const foundIsbn = cleanIsbn(best?.isbn || active.isbn || "");
      const foundAsin = cleanAsin(asinPayload.asin || active.asin || "");
      const changedIdentity = normalize(foundTitle) !== normalize(active.title) || normalize(foundAuthor) !== normalize(active.author);
      const foundSomething = Boolean(best || foundIsbn || foundAsin);
      if (!foundSomething) { setStatus("No confident book match was found. Nothing was changed."); return; }
      const confidence: "high" | "medium" = best && (foundIsbn || foundAsin) ? "high" : "medium";
      setProposal({ title: foundTitle, author: foundAuthor, isbn: foundIsbn, asin: foundAsin, confidence, source: best?.source ? `${best.source} book match` : "Autofill search" });
      setStatus(changedIdentity ? "I found a cleaner title/author match. Review it before applying." : "Review the matching book details below before applying.");
    } catch { setStatus("Autofill could not finish. Nothing was changed."); }
    finally { setBusy(false); }
  }

  if (!details || !active) return null;
  const summary = <section className="book-info-card" aria-label="Book information">
    <style>{inlineStyles}</style>
    <header className="book-info-card-header"><div><small>BOOK INFO</small><strong>Saved details</strong></div><button type="button" onClick={showEditor}>Edit</button></header>
    <div className="book-info-grid">
      <div className="book-info-row"><span>Title</span><b>{active.title || <em>Not set</em>}</b></div>
      <div className="book-info-row"><span>Author</span><b>{active.author || <em>Not set</em>}</b></div>
      <div className="book-info-row"><span>ISBN</span><b>{active.isbn || <em>Not set</em>}</b></div>
      <div className="book-info-row"><span>ASIN</span><b>{active.asin || <em>Not set</em>}</b></div>
    </div>
    <button type="button" className="identifier-edit-button" onClick={showEditor}><span>⌕</span><span><strong>Edit / autofill book info</strong><small>Correct the title, author, ISBN, or ASIN</small></span></button>
  </section>;

  return <>
    {createPortal(summary, details)}
    {open && createPortal(<div className="identifier-backdrop" onClick={() => !busy && setOpen(false)}>
      <section className="identifier-sheet" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header><div><small>BOOK INFO</small><h3>Edit book details</h3><p>{active.title}</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close">×</button></header>
        <button type="button" className="identifier-find" onClick={findBookDetails} disabled={busy}>{busy ? "Searching…" : "✦ Find matching book details"}</button>
        {proposal && <div className="identifier-proposal"><div><small>{proposal.confidence.toUpperCase()} CONFIDENCE</small><strong>Likely book match</strong></div><div className="identifier-proposal-grid"><span>Title</span><b>{proposal.title}</b><span>Author</span><b>{proposal.author}</b><span>ISBN</span><b>{proposal.isbn || "Not found"}</b><span>ASIN</span><b>{proposal.asin || "Not found"}</b></div><div className="identifier-proposal-actions"><button type="button" onClick={() => setProposal(null)}>Not this one</button><button type="button" onClick={() => persist(proposal.title, proposal.author, proposal.isbn, proposal.asin, proposal.source, proposal.confidence)}>Use this match</button></div></div>}
        {status && <p className="identifier-status" role="status">{status}</p>}
        <div className="identifier-fields">
          <label><span>Title</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Book title" /></label>
          <label><span>Author</span><input value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="Author" /></label>
          <label><span>ISBN-10 or ISBN-13</span><input value={isbn} onChange={(event) => setIsbn(event.target.value)} placeholder="Leave blank if unknown" />{isbn.trim() && !cleanIsbn(isbn) && <small className="identifier-error">Enter a valid ISBN.</small>}</label>
          <label><span>ASIN</span><input value={asin} onChange={(event) => setAsin(event.target.value)} autoCapitalize="characters" placeholder="Leave blank if unknown" />{asin.trim() && !cleanAsin(asin) && <small className="identifier-error">ASINs are 10 letters/numbers.</small>}</label>
        </div>
        <p className="identifier-help">Empty ISBN and ASIN fields are okay. Title and author corrections update what readers see throughout the shelf.</p>
        <div className="identifier-actions"><button type="button" className="identifier-clear" onClick={() => { setIsbn(""); setAsin(""); }}>Clear IDs</button><button type="button" className="identifier-save" disabled={!canSave || busy} onClick={() => persist(title, author, cleanIsbn(isbn), cleanAsin(asin), "Manual correction", "high")}>Save changes</button></div>
      </section>
    </div>, document.body)}
  </>;
}
