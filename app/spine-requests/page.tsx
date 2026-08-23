"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AUTH_CHANGED_EVENT,
  SUPABASE_KEY,
  SUPABASE_URL,
  readStoredShelfSession,
} from "../spine-request-client";
import type { SpineRequestStatus } from "../../lib/spine-requests";
import { publishSharedSpine, type SharedSpineRenderMode } from "../shared-spines";

type SpineRequest = {
  id: string;
  book_key: string;
  title: string;
  author: string;
  isbn: string | null;
  asin: string | null;
  cover_url: string | null;
  status: SpineRequestStatus;
  curator_note: string | null;
  created_at: string;
  updated_at: string;
  requested_by: string | null;
  fulfilled_spine_id: string | null;
  spines?: { storage_path?: string | null } | null;
};

type SpineRequestGroup = SpineRequest & { requestIds: string[]; recommendationCount: number };
type SpineUpload = { image: string; name: string; mode: SharedSpineRenderMode };
type CatalogBook = { id:string; title:string; author:string; isbn:string|null; asin:string|null };
type SpineType = "clothbound" | "dust-jacket" | "special-edition";

const STATUS_LABELS: Record<SpineRequestStatus, string> = {
  pending: "Requested",
  in_progress: "In progress",
  completed: "Completed",
  declined: "Declined",
};

function publishedSpineUrl(request: SpineRequest) {
  const path = request.spines?.storage_path?.trim();
  return path ? `${SUPABASE_URL}/storage/v1/object/public/spines/${path.split("/").map(encodeURIComponent).join("/")}` : "";
}

function coverDownloadUrl(request: SpineRequest) {
  const params = new URLSearchParams({
    url: request.cover_url || "",
    title: request.title,
    author: request.author,
  });
  return `/api/cover-download?${params.toString()}`;
}

function GlobalSpineUpload({ initialBook, onClose }: { initialBook?: CatalogBook; onClose: () => void }) {
  const [book, setBook] = useState<CatalogBook | undefined>(initialBook);
  const [query, setQuery] = useState(initialBook?.title || "");
  const [results, setResults] = useState<CatalogBook[]>([]);
  const [spineType, setSpineType] = useState<SpineType>("clothbound");
  const [upload, setUpload] = useState<SpineUpload>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (book || query.trim().length < 2) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const session = readStoredShelfSession();
      if (!session?.access_token) return;
      const term = query.trim().replace(/[,%()]/g, " ");
      const params = new URLSearchParams({ select: "id,title,author,isbn,asin", or: `(title.ilike.*${term}*,author.ilike.*${term}*)`, order: "title.asc", limit: "12" });
      const response = await fetch(`${SUPABASE_URL}/rest/v1/books?${params}`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
      setResults(response.ok ? await response.json() : []);
    }, 250);
    return () => clearTimeout(timer.current);
  }, [book, query]);

  function chooseFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" && setUpload({ image: reader.result, name: file.name, mode: "integrated" });
    reader.readAsDataURL(file);
  }

  async function publish() {
    if (!book || !upload) return;
    setBusy(true); setMessage("");
    try {
      const result = await publishSharedSpine({ title: book.title, author: book.author, isbn: book.isbn || undefined, asin: book.asin || undefined }, upload.image, "", `curator-${spineType}`, spineType);
      if (!result.shared) throw new Error("This account cannot publish shared spines.");
      setMessage("Published to the shared spine catalog.");
      window.setTimeout(onClose, 700);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not publish that spine."); }
    finally { setBusy(false); }
  }

  return <div className="curator-upload-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="curator-upload-dialog" role="dialog" aria-modal="true" aria-labelledby="curator-upload-title"><header><div><span className="eyebrow">CURATOR UPLOAD</span><h2 id="curator-upload-title">Upload spine</h2><p>Publish artwork to any Shelf of Fame book.</p></div><button onClick={onClose} aria-label="Close">×</button></header><div className="curator-upload-form"><label><span>1 · Choose a book</span><input value={query} onChange={(event) => { setQuery(event.target.value); setBook(undefined); }} placeholder="Search by title or author" /></label>{book ? <div className="curator-selected-book"><div><strong>{book.title}</strong><small>{book.author || "Unknown author"}</small></div><button onClick={() => { setBook(undefined); setQuery(""); }}>Change</button></div> : null}{!book && results.length ? <div className="curator-book-results">{results.map((result) => <button key={result.id} onClick={() => { setBook(result); setQuery(result.title); }}><strong>{result.title}</strong><small>{result.author || "Unknown author"}</small></button>)}</div> : null}<label><span>2 · Spine type</span><select value={spineType} onChange={(event) => setSpineType(event.target.value as SpineType)}><option value="clothbound">Clothbound</option><option value="dust-jacket">Full-color dust jacket</option><option value="special-edition">Special edition</option></select></label><label className="curator-upload-file"><span>{upload ? upload.name : "3 · Choose spine image"}</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseFile(event.target.files?.[0])} /></label></div>{message ? <p className="curator-upload-message" role="status">{message}</p> : null}<footer><button onClick={onClose}>Cancel</button><button className="primary" disabled={!book || !upload || busy} onClick={() => void publish()}>{busy ? "Publishing…" : "Publish spine"}</button></footer></section></div>;
}

