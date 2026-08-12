create or replace function public.submit_user_cover_choice(
  p_title text,
  p_author text,
  p_image_url text,
  p_source text default null,
  p_isbn text default null,
  p_asin text default null
)
returns table(candidate_id uuid, book_id uuid, status text, trusted boolean)
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid := auth.uid();
  nt text;
  na text;
  clean_isbn text;
  clean_asin text;
  bid uuid;
  cid uuid;
  current_status text;
  is_trusted boolean := false;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_title is null or char_length(trim(p_title)) = 0 then raise exception 'Title is required'; end if;
  if p_author is null or char_length(trim(p_author)) = 0 then raise exception 'Author is required'; end if;
  if p_image_url is null or p_image_url !~* '^https?://' or char_length(p_image_url) > 3000 then raise exception 'A valid cover URL is required'; end if;

  nt := public.normalize_book_answer(p_title);
  na := public.normalize_book_answer(p_author);
  if char_length(nt) = 0 or char_length(na) = 0 then raise exception 'Title and author are required'; end if;

  clean_isbn := upper(regexp_replace(coalesce(p_isbn, ''), '[^0-9Xx]', '', 'g'));
  if clean_isbn !~ '^(?:[0-9]{13}|[0-9]{9}[0-9X])$' then clean_isbn := null; end if;

  clean_asin := upper(regexp_replace(coalesce(p_asin, ''), '[^A-Za-z0-9]', '', 'g'));
  if clean_asin !~ '^[A-Z0-9]{10}$' then clean_asin := null; end if;

  select coalesce(pr.trusted_curator, false)
  into is_trusted
  from public.profiles pr
  where pr.id = uid;
  is_trusted := coalesce(is_trusted, false);

  if clean_isbn is not null then
    select b.id into bid from public.books b where b.isbn = clean_isbn limit 1;
  end if;
  if bid is null and clean_asin is not null then
    select b.id into bid from public.books b where b.asin = clean_asin limit 1;
  end if;
  if bid is null then
    select b.id into bid
    from public.books b
    where b.normalized_title = nt and b.normalized_author = na
    order by b.created_at asc
    limit 1;
  end if;

  if bid is null then
    insert into public.books(isbn, asin, title, author, normalized_title, normalized_author)
    values(clean_isbn, clean_asin, trim(p_title), trim(p_author), nt, na)
    returning id into bid;
  else
    update public.books b
    set isbn = case when b.isbn is null then clean_isbn else b.isbn end,
        asin = case when b.asin is null then clean_asin else b.asin end
    where b.id = bid;
  end if;

  select c.id, c.status into cid, current_status
  from public.cover_candidates c
  where c.image_url = p_image_url
  limit 1;

  if cid is null then
    insert into public.cover_candidates(
      book_id, image_url, source, source_title, source_author,
      status, confidence, uploaded_by, created_at, updated_at
    )
    values(
      bid, p_image_url, nullif(trim(coalesce(p_source, '')), ''), trim(p_title), trim(p_author),
      case when is_trusted then 'approved' else 'pending' end,
      case when is_trusted then 100 else 75 end,
      uid, now(), now()
    )
    returning id, cover_candidates.status into cid, current_status;
  else
    update public.cover_candidates c
    set book_id = case when is_trusted then bid when c.book_id is null then bid else c.book_id end,
        source = coalesce(nullif(trim(coalesce(p_source, '')), ''), c.source),
        source_title = coalesce(c.source_title, trim(p_title)),
        source_author = coalesce(c.source_author, trim(p_author)),
        status = case when is_trusted then 'approved' when c.status = 'approved' then 'approved' else c.status end,
        confidence = greatest(c.confidence, case when is_trusted then 100 else 75 end),
        uploaded_by = coalesce(c.uploaded_by, uid),
        updated_at = now()
    where c.id = cid
    returning c.status into current_status;
  end if;

  insert into public.cover_candidate_votes(candidate_id, user_id, vote)
  values(cid, uid, 'correct')
  on conflict on constraint cover_candidate_votes_pkey
  do update set vote = 'correct', created_at = now();

  update public.cover_candidates c
  set correct_votes = (select count(*) from public.cover_candidate_votes v where v.candidate_id = c.id and v.vote = 'correct'),
      wrong_votes = (select count(*) from public.cover_candidate_votes v where v.candidate_id = c.id and v.vote = 'wrong'),
      different_edition_votes = (select count(*) from public.cover_candidate_votes v where v.candidate_id = c.id and v.vote = 'different_edition'),
      updated_at = now()
  where c.id = cid;

  return query select cid, bid, current_status, is_trusted;
end;
$$;

revoke execute on function public.submit_user_cover_choice(text,text,text,text,text,text) from public, anon;
grant execute on function public.submit_user_cover_choice(text,text,text,text,text,text) to authenticated;
