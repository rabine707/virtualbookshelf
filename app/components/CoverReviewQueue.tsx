"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Book, CoverResult, uniqueCovers } from "../../lib/books/client-library";
import { coverCropImageStyle, stripCoverCrop } from "../../lib/books/cover-crop";

type CoverReviewQueueProps = {
  book: Book;
  position: number;
  total: number;
  coverOptions: CoverResult[];
  loading: boolean;
  deepSearchLoading: boolean;
  deepSearchDone: boolean;
  onSearchMore: () => void;
  onFinish: (approved: CoverResult[], primary?: CoverResult, status?: "skipped" | "no-match") => void;
  onClose: () => void;
};

export function CoverReviewQueue({
  book,
  position,
  total,
  coverOptions,
  loading,
  deepSearchLoading,
  deepSearchDone,
  onSearchMore,
  onFinish,
  onClose,
}: CoverReviewQueueProps) {
  const [approvedUrls, setApprovedUrls] = useState<Set<string>>(new Set());
  const [primaryUrl, setPrimaryUrl] = useState<string>();
  const deepStartedFor = useRef<string | undefined>(undefined);
  const candidates = useMemo(() => uniqueCovers(coverOptions), [coverOptions]);

  useEffect(() => {
    setApprovedUrls(new Set());
    setPrimaryUrl(undefined);
    deepStartedFor.current = undefined;
  }, [book.id]);

  useEffect(() => {
    if (loading || deepSearchLoading || deepSearchDone || coverOptions.length >= 6) return;
    if (deepStartedFor.current === book.id) return;
    deepStartedFor.current = book.id;
    onSearchMore();
  }, [book.id, coverOptions.length, deepSearchDone, deepSearchLoading, loading, onSearchMore]);

  function toggle(option: CoverResult) {
    setApprovedUrls((current) => {
      const next = new Set(current);
      if (next.has(option.url)) {
        next.delete(option.url);
        if (primaryUrl === option.url) {
          const replacement = candidates.find((candidate) => next.has(candidate.url));
          setPrimaryUrl(replacement?.url);
        }
      } else {
        next.add(option.url);
        if (!primaryUrl) setPrimaryUrl(option.url);
      }
      return next;
    });
  }

  const approved = candidates.filter((candidate) => approvedUrls.has(candidate.url));
  const primary = candidates.find((candidate) => candidate.url === primaryUrl);
  const searching = loading || deepSearchLoading;

  return (
    <div className="cover-review-backdrop" role="presentation">
      <section className="cover-review-queue" role="dialog" aria-modal="true" aria-label={`Find covers for ${book.title}`}>
        <header className="cover-review-header">
          <div>
            <p className="cover-review-eyebrow">Cover review · {position} of {total}</p>
            <h2>{book.title}</h2>
            <p>by {book.author}</p>
          </div>
          <button type="button" className="cover-review-close" onClick={onClose} aria-label="Close cover review">×</button>
        </header>

        <div className="cover-review-progress" aria-hidden="true"><span style={{ width: `${Math.max(4, (position / Math.max(1, total)) * 100)}%` }} /></div>
        <p className="cover-review-instruction">Select every cover that belongs to this book. Mark one as the primary shelf cover, then continue.</p>

        <div className="cover-review-grid" aria-busy={searching}>
          {candidates.map((option, index) => {
            const selected = approvedUrls.has(option.url);
            const isPrimary = primaryUrl === option.url;
            return (
              <article className={`cover-review-card${selected ? " selected" : ""}`} key={option.url}>
                <button type="button" className="cover-review-image" onClick={() => toggle(option)} aria-pressed={selected}>
                  <img src={stripCoverCrop(option.url)} style={coverCropImageStyle(option.url)} alt={`Candidate ${index + 1} from ${option.source}`} loading="lazy" decoding="async" />
                  <span className="cover-review-check">{selected ? "✓ Applies" : "Select"}</span>
                </button>
                <div className="cover-review-card-meta">
                  <span>{option.source}</span>
                  {selected ? (
                    <button type="button" className={isPrimary ? "primary-choice" : ""} onClick={() => setPrimaryUrl(option.url)}>
                      {isPrimary ? "★ Primary" : "Make primary"}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        {searching ? <p className="cover-review-status" role="status">Searching title, author, identifiers, and alternate editions…</p> : null}
        {!searching && !candidates.length ? <p className="cover-review-empty">No likely matches were found yet.</p> : null}

        <footer className="cover-review-actions">
          <div>
            <button type="button" onClick={() => onFinish([], undefined, "no-match")}>None match</button>
            <button type="button" onClick={() => onFinish([], undefined, "skipped")}>Skip for now</button>
          </div>
          <button type="button" className="cover-review-continue" disabled={!approved.length || !primary} onClick={() => onFinish(approved, primary)}>
            Save {approved.length || ""} {approved.length === 1 ? "cover" : "covers"} & next →
          </button>
        </footer>
      </section>
    </div>
  );
}
