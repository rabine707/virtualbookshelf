"use client";

import { useMemo, useRef, useState } from "react";
import BookSearchAdd from "./BookSearchAdd";
import { BookDetailsModal } from "./components/BookDetailsModal";
import { Bookshelf } from "./components/Bookshelf";
import { CoverUndoToast } from "./components/CoverUndoToast";
import { ShelfToolbar } from "./components/ShelfToolbar";
import { useAudibleCoverFallback } from "./hooks/useAudibleCoverFallback";
import { useBookCoverManager } from "./hooks/useBookCoverManager";
import { useBookMetadataEditor } from "./hooks/useBookMetadataEditor";
import { useCloudShelfSync } from "./hooks/useCloudShelfSync";
import { useCommunityCoverSync } from "./hooks/useCommunityCoverSync";
import { useRomanceShelfEnrichment } from "./hooks/useRomanceShelfEnrichment";
import { useShelfLibrary } from "./hooks/useShelfLibrary";
import { Book, CoverResult, WebCoverResult } from "../lib/books/client-library";

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
    selected,
    setSelected,
    selectedIsbn,
    cover,
    setCover,
    coverOptions,
    savedCoverOptions,
    webCoverResults,
    webCoverLoading,
    webCoverMessage,
    coverLoading,
    deepSearchLoading,
    deepSearchDone,
    canResetCoverChoices,
    coverUndo,
    chooseCover,
    removeSavedCover,
    chooseWebCover,
    searchWebCovers,
    rejectCurrentCover,
    undoCoverDecision,
    dismissCoverUndo,
    resetCoverChoices,
    searchMoreCovers,
  } = useBookCoverManager({ setBooks, showToast });

  const { saveBookMetadata } = useBookMetadataEditor({
    selected,
    setSelected,
    setBooks,
    showToast,
  });

  useAudibleCoverFallback({
    selected,
    cover,
    coverLoading,
    setBooks,
    setSelected,
    setCover,
  });

  function chooseCoverAndSync(option: CoverResult) {
    chooseCover(option);
    if (selected) void submitCoverChoice(selected, option);
  }

  function chooseWebCoverAndSync(result: WebCoverResult) {
    chooseWebCover(result);
    if (selected) {
      void submitCoverChoice(selected, { url: result.url, source: "Web image" });
    }
  }

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("title");
  const goodreadsInput = useRef<HTMLInputElement>(null);

  const visibleBooks = useMemo(() => {
    const q = query.toLowerCase().trim();
    const filtered = q
      ? books.filter((book) => `${book.title} ${book.author}`.toLowerCase().includes(q))
      : [...books];

    return filtered.sort((a, b) => {
      if (sort === "author") return a.author.localeCompare(b.author);
      if (sort === "rating") return (b.rating || 0) - (a.rating || 0);
      return a.title.localeCompare(b.title);
    });
  }, [books, query, sort]);

  const shelves = useMemo(() => {
    const result: Book[][] = [];
    for (let i = 0; i < visibleBooks.length; i += 8) result.push(visibleBooks.slice(i, i + 8));
    return result;
  }, [visibleBooks]);

  return (
    <main>
      <header className="hero reader-hero">
        <div className="hero-copy">
          <p className="eyebrow">YOUR READING LIFE, ON DISPLAY</p>
          <h1>Shelf of Fame</h1>
          <p className="subhead">Turn the books you’ve read into a shelf worth showing off.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="primary reader-original-import" onClick={() => goodreadsInput.current?.click()}>Import Goodreads</button>
          <div className="reader-add-books">
            <button
              type="button"
              className="primary reader-add-books-trigger"
              aria-haspopup="dialog"
              onClick={() => window.dispatchEvent(new Event("shelf-open-book-search"))}
            >
              ＋ Add books
            </button>
          </div>
        </div>
        <input ref={goodreadsInput} type="file" accept=".csv,text/csv" hidden onChange={importGoodreadsCsv} />
      </header>

      <ShelfToolbar
        query={query}
        sort={sort}
        count={visibleBooks.length}
        onQueryChange={setQuery}
        onSortChange={setSort}
      />

      <Bookshelf shelves={shelves} onSelect={setSelected} />

      <BookSearchAdd
        books={books}
        setBooks={setBooks}
        showToast={showToast}
        onImportGoodreads={() => goodreadsInput.current?.click()}
      />

      <footer>
        <span>Real cover art loads onto the spines as you browse.</span>
        <span>{storageReady ? "Saved on this browser — refresh anytime." : "Loading your saved shelf…"}</span>
      </footer>

      {importMessage && (
        <div className="toast" role="status">
          <span className="toast-dot" aria-hidden="true">✓</span>
          {importMessage}
        </div>
      )}

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
        />
      )}
    </main>
  );
}
