"use client";

import { useEffect, useState } from "react";
import {
  AUTH_CHANGED_EVENT,
  SUPABASE_KEY,
  SUPABASE_URL,
  readStoredShelfSession,
} from "../spine-request-client";
import { spineRequestBookKey } from "../../lib/spine-requests";

type SpineRequestButtonProps = {
  title: string;
  author: string;
  coverUrl?: string;
  isbn?: string;
  asin?: string;
};

type RequestState = "idle" | "checking" | "sending" | "requested" | "sign-in" | "error";

export function SpineRequestButton({ title, author, coverUrl, isbn, asin }: SpineRequestButtonProps) {
  const [state, setState] = useState<RequestState>("idle");
  const [message, setMessage] = useState("");
  const bookKey = spineRequestBookKey({ title, author, isbn, asin });

  useEffect(() => {
    let cancelled = false;

    async function checkRequest() {
      setMessage("");
      const session = readStoredShelfSession();
      if (!session?.access_token) {
        if (!cancelled) setState("sign-in");
        return;
      }

      setState("checking");
      const query = new URLSearchParams({
        select: "id,status",
        book_key: `eq.${bookKey}`,
        status: "in.(pending,in_progress)",
        limit: "1",
      });
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/spine_requests?${query}`, {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Could not check spine requests.");
        const rows = await response.json() as Array<{ status: string }>;
        if (!cancelled) {
          setState(rows.length ? "requested" : "idle");
          setMessage(rows[0]?.status === "in_progress" ? "Your request is being worked on." : "");
        }
      } catch {
        if (!cancelled) {
          // The status lookup is optional; keep the request action available.
          setState("idle");
          setMessage("");
        }
      }
    }

    void checkRequest();
    window.addEventListener(AUTH_CHANGED_EVENT, checkRequest);
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_CHANGED_EVENT, checkRequest);
    };
  }, [bookKey]);

  async function requestSpine() {
    const session = readStoredShelfSession();
    const userId = session?.user?.id;
    if (!session?.access_token || !userId) {
      setState("sign-in");
      setMessage("Sign in to send a request.");
      return;
    }

    setState("sending");
    setMessage("");
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/spine_requests`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          requested_by: userId,
          book_key: bookKey,
          title,
          author,
          isbn: isbn || null,
          asin: asin || null,
          cover_url: coverUrl || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null) as { code?: string } | null;
        if (response.status === 409 || error?.code === "23505") {
          setState("requested");
          return;
        }
        throw new Error("Request failed");
      }

      setState("requested");
      setMessage("Sent to the Shelf of Fame spine queue.");
    } catch {
      setState("error");
      setMessage("Could not send your request. Please try again.");
    }
  }

  const label = state === "sending"
    ? "Sending request…"
    : state === "requested"
      ? "✓ AI spine requested"
      : state === "sign-in"
        ? "Sign in to request an AI spine"
        : "✦ Request a handcrafted AI spine";

  return (
    <div className="spine-request-control">
      <button
        type="button"
        className="primary spine-request-button"
        disabled={state === "checking" || state === "sending" || state === "requested"}
        onClick={requestSpine}
      >
        {state === "checking" ? "Checking requests…" : label}
      </button>
      <small role="status">
        {message || (state === "idle" ? "Ask the curator to make a polished spine for this edition." : "")}
      </small>
    </div>
  );
}
