"use client";

import {
  Book,
  coverSourceLabel,
  CoverResult,
} from "../../lib/books/client-library";

type BookDetailsModalProps = {
  selected: Book;
  selectedIsbn?: string;
  cover: CoverResult | null;
  coverOptions: CoverResult[];
  coverLoading: boolean;
  deepSearchLoading: boolean;
  deepSearchDone: boolean;
  onClose: () => void;
  onClearCover: () => void;
  onPreviewCover: (option: CoverResult) => void;
  onChooseCover: (option: CoverResult) => void;
  onRejectCurrentCover: (kind: "wrong" | "edition") => void;
  onSearchMoreCovers: () => void;
};

export function BookDetailsModal({
  selected,
  selectedIsbn,
  cover,
  coverOptions,
  coverLoading,
  deepSearchLoading,
  deepSearchDone,
  onClose,
  onClearCover,
  onPreviewCover,
  onChooseCover,
  onRejectCurrentCover,
  onSearchMoreCovers,
}: BookDetailsModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <article className="modal" role="dialog" aria-modal="true" aria-label={selected.title} onClick={(event) => event.stopPropagation()}>
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
              ✓ Correct cover
            </button>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                type="button"
                className="primary"
                disabled={!cover}
                onClick={() => onRejectCurrentCover("wrong")}
                style={{ opacity: cover ? 0.78 : 0.45 }}
              >
                ✕ Wrong cover
              </button>
              <button
                type="button"
                className="primary"
                disabled={!cover}
                onClick={() => onRejectCurrentCover("edition")}
                style={{ opacity: cover ? 0.78 : 0.45 }}
              >
                Different edition
              </button>
            </div>
          </div>
        </div>

        <div className="details">
          <p className="eyebrow">BOOK DETAILS</p>
          <h2>{selected.title}</h2>
          <p className="author">by {selected.author}</p>
          <dl>
            {selected.rating ? <><dt>Your rating</dt><dd>{"★".repeat(Math.min(selected.rating, 5))}</dd></> : null}
            {selected.year ? <><dt>Published</dt><dd>{selected.year}</dd></> : null}
            {selected.shelf ? <><dt>Goodreads shelf</dt><dd>{selected.shelf}</dd></> : null}
            {selected.importSource ? <><dt>Imported from</dt><dd>{selected.importSource}</dd></> : null}
            {selected.asin ? <><dt>Audible ASIN</dt><dd>{selected.asin}</dd></> : null}
            {selected.romanceioId ? <><dt>Romance.io ID</dt><dd>{selected.romanceioId}</dd></> : null}
            <dt>ISBN</dt><dd>{selectedIsbn || "N/A"}</dd>
            {selectedIsbn && selected.isbnSource ? <><dt>ISBN source</dt><dd>{selected.isbnSource}</dd></> : null}
            {selectedIsbn && selected.isbnConfidence ? <><dt>ISBN confidence</dt><dd>{selected.isbnConfidence}</dd></> : null}
            {cover?.source ? <><dt>Cover source</dt><dd>{cover.source}</dd></> : null}
            {selected.coverFeedback?.rejected?.length ? <><dt>Rejected covers</dt><dd>{selected.coverFeedback.rejected.length}</dd></> : null}
            {selected.coverFeedback?.wrongEdition?.length ? <><dt>Wrong editions</dt><dd>{selected.coverFeedback.wrongEdition.length}</dd></> : null}
          </dl>

          <section className="cover-picker" aria-label="Choose a cover">
            <div className="cover-picker-heading">
              <strong>Choose your cover</strong>
              <span>{coverOptions.length} {coverOptions.length === 1 ? "match" : "matches"}</span>
            </div>

            {coverOptions.length ? (
              <div className="cover-options">
                {coverOptions.map((option, index) => (
                  <button
                    key={`${option.url}-${index}`}
                    type="button"
                    className={`cover-option${cover?.url === option.url ? " selected-cover" : ""}`}
                    onClick={() => onPreviewCover(option)}
                    onDoubleClick={() => onChooseCover(option)}
                    aria-label={`Preview cover ${index + 1} from ${option.source}`}
                    title={`Preview ${option.source} cover. Double-click to mark correct.`}
                  >
                    <img src={option.url} alt="" loading="lazy" decoding="async" />
                    <span>{coverSourceLabel(option.source)}</span>
                  </button>
                ))}
              </div>
            ) : null}

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
                  : "Search more covers"}
            </button>

            <p className="cover-picker-note">
              {selectedIsbn
                ? `Identifier provenance is saved with this book${selected.isbnSource ? ` (${selected.isbnSource}, ${selected.isbnConfidence || "unknown"} confidence)` : ""}. Search more covers also checks additional editions, LibraryThing, and Romance.io.`
                : "No ISBN saved. Search more covers checks additional editions, LibraryThing, and Romance.io, and saves strong identifier matches for future searches."}
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
