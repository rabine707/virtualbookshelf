"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import styles from "./support.module.css";

const SUPABASE_URL = "https://vrkuimrfdkejfhpxlwlf.supabase.co";
const SUPABASE_KEY = "sb_publishable_mf0u925xGBkP4iNgxSCjuQ_H4Dp8r1S";
const SESSION_KEY = "shelf-of-fame-supabase-session";

type Session = { access_token?: string; user?: { id?: string } };
type CreatedRequest = { id: string; created_at: string };

function session(): Session | null {
  try { return JSON.parse(window.localStorage.getItem(SESSION_KEY) || "null") as Session | null; }
  catch { return null; }
}

export default function SupportRequestForm() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");

  useEffect(() => { setSignedIn(Boolean(session()?.access_token)); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentSession = session();
    if (!currentSession?.access_token || !currentSession.user?.id) {
      setSignedIn(false);
      return;
    }

    const form = event.currentTarget;
    const data = new FormData(form);
    setSending(true);
    setError("");
    setReference("");

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/support_requests?select=id,created_at`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${currentSession.access_token}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          user_id: currentSession.user.id,
          category: String(data.get("category") || "other"),
          subject: String(data.get("subject") || "").trim(),
          message: String(data.get("message") || "").trim(),
          affected_page: String(data.get("affectedPage") || "").trim() || null,
        }),
      });
      const result = await response.json() as CreatedRequest[] | { message?: string };
      if (!response.ok || !Array.isArray(result) || !result[0]) {
        throw new Error(!Array.isArray(result) && result.message ? result.message : "Could not send your request.");
      }
      setReference(result[0].id.slice(0, 8).toUpperCase());
      form.reset();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Could not send your request.");
    } finally {
      setSending(false);
    }
  }

  if (signedIn === null) return <section className={styles.panel} aria-label="Contact support">Checking your account…</section>;

  if (!signedIn) {
    return <section className={styles.panel} aria-label="Contact support">
      <h2>Contact support</h2>
      <p><Link href="/account">Sign in</Link> to send a private request and receive a reference number.</p>
    </section>;
  }

  return <section className={styles.panel} aria-labelledby="support-form-title">
    <h2 id="support-form-title">Contact support</h2>
    <p>Tell us what went wrong. Your request is private and connected to your account.</p>
    <form className={styles.form} onSubmit={submit}>
      <label>
        What do you need help with?
        <select name="category" defaultValue="import">
          <option value="account">Account or sign-in</option>
          <option value="import">Book import</option>
          <option value="cover">Cover or spine</option>
          <option value="shelf">Shelf display</option>
          <option value="bug">Something is broken</option>
          <option value="other">Something else</option>
        </select>
      </label>
      <label>
        Short summary
        <input name="subject" required minLength={3} maxLength={120} placeholder="Example: My Goodreads import stopped early" />
      </label>
      <label>
        What happened?
        <textarea name="message" required minLength={10} maxLength={2000} rows={6} placeholder="What did you try, what happened, and what did you expect?" />
      </label>
      <label>
        Affected page <span>(optional)</span>
        <input name="affectedPage" maxLength={500} placeholder="Example: Account → Import books" />
      </label>
      <p className={styles.privacy}>Do not include passwords, payment information, or private library files.</p>
      <button type="submit" disabled={sending}>{sending ? "Sending…" : "Send request"}</button>
    </form>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {reference && <p className={styles.success} role="status">Request sent. Your reference is <strong>{reference}</strong>.</p>}
  </section>;
}
