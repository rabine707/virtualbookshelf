"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookMetadataUpdateInput,
  SaveBookMetadataResult,
} from "../../lib/books/book-metadata";
import {
  Book,
  coverSourceLabel,
  CoverResult,
  WebCoverResult,
} from "../../lib/books/client-library";
import { coverCropImageStyle, stripCoverCrop } from "../../lib/books/cover-crop";
import { BookInfoEditor } from "./BookInfoEditor";
import { CoverCropSheet } from "./CoverCropSheet";
import { SpineTools } from "./SpineTools";
import { SpineRequestButton } from "./SpineRequestButton";

type BookDetailsModalProps = {
  selected: Book;
  selectedIsbn?: string;
  cover: CoverResult | null;
  coverOptions: CoverResult[];
  savedCovers: CoverResult[];
  webCoverResults: WebCoverResult[];
  webCoverLoading: boolean;
  webCoverMessage: string;
  coverLoading: boolean;
  deepSearchLoading: boolean;
  deepSearchDone: boolean;
  canResetCoverChoices: boolean;
  onClose: () => void;
  onClearCover: () => void;
  onUseSavedCover: (option: CoverResult) => void;
  onRemoveSavedCover: (option: CoverResult) => void;
  onSearchWebCovers: (mode: "covers" | "alternate" | "custom") => void;
  onChooseWebCover: (result: WebCoverResult) => void;
  onChooseCover: (option: CoverResult) => void;
  onRejectCurrentCover: (kind: "wrong" | "edition") => void;
  onSearchMoreCovers: () => void;
  onResetCoverChoices: () => void;
  onSaveBookMetadata: (input: BookMetadataUpdateInput) => SaveBookMetadataResult;
  onChangeReadStatus: (shelf: string) => void;
};

type CropTarget =
  | { kind: "cover"; option: CoverResult }
  | { kind: "web"; result: WebCoverResult };

