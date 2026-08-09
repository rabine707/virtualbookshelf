"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Candidate = {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  coverImage?: string;
  spineImage?: string; // Legacy/manual spine uploads stay separate from cover review.
  source: "upload" | "web";
  kind?: "cover" | "spine";
  createdAt: number;
};

type Vote = "match" | "wrong" | "unsure";
type Cover = { url: string; source?: string };
type StoredBook = {
  title?: string;
  author?: string;
  preferredCover?: Cover;
  savedCovers?: Cover[];
  coverFeedback?: { accepted?: string; rejected?: string[]; wrongEdition?: string[] };
} & Record<string, unknown>;

type WebCoverResult = { url?: string; thumbnailUrl?: string; source?: string; publisher?: string };

const LIBRARY_KEY = "shelf-of-fame-library-v1";
const CANDIDATES_KEY = "shelf-of-fame-spine-candidates-v1";
const VOTES_KEY = "shelf-of-fame-spine-votes-v1";
const POINTS_KEY = "shelf-of-fame-community-points-v1";

function normalize(value?: string) {
  return (value || "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function identity(title: string, author: string) { return `${normalize(title)}::${normalize(author)}`; }
function readLibrary(): StoredBook[] {
  try { const value = JSON.parse(window.localStorage.getItem(LIBRARY_KEY) || "[]"); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
function readCandidates(): Candidate[] {
  try { const value = JSON.parse(window.localStorage.getItem(CANDIDATES_KEY) || "[]"); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
function writeCandidates(candidates: Candidate[]) { window.localStorage.setItem(CANDIDATES_KEY, JSON.stringify(candidates.slice(-80))); }
function readVotes(): Record<string, Vote> {
  try { const value = JSON.parse(window.localStorage.getItem(VOTES_KEY) || "{}"); return value && typeof value === "object" ? value : {}; }
  catch { return {}; }
}
function candidateImage(candidate: Candidate) { return candidate.coverImage || candidate.spineImage || ""; }
function isCoverCandidate(candidate: Candidate) {
  if (candidate.kind) return candidate.kind === "cover";
  // Legacy automatically-found web candidates were full covers. Legacy uploads
  // came from the separate real-spine tool and must not enter cover review.
  return candidate.source === "web";
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
  const wanted = identity(title, author);
  return readLibrary().find((book) => identity(book.title || "", book.author || "") === wanted)?.preferredCover?.url || "";
}
function googleSpineUrl(title: string, author: string) {
  const query = `\"${title}\" ${author ? `\"${author}\" ` : ""}book spine physical book`;
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
}
function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || "")); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); });
}
function applyVerifiedCover(candidate: Candidate) {
  const image = candidateImage(candidate);
  if (!image || !isCoverCandidate(candidate)) return;
  const key = identity(candidate.title, candidate.author);
  const books = readLibrary();
  const next = books.map((book) => {
    if (identity(book.title || "", book.author || "") !== key) return book;
    const cover = { url: image, source: "Community verified cover" };
    const saved = [...(book.savedCovers || []), ...(book.preferredCover?.url ? [book.preferredCover] : []), cover];
    const seen = new Set<string>();
    return { ...book, preferredCover: cover, savedCovers: saved.filter((item) => item?.url && !seen.has(item.url) && !!seen.add(item.url)), coverFeedback: { ...book.coverFeedback, accepted: cover.url, rejected: (book.coverFeedback?.rejected || []).filter((url) => url !== cover.url) } };
  });
  window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
}
function rejectCover(candidate: Candidate) {
  const image = candidateImage(candidate);
  if (!image || !isCoverCandidate(candidate)) return;
  const key = identity(candidate.title, candidate.author);
  const next = readLibrary().map((book) => identity(book.title || "", book.author || "") !== key ? book : ({ ...book, coverFeedback: { ...book.coverFeedback, rejected: Array.from(new Set([...(book.coverFeedback?.rejected || []), image])) } }));
  window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
}

