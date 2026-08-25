-- Public reader discovery and privacy-safe social graph access.

drop policy if exists profile_follows_public_read on public.profile_follows;
create policy profile_follows_visible_read
on public.profile_follows for select
to anon, authenticated
using (
  (
    exists (select 1 from public.user_settings follower_settings where follower_settings.user_id = follower_id and follower_settings.shelf_public)
    and exists (select 1 from public.user_settings followed_settings where followed_settings.user_id = followed_id and followed_settings.shelf_public)
  )
  or (select auth.uid()) = follower_id
  or (select auth.uid()) = followed_id
);

create index if not exists profile_follows_follower_created_idx
  on public.profile_follows(follower_id, created_at desc);

create or replace function public.discover_public_profiles(
  p_query text default '',
  p_limit integer default 24,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with matching as (
    select
      p.id,
      p.username,
      p.display_name,
      p.avatar_url,
      p.bio,
      p.favorite_genres,
      p.trusted_curator,
      coalesce((select count(*) from public.profile_follows f where f.followed_id = p.id), 0) as followers,
      coalesce((select count(*) from public.profile_follows f where f.follower_id = p.id), 0) as following,
      coalesce((select exists(
        select 1 from public.profile_follows f
        where f.follower_id = (select auth.uid()) and f.followed_id = p.id
      )), false) as is_following,
      (select auth.uid()) = p.id as is_self
    from public.profiles p
    join public.user_settings us on us.user_id = p.id and us.shelf_public = true
    where nullif(trim(p_query), '') is null
      or p.username ilike '%' || trim(p_query) || '%'
      or coalesce(p.display_name, '') ilike '%' || trim(p_query) || '%'
      or exists (select 1 from unnest(p.favorite_genres) genre where genre ilike '%' || trim(p_query) || '%')
    order by
      case when lower(p.username) = lower(trim(p_query)) then 0 else 1 end,
      (select count(*) from public.profile_follows f where f.followed_id = p.id) desc,
      p.username asc
    limit least(greatest(p_limit, 1), 50)
    offset greatest(p_offset, 0)
  )
  select jsonb_build_object(
    'profiles', coalesce(jsonb_agg(to_jsonb(matching)), '[]'::jsonb),
    'next_offset', case when count(*) = least(greatest(p_limit, 1), 50)
      then greatest(p_offset, 0) + count(*) else null end
  )
  from matching;
$$;

revoke all on function public.discover_public_profiles(text, integer, integer) from public;
grant execute on function public.discover_public_profiles(text, integer, integer) to anon, authenticated;

create or replace function public.list_profile_connections(
  p_username text,
  p_kind text,
  p_limit integer default 30,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  target_id uuid;
  target_is_public boolean;
  result jsonb;
begin
  if p_kind not in ('followers', 'following') then
    raise exception 'Connection kind must be followers or following';
  end if;

  select p.id, coalesce(us.shelf_public, false)
  into target_id, target_is_public
  from public.profiles p
  left join public.user_settings us on us.user_id = p.id
  where p.username = public.normalize_username(p_username)
  limit 1;

  if target_id is null or (not target_is_public and target_id is distinct from (select auth.uid())) then
    return jsonb_build_object('profiles', '[]'::jsonb, 'next_offset', null);
  end if;

  with connections as (
    select case when p_kind = 'followers' then f.follower_id else f.followed_id end as profile_id, f.created_at
    from public.profile_follows f
    where (p_kind = 'followers' and f.followed_id = target_id)
       or (p_kind = 'following' and f.follower_id = target_id)
  ), visible as (
    select
      p.id,
      p.username,
      p.display_name,
      p.avatar_url,
      p.bio,
      p.favorite_genres,
      p.trusted_curator,
      coalesce((select count(*) from public.profile_follows f where f.followed_id = p.id), 0) as followers,
      coalesce((select exists(
        select 1 from public.profile_follows f
        where f.follower_id = (select auth.uid()) and f.followed_id = p.id
      )), false) as is_following,
      (select auth.uid()) = p.id as is_self,
      c.created_at
    from connections c
    join public.profiles p on p.id = c.profile_id
    join public.user_settings us on us.user_id = p.id and us.shelf_public = true
    order by c.created_at desc
    limit least(greatest(p_limit, 1), 50)
    offset greatest(p_offset, 0)
  )
  select jsonb_build_object(
    'profiles', coalesce(jsonb_agg(to_jsonb(visible) - 'created_at'), '[]'::jsonb),
    'next_offset', case when count(*) = least(greatest(p_limit, 1), 50)
      then greatest(p_offset, 0) + count(*) else null end
  ) into result
  from visible;

  return result;
end;
$$;

revoke all on function public.list_profile_connections(text, text, integer, integer) from public;
grant execute on function public.list_profile_connections(text, text, integer, integer) to anon, authenticated;

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
  select p.id into target_id
  from public.profiles p
  join public.user_settings us on us.user_id = p.id and us.shelf_public = true
  where p.username = public.normalize_username(p_username)
  limit 1;
  if target_id is null then raise exception 'Public profile not found'; end if;
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
