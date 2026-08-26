"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BookSearchAdd from "./BookSearchAdd";
import GoodreadsImportReview from "./GoodreadsImportReview";
import GoodreadsImportUndoToast from "./GoodreadsImportUndoToast";
import ImportedCoverProgress from "./ImportedCoverProgress";
import { BookDetailsModal } from "./components/BookDetailsModal";
import { CoverUndoToast } from "./components/CoverUndoToast";
import { CoverReviewQueue } from "./components/CoverReviewQueue";
import { useAudibleCoverFallback } from "./hooks/useAudibleCoverFallback";
import { useBookCoverManager } from "./hooks/useBookCoverManager";
import { useBookMetadataEditor } from "./hooks/useBookMetadataEditor";
import { useBookTagEnrichment } from "./hooks/useBookTagEnrichment";
import { useCloudShelfSync } from "./hooks/useCloudShelfSync";
import CloudSyncIndicator from "./CloudSyncIndicator";
import { useCommunityCoverSync } from "./hooks/useCommunityCoverSync";
import { useImportedCoverFinder } from "./hooks/useImportedCoverFinder";
import { useRomanceShelfEnrichment } from "./hooks/useRomanceShelfEnrichment";
import { useShelfLibrary } from "./hooks/useShelfLibrary";
import MobileShelfScene from "./mobile-first/MobileShelfScene";
import ThemeEnricher from "./ThemeEnricher";
import OnboardingGuide from "./OnboardingGuide";
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
    isFirstRun,
    importMessage,
    showToast,
    goodreadsPreview,
    goodreadsUndoMessage,
    goodreadsCoverCandidateIds,
    importGoodreadsCsv,
    confirmGoodreadsImport,
    cancelGoodreadsImport,
    setGoodreadsShelfFilter,
    undoGoodreadsImport,
    dismissGoodreadsUndo,
  } = useShelfLibrary();

  const cloudSyncStatus = useCloudShelfSync({ books, setBooks, storageReady });
  const importedCoverFinder = useImportedCoverFinder({ books, setBooks, storageReady });
  const { submitCoverChoice } = useCommunityCoverSync({ books, setBooks });
  useRomanceShelfEnrichment({ books, setBooks });

  const {
    selected, setSelected, selectedIsbn, cover, setCover, coverOptions, savedCoverOptions,
    webCoverResults, webCoverLoading, webCoverMessage, coverLoading, deepSearchLoading,
    deepSearchDone, canResetCoverChoices, coverUndo, chooseCover, removeSavedCover,
    chooseWebCover, searchWebCovers, rejectCurrentCover, undoCoverDecision, dismissCoverUndo,
    resetCoverChoices, searchMoreCovers,
    finishCoverReview,
  } = useBookCoverManager({ setBooks, showToast });

  const { saveBookMetadata } = useBookMetadataEditor({ selected, setSelected, setBooks, showToast });
  useBookTagEnrichment({ selected, setSelected, setBooks });

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
  const [coverReviewOpen, setCoverReviewOpen] = useState(false);
  const [coverReviewInitialTotal, setCoverReviewInitialTotal] = useState(0);
  const [coverReviewScopeIds, setCoverReviewScopeIds] = useState<string[] | null>(null);
  const booksNeedingCoverReview = books.filter((book) => !book.preferredCover?.url && !book.coverReviewStatus);
  const coverReviewScope = useMemo(() => coverReviewScopeIds ? new Set(coverReviewScopeIds) : null, [coverReviewScopeIds]);
  const activeCoverReviewBooks = coverReviewScope
    ? booksNeedingCoverReview.filter((book) => coverReviewScope.has(book.id))
    : booksNeedingCoverReview;

  function openFindCovers(scopeIds?: string[]) {
    const requestedScope = scopeIds?.length ? new Set(scopeIds) : null;
    const scoped = scopeIds?.length
      ? booksNeedingCoverReview.filter((book) => requestedScope?.has(book.id))
      : booksNeedingCoverReview;
    const next = scoped[0];
    if (next) {
      setCoverReviewScopeIds(scopeIds?.length ? scopeIds : null);
      setCoverReviewInitialTotal(scoped.length);
      setCoverReviewOpen(true);
      setSelected(next);
      return;
    }
    showToast("Every book has a cover or has already been reviewed.");
  }

  function updateReaderMemory(updates: Partial<Pick<Book, "readerReactions" | "readerNote" | "favoriteQuote" | "readerReview" | "shelfAwards" | "dateStarted" | "dateFinished" | "rereadCount">>) {
    if (!selected) return;
    const updated = { ...selected, ...updates };
    setSelected(updated);
    setBooks((current) => current.map((book) => book.id === selected.id ? { ...book, ...updates } : book));
  }

  function updateSeriesBook(bookId: string, updates: Pick<Book, "seriesName" | "seriesNumber" | "seriesExcluded">) {
    setBooks((current) => current.map((book) => book.id === bookId ? { ...book, ...updates } : book));
    setSelected((current) => current?.id === bookId ? { ...current, ...updates } : current);
  }

  function addMissingSeriesBook() {
    setSelected(null);
    window.setTimeout(() => window.dispatchEvent(new Event("shelf-open-book-search")), 0);
  }

  function finishReviewAndAdvance(approved: CoverResult[], primary?: CoverResult, status?: "skipped" | "no-match") {
    if (!selected) return;
    const reviewedId = selected.id;
    const reviewed = finishCoverReview(approved, primary, status);
    if (!reviewed) return;
    for (const option of approved) void submitCoverChoice(reviewed, option);

    const scope = coverReviewScopeIds ? new Set(coverReviewScopeIds) : null;
    const remaining = books.filter((book) => (
      book.id !== reviewedId && !book.preferredCover?.url && !book.coverReviewStatus
      && (!scope || scope.has(book.id))
    ));
    const next = remaining[0];
    if (next) {
      setSelected(next);
      showToast(`${status === "skipped" ? "Skipped" : status === "no-match" ? "Recorded no match for" : "Saved covers for"} ${selected.title}. Moving to ${next.title}.`);
    } else {
      setCoverReviewOpen(false);
      setCoverReviewScopeIds(null);
      setSelected(null);
      showToast("Cover review complete. Every queued book has been handled.");
    }
  }

  return (
    <>
      <CloudSyncIndicator status={cloudSyncStatus} />
      <MobileShelfScene
        books={books}
        importMessage={importMessage}
        missingCoverCount={booksNeedingCoverReview.length}
        onFindCovers={() => openFindCovers()}
        onSelect={setSelected}
        onAddBook={() => window.dispatchEvent(new Event("shelf-open-book-search"))}
      />
      <ThemeEnricher />
      <OnboardingGuide books={books} eligible={storageReady && isFirstRun} onAddBook={() => window.dispatchEvent(new Event("shelf-open-book-search"))} />

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
      <GoodreadsImportReview
        preview={goodreadsPreview}
        onConfirm={confirmGoodreadsImport}
        onCancel={cancelGoodreadsImport}
        onShelfFilterChange={setGoodreadsShelfFilter}
      />
      <GoodreadsImportUndoToast
        message={goodreadsUndoMessage}
        coverCount={goodreadsCoverCandidateIds.length}
        onFindCovers={() => {
          importedCoverFinder.start(goodreadsCoverCandidateIds);
          dismissGoodreadsUndo();
        }}
        onUndo={undoGoodreadsImport}
        onDismiss={dismissGoodreadsUndo}
      />
      <ImportedCoverProgress
        job={importedCoverFinder.job}
        currentTitle={importedCoverFinder.currentTitle}
        onPause={importedCoverFinder.pause}
        onResume={importedCoverFinder.resume}
        onReview={() => {
          const ids = importedCoverFinder.job?.reviewBookIds || [];
          importedCoverFinder.dismiss();
          openFindCovers(ids);
        }}
        onDismiss={importedCoverFinder.dismiss}
      />

      {coverUndo && (
        <CoverUndoToast
          kind={coverUndo.kind}
          onUndo={undoCoverDecision}
          onDismiss={dismissCoverUndo}
        />
      )}

      {coverReviewOpen && selected ? (
        <CoverReviewQueue
          book={selected}
          position={Math.max(1, coverReviewInitialTotal - activeCoverReviewBooks.length + 1)}
          total={Math.max(1, coverReviewInitialTotal)}
          coverOptions={coverOptions}
          webCoverResults={webCoverResults}
          loading={coverLoading}
          deepSearchLoading={deepSearchLoading}
          deepSearchDone={deepSearchDone}
          webCoverLoading={webCoverLoading}
          webCoverMessage={webCoverMessage}
          onSearchMore={searchMoreCovers}
          onSearchWeb={() => searchWebCovers("covers")}
          onFinish={finishReviewAndAdvance}
          onClose={() => { setCoverReviewOpen(false); setCoverReviewScopeIds(null); setSelected(null); }}
        />
      ) : selected && (
        <BookDetailsModal
          selected={selected}
          libraryBooks={books}
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
          onUpdateReaderMemory={updateReaderMemory}
          onSelectBook={setSelected}
          onUpdateSeriesBook={updateSeriesBook}
          onAddMissingSeriesBook={addMissingSeriesBook}
        />
      )}
    </>
  );
}
