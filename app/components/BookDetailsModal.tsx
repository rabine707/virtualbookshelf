"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookMetadataUpdateInput,
  SaveBookMetadataResult,
} from "../../lib/books/book-metadata";
import {
  Book,
  coverSourceLabel,
  CoverResult,
  WebCoverResult,
} from "../../lib/books/client-library";
import { coverCropImageStyle, stripCoverCrop } from "../../lib/books/cover-crop";
import { BookInfoEditor } from "./BookInfoEditor";
import { CoverCropSheet } from "./CoverCropSheet";
import { SpineRequestButton } from "./SpineRequestButton";
import { loadSharedSpineOptions, type SharedSpineEntry } from "../shared-spines";
import { getGeneratedSpine, saveGeneratedSpine } from "../../lib/spines/client";
import { storyTagsForBook } from "../../lib/books/story-tags";
import { relatedShelfBooks, seriesInfoForBook } from "../../lib/books/reader-experience";

type ReaderLifeUpdates = Partial<Pick<Book, "readerReactions" | "readerNote" | "favoriteQuote" | "readerReview" | "shelfAwards" | "dateStarted" | "dateFinished" | "rereadCount">>;

type BookDetailsModalProps = {
  selected: Book;
  libraryBooks: Book[];
  selectedIsbn?: string;
  cover: CoverResult | null;
  coverOptions: CoverResult[];
  savedCovers: CoverResult[];
  webCoverResults: WebCoverResult[];
  webCoverLoading: boolean;
  webCoverMessage: string;
  coverLoading: boolean;
  deepSearchLoading: boolean;
  deepSearchDone: boolean;
  canResetCoverChoices: boolean;
  onClose: () => void;
  onClearCover: () => void;
  onUseSavedCover: (option: CoverResult) => void;
  onRemoveSavedCover: (option: CoverResult) => void;
  onSearchWebCovers: (mode: "covers" | "alternate" | "custom") => void;
  onChooseWebCover: (result: WebCoverResult) => void;
  onChooseCover: (option: CoverResult) => void;
  onRejectCurrentCover: (kind: "wrong" | "edition") => void;
  onSearchMoreCovers: () => void;
  onResetCoverChoices: () => void;
  onSaveBookMetadata: (input: BookMetadataUpdateInput) => SaveBookMetadataResult;
  onChangeReadStatus: (shelf: string) => void;
  onUpdateReaderMemory: (updates: ReaderLifeUpdates) => void;
  onSelectBook: (book: Book) => void;
  onUpdateSeriesBook: (bookId: string, updates: Pick<Book, "seriesName" | "seriesNumber" | "seriesExcluded">) => void;
  onAddMissingSeriesBook: () => void;
};

type CropTarget =
  | { kind: "cover"; option: CoverResult }
  | { kind: "web"; result: WebCoverResult };

const READER_REACTIONS = [
  "Couldn’t put it down", "Made me cry", "Comfort read", "Unhinged", "Great banter", "Would reread",
];
const SHELF_AWARDS = ["Best banter", "Most chaotic", "Biggest surprise", "Best couple", "Stayed with me", "Five-star favorite"];

function spineOptionLabel(option: SharedSpineEntry, index: number) {
  const source = `${option.provider || ""} ${option.model || ""}`.toLowerCase();
  if (source.includes("clothbound")) return "Clothbound";
  if (source.includes("dust") || source.includes("jacket")) return "Dust Jacket";
  if (source.includes("special") || source.includes("edition") || source.includes("foil")) return "Special Edition";
  if (option.provider === "cover-crop") {
    const position = option.position ? `${option.position[0].toUpperCase()}${option.position.slice(1)} ` : "";
    return `${position}Cover Crop`;
  }
  return `Custom Spine ${index + 1}`;
}

