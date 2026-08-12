"use client";

import { Dispatch, SetStateAction, useEffect, useRef } from "react";
import {
  applyRomanceShelfOutcome,
  needsRomanceShelfLookup,
  RomanceShelfBook,
  RomanceShelfLookup,
  romanceShelfIdentity,
} from "../../lib/books/romance-shelf";
import { Book } from "../../lib/books/client-library";

const CONCURRENCY = 2;
const REQUEST_GAP_MS = 500;
const INITIAL_DELAY_MS = 1400;
const SCAN_INTERVAL_MS = 20000;

type UseRomanceShelfEnrichmentOptions = {
  books: Book[];
  setBooks: Dispatch<SetStateAction<Book[]>>;
};

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function useRomanceShelfEnrichment({ books, setBooks }: UseRomanceShelfEnrichmentOptions) {
  const booksRef = useRef(books);

  useEffect(() => {
    booksRef.current = books;
  }, [books]);

  useEffect(() => {
    let stopped = false;
    let active = 0;
    const queued = new Set<string>();
    const completed = new Set<string>();
    const queue: RomanceShelfBook[] = [];

    async function processBook(book: RomanceShelfBook) {
      const key = romanceShelfIdentity(book);
      const params = new URLSearchParams({
        title: book.title,
        author: book.author,
        shelfFill: `${Date.now()}`,
      });
      if (book.romanceioId) params.set("romanceio", book.romanceioId);

      try {
        const response = await fetch(`/api/romance-cover?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Romance.io lookup returned ${response.status}`);
        const result = await response.json() as RomanceShelfLookup;
        const checkedAt = Date.now();

        setBooks((current) => current.map((currentBook) => {
          if (romanceShelfIdentity(currentBook) !== key) return currentBook;
          return applyRomanceShelfOutcome(currentBook as RomanceShelfBook, result, checkedAt);
        }));
      } catch {
        // Technical failures are not stored as misses; a future session can retry.
      } finally {
        completed.add(key);
        queued.delete(key);
        await delay(REQUEST_GAP_MS);
      }
    }

    function pump() {
      if (stopped) return;
      while (active < CONCURRENCY && queue.length) {
        const book = queue.shift();
        if (!book) break;
        active += 1;
        void processBook(book).finally(() => {
          active -= 1;
          pump();
        });
      }
    }

    function enqueueMissing() {
      if (stopped) return;
      for (const rawBook of booksRef.current) {
        const book = rawBook as RomanceShelfBook;
        const key = romanceShelfIdentity(book);
        if (!key || queued.has(key) || completed.has(key) || !needsRomanceShelfLookup(book)) continue;
        queued.add(key);
        queue.push(book);
      }
      pump();
    }

    const initialTimer = window.setTimeout(enqueueMissing, INITIAL_DELAY_MS);
    const scanTimer = window.setInterval(enqueueMissing, SCAN_INTERVAL_MS);

    return () => {
      stopped = true;
      window.clearTimeout(initialTimer);
      window.clearInterval(scanTimer);
    };
  }, [setBooks]);
}
