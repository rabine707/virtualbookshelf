alter table public.user_books
  add column if not exists client_key text,
  add column if not exists rating integer,
  add column if not exists published_year text,
  add column if not exists goodreads_shelf text,
  add column if not exists import_source text,
  add column if not exists color text,
  add column if not exists preferred_cover_url text,
  add column if not exists preferred_cover_source text,
  add column if not exists cover_feedback jsonb not null default '{}'::jsonb,
  add column if not exists saved_covers jsonb not null default '[]'::jsonb,
  add column if not exists favorite boolean not null default false,
  add column if not exists selected_spine_id uuid references public.spines(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists user_books_user_client_key_idx
  on public.user_books(user_id, client_key)
  where client_key is not null;
create index if not exists user_books_user_updated_idx
  on public.user_books(user_id, updated_at desc);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'classic',
  spine_labels boolean not null default true,
  decor_owned jsonb not null default '[]'::jsonb,
  decor_active jsonb not null default '{}'::jsonb,
  community_stars integer not null default 0 check (community_stars >= 0),
  shelf_public boolean not null default false,
  plan text not null default 'free' check (plan in ('free','supporter','premium')),
  premium_themes text[] not null default '{}'::text[],
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;
drop policy if exists user_settings_own_all on public.user_settings;
create policy user_settings_own_all on public.user_settings
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.shelf_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_name text,
  detected_books jsonb not null default '[]'::jsonb,
  detected_count integer not null default 0,
  accepted_count integer not null default 0,
  status text not null default 'complete' check (status in ('complete','partial','failed')),
  created_at timestamptz not null default now()
);
create index if not exists shelf_scans_user_created_idx on public.shelf_scans(user_id, created_at desc);
alter table public.shelf_scans enable row level security;
drop policy if exists shelf_scans_own_all on public.shelf_scans;
create policy shelf_scans_own_all on public.shelf_scans
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.get_my_shelf()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result jsonb;
begin
  if uid is null then raise exception 'Authentication required'; end if;

  select jsonb_build_object(
    'books', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', coalesce(ub.client_key, b.id::text),
        'cloudBookId', b.id,
        'title', b.title,
        'author', b.author,
        'isbn', b.isbn,
        'asin', b.asin,
        'rating', ub.rating,
        'year', ub.published_year,
        'shelf', ub.goodreads_shelf,
        'importSource', ub.import_source,
        'color', ub.color,
        'preferredCover', case when ub.preferred_cover_url is null then null else jsonb_build_object('url', ub.preferred_cover_url, 'source', coalesce(ub.preferred_cover_source, 'Cloud')) end,
        'coverFeedback', ub.cover_feedback,
        'savedCovers', ub.saved_covers,
        'favorite', ub.favorite,
        'selectedSpineId', ub.selected_spine_id,
        'spineStoragePath', s.storage_path,
        'spineProvider', s.provider,
        'spineModel', s.model,
        'updatedAt', ub.updated_at
      ) order by ub.created_at, b.title)
      from public.user_books ub
      join public.books b on b.id = ub.book_id
      left join public.spines s on s.id = ub.selected_spine_id
      where ub.user_id = uid
    ), '[]'::jsonb),
    'settings', (
      select to_jsonb(us) - 'user_id'
      from public.user_settings us
      where us.user_id = uid
    )
  ) into result;

  return result;
end;
$$;
revoke all on function public.get_my_shelf() from public;
grant execute on function public.get_my_shelf() to authenticated;

