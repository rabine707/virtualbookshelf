"use client";

type ShelfToolbarProps = {
  query: string;
  sort: string;
  count: number;
  onQueryChange: (value: string) => void;
  onSortChange: (value: string) => void;
};

export function ShelfToolbar({ query, sort, count, onQueryChange, onSortChange }: ShelfToolbarProps) {
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
      <div className="toolbar-actions">
        <button
          type="button"
          className="page-refresh-button"
          aria-label="Refresh bookshelf"
          title="Refresh bookshelf"
          onClick={() => window.location.reload()}
        >
          <span className="page-refresh-icon" aria-hidden="true">↻</span>
          <span className="page-refresh-label">Refresh</span>
        </button>
        <div className="count-pill" aria-label={`${count} books displayed`}>
          <strong>{count}</strong>
          <span>books</span>
        </div>
      </div>
    </section>
  );
}
