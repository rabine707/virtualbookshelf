"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onboardingDemoReaders } from "./local-demo-readers";
import "./guest-welcome.css";

const SESSION_KEY = "shelf-of-fame-supabase-session";
const DISMISSED_KEY = "shelf-of-fame-guest-welcome-dismissed-v1";
const readers = onboardingDemoReaders();

export default function GuestWelcome({ onVisibilityChange }: { onVisibilityChange?: (visible: boolean) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      const nextVisible = !window.localStorage.getItem(SESSION_KEY) && window.localStorage.getItem(DISMISSED_KEY) !== "1";
      setVisible(nextVisible);
      onVisibilityChange?.(nextVisible);
    };
    update();
    window.addEventListener("shelf-auth-changed", update);
    return () => window.removeEventListener("shelf-auth-changed", update);
  }, [onVisibilityChange]);

  function dismiss() {
    window.localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
    onVisibilityChange?.(false);
  }

  function createShelf() {
    dismiss();
    window.dispatchEvent(new CustomEvent("shelf-open-auth", { detail: { mode: "signup" } }));
  }

  if (!visible) return null;

  return <div className="guest-welcome-backdrop" role="presentation">
  <section className="guest-welcome" role="dialog" aria-modal="true" aria-labelledby="guest-welcome-title">
    <button className="guest-welcome-close" type="button" onClick={dismiss} aria-label="Explore Shelf of Fame without creating an account">×</button>
    <div className="guest-welcome-copy">
      <span>WELCOME TO SHELF OF FAME</span>
      <h1 id="guest-welcome-title">Your reading life deserves a room of its own.</h1>
      <p>Build a shelf, make every spine yours, and share it only when you’re ready. New shelves begin private.</p>
      <div className="guest-welcome-actions">
        <button type="button" onClick={createShelf}>Create my shelf</button>
        <button type="button" onClick={dismiss}>Explore first</button>
      </div>
    </div>
    <div className="guest-reader-intro">
      <div><strong>Meet five readers already shelving their obsessions</strong><small>Open a shelf to see how personality becomes a collection.</small></div>
      <div className="guest-reader-list">
        {readers.map((reader) => <Link href={`/u/${reader.username}`} key={reader.username} onClick={dismiss}>
          {reader.featuredSpine ? <img src={reader.featuredSpine} alt="" /> : <span>{reader.name.slice(0, 1)}</span>}
          <b>{reader.name.split(" ")[0]}</b>
          <small>{reader.genres[0]}</small>
        </Link>)}
      </div>
    </div>
  </section>
  </div>;
}
