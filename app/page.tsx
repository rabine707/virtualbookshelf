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
import PersonalizationDialog from "./PersonalizationDialog";
import OnboardingGuide from "./OnboardingGuide";
import { Book, CoverResult } from "../lib/books/client-library";
import { useShelfPreferences } from "./hooks/useShelfPreferences";

const DEFAULT_CLOTH_PREFIX = "shelf-of-fame-default-cloth:";

function defaultClothKey(book: Book) {
  return `${DEFAULT_CLOTH_PREFIX}${book.title.trim().toLowerCase()}::${book.author.trim().toLowerCase()}`;
}

export default function Home() {
  const { preferences, ready: preferencesReady, updatePreferences, applyCloudPreferences } = useShelfPreferences();
  const [personalizationOpen, setPersonalizationOpen] = useState(false);
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

  const cloudSyncStatus = useCloudShelfSync({ books, setBooks, storageReady: storageReady && preferencesReady, onCloudSettings: applyCloudPreferences, preferences });
  const importedCoverFinder = useImportedCoverFinder({ books, setBooks, storageReady });
  const { submitCoverChoice } = useCommunityCoverSync({ books, setBooks });
  useRomanceShelfEnrichment({ books, setBooks });

  const {
    selected, setSelected, selectedIsbn, cover, setCover, coverOptions, savedCoverOptions,
    coverLoading, deepSearchLoading,
    deepSearchDone, canResetCoverChoices, coverUndo, chooseCover, removeSavedCover,
    rejectCurrentCover, undoCoverDecision, dismissCoverUndo,
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
      !book.defaultSpine
      && window.localStorage.getItem(defaultClothKey(book)) === "1"
    ));
    if (!needsMigration) return;
    setBooks((current) => current.map((book) => (
      window.localStorage.getItem(defaultClothKey(book)) === "1"
        ? { ...book, defaultSpine: true }
        : book
    )));
  }, [books, setBooks, storageReady]);

  // SpineTools already emits this event whenever a spine choice is saved/restored.
  // Mirror that choice onto the selected book so the existing account sync can persist it.
  useEffect(() => {
    const onSpineChanged = (event: Event) => {
      if (!selected) return;
      const detail = (event as CustomEvent<{ image?: string }>).detail;
      if (!detail) return;
      const defaultSpine = detail.image === "";
      const updated = { ...selected, defaultSpine };
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
  const [bookSearchRequest, setBookSearchRequest] = useState(0);
  const [coverReviewInitialTotal, setCoverReviewInitialTotal] = useState(0);
  const [coverReviewScopeIds, setCoverReviewScopeIds] = useState<string[] | null>(null);
  const deepLinkHandled = useRef(false);
  const booksNeedingCoverReview = books.filter((book) => !book.preferredCover?.url && !book.coverReviewStatus);
  const coverReviewScope = useMemo(() => coverReviewScopeIds ? new Set(coverReviewScopeIds) : null, [coverReviewScopeIds]);
  const activeCoverReviewBooks = coverReviewScope
    ? booksNeedingCoverReview.filter((book) => coverReviewScope.has(book.id))
    : booksNeedingCoverReview;

  function openBookSearch() {
    setBookSearchRequest((current) => current + 1);
  }

  function selectBook(book: Book) {
    setSelected(book);
    const url = new URL(window.location.href);
    url.searchParams.set("book", book.id);
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function closeBook() {
    setSelected(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("book");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  useEffect(() => {
    if (!storageReady || deepLinkHandled.current) return;
    deepLinkHandled.current = true;
    const requestedId = new URLSearchParams(window.location.search).get("book");
    if (!requestedId) return;
    const requestedBook = books.find((book) => book.id === requestedId);
    if (requestedBook) setSelected(requestedBook);
  }, [books, setSelected, storageReady]);

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
    window.setTimeout(openBookSearch, 0);
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
        onSelect={selectBook}
        onAddBook={openBookSearch}
        preferences={preferences}
        onOpenPersonalization={() => setPersonalizationOpen(true)}
      />
      <PersonalizationDialog open={personalizationOpen} preferences={preferences} onChange={updatePreferences} onClose={() => setPersonalizationOpen(false)} />
      <OnboardingGuide books={books} eligible={storageReady && isFirstRun} onAddBook={openBookSearch} onOpenPersonalization={() => setPersonalizationOpen(true)} />

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
        openRequest={bookSearchRequest}
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
          loading={coverLoading}
          deepSearchLoading={deepSearchLoading}
          deepSearchDone={deepSearchDone}
          onSearchMore={searchMoreCovers}
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
          coverLoading={coverLoading}
          deepSearchLoading={deepSearchLoading}
          deepSearchDone={deepSearchDone}
          canResetCoverChoices={canResetCoverChoices}
          onClose={closeBook}
          onClearCover={() => setCover(null)}
          onUseSavedCover={chooseCoverAndSync}
          onRemoveSavedCover={removeSavedCover}
          onChooseCover={chooseCoverAndSync}
          onRejectCurrentCover={rejectCurrentCover}
          onSearchMoreCovers={searchMoreCovers}
          onResetCoverChoices={resetCoverChoices}
          onSaveBookMetadata={saveBookMetadata}
          onChangeReadStatus={changeReadStatus}
          onUpdateReaderMemory={updateReaderMemory}
          onSelectBook={selectBook}
          onUpdateSeriesBook={updateSeriesBook}
          onAddMissingSeriesBook={addMissingSeriesBook}
        />
      )}
    </>
  );
}
