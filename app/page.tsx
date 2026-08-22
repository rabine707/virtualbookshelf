"use client";

import { useRef } from "react";
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
import { CoverResult, WebCoverResult } from "../lib/books/client-library";

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
