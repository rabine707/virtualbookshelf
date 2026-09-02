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
type SpineUpload = { image: string; name: string; mode: SharedSpineRenderMode; type: SpineType };
type CatalogBook = { id:string; title:string; author:string; isbn:string|null; asin:string|null };
type CatalogSpine = { id:string; storage_path:string; provider?:string|null; model?:string|null; created_at:string };
type SpineType = "clothbound" | "dust-jacket" | "special-edition";
const SPINE_TYPES: Array<{ value: SpineType; label: string }> = [{ value: "clothbound", label: "Clothbound" }, { value: "dust-jacket", label: "Full-color dust jacket" }, { value: "special-edition", label: "Special edition" }];

function readSpineFiles(files: FileList | File[]) {
  const valid = [...files].filter((file) => /^image\/(?:png|jpe?g|webp)$/i.test(file.type) && file.size <= 12 * 1024 * 1024).slice(0, 12);
  return Promise.all(valid.map((file, index) => new Promise<SpineUpload>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve({ image: reader.result, name: file.name, mode: "integrated", type: SPINE_TYPES[index % SPINE_TYPES.length].value }) : reject(new Error("Could not read image"));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  })));
}

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
  const [uploads, setUploads] = useState<SpineUpload[]>([]);
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

  async function chooseFiles(files?: FileList | null) {
    if (!files?.length) return;
    const next = await readSpineFiles(files);
    setUploads(next);
    setMessage(next.length === files.length ? "" : "Some files were skipped. Use PNG, JPEG, or WebP images under 12 MB.");
  }

  async function publish() {
    if (!book || !uploads.length) return;
    setBusy(true); setMessage("");
    try {
      for (let index = 0; index < uploads.length; index += 1) {
        setMessage(`Publishing ${index + 1} of ${uploads.length}…`);
        const upload = uploads[index];
        const result = await publishSharedSpine({ title: book.title, author: book.author, isbn: book.isbn || undefined, asin: book.asin || undefined }, upload.image, "", `curator-${upload.type}`, upload.type);
        if (!result.shared) throw new Error("This account cannot publish shared spines.");
      }
      setMessage(`Published ${uploads.length} spine${uploads.length === 1 ? "" : "s"} to the shared catalog.`);
      window.setTimeout(onClose, 700);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not publish that spine."); }
    finally { setBusy(false); }
  }

  return <div className="curator-upload-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="curator-upload-dialog" role="dialog" aria-modal="true" aria-labelledby="curator-upload-title"><header><div><span className="eyebrow">CURATOR UPLOAD</span><h2 id="curator-upload-title">Upload spines</h2><p>Publish one image or a complete spine set to any Shelf of Fame book.</p></div><button onClick={onClose} aria-label="Close">×</button></header><div className="curator-upload-form"><label><span>1 · Choose a book</span><input value={query} onChange={(event) => { setQuery(event.target.value); setBook(undefined); }} placeholder="Search by title or author" /></label>{book ? <div className="curator-selected-book"><div><strong>{book.title}</strong><small>{book.author || "Unknown author"}</small></div><button onClick={() => { setBook(undefined); setQuery(""); }}>Change</button></div> : null}{!book && results.length ? <div className="curator-book-results">{results.map((result) => <button key={result.id} onClick={() => { setBook(result); setQuery(result.title); }}><strong>{result.title}</strong><small>{result.author || "Unknown author"}</small></button>)}</div> : null}<label className="curator-upload-file"><span>{uploads.length ? `Replace ${uploads.length} selected image${uploads.length === 1 ? "" : "s"}` : "2 · Choose one or more spine images"}</span><input type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={(event) => void chooseFiles(event.target.files)} /></label>{uploads.length ? <div className="curator-upload-batch">{uploads.map((upload, index) => <div className="curator-upload-item" key={`${upload.name}-${index}`}><img src={upload.image} alt="" /><div><strong>{upload.name}</strong><select value={upload.type} onChange={(event) => setUploads((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, type: event.target.value as SpineType } : item))}>{SPINE_TYPES.map((type) => <option value={type.value} key={type.value}>{type.label}</option>)}</select></div><button aria-label={`Remove ${upload.name}`} onClick={() => setUploads((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button></div>)}</div> : null}</div>{message ? <p className="curator-upload-message" role="status">{message}</p> : null}<footer><button onClick={onClose}>Cancel</button><button className="primary" disabled={!book || !uploads.length || busy} onClick={() => void publish()}>{busy ? "Publishing…" : `Publish ${uploads.length || ""} spine${uploads.length === 1 ? "" : "s"}`}</button></footer></section></div>;
}

