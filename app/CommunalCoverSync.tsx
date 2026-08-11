"use client";

import { useEffect } from "react";

const SUPABASE_URL = "https://vrkuimrfdkejfhpxlwlf.supabase.co";
const SUPABASE_KEY = "sb_publishable_mf0u925xGBkP4iNgxSCjuQ_H4Dp8r1S";
const SESSION_KEY = "shelf-of-fame-supabase-session";
const LIBRARY_KEY = "shelf-of-fame-library-v1";

type Cover = { url?: string; source?: string };
type StoredBook = {
  title?: string;
  author?: string;
  isbn?: string;
  asin?: string;
  preferredCover?: Cover;
} & Record<string, unknown>;

type Vote = "correct" | "wrong" | "different_edition";

function normalize(value?: string) {
  return (value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function identity(title: string, author: string) {
  return `${normalize(title)}::${normalize(author)}`;
}

function readLibrary(): StoredBook[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(LIBRARY_KEY) || "[]");
    return Array.isArray(value) ? value as StoredBook[] : [];
  } catch {
    return [];
  }
}

function session() {
  try {
    return JSON.parse(window.localStorage.getItem(SESSION_KEY) || "null") as {
      access_token?: string;
      user?: { id?: string };
    } | null;
  } catch {
    return null;
  }
}

function modalSnapshot(modal: Element) {
  const title = modal.querySelector(".details h2")?.textContent?.trim() || "";
  const author = (modal.querySelector(".details .author")?.textContent || "")
    .replace(/^by\s+/i, "")
    .trim();
  const currentImage = modal.querySelector<HTMLImageElement>(".cover-image")?.src || "";
  const stored = readLibrary().find((book) =>
    identity(book.title || "", book.author || "") === identity(title, author)
  );
  const imageUrl = currentImage || stored?.preferredCover?.url || "";
  const source = stored?.preferredCover?.source || "Shelf cover decision";
  return {
    title,
    author,
    isbn: typeof stored?.isbn === "string" ? stored.isbn : "",
    asin: typeof stored?.asin === "string" ? stored.asin : "",
    imageUrl,
    source,
  };
}

function voteFromButton(button: Element): Vote | null {
  const text = (button.textContent || "").toLowerCase();
  if (text.includes("correct cover")) return "correct";
  if (text.includes("wrong cover")) return "wrong";
  if (text.includes("different edition")) return "different_edition";
  return null;
}

async function syncDecision(snapshot: ReturnType<typeof modalSnapshot>, vote: Vote) {
  const currentSession = session();
  if (!currentSession?.access_token) return;
  if (!snapshot.title || !snapshot.imageUrl) return;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sync_library_cover_decision`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${currentSession.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_title: snapshot.title,
      p_author: snapshot.author,
      p_isbn: snapshot.isbn || null,
      p_asin: snapshot.asin || null,
      p_image_url: snapshot.imageUrl,
      p_source: snapshot.source,
      p_vote: vote,
    }),
  });

  if (!response.ok) {
    // Local shelf behavior must never fail because communal sync is unavailable.
    console.warn("Communal cover sync failed", response.status);
  }
}

export default function CommunalCoverSync() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("button");
      if (!button) return;
      const feedback = button.closest('[aria-label="Cover feedback"]');
      if (!feedback) return;
      const vote = voteFromButton(button);
      if (!vote) return;
      const modal = button.closest(".modal");
      if (!modal) return;

      // Capture the current candidate before existing UI handlers swap or reject it.
      const snapshot = modalSnapshot(modal);
      void syncDecision(snapshot, vote);
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
