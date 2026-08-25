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
  left join public.user_settings us on us.user_id = p.id
  where p.username = public.normalize_username(p_username)
    and (coalesce(us.shelf_public, false) or p.id = (select auth.uid()))
  limit 1;
$$;

revoke all on function public.get_profile_social(text) from public;
grant execute on function public.get_profile_social(text) to anon, authenticated;
