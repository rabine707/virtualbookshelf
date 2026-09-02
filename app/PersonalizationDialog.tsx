"use client";

import { useEffect, useState } from "react";
import { AUTH_CHANGED_EVENT, readStoredShelfSession } from "./auth-client";
import type { ShelfPreferences, TitleOrientation } from "./hooks/useShelfPreferences";

type PersonalizationDialogProps = {
  open: boolean;
  preferences: ShelfPreferences;
  onChange: (update: Partial<ShelfPreferences>) => void;
  onClose: () => void;
};

export default function PersonalizationDialog({ open, preferences, onChange, onClose }: PersonalizationDialogProps) {
  const [isCurator, setIsCurator] = useState(false);

  useEffect(() => {
    const syncCurator = () => setIsCurator(readStoredShelfSession()?.profile?.trusted_curator === true);
    syncCurator();
    window.addEventListener(AUTH_CHANGED_EVENT, syncCurator);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, syncCurator);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("theme-picker-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("theme-picker-open");
    };
  }, [onClose, open]);

  if (!open) return null;
  return <div className="theme-picker-backdrop" onClick={onClose}>
    <div className="theme-picker" role="dialog" aria-modal="true" aria-label="Personalize your shelf" onClick={(event) => event.stopPropagation()}>
      <button type="button" className="theme-picker-close" onClick={onClose} aria-label="Close theme picker">×</button>
      <h2>Personalize your shelf</h2>
      <button type="button" className="theme-picker-spine-setting" onClick={() => onChange({ spineLabels: !preferences.spineLabels })} aria-pressed={preferences.spineLabels}>
        <span><strong>Spine text</strong><small>Show book title and author labels on the shelf</small></span>
        <b>{preferences.spineLabels ? "On" : "Off"}</b>
      </button>
      <section className="theme-picker-spine-setting theme-picker-orientation" aria-label="Spine title orientation">
        <span><strong>Spine title direction</strong><small>Choose a varied shelf or force one direction when titles fit</small></span>
        <span className="theme-picker-orientation-options">
          {(["auto", "upright", "sideways"] as TitleOrientation[]).map((option) => <button type="button" key={option} className={preferences.titleOrientation === option ? "active" : ""} onClick={() => onChange({ titleOrientation: option })} aria-pressed={preferences.titleOrientation === option}>{option === "auto" ? "Automatic" : option === "upright" ? "Upright" : "Sideways"}</button>)}
        </span>
      </section>
      <div className="theme-picker-grid">
        <button type="button" className="theme-option active" aria-pressed="true"><span className="theme-option-icon">❧</span><span className="theme-option-copy"><strong>Botanical</strong><small>Plants, glass & soft green light</small></span></button>
      </div>
      {isCurator ? <a className="theme-picker-library-link" href="/engravings">View all engravings <span aria-hidden="true">→</span></a> : null}
    </div>
  </div>;
}
