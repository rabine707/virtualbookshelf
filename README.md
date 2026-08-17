# Virtual Bookshelf

A cozy visual bookshelf built with Next.js. The MVP includes a shelf-first interface, title/author search, sorting, book details, and Goodreads CSV import.

## Design system

Visual and UI work is governed by [`DESIGN.md`](./DESIGN.md).

Before changing layout, styling, themes, scene assets, component visuals, or responsive behavior, read `DESIGN.md` and treat it as the project's visual source of truth. The core direction is **a real, moody library that happens to be interactive — not a bookshelf app decorated to look like a library**.

The Botanical theme is the flagship benchmark for scene quality, while the existing multi-theme system should remain intact unless a task explicitly changes it.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Goodreads import

Export your Goodreads library as a CSV and use **Import Goodreads CSV**. The importer reads common Goodreads columns including Title, Author, My Rating, Year Published, Original Publication Year, Exclusive Shelf, ISBN, and ISBN13.

## MVP notes

Imported books currently live in browser memory for the active session. Persistent accounts, cover-art lookup, personal shelves, and sharing are natural next steps.