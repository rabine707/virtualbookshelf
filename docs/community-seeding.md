# Community catalog seeding

Help the Shelf uses `books` as the global catalog and `cover_candidates` as the queue of artwork that needs community review. `user_books` is not involved, so seeded books do not appear in anyone's personal library.

## Starter seeding

`POST /api/admin/seed-community` is intentionally protected by two server-only environment variables:

- `SEED_ADMIN_SECRET` — a random secret used only to authorize seed requests.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role key. Never expose it to browser code.

The endpoint accepts at most 100 records per request. It matches existing books by ISBN, then ASIN, then normalized title + author. It only creates a new global `books` row when no match exists, and it upserts the supplied cover into `cover_candidates`.

A direct payload can use:

```json
{
  "records": [
    {
      "title": "Example Book",
      "author": "Example Author",
      "isbn": "9780000000000",
      "coverUrl": "https://example.com/cover.jpg",
      "source": "custom",
      "sourceIdentifier": "example-1",
      "confidence": 80
    }
  ]
}
```

For a small starter batch, the endpoint also supports low-volume Open Library search:

```json
{
  "mode": "openlibrary",
  "queries": ["subject:romance", "subject:fantasy"],
  "limitPerQuery": 20
}
```

The Open Library mode is capped at four queries, 25 results per query, and 100 candidates total per request. It includes a descriptive User-Agent and is meant for small starter/enrichment batches only.

## Large catalog import

Do not use the Open Library Search or Covers APIs to crawl tens of thousands of records. Open Library explicitly asks bulk importers to use its monthly data dumps instead. For a large seed (for example 25,000+ records), preprocess an Open Library dump into the direct record shape above and feed it to this endpoint in batches of 100.

Cover images stay remote initially. Open Library cover URLs use the `covers.openlibrary.org/b/id/<cover-id>-L.jpg` pattern, so the community queue can display them without copying every image into Supabase Storage. Approved assets can be cached later if desired.

## Reverse-identification tasks

Set `needsIdentification: true` on a direct seed record to hide the suspected metadata in Help the Shelf and ask users to type the title and author from the cover. The source title/author can still be retained internally for comparison and consensus scoring later.

## Deployment order

1. Apply the `help_the_shelf_community` migration.
2. Configure the two server-only environment variables.
3. Deploy the branch/merge when ready.
4. Seed a small starter set and verify voting/identification behavior.
5. Move to an Open Library data-dump based import for large-scale catalog growth.