export function BookDetailsModal({
  selected,
  selectedIsbn,
  cover,
  coverOptions,
  savedCovers,
  webCoverResults,
  webCoverLoading,
  webCoverMessage,
  coverLoading,
  deepSearchLoading,
  deepSearchDone,
  canResetCoverChoices,
  onClose,
  onClearCover,
  onUseSavedCover,
  onRemoveSavedCover,
  onSearchWebCovers,
  onChooseWebCover,
  onChooseCover,
  onRejectCurrentCover,
  onSearchMoreCovers,
  onResetCoverChoices,
  onSaveBookMetadata,
  onChangeReadStatus,
}: BookDetailsModalProps) {
  void onUseSavedCover;
  void onRejectCurrentCover;
  const modalRef = useRef<HTMLElement>(null);
  const deeperSearchStartedFor = useRef<string | null>(null);
  const webFallbackStartedFor = useRef<string | null>(null);
  const [showCoverBrowser, setShowCoverBrowser] = useState(false);
  const [cropTarget, setCropTarget] = useState<CropTarget | null>(null);

  useEffect(() => {
    setShowCoverBrowser(false);
    setCropTarget(null);
    deeperSearchStartedFor.current = null;
    webFallbackStartedFor.current = null;
  }, [selected.id]);

  useEffect(() => {
    const scrollY = window.scrollY;
    document.documentElement.classList.add("book-modal-open");
    document.body.classList.add("book-modal-open");
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    return () => {
      document.documentElement.classList.remove("book-modal-open");
      document.body.classList.remove("book-modal-open");
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  useEffect(() => {
    if (coverOptions.length >= 3) return;
    if (coverLoading || deepSearchLoading || deepSearchDone) return;
    if (deeperSearchStartedFor.current === selected.id) return;
    deeperSearchStartedFor.current = selected.id;
    onSearchMoreCovers();
  }, [coverLoading, coverOptions.length, deepSearchDone, deepSearchLoading, onSearchMoreCovers, selected.id]);

  useEffect(() => {
    if (!deepSearchDone || coverOptions.length >= 3) return;
    if (webCoverLoading || webCoverResults.length) return;
    if (webFallbackStartedFor.current === selected.id) return;
    webFallbackStartedFor.current = selected.id;
    onSearchWebCovers("covers");
  }, [coverOptions.length, deepSearchDone, onSearchWebCovers, selected.id, webCoverLoading, webCoverResults.length]);

  const summaryItems = [
    selected.rating ? ["★", "★".repeat(Math.min(selected.rating, 5))] : null,
    selected.year ? ["◷", selected.year] : null,
  ].filter((item): item is [string, string] => Boolean(item));

  const hasCoverOptions = coverOptions.length > 0;
  const totalCoverChoices = coverOptions.length + webCoverResults.length;
  const standardStatuses = new Set(["to-read", "currently-reading", "read"]);
  const currentShelf = selected.shelf || "to-read";

  const openCoverBrowser = () => {
    setShowCoverBrowser(true);
    requestAnimationFrame(() => {
      modalRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  function confirmCrop(url: string) {
    if (!cropTarget) return;
    if (cropTarget.kind === "cover") {
      onChooseCover({ ...cropTarget.option, url });
    } else {
      onChooseWebCover({ ...cropTarget.result, url });
    }
    setCropTarget(null);
  }

  const coverBrowser = (
    <section className="cover-picker" aria-label="Choose a cover" style={{ marginTop: 0 }}>
      <div className="cover-picker-heading" style={{ alignItems: "center" }}>
        <div>
          <strong>{totalCoverChoices ? "Choose a cover" : "Finding cover options"}</strong>
          <div style={{ fontSize: ".78em", opacity: .66, marginTop: 3 }}>Swap editions, manage your saved covers, or search for more.</div>
        </div>
        {totalCoverChoices ? <span>{totalCoverChoices} {totalCoverChoices === 1 ? "match" : "matches"}</span> : null}
      </div>

      {savedCovers.length ? (
        <section className="saved-cover-choices" aria-label="Your saved covers">
          <div className="saved-cover-heading">
            <strong>Your saved covers</strong>
            <span>tap to use · × removes from your book</span>
          </div>
          <div className="saved-cover-grid">
            {savedCovers.map((saved) => {
              const active = selected.preferredCover?.url === saved.url;
              return (
                <div className="saved-cover-item" key={saved.url}>
                  <button
                    type="button"
                    className={`saved-cover-option${active ? " active" : ""}`}
                    title={active ? "Currently on your shelf" : "Use this saved cover on the shelf"}
                    aria-label={active ? "Currently on your shelf" : `Use saved ${saved.source} cover`}
                    onClick={() => setCropTarget({ kind: "cover", option: saved })}
                  >
                    <img src={stripCoverCrop(saved.url)} style={coverCropImageStyle(saved.url)} alt="" loading="lazy" decoding="async" />
                    <span>{saved.source || "Saved"}</span>
                  </button>
                  <button
                    type="button"
                    className="saved-cover-remove"
                    title="Remove this cover from your saved covers"
                    aria-label={`Remove ${saved.source || "saved"} cover from your saved covers`}
                    onClick={() => onRemoveSavedCover(saved)}
                  >×</button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {hasCoverOptions ? (
        <section aria-label="Community and database covers" style={{ marginTop: 14 }}>
          <div className="saved-cover-heading">
            <strong>Community & database covers</strong>
            <span>tap to switch · shared covers can’t be deleted</span>
          </div>
          <div className="cover-options">
            {coverOptions.map((option, index) => (
              <button
                key={`${option.url}-${index}`}
                type="button"
                className={`cover-option${cover?.url === option.url ? " selected-cover" : ""}`}
                onClick={() => setCropTarget({ kind: "cover", option })}
                aria-label={`Crop or use this ${coverSourceLabel(option.source)} cover`}
                title={`Use this ${coverSourceLabel(option.source)} cover`}
              >
                <img src={stripCoverCrop(option.url)} style={coverCropImageStyle(option.url)} alt="" loading="lazy" decoding="async" />
                <span>{coverSourceLabel(option.source)}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {webCoverResults.length ? (
        <section style={{ marginTop: 12 }} aria-label="Web cover results">
          <div className="web-cover-heading">
            <strong>Web results</strong>
            <span>tap one to save it to your book</span>
          </div>
          <div className="web-cover-results">
            {webCoverResults.map((result, index) => (
              <button
                key={`${result.url}-${index}`}
                type="button"
                className="web-cover-result"
                title={result.title || `Web cover result ${index + 1}`}
                aria-label={`Crop or use web image ${index + 1}`}
                onClick={() => setCropTarget({ kind: "web", result })}
              >
                <img src={result.thumbnailUrl || result.url} alt="" loading="lazy" decoding="async" />
                <span>{result.publisher || "Web"}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <button
        type="button"
        className="primary"
        style={{ marginTop: 10 }}
        onClick={onSearchMoreCovers}
        disabled={deepSearchLoading || deepSearchDone}
      >
        {deepSearchLoading ? "Searching more editions…" : deepSearchDone ? "More editions searched" : "Search more editions"}
      </button>

      <p className="cover-picker-note reader-technical-note">
        Community and book-database covers stay available for everyone. Removing a saved cover only removes it from your copy of this book.
      </p>

      <button
        type="button"
        className="primary cover-reset-button"
        onClick={onResetCoverChoices}
        disabled={!canResetCoverChoices}
        title="Clear this book's saved cover choice and rejected-cover history"
        style={{ marginTop: 8, width: "min(100%, 220px)", opacity: canResetCoverChoices ? 0.76 : 0.42 }}
      >↻ Reset cover choices</button>

      <section className="web-cover-panel" aria-label="Browse web covers">
        <div className="web-cover-heading">
          <strong>Browse web covers</strong>
          <span>broaden the search manually</span>
        </div>
        <div className="web-cover-modes">
          <button type="button" disabled={webCoverLoading} onClick={() => onSearchWebCovers("covers")}>More web covers</button>
          <button type="button" disabled={webCoverLoading} onClick={() => onSearchWebCovers("alternate")}>Alternate editions</button>
          <button type="button" disabled={webCoverLoading} onClick={() => onSearchWebCovers("custom")}>Custom & Etsy</button>
        </div>
        <p className="web-cover-status" role="status">{webCoverMessage}</p>
      </section>
    </section>
  );

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <article
        ref={modalRef}
        className="modal reader-modal book-hub-view book-hub-editing"
        data-book-hub="1"
        role="dialog"
        aria-modal="true"
        aria-label={selected.title}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="close" onClick={showCoverBrowser ? () => setShowCoverBrowser(false) : onClose} aria-label={showCoverBrowser ? "Back to book" : "Close"}>
          {showCoverBrowser ? "‹" : "×"}
        </button>

        {showCoverBrowser ? (
          <div className="details" style={{ gridColumn: "1 / -1", width: "100%", paddingTop: 8 }}>
            {coverBrowser}
          </div>
        ) : (
          <>
            <div className="cover-column">
              <div className="cover" style={{ overflow: "hidden" }}>
                <div className="cover-fallback" style={{ background: selected.color }}>
                  <strong>{coverLoading ? "Finding covers…" : selected.title}</strong>
                  <span>{selected.author}</span>
                </div>
                {cover?.url ? (
                  <img
                    className="cover-image"
                    src={stripCoverCrop(cover.url)}
                    style={coverCropImageStyle(cover.url)}
                    alt={`Cover of ${selected.title}`}
                    loading="eager"
                    decoding="async"
                    onError={onClearCover}
                  />
                ) : null}
              </div>

              <div style={{ display: "grid", gap: 8, marginTop: 12 }} aria-label="Cover feedback">
                <button
                  type="button"
                  className="primary"
                  disabled={!cover}
                  onClick={() => cover && setCropTarget({ kind: "cover", option: cover })}
                  title="Save this as the correct cover"
                >✓ Use this cover</button>
                <button type="button" className="primary" onClick={openCoverBrowser}>
                  Find more covers
                </button>

                <SpineTools
                  title={selected.title}
                  author={selected.author}
                  coverUrl={cover?.url ? stripCoverCrop(cover.url) : undefined}
                  isbn={selectedIsbn}
                  asin={selected.asin}
                />
                <SpineRequestButton
                  title={selected.title}
                  author={selected.author}
                  coverUrl={cover?.url ? stripCoverCrop(cover.url) : undefined}
                  isbn={selectedIsbn}
                  asin={selected.asin}
                />
              </div>
            </div>

            <div className="details">
              <p className="eyebrow">YOUR BOOK</p>
              <h2>{selected.title}</h2>
              <p className="author">by {selected.author}</p>

              <div className="reader-book-summary">
                {summaryItems.map(([icon, value]) => (
                  <span className="reader-book-chip" key={`${icon}-${value}`}>{icon} {value}</span>
                ))}
              </div>

              <label
                style={{
                  display: "grid",
                  gap: 6,
                  marginTop: 14,
                  maxWidth: 330,
                  fontFamily: "Arial, sans-serif",
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(73,49,36,.68)" }}>
                  Reading status
                </span>
                <select
                  value={currentShelf}
                  onChange={(event) => onChangeReadStatus(event.target.value)}
                  aria-label="Reading status"
                  style={{
                    width: "100%",
                    minHeight: 46,
                    padding: "0 14px",
                    border: "1px solid rgba(95,65,45,.22)",
                    borderRadius: 14,
                    background: "rgba(255,255,255,.56)",
                    color: "#2f2017",
                    font: "700 16px/1.2 Arial, sans-serif",
                  }}
                >
                  {!standardStatuses.has(currentShelf) ? <option value={currentShelf}>{currentShelf}</option> : null}
                  <option value="to-read">Want to read</option>
                  <option value="currently-reading">Currently reading</option>
                  <option value="read">Read</option>
                </select>
              </label>

              <dl>
                {selected.year ? <><dt>Published</dt><dd>{selected.year}</dd></> : null}
                <dt>ISBN</dt><dd>{selectedIsbn || "Not available"}</dd>
                {selected.importSource ? <><dt>Imported from</dt><dd>{selected.importSource}</dd></> : null}
              </dl>

              <BookInfoEditor book={selected} selectedIsbn={selectedIsbn} onSave={onSaveBookMetadata} />
            </div>
          </>
        )}
      </article>

      {cropTarget ? (
        <CoverCropSheet
          imageUrl={cropTarget.kind === "cover" ? cropTarget.option.url : cropTarget.result.url}
          title={selected.title}
          onCancel={() => setCropTarget(null)}
          onConfirm={confirmCrop}
        />
      ) : null}
    </div>
  );
}
