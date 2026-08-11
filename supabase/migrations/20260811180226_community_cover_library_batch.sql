-- Fetch one approved community cover per local library book in a single request.
create or replace function public.get_approved_covers_for_library(p_books jsonb)
returns table(client_key text, image_url text, source text, confidence integer)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_books is null or jsonb_typeof(p_books) <> 'array' then
    return;
  end if;
  if jsonb_array_length(p_books) > 500 then
    raise exception 'Too many books';
  end if;

  return query
  with input as (
    select
      coalesce(nullif(item->>'key',''), ordinality::text) as client_key,
      public.normalize_book_answer(coalesce(item->>'title','')) as nt,
      public.normalize_book_answer(coalesce(item->>'author','')) as na,
      case
        when upper(regexp_replace(coalesce(item->>'isbn',''), '[^0-9Xx]', '', 'g')) ~ '^(?:[0-9]{13}|[0-9]{9}[0-9X])$'
          then upper(regexp_replace(coalesce(item->>'isbn',''), '[^0-9Xx]', '', 'g'))
        else null
      end as isbn,
      case
        when upper(regexp_replace(coalesce(item->>'asin',''), '[^A-Za-z0-9]', '', 'g')) ~ '^[A-Z0-9]{10}$'
          then upper(regexp_replace(coalesce(item->>'asin',''), '[^A-Za-z0-9]', '', 'g'))
        else null
      end as asin
    from jsonb_array_elements(p_books) with ordinality as entries(item, ordinality)
  ), ranked as (
    select
      i.client_key,
      c.image_url,
      coalesce(nullif(c.source,''), 'Community') as source,
      c.confidence,
      row_number() over (
        partition by i.client_key
        order by
          case
            when i.isbn is not null and b.isbn = i.isbn then 3
            when i.asin is not null and b.asin = i.asin then 2
            else 1
          end desc,
          c.confidence desc,
          c.correct_votes desc,
          c.updated_at desc
      ) as rn
    from input i
    join public.books b on (
      (i.isbn is not null and b.isbn = i.isbn)
      or (i.asin is not null and b.asin = i.asin)
      or (
        char_length(i.nt) > 0 and char_length(i.na) > 0
        and b.normalized_title = i.nt
        and b.normalized_author = i.na
      )
    )
    join public.cover_candidates c on c.book_id = b.id and c.status = 'approved'
  )
  select r.client_key, r.image_url, r.source, r.confidence
  from ranked r
  where r.rn = 1;
end;
$$;

grant execute on function public.get_approved_covers_for_library(jsonb) to anon, authenticated;
