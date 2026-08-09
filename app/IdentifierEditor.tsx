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

type ActiveBook = {
  title: string;
  author: string;
  isbn: string;
  asin: string;
};

function normalize(value?: string) {
  return (value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function identity(title: string, author: string) {
  return `${normalize(title)}::${normalize(author)}`;
}

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

  let isbn = "";
  let asin = "";
  const rows = [...details.querySelectorAll("dt")];
  for (const row of rows) {
    const label = row.textContent?.trim().toLowerCase();
    const value = row.nextElementSibling?.textContent?.trim() || "";
    if (label === "isbn" && value !== "N/A") isbn = value;
    if ((label === "asin" || label === "audible asin") && value !== "N/A") asin = value;
  }
  return { title, author, isbn, asin };
}

function saveIdentifiers(book: ActiveBook, isbn: string, asin: string, source: string) {
  const key = identity(book.title, book.author);
  const parsed = JSON.parse(window.localStorage.getItem(LIBRARY_KEY) || "[]");
  if (!Array.isArray(parsed)) throw new Error("Saved library could not be read.");

  const next = (parsed as StoredBook[]).map((item) => {
    if (identity(item.title, item.author) !== key) return item;
    const updated: StoredBook = { ...item };
    if (isbn) {
      updated.isbn = isbn;
      updated.isbnSource = source;
      updated.isbnConfidence = source === "Manual" ? "high" : "medium";
    } else {
      delete updated.isbn;
      delete updated.isbnSource;
      delete updated.isbnConfidence;
    }
    if (asin) updated.asin = asin;
    else delete updated.asin;
    return updated;
  });
  window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));

  let registry: Record<string, string> = {};
  try {
    registry = JSON.parse(window.localStorage.getItem(ASIN_REGISTRY_KEY) || "{}") || {};
  } catch {
    registry = {};
  }
  if (asin) registry[key] = asin;
  else delete registry[key];
  window.localStorage.setItem(ASIN_REGISTRY_KEY, JSON.stringify(registry));
}

export default function IdentifierEditor() {
  const [details, setDetails] = useState<Element | null>(null);
  const [active, setActive] = useState<ActiveBook | null>(null);
  const [open, setOpen] = useState(false);
  const [isbn, setIsbn] = useState("");
  const [asin, setAsin] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sync = () => {
      const nextDetails = document.querySelector(".modal .details");
      setDetails(nextDetails);
      if (!open) setActive(readModalBook());
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [open]);

  const canSave = useMemo(() => {
    const isbnOkay = !isbn.trim() || Boolean(cleanIsbn(isbn));
    const asinOkay = !asin.trim() || Boolean(cleanAsin(asin));
    return isbnOkay && asinOkay;
  }, [isbn, asin]);

  function showEditor() {
    const current = readModalBook();
    if (!current) return;
    setActive(current);
    setIsbn(current.isbn);
    setAsin(current.asin);
    setStatus("");
    setOpen(true);
  }

  function persist(nextIsbn: string, nextAsin: string, source: string) {
    if (!active) return;
    saveIdentifiers(active, nextIsbn, nextAsin, source);
    setStatus("Saved. Refreshing the shelf so every cover and spine search uses the new identifiers…");
    window.setTimeout(() => window.location.reload(), 650);
  }

  function saveManual() {
    if (!active || !canSave) return;
    const nextIsbn = isbn.trim() ? cleanIsbn(isbn) : "";
    const nextAsin = asin.trim() ? cleanAsin(asin) : "";
    persist(nextIsbn, nextAsin, "Manual");
  }

  async function findIdentifiers() {
    if (!active || busy) return;
    setBusy(true);
    setStatus("Searching editions and identifier sources…");
    try {
      const params = new URLSearchParams({ title: active.title, author: active.author, libraryThing: "1", identifierSearch: "1" });
      const asinParams = new URLSearchParams({ title: active.title, author: active.author });
      const [coverResponse, asinResponse] = await Promise.all([
        fetch(`/api/cover?${params.toString()}`, { cache: "no-store" }),
        fetch(`/api/asin?${asinParams.toString()}`, { cache: "no-store" }),
      ]);
      const coverResult = coverResponse.ok ? await coverResponse.json() as { discoveredIsbn?: string } : {};
      const asinResult = asinResponse.ok ? await asinResponse.json() as { asin?: string | null } : {};
      const foundIsbn = cleanIsbn(coverResult.discoveredIsbn || "") || cleanIsbn(isbn);
      const foundAsin = cleanAsin(asinResult.asin || "") || cleanAsin(asin);

      if (!foundIsbn && !foundAsin) {
        setStatus("No confident ISBN or ASIN match found. You can still enter either one manually.");
        return;
      }
      setIsbn(foundIsbn);
      setAsin(foundAsin);
      persist(foundIsbn, foundAsin, "Identifier search");
    } catch {
      setStatus("Identifier search could not finish. Manual editing is still available.");
    } finally {
      setBusy(false);
    }
  }

  if (!details || !active) return null;

  return (
    <>
      {createPortal(
        <button type="button" className="identifier-edit-button" onClick={showEditor}>
          <span aria-hidden="true">⌕</span>
          <span><strong>Identifiers & editions</strong><small>Find, add, or correct ISBN / ASIN</small></span>
        </button>,
        details,
      )}

      {open && createPortal(
        <div className="identifier-backdrop" onClick={() => !busy && setOpen(false)}>
          <section className="identifier-sheet" role="dialog" aria-modal="true" aria-label={`Identifiers for ${active.title}`} onClick={(event) => event.stopPropagation()}>
            <header>
              <div><small>BOOK IDENTITY</small><h3>{active.title}</h3><p>{active.author}</p></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </header>

            <button type="button" className="identifier-find" onClick={findIdentifiers} disabled={busy}>
              {busy ? "Searching…" : "⌕ Find identifiers again"}
            </button>

            <label>
              <span>ISBN-10 or ISBN-13</span>
              <input value={isbn} onChange={(event) => setIsbn(event.target.value)} inputMode="text" placeholder="e.g. 9798375377339" />
              {isbn.trim() && !cleanIsbn(isbn) ? <small className="identifier-error">Enter a valid 10- or 13-character ISBN.</small> : null}
            </label>

            <label>
              <span>ASIN</span>
              <input value={asin} onChange={(event) => setAsin(event.target.value)} autoCapitalize="characters" placeholder="e.g. B0BRQWMGTF" />
              {asin.trim() && !cleanAsin(asin) ? <small className="identifier-error">ASINs are 10 letters/numbers.</small> : null}
            </label>

            <p className="identifier-help">These are edition-specific. Correct identifiers improve cover matching now and will later let community spines attach to the right paperback, hardcover, Kindle, or audiobook edition.</p>

            {status ? <p className="identifier-status" role="status">{status}</p> : null}

            <div className="identifier-actions">
              <button type="button" className="identifier-clear" onClick={() => { setIsbn(""); setAsin(""); }} disabled={busy}>Clear fields</button>
              <button type="button" className="identifier-save" onClick={saveManual} disabled={!canSave || busy}>Save & refresh</button>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
