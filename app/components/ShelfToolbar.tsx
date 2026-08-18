"use client";

import Link from "next/link";

type ShelfToolbarProps = {
  query: string;
  sort: string;
  count: number;
  onQueryChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onImportGoodreads: () => void;
};

function clickLegacyControl(selector: string) {
  document.querySelector<HTMLElement>(selector)?.click();
}

export function ShelfToolbar({ query, sort, count, onQueryChange, onSortChange, onImportGoodreads }: ShelfToolbarProps) {
  return (
    <section className="toolbar reader-toolbar" aria-label="Bookshelf controls">
      <div className="search-wrap">
        <span aria-hidden="true">⌕</span>
        <input
          className="search"
          type="search"
          placeholder="Search title or author…"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>

      <select value={sort} onChange={(event) => onSortChange(event.target.value)} aria-label="Sort books">
        <option value="title">Title</option>
        <option value="author">Author</option>
        <option value="rating">Rating</option>
      </select>

      <div className="shelf-book-count" aria-label={`${count} books displayed`}>
        <strong>{count}</strong> books
      </div>

      <details className="shelf-utility-menu">
        <summary aria-label="More shelf options" title="More shelf options">
          <span aria-hidden="true">•••</span>
        </summary>
        <div className="shelf-utility-menu__panel">
          <div className="shelf-utility-menu__heading">
            <strong>Shelf tools</strong>
            <span>Utilities and display settings</span>
          </div>

          <Link className="shelf-utility-menu__item" href="/help-the-shelf">
            <span>Community</span>
            <strong>Help the Shelf</strong>
          </Link>

          <button type="button" className="shelf-utility-menu__item" onClick={onImportGoodreads}>
            <span>Library</span>
            <strong>Import Goodreads</strong>
          </button>

          <button type="button" className="shelf-utility-menu__item" onClick={() => clickLegacyControl(".qol-fix-button")}>
            <span>Library</span>
            <strong>Improve missing art</strong>
          </button>

          <button type="button" className="shelf-utility-menu__item" onClick={() => clickLegacyControl(".theme-picker-trigger")}>
            <span>Appearance</span>
            <strong>Change theme</strong>
          </button>

          <button type="button" className="shelf-utility-menu__item" onClick={() => clickLegacyControl(".spine-label-toggle")}>
            <span>Appearance</span>
            <strong>Toggle spine text</strong>
          </button>

          <button type="button" className="shelf-utility-menu__item" onClick={() => window.location.reload()}>
            <span>Utility</span>
            <strong>Refresh shelf</strong>
          </button>
        </div>
      </details>
    </section>
  );
}
