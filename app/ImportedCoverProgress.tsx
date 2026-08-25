"use client";

import type { ImportedCoverFinderJob } from "./hooks/useImportedCoverFinder";

type ImportedCoverProgressProps = {
  job: ImportedCoverFinderJob | null;
  currentTitle: string;
  onPause: () => void;
  onResume: () => void;
  onReview: () => void;
  onDismiss: () => void;
};

export default function ImportedCoverProgress({ job, currentTitle, onPause, onResume, onReview, onDismiss }: ImportedCoverProgressProps) {
  if (!job) return null;

  const total = job.bookIds.length;
  const processed = Math.min(job.nextIndex, total);
  const percent = total ? Math.round((processed / total) * 100) : 100;
  const heading = job.status === "done"
    ? "Cover search complete"
    : job.status === "paused"
      ? "Cover search paused"
      : "Finding covers";

  return (
    <>
      <style>{`
        .imported-cover-progress { position: fixed; z-index: 990; left: 14px; right: 14px; bottom: calc(88px + env(safe-area-inset-bottom)); width: min(520px, calc(100% - 28px)); box-sizing: border-box; margin: 0 auto; padding: 14px; border: 1px solid rgba(242,234,220,.15); border-radius: 16px; background: rgba(31,24,19,.975); color: #fff1da; box-shadow: 0 16px 44px rgba(0,0,0,.44); font-family: Arial,sans-serif; }
        .imported-cover-progress__head { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 12px; align-items: start; }
        .imported-cover-progress__head strong { display: block; font: 800 14px/1.2 Arial,sans-serif; }
        .imported-cover-progress__head span { display: block; overflow: hidden; margin-top: 4px; color: rgba(255,241,218,.62); font-size: 11px; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
        .imported-cover-progress__count { color: #e8cda9; font-size: 11px; font-weight: 800; white-space: nowrap; }
        .imported-cover-progress__bar { overflow: hidden; height: 6px; margin: 11px 0 9px; border-radius: 999px; background: rgba(255,255,255,.09); }
        .imported-cover-progress__bar span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg,#9d704f,#e0bd91); transition: width .25s ease; }
        .imported-cover-progress__summary { margin: 0; color: rgba(255,241,218,.7); font-size: 11px; line-height: 1.45; }
        .imported-cover-progress__note { margin: 5px 0 0; color: rgba(255,241,218,.45); font-size: 9px; line-height: 1.4; }
        .imported-cover-progress__actions { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; margin-top: 11px; }
        .imported-cover-progress__actions button { min-height: 42px; padding: 8px 11px; border: 1px solid rgba(255,255,255,.11); border-radius: 11px; background: rgba(255,255,255,.055); color: inherit; font: 800 11px/1.2 Arial,sans-serif; cursor: pointer; }
        .imported-cover-progress__actions .primary { border-color: rgba(224,189,145,.35); background: #6f4c35; }
        .imported-cover-progress__actions .only { grid-column: 1 / -1; }
      `}</style>
      <section className="imported-cover-progress" role="region" aria-label="Imported book cover progress">
        <div className="imported-cover-progress__head">
          <div><strong>{heading}</strong>{job.status === "running" && currentTitle ? <span>Checking {currentTitle}</span> : null}</div>
          <span className="imported-cover-progress__count">{processed} of {total}</span>
        </div>
        <div className="imported-cover-progress__bar" role="progressbar" aria-label="Cover search progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={processed}><span style={{ width: `${percent}%` }} /></div>
        <p className="imported-cover-progress__summary">{job.matchedBookIds.length} matched automatically · {job.reviewBookIds.length} need review</p>
        <p className="imported-cover-progress__note">Only exact ISBN matches are applied. Existing covers and custom spines are never replaced.</p>
        <div className="imported-cover-progress__actions">
          {job.status === "running" ? <button type="button" className="only" onClick={onPause}>Pause</button> : null}
          {job.status === "paused" ? <><button type="button" className="primary" onClick={onResume}>Resume</button><button type="button" onClick={onDismiss}>Stop</button></> : null}
          {job.status === "done" && job.reviewBookIds.length ? <button type="button" className="primary" onClick={onReview}>Review {job.reviewBookIds.length} {job.reviewBookIds.length === 1 ? "cover" : "covers"}</button> : null}
          {job.status === "done" ? <button type="button" className={job.reviewBookIds.length ? "" : "only"} onClick={onDismiss}>Done</button> : null}
        </div>
      </section>
    </>
  );
}
