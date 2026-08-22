"use client";

import { useEffect, useRef } from "react";
import BookSearchAdd from "./BookSearchAdd";
import { BookDetailsModal } from "./components/BookDetailsModal";
import { CoverUndoToast } from "./components/CoverUndoToast";
import { useAudibleCoverFallback } from "./hooks/useAudibleCoverFallback";
import { useBookCoverManager } from "./hooks/useBookCoverManager";
import { useBookMetadataEditor } from "./hooks/useBookMetadataEditor";
import { useCloudShelfSync } from "./hooks/useCloudShelfSync";
import { useCommunityCoverSync } from "./hooks/useCommunityCoverSync";
import { useRomanceShelfEnrichment } from "./hooks/useRomanceShelfEnrichment";
import { useShelfLibrary } from "./hooks/useShelfLibrary";
import MobileShelfScene from "./mobile-first/MobileShelfScene";
import { Book, CoverResult, WebCoverResult } from "../lib/books/client-library";

const DEFAULT_CLOTH_PREFIX = "shelf-of-fame-default-cloth:";
type BookWithSpineChoice = Book & { defaultSpine?: boolean };

function defaultClothKey(book: Book) {
  return `${DEFAULT_CLOTH_PREFIX}${book.title.trim().toLowerCase()}::${book.author.trim().toLowerCase()}`;
}

export default function Home() {
  const {
    books,
    setBooks,
    storageReady,
    importMessage,
    showToast,
    importGoodreadsCsv,
  } = useShelfLibrary();

  useCloudShelfSync({ books, setBooks, storageReady });
  const { submitCoverChoice } = useCommunityCoverSync({ books, setBooks });
  useRomanceShelfEnrichment({ books, setBooks });

  const {
    selected, setSelected, selectedIsbn, cover, setCover, coverOptions, savedCoverOptions,
    webCoverResults, webCoverLoading, webCoverMessage, coverLoading, deepSearchLoading,
    deepSearchDone, canResetCoverChoices, coverUndo, chooseCover, removeSavedCover,
    chooseWebCover, searchWebCovers, rejectCurrentCover, undoCoverDecision, dismissCoverUndo,
    resetCoverChoices, searchMoreCovers,
  } = useBookCoverManager({ setBooks, showToast });

  const { saveBookMetadata } = useBookMetadataEditor({ selected, setSelected, setBooks, showToast });

  useAudibleCoverFallback({ selected, cover, coverLoading, setBooks, setSelected, setCover });

  // Migrate the older device-only "default cloth" preference into the book itself.
  // Once it lives on the book, normal shelf cloud sync carries it across signed-in devices.
  useEffect(() => {
    if (!storageReady) return;
    const needsMigration = books.some((book) => (
      !(book as BookWithSpineChoice).defaultSpine
      && window.localStorage.getItem(defaultClothKey(book)) === "1"
    ));
    if (!needsMigration) return;
    setBooks((current) => current.map((book) => (
      window.localStorage.getItem(defaultClothKey(book)) === "1"
        ? { ...book, defaultSpine: true }
        : book
    )));
  }, [books, setBooks, storageReady]);

  // The shelf's cover art is CSS-driven, so re-apply synced spine choices after every render/update.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const spines = document.querySelectorAll<HTMLButtonElement>("button[data-book-id]");
      for (const spine of spines) {
        const book = books.find((candidate) => candidate.id === spine.dataset.bookId) as BookWithSpineChoice | undefined;
        if (book?.defaultSpine) spine.dataset.forceDefaultCloth = "true";
        else delete spine.dataset.forceDefaultCloth;
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [books]);

  // SpineTools already emits this event whenever a spine choice is saved/restored.
  // Mirror that choice onto the selected book so the existing account sync can persist it.
  useEffect(() => {
    const onSpineChanged = (event: Event) => {
      if (!selected) return;
      const detail = (event as CustomEvent<{ image?: string }>).detail;
      if (!detail) return;
      const defaultSpine = detail.image === "";
      const updated = { ...selected, defaultSpine } as BookWithSpineChoice;
      setBooks((current) => current.map((book) => book.id === selected.id ? updated : book));
      setSelected(updated);
    };
    window.addEventListener("shelf-spine-generated", onSpineChanged as EventListener);
    return () => window.removeEventListener("shelf-spine-generated", onSpineChanged as EventListener);
  }, [selected, setBooks, setSelected]);

  function chooseCoverAndSync(option: CoverResult) {
    chooseCover(option);
    if (selected) void submitCoverChoice(selected, option);
  }

  function chooseWebCoverAndSync(result: WebCoverResult) {
    chooseWebCover(result);
    if (selected) void submitCoverChoice(selected, { url: result.url, source: "Web image" });
  }

  function changeReadStatus(shelf: string) {
    if (!selected) return;
    const updated = { ...selected, shelf };
    setBooks((current) => current.map((book) => book.id === selected.id ? updated : book));
    setSelected(updated);
    const label = shelf === "read" ? "Read" : shelf === "currently-reading" ? "Currently reading" : "Want to read";
    showToast(`${selected.title} marked as ${label.toLowerCase()}.`);
  }

  const goodreadsInput = useRef<HTMLInputElement>(null);
  const booksNeedingCoverReview = books.filter((book) => !book.preferredCover?.url);

  function openFindCovers() {
    const next = booksNeedingCoverReview[0];
    if (next) {
      setSelected(next);
      return;
    }
    showToast("Every book already has a saved cover choice.");
  }

  return (
    <>
      <MobileShelfScene
        books={books}
        importMessage={importMessage}
        missingCoverCount={booksNeedingCoverReview.length}
        onFindCovers={openFindCovers}
        onSelect={setSelected}
        onAddBook={() => window.dispatchEvent(new Event("shelf-open-book-search"))}
      />

      <input
        ref={goodreadsInput}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={importGoodreadsCsv}
      />

      <BookSearchAdd
        books={books}
        setBooks={setBooks}
        showToast={showToast}
        onImportGoodreads={() => goodreadsInput.current?.click()}
      />

      {coverUndo && (
        <CoverUndoToast
          kind={coverUndo.kind}
          onUndo={undoCoverDecision}
          onDismiss={dismissCoverUndo}
        />
      )}

      {selected && (
        <BookDetailsModal
          selected={selected}
          selectedIsbn={selectedIsbn}
          cover={cover}
          coverOptions={coverOptions}
          savedCovers={savedCoverOptions}
          webCoverResults={webCoverResults}
          webCoverLoading={webCoverLoading}
          webCoverMessage={webCoverMessage}
          coverLoading={coverLoading}
          deepSearchLoading={deepSearchLoading}
          deepSearchDone={deepSearchDone}
          canResetCoverChoices={canResetCoverChoices}
          onClose={() => setSelected(null)}
          onClearCover={() => setCover(null)}
          onUseSavedCover={chooseCoverAndSync}
          onRemoveSavedCover={removeSavedCover}
          onSearchWebCovers={searchWebCovers}
          onChooseWebCover={chooseWebCoverAndSync}
          onChooseCover={chooseCoverAndSync}
          onRejectCurrentCover={rejectCurrentCover}
          onSearchMoreCovers={searchMoreCovers}
          onResetCoverChoices={resetCoverChoices}
          onSaveBookMetadata={saveBookMetadata}
          onChangeReadStatus={changeReadStatus}
        />
      )}
    </>
  );
}
