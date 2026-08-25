"use client";

import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import {
  Book,
  coverKey,
  coverMemory,
  coverOptionsMemory,
  coverRequestUrl,
  CoverResponse,
} from "../../lib/books/client-library";
import { applyImportedCoverLookup, importedCoverLookup } from "../../lib/books/imported-cover-finder";

const IMPORTED_COVER_JOB_KEY = "shelf-of-fame-imported-cover-job-v1";

export type ImportedCoverFinderJob = {
  status: "running" | "paused" | "done";
  bookIds: string[];
  nextIndex: number;
  matchedBookIds: string[];
  reviewBookIds: string[];
};

type UseImportedCoverFinderOptions = {
  books: Book[];
  setBooks: Dispatch<SetStateAction<Book[]>>;
  storageReady: boolean;
};

function isStoredJob(value: unknown): value is ImportedCoverFinderJob {
  if (!value || typeof value !== "object") return false;
  const job = value as Partial<ImportedCoverFinderJob>;
  return (job.status === "running" || job.status === "paused" || job.status === "done")
    && Array.isArray(job.bookIds)
    && job.bookIds.every((id) => typeof id === "string")
    && typeof job.nextIndex === "number"
    && Array.isArray(job.matchedBookIds)
    && Array.isArray(job.reviewBookIds);
}

export function useImportedCoverFinder({ books, setBooks, storageReady }: UseImportedCoverFinderOptions) {
  const [job, setJob] = useState<ImportedCoverFinderJob | null>(null);
  const [restoreComplete, setRestoreComplete] = useState(false);
  const booksRef = useRef(books);

  useEffect(() => {
    booksRef.current = books;
  }, [books]);

  useEffect(() => {
    if (!storageReady || restoreComplete) return;
    try {
      const raw = window.localStorage.getItem(IMPORTED_COVER_JOB_KEY);
      if (!raw) return;
      const stored: unknown = JSON.parse(raw);
      if (!isStoredJob(stored) || !stored.bookIds.length) {
        window.localStorage.removeItem(IMPORTED_COVER_JOB_KEY);
        return;
      }
      setJob({
        ...stored,
        nextIndex: Math.max(0, Math.min(stored.nextIndex, stored.bookIds.length)),
        status: stored.status === "done" ? "done" : "paused",
      });
    } catch {
      window.localStorage.removeItem(IMPORTED_COVER_JOB_KEY);
    } finally {
      setRestoreComplete(true);
    }
  }, [restoreComplete, storageReady]);

  useEffect(() => {
    if (!storageReady || !restoreComplete) return;
    try {
      if (job) window.localStorage.setItem(IMPORTED_COVER_JOB_KEY, JSON.stringify(job));
      else window.localStorage.removeItem(IMPORTED_COVER_JOB_KEY);
    } catch {
      // Progress still works for this session when browser storage is unavailable.
    }
  }, [job, restoreComplete, storageReady]);

  useEffect(() => {
    if (!job || job.status !== "running") return;
    if (job.nextIndex >= job.bookIds.length) {
      setJob((current) => current?.status === "running" ? { ...current, status: "done" } : current);
      return;
    }

    const bookId = job.bookIds[job.nextIndex];
    const book = booksRef.current.find((candidate) => candidate.id === bookId);
    let advanceTimer: number | null = null;
    const controller = new AbortController();

    const advance = (result: "matched" | "review" | "missing") => {
      advanceTimer = window.setTimeout(() => {
        setJob((current) => {
          if (!current || current.status !== "running" || current.bookIds[current.nextIndex] !== bookId) return current;
          const nextIndex = current.nextIndex + 1;
          return {
            ...current,
            status: nextIndex >= current.bookIds.length ? "done" : "running",
            nextIndex,
            matchedBookIds: result === "matched" && !current.matchedBookIds.includes(bookId)
              ? [...current.matchedBookIds, bookId]
              : current.matchedBookIds,
            reviewBookIds: result === "review" && !current.reviewBookIds.includes(bookId)
              ? [...current.reviewBookIds, bookId]
              : current.reviewBookIds,
          };
        });
      }, result === "missing" ? 0 : 450);
    };

    if (!book) {
      advance("missing");
      return () => {
        controller.abort();
        if (advanceTimer !== null) window.clearTimeout(advanceTimer);
      };
    }
    if (book.preferredCover?.url || book.coverFeedback?.accepted) {
      advance("matched");
      return () => {
        controller.abort();
        if (advanceTimer !== null) window.clearTimeout(advanceTimer);
      };
    }

    void fetch(coverRequestUrl(book), { signal: controller.signal, cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as CoverResponse : null)
      .then((response) => {
        if (controller.signal.aborted) return;
        const lookup = importedCoverLookup(book, response);
        const key = coverKey(book);
        if (lookup.options.length) coverOptionsMemory.set(key, lookup.options);
        coverMemory.set(key, lookup.exactCover || lookup.options[0] || null);

        if (lookup.exactCover || lookup.discoveredIsbn) {
          setBooks((current) => current.map((candidate) => (
            candidate.id === bookId ? applyImportedCoverLookup(candidate, lookup) : candidate
          )));
        }
        advance(lookup.exactCover ? "matched" : "review");
      })
      .catch(() => {
        if (!controller.signal.aborted) advance("review");
      });

    return () => {
      controller.abort();
      if (advanceTimer !== null) window.clearTimeout(advanceTimer);
    };
  }, [job, setBooks]);

  function start(bookIds: string[]) {
    const booksById = new Map(booksRef.current.map((book) => [book.id, book]));
    const uniqueIds = [...new Set(bookIds)].filter((id) => {
      const book = booksById.get(id);
      return Boolean(book && !book.preferredCover?.url && !book.coverFeedback?.accepted);
    });
    if (!uniqueIds.length) return;
    setJob({ status: "running", bookIds: uniqueIds, nextIndex: 0, matchedBookIds: [], reviewBookIds: [] });
  }

  function pause() {
    setJob((current) => current?.status === "running" ? { ...current, status: "paused" } : current);
  }

  function resume() {
    setJob((current) => current?.status === "paused" ? { ...current, status: "running" } : current);
  }

  function dismiss() {
    setJob(null);
  }

  const currentBookId = job?.status === "running" ? job.bookIds[job.nextIndex] : undefined;
  const currentTitle = currentBookId ? books.find((book) => book.id === currentBookId)?.title || "Next book" : "";

  return {
    job,
    currentTitle,
    start,
    pause,
    resume,
    dismiss,
  };
}
