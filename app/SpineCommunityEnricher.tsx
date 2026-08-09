"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Candidate = {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  spineImage: string;
  source: "upload" | "web";
  createdAt: number;
};

type Vote = "match" | "wrong" | "unsure";

type StoredBook = {
  title?: string;
  author?: string;
  preferredCover?: { url?: string };
};

const LIBRARY_KEY = "shelf-of-fame-library-v1";
const CANDIDATES_KEY = "shelf-of-fame-spine-candidates-v1";
const VOTES_KEY = "shelf-of-fame-spine-votes-v1";
const POINTS_KEY = "shelf-of-fame-community-points-v1";

function identity(title: string, author: string) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()}::${author.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()}`;
}

function readCandidates(): Candidate[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(CANDIDATES_KEY) || "[]");
    return Array.isArray(value) ? value as Candidate[] : [];
  } catch {
    return [];
  }
}

function writeCandidates(candidates: Candidate[]) {
  window.localStorage.setItem(CANDIDATES_KEY, JSON.stringify(candidates.slice(-60)));
}

function readVotes(): Record<string, Vote> {
  try {
    const value = JSON.parse(window.localStorage.getItem(VOTES_KEY) || "{}");
    return value && typeof value === "object" ? value as Record<string, Vote> : {};
  } catch {
    return {};
  }
}

function modalBook() {
  const modal = document.querySelector<HTMLElement>(".modal");
  if (!modal) return null;
  const title = modal.querySelector<HTMLElement>(".details h2")?.textContent?.trim() || "";
  const author = (modal.querySelector<HTMLElement>(".details .author")?.textContent || "").replace(/^by\s+/i, "").trim();
  const coverUrl = modal.querySelector<HTMLImageElement>(".cover-image")?.src || "";
  return title ? { title, author, coverUrl } : null;
}

function libraryCover(title: string, author: string) {
  try {
    const books = JSON.parse(window.localStorage.getItem(LIBRARY_KEY) || "[]") as StoredBook[];
    const wanted = identity(title, author);
    return books.find((book) => identity(book.title || "", book.author || "") === wanted)?.preferredCover?.url || "";
  } catch {
    return "";
  }
}

function googleSpineUrl(title: string, author: string) {
  const query = `\"${title}\" ${author ? `\"${author}\" ` : ""}book spine physical book`;
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function SpineCommunityEnricher() {
  const [toolbar, setToolbar] = useState<Element | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [dragX, setDragX] = useState(0);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    const mountModalTools = () => {
      setToolbar(document.querySelector(".toolbar"));
      const modal = document.querySelector<HTMLElement>(".modal");
      if (!modal || modal.querySelector("[data-spine-community-tools]")) return;
      const feedback = modal.querySelector<HTMLElement>('[aria-label="Cover feedback"]');
      if (!feedback) return;
      const book = modalBook();
      if (!book) return;

      const holder = document.createElement("div");
      holder.className = "spine-community-tools";
      holder.setAttribute("data-spine-community-tools", "1");

      const google = document.createElement("button");
      google.type = "button";
      google.className = "primary spine-google-button";
      google.textContent = "🔎 Find real spine online";
      google.addEventListener("click", () => {
        window.open(googleSpineUrl(book.title, book.author), "_blank", "noopener,noreferrer");
      });

      const upload = document.createElement("button");
      upload.type = "button";
      upload.className = "primary spine-upload-button";
      upload.textContent = "📷 Upload spine candidate";

      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.hidden = true;
      upload.addEventListener("click", () => input.click());
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          const spineImage = await fileToDataUrl(file);
          const candidate: Candidate = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title: book.title,
            author: book.author,
            coverUrl: book.coverUrl || libraryCover(book.title, book.author),
            spineImage,
            source: "upload",
            createdAt: Date.now(),
          };
          writeCandidates([...readCandidates(), candidate]);
          upload.textContent = "✓ Added to review queue";
          window.setTimeout(() => { upload.textContent = "📷 Upload spine candidate"; }, 1800);
          setRevision((value) => value + 1);
        } catch {
          upload.textContent = "Upload failed";
        }
        input.value = "";
      });

      holder.append(google, upload, input);
      feedback.appendChild(holder);
    };

    mountModalTools();
    const observer = new MutationObserver(() => requestAnimationFrame(mountModalTools));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const queue = useMemo(() => {
    void revision;
    const votes = readVotes();
    return readCandidates().filter((candidate) => !votes[candidate.id]);
  }, [revision, reviewOpen]);

  const current = queue[0];
  const points = Number(typeof window !== "undefined" ? window.localStorage.getItem(POINTS_KEY) || 0 : 0);

  function vote(value: Vote) {
    if (!current) return;
    const votes = readVotes();
    votes[current.id] = value;
    window.localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
    if (value !== "unsure") {
      window.localStorage.setItem(POINTS_KEY, String(points + 1));
    }
    setDragX(0);
    setRevision((number) => number + 1);
  }

  function finishDrag() {
    if (dragX > 95) vote("match");
    else if (dragX < -95) vote("wrong");
    else setDragX(0);
    startX.current = null;
  }

  return (
    <>
      {toolbar && createPortal(
        <button type="button" className="spine-review-launch" onClick={() => setReviewOpen(true)}>
          <span aria-hidden="true">⇄</span>
          <span><small>Community</small><strong>Help the Shelf</strong></span>
          {queue.length > 0 && <b>{queue.length}</b>}
        </button>,
        toolbar,
      )}

      {reviewOpen && createPortal(
        <div className="spine-review-backdrop" onClick={() => setReviewOpen(false)}>
          <section className="spine-review-sheet" role="dialog" aria-modal="true" aria-label="Help verify book spines" onClick={(event) => event.stopPropagation()}>
            <header>
              <div><small>Community review</small><h2>Help the Shelf</h2><p>Swipe right for a match, left if it is wrong.</p></div>
              <button type="button" onClick={() => setReviewOpen(false)} aria-label="Close">×</button>
            </header>

            {current ? (
              <>
                <div className="spine-review-book">
                  {current.coverUrl && <img src={current.coverUrl} alt="" />}
                  <div><strong>{current.title}</strong><span>{current.author}</span><small>Candidate: user upload</small></div>
                </div>

                <div
                  className={`spine-swipe-card ${dragX > 50 ? "match" : dragX < -50 ? "wrong" : ""}`}
                  style={{ transform: `translateX(${dragX}px) rotate(${dragX / 24}deg)` }}
                  onPointerDown={(event) => { startX.current = event.clientX; event.currentTarget.setPointerCapture(event.pointerId); }}
                  onPointerMove={(event) => { if (startX.current !== null) setDragX(Math.max(-150, Math.min(150, event.clientX - startX.current))); }}
                  onPointerUp={finishDrag}
                  onPointerCancel={finishDrag}
                >
                  <img src={current.spineImage} alt={`Candidate spine for ${current.title}`} />
                  <span className="swipe-wrong">WRONG</span>
                  <span className="swipe-match">MATCH</span>
                </div>

                <div className="spine-review-actions">
                  <button type="button" className="wrong" onClick={() => vote("wrong")}>✕ Wrong</button>
                  <button type="button" className="unsure" onClick={() => vote("unsure")}>? Unsure</button>
                  <button type="button" className="match" onClick={() => vote("match")}>✓ Match</button>
                </div>
                <footer><span>{queue.length} waiting</span><span>★ {points} points</span></footer>
              </>
            ) : (
              <div className="spine-review-empty">
                <span>✓</span><h3>You’re caught up</h3><p>Find or upload more real spines from any book’s details screen to refill the queue.</p>
              </div>
            )}
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
