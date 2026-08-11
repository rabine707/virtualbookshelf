insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', true, 5242880, array['image/webp','image/png','image/jpeg'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.cover_candidates
  add column if not exists uploaded_by uuid references auth.users(id) on delete set null,
  add column if not exists image_sha256 text,
  add column if not exists storage_path text;

create unique index if not exists cover_candidates_image_sha256_unique
  on public.cover_candidates (image_sha256)
  where image_sha256 is not null;

create index if not exists cover_candidates_book_status_idx
  on public.cover_candidates (book_id, status);

create policy "cover_candidates_authenticated_insert"
on public.cover_candidates
for insert
to authenticated
with check (uploaded_by = auth.uid());

create policy "authenticated_upload_covers"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'covers'
  and (storage.foldername(name))[1] = (auth.uid())::text
);

create policy "owner_update_covers"
on storage.objects
for update
to authenticated
using (bucket_id = 'covers' and owner_id = (auth.uid())::text)
with check (bucket_id = 'covers' and owner_id = (auth.uid())::text);

create policy "owner_delete_covers"
on storage.objects
for delete
to authenticated
using (bucket_id = 'covers' and owner_id = (auth.uid())::text);
