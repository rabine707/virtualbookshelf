"use client";

import { useEffect, useState } from "react";
import { spineRequestBookKey } from "../../lib/spine-requests";

type SpineRequestButtonProps = {
  title: string;
  author: string;
  coverUrl?: string;
  isbn?: string;
  asin?: string;
};

type RequestState = "idle" | "checking" | "sending" | "requested" | "completed" | "duplicate" | "error";

export function SpineRequestButton({ title, author, coverUrl, isbn, asin }: SpineRequestButtonProps) {
  const [state, setState] = useState<RequestState>("idle");
  const [message, setMessage] = useState("");
  const bookKey = spineRequestBookKey({ title, author, isbn, asin });

  useEffect(() => {
    let cancelled = false;
    setState("checking");
    setMessage("");
    const query = new URLSearchParams({ title, author, ...(isbn ? { isbn } : {}), ...(asin ? { asin } : {}) });
    void fetch(`/api/spine-requests?${query}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { status?: string | null }) => {
        if (cancelled) return;
        if (data.status === "completed") {
          setState("completed");
          setMessage("Your custom spine is ready in the Spine Selector.");
        } else if (data.status === "pending" || data.status === "in_progress") {
          setState("requested");
          setMessage(data.status === "in_progress" ? "A curator is working on this spine." : "Sent to the curator queue.");
        } else setState("idle");
      })
      .catch(() => { if (!cancelled) setState("idle"); });
    return () => { cancelled = true; };
  }, [asin, author, bookKey, isbn, title]);

  async function requestSpine() {
    setState("sending");
    setMessage("");
    try {
      const response = await fetch("/api/spine-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, author, coverUrl, isbn, asin }),
      });
      const data = await response.json().catch(() => null) as { error?: string; duplicate?: boolean } | null;
      if (!response.ok) throw new Error(data?.error || "Could not send this recommendation.");

      if (data?.duplicate) {
        setState("duplicate");
        setMessage("This custom spine has already been requested.");
      } else {
        setState("requested");
        setMessage("Custom spine requested and sent to the curator queue.");
      }
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Could not send this recommendation.");
    }
  }

  const complete = state === "requested" || state === "completed" || state === "duplicate";
  return (
    <div className="spine-request-control">
      <button
        type="button"
        className="primary spine-request-button"
        disabled={state === "sending" || state === "checking" || complete}
        onClick={requestSpine}
      >
        {state === "checking" ? "Checking request…" : state === "sending" ? "Sending…" : state === "completed" ? "✓ Custom Spine Ready" : complete ? "✓ Custom Spine Requested" : "✦ Request a Custom Spine"}
      </button>
      <small role="status">{message || "Ask a curator to create a spine for this book."}</small>
    </div>
  );
}
