"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import {
  analyzeGoodreadsImport,
  Book,
  COVER_DATA_VERSION,
  COVER_DATA_VERSION_KEY,
  coverMemory,
  coverOptionsMemory,
  goodreadsShelfGroup,
  GoodreadsShelfGroup,
  isStoredBook,
  looksLikeSampleShelf,
  mergeAudibleBooks,
  mergeGoodreadsBooks,
  normalizeAudibleRow,
  normalizeGoodreadsRow,
  sampleBooks,
  STORAGE_KEY,
} from "../../lib/books/client-library";

const ONBOARDING_ELIGIBLE_KEY = "shelf-of-fame-onboarding-eligible-v1";

export type GoodreadsImportPreview = ReturnType<typeof analyzeGoodreadsImport> & {
  fileName: string;
  shelfFilter: GoodreadsShelfFilter;
  shelfOptions: GoodreadsShelfOption[];
  totalBookCount: number;
  excludedCount: number;
};

export type GoodreadsShelfFilter = "all" | GoodreadsShelfGroup;

export type GoodreadsShelfOption = {
  value: GoodreadsShelfGroup;
  label: string;
  count: number;
};

type GoodreadsImportSource = {
  fileName: string;
  normalized: Book[];
  totalRows: number;
};

type GoodreadsImportUndo = {
  books: Book[];
  message: string;
};

const GOODREADS_SHELF_LABELS: Record<GoodreadsShelfGroup, string> = {
  read: "Read",
  "currently-reading": "Currently reading",
  "to-read": "Want to read",
  other: "Other shelves",
};

function buildGoodreadsPreview(current: Book[], source: GoodreadsImportSource, shelfFilter: GoodreadsShelfFilter): GoodreadsImportPreview {
  const allAnalysis = analyzeGoodreadsImport([], source.normalized, source.totalRows);
  const shelfOptions = (Object.keys(GOODREADS_SHELF_LABELS) as GoodreadsShelfGroup[])
    .map((value) => {
      const candidates = source.normalized.filter((book) => goodreadsShelfGroup(book.shelf) === value);
      return {
        value,
        label: GOODREADS_SHELF_LABELS[value],
        count: analyzeGoodreadsImport([], candidates, candidates.length).books.length,
      };
    })
    .filter((option) => option.count > 0);
  const filtered = shelfFilter === "all"
    ? source.normalized
    : source.normalized.filter((book) => goodreadsShelfGroup(book.shelf) === shelfFilter);
  const unreadableCount = Math.max(0, source.totalRows - source.normalized.length);
  const analysis = analyzeGoodreadsImport(current, filtered, filtered.length + unreadableCount);

  return {
    ...analysis,
    fileName: source.fileName,
    shelfFilter,
    shelfOptions,
    totalBookCount: allAnalysis.books.length,
    excludedCount: Math.max(0, allAnalysis.books.length - analysis.books.length),
  };
}

