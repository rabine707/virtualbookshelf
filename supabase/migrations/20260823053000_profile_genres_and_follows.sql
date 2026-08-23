alter table public.profiles
  add column if not exists favorite_genres text[] not null default '{}'::text[];

alter table public.profiles
  drop constraint if exists profiles_favorite_genres_count_check;
alter table public.profiles
  add constraint profiles_favorite_genres_count_check
  check (cardinality(favorite_genres) <= 8);

grant update (favorite_genres) on public.profiles to authenticated;

create table if not exists public.profile_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint profile_follows_not_self check (follower_id <> followed_id)
);

create index if not exists profile_follows_followed_created_idx
  on public.profile_follows(followed_id, created_at desc);

alter table public.profile_follows enable row level security;

drop policy if exists profile_follows_public_read on public.profile_follows;
create policy profile_follows_public_read
on public.profile_follows for select
to anon, authenticated
using (true);

drop policy if exists profile_follows_insert_own on public.profile_follows;
create policy profile_follows_insert_own
on public.profile_follows for insert
to authenticated
with check ((select auth.uid()) = follower_id);

drop policy if exists profile_follows_delete_own on public.profile_follows;
create policy profile_follows_delete_own
on public.profile_follows for delete
to authenticated
using ((select auth.uid()) = follower_id);

revoke all on public.profile_follows from anon, authenticated;
grant select on public.profile_follows to anon, authenticated;
grant insert, delete on public.profile_follows to authenticated;

create or replace function public.get_profile_social(p_username text)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'user_id', p.id,
    'favorite_genres', p.favorite_genres,
    'followers', (select count(*) from public.profile_follows f where f.followed_id = p.id),
    'following', (select count(*) from public.profile_follows f where f.follower_id = p.id),
    'is_following', coalesce((select exists(
      select 1 from public.profile_follows f
      where f.follower_id = (select auth.uid()) and f.followed_id = p.id
    )), false),
    'is_self', (select auth.uid()) = p.id
  )
  from public.profiles p
  where p.username = public.normalize_username(p_username)
  limit 1;
$$;

revoke all on function public.get_profile_social(text) from public;
grant execute on function public.get_profile_social(text) to anon, authenticated;

create or replace function public.set_profile_follow(p_username text, p_follow boolean)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  target_id uuid;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  select p.id into target_id from public.profiles p
    where p.username = public.normalize_username(p_username) limit 1;
  if target_id is null then raise exception 'Profile not found'; end if;
  if target_id = uid then raise exception 'You cannot follow yourself'; end if;

  if p_follow then
    insert into public.profile_follows(follower_id, followed_id)
    values(uid, target_id) on conflict do nothing;
  else
    delete from public.profile_follows
    where follower_id = uid and followed_id = target_id;
  end if;

  return public.get_profile_social(p_username);
end;
$$;

revoke all on function public.set_profile_follow(text, boolean) from public;
grant execute on function public.set_profile_follow(text, boolean) to authenticated;
