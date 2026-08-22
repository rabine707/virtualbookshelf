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

type RequestState = "idle" | "sending" | "requested" | "duplicate" | "error";

export function SpineRequestButton({ title, author, coverUrl, isbn, asin }: SpineRequestButtonProps) {
  const [state, setState] = useState<RequestState>("idle");
  const [message, setMessage] = useState("");
  const bookKey = spineRequestBookKey({ title, author, isbn, asin });

  useEffect(() => {
    setState("idle");
    setMessage("");
  }, [bookKey]);

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
        setMessage("This connection already recommended this book.");
      } else {
        setState("requested");
        setMessage("Added to the Shelf of Fame spine list.");
      }
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Could not send this recommendation.");
    }
  }

  const complete = state === "requested" || state === "duplicate";
  return (
    <div className="spine-request-control">
      <button
        type="button"
        className="primary spine-request-button"
        disabled={state === "sending" || complete}
        onClick={requestSpine}
      >
        {state === "sending" ? "Sending…" : complete ? "✓ Spine recommended" : "✦ Recommend an AI spine"}
      </button>
      <small role="status">{message || "Send this book to the curator’s spine list."}</small>
    </div>
  );
}
