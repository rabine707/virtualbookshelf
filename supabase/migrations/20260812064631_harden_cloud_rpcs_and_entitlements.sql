-- Protect server-owned entitlements even when writes arrive through SECURITY DEFINER RPCs.
create or replace function public.guard_user_setting_entitlements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.decor_owned := '[]'::jsonb;
      new.community_stars := 0;
      new.plan := 'free';
      new.premium_themes := '{}'::text[];
    else
      new.decor_owned := old.decor_owned;
      new.community_stars := old.community_stars;
      new.plan := old.plan;
      new.premium_themes := old.premium_themes;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_user_setting_entitlements() from public, anon, authenticated;

drop trigger if exists guard_user_setting_entitlements on public.user_settings;
create trigger guard_user_setting_entitlements
before insert or update on public.user_settings
for each row execute function public.guard_user_setting_entitlements();

-- A shelf sync may resolve an existing shared book, but a user-originated request
-- must not rewrite the canonical catalog row for everyone else.
create or replace function public.guard_canonical_book_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    return old;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_canonical_book_updates() from public, anon, authenticated;

drop trigger if exists guard_canonical_book_updates on public.books;
create trigger guard_canonical_book_updates
before update on public.books
for each row execute function public.guard_canonical_book_updates();

-- The shared book catalog is readable by clients, but direct catalog mutation is not.
revoke insert, update, delete on table public.books from anon, authenticated;
grant select on table public.books to anon, authenticated;
drop policy if exists books_authenticated_insert on public.books;
drop policy if exists books_authenticated_update on public.books;

-- Quota accounting is internal state. Clients reach it only through the guarded RPCs.
revoke all on table public.shelf_scan_usage from anon, authenticated;
revoke all on table public.spine_generation_usage from anon, authenticated;

-- Community contribution writes require a signed-in identity.
revoke execute on function public.submit_cover_vote(uuid, text) from public, anon;
revoke execute on function public.submit_cover_identification(uuid, text, text) from public, anon;
grant execute on function public.submit_cover_vote(uuid, text) to authenticated;
grant execute on function public.submit_cover_identification(uuid, text, text) to authenticated;

-- Remove the implicit PUBLIC execute grant from intentionally public read helpers.
-- Explicit anon/authenticated grants remain in place.
revoke execute on function public.get_approved_cover_candidates(text, text, text, text) from public;
revoke execute on function public.get_approved_covers_for_library(jsonb) from public;
