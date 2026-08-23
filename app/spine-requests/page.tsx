"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  requested_by: string | null;
  fulfilled_spine_id: string | null;
  spines?: { storage_path?: string | null } | null;
};

type SpineRequestGroup = SpineRequest & { requestIds: string[]; recommendationCount: number };
type SpineUpload = { image: string; name: string; mode: SharedSpineRenderMode };

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

export default function SpineRequestsPage() {
  const [requests, setRequests] = useState<SpineRequest[]>([]);
  const [message, setMessage] = useState("Loading spine requests…");
  const [busyId, setBusyId] = useState<string>();
  const [uploads, setUploads] = useState<Record<string, SpineUpload>>({});

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
      select: "id,book_key,title,author,isbn,asin,cover_url,status,curator_note,created_at,requested_by,fulfilled_spine_id,spines(storage_path)",
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
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ status, ...(fulfilledSpineId ? { fulfilled_spine_id: fulfilledSpineId } : {}) }),
    });
    setBusyId(undefined);
    if (response.ok) {
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
      setMessage(`Published the spine for ${request.title} and completed ${request.recommendationCount} request${request.recommendationCount === 1 ? "" : "s"}.`);
    } catch (error) {
      setBusyId(undefined);
      setMessage(error instanceof Error ? error.message : "Could not publish that spine.");
    }
  }

  return (
    <main className="spine-request-queue">
      <header>
        <p className="eyebrow">SHELF OF FAME · CURATOR</p>
        <h1>AI spine requests</h1>
        <p>Books readers want turned into polished Shelf of Fame spines.</p>
      </header>
      {message ? <p role="status">{message}</p> : null}
      <div className="spine-request-list">
        {groupedRequests.map((request) => {
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
        })}
      </div>
    </main>
  );
}
