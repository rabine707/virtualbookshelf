"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import {
  Book,
  COVER_DATA_VERSION,
  COVER_DATA_VERSION_KEY,
  coverMemory,
  coverOptionsMemory,
  isStoredBook,
  looksLikeSampleShelf,
  mergeAudibleBooks,
  mergeGoodreadsFeedback,
  normalizeAudibleRow,
  normalizeGoodreadsRow,
  sampleBooks,
  STORAGE_KEY,
} from "../../lib/books/client-library";

export function useShelfLibrary() {
  const [books, setBooks] = useState<Book[]>(sampleBooks);
  const [importMessage, setImportMessage] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const savedBooks = parsed.filter(isStoredBook);
          if (savedBooks.length) setBooks(savedBooks);
        }
      }

      const storedCoverVersion = window.localStorage.getItem(COVER_DATA_VERSION_KEY);
      if (storedCoverVersion !== COVER_DATA_VERSION) {
        coverMemory.clear();
        coverOptionsMemory.clear();
        window.localStorage.setItem(COVER_DATA_VERSION_KEY, COVER_DATA_VERSION);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    } catch {
      // If browser storage is unavailable, the shelf still works for this session.
    }
  }, [books, storageReady]);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  function showToast(message: string) {
    setImportMessage(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setImportMessage(""), 4200);
  }

  function importGoodreadsCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const imported = results.data
          .map(normalizeGoodreadsRow)
          .filter((book): book is Book => Boolean(book));

        if (!imported.length) {
          showToast("I couldn't find any Goodreads books in that CSV.");
          return;
        }

        coverMemory.clear();
        coverOptionsMemory.clear();
        window.localStorage.setItem(COVER_DATA_VERSION_KEY, COVER_DATA_VERSION);
        setBooks((current) => mergeGoodreadsFeedback(current, imported));
        showToast(`Imported ${imported.length} Goodreads books. Your cover choices were kept.`);
      },
    });

    event.target.value = "";
  }

  function importAudibleCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const imported = results.data
          .map(normalizeAudibleRow)
          .filter((book): book is Book => Boolean(book));

        if (!imported.length) {
          showToast("I couldn't find Audible titles in that CSV. Use the audible-cli library export CSV.");
          return;
        }

        setBooks((current) => {
          const base = looksLikeSampleShelf(current) ? [] : current;
          return mergeAudibleBooks(base, imported);
        });
        showToast(`Processed ${imported.length} Audible titles and merged them into your shelf.`);
      },
    });

    event.target.value = "";
  }

  return {
    books,
    setBooks,
    storageReady,
    importMessage,
    showToast,
    importGoodreadsCsv,
    importAudibleCsv,
  };
}