export default function SpineCommunityEnricher() {
  const [toolbar, setToolbar] = useState<Element | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [loading, setLoading] = useState(false);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    const mountModalTools = () => {
      setToolbar(document.querySelector(".toolbar"));
      const modal = document.querySelector<HTMLElement>(".modal");
      if (!modal || modal.querySelector("[data-spine-community-tools]")) return;
      const feedback = modal.querySelector<HTMLElement>('[aria-label="Cover feedback"]');
      const book = modalBook();
      if (!feedback || !book) return;
      const holder = document.createElement("div"); holder.className = "spine-community-tools"; holder.setAttribute("data-spine-community-tools", "1");
      const google = document.createElement("button"); google.type = "button"; google.className = "primary spine-google-button"; google.textContent = "🔎 Find real spine online"; google.onclick = () => window.open(googleSpineUrl(book.title, book.author), "_blank", "noopener,noreferrer");
      const upload = document.createElement("button"); upload.type = "button"; upload.className = "primary spine-upload-button"; upload.textContent = "📷 Upload spine candidate";
      const input = document.createElement("input"); input.type = "file"; input.accept = "image/*"; input.hidden = true; upload.onclick = () => input.click();
      input.onchange = async () => { const file = input.files?.[0]; if (!file) return; try { const image = await fileToDataUrl(file); writeCandidates([...readCandidates(), { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title: book.title, author: book.author, coverUrl: book.coverUrl || libraryCover(book.title, book.author), spineImage: image, source: "upload", kind: "spine", createdAt: Date.now() }]); upload.textContent = "✓ Spine saved"; setRevision((v) => v + 1); } catch { upload.textContent = "Upload failed"; } input.value = ""; };
      holder.append(google, upload, input); feedback.appendChild(holder);
    };
    mountModalTools(); const observer = new MutationObserver(() => requestAnimationFrame(mountModalTools)); observer.observe(document.body, { childList: true, subtree: true }); return () => observer.disconnect();
  }, []);

  const queue = useMemo(() => {
    void revision;
    const votes = readVotes();
    return readCandidates().filter(isCoverCandidate).filter((candidate) => candidateImage(candidate) && !votes[candidate.id]);
  }, [revision, reviewOpen]);
  const current = queue[0];
  const points = Number(typeof window !== "undefined" ? window.localStorage.getItem(POINTS_KEY) || 0 : 0);

  async function fillQueue() {
    if (loading) return;
    setLoading(true);
    try {
      const existing = readCandidates(); const votes = readVotes(); const existingUrls = new Set(existing.filter(isCoverCandidate).map((item) => `${identity(item.title, item.author)}::${candidateImage(item)}`));
      const books = readLibrary().filter((book) => book.title).filter((book) => {
        const key = identity(book.title || "", book.author || "");
        return !existing.some((item) => isCoverCandidate(item) && identity(item.title, item.author) === key && !votes[item.id]);
      }).slice(0, 2);
      const additions: Candidate[] = [];
      for (const book of books) {
        const params = new URLSearchParams({ title: book.title || "", author: book.author || "", mode: "alternate" });
        const response = await fetch(`/api/web-covers?${params}`); if (!response.ok) continue;
        const data = await response.json() as { results?: WebCoverResult[] };
        for (const result of (data.results || []).slice(0, 3)) {
          const image = result.url || result.thumbnailUrl; if (!image) continue;
          const fingerprint = `${identity(book.title || "", book.author || "")}::${image}`;
          if (existingUrls.has(fingerprint) || book.coverFeedback?.rejected?.includes(image) || book.preferredCover?.url === image) continue;
          existingUrls.add(fingerprint); additions.push({ id: `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title: book.title || "", author: book.author || "", coverUrl: book.preferredCover?.url, coverImage: image, source: "web", kind: "cover", createdAt: Date.now() });
        }
      }
      if (additions.length) { writeCandidates([...existing, ...additions]); setRevision((v) => v + 1); }
    } finally { setLoading(false); }
  }

  useEffect(() => { if (reviewOpen && queue.length < 2) void fillQueue(); }, [reviewOpen, queue.length]);

  function vote(value: Vote) {
    if (!current) return;
    const votes = readVotes(); votes[current.id] = value; window.localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
    if (value === "match") applyVerifiedCover(current); else if (value === "wrong") rejectCover(current);
    if (value !== "unsure") window.localStorage.setItem(POINTS_KEY, String(points + 1));
    setDragX(0); setRevision((n) => n + 1);
  }
  function finishDrag() { if (dragX > 95) vote("match"); else if (dragX < -95) vote("wrong"); else setDragX(0); startX.current = null; }

  return <>
    {toolbar && createPortal(<button type="button" className="spine-review-launch" onClick={() => setReviewOpen(true)}><span aria-hidden="true">⇄</span><span><small>Community</small><strong>Help the Shelf</strong></span>{queue.length > 0 && <b>{queue.length}</b>}</button>, toolbar)}
    {reviewOpen && createPortal(<div className="spine-review-backdrop" onClick={() => setReviewOpen(false)}><section className="spine-review-sheet" role="dialog" aria-modal="true" aria-label="Help verify book covers" onClick={(event) => event.stopPropagation()}>
      <header><div><small>Quick cover check</small><h2>Help the Shelf</h2><p>Is this the correct full cover for this book? One tap and you’re onto the next.</p></div><button type="button" onClick={() => setReviewOpen(false)} aria-label="Close">×</button></header>
      {current ? <>
        <div className="spine-review-book">{current.coverUrl && <img src={current.coverUrl} alt="Currently saved cover" />}<div><strong>{current.title}</strong><span>{current.author}</span><small>Candidate full cover</small></div></div>
        <div className={`spine-swipe-card ${dragX > 50 ? "match" : dragX < -50 ? "wrong" : ""}`} style={{ transform: `translateX(${dragX}px) rotate(${dragX / 24}deg)` }} onPointerDown={(event) => { startX.current = event.clientX; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (startX.current !== null) setDragX(Math.max(-150, Math.min(150, event.clientX - startX.current))); }} onPointerUp={finishDrag} onPointerCancel={finishDrag}><img src={candidateImage(current)} alt={`Candidate cover for ${current.title}`} /><span className="swipe-wrong">WRONG</span><span className="swipe-match">MATCH</span></div>
        <div className="spine-review-actions"><button type="button" className="wrong" onClick={() => vote("wrong")}>✕ Wrong</button><button type="button" className="unsure" onClick={() => vote("unsure")}>? Skip</button><button type="button" className="match" onClick={() => vote("match")}>✓ Correct</button></div>
        <footer><span>{queue.length} covers ready to check</span><span>★ {points} verified</span></footer>
      </> : <div className="spine-review-empty"><span>{loading ? "…" : "✓"}</span><h3>{loading ? "Finding covers…" : "You’re caught up"}</h3><p>{loading ? "We’re loading likely full-cover matches so they’re ready for you to check." : "More likely cover matches will appear here automatically."}</p>{!loading && <button type="button" className="primary" onClick={() => void fillQueue()}>Find more covers to check</button>}</div>}
    </section></div>, document.body)}
  </>;
}
