"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const LIBRARY_KEY = "shelf-of-fame-library-v1";
const ASIN_REGISTRY_KEY = "shelf-of-fame-asin-registry-v1";

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
type Proposal = { isbn: string; asin: string; confidence: "high" | "medium"; source: string };

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
function readModalBook(): ActiveBook | null {
  const details = document.querySelector<HTMLElement>(".modal .details");
  if (!details) return null;
  const title = details.querySelector("h2")?.textContent?.trim() || "";
  const author = (details.querySelector(".author")?.textContent || "").replace(/^by\s+/i, "").trim();
  if (!title) return null;
  let isbn = ""; let asin = "";
  for (const row of [...details.querySelectorAll("dt")]) {
    const label = row.textContent?.trim().toLowerCase();
    const value = row.nextElementSibling?.textContent?.trim() || "";
    if (label === "isbn" && value !== "N/A") isbn = value;
    if ((label === "asin" || label === "audible asin") && value !== "N/A") asin = value;
  }
  return { title, author, isbn, asin };
}
function saveIdentifiers(book: ActiveBook, isbn: string, asin: string, source: string, confidence: "high" | "medium") {
  const key = identity(book.title, book.author);
  const parsed = JSON.parse(window.localStorage.getItem(LIBRARY_KEY) || "[]");
  if (!Array.isArray(parsed)) throw new Error("Saved library could not be read.");
  const next = (parsed as StoredBook[]).map((item) => {
    if (identity(item.title, item.author) !== key) return item;
    const updated: StoredBook = { ...item };
    if (isbn) { updated.isbn = isbn; updated.isbnSource = source; updated.isbnConfidence = confidence; }
    else { delete updated.isbn; delete updated.isbnSource; delete updated.isbnConfidence; }
    if (asin) updated.asin = asin; else delete updated.asin;
    return updated;
  });
  window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
  let registry: Record<string, string> = {};
  try { registry = JSON.parse(window.localStorage.getItem(ASIN_REGISTRY_KEY) || "{}") || {}; } catch { registry = {}; }
  if (asin) registry[key] = asin; else delete registry[key];
  window.localStorage.setItem(ASIN_REGISTRY_KEY, JSON.stringify(registry));
}

export default function IdentifierEditor() {
  const [details, setDetails] = useState<Element | null>(null);
  const [active, setActive] = useState<ActiveBook | null>(null);
  const [open, setOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [isbn, setIsbn] = useState("");
  const [asin, setAsin] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sync = () => { const next = document.querySelector(".modal .details"); setDetails(next); if (!open) setActive(readModalBook()); };
    sync(); const observer = new MutationObserver(sync); observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [open]);

  const canSave = useMemo(() => (!isbn.trim() || Boolean(cleanIsbn(isbn))) && (!asin.trim() || Boolean(cleanAsin(asin))), [isbn, asin]);
  function showEditor() {
    const current = readModalBook(); if (!current) return;
    setActive(current); setIsbn(current.isbn); setAsin(current.asin); setProposal(null); setStatus(""); setAdvanced(false); setOpen(true);
  }
  function persist(nextIsbn: string, nextAsin: string, source: string, confidence: "high" | "medium") {
    if (!active) return;
    saveIdentifiers(active, nextIsbn, nextAsin, source, confidence);
    setStatus("Saved. Refreshing so cover and spine searches use the updated edition identity…");
    window.setTimeout(() => window.location.reload(), 650);
  }
  async function findIdentifiers() {
    if (!active || busy) return;
    setBusy(true); setProposal(null); setStatus("Searching for the most likely edition…");
    try {
      const params = new URLSearchParams({ title: active.title, author: active.author, libraryThing: "1", identifierSearch: "1" });
      const asinParams = new URLSearchParams({ title: active.title, author: active.author });
      const [coverResponse, asinResponse] = await Promise.all([
        fetch(`/api/cover?${params.toString()}`, { cache: "no-store" }),
        fetch(`/api/asin?${asinParams.toString()}`, { cache: "no-store" }),
      ]);
      const coverResult = coverResponse.ok ? await coverResponse.json() as { discoveredIsbn?: string } : {};
      const asinResult = asinResponse.ok ? await asinResponse.json() as { asin?: string | null } : {};
      const foundIsbn = cleanIsbn(coverResult.discoveredIsbn || "");
      const foundAsin = cleanAsin(asinResult.asin || "");
      if (!foundIsbn && !foundAsin) { setStatus("No confident identifier match was found. Nothing was changed."); return; }
      const confidence: "high" | "medium" = foundIsbn && foundAsin ? "high" : "medium";
      setProposal({ isbn: foundIsbn, asin: foundAsin, confidence, source: "Autofill search" });
      setStatus("Review the match below before applying it.");
    } catch { setStatus("Autofill could not finish. Nothing was changed."); }
    finally { setBusy(false); }
  }

  if (!details || !active) return null;
  return <>
    {createPortal(<button type="button" className="identifier-edit-button" onClick={showEditor}><span>⌕</span><span><strong>Autofill book details</strong><small>Find ISBN / ASIN and review before saving</small></span></button>, details)}
    {open && createPortal(<div className="identifier-backdrop" onClick={() => !busy && setOpen(false)}>
      <section className="identifier-sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header><div><small>BOOK IDENTITY</small><h3>{active.title}</h3><p>{active.author}</p></div><button onClick={() => setOpen(false)} aria-label="Close">×</button></header>
        <button type="button" className="identifier-find" onClick={findIdentifiers} disabled={busy}>{busy ? "Searching…" : "✦ Autofill identifiers"}</button>
        {proposal && <div className="identifier-proposal"><div><small>{proposal.confidence.toUpperCase()} CONFIDENCE</small><strong>Likely edition match</strong></div><dl><dt>ISBN</dt><dd>{proposal.isbn || "Not found"}</dd><dt>ASIN</dt><dd>{proposal.asin || "Not found"}</dd></dl><div className="identifier-proposal-actions"><button onClick={() => setProposal(null)}>Not this one</button><button onClick={() => persist(proposal.isbn, proposal.asin, proposal.source, proposal.confidence)}>Use this match</button></div></div>}
        {status && <p className="identifier-status" role="status">{status}</p>}
        <button className="identifier-advanced-toggle" onClick={() => setAdvanced((v) => !v)}>{advanced ? "Hide manual correction" : "Advanced: correct manually"}</button>
        {advanced && <div className="identifier-advanced"><label><span>ISBN-10 or ISBN-13</span><input value={isbn} onChange={(e) => setIsbn(e.target.value)} placeholder="ISBN" />{isbn.trim() && !cleanIsbn(isbn) && <small className="identifier-error">Enter a valid ISBN.</small>}</label><label><span>ASIN</span><input value={asin} onChange={(e) => setAsin(e.target.value)} autoCapitalize="characters" placeholder="ASIN" />{asin.trim() && !cleanAsin(asin) && <small className="identifier-error">ASINs are 10 letters/numbers.</small>}</label><p className="identifier-help">Manual correction is intentionally secondary because identifiers are edition-specific.</p><div className="identifier-actions"><button className="identifier-clear" onClick={() => { setIsbn(""); setAsin(""); }}>Clear</button><button className="identifier-save" disabled={!canSave || busy} onClick={() => persist(cleanIsbn(isbn), cleanAsin(asin), "Manual correction", "high")}>Save correction</button></div></div>}
      </section>
    </div>, document.body)}
  </>;
}
