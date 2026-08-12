-- Only trusted curators may publish directly into the shared spine catalog.
-- Curator status is server-managed; normal users may not promote themselves.

revoke update on table public.profiles from anon, authenticated;
grant update (display_name, username, avatar_url, bio, username_changed_at, updated_at)
on table public.profiles
to authenticated;

drop policy if exists spines_authenticated_insert on public.spines;
create policy spines_authenticated_insert
on public.spines
for insert
to authenticated
with check (
  (select auth.uid()) = contributed_by
  and status = 'approved'
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.trusted_curator = true
  )
);

drop policy if exists spines_contributor_update on public.spines;
create policy spines_contributor_update
on public.spines
for update
to authenticated
using (
  (select auth.uid()) = contributed_by
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.trusted_curator = true
  )
)
with check (
  (select auth.uid()) = contributed_by
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.trusted_curator = true
  )
);

drop policy if exists authenticated_upload_spines on storage.objects;
create policy authenticated_upload_spines
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'spines'
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.trusted_curator = true
  )
);

drop policy if exists owner_update_spines on storage.objects;
create policy owner_update_spines
on storage.objects
for update
to authenticated
using (
  bucket_id = 'spines'
  and owner_id = (select auth.uid())::text
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.trusted_curator = true
  )
)
with check (
  bucket_id = 'spines'
  and owner_id = (select auth.uid())::text
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.trusted_curator = true
  )
);

drop policy if exists owner_delete_spines on storage.objects;
create policy owner_delete_spines
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'spines'
  and owner_id = (select auth.uid())::text
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.trusted_curator = true
  )
);
