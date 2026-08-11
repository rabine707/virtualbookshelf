create or replace function public.get_my_shelf()
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); result jsonb;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  select jsonb_build_object(
    'books',coalesce((select jsonb_agg(jsonb_build_object(
      'id',coalesce(ub.client_key,b.id::text),'cloudBookId',b.id,'title',b.title,'author',b.author,'isbn',b.isbn,'asin',b.asin,
      'rating',ub.rating,'year',ub.published_year,'shelf',ub.goodreads_shelf,'importSource',ub.import_source,'color',ub.color,
      'preferredCover',case when ub.preferred_cover_url is null then null else jsonb_build_object('url',ub.preferred_cover_url,'source',coalesce(ub.preferred_cover_source,'Cloud')) end,
      'coverFeedback',ub.cover_feedback,'savedCovers',ub.saved_covers,'favorite',ub.favorite,'selectedSpineId',coalesce(ub.selected_spine_id,s.id),
      'spineStoragePath',s.storage_path,'spineProvider',s.provider,'spineModel',s.model,'updatedAt',ub.updated_at
    ) order by ub.created_at,b.title)
    from public.user_books ub join public.books b on b.id=ub.book_id
    left join lateral (
      select sp.id,sp.storage_path,sp.provider,sp.model from public.spines sp
      where sp.book_id=ub.book_id and (sp.status='approved' or sp.id=ub.selected_spine_id)
      order by (sp.id=ub.selected_spine_id) desc,sp.vote_score desc,sp.created_at desc limit 1
    ) s on true where ub.user_id=uid),'[]'::jsonb),
    'settings',(select to_jsonb(us)-'user_id' from public.user_settings us where us.user_id=uid)
  ) into result;
  return result;
end; $$;
revoke all on function public.get_my_shelf() from public;
grant execute on function public.get_my_shelf() to authenticated;

create or replace function public.get_public_shelf(p_username text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare target_id uuid; result jsonb;
begin
  select p.id into target_id from public.profiles p where p.username=public.normalize_username(p_username) limit 1;
  if target_id is null then return null; end if;
  if not exists(select 1 from public.user_settings us where us.user_id=target_id and us.shelf_public=true) then return null; end if;
  select jsonb_build_object(
    'profile',jsonb_build_object('username',p.username,'display_name',p.display_name,'avatar_url',p.avatar_url,'bio',p.bio,'trusted_curator',p.trusted_curator),
    'settings',jsonb_build_object('theme',us.theme,'community_stars',us.community_stars,'plan',us.plan),
    'books',coalesce((select jsonb_agg(jsonb_build_object(
      'title',b.title,'author',b.author,'isbn',b.isbn,'asin',b.asin,'rating',ub.rating,'year',ub.published_year,'shelf',ub.goodreads_shelf,'color',ub.color,
      'preferredCover',case when ub.preferred_cover_url is null then null else jsonb_build_object('url',ub.preferred_cover_url,'source',coalesce(ub.preferred_cover_source,'Reader choice')) end,
      'spineStoragePath',s.storage_path,'spineProvider',s.provider,'spineModel',s.model
    ) order by ub.created_at,b.title)
    from public.user_books ub join public.books b on b.id=ub.book_id
    left join lateral (
      select sp.storage_path,sp.provider,sp.model from public.spines sp
      where sp.book_id=ub.book_id and (sp.status='approved' or sp.id=ub.selected_spine_id)
      order by (sp.id=ub.selected_spine_id) desc,sp.vote_score desc,sp.created_at desc limit 1
    ) s on true where ub.user_id=target_id),'[]'::jsonb)
  ) into result from public.profiles p join public.user_settings us on us.user_id=p.id where p.id=target_id;
  return result;
end; $$;
revoke all on function public.get_public_shelf(text) from public;
grant execute on function public.get_public_shelf(text) to anon,authenticated;
