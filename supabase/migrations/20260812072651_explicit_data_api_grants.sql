revoke all on table public.user_books from anon, authenticated;
grant select on table public.user_books to authenticated;

revoke all on table public.user_settings from anon, authenticated;
grant select on table public.user_settings to authenticated;

revoke all on table public.shelf_scans from anon, authenticated;
grant select, insert on table public.shelf_scans to authenticated;

revoke all on table public.books from anon, authenticated;
grant select on table public.books to anon, authenticated;
grant insert on table public.books to authenticated;

drop policy if exists books_curator_insert on public.books;
create policy books_curator_insert
on public.books
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.trusted_curator = true
  )
);

revoke all on table public.spines from anon, authenticated;
grant select on table public.spines to anon, authenticated;
grant insert on table public.spines to authenticated;

revoke all on table public.cover_candidates from anon, authenticated;
grant select on table public.cover_candidates to anon, authenticated;

revoke all on table public.cover_candidate_votes from anon, authenticated;
grant select on table public.cover_candidate_votes to authenticated;

revoke all on table public.cover_identifications from anon, authenticated;
revoke all on table public.spine_votes from anon, authenticated;

revoke all on table public.shelf_scan_usage from anon, authenticated;
revoke all on table public.spine_generation_usage from anon, authenticated;
