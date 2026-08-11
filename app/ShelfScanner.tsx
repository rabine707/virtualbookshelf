"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { shelfAccessToken } from "./cloud-sync";

const LIBRARY_KEY = "shelf-of-fame-library-v1";
const PALETTE = ["#6f4e37", "#8b5e3c", "#5a6b4f", "#8e3b46", "#46627f", "#aa7a3d", "#584b63", "#7b6f62"];

type ScanBook = { title: string; author: string; confidence?: number; isbn?: string; year?: number };
type StoredBook = Record<string, unknown> & { id?: string; title?: string; author?: string; isbn?: string };

function normalize(value?: string) {
  return (value || "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function identity(title?: string, author?: string) {
  return `${normalize(title)}::${normalize(author)}`;
}

function readShelf(): StoredBook[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LIBRARY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function resizePhoto(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Could not read photo"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Could not open photo"));
      image.onload = () => {
        const maxSide = 1600;
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Could not prepare photo"));
        ctx.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", .82));
      };
      image.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

export default function ShelfScanner() {
  const [host, setHost] = useState<Element | null>(null);
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [books, setBooks] = useState<ScanBook[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sync = () => setHost(document.querySelector(".book-search-add-card"));
    sync();
    const observer = new MutationObserver(() => requestAnimationFrame(sync));
    observer.observe(document.body, { childList: true, subtree: true });
    const openScan = () => setOpen(true);
    window.addEventListener("shelf-open-shelf-scan", openScan);
    return () => { observer.disconnect(); window.removeEventListener("shelf-open-shelf-scan", openScan); };
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("shelf-scanner-open");
    return () => document.body.classList.remove("shelf-scanner-open");
  }, [open]);

  const selectedCount = useMemo(() => [...selected].filter((index) => books[index]).length, [books, selected]);

  async function pickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true); setMessage("Preparing photo…"); setBooks([]); setSelected(new Set());
    try {
      const next = await resizePhoto(file);
      setPhoto(next); setSourceName(file.name);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not prepare that photo.");
    } finally { setBusy(false); }
  }

  async function scan() {
    if (!photo || busy) return;
    const token = shelfAccessToken();
    if (!token) {
      setMessage("Sign in first so your scans and imported books can follow you across devices.");
      return;
    }
    setBusy(true); setMessage("Reading the shelf… this can take a few seconds.");
    try {
      const response = await fetch("/api/scan-shelf", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageDataUrl: photo, sourceName }),
      });
      const data = await response.json() as { books?: ScanBook[]; remaining?: number; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not scan this shelf.");
      const found = Array.isArray(data.books) ? data.books : [];
      setBooks(found);
      setSelected(new Set(found.map((_, index) => index)));
      setRemaining(typeof data.remaining === "number" ? data.remaining : null);
      setMessage(found.length ? `Found ${found.length} likely book${found.length === 1 ? "" : "s"}. Uncheck anything that looks wrong.` : "I couldn't confidently read a book from that photo. Try a closer, straighter shot.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not scan this shelf.");
    } finally { setBusy(false); }
  }

  function addSelected() {
    if (!selectedCount) return;
    const current = readShelf();
    const isSample = current.length === 12 && current.every((book) => /^\d+$/.test(String(book.id || "")) && Number(book.id) >= 1 && Number(book.id) <= 12);
    const next = isSample ? [] : [...current];
    const existing = new Set(next.map((book) => identity(String(book.title || ""), String(book.author || ""))));
    let added = 0;
    for (const index of [...selected].sort((a,b) => a-b)) {
      const book = books[index];
      if (!book) continue;
      const key = identity(book.title, book.author);
      if (!key || existing.has(key)) continue;
      existing.add(key);
      next.push({
        id: book.isbn || `scan:${Date.now()}-${index}-${Math.random().toString(36).slice(2,7)}`,
        title: book.title,
        author: book.author || "Unknown author",
        isbn: book.isbn || undefined,
        isbnSource: book.isbn ? "Shelf scan" : undefined,
        isbnConfidence: book.isbn ? "medium" : undefined,
        year: book.year ? String(book.year) : undefined,
        importSource: "Shelf scan",
        color: PALETTE[next.length % PALETTE.length],
      });
      added += 1;
    }
    window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
    setMessage(added ? `Added ${added} book${added === 1 ? "" : "s"} to your shelf.` : "Those books are already on your shelf.");
    if (added) window.setTimeout(() => window.location.reload(), 350);
  }

  const launcher = host ? createPortal(
    <button type="button" className="shelf-scan-launch" onClick={() => setOpen(true)}>
      <span>▣</span><span><strong>Scan a bookshelf</strong><small>Take a photo and import the books</small></span>
    </button>, host
  ) : null;

  return <>
    <style>{`
      .shelf-scan-launch{margin:4px 22px 18px;min-height:52px;display:flex;align-items:center;gap:10px;padding:9px 12px;border:1px solid rgba(255,255,255,.11);border-radius:14px;background:rgba(255,255,255,.055);color:inherit;font:inherit;text-align:left;cursor:pointer}
      .shelf-scan-launch>span:first-child{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:rgba(255,255,255,.07);font-size:18px}.shelf-scan-launch>span:last-child{display:grid;gap:2px}.shelf-scan-launch strong{font-size:13px}.shelf-scan-launch small{opacity:.58;font-size:10px}
      .shelf-scanner-backdrop{position:fixed;inset:0;z-index:1900;display:grid;place-items:center;padding:18px;background:rgba(4,5,4,.72);backdrop-filter:blur(12px)}
      .shelf-scanner{width:min(760px,100%);max-height:90vh;overflow:auto;border:1px solid rgba(255,255,255,.1);border-radius:24px;background:#141713;color:#f1eadf;box-shadow:0 28px 80px rgba(0,0,0,.58);padding:18px}
      .shelf-scanner header{display:flex;justify-content:space-between;gap:14px}.shelf-scanner header small{font:800 9px/1 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#a9bd8e}.shelf-scanner h2{margin:5px 0 3px;font-size:28px}.shelf-scanner header p{margin:0;opacity:.64;font-size:12px}.shelf-scanner-close{width:40px;height:40px;border:1px solid rgba(255,255,255,.1);border-radius:50%;background:rgba(255,255,255,.04);color:inherit;font-size:25px}
      .shelf-scan-photo{margin-top:16px;display:grid;grid-template-columns:minmax(0,220px) 1fr;gap:14px}.shelf-scan-preview{min-height:180px;border:1px dashed rgba(255,255,255,.14);border-radius:15px;display:grid;place-items:center;overflow:hidden;background:rgba(0,0,0,.16);color:rgba(255,255,255,.48);text-align:center;padding:12px}.shelf-scan-preview img{width:100%;height:100%;max-height:260px;object-fit:contain}
      .shelf-scan-controls{display:grid;align-content:center;gap:9px}.shelf-scan-controls button,.shelf-scan-add{min-height:44px;border:1px solid rgba(255,255,255,.11);border-radius:12px;background:rgba(255,255,255,.06);color:inherit;font:inherit;font-weight:750;cursor:pointer}.shelf-scan-controls .primary-scan{background:#9db47f;color:#11180f;border-color:transparent}.shelf-scan-controls button:disabled,.shelf-scan-add:disabled{opacity:.4}
      .shelf-scan-message{margin:12px 0 0;padding:10px 12px;border-radius:11px;background:rgba(255,255,255,.045);font-size:12px;line-height:1.4}.shelf-scan-results{display:grid;gap:7px;margin-top:12px}.shelf-scan-result{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.025)}.shelf-scan-result input{width:18px;height:18px}.shelf-scan-result span{display:grid;gap:2px}.shelf-scan-result strong{font-size:13px}.shelf-scan-result small{font-size:10px;opacity:.58}.shelf-scan-confidence{font:800 10px/1 Arial,sans-serif;opacity:.65}.shelf-scan-footer{position:sticky;bottom:-18px;margin:14px -18px -18px;padding:12px 18px calc(12px + env(safe-area-inset-bottom));display:flex;align-items:center;gap:10px;background:rgba(20,23,19,.96);border-top:1px solid rgba(255,255,255,.08)}.shelf-scan-footer span{font-size:11px;opacity:.62}.shelf-scan-add{margin-left:auto;padding:0 16px;background:#9db47f;color:#11180f;border-color:transparent}
      @media(max-width:620px){.shelf-scanner-backdrop{padding:0;align-items:end}.shelf-scanner{width:100%;max-height:92vh;border-radius:24px 24px 0 0}.shelf-scan-photo{grid-template-columns:1fr}.shelf-scan-preview{min-height:150px;max-height:230px}.shelf-scan-launch{margin-inline:14px}}
    `}</style>
    {launcher}
    <input ref={inputRef} hidden type="file" accept="image/*" capture="environment" onChange={pickPhoto} />
    {open && createPortal(
      <div className="shelf-scanner-backdrop" onClick={() => !busy && setOpen(false)}>
        <section className="shelf-scanner" role="dialog" aria-modal="true" aria-label="Scan a bookshelf" onClick={(event) => event.stopPropagation()}>
          <header><div><small>PHOTO IMPORT</small><h2>Scan a bookshelf</h2><p>Take one clear photo. You approve every detected book before it is added.</p></div><button className="shelf-scanner-close" onClick={() => setOpen(false)} aria-label="Close">×</button></header>
          <div className="shelf-scan-photo">
            <div className="shelf-scan-preview">{photo ? <img src={photo} alt="Bookshelf to scan" /> : <span>📚<br/>No shelf photo yet</span>}</div>
            <div className="shelf-scan-controls">
              <button type="button" onClick={() => inputRef.current?.click()}>{photo ? "Choose another photo" : "Take / choose photo"}</button>
              <button type="button" className="primary-scan" disabled={!photo || busy} onClick={() => void scan()}>{busy ? "Reading shelf…" : "Find books in photo"}</button>
              <small>Tip: shoot straight-on with titles as sharp and large as possible.</small>
            </div>
          </div>
          {message && <div className="shelf-scan-message" role="status">{message}</div>}
          {books.length > 0 && <div className="shelf-scan-results">{books.map((book,index) => <label className="shelf-scan-result" key={`${book.title}-${book.author}-${index}`}><input type="checkbox" checked={selected.has(index)} onChange={() => setSelected((current) => { const next=new Set(current); if(next.has(index)) next.delete(index); else next.add(index); return next; })}/><span><strong>{book.title}</strong><small>{book.author}{book.year ? ` · ${book.year}` : ""}</small></span><b className="shelf-scan-confidence">{Math.round((book.confidence || 0)*100)}%</b></label>)}</div>}
          <div className="shelf-scan-footer"><span>{remaining === null ? "10 scans/day while testing" : `${remaining} scans left today`}</span><button className="shelf-scan-add" type="button" disabled={!selectedCount || busy} onClick={addSelected}>Add {selectedCount || ""} to shelf</button></div>
        </section>
      </div>, document.body
    )}
  </>;
}
