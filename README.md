# Virtual Bookshelf

A cozy, cloud-synced visual library built with Next.js. Shelf of Fame turns a reading collection into a room that feels personal while keeping large libraries searchable and organized.

The product includes accounts, private-by-default cloud shelves, title and author search, reading-status filters, direct shelf-row navigation, sorting, reading memories, Goodreads CSV import, reader discovery, personalized themes, cover lookup, and shared custom spine artwork.

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

## Product principles

- **The shelf is the home.** Collection tools should support the immersive room rather than replace it.
- **Reading memory matters.** Notes, reactions, dates, and favorites are private unless a reader chooses otherwise.
- **Large libraries stay usable.** Search, filters, sorting, virtualization, and direct row navigation keep the physical metaphor practical.
- **Sharing is intentional.** New shelves begin private, with social discovery available when a reader is ready.
