create index if not exists user_books_book_id_idx on public.user_books(book_id);
create index if not exists user_books_selected_spine_idx on public.user_books(selected_spine_id) where selected_spine_id is not null;

drop policy if exists user_books_own_all on public.user_books;
create policy user_books_own_all on public.user_books
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists user_settings_own_all on public.user_settings;
create policy user_settings_own_all on public.user_settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists shelf_scans_own_all on public.shelf_scans;
create policy shelf_scans_own_all on public.shelf_scans
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
