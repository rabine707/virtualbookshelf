insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/webp','image/png','image/jpeg'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "public_read_avatars" on storage.objects
for select using (bucket_id = 'avatars');

create policy "owners_upload_avatars" on storage.objects
for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owners_delete_avatars" on storage.objects
for delete to authenticated
using (bucket_id = 'avatars' and owner_id = auth.uid()::text);
