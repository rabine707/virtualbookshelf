"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AUTH_CHANGED_EVENT,
  SUPABASE_KEY,
  SUPABASE_URL,
  readStoredShelfSession,
} from "../spine-request-client";
import type { SpineRequestStatus } from "../../lib/spine-requests";

type SpineRequest = {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  asin: string | null;
  cover_url: string | null;
  status: SpineRequestStatus;
  curator_note: string | null;
  created_at: string;
  requested_by: string;
};

const STATUS_LABELS: Record<SpineRequestStatus, string> = {
  pending: "Requested",
  in_progress: "In progress",
  completed: "Completed",
  declined: "Declined",
};

export default function SpineRequestsPage() {
  const [requests, setRequests] = useState<SpineRequest[]>([]);
  const [message, setMessage] = useState("Loading spine requests…");
  const [busyId, setBusyId] = useState<string>();

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
      select: "id,title,author,isbn,asin,cover_url,status,curator_note,created_at,requested_by",
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

  useEffect(() => {
    void load();
    window.addEventListener(AUTH_CHANGED_EVENT, load);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, load);
  }, [load]);

  async function setStatus(id: string, status: SpineRequestStatus) {
    const session = readStoredShelfSession();
    if (!session?.access_token) return;
    setBusyId(id);
    const response = await fetch(`${SUPABASE_URL}/rest/v1/spine_requests?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ status }),
    });
    setBusyId(undefined);
    if (response.ok) await load();
    else setMessage("Could not update that request.");
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
        {requests.map((request) => (
          <article key={request.id} className="spine-request-card">
            {request.cover_url ? <img src={request.cover_url} alt="" /> : <div className="spine-request-cover-placeholder">No cover</div>}
            <div>
              <span className={`spine-request-status status-${request.status}`}>{STATUS_LABELS[request.status]}</span>
              <h2>{request.title}</h2>
              <p>by {request.author || "Unknown author"}</p>
              <small>
                Reader {request.requested_by.slice(0, 8)}
                {` · ${new Date(request.created_at).toLocaleDateString()}`}
              </small>
              <small>{request.isbn ? `ISBN ${request.isbn}` : request.asin ? `ASIN ${request.asin}` : "No identifier"}</small>
              <div className="spine-request-actions">
                <button disabled={busyId === request.id} onClick={() => setStatus(request.id, "in_progress")}>Start</button>
                <button disabled={busyId === request.id} onClick={() => setStatus(request.id, "completed")}>Complete</button>
                <button disabled={busyId === request.id} onClick={() => setStatus(request.id, "declined")}>Decline</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
