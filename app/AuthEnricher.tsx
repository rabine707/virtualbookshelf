"use client";

import { FormEvent, useEffect, useState } from "react";

const SUPABASE_URL = "https://vrkuimrfdkejfhpxlwlf.supabase.co";
const SUPABASE_KEY = "sb_publishable_mf0u925xGBkP4iNgxSCjuQ_H4Dp8r1S";
const SESSION_KEY = "shelf-of-fame-supabase-session";

type Session = { access_token: string; refresh_token?: string; user?: { email?: string } };

async function auth(path: string, body: object) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.msg || data?.message || data?.error_description || "Account request failed");
  return data;
}

export default function AuthEnricher() {
  const [session, setSession] = useState<Session | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try { const raw = localStorage.getItem(SESSION_KEY); if (raw) setSession(JSON.parse(raw)); } catch {}
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    try {
      const data = mode === "login"
        ? await auth("token?grant_type=password", { email, password })
        : await auth("signup", { email, password, data: { display_name: email.split("@")[0] } });
      if (data.access_token) {
        const next = { access_token: data.access_token, refresh_token: data.refresh_token, user: data.user };
        localStorage.setItem(SESSION_KEY, JSON.stringify(next));
        setSession(next); setOpen(false);
        window.dispatchEvent(new CustomEvent("shelf-auth-changed", { detail: next }));
      } else {
        setMessage("Account created! Check your email to confirm it, then sign in.");
        setMode("login");
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not continue"); }
    finally { setBusy(false); }
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY); setSession(null); setOpen(false);
    window.dispatchEvent(new CustomEvent("shelf-auth-changed", { detail: null }));
  }

  return <>
    <div className="sof-account">
      {session ? <>
        <span className="sof-account-email">{session.user?.email || "Signed in"}</span>
        <button type="button" onClick={logout}>Sign out</button>
      </> : <button type="button" onClick={() => setOpen(true)}>Sign in / Create account</button>}
    </div>
    {open && !session && <div className="sof-auth-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="sof-auth-card" role="dialog" aria-modal="true" aria-label="Shelf of Fame account">
        <button className="sof-auth-close" type="button" onClick={() => setOpen(false)} aria-label="Close">×</button>
        <div className="sof-auth-brand">SHELF OF FAME</div>
        <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
        <p>Your shelf stays yours. Community spine artwork can help everyone.</p>
        <form onSubmit={submit}>
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} required /></label>
          {message && <div className="sof-auth-message">{message}</div>}
          <button className="sof-auth-primary" type="submit" disabled={busy}>{busy ? "Working…" : mode === "login" ? "Sign in" : "Create account"}</button>
        </form>
        <button className="sof-auth-switch" type="button" onClick={() => { setMessage(""); setMode(mode === "login" ? "signup" : "login"); }}>
          {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>}
  </>;
}
