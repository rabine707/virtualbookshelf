alter table public.user_settings
  add column if not exists profile_favorite_book_ids text[] not null default '{}'::text[],
  add column if not exists profile_favorites_style text not null default 'covers';

alter table public.user_settings
  drop constraint if exists user_settings_profile_favorite_book_ids_count_check,
  drop constraint if exists user_settings_profile_favorites_style_check;

alter table public.user_settings
  add constraint user_settings_profile_favorite_book_ids_count_check check (cardinality(profile_favorite_book_ids) <= 5),
  add constraint user_settings_profile_favorites_style_check check (profile_favorites_style in ('covers', 'spines'));

create or replace function public.update_profile_favorites(p_book_ids text[], p_style text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  clean_ids text[];
  clean_style text;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  clean_ids := coalesce((select array_agg(distinct value) from unnest(coalesce(p_book_ids, '{}'::text[])) value where nullif(trim(value), '') is not null), '{}'::text[]);
  if cardinality(clean_ids) > 5 then raise exception 'Choose up to five profile favorites'; end if;
  clean_style := case when p_style in ('covers', 'spines') then p_style else 'covers' end;

  insert into public.user_settings(user_id, profile_favorite_book_ids, profile_favorites_style, updated_at)
  values(uid, clean_ids, clean_style, now())
  on conflict(user_id) do update set
    profile_favorite_book_ids = excluded.profile_favorite_book_ids,
    profile_favorites_style = excluded.profile_favorites_style,
    updated_at = now();

  return jsonb_build_object('profile_favorite_book_ids', clean_ids, 'profile_favorites_style', clean_style);
end;
$$;

revoke all on function public.update_profile_favorites(text[], text) from public, anon;
grant execute on function public.update_profile_favorites(text[], text) to authenticated;

create or replace function public.get_public_shelf(p_username text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare target_id uuid; result jsonb;
begin
  select p.id into target_id from public.profiles p where p.username=public.normalize_username(p_username) limit 1;
  if target_id is null then return null; end if;
  if not exists(select 1 from public.user_settings us where us.user_id=target_id and us.shelf_public=true) then return null; end if;
  select jsonb_build_object(
    'profile',jsonb_build_object('username',p.username,'display_name',p.display_name,'avatar_url',p.avatar_url,'bio',p.bio,'trusted_curator',p.trusted_curator),
    'settings',jsonb_build_object(
      'theme',us.theme,
      'community_stars',us.community_stars,
      'plan',us.plan,
      'profile_favorite_book_ids',us.profile_favorite_book_ids,
      'profile_favorites_style',us.profile_favorites_style
    ),
    'books',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',coalesce(ub.client_key,b.id::text),'title',b.title,'author',b.author,'isbn',b.isbn,'asin',b.asin,'rating',ub.rating,'year',ub.published_year,'shelf',ub.goodreads_shelf,'color',ub.color,
        'preferredCover',case when ub.preferred_cover_url is null then null else jsonb_build_object('url',ub.preferred_cover_url,'source',coalesce(ub.preferred_cover_source,'Reader choice')) end,
        'spineStoragePath',s.storage_path,'spineProvider',s.provider,'spineModel',s.model
      ) order by ub.created_at,b.title)
      from public.user_books ub
      join public.books b on b.id=ub.book_id
      left join lateral (
        select sp.storage_path,sp.provider,sp.model
        from public.spines sp
        where sp.book_id=ub.book_id and (sp.status='approved' or sp.id=ub.selected_spine_id)
        order by (sp.id=ub.selected_spine_id) desc,sp.vote_score desc,sp.created_at desc
        limit 1
      ) s on true
      where ub.user_id=target_id
    ),'[]'::jsonb)
  ) into result
  from public.profiles p join public.user_settings us on us.user_id=p.id where p.id=target_id;
  return result;
end;
$$;

revoke all on function public.get_public_shelf(text) from public;
grant execute on function public.get_public_shelf(text) to anon, authenticated;