export function useShelfLibrary() {
  const [books, setBooks] = useState<Book[]>(sampleBooks);
  const [importMessage, setImportMessage] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [goodreadsPreview, setGoodreadsPreview] = useState<GoodreadsImportPreview | null>(null);
  const [goodreadsUndo, setGoodreadsUndo] = useState<GoodreadsImportUndo | null>(null);
  const [goodreadsCoverCandidateIds, setGoodreadsCoverCandidateIds] = useState<string[]>([]);
  const toastTimer = useRef<number | null>(null);
  const goodreadsUndoTimer = useRef<number | null>(null);
  const goodreadsSource = useRef<GoodreadsImportSource | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === null) window.localStorage.setItem(ONBOARDING_ELIGIBLE_KEY, "1");
      setIsFirstRun(saved === null || window.localStorage.getItem(ONBOARDING_ELIGIBLE_KEY) === "1");
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
    if (goodreadsUndoTimer.current) window.clearTimeout(goodreadsUndoTimer.current);
  }, []);

  function showToast(message: string) {
    if (goodreadsUndoTimer.current) window.clearTimeout(goodreadsUndoTimer.current);
    setGoodreadsUndo(null);
    setGoodreadsCoverCandidateIds([]);
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
        const normalized = results.data
          .map(normalizeGoodreadsRow)
          .filter((book): book is Book => Boolean(book));
        const source = { fileName: file.name, normalized, totalRows: results.data.length };
        const analysis = buildGoodreadsPreview(books, source, "all");

        if (!analysis.books.length) {
          showToast("I couldn't find any Goodreads books in that CSV.");
          return;
        }

        goodreadsSource.current = source;
        setGoodreadsPreview(analysis);
        showToast("Your Goodreads file is ready to review. Nothing has been changed yet.");
      },
      error: () => showToast("I couldn't read that CSV. Try downloading a fresh Goodreads export."),
    });

    event.target.value = "";
  }

  function confirmGoodreadsImport() {
    if (!goodreadsPreview) return;
    const { books: imported, newCount, existingCount, repeatedCount, unreadableCount } = goodreadsPreview;

    coverMemory.clear();
    coverOptionsMemory.clear();
    window.localStorage.setItem(COVER_DATA_VERSION_KEY, COVER_DATA_VERSION);
    const merged = mergeGoodreadsBooks(books, imported);
    const importedIds = new Set(imported.map((book) => book.id));
    const coverCandidateIds = merged
      .filter((book) => (
        importedIds.has(book.id)
        && !book.preferredCover?.url
        && !book.coverFeedback?.accepted
      ))
      .map((book) => book.id);
    setBooks(merged);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // The normal shelf persistence effect will retry when storage is available.
    }
    setGoodreadsPreview(null);
    goodreadsSource.current = null;

    const changes = [
      newCount ? `Added ${newCount} new ${newCount === 1 ? "book" : "books"}` : "",
      existingCount ? `refreshed ${existingCount} already on your shelf` : "",
    ].filter(Boolean).join(" and ");
    const skippedCount = repeatedCount + unreadableCount;
    const message = `${changes}. No duplicates were created.${skippedCount ? ` ${skippedCount} ${skippedCount === 1 ? "row was" : "rows were"} skipped.` : ""}${goodreadsPreview.excludedCount ? ` ${goodreadsPreview.excludedCount} ${goodreadsPreview.excludedCount === 1 ? "book was" : "books were"} left out by your shelf choice.` : ""}`;

    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setImportMessage("");
    setGoodreadsUndo({ books, message });
    setGoodreadsCoverCandidateIds(coverCandidateIds);
    if (goodreadsUndoTimer.current) window.clearTimeout(goodreadsUndoTimer.current);
    goodreadsUndoTimer.current = window.setTimeout(() => {
      setGoodreadsUndo(null);
      setGoodreadsCoverCandidateIds([]);
    }, 15_000);
  }

  function cancelGoodreadsImport() {
    setGoodreadsPreview(null);
    goodreadsSource.current = null;
    showToast("Import cancelled. Your shelf was not changed.");
  }

  function setGoodreadsShelfFilter(shelfFilter: GoodreadsShelfFilter) {
    if (!goodreadsSource.current) return;
    setGoodreadsPreview(buildGoodreadsPreview(books, goodreadsSource.current, shelfFilter));
  }

  function undoGoodreadsImport() {
    if (!goodreadsUndo) return;
    if (goodreadsUndoTimer.current) window.clearTimeout(goodreadsUndoTimer.current);
    coverMemory.clear();
    coverOptionsMemory.clear();
    setBooks(goodreadsUndo.books);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(goodreadsUndo.books));
    } catch {
      // The normal shelf persistence effect will retry when storage is available.
    }
    setGoodreadsUndo(null);
    setGoodreadsCoverCandidateIds([]);
    showToast("Goodreads import undone. Your previous shelf is back.");
  }

  function dismissGoodreadsUndo() {
    if (goodreadsUndoTimer.current) window.clearTimeout(goodreadsUndoTimer.current);
    setGoodreadsUndo(null);
    setGoodreadsCoverCandidateIds([]);
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
    isFirstRun,
    importMessage,
    showToast,
    goodreadsPreview,
    goodreadsUndoMessage: goodreadsUndo?.message || "",
    goodreadsCoverCandidateIds,
    importGoodreadsCsv,
    confirmGoodreadsImport,
    cancelGoodreadsImport,
    setGoodreadsShelfFilter,
    undoGoodreadsImport,
    dismissGoodreadsUndo,
    importAudibleCsv,
  };
}
