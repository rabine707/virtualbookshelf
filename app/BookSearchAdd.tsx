"use client";

import { Dispatch, FormEvent, SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Book } from "../lib/books/client-library";
import { addTypedBook, BookSearchResult, mergeBookSearchResult } from "../lib/books/add-book";

type BookSearchAddProps = {
  books: Book[];
  setBooks: Dispatch<SetStateAction<Book[]>>;
  showToast: (message: string) => void;
  onImportGoodreads: () => void;
};

export default function BookSearchAdd({ books, setBooks, showToast, onImportGoodreads }: BookSearchAddProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [message, setMessage] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(async (nextTitle: string, nextAuthor: string) => {
    const cleanTitle = nextTitle.replace(/\s+/g, " ").trim();
    const cleanAuthor = nextAuthor.replace(/\s+/g, " ").trim();

    if (cleanTitle.length < 2) {
      requestRef.current?.abort();
      setResults([]);
      setSearched(false);
      setSearching(false);
      setMessage("");
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setSearching(true);
    setMessage("");

    try {
      const params = new URLSearchParams({ title: cleanTitle });
      if (cleanAuthor) params.set("author", cleanAuthor);
      const response = await fetch(`/api/book-search?${params.toString()}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      const payload = await response.json() as { results?: BookSearchResult[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not search for books.");

      setResults(Array.isArray(payload.results) ? payload.results : []);
      setSearched(true);
    } catch (error) {
      if (controller.signal.aborted) return;
      setResults([]);
      setSearched(true);
      setMessage(error instanceof Error ? error.message : "Could not search for books.");
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  }, []);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem("shelf-open-book-search-on-load") === "1") {
        window.sessionStorage.removeItem("shelf-open-book-search-on-load");
        setOpen(true);
      }
    } catch {
      // Navigation still succeeds even if session storage is unavailable.
    }

    const openSearch = () => setOpen(true);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("shelf-open-book-search", openSearch);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("shelf-open-book-search", openSearch);
      document.removeEventListener("keydown", onKey);
      requestRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("book-search-add-open");
    requestAnimationFrame(() => titleRef.current?.focus());
    return () => document.body.classList.remove("book-search-add-open");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void runSearch(title, author);
    }, 480);
    return () => window.clearTimeout(timer);
  }, [author, open, runSearch, title]);

  function close() {
    requestRef.current?.abort();
    setOpen(false);
  }

  function resetForm() {
    setTitle("");
    setAuthor("");
    setResults([]);
    setSearched(false);
    setSearching(false);
    setMessage("");
  }

  function finishSuccess(nextBooks: Book[], successMessage: string) {
    setBooks(nextBooks);
    showToast(successMessage);
    close();
    resetForm();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void runSearch(title, author);
  }

  function choose(result: BookSearchResult) {
    const saved = mergeBookSearchResult(books, result, title, author);
    const successMessage = saved.replaced
      ? `Fixed your existing entry to ${saved.title} — ${saved.author}.`
      : saved.existed
        ? `${saved.title} is already on your shelf. I refreshed its book details.`
        : `Added ${saved.title} — ${saved.author}.`;
    finishSuccess(saved.books, successMessage);
  }

  function useTypedEntry() {
    const result = addTypedBook(books, title, author);
    setMessage(result.message);
    if (result.ok) finishSuccess(result.books, result.message);
  }

  function importGoodreads() {
    close();
    onImportGoodreads();
  }

  if (!open) return null;

  return createPortal(
    <>
      <style>{`
        .book-search-add-backdrop { position: fixed; inset: 0; z-index: 260; display: grid; place-items: center; padding: 22px; background: rgba(8, 7, 6, .72); backdrop-filter: blur(12px); }
        .book-search-add-card { width: min(680px, 100%); max-height: min(82vh, 820px); overflow: hidden; display: flex; flex-direction: column; border: 1px solid rgba(255,255,255,.12); border-radius: 24px; background: #171713; color: #f4eadb; box-shadow: 0 28px 80px rgba(0,0,0,.52); }
        .book-search-add-header { display: grid; grid-template-columns: 1fr auto; gap: 14px; align-items: start; padding: 22px 22px 14px; }
        .book-search-add-header small { display: block; margin-bottom: 5px; color: #a99073; font-size: 10px; font-weight: 800; letter-spacing: .16em; }
        .book-search-add-header h2 { margin: 0; font-size: clamp(26px, 5vw, 38px); line-height: 1; }
        .book-search-add-header p { margin: 8px 0 0; color: rgba(244,234,219,.64); font-size: 13px; line-height: 1.4; }
        .book-search-add-close { width: 44px; height: 44px; border: 0; border-radius: 50%; background: rgba(255,255,255,.06); color: inherit; font-size: 25px; cursor: pointer; }
        .book-search-add-form { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, .8fr) auto; gap: 9px; padding: 0 22px 14px; }
        .book-search-add-form label { display: grid; gap: 5px; }
        .book-search-add-form label span { color: rgba(244,234,219,.62); font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
        .book-search-add-form input { min-width: 0; height: 46px; padding: 0 13px; border: 1px solid rgba(255,255,255,.12); border-radius: 12px; outline: none; background: rgba(255,255,255,.055); color: inherit; font: inherit; font-size: 16px; }
        .book-search-add-form input:focus { border-color: rgba(244,234,219,.42); background: rgba(255,255,255,.075); }
        .book-search-add-submit { align-self: end; min-height: 46px; padding: 0 16px; border: 1px solid rgba(255,255,255,.14); border-radius: 12px; background: #4c3528; color: inherit; font: inherit; font-weight: 800; cursor: pointer; }
        .book-search-add-hint { padding: 0 22px 11px; color: rgba(244,234,219,.5); font-size: 11px; }
        .book-search-add-results { min-height: 116px; overflow-y: auto; padding: 0 14px 12px; }
        .book-search-add-status { display: grid; place-items: center; min-height: 105px; padding: 20px; color: rgba(244,234,219,.62); text-align: center; font-size: 13px; }
        .book-search-result { width: 100%; display: grid; grid-template-columns: 52px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 9px; border: 1px solid transparent; border-radius: 14px; background: transparent; color: inherit; text-align: left; cursor: pointer; }
        .book-search-result:hover, .book-search-result:focus-visible { border-color: rgba(255,255,255,.12); background: rgba(255,255,255,.055); }
        .book-search-result-cover { width: 52px; height: 76px; overflow: hidden; display: grid; place-items: center; border-radius: 7px; background: #302a24; color: rgba(244,234,219,.45); font-size: 20px; box-shadow: 0 4px 12px rgba(0,0,0,.24); }
        .book-search-result-cover img { width: 100%; height: 100%; object-fit: cover; }
        .book-search-result-copy { min-width: 0; display: grid; gap: 3px; }
        .book-search-result-copy strong { overflow: hidden; text-overflow: ellipsis; font-size: 15px; line-height: 1.25; }
        .book-search-result-copy span { color: rgba(244,234,219,.7); font-size: 12px; }
        .book-search-result-copy small { color: rgba(244,234,219,.45); font-size: 10px; }
        .book-search-result-add { padding: 7px 9px; border-radius: 999px; background: rgba(255,255,255,.08); font-size: 10px; font-weight: 800; }
        .book-search-best { margin-left: 6px; color: #c8ae8b; font-size: 9px; letter-spacing: .05em; text-transform: uppercase; }
        .book-search-add-message { margin: 0 22px 12px; padding: 9px 11px; border-radius: 10px; background: rgba(255,255,255,.055); color: rgba(244,234,219,.76); font-size: 12px; }
        .book-search-add-fallback { padding: 0 22px 15px; text-align: center; }
        .book-search-add-fallback button { border: 0; background: transparent; color: rgba(244,234,219,.58); font: inherit; font-size: 11px; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
        .book-search-add-imports { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 11px; align-items: stretch; padding: 14px 22px 22px; border-top: 1px solid rgba(255,255,255,.08); }
        .book-search-goodreads { display: grid; gap: 9px; padding: 13px; border: 1px solid rgba(205,166,116,.18); border-radius: 14px; background: rgba(205,166,116,.055); }
        .book-search-goodreads-copy strong { display: block; margin-bottom: 4px; color: #ead5b6; font-size: 13px; }.book-search-goodreads-copy p { margin: 0; color: rgba(244,234,219,.58); font-size: 10px; line-height: 1.45; }
        .book-search-goodreads-steps { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }.book-search-goodreads-steps a,.book-search-goodreads-steps button,.book-search-scan { min-height: 44px; display: grid; place-items: center; box-sizing: border-box; padding: 8px 10px; border: 1px solid rgba(255,255,255,.1); border-radius: 11px; background: rgba(255,255,255,.045); color: inherit; font: inherit; font-size: 11px; font-weight: 800; text-align: center; text-decoration: none; cursor: pointer; }.book-search-goodreads-steps a { border-color: rgba(205,166,116,.32); background: rgba(205,166,116,.13); color: #f0d8b5; }
        .book-search-scan { min-width: 150px; }
        .book-search-add-imports button:disabled { opacity: .45; cursor: default; }
        body.book-search-add-open { overflow: hidden !important; }
        @media (max-width: 760px) {
          .book-search-add-backdrop { place-items: end center; padding: 0; }
          .book-search-add-card { width: 100%; max-height: min(88svh, 860px); border-radius: 24px 24px 0 0; border-bottom: 0; padding-bottom: env(safe-area-inset-bottom); }
          .book-search-add-header { padding: 19px 17px 12px; }
          .book-search-add-header h2 { font-size: 31px; }
          .book-search-add-form { grid-template-columns: 1fr 1fr; padding: 0 17px 12px; }
          .book-search-add-submit { grid-column: 1 / -1; }
          .book-search-add-hint { padding-inline: 17px; }
          .book-search-add-results { padding-inline: 9px; }
          .book-search-result { grid-template-columns: 48px minmax(0, 1fr) auto; gap: 9px; padding: 8px; }
          .book-search-result-cover { width: 48px; height: 70px; }
          .book-search-result-add { padding-inline: 7px; }
          .book-search-add-message, .book-search-add-fallback { margin-left: 17px; margin-right: 17px; }
          .book-search-add-imports { grid-template-columns: 1fr; padding: 12px 17px 15px; }.book-search-goodreads-steps { grid-template-columns: 1fr; }.book-search-scan { min-width: 0; }
        }
      `}</style>

      <div className="book-search-add-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
        <section className="book-search-add-card" role="dialog" aria-modal="true" aria-label="Add books">
          <header className="book-search-add-header">
            <div><small>YOUR LIBRARY</small><h2>Add books</h2><p>Type what you remember. We’ll find the likely book before anything is saved.</p></div>
            <button className="book-search-add-close" type="button" onClick={close} aria-label="Close">×</button>
          </header>
          <form className="book-search-add-form" onSubmit={submit}>
            <label><span>Title</span><input ref={titleRef} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Church" autoComplete="off" /></label>
            <label><span>Author</span><input value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="Reuss" autoComplete="off" /></label>
            <button className="book-search-add-submit" type="submit" disabled={title.trim().length < 2 || searching}>{searching ? "Searching…" : "Search"}</button>
          </form>
          <div className="book-search-add-hint">Results update automatically — partial names are okay.</div>
          <div className="book-search-add-results" aria-live="polite">
            {results.map((result, index) => (
              <button key={`${result.id}-${index}`} className="book-search-result" type="button" onClick={() => choose(result)}>
                <span className="book-search-result-cover">{result.coverUrl ? <img src={result.coverUrl} alt="" /> : <span aria-hidden="true">▤</span>}</span>
                <span className="book-search-result-copy"><strong>{result.title}{index === 0 ? <span className="book-search-best">Best match</span> : null}</strong><span>{result.author}</span><small>{[result.year, result.isbn ? `ISBN ${result.isbn}` : ""].filter(Boolean).join(" · ")}</small></span>
                <span className="book-search-result-add">Add</span>
              </button>
            ))}
            {!results.length && searching ? <div className="book-search-add-status">Searching books…</div> : null}
            {!results.length && !searching && searched ? <div className="book-search-add-status">No confident matches yet. Try a little more of the title or author.</div> : null}
            {!searched && !searching ? <div className="book-search-add-status">Start typing a title and, if you know it, part of the author’s name.</div> : null}
          </div>
          {message ? <div className="book-search-add-message" role="status">{message}</div> : null}
          {searched && title.trim() ? <div className="book-search-add-fallback"><button type="button" onClick={useTypedEntry}>Can’t find it? Add exactly “{title.trim()}”{author.trim() ? ` by ${author.trim()}` : ""}.</button></div> : null}
          <div className="book-search-add-imports"><section className="book-search-goodreads" aria-labelledby="goodreads-import-title"><div className="book-search-goodreads-copy"><strong id="goodreads-import-title">Bring over your Goodreads library</strong><p>On iPhone, Goodreads cannot export from its app. Open the export page in Safari, sign in, tap “Export Library,” then download the CSV to Files.</p></div><div className="book-search-goodreads-steps"><a href="https://www.goodreads.com/review/import" target="_blank" rel="noreferrer">1. Get my Goodreads file ↗</a><button type="button" onClick={importGoodreads}>2. Choose downloaded CSV</button></div></section><button className="book-search-scan" type="button" disabled title="Bookshelf photo scanning is coming soon">📷 Scan bookshelf · Soon</button></div>
        </section>
      </div>
    </>,
    document.body,
  );
}