function SpineGalleryDialog({ book, onClose, onAdd, onDeleted }: { book: CatalogBook; onClose: () => void; onAdd: () => void; onDeleted: () => void }) {
  const [rows, setRows] = useState<CatalogSpine[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string>();
  const [busyId, setBusyId] = useState<string>();
  const [message, setMessage] = useState("");

  const loadSpines = useCallback(async () => {
    const session = readStoredShelfSession();
    if (!session?.access_token) return;
    setLoading(true);
    const identity = book.isbn ? `isbn=eq.${encodeURIComponent(book.isbn)}` : book.asin ? `asin=eq.${encodeURIComponent(book.asin)}` : `title=eq.${encodeURIComponent(book.title)}&author=eq.${encodeURIComponent(book.author)}`;
    const response = await fetch(`${SUPABASE_URL}/rest/v1/books?select=spines(id,storage_path,provider,model,created_at)&${identity}&limit=1`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
    const books = response.ok ? await response.json() as Array<{ spines?: CatalogSpine[] }> : [];
    setRows((books[0]?.spines || []).sort((a, b) => b.created_at.localeCompare(a.created_at)));
    setLoading(false);
  }, [book]);

  useEffect(() => { void loadSpines(); }, [loadSpines]);

  async function deleteSpine(spine: CatalogSpine) {
    const session = readStoredShelfSession();
    if (!session?.access_token) return;
    setBusyId(spine.id); setMessage("Deleting spine…");
    const response = await fetch(`/api/curator/spines/${encodeURIComponent(spine.id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}` } });
    const result = await response.json().catch(() => null) as { error?: string } | null;
    setBusyId(undefined); setConfirmId(undefined);
    if (!response.ok) { setMessage(result?.error || "Could not delete that spine."); return; }
    setRows((current) => current.filter((row) => row.id !== spine.id));
    setMessage("Spine deleted from the system.");
    window.dispatchEvent(new CustomEvent("shelf-spine-gallery-changed"));
    onDeleted();
  }

  return <div className="curator-upload-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="curator-upload-dialog curator-gallery-dialog" role="dialog" aria-modal="true" aria-labelledby="curator-gallery-title"><header><div><span className="eyebrow">PUBLISHED SPINES</span><h2 id="curator-gallery-title">{book.title}</h2><p>{book.author || "Unknown author"}</p></div><button onClick={onClose} aria-label="Close">×</button></header>{message ? <p className="curator-upload-message" role="status">{message}</p> : null}<div className="curator-spine-gallery">{loading ? <p>Loading spines…</p> : rows.length ? rows.map((spine) => <figure key={spine.id}><img src={`${SUPABASE_URL}/storage/v1/object/public/spines/${spine.storage_path.split("/").map(encodeURIComponent).join("/")}`} alt={`${book.title} spine`} /><figcaption><span>{(spine.provider || "Published").replace("curator-", "").replaceAll("-", " ")}</span>{confirmId === spine.id ? <span className="curator-delete-confirm"><strong>Delete permanently?</strong><button disabled={busyId === spine.id} onClick={() => void deleteSpine(spine)}>{busyId === spine.id ? "Deleting…" : "Yes, delete"}</button><button disabled={busyId === spine.id} onClick={() => setConfirmId(undefined)}>Cancel</button></span> : <button className="curator-delete-spine" onClick={() => setConfirmId(spine.id)}>Delete spine</button>}</figcaption></figure>) : <p>No published spines found for this book yet.</p>}</div><footer><button onClick={onClose}>Close</button><button className="primary" onClick={onAdd}>Add another spine</button></footer></section></div>;
}

