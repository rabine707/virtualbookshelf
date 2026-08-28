-- Return one privacy-safe Help the Shelf task backed by a real reader shelf.
-- The function must be security definer because user_books RLS intentionally
-- prevents readers from seeing which books belong to other accounts. Only
-- aggregate demand and candidate/book metadata leave this function.
create or replace function public.get_next_shelf_cover_candidate(
  p_excluded_ids uuid[] default '{}'::uuid[]
)
returns table(
  id uuid,
  image_url text,
  book_id uuid,
  source_title text,
  source_author text,
  status text,
  title text,
  author text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  if cardinality(coalesce(p_excluded_ids, '{}'::uuid[])) > 100 then
    raise exception 'Too many excluded candidates';
  end if;

  return query
  with shelf_demand as (
    select
      ub.book_id,
      count(*) filter (
        where ub.preferred_cover_url is null or btrim(ub.preferred_cover_url) = ''
      )::integer as missing_cover_count,
      count(*) filter (
        where (ub.preferred_cover_url is null or btrim(ub.preferred_cover_url) = '')
          and ub.import_source is not null
          and btrim(ub.import_source) <> ''
      )::integer as imported_missing_count
    from public.user_books ub
    group by ub.book_id
  )
  select
    c.id,
    c.image_url,
    c.book_id,
    c.source_title,
    c.source_author,
    c.status,
    b.title,
    b.author
  from public.cover_candidates c
  join public.books b on b.id = c.book_id
  join shelf_demand d on d.book_id = c.book_id and d.missing_cover_count > 0
  where c.status in ('pending', 'needs_identification')
    and not (c.id = any(coalesce(p_excluded_ids, '{}'::uuid[])))
    and not exists (
      select 1
      from public.cover_candidate_votes v
      where v.candidate_id = c.id and v.user_id = uid
    )
  order by
    (d.imported_missing_count > 0) desc,
    d.missing_cover_count desc,
    random()
  limit 1;
end;
$$;

revoke all on function public.get_next_shelf_cover_candidate(uuid[]) from public;
revoke all on function public.get_next_shelf_cover_candidate(uuid[]) from anon;
grant execute on function public.get_next_shelf_cover_candidate(uuid[]) to authenticated;