create or replace function public.sync_my_shelf(p_books jsonb, p_settings jsonb default null, p_replace boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  item jsonb;
  bid uuid;
  local_key text;
  v_title text;
  v_author text;
  v_isbn text;
  v_asin text;
  nt text;
  na text;
  preferred jsonb;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_books is null or jsonb_typeof(p_books) <> 'array' then raise exception 'Books must be an array'; end if;
  if jsonb_array_length(p_books) > 2000 then raise exception 'Too many books in one sync'; end if;

  for item in select value from jsonb_array_elements(p_books)
  loop
    local_key := nullif(left(trim(coalesce(item->>'id','')), 300), '');
    v_title := left(trim(coalesce(item->>'title','')), 500);
    v_author := left(trim(coalesce(item->>'author','Unknown author')), 300);
    if v_title = '' then continue; end if;
    if v_author = '' then v_author := 'Unknown author'; end if;
    v_isbn := nullif(left(regexp_replace(coalesce(item->>'isbn',''), '[^0-9Xx]', '', 'g'), 32), '');
    v_asin := nullif(left(trim(coalesce(item->>'asin','')), 64), '');
    nt := public.normalize_book_answer(v_title);
    na := public.normalize_book_answer(v_author);
    bid := null;

    if v_isbn is not null then select id into bid from public.books where isbn = v_isbn limit 1; end if;
    if bid is null and v_asin is not null then select id into bid from public.books where asin = v_asin limit 1; end if;
    if bid is null then
      select id into bid from public.books where normalized_title = nt and normalized_author = na order by created_at limit 1;
    end if;

    if bid is null then
      begin
        insert into public.books(isbn, asin, title, author, normalized_title, normalized_author)
        values(v_isbn, v_asin, v_title, v_author, nt, na)
        returning id into bid;
      exception when unique_violation then
        if v_isbn is not null then select id into bid from public.books where isbn = v_isbn limit 1; end if;
        if bid is null and v_asin is not null then select id into bid from public.books where asin = v_asin limit 1; end if;
      end;
    end if;

    if bid is null then continue; end if;

    update public.books
      set isbn = coalesce(isbn, v_isbn),
          asin = coalesce(asin, v_asin),
          title = case when length(v_title) > 0 then v_title else title end,
          author = case when length(v_author) > 0 then v_author else author end,
          normalized_title = nt,
          normalized_author = na
      where id = bid;

    if local_key is not null then
      delete from public.user_books where user_id = uid and client_key = local_key and book_id <> bid;
    end if;

    preferred := item->'preferredCover';
    insert into public.user_books(
      user_id, book_id, shelf, client_key, rating, published_year, goodreads_shelf,
      import_source, color, preferred_cover_url, preferred_cover_source,
      cover_feedback, saved_covers, favorite, selected_spine_id, updated_at
    ) values (
      uid, bid, 'library', local_key,
      case when (item->>'rating') ~ '^[0-9]+$' then least(greatest((item->>'rating')::integer,0),5) else null end,
      nullif(left(item->>'year', 32), ''),
      nullif(left(item->>'shelf', 120), ''),
      nullif(left(item->>'importSource', 120), ''),
      nullif(left(item->>'color', 40), ''),
      nullif(left(preferred->>'url', 3000), ''),
      nullif(left(preferred->>'source', 160), ''),
      case when jsonb_typeof(item->'coverFeedback') = 'object' then item->'coverFeedback' else '{}'::jsonb end,
      case when jsonb_typeof(item->'savedCovers') = 'array' then item->'savedCovers' else '[]'::jsonb end,
      coalesce((item->>'favorite')::boolean, false),
      case when coalesce(item->>'selectedSpineId','') ~* '^[0-9a-f-]{36}$' then (item->>'selectedSpineId')::uuid else null end,
      now()
    )
    on conflict (user_id, book_id) do update set
      client_key = coalesce(excluded.client_key, public.user_books.client_key),
      rating = excluded.rating,
      published_year = excluded.published_year,
      goodreads_shelf = excluded.goodreads_shelf,
      import_source = excluded.import_source,
      color = excluded.color,
      preferred_cover_url = excluded.preferred_cover_url,
      preferred_cover_source = excluded.preferred_cover_source,
      cover_feedback = excluded.cover_feedback,
      saved_covers = excluded.saved_covers,
      favorite = excluded.favorite,
      selected_spine_id = coalesce(excluded.selected_spine_id, public.user_books.selected_spine_id),
      updated_at = now();
  end loop;

  if p_replace then
    delete from public.user_books ub
    where ub.user_id = uid
      and ub.client_key is not null
      and not exists (
        select 1 from jsonb_array_elements(p_books) x
        where nullif(trim(coalesce(x->>'id','')), '') = ub.client_key
      );
  end if;

  if p_settings is not null and jsonb_typeof(p_settings) = 'object' then
    insert into public.user_settings(user_id, theme, spine_labels, decor_owned, decor_active, community_stars, shelf_public, updated_at)
    values(
      uid,
      case when p_settings->>'theme' in ('classic','dark-academia','botanical','fantasy','cozy','gothic','celestial') then p_settings->>'theme' else 'classic' end,
      coalesce((p_settings->>'spine_labels')::boolean, true),
      case when jsonb_typeof(p_settings->'decor_owned')='array' then p_settings->'decor_owned' else '[]'::jsonb end,
      case when jsonb_typeof(p_settings->'decor_active')='object' then p_settings->'decor_active' else '{}'::jsonb end,
      greatest(coalesce((p_settings->>'community_stars')::integer,0),0),
      coalesce((p_settings->>'shelf_public')::boolean,false),
      now()
    )
    on conflict(user_id) do update set
      theme=excluded.theme,
      spine_labels=excluded.spine_labels,
      decor_owned=excluded.decor_owned,
      decor_active=excluded.decor_active,
      community_stars=greatest(public.user_settings.community_stars, excluded.community_stars),
      shelf_public=excluded.shelf_public,
      updated_at=now();
  end if;

  return public.get_my_shelf();
end;
$$;
revoke all on function public.sync_my_shelf(jsonb,jsonb,boolean) from public;
grant execute on function public.sync_my_shelf(jsonb,jsonb,boolean) to authenticated;

create or replace function public.update_my_shelf_settings(p_settings jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_settings is null or jsonb_typeof(p_settings) <> 'object' then raise exception 'Settings must be an object'; end if;
  insert into public.user_settings(user_id, theme, spine_labels, decor_owned, decor_active, community_stars, shelf_public, updated_at)
  values(
    uid,
    case when p_settings ? 'theme' and p_settings->>'theme' in ('classic','dark-academia','botanical','fantasy','cozy','gothic','celestial') then p_settings->>'theme' else 'classic' end,
    coalesce((p_settings->>'spine_labels')::boolean,true),
    case when jsonb_typeof(p_settings->'decor_owned')='array' then p_settings->'decor_owned' else '[]'::jsonb end,
    case when jsonb_typeof(p_settings->'decor_active')='object' then p_settings->'decor_active' else '{}'::jsonb end,
    greatest(coalesce((p_settings->>'community_stars')::integer,0),0),
    coalesce((p_settings->>'shelf_public')::boolean,false),
    now()
  )
  on conflict(user_id) do update set
    theme=case when p_settings ? 'theme' then excluded.theme else public.user_settings.theme end,
    spine_labels=case when p_settings ? 'spine_labels' then excluded.spine_labels else public.user_settings.spine_labels end,
    decor_owned=case when p_settings ? 'decor_owned' then excluded.decor_owned else public.user_settings.decor_owned end,
    decor_active=case when p_settings ? 'decor_active' then excluded.decor_active else public.user_settings.decor_active end,
    community_stars=case when p_settings ? 'community_stars' then greatest(public.user_settings.community_stars, excluded.community_stars) else public.user_settings.community_stars end,
    shelf_public=case when p_settings ? 'shelf_public' then excluded.shelf_public else public.user_settings.shelf_public end,
    updated_at=now();
  return (select to_jsonb(us)-'user_id' from public.user_settings us where us.user_id=uid);
end;
$$;
revoke all on function public.update_my_shelf_settings(jsonb) from public;
grant execute on function public.update_my_shelf_settings(jsonb) to authenticated;

create or replace function public.get_public_shelf(p_username text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare target_id uuid; result jsonb;
begin
  select p.id into target_id from public.profiles p where p.username = public.normalize_username(p_username) limit 1;
  if target_id is null then return null; end if;
  if not exists(select 1 from public.user_settings us where us.user_id=target_id and us.shelf_public=true) then return null; end if;

  select jsonb_build_object(
    'profile', jsonb_build_object(
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      'bio', p.bio,
      'trusted_curator', p.trusted_curator
    ),
    'settings', jsonb_build_object(
      'theme', us.theme,
      'community_stars', us.community_stars,
      'plan', us.plan
    ),
    'books', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', b.title,
        'author', b.author,
        'isbn', b.isbn,
        'asin', b.asin,
        'rating', ub.rating,
        'year', ub.published_year,
        'shelf', ub.goodreads_shelf,
        'color', ub.color,
        'preferredCover', case when ub.preferred_cover_url is null then null else jsonb_build_object('url',ub.preferred_cover_url,'source',coalesce(ub.preferred_cover_source,'Reader choice')) end,
        'spineStoragePath', s.storage_path,
        'spineProvider', s.provider,
        'spineModel', s.model
      ) order by ub.created_at, b.title)
      from public.user_books ub
      join public.books b on b.id=ub.book_id
      left join public.spines s on s.id=ub.selected_spine_id
      where ub.user_id=target_id
    ), '[]'::jsonb)
  ) into result
  from public.profiles p
  join public.user_settings us on us.user_id=p.id
  where p.id=target_id;

  return result;
end;
$$;
revoke all on function public.get_public_shelf(text) from public;
grant execute on function public.get_public_shelf(text) to anon, authenticated;
