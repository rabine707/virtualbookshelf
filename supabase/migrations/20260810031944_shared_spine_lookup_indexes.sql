create index if not exists books_normalized_identity_idx on public.books (normalized_title, normalized_author);
create index if not exists spines_book_status_score_idx on public.spines (book_id, status, vote_score desc, created_at desc);