export default function SpineRequestsPage() {
  const [requests, setRequests] = useState<SpineRequest[]>([]);
  const [message, setMessage] = useState("Loading spine requests…");
  const [busyId, setBusyId] = useState<string>();
  const [uploads, setUploads] = useState<Record<string, SpineUpload>>({});
  const [finishedOpen, setFinishedOpen] = useState(false);
  const [uploadBook, setUploadBook] = useState<CatalogBook | null | undefined>(undefined);

  const load = useCallback(async () => {
    const session = readStoredShelfSession();
    if (!session?.access_token || !session.user?.id) {
      setRequests([]);
      setMessage("Sign in with a curator account to view the queue.");
      return;
    }

    const profileResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=trusted_curator&id=eq.${encodeURIComponent(session.user.id)}&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` }, cache: "no-store" },
    );
    const profiles = profileResponse.ok ? await profileResponse.json() as Array<{ trusted_curator?: boolean }> : [];
    if (!profiles[0]?.trusted_curator) {
      setRequests([]);
      setMessage("This queue is available to trusted curators only.");
      return;
    }

    const query = new URLSearchParams({
      select: "id,book_key,title,author,isbn,asin,cover_url,status,curator_note,created_at,updated_at,requested_by,fulfilled_spine_id,spines(storage_path)",
      order: "created_at.asc",
      limit: "200",
    });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/spine_requests?${query}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
    if (!response.ok) {
      setMessage("Could not load the spine request queue.");
      return;
    }
    const rows = await response.json() as SpineRequest[];
    setRequests(rows);
    setMessage(rows.length ? "" : "No spine requests yet.");
  }, []);

  const groupedRequests = useMemo(() => {
    const groups = new Map<string, SpineRequestGroup>();
    for (const request of requests) {
      const existing = groups.get(request.book_key);
      if (existing) {
        existing.requestIds.push(request.id);
        existing.recommendationCount += 1;
      } else {
        groups.set(request.book_key, { ...request, requestIds: [request.id], recommendationCount: 1 });
      }
    }
    return [...groups.values()];
  }, [requests]);
  const activeRequests = useMemo(() => groupedRequests.filter((request) => request.status === "pending" || request.status === "in_progress"), [groupedRequests]);
  const finishedRequests = useMemo(() => groupedRequests.filter((request) => request.status === "completed" || request.status === "declined"), [groupedRequests]);

  useEffect(() => {
    void load();
    window.addEventListener(AUTH_CHANGED_EVENT, load);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, load);
  }, [load]);

  async function setStatus(ids: string[], status: SpineRequestStatus, fulfilledSpineId?: string) {
    const session = readStoredShelfSession();
    if (!session?.access_token) return false;
    setBusyId(ids[0]);
    const idFilter = `in.(${ids.join(",")})`;
    const response = await fetch(`${SUPABASE_URL}/rest/v1/spine_requests?id=${encodeURIComponent(idFilter)}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ status, ...(fulfilledSpineId ? { fulfilled_spine_id: fulfilledSpineId } : {}) }),
    });
    setBusyId(undefined);
    const updated = response.ok ? await response.json() as Array<{ id?: string }> : [];
    if (response.ok && ids.every((id) => updated.some((row) => row.id === id))) {
      await load();
      return true;
    }
    setMessage("Could not update that request.");
    return false;
  }

  function selectSpineImage(requestId: string, file?: File) {
    if (!file) return;
    if (!/^image\/(?:png|jpe?g|webp)$/i.test(file.type)) {
      setMessage("Choose a PNG, JPEG, or WebP spine image.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setMessage("That spine image is larger than 12 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setUploads((current) => ({
        ...current,
        [requestId]: { image: reader.result as string, name: file.name, mode: current[requestId]?.mode || "integrated" },
      }));
      setMessage("");
    };
    reader.onerror = () => setMessage("Could not read that spine image.");
    reader.readAsDataURL(file);
  }

  async function submitSpine(request: SpineRequestGroup) {
    const upload = uploads[request.id];
    if (!upload) {
      setMessage(`Choose the finished spine image for ${request.title} first.`);
      return;
    }
    setBusyId(request.id);
    setMessage(`Publishing the spine for ${request.title}…`);
    try {
      const published = await publishSharedSpine(
        { title: request.title, author: request.author, isbn: request.isbn || undefined, asin: request.asin || undefined },
        upload.image,
        request.cover_url || "",
        upload.mode === "integrated" ? "AI-integrated" : "AI-overlay",
        "curator-request",
      );
      if (!published.shared) throw new Error("This account cannot publish shared spines.");
      const completed = await setStatus(request.requestIds, "completed", published.spineId);
      if (!completed) throw new Error("The spine was published, but the request could not be marked complete. Try completing it again.");
      setUploads((current) => {
        const next = { ...current };
        delete next[request.id];
        return next;
      });
      setMessage(completed
        ? `✓ Added to ${request.title}’s Spine Selector.`
        : "Spine published, but the request status could not be updated.");
    } catch (error) {
      setBusyId(undefined);
      setMessage(error instanceof Error ? error.message : "Could not publish that spine.");
    }
  }

  return (
    <main className="spine-request-queue">
      <header className="spine-request-header">
        <div><p className="eyebrow">SHELF OF FAME · CURATOR</p>
        <h1>Custom spine requests</h1>
        <p>Books readers want turned into polished Shelf of Fame spines.</p></div>
        <button className="curator-upload-launch" onClick={() => setUploadBook(null)}><span aria-hidden="true">＋</span><strong>Upload spine</strong><small>to any book</small></button>
      </header>
      {message ? <p role="status">{message}</p> : null}
      <div className="spine-request-section-title"><span className="eyebrow">WORK QUEUE</span><h2>Active requests <b>{activeRequests.length}</b></h2></div>
      <div className="spine-request-list">
        {activeRequests.length ? activeRequests.map((request) => {
          const upload = uploads[request.id];
          const publishedImage = publishedSpineUrl(request);
          return (
          <article key={request.id} className="spine-request-card">
            <div className="spine-request-images">
              {request.cover_url ? <img src={request.cover_url} alt="" /> : <div className="spine-request-cover-placeholder">No cover</div>}
              {upload || publishedImage ? <img className="spine-request-upload-preview" src={upload?.image || publishedImage} alt={`Finished spine preview for ${request.title}`} /> : null}
            </div>
            <div>
              <span className={`spine-request-status status-${request.status}`}>{STATUS_LABELS[request.status]}</span>
              <h2>{request.title}</h2>
              <p>by {request.author || "Unknown author"}</p>
              <small>
                {request.recommendationCount} {request.recommendationCount === 1 ? "recommendation" : "recommendations"}
                {` · first requested ${new Date(request.created_at).toLocaleDateString()}`}
              </small>
              <small>{request.isbn ? `ISBN ${request.isbn}` : request.asin ? `ASIN ${request.asin}` : "No identifier"}</small>
              {request.cover_url ? (
                <a className="spine-request-download" href={coverDownloadUrl(request)} download>
                  <span aria-hidden="true">↓</span> Download cover
                </a>
              ) : null}
              {request.status !== "completed" && request.status !== "declined" ? (
                <section className="spine-request-submit" aria-label={`Submit spine for ${request.title}`}>
                  <label className="spine-request-file">
                    <span>{upload ? "Replace spine image" : "Choose AI spine image"}</span>
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectSpineImage(request.id, event.target.files?.[0])} />
                  </label>
                  {upload ? (
                    <>
                      <small className="spine-request-filename">{upload.name}</small>
                      <label className="spine-request-mode">Typography
                        <select
                          value={upload.mode}
                          onChange={(event) => setUploads((current) => ({
                            ...current,
                            [request.id]: { ...upload, mode: event.target.value as SharedSpineRenderMode },
                          }))}
                        >
                          <option value="integrated">Included in the image</option>
                          <option value="overlay">Add shelf title over it</option>
                        </select>
                      </label>
                    </>
                  ) : null}
                </section>
              ) : null}
              <div className="spine-request-actions">
                {request.status !== "completed" ? <button disabled={busyId === request.id} onClick={() => setStatus(request.requestIds, "in_progress")}>Start</button> : null}
                {request.status !== "completed" && request.status !== "declined" ? <button disabled={busyId === request.id || !upload} onClick={() => void submitSpine(request)}>{busyId === request.id ? "Publishing…" : "Publish & complete"}</button> : null}
                {request.status !== "completed" ? <button disabled={busyId === request.id} onClick={() => setStatus(request.requestIds, "declined")}>Decline</button> : null}
                {request.status === "completed" && publishedImage ? <small>Published to the shared spine catalog.</small> : null}
              </div>
            </div>
          </article>
          );
        }) : !message ? <div className="spine-request-empty">No active requests. The queue is clear.</div> : null}
      </div>
      <section className={`spine-finished-section${finishedOpen ? " is-open" : ""}`}>
        <button className="spine-finished-toggle" aria-expanded={finishedOpen} onClick={() => setFinishedOpen((open) => !open)}><span><span className="eyebrow">ARCHIVE</span><strong>Finished ({finishedRequests.length})</strong></span><span aria-hidden="true">⌄</span></button>
        {finishedOpen ? <div className="spine-finished-list">{finishedRequests.map((request) => {
          const image = publishedSpineUrl(request);
          const book = { id: request.book_key, title: request.title, author: request.author, isbn: request.isbn, asin: request.asin };
          return <article className="spine-finished-row" key={request.id}><div className="spine-finished-images">{request.cover_url ? <img src={request.cover_url} alt="" /> : <div className="spine-request-cover-placeholder">No cover</div>}{image ? <img src={image} alt="" /> : null}</div><div className="spine-finished-copy"><span className={`spine-request-status status-${request.status}`}>{STATUS_LABELS[request.status]}</span><h3>{request.title}</h3><p>{request.author || "Unknown author"}</p><small>{request.status === "completed" ? "Completed" : "Closed"} {new Date(request.updated_at || request.created_at).toLocaleDateString()}</small></div><div className="spine-finished-actions">{image ? <a href={image} target="_blank" rel="noreferrer">View spines</a> : null}<button onClick={() => setUploadBook(book)}>＋ Add another spine</button></div></article>;
        })}</div> : null}
      </section>
      {uploadBook !== undefined ? <GlobalSpineUpload initialBook={uploadBook || undefined} onClose={() => setUploadBook(undefined)} /> : null}
    </main>
  );
}