export function BookDetailsModal({
  selected,
  libraryBooks,
  selectedIsbn,
  cover,
  coverOptions,
  savedCovers,
  webCoverResults,
  webCoverLoading,
  webCoverMessage,
  coverLoading,
  deepSearchLoading,
  deepSearchDone,
  canResetCoverChoices,
  onClose,
  onClearCover,
  onUseSavedCover,
  onRemoveSavedCover,
  onSearchWebCovers,
  onChooseWebCover,
  onChooseCover,
  onRejectCurrentCover,
  onSearchMoreCovers,
  onResetCoverChoices,
  onSaveBookMetadata,
  onChangeReadStatus,
  onUpdateReaderMemory,
  onSelectBook,
  onUpdateSeriesBook,
  onAddMissingSeriesBook,
}: BookDetailsModalProps) {
  void onUseSavedCover;
  void onRejectCurrentCover;
  const modalRef = useRef<HTMLElement>(null);
  const deeperSearchStartedFor = useRef<string | null>(null);
  const webFallbackStartedFor = useRef<string | null>(null);
  const [selector, setSelector] = useState<"cover" | "spine" | null>(null);
  const [cropTarget, setCropTarget] = useState<CropTarget | null>(null);
  const [spineOptions, setSpineOptions] = useState<SharedSpineEntry[]>([]);
  const [activeSpine, setActiveSpine] = useState("");
  const [spineMessage, setSpineMessage] = useState("");
  const [noteDraft, setNoteDraft] = useState(selected.readerNote || "");
  const [quoteDraft, setQuoteDraft] = useState(selected.favoriteQuote || "");
  const [reviewDraft, setReviewDraft] = useState(selected.readerReview || "");
  const [seriesEditing, setSeriesEditing] = useState(false);
  const [seriesNameDraft, setSeriesNameDraft] = useState("");
  const [seriesNumberDraft, setSeriesNumberDraft] = useState("");

  useEffect(() => {
    setSelector(null);
    setCropTarget(null);
    deeperSearchStartedFor.current = null;
    webFallbackStartedFor.current = null;
    setNoteDraft(selected.readerNote || "");
    setQuoteDraft(selected.favoriteQuote || "");
    setReviewDraft(selected.readerReview || "");
    setSeriesEditing(false);
  }, [selected.id]);

  useEffect(() => {
    const scrollY = window.scrollY;
    document.documentElement.classList.add("book-modal-open");
    document.body.classList.add("book-modal-open");
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    return () => {
      document.documentElement.classList.remove("book-modal-open");
      document.body.classList.remove("book-modal-open");
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  useEffect(() => {
    if (coverOptions.length >= 3) return;
    if (coverLoading || deepSearchLoading || deepSearchDone) return;
    if (deeperSearchStartedFor.current === selected.id) return;
    deeperSearchStartedFor.current = selected.id;
    onSearchMoreCovers();
  }, [coverLoading, coverOptions.length, deepSearchDone, deepSearchLoading, onSearchMoreCovers, selected.id]);

  useEffect(() => {
    if (!deepSearchDone || coverOptions.length >= 3) return;
    if (webCoverLoading || webCoverResults.length) return;
    if (webFallbackStartedFor.current === selected.id) return;
    webFallbackStartedFor.current = selected.id;
    onSearchWebCovers("covers");
  }, [coverOptions.length, deepSearchDone, onSearchWebCovers, selected.id, webCoverLoading, webCoverResults.length]);

  const summaryItems = [
    selected.rating ? ["★", "★".repeat(Math.min(selected.rating, 5))] : null,
    selected.year ? ["◷", selected.year] : null,
  ].filter((item): item is [string, string] => Boolean(item));
  const storyTags = storyTagsForBook(selected);
  const hasStoryTags = storyTags.tropes.length > 0 || storyTags.genres.length > 0 || storyTags.moods.length > 0 || storyTags.themes.length > 0 || storyTags.goodreads.length > 0;
  const personalityParts = [storyTags.moods[0], storyTags.genres[0], storyTags.tropes[0]].filter(Boolean);
  const personality = personalityParts.length
    ? `${personalityParts.slice(0, 2).join(", ")} — ${personalityParts[2] || "a memorable shelf pick"}.`
    : "A book with a place in your reading story.";
  const activeReactions = selected.readerReactions || [];
  const activeAwards = selected.shelfAwards || [];
  const currentSeries = seriesInfoForBook(selected);
  const seriesBooks = currentSeries
    ? libraryBooks
      .map((book) => ({ book, info: seriesInfoForBook(book) }))
      .filter(({ info }) => info?.name.toLowerCase() === currentSeries.name.toLowerCase())
      .sort((a, b) => (a.info?.number || 999) - (b.info?.number || 999))
    : [];
  const relatedBooks = relatedShelfBooks(selected, libraryBooks);

  function openSeriesEditor() {
    setSeriesNameDraft(currentSeries?.name || "");
    setSeriesNumberDraft(currentSeries?.number ? String(currentSeries.number) : "");
    setSeriesEditing(true);
  }

  function saveSeriesCorrection() {
    const seriesName = seriesNameDraft.replace(/\s+/g, " ").trim().slice(0, 100);
    if (!seriesName) return;
    const parsedNumber = Number(seriesNumberDraft);
    onUpdateSeriesBook(selected.id, { seriesName, seriesNumber: parsedNumber > 0 ? parsedNumber : undefined, seriesExcluded: false });
    setSeriesEditing(false);
  }

  function toggleReaction(reaction: string) {
    const readerReactions = activeReactions.includes(reaction)
      ? activeReactions.filter((value) => value !== reaction)
      : [...activeReactions, reaction];
    onUpdateReaderMemory({ readerReactions, readerNote: selected.readerNote });
  }

  function saveNote() {
    const readerNote = noteDraft.replace(/\s+/g, " ").trim().slice(0, 180);
    setNoteDraft(readerNote);
    if (readerNote !== (selected.readerNote || "")) {
      onUpdateReaderMemory({ readerReactions: activeReactions, readerNote });
    }
  }

  function toggleAward(award: string) {
    const shelfAwards = activeAwards.includes(award)
      ? activeAwards.filter((value) => value !== award)
      : [...activeAwards, award].slice(0, 3);
    onUpdateReaderMemory({ shelfAwards });
  }

  function saveLongMemories() {
    const favoriteQuote = quoteDraft.trim().slice(0, 400);
    const readerReview = reviewDraft.trim().slice(0, 1200);
    setQuoteDraft(favoriteQuote);
    setReviewDraft(readerReview);
    onUpdateReaderMemory({ favoriteQuote, readerReview });
  }

  const hasCoverOptions = coverOptions.length > 0;
  const totalCoverChoices = coverOptions.length + webCoverResults.length;
  const standardStatuses = new Set(["to-read", "currently-reading", "read"]);
  const currentShelf = selected.shelf || "to-read";

  const openCoverBrowser = () => {
    setSelector("cover");
    requestAnimationFrame(() => {
      modalRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const openSpineBrowser = () => {
    setSelector("spine");
    setSpineOptions([]);
    setSpineMessage("Loading custom spines…");
    requestAnimationFrame(() => modalRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
  };

  useEffect(() => {
    if (selector !== "spine" || !cover?.url) return;
    let cancelled = false;
    const coverUrl = stripCoverCrop(cover.url);
    void Promise.all([
      loadSharedSpineOptions({ title: selected.title, author: selected.author, isbn: selectedIsbn, asin: selected.asin }),
      getGeneratedSpine(coverUrl),
    ]).then(([options, current]) => {
      if (cancelled) return;
      setSpineOptions(options);
      setActiveSpine(current || "");
      setSpineMessage(options.length ? "" : "No custom curator spines have been published for this book yet.");
    }).catch(() => { if (!cancelled) setSpineMessage("Custom spines could not be loaded. Please try again."); });
    return () => { cancelled = true; };
  }, [cover?.url, selected.asin, selected.author, selected.title, selectedIsbn, selector]);

  async function chooseSpine(option?: SharedSpineEntry) {
    if (!cover?.url) return;
    const coverUrl = stripCoverCrop(cover.url);
    const image = option?.url || "";
    const renderMode = option?.renderMode || "overlay";
    await saveGeneratedSpine(coverUrl, image, renderMode);
    setActiveSpine(image);
    window.dispatchEvent(new CustomEvent("shelf-spine-generated", { detail: { coverUrl, image, position: option?.position, renderMode, shared: Boolean(option) } }));
  }

  function confirmCrop(url: string) {
    if (!cropTarget) return;
    if (cropTarget.kind === "cover") {
      onChooseCover({ ...cropTarget.option, url });
    } else {
      onChooseWebCover({ ...cropTarget.result, url });
    }
    setCropTarget(null);
  }

  const coverBrowser = (
    <section className="cover-picker" aria-label="Choose a cover" style={{ marginTop: 0 }}>
      <div className="cover-picker-heading" style={{ alignItems: "center" }}>
        <div>
          <strong>{totalCoverChoices ? "Choose a cover" : "Finding cover options"}</strong>
          <div style={{ fontSize: ".78em", opacity: .66, marginTop: 3 }}>Swap editions, manage your saved covers, or search for more.</div>
        </div>
        {totalCoverChoices ? <span>{totalCoverChoices} {totalCoverChoices === 1 ? "match" : "matches"}</span> : null}
      </div>

      {savedCovers.length ? (
        <section className="saved-cover-choices" aria-label="Your saved covers">
          <div className="saved-cover-heading">
            <strong>Your saved covers</strong>
            <span>tap to use · × removes from your book</span>
          </div>
          <div className="saved-cover-grid">
            {savedCovers.map((saved) => {
              const active = selected.preferredCover?.url === saved.url;
              return (
                <div className="saved-cover-item" key={saved.url}>
                  <button
                    type="button"
                    className={`saved-cover-option${active ? " active" : ""}`}
                    title={active ? "Currently on your shelf" : "Use this saved cover on the shelf"}
                    aria-label={active ? "Currently on your shelf" : `Use saved ${saved.source} cover`}
                    onClick={() => setCropTarget({ kind: "cover", option: saved })}
                  >
                    <img src={stripCoverCrop(saved.url)} style={coverCropImageStyle(saved.url)} alt="" loading="lazy" decoding="async" />
                    <span>{saved.source || "Saved"}</span>
                  </button>
                  <button
                    type="button"
                    className="saved-cover-remove"
                    title="Remove this cover from your saved covers"
                    aria-label={`Remove ${saved.source || "saved"} cover from your saved covers`}
                    onClick={() => onRemoveSavedCover(saved)}
                  >×</button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {hasCoverOptions ? (
        <section aria-label="Community and database covers" style={{ marginTop: 14 }}>
          <div className="saved-cover-heading">
            <strong>Community & database covers</strong>
            <span>tap to switch · shared covers can’t be deleted</span>
          </div>
          <div className="cover-options">
            {coverOptions.map((option, index) => (
              <button
                key={`${option.url}-${index}`}
                type="button"
                className={`cover-option${cover?.url === option.url ? " selected-cover" : ""}`}
                onClick={() => setCropTarget({ kind: "cover", option })}
                aria-label={`Crop or use this ${coverSourceLabel(option.source)} cover`}
                title={`Use this ${coverSourceLabel(option.source)} cover`}
              >
                <img src={stripCoverCrop(option.url)} style={coverCropImageStyle(option.url)} alt="" loading="lazy" decoding="async" />
                <span>{coverSourceLabel(option.source)}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {webCoverResults.length ? (
        <section style={{ marginTop: 12 }} aria-label="Web cover results">
          <div className="web-cover-heading">
            <strong>Web results</strong>
            <span>tap one to save it to your book</span>
          </div>
          <div className="web-cover-results">
            {webCoverResults.map((result, index) => (
              <button
                key={`${result.url}-${index}`}
                type="button"
                className="web-cover-result"
                title={result.title || `Web cover result ${index + 1}`}
                aria-label={`Crop or use web image ${index + 1}`}
                onClick={() => setCropTarget({ kind: "web", result })}
              >
                <img src={result.thumbnailUrl || result.url} alt="" loading="lazy" decoding="async" />
                <span>{result.publisher || "Web"}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <button
        type="button"
        className="primary"
        style={{ marginTop: 10 }}
        onClick={onSearchMoreCovers}
        disabled={deepSearchLoading || deepSearchDone}
      >
        {deepSearchLoading ? "Searching more editions…" : deepSearchDone ? "More editions searched" : "Search more editions"}
      </button>

      <p className="cover-picker-note reader-technical-note">
        Community and book-database covers stay available for everyone. Removing a saved cover only removes it from your copy of this book.
      </p>

      <button
        type="button"
        className="primary cover-reset-button"
        onClick={onResetCoverChoices}
        disabled={!canResetCoverChoices}
        title="Clear this book's saved cover choice and rejected-cover history"
        style={{ marginTop: 8, width: "min(100%, 220px)", opacity: canResetCoverChoices ? 0.76 : 0.42 }}
      >↻ Reset cover choices</button>

      <section className="web-cover-panel" aria-label="Browse web covers">
        <div className="web-cover-heading">
          <strong>Browse web covers</strong>
          <span>broaden the search manually</span>
        </div>
        <div className="web-cover-modes">
          <button type="button" disabled={webCoverLoading} onClick={() => onSearchWebCovers("covers")}>More web covers</button>
          <button type="button" disabled={webCoverLoading} onClick={() => onSearchWebCovers("alternate")}>Alternate editions</button>
          <button type="button" disabled={webCoverLoading} onClick={() => onSearchWebCovers("custom")}>Custom & Etsy</button>
        </div>
        <p className="web-cover-status" role="status">{webCoverMessage}</p>
      </section>
    </section>
  );

  const spineBrowser = (
    <section className="cover-picker spine-selector" aria-label="Choose a spine" style={{ marginTop: 0 }}>
      <div className="cover-picker-heading" style={{ alignItems: "center" }}>
        <div>
          <strong>Choose a spine</strong>
          <div style={{ fontSize: ".78em", opacity: .66, marginTop: 3 }}>Select the default cloth spine or custom artwork made for this book.</div>
        </div>
      </div>
      <p className="cover-picker-note">Your selected spine appears on the shelf immediately. Custom curator spines will appear here automatically.</p>
      <div className="saved-spine-grid" data-native-spine-selector="1">
        <button type="button" className={`saved-spine-option${!activeSpine ? " active" : ""}`} onClick={() => void chooseSpine()}>
          <div className="default-cloth-preview" aria-hidden="true" /><span>{!activeSpine ? "Active" : "Default Cloth"}</span>
        </button>
        {spineOptions.map((option, index) => {
          const label = spineOptionLabel(option, index);
          const active = activeSpine === option.url;
          return <button
            key={option.id}
            type="button"
            className={`saved-spine-option${active ? " active" : ""}`}
            aria-label={`${active ? "Active spine" : "Choose spine"}: ${label}`}
            aria-pressed={active}
            onClick={() => void chooseSpine(option)}
          >
            <img src={option.url} alt={`${selected.title} — ${label} spine`} loading="lazy" />
            <span>{active ? `Active · ${label}` : label}</span>
          </button>;
        })}
      </div>
      {spineMessage ? <p className="saved-spine-empty" role="status">{spineMessage}</p> : null}
    </section>
  );

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <article
        ref={modalRef}
        className="modal reader-modal book-hub-view book-hub-editing"
        data-book-hub="1"
        data-book-title={selected.title}
        data-book-author={selected.author}
        data-book-isbn={selectedIsbn || ""}
        data-book-asin={selected.asin || ""}
        data-book-cover={cover?.url ? stripCoverCrop(cover.url) : ""}
        role="dialog"
        aria-modal="true"
        aria-label={selected.title}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="close" onClick={selector ? () => setSelector(null) : onClose} aria-label={selector ? "Back to book" : "Close"}>
          {selector ? "‹" : "×"}
        </button>

        {selector ? (
          <div className="details" style={{ gridColumn: "1 / -1", width: "100%", paddingTop: 8 }}>
            {selector === "cover" ? coverBrowser : spineBrowser}
          </div>
        ) : (
          <>
            <div className="cover-column">
              <div className="cover" style={{ overflow: "hidden" }}>
                <div className="cover-fallback" style={{ background: selected.color }}>
                  <strong>{coverLoading ? "Finding covers…" : selected.title}</strong>
                  <span>{selected.author}</span>
                </div>
                {cover?.url ? (
                  <img
                    className="cover-image"
                    src={stripCoverCrop(cover.url)}
                    style={coverCropImageStyle(cover.url)}
                    alt={`Cover of ${selected.title}`}
                    loading="eager"
                    decoding="async"
                    onError={onClearCover}
                  />
                ) : null}
              </div>

              <details className="book-detail-drawer artwork-drawer">
                <summary>Customize artwork</summary>
                <div className="book-detail-actions" aria-label="Book artwork actions">
                  <button type="button" className="primary" onClick={openCoverBrowser}>Cover Selector</button>
                  <button type="button" className="primary" onClick={openSpineBrowser} disabled={!cover}>Spine Selector</button>
                  <SpineRequestButton title={selected.title} author={selected.author} coverUrl={cover?.url ? stripCoverCrop(cover.url) : undefined} isbn={selectedIsbn} asin={selected.asin} />
                </div>
              </details>
            </div>

            <div className="details">
              <p className="eyebrow">YOUR BOOK</p>
              <h2>{selected.title}</h2>
              <p className="author">by {selected.author}</p>

              <div className="reader-book-summary">
                {summaryItems.map(([icon, value]) => (
                  <span className="reader-book-chip" key={`${icon}-${value}`}>{icon} {value}</span>
                ))}
              </div>

              <section className="book-personality" aria-label="Book personality">
                <span>Your shelf read</span>
                <p>{personality}</p>
                <div>
                  {[...storyTags.tropes.slice(0, 3), ...storyTags.moods.slice(0, 1)].map((tag) => <b key={tag}>{tag}</b>)}
                </div>
              </section>

              <section className="reader-memory" aria-label="Your reading memory">
                <div className="reader-memory-heading"><span>Make it yours</span><strong>How did this one feel?</strong></div>
                <div className="reader-reactions">
                  {READER_REACTIONS.map((reaction) => <button key={reaction} type="button" className={activeReactions.includes(reaction) ? "is-active" : ""} onClick={() => toggleReaction(reaction)}>{reaction}</button>)}
                </div>
                <label className="reader-note">
                  <span>One-line memory <small>private on your shelf</small></span>
                  <input value={noteDraft} maxLength={180} onChange={(event) => setNoteDraft(event.target.value)} onBlur={saveNote} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} placeholder="What do you want to remember about this book?" />
                </label>
              </section>

              {currentSeries ? (
                <section className="book-series-card" aria-label="Series on your shelf">
                  <div className="book-series-heading"><div><span>Series journey</span><strong>{currentSeries.name}</strong></div><button type="button" onClick={openSeriesEditor}>Fix series</button></div>
                  <div className="book-series-books">
                    {seriesBooks.map(({ book, info }) => <button type="button" key={book.id} className={book.id === selected.id ? "is-current" : ""} disabled={book.id === selected.id} onClick={() => onSelectBook(book)}><small>Book {info?.number || "•"}</small>{book.title.replace(/\s*\([^()]+\)\s*$/, "")}</button>)}
                  </div>
                  <button type="button" className="series-add-book" onClick={onAddMissingSeriesBook}>＋ Add a missing book</button>
                </section>
              ) : <button type="button" className="series-create-button" onClick={openSeriesEditor}>＋ Connect this book to a series</button>}

              {seriesEditing ? (
                <section className="series-editor" aria-label="Fix series connection">
                  <header><div><span>Personal correction</span><strong>Fix series connection</strong></div><button type="button" onClick={() => setSeriesEditing(false)} aria-label="Close series editor">×</button></header>
                  <label><span>Series name</span><input value={seriesNameDraft} onChange={(event) => setSeriesNameDraft(event.target.value)} placeholder="Maple Hills" /></label>
                  <label><span>Book number</span><input type="number" min="0.1" step="0.1" value={seriesNumberDraft} onChange={(event) => setSeriesNumberDraft(event.target.value)} placeholder="1" /></label>
                  <label><span>Link another shelf book</span><select defaultValue="" onChange={(event) => { const book = libraryBooks.find((item) => item.id === event.target.value); if (!book || !seriesNameDraft.trim()) return; onUpdateSeriesBook(book.id, { seriesName: seriesNameDraft.trim(), seriesNumber: undefined, seriesExcluded: false }); event.currentTarget.value = ""; }}><option value="">Choose a book…</option>{libraryBooks.filter((book) => book.id !== selected.id && seriesInfoForBook(book)?.name.toLowerCase() !== seriesNameDraft.trim().toLowerCase()).map((book) => <option value={book.id} key={book.id}>{book.title} — {book.author}</option>)}</select></label>
                  <div className="series-editor-actions"><button type="button" onClick={() => { onUpdateSeriesBook(selected.id, { seriesName: undefined, seriesNumber: undefined, seriesExcluded: true }); setSeriesEditing(false); }}>Remove from series</button><button type="button" className="primary" disabled={!seriesNameDraft.trim()} onClick={saveSeriesCorrection}>Save correction</button></div>
                  <small>This changes only your library and survives future imports.</small>
                </section>
              ) : null}

              {relatedBooks.length ? (
                <section className="related-shelf-books" aria-label="Similar books on your shelf">
                  <div><span>Already on your shelf</span><strong>More with this energy</strong></div>
                  <div>{relatedBooks.map((book) => <button type="button" key={book.id} onClick={() => onSelectBook(book)}>{book.title.replace(/\s*\([^()]+\)\s*$/, "")}<small>{book.author}</small></button>)}</div>
                </section>
              ) : null}

              <details className="book-detail-drawer reading-journal">
                <summary>Reading journal</summary>
                <div className="reading-journal-body">
                  <div className="reading-dates">
                    <label><span>Started</span><input type="date" value={selected.dateStarted || ""} onChange={(event) => onUpdateReaderMemory({ dateStarted: event.target.value })} /></label>
                    <label><span>Finished</span><input type="date" value={selected.dateFinished || ""} onChange={(event) => onUpdateReaderMemory({ dateFinished: event.target.value })} /></label>
                    <label><span>Times reread</span><input type="number" min="0" max="99" value={selected.rereadCount || 0} onChange={(event) => onUpdateReaderMemory({ rereadCount: Math.max(0, Math.min(99, Number(event.target.value) || 0)) })} /></label>
                  </div>
                  <div className="shelf-awards"><span>Shelf awards <small>choose up to three</small></span><div>{SHELF_AWARDS.map((award) => <button type="button" key={award} className={activeAwards.includes(award) ? "is-active" : ""} onClick={() => toggleAward(award)}>✦ {award}</button>)}</div></div>
                  <label className="journal-field"><span>Favorite quote</span><textarea rows={2} maxLength={400} value={quoteDraft} onChange={(event) => setQuoteDraft(event.target.value)} onBlur={saveLongMemories} placeholder="A line you want to keep…" /></label>
                  <label className="journal-field"><span>My review</span><textarea rows={4} maxLength={1200} value={reviewDraft} onChange={(event) => setReviewDraft(event.target.value)} onBlur={saveLongMemories} placeholder="What worked, what didn’t, and how it made you feel…" /></label>
                </div>
              </details>

              {hasStoryTags ? (
                <details className="book-story-tags book-detail-drawer" aria-label="Story tags">
                  <summary>Explore all story tags</summary>
                  <div className="book-story-tags-heading">
                    <div>
                      <span>Inside this book</span>
                      <h3>Story tags</h3>
                    </div>
                    <small title={storyTags.source === "suggested" ? "Suggested from the title until richer book metadata is available" : undefined}>
                      {storyTags.source === "stored" ? "Book metadata" : storyTags.source === "curated" ? "Curated tags" : "Shelf suggested"}
                    </small>
                  </div>
                  {storyTags.tropes.length ? <div className="book-story-tag-group"><strong>Tropes</strong><div>{storyTags.tropes.map((tag) => <span key={tag}>♡ {tag}</span>)}</div></div> : null}
                  {storyTags.genres.length ? <div className="book-story-tag-group"><strong>Genres</strong><div>{storyTags.genres.map((tag) => <span key={tag}>✦ {tag}</span>)}</div></div> : null}
                  {storyTags.moods.length ? <div className="book-story-tag-group"><strong>Vibe</strong><div>{storyTags.moods.map((tag) => <span key={tag}>☾ {tag}</span>)}</div></div> : null}
                  {storyTags.themes.length ? <div className="book-story-tag-group"><strong>Themes</strong><div>{storyTags.themes.map((tag) => <span key={tag}>⌁ {tag}</span>)}</div></div> : null}
                  {storyTags.goodreads.length ? <div className="book-story-tag-group"><strong>Your Goodreads shelves</strong><div>{storyTags.goodreads.map((tag) => <span key={tag}># {tag}</span>)}</div></div> : null}
                </details>
              ) : null}

              <label
                style={{
                  display: "grid",
                  gap: 6,
                  marginTop: 14,
                  maxWidth: 330,
                  fontFamily: "Arial, sans-serif",
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(73,49,36,.68)" }}>
                  Reading status
                </span>
                <select
                  value={currentShelf}
                  onChange={(event) => onChangeReadStatus(event.target.value)}
                  aria-label="Reading status"
                  style={{
                    width: "100%",
                    minHeight: 46,
                    padding: "0 14px",
                    border: "1px solid rgba(95,65,45,.22)",
                    borderRadius: 14,
                    background: "rgba(255,255,255,.56)",
                    color: "#2f2017",
                    font: "700 16px/1.2 Arial, sans-serif",
                  }}
                >
                  {!standardStatuses.has(currentShelf) ? <option value={currentShelf}>{currentShelf}</option> : null}
                  <option value="to-read">Want to read</option>
                  <option value="currently-reading">Currently reading</option>
                  <option value="read">Read</option>
                </select>
              </label>

              <details className="book-detail-drawer information-drawer">
                <summary>Book information</summary>
                <dl>
                  {selected.year ? <><dt>Published</dt><dd>{selected.year}</dd></> : null}
                  {selected.pageCount ? <><dt>Length</dt><dd>{selected.pageCount} pages</dd></> : null}
                  <dt>ISBN</dt><dd>{selectedIsbn || "Not available"}</dd>
                  {selected.importSource ? <><dt>Imported from</dt><dd>{selected.importSource}</dd></> : null}
                </dl>
                <BookInfoEditor book={selected} selectedIsbn={selectedIsbn} onSave={onSaveBookMetadata} />
              </details>
            </div>
          </>
        )}
      </article>

      {cropTarget ? (
        <CoverCropSheet
          imageUrl={cropTarget.kind === "cover" ? cropTarget.option.url : cropTarget.result.url}
          title={selected.title}
          onCancel={() => setCropTarget(null)}
          onConfirm={confirmCrop}
        />
      ) : null}
    </div>
  );
}
