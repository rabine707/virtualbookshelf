"use client";

import { Dispatch, SetStateAction } from "react";
import {
  applyBookMetadataUpdate,
  BookMetadataUpdateInput,
  migrateSpineCandidateIdentity,
  SaveBookMetadataResult,
  SpineCandidateIdentity,
} from "../../lib/books/book-metadata";
import {
  Book,
  coverKey,
  coverMemory,
  coverOptionsMemory,
} from "../../lib/books/client-library";

const SPINE_CANDIDATES_KEY = "shelf-of-fame-spine-candidates-v1";

type UseBookMetadataEditorOptions = {
  selected: Book | null;
  setSelected: Dispatch<SetStateAction<Book | null>>;
  setBooks: Dispatch<SetStateAction<Book[]>>;
  showToast: (message: string) => void;
};

function migrateStoredSpineCandidates(previous: Book, updated: Book) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SPINE_CANDIDATES_KEY) || "[]") as unknown;
    if (!Array.isArray(parsed)) return;

    const migrated = migrateSpineCandidateIdentity(
      parsed as SpineCandidateIdentity[],
      previous,
      updated,
    );
    if (!migrated.changed) return;

    window.localStorage.setItem(SPINE_CANDIDATES_KEY, JSON.stringify(migrated.candidates));
    window.dispatchEvent(new CustomEvent("shelf-spine-gallery-changed"));
  } catch {
    // Metadata still saves if legacy local spine-candidate storage is unavailable.
  }
}

export function useBookMetadataEditor({
  selected,
  setSelected,
  setBooks,
  showToast,
}: UseBookMetadataEditorOptions) {
  function saveBookMetadata(input: BookMetadataUpdateInput): SaveBookMetadataResult {
    if (!selected) return { ok: false, error: "No book is open." };

    try {
      const updated = applyBookMetadataUpdate(selected, input);
      const previousCoverKey = coverKey(selected);
      const nextCoverKey = coverKey(updated);

      migrateStoredSpineCandidates(selected, updated);
      coverMemory.delete(previousCoverKey);
      coverOptionsMemory.delete(previousCoverKey);
      if (nextCoverKey !== previousCoverKey) {
        coverMemory.delete(nextCoverKey);
        coverOptionsMemory.delete(nextCoverKey);
      }

      setBooks((current) => current.map((book) => book.id === selected.id ? updated : book));
      setSelected(updated);
      showToast(`Saved book details for ${updated.title}.`);
      return { ok: true, book: updated };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Could not save those book details.",
      };
    }
  }

  return { saveBookMetadata };
}