export default function SpineRequestsPage() {
  const [requests, setRequests] = useState<SpineRequest[]>([]);
  const [message, setMessage] = useState("Loading spine requests…");
  const [busyId, setBusyId] = useState<string>();
  const [uploads, setUploads] = useState<Record<string, SpineUpload[]>>({});
  const [finishedOpen, setFinishedOpen] = useState(false);
  const [uploadBook, setUploadBook] = useState<CatalogBook | null | undefined>(undefined);
  const [galleryBook, setGalleryBook] = useState<CatalogBook | null>(null);

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

  async function selectSpineImages(requestId: string, files?: FileList | null) {
    if (!files?.length) return;
    const next = await readSpineFiles(files);
    setUploads((current) => ({ ...current, [requestId]: next }));
    setMessage(next.length === files.length ? "" : "Some files were skipped. Use PNG, JPEG, or WebP images under 12 MB.");
  }

  async function submitSpine(request: SpineRequestGroup) {
    const selected = uploads[request.id] || [];
    if (!selected.length) {
      setMessage(`Choose the finished spine images for ${request.title} first.`);
      return;
    }
    setBusyId(request.id);
    setMessage(`Publishing the spine for ${request.title}…`);
    try {
      let fulfilledSpineId: string | undefined;
      for (let index = 0; index < selected.length; index += 1) {
        setMessage(`Publishing ${index + 1} of ${selected.length} for ${request.title}…`);
        const upload = selected[index];
        const published = await publishSharedSpine(
          { title: request.title, author: request.author, isbn: request.isbn || undefined, asin: request.asin || undefined },
          upload.image,
          request.cover_url || "",
          upload.mode === "integrated" ? "curator-integrated" : "curator-overlay",
          upload.type,
        );
        if (!published.shared) throw new Error("This account cannot publish shared spines.");
        fulfilledSpineId ||= published.spineId;
      }
      const completed = await setStatus(request.requestIds, "completed", fulfilledSpineId);
      if (!completed) throw new Error("The spine was published, but the request could not be marked complete. Try completing it again.");
      setUploads((current) => {
        const next = { ...current };
        delete next[request.id];
        return next;
      });
      setMessage(completed
        ? `✓ Added ${selected.length} spine${selected.length === 1 ? "" : "s"} to ${request.title}’s Spine Selector.`
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
          const selected = uploads[request.id] || [];
          const publishedImage = publishedSpineUrl(request);
          return (
          <article key={request.id} className="spine-request-card">
            <div className="spine-request-images">
              {request.cover_url ? <img src={request.cover_url} alt="" /> : <div className="spine-request-cover-placeholder">No cover</div>}
              {selected[0] || publishedImage ? <img className="spine-request-upload-preview" src={selected[0]?.image || publishedImage} alt={`Finished spine preview for ${request.title}`} /> : null}
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
                    <span>{selected.length ? `Replace ${selected.length} selected images` : "Choose one or more spine images"}</span>
                    <input type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={(event) => void selectSpineImages(request.id, event.target.files)} />
                  </label>
                  {selected.length ? <div className="spine-request-upload-batch">{selected.map((upload, index) => <div className="spine-request-upload-item" key={`${upload.name}-${index}`}><img src={upload.image} alt="" /><div><small className="spine-request-filename">{upload.name}</small><select value={upload.type} onChange={(event) => setUploads((current) => ({ ...current, [request.id]: selected.map((item, itemIndex) => itemIndex === index ? { ...item, type: event.target.value as SpineType } : item) }))}>{SPINE_TYPES.map((type) => <option value={type.value} key={type.value}>{type.label}</option>)}</select><select value={upload.mode} onChange={(event) => setUploads((current) => ({ ...current, [request.id]: selected.map((item, itemIndex) => itemIndex === index ? { ...item, mode: event.target.value as SharedSpineRenderMode } : item) }))}><option value="integrated">Typography included</option><option value="overlay">Add shelf title</option></select></div><button aria-label={`Remove ${upload.name}`} onClick={() => setUploads((current) => ({ ...current, [request.id]: selected.filter((_, itemIndex) => itemIndex !== index) }))}>×</button></div>)}</div> : null}
                </section>
              ) : null}
              <div className="spine-request-actions">
                {request.status !== "completed" ? <button disabled={busyId === request.id} onClick={() => setStatus(request.requestIds, "in_progress")}>Start</button> : null}
                {request.status !== "completed" && request.status !== "declined" ? <button disabled={busyId === request.id || !selected.length} onClick={() => void submitSpine(request)}>{busyId === request.id ? "Publishing…" : `Publish ${selected.length || ""} & complete`}</button> : null}
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
          return <article className="spine-finished-row" key={request.id}><div className="spine-finished-images">{request.cover_url ? <img src={request.cover_url} alt="" /> : <div className="spine-request-cover-placeholder">No cover</div>}{image ? <img src={image} alt="" /> : null}</div><div className="spine-finished-copy"><span className={`spine-request-status status-${request.status}`}>{STATUS_LABELS[request.status]}</span><h3>{request.title}</h3><p>{request.author || "Unknown author"}</p><small>{request.status === "completed" ? "Completed" : "Closed"} {new Date(request.updated_at || request.created_at).toLocaleDateString()}</small></div><div className="spine-finished-actions">{request.status === "completed" ? <button onClick={() => setGalleryBook(book)}>View spines</button> : null}<button onClick={() => setUploadBook(book)}>＋ Add another spine</button></div></article>;
        })}</div> : null}
      </section>
      {uploadBook !== undefined ? <GlobalSpineUpload initialBook={uploadBook || undefined} onClose={() => setUploadBook(undefined)} /> : null}
      {galleryBook ? <SpineGalleryDialog book={galleryBook} onClose={() => setGalleryBook(null)} onAdd={() => { setUploadBook(galleryBook); setGalleryBook(null); }} onDeleted={() => void load()} /> : null}
    </main>
  );
}
