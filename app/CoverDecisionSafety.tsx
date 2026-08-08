"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const LIBRARY_KEY = "shelf-of-fame-library-v1";
const REOPEN_KEY = "shelf-of-fame-reopen-book";

type StoredBook = {
  id?: string;
  title?: string;
  author?: string;
  preferredCover?: { url?: string; source?: string };
  coverFeedback?: {
    accepted?: string;
    rejected?: string[];
    wrongEdition?: string[];
  };
  romanceioCheckedAt?: number;
  romanceioNoMatch?: boolean;
} & Record<string, unknown>;

type BookRef = {
  title: string;
  author: string;
};

type UndoState = {
  book: BookRef;
  snapshot: StoredBook;
  kind: "wrong" | "edition";
};

function normalize(value?: string) {
  return (value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function identity(title: string, author: string) {
  return `${normalize(title)}::${normalize(author)}`;
}

function readLibrary(): StoredBook[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LIBRARY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed as StoredBook[] : [];
  } catch {
    return [];
  }
}

function writeLibrary(books: StoredBook[]) {
  window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(books));
}

function modalBook(): BookRef | null {
  const modal = document.querySelector(".modal");
  if (!modal) return null;
  const title = modal.querySelector(".details h2")?.textContent?.trim() || "";
  const author = (modal.querySelector(".details .author")?.textContent || "")
    .replace(/^by\s+/i, "")
    .trim();
  return title ? { title, author } : null;
}

function findStoredBook(ref: BookRef) {
  const key = identity(ref.title, ref.author);
  return readLibrary().find((book) => identity(book.title || "", book.author || "") === key) || null;
}

function rememberReopen(ref: BookRef) {
  try {
    window.sessionStorage.setItem(REOPEN_KEY, JSON.stringify(ref));
  } catch {
    // Reopening the modal is a convenience only.
  }
}

function reloadAndReopen(ref: BookRef) {
  rememberReopen(ref);
  window.location.reload();
}

function restoreSnapshot(state: UndoState) {
  const books = readLibrary();
  const key = identity(state.book.title, state.book.author);
  let restored = false;
  const next = books.map((book) => {
    if (identity(book.title || "", book.author || "") !== key) return book;
    restored = true;
    return state.snapshot;
  });
  if (!restored) next.push(state.snapshot);
  writeLibrary(next);
  reloadAndReopen(state.book);
}

function resetBook(ref: BookRef) {
  const books = readLibrary();
  const key = identity(ref.title, ref.author);
  const next = books.map((book) => {
    if (identity(book.title || "", book.author || "") !== key) return book;
    const cleaned = { ...book };
    delete cleaned.preferredCover;
    delete cleaned.coverFeedback;
    delete cleaned.romanceioCheckedAt;
    delete cleaned.romanceioNoMatch;
    return cleaned;
  });
  writeLibrary(next);
  reloadAndReopen(ref);
}

function hasCoverDecision(book: StoredBook | null) {
  if (!book) return false;
  return Boolean(
    book.preferredCover?.url
      || book.coverFeedback?.accepted
      || book.coverFeedback?.rejected?.length
      || book.coverFeedback?.wrongEdition?.length,
  );
}

export default function CoverDecisionSafety() {
  const [undo, setUndo] = useState<UndoState | null>(null);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const [modalRef, setModalRef] = useState<BookRef | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let undoTimer: number | null = null;

    function captureRejection(event: MouseEvent) {
      const button = (event.target as Element | null)?.closest("button");
      if (!button) return;
      const text = button.textContent?.replace(/\s+/g, " ").trim() || "";
      const kind = /wrong cover/i.test(text)
        ? "wrong"
        : /different edition/i.test(text)
          ? "edition"
          : null;
      if (!kind) return;

      const ref = modalBook();
      if (!ref) return;
      const snapshot = findStoredBook(ref);
      if (!snapshot) return;

      if (undoTimer) window.clearTimeout(undoTimer);
      undoTimer = window.setTimeout(() => {
        setUndo({ book: ref, snapshot, kind });
      }, 60);
    }

    document.addEventListener("click", captureRejection, true);
    return () => {
      document.removeEventListener("click", captureRejection, true);
      if (undoTimer) window.clearTimeout(undoTimer);
    };
  }, []);

  useEffect(() => {
    let scanTimer: number | null = null;

    function scan() {
      if (scanTimer) window.clearTimeout(scanTimer);
      scanTimer = window.setTimeout(() => {
        const modal = document.querySelector(".modal");
        const target = modal?.querySelector(".cover-picker") || null;
        setPortalTarget(target);
        setModalRef(modalBook());
        setRevision((value) => value + 1);
      }, 50);
    }

    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    scan();

    return () => {
      observer.disconnect();
      if (scanTimer) window.clearTimeout(scanTimer);
    };
  }, []);

  useEffect(() => {
    let ref: BookRef | null = null;
    try {
      const raw = window.sessionStorage.getItem(REOPEN_KEY);
      if (raw) ref = JSON.parse(raw) as BookRef;
      window.sessionStorage.removeItem(REOPEN_KEY);
    } catch {
      return;
    }
    if (!ref?.title) return;

    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      const wanted = `${ref?.title} — ${ref?.author || ""}`;
      const button = [...document.querySelectorAll<HTMLButtonElement>("button.book")]
        .find((node) => node.title === wanted);
      if (button) {
        window.clearInterval(timer);
        button.click();
      } else if (tries >= 40) {
        window.clearInterval(timer);
      }
    }, 125);

    return () => window.clearInterval(timer);
  }, []);

  const storedBook = useMemo(() => modalRef ? findStoredBook(modalRef) : null, [modalRef, revision]);
  const canReset = hasCoverDecision(storedBook);

  return (
    <>
      {portalTarget && modalRef && createPortal(
        <button
          type="button"
          className="primary cover-reset-button"
          onClick={() => resetBook(modalRef)}
          disabled={!canReset}
          title="Clear this book's saved cover choice and rejected-cover history"
          style={{
            marginTop: 8,
            width: "min(100%, 220px)",
            opacity: canReset ? 0.76 : 0.42,
          }}
        >
          ↻ Reset cover choices
        </button>,
        portalTarget,
      )}

      {undo && (
        <div
          role="status"
          style={{
            position: "fixed",
            right: 28,
            bottom: 92,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: 12,
            maxWidth: 390,
            padding: "12px 14px",
            borderRadius: 12,
            background: "rgba(24, 27, 22, .96)",
            color: "#f2eadc",
            boxShadow: "0 14px 40px rgba(0,0,0,.34)",
            border: "1px solid rgba(242,234,220,.14)",
            fontSize: 13,
            lineHeight: 1.25,
          }}
        >
          <span style={{ flex: 1 }}>
            {undo.kind === "edition" ? "Edition rejected." : "Cover rejected."} Accident?
          </span>
          <button
            type="button"
            onClick={() => restoreSnapshot(undo)}
            style={{
              border: 0,
              borderRadius: 999,
              padding: "7px 12px",
              cursor: "pointer",
              fontWeight: 700,
              background: "#f2eadc",
              color: "#1b1d18",
            }}
          >
            Undo
          </button>
          <button
            type="button"
            aria-label="Dismiss undo"
            onClick={() => setUndo(null)}
            style={{
              border: 0,
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              padding: 2,
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
