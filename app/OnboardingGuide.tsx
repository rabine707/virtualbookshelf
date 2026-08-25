"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Book, looksLikeSampleShelf } from "../lib/books/client-library";
import "./onboarding.css";

const STATUS_KEY = "shelf-of-fame-onboarding-status-v1";
const DISCOVERY_KEY = "shelf-of-fame-onboarding-discovery-v1";
const STYLE_DECIDED_KEY = "shelf-of-fame-onboarding-style-v1";
const PRIVACY_DECIDED_KEY = "shelf-of-fame-onboarding-privacy-v1";
const FAVORITES_KEY = "shelf-of-fame-profile-favorites-v1";
const PUBLIC_KEY = "shelf-of-fame-public-v1";

type Progress = { books: boolean; style: boolean; favorites: boolean; privacy: boolean; discover: boolean };

function readProgress(books: Book[]): Progress {
  let favorites: string[] = [];
  try { favorites = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || "[]"); } catch { favorites = []; }
  return {
    books: books.length > 0 && !looksLikeSampleShelf(books),
    style: window.localStorage.getItem(STYLE_DECIDED_KEY) === "1",
    favorites: favorites.length > 0,
    privacy: window.localStorage.getItem(PRIVACY_DECIDED_KEY) === "1" || window.localStorage.getItem(PUBLIC_KEY) === "on",
    discover: window.localStorage.getItem(DISCOVERY_KEY) === "1",
  };
}

export default function OnboardingGuide({ books, eligible, onAddBook }: { books: Book[]; eligible: boolean; onAddBook: () => void }) {
  const [mode, setMode] = useState<"hidden" | "welcome" | "checklist">("hidden");
  const [progress, setProgress] = useState<Progress>({ books: false, style: false, favorites: false, privacy: false, discover: false });

  useEffect(() => {
    if (!eligible) return;
    const status = window.localStorage.getItem(STATUS_KEY);
    if (status === "complete" || status === "skipped") return;
    setProgress(readProgress(books));
    setMode(status === "started" ? "checklist" : "welcome");
  }, [books, eligible]);

  useEffect(() => {
    if (mode === "hidden") return;
    const refresh = () => setProgress(readProgress(books));
    const interval = window.setInterval(refresh, 900);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, [books, mode]);

  const completeCount = useMemo(() => Object.values(progress).filter(Boolean).length, [progress]);
  if (!eligible || mode === "hidden") return null;

  function start() { window.localStorage.setItem(STATUS_KEY, "started"); setMode("checklist"); }
  function finish(status: "complete" | "skipped") { window.localStorage.setItem(STATUS_KEY, status); setMode("hidden"); }
  function openStyle() { window.localStorage.setItem(STYLE_DECIDED_KEY, "1"); setProgress((current) => ({ ...current, style: true })); window.dispatchEvent(new Event("shelf-open-personalization")); }
  function visitPrivacy() { window.localStorage.setItem(PRIVACY_DECIDED_KEY, "1"); setProgress((current) => ({ ...current, privacy: true })); }
  function visitReaders() { window.localStorage.setItem(DISCOVERY_KEY, "1"); setProgress((current) => ({ ...current, discover: true })); }

  if (mode === "welcome") return <div className="sof-onboarding-backdrop" role="presentation"><section className="sof-onboarding-welcome" role="dialog" aria-modal="true" aria-labelledby="sof-onboarding-title"><span className="sof-onboarding-mark" aria-hidden="true">✦</span><small>SHELF OF FAME</small><h1 id="sof-onboarding-title">Make this shelf yours</h1><p>Bring in your books, choose your style, and decide if you want to share. You can stop and return at any time.</p><div><button type="button" className="is-primary" onClick={start}>Start my shelf</button><button type="button" onClick={() => setMode("hidden")}>Not now</button></div><button className="sof-onboarding-skip" type="button" onClick={() => finish("skipped")}>Skip setup permanently</button></section></div>;

  const steps = [
    { key: "books" as const, title: "Bring in your books", copy: "Add one book or use our guided Goodreads import.", action: <button type="button" onClick={onAddBook}>Add or import</button> },
    { key: "style" as const, title: "Choose your shelf style", copy: "Pick the visual world that feels like you.", action: <button type="button" onClick={openStyle}>Open Style</button> },
    { key: "favorites" as const, title: "Pick profile favorites", copy: "Choose up to five books that introduce your taste.", action: <Link href="/account">Open profile</Link> },
    { key: "privacy" as const, title: "Make your privacy choice", copy: "Stay private or publish when you are ready.", action: <Link href="/account" onClick={visitPrivacy}>Privacy settings</Link> },
    { key: "discover" as const, title: "Discover readers", copy: "Find shelves and people you may want to follow.", action: <Link href="/readers" onClick={visitReaders}>Find readers</Link> },
  ];

  return <aside className="sof-onboarding-checklist" aria-label="Getting started"><header><div><small>GETTING STARTED</small><strong>{completeCount} of 5 complete</strong></div><button type="button" aria-label="Hide setup checklist" onClick={() => setMode("hidden")}>×</button></header><div className="sof-onboarding-progress"><span style={{ width: `${completeCount * 20}%` }} /></div><ol>{steps.map((step) => <li className={progress[step.key] ? "is-complete" : ""} key={step.key}><span className="sof-onboarding-check" aria-hidden="true">{progress[step.key] ? "✓" : ""}</span><div><strong>{step.title}</strong><p>{step.copy}</p></div>{progress[step.key] ? <span className="sof-onboarding-done">Done</span> : step.action}</li>)}</ol><footer>{completeCount === 5 ? <button type="button" className="is-primary" onClick={() => finish("complete")}>Finish setup</button> : <button type="button" onClick={() => finish("skipped")}>Skip the rest</button>}</footer></aside>;
}
