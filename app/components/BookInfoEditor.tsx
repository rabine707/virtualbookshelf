"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  BookMetadataConfidence,
  BookMetadataUpdateInput,
  cleanBookAsin,
  cleanBookIsbn,
  normalizeBookIdentityText,
  SaveBookMetadataResult,
} from "../../lib/books/book-metadata";
import { Book } from "../../lib/books/client-library";

type SearchResult = {
  title?: string;
  author?: string;
  isbn?: string;
  source?: string;
};

type Proposal = {
  title: string;
  author: string;
  isbn: string;
  asin: string;
  confidence: BookMetadataConfidence;
  source: string;
};

type BookInfoEditorProps = {
  book: Book;
  selectedIsbn?: string;
  onSave: (input: BookMetadataUpdateInput) => SaveBookMetadataResult;
};

const inlineStyles = `
.book-info-card{margin-top:18px;padding:14px;border:1px solid rgba(197,154,109,.18);border-radius:18px;background:rgba(255,255,255,.025)}
.book-info-card-header{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:10px}.book-info-card-header>div{display:grid;gap:2px}.book-info-card-header small{font:800 9px/1 Arial,sans-serif;letter-spacing:.14em;opacity:.55}.book-info-card-header strong{font-size:14px}.book-info-card-header button{min-height:34px;padding:0 13px;border-radius:999px;border:1px solid rgba(197,154,109,.24);background:rgba(255,255,255,.045);color:inherit;font:inherit;font-size:12px;font-weight:800}
.book-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.book-info-row{min-width:0;display:grid;gap:3px;padding:10px 11px;border-radius:12px;background:rgba(255,255,255,.025)}.book-info-row span{font:800 9px/1 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;opacity:.48}.book-info-row b{min-width:0;overflow-wrap:anywhere;font-size:13px;line-height:1.25}.book-info-row em{font-style:normal;font-weight:500;opacity:.42}
.identifier-edit-button{width:100%;margin-top:10px;padding:11px 12px;border-radius:14px;border:1px solid rgba(197,154,109,.18);background:rgba(255,255,255,.025);color:inherit;display:flex;align-items:center;gap:10px;text-align:left}.identifier-edit-button>span:first-child{font-size:20px}.identifier-edit-button span:last-child{display:grid;gap:2px}.identifier-edit-button small{opacity:.58;font-size:11px}
.identifier-proposal-grid{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px 12px;margin:14px 0;font-size:13px}.identifier-proposal-grid span{opacity:.55}.identifier-proposal-grid b{overflow-wrap:anywhere}.identifier-fields{margin-top:12px}
@media(max-width:560px){.book-info-grid{grid-template-columns:1fr}.identifier-sheet{padding:18px}}
`;

