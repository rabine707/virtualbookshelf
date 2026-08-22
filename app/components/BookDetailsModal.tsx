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
import { BookInfoEditor } from "./BookInfoEditor";
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
};

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
}: BookDetailsModalProps) {
  const modalRef = useRef<HTMLElement>(null);
  const zeroSearchStartedFor = useRef<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    setShowAdvanced(false);
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
    zeroSearchStartedFor.current = null;
  }, [selected.id, selected.coverFeedback, selected.preferredCover]);

  useEffect(() => {
    if (coverOptions.length) {
      zeroSearchStartedFor.current = null;
      return;
    }
    if (coverLoading || deepSearchLoading || deepSearchDone) return;
    if (zeroSearchStartedFor.current === selected.id) return;
    zeroSearchStartedFor.current = selected.id;
    onSearchMoreCovers();
  }, [coverLoading, coverOptions.length, deepSearchDone, deepSearchLoading, onSearchMoreCovers, selected.id]);

  const summaryItems = [
    selected.rating ? ["★", "★".repeat(Math.min(selected.rating, 5))] : null,
    selected.year ? ["◷", selected.year] : null,
    selected.shelf ? ["▤", selected.shelf] : null,
  ].filter((item): item is [string, string] => Boolean(item));

  const scrollToSpineTools = () => {
    const modal = modalRef.current;
    const target = modal?.querySelector<HTMLElement>(".generate-spine-button")
      || modal?.querySelector<HTMLElement>('[aria-label="Cover feedback"]');
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const scrollToCoverPicker = () => {
    modalRef.current?.querySelector<HTMLElement>(".cover-picker")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const hasCoverOptions = coverOptions.length > 0;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <article
        ref={modalRef}
        className={`modal reader-modal book-hub-view book-hub-editing${showAdvanced ? " reader-show-advanced" : ""}`}
        data-book-hub="1"
        role="dialog"
        aria-modal="true"
        aria-label={selected.title}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="close" onClick={onClose} aria-label="Close">×</button>
        <div className="cover-column">
          <div className="cover">
            <div className="cover-fallback" style={{ background: selected.color }}>
              <strong>{coverLoading ? "Finding covers…" : selected.title}</strong>
              <span>{selected.author}</span>
            </div>
            {cover?.url ? (
              <img
                className="cover-image"
                src={cover.url}
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
              onClick={() => cover && onChooseCover(cover)}
              title="Save this as the correct cover"
            >
              ✓ Use this cover
            </button>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                type="button"
                className="primary"
                disabled={!cover}
                onClick={() => onRejectCurrentCover("wrong")}
                style={{ opacity: cover ? 0.78 : 0.45 }}
              >
                Not this one
              </button>
              <button
                type="button"
                className="primary"
                disabled={!cover}
                onClick={() => onRejectCurrentCover("edition")}
                style={{ opacity: cover ? 0.78 : 0.45 }}
              >
                Another edition
              </button>
            </div>
            <SpineTools
              title={selected.title}
              author={selected.author}
              coverUrl={cover?.url}
              isbn={selectedIsbn}
              asin={selected.asin}
            />
            <SpineRequestButton
              title={selected.title}
              author={selected.author}
              coverUrl={cover?.url}
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

          <div className="reader-book-actions">
            <button
              type="button"
              className="reader-book-action reader-book-action-primary"
              onClick={scrollToSpineTools}
            >
              ✨ Customize spine
            </button>
            <button
              type="button"
              className="reader-book-action"
              onClick={scrollToCoverPicker}
            >
              🖼 Change cover
            </button>
            <button
              type="button"
              className="reader-book-action reader-book-action-more"
              aria-expanded={showAdvanced}
              onClick={() => setShowAdvanced((current) => !current)}
            >
              {showAdvanced ? "Hide book info" : "More book info"}
            </button>
          </div>

          <dl>
            {selected.rating ? <><dt>Your rating</dt><dd>{"★".repeat(Math.min(selected.rating, 5))}</dd></> : null}
            {selected.year ? <><dt>Published</dt><dd>{selected.year}</dd></> : null}
            {selected.shelf ? <><dt>Goodreads shelf</dt><dd>{selected.shelf}</dd></> : null}
            {selected.importSource ? <><dt>Imported from</dt><dd>{selected.importSource}</dd></> : null}
            {selected.asin ? <><dt className="reader-advanced-row">Audible ASIN</dt><dd className="reader-advanced-row">{selected.asin}</dd></> : null}
            {selected.romanceioId ? <><dt className="reader-advanced-row">Romance.io ID</dt><dd className="reader-advanced-row">{selected.romanceioId}</dd></> : null}
            <dt className="reader-advanced-row">ISBN</dt><dd className="reader-advanced-row">{selectedIsbn || "N/A"}</dd>
            {selectedIsbn && selected.isbnSource ? <><dt className="reader-advanced-row">ISBN source</dt><dd className="reader-advanced-row">{selected.isbnSource}</dd></> : null}
            {selectedIsbn && selected.isbnConfidence ? <><dt className="reader-advanced-row">ISBN confidence</dt><dd className="reader-advanced-row">{selected.isbnConfidence}</dd></> : null}
            {cover?.source ? <><dt className="reader-advanced-row">Cover source</dt><dd className="reader-advanced-row">{cover.source}</dd></> : null}
            {selected.coverFeedback?.rejected?.length ? <><dt className="reader-advanced-row">Rejected covers</dt><dd className="reader-advanced-row">{selected.coverFeedback.rejected.length}</dd></> : null}
            {selected.coverFeedback?.wrongEdition?.length ? <><dt className="reader-advanced-row">Wrong editions</dt><dd className="reader-advanced-row">{selected.coverFeedback.wrongEdition.length}</dd></> : null}
          </dl>

          <BookInfoEditor
            book={selected}
            selectedIsbn={selectedIsbn}
            onSave={onSaveBookMetadata}
          />

          <section className="cover-picker" aria-label="Choose a cover">
            <div className="cover-picker-heading">
              <strong>{hasCoverOptions ? "Pick a cover" : "No database covers found"}</strong>
              {hasCoverOptions ? <span>{coverOptions.length} {coverOptions.length === 1 ? "match" : "matches"}</span> : null}
            </div>

            {savedCovers.length ? (
              <section className="saved-cover-choices" aria-label="Saved covers">
                <div className="saved-cover-heading">
                  <strong>Saved covers</strong>
                  <span>tap a cover to use it</span>
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
                          onClick={() => { if (!active) onUseSavedCover(saved); }}
                        >
                          <img src={saved.url} alt="" loading="lazy" decoding="async" />
                          <span>{saved.source || "Saved"}</span>
                        </button>
                        <button
                          type="button"
                          className="saved-cover-remove"
                          title="Remove this saved cover"
                          aria-label={`Remove ${saved.source || "saved"} cover`}
                          onClick={() => onRemoveSavedCover(saved)}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {hasCoverOptions ? (
              <div className="cover-options">
                {coverOptions.map((option, index) => (
                  <button
                    key={`${option.url}-${index}`}
                    type="button"
                    className={`cover-option${cover?.url === option.url ? " selected-cover" : ""}`}
                    onClick={() => { onChooseCover(option); onClose(); }}
                    aria-label={`Use this ${coverSourceLabel(option.source)} cover on the shelf`}
                    title={`Use this ${coverSourceLabel(option.source)} cover on the shelf`}
                  >
                    <img src={option.url} alt="" loading="lazy" decoding="async" />
                    <span>{coverSourceLabel(option.source)}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {hasCoverOptions ? (
              <button
                type="button"
                className="primary"
                style={{ marginTop: 10 }}
                onClick={onSearchMoreCovers}
                disabled={deepSearchLoading || deepSearchDone}
              >
                {deepSearchLoading
                  ? "Searching more editions…"
                  : deepSearchDone
                    ? "More editions searched"
                    : "Find more covers"}
              </button>
            ) : null}

            <p className="cover-picker-note reader-technical-note">
              {selectedIsbn
                ? `Identifier provenance is saved with this book${selected.isbnSource ? ` (${selected.isbnSource}, ${selected.isbnConfidence || "unknown"} confidence)` : ""}. Search more covers also checks additional editions, LibraryThing, and Romance.io.`
                : "No ISBN saved. Search more covers checks additional editions, LibraryThing, and Romance.io, and saves strong identifier matches for future searches."}
            </p>

            <button
              type="button"
              className="primary cover-reset-button"
              onClick={onResetCoverChoices}
              disabled={!canResetCoverChoices}
              title="Clear this book's saved cover choice and rejected-cover history"
              style={{
                marginTop: 8,
                width: "min(100%, 220px)",
                opacity: canResetCoverChoices ? 0.76 : 0.42,
              }}
            >
              ↻ Reset cover choices
            </button>

            <section className="web-cover-panel" aria-label="Browse web covers">
              <div className="web-cover-heading">
                <strong>Browse web covers</strong>
                <span>5 images at a time</span>
              </div>
              <div className="web-cover-modes">
                <button type="button" disabled={webCoverLoading} onClick={() => onSearchWebCovers("covers")}>Web covers</button>
                <button type="button" disabled={webCoverLoading} onClick={() => onSearchWebCovers("alternate")}>Alternate editions</button>
                <button type="button" disabled={webCoverLoading} onClick={() => onSearchWebCovers("custom")}>Custom & Etsy</button>
              </div>
              <div className="web-cover-results">
                {webCoverResults.map((result, index) => (
                  <button
                    key={`${result.url}-${index}`}
                    type="button"
                    className="web-cover-result"
                    title={result.title || `Web cover result ${index + 1}`}
                    aria-label={`Use web image ${index + 1} on the shelf`}
                    onClick={() => onChooseWebCover(result)}
                  >
                    <img src={result.thumbnailUrl || result.url} alt="" loading="lazy" decoding="async" />
                    <span>{result.publisher || "Web"}</span>
                  </button>
                ))}
              </div>
              <p className="web-cover-status" role="status">{webCoverMessage}</p>
            </section>
          </section>
        </div>
      </article>
    </div>
  );
}
