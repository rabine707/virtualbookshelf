"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { GoodreadsImportPreview, GoodreadsShelfFilter } from "./hooks/useShelfLibrary";

type GoodreadsImportReviewProps = {
  preview: GoodreadsImportPreview | null;
  onConfirm: () => void;
  onCancel: () => void;
  onShelfFilterChange: (shelf: GoodreadsShelfFilter) => void;
};

export default function GoodreadsImportReview({ preview, onConfirm, onCancel, onShelfFilterChange }: GoodreadsImportReviewProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef(onCancel);
  const isOpen = Boolean(preview);

  useEffect(() => {
    cancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add("goodreads-review-open");
    const frame = window.requestAnimationFrame(() => confirmRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("goodreads-review-open");
    };
  }, [isOpen]);

  if (!preview) return null;

  const duplicateCount = preview.existingCount + preview.repeatedCount;
  const confirmLabel = preview.newCount
    ? `Import ${preview.newCount} new ${preview.newCount === 1 ? "book" : "books"}`
    : `Refresh ${preview.existingCount} existing ${preview.existingCount === 1 ? "book" : "books"}`;
  const sample = preview.books.slice(0, 3);

  return createPortal(
    <>
      <style>{`
        .goodreads-review-backdrop { position: fixed; inset: 0; z-index: 280; display: grid; place-items: center; padding: 22px; background: rgba(8,7,6,.78); backdrop-filter: blur(13px); }
        .goodreads-review-card { width: min(620px, 100%); max-height: min(86svh, 760px); overflow-y: auto; box-sizing: border-box; padding: 24px; border: 1px solid rgba(255,255,255,.13); border-radius: 24px; background: #171713; color: #f4eadb; box-shadow: 0 28px 80px rgba(0,0,0,.55); }
        .goodreads-review-header { display: grid; grid-template-columns: 1fr auto; gap: 14px; align-items: start; }
        .goodreads-review-kicker { display: block; margin-bottom: 6px; color: #b79b79; font-size: 10px; font-weight: 850; letter-spacing: .15em; text-transform: uppercase; }
        .goodreads-review-header h2 { margin: 0; font-size: clamp(28px, 7vw, 40px); line-height: 1; }
        .goodreads-review-header p { margin: 9px 0 0; color: rgba(244,234,219,.65); font-size: 13px; line-height: 1.45; }
        .goodreads-review-close { width: 44px; height: 44px; border: 0; border-radius: 50%; background: rgba(255,255,255,.065); color: inherit; font-size: 25px; cursor: pointer; }
        .goodreads-review-file { overflow: hidden; margin: 18px 0 12px; padding: 10px 12px; border-radius: 11px; background: rgba(255,255,255,.045); color: rgba(244,234,219,.68); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
        .goodreads-review-shelves { display: grid; gap: 8px; margin: 0 0 13px; padding: 0; border: 0; }
        .goodreads-review-shelves legend { margin-bottom: 7px; color: rgba(244,234,219,.58); font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
        .goodreads-review-shelf-options { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 7px; }
        .goodreads-review-shelf-choice { position: relative; min-width: 0; display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 8px; align-items: center; min-height: 43px; box-sizing: border-box; padding: 8px 10px; border: 1px solid rgba(255,255,255,.09); border-radius: 11px; background: rgba(255,255,255,.035); color: rgba(244,234,219,.66); cursor: pointer; }
        .goodreads-review-shelf-choice:has(input:checked) { border-color: rgba(205,166,116,.48); background: rgba(205,166,116,.14); color: #f2dfc5; }
        .goodreads-review-shelf-choice:has(input:focus-visible) { outline: 2px solid rgba(242,223,197,.75); outline-offset: 2px; }
        .goodreads-review-shelf-choice input { position: absolute; inset: 0; z-index: 1; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
        .goodreads-review-shelf-choice strong { overflow: hidden; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
        .goodreads-review-shelf-choice small { display: grid; place-items: center; min-width: 24px; height: 24px; padding: 0 4px; border-radius: 999px; background: rgba(255,255,255,.07); color: inherit; font-size: 10px; }
        .goodreads-review-selection-note { margin: -3px 0 12px; color: rgba(244,234,219,.52); font-size: 10px; line-height: 1.4; }
        .goodreads-review-counts { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 8px; }
        .goodreads-review-count { min-width: 0; padding: 12px 8px; border: 1px solid rgba(255,255,255,.09); border-radius: 13px; background: rgba(255,255,255,.035); text-align: center; }
        .goodreads-review-count strong { display: block; color: #edd6b6; font-size: 25px; line-height: 1; }
        .goodreads-review-count span { display: block; margin-top: 6px; color: rgba(244,234,219,.55); font-size: 9px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
        .goodreads-review-note { margin: 14px 0 0; padding: 12px 13px; border-left: 3px solid rgba(205,166,116,.55); border-radius: 0 10px 10px 0; background: rgba(205,166,116,.07); color: rgba(244,234,219,.72); font-size: 12px; line-height: 1.5; }
        .goodreads-review-sample { margin-top: 17px; }
        .goodreads-review-sample h3 { margin: 0 0 7px; color: rgba(244,234,219,.54); font-size: 10px; letter-spacing: .11em; text-transform: uppercase; }
        .goodreads-review-sample ul { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
        .goodreads-review-sample li { overflow: hidden; padding: 9px 11px; border-radius: 10px; background: rgba(255,255,255,.035); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
        .goodreads-review-sample li span { color: rgba(244,234,219,.52); }
        .goodreads-review-actions { display: grid; grid-template-columns: auto minmax(0,1fr); gap: 9px; margin-top: 19px; }
        .goodreads-review-actions button { min-height: 48px; padding: 10px 16px; border: 1px solid rgba(255,255,255,.12); border-radius: 13px; color: inherit; font: inherit; font-size: 12px; font-weight: 850; cursor: pointer; }
        .goodreads-review-cancel { background: rgba(255,255,255,.045); }
        .goodreads-review-confirm { background: #74513a; box-shadow: 0 8px 24px rgba(0,0,0,.22); }
        body.goodreads-review-open { overflow: hidden !important; }
        @media (max-width: 560px) {
          .goodreads-review-backdrop { place-items: end center; padding: 0; }
          .goodreads-review-card { width: 100%; max-height: 91svh; padding: 21px 17px max(18px, env(safe-area-inset-bottom)); border-radius: 24px 24px 0 0; border-bottom: 0; }
          .goodreads-review-counts { grid-template-columns: 1fr 1fr; }
          .goodreads-review-actions { grid-template-columns: 1fr; }
          .goodreads-review-confirm { grid-row: 1; }
        }
      `}</style>
      <div className="goodreads-review-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
        <section className="goodreads-review-card" role="dialog" aria-modal="true" aria-labelledby="goodreads-review-title">
          <header className="goodreads-review-header">
            <div>
              <span className="goodreads-review-kicker">Ready to review</span>
              <h2 id="goodreads-review-title">Check your Goodreads import</h2>
              <p>Your shelf will not change until you confirm.</p>
            </div>
            <button className="goodreads-review-close" type="button" onClick={onCancel} aria-label="Cancel Goodreads import">×</button>
          </header>

          <div className="goodreads-review-file" title={preview.fileName}>Selected file · {preview.fileName}</div>
          <fieldset className="goodreads-review-shelves">
            <legend>Which Goodreads shelf?</legend>
            <div className="goodreads-review-shelf-options">
              <label className="goodreads-review-shelf-choice">
                <input type="radio" name="goodreads-shelf" checked={preview.shelfFilter === "all"} onChange={() => onShelfFilterChange("all")} />
                <strong>All books</strong><small>{preview.totalBookCount}</small>
              </label>
              {preview.shelfOptions.map((option) => (
                <label className="goodreads-review-shelf-choice" key={option.value}>
                  <input type="radio" name="goodreads-shelf" checked={preview.shelfFilter === option.value} onChange={() => onShelfFilterChange(option.value)} />
                  <strong>{option.label}</strong><small>{option.count}</small>
                </label>
              ))}
            </div>
          </fieldset>
          {preview.excludedCount ? <p className="goodreads-review-selection-note">Reviewing {preview.books.length} of {preview.totalBookCount} books. The others will stay out of this import.</p> : null}
          <div className="goodreads-review-counts" aria-label="Goodreads import summary">
            <div className="goodreads-review-count" aria-label={`${preview.books.length} ${preview.books.length === 1 ? "book" : "books"} found`}><strong>{preview.books.length}</strong><span>Books found</span></div>
            <div className="goodreads-review-count" aria-label={`${preview.newCount} new ${preview.newCount === 1 ? "book" : "books"}`}><strong>{preview.newCount}</strong><span>New books</span></div>
            <div className="goodreads-review-count" aria-label={`${duplicateCount} ${duplicateCount === 1 ? "duplicate" : "duplicates"}`}><strong>{duplicateCount}</strong><span>Duplicates</span></div>
            <div className="goodreads-review-count" aria-label={`${preview.unreadableCount} unreadable ${preview.unreadableCount === 1 ? "row" : "rows"}`}><strong>{preview.unreadableCount}</strong><span>Couldn’t read</span></div>
          </div>

          <p className="goodreads-review-note">
            {preview.existingCount
              ? `${preview.existingCount} already on your shelf will be refreshed without creating another copy. `
              : ""}
            {preview.repeatedCount
              ? `${preview.repeatedCount} repeated ${preview.repeatedCount === 1 ? "row" : "rows"} in the file will be skipped. `
              : ""}
            Your saved covers, spines, notes, and reactions will be kept.
          </p>

          <div className="goodreads-review-sample">
            <h3>A quick look</h3>
            <ul>
              {sample.map((book) => <li key={book.id}><strong>{book.title}</strong> <span>by {book.author}</span></li>)}
            </ul>
          </div>

          <div className="goodreads-review-actions">
            <button className="goodreads-review-cancel" type="button" onClick={onCancel}>Cancel</button>
            <button ref={confirmRef} className="goodreads-review-confirm" type="button" onClick={onConfirm}>{confirmLabel}</button>
          </div>
        </section>
      </div>
    </>,
    document.body,
  );
}
