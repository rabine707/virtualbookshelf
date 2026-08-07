# Virtual Bookshelf

A cozy visual bookshelf built with Next.js. The MVP includes a shelf-first interface, title/author search, sorting, book details, and Goodreads CSV import.

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