export function BookInfoEditor({ book, selectedIsbn, onSave }: BookInfoEditorProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [asin, setAsin] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const canSave = useMemo(() => (
    Boolean(title.trim())
      && (!isbn.trim() || Boolean(cleanBookIsbn(isbn)))
      && (!asin.trim() || Boolean(cleanBookAsin(asin)))
  ), [asin, isbn, title]);

  function showEditor() {
    setTitle(book.title);
    setAuthor(book.author);
    setIsbn(book.isbn || selectedIsbn || "");
    setAsin(book.asin || "");
    setProposal(null);
    setStatus("");
    setOpen(true);
  }

  function persist(
    nextTitle: string,
    nextAuthor: string,
    nextIsbn: string,
    nextAsin: string,
    source: string,
    confidence: BookMetadataConfidence,
  ) {
    const result = onSave({
      title: nextTitle,
      author: nextAuthor,
      isbn: nextIsbn,
      asin: nextAsin,
      source,
      confidence,
    });

    if (!result.ok) {
      setStatus(result.error);
      return;
    }

    setTitle(result.book.title);
    setAuthor(result.book.author);
    setIsbn(result.book.isbn || "");
    setAsin(result.book.asin || "");
    setProposal(null);
    setOpen(false);
  }

  async function findBookDetails() {
    if (busy) return;
    const queryTitle = title.replace(/\s+/g, " ").trim() || book.title;
    const queryAuthor = author.replace(/\s+/g, " ").trim() || book.author;
    if (!queryTitle) return;

    setBusy(true);
    setProposal(null);
    setStatus("Searching for the most likely book match…");

    try {
      const searchParams = new URLSearchParams({ title: queryTitle, author: queryAuthor });
      const asinParams = new URLSearchParams({ title: queryTitle, author: queryAuthor });
      const [bookResponse, asinResponse] = await Promise.all([
        fetch(`/api/book-search?${searchParams.toString()}`, { cache: "no-store" }),
        fetch(`/api/asin?${asinParams.toString()}`, { cache: "no-store" }),
      ]);
      const bookPayload = bookResponse.ok
        ? await bookResponse.json() as { results?: SearchResult[] }
        : {};
      const asinPayload = asinResponse.ok
        ? await asinResponse.json() as { asin?: string | null }
        : {};
      const best = Array.isArray(bookPayload.results) ? bookPayload.results[0] : undefined;
      const foundTitle = best?.title?.trim() || queryTitle;
      const foundAuthor = best?.author?.trim() || queryAuthor;
      const foundIsbn = cleanBookIsbn(best?.isbn || isbn || "");
      const foundAsin = cleanBookAsin(asinPayload.asin || asin || "");
      const foundSomething = Boolean(best || foundIsbn || foundAsin);

      if (!foundSomething) {
        setStatus("No confident book match was found. Nothing was changed.");
        return;
      }

      const confidence: BookMetadataConfidence = best && (foundIsbn || foundAsin) ? "high" : "medium";
      const changedIdentity = normalizeBookIdentityText(foundTitle) !== normalizeBookIdentityText(book.title)
        || normalizeBookIdentityText(foundAuthor) !== normalizeBookIdentityText(book.author);

      setProposal({
        title: foundTitle,
        author: foundAuthor,
        isbn: foundIsbn,
        asin: foundAsin,
        confidence,
        source: best?.source ? `${best.source} book match` : "Autofill search",
      });
      setStatus(changedIdentity
        ? "I found a cleaner title/author match. Review it before applying."
        : "Review the matching book details below before applying.");
    } catch {
      setStatus("Autofill could not finish. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="book-info-card" aria-label="Book information">
        <style>{inlineStyles}</style>
        <header className="book-info-card-header">
          <div><small>BOOK INFO</small><strong>Saved details</strong></div>
          <button type="button" onClick={showEditor}>Edit</button>
        </header>
        <div className="book-info-grid">
          <div className="book-info-row"><span>Title</span><b>{book.title || <em>Not set</em>}</b></div>
          <div className="book-info-row"><span>Author</span><b>{book.author || <em>Not set</em>}</b></div>
          <div className="book-info-row"><span>ISBN</span><b>{book.isbn || selectedIsbn || <em>Not set</em>}</b></div>
          <div className="book-info-row"><span>ASIN</span><b>{book.asin || <em>Not set</em>}</b></div>
        </div>
        <button type="button" className="identifier-edit-button" onClick={showEditor}>
          <span>⌕</span>
          <span><strong>Edit / autofill book info</strong><small>Correct the title, author, ISBN, or ASIN</small></span>
        </button>
      </section>

      {open && createPortal(
        <div className="identifier-backdrop" onClick={() => { if (!busy) setOpen(false); }}>
          <section
            className="identifier-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Edit book details"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div><small>BOOK INFO</small><h3>Edit book details</h3><p>{book.title}</p></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </header>

            <button type="button" className="identifier-find" onClick={findBookDetails} disabled={busy}>
              {busy ? "Searching…" : "✦ Find matching book details"}
            </button>

            {proposal && (
              <div className="identifier-proposal">
                <div><small>{proposal.confidence.toUpperCase()} CONFIDENCE</small><strong>Likely book match</strong></div>
                <div className="identifier-proposal-grid">
                  <span>Title</span><b>{proposal.title}</b>
                  <span>Author</span><b>{proposal.author}</b>
                  <span>ISBN</span><b>{proposal.isbn || "Not found"}</b>
                  <span>ASIN</span><b>{proposal.asin || "Not found"}</b>
                </div>
                <div className="identifier-proposal-actions">
                  <button type="button" onClick={() => setProposal(null)}>Not this one</button>
                  <button
                    type="button"
                    onClick={() => persist(
                      proposal.title,
                      proposal.author,
                      proposal.isbn,
                      proposal.asin,
                      proposal.source,
                      proposal.confidence,
                    )}
                  >
                    Use this match
                  </button>
                </div>
              </div>
            )}

            {status && <p className="identifier-status" role="status">{status}</p>}

            <div className="identifier-fields">
              <label>
                <span>Title</span>
                <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Book title" />
              </label>
              <label>
                <span>Author</span>
                <input value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="Author" />
              </label>
              <label>
                <span>ISBN-10 or ISBN-13</span>
                <input value={isbn} onChange={(event) => setIsbn(event.target.value)} placeholder="Leave blank if unknown" />
                {isbn.trim() && !cleanBookIsbn(isbn) && <small className="identifier-error">Enter a valid ISBN.</small>}
              </label>
              <label>
                <span>ASIN</span>
                <input value={asin} onChange={(event) => setAsin(event.target.value)} autoCapitalize="characters" placeholder="Leave blank if unknown" />
                {asin.trim() && !cleanBookAsin(asin) && <small className="identifier-error">ASINs are 10 letters/numbers.</small>}
              </label>
            </div>

            <p className="identifier-help">
              Empty ISBN and ASIN fields are okay. Title and author corrections update what readers see throughout the shelf.
            </p>

            <div className="identifier-actions">
              <button type="button" className="identifier-clear" onClick={() => { setIsbn(""); setAsin(""); }}>
                Clear IDs
              </button>
              <button
                type="button"
                className="identifier-save"
                disabled={!canSave || busy}
                onClick={() => persist(title, author, isbn, asin, "Manual correction", "high")}
              >
                Save changes
              </button>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
