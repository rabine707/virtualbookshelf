-- Sync cover decisions made from a user's own shelf into the shared catalog.
create or replace function public.sync_library_cover_decision(
  p_title text,
  p_author text,
  p_isbn text,
  p_asin text,
  p_image_url text,
  p_source text,
  p_vote text
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid := auth.uid();
  nt text := public.normalize_book_answer(p_title);
  na text := public.normalize_book_answer(p_author);
  clean_isbn text := nullif(trim(coalesce(p_isbn, '')), '');
  clean_asin text := nullif(trim(coalesce(p_asin, '')), '');
  book_row public.books%rowtype;
  candidate_id uuid;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if char_length(nt) = 0 then raise exception 'Title is required'; end if;
  if char_length(trim(coalesce(p_image_url, ''))) = 0 then raise exception 'Cover image is required'; end if;
  if p_vote not in ('correct','wrong','different_edition') then raise exception 'Invalid vote'; end if;

  if clean_isbn is not null then
    select * into book_row from public.books where isbn = clean_isbn limit 1;
  end if;
  if book_row.id is null and clean_asin is not null then
    select * into book_row from public.books where asin = clean_asin limit 1;
  end if;
  if book_row.id is null then
    select * into book_row
    from public.books
    where normalized_title = nt and normalized_author = na
    order by created_at asc
    limit 1;
  end if;

  if book_row.id is null then
    insert into public.books(isbn, asin, title, author, normalized_title, normalized_author)
    values(clean_isbn, clean_asin, trim(p_title), trim(coalesce(p_author, '')), nt, na)
    returning * into book_row;
  else
    update public.books
    set
      isbn = coalesce(isbn, clean_isbn),
      asin = coalesce(asin, clean_asin),
      title = case when char_length(trim(title)) = 0 then trim(p_title) else title end,
      author = case when char_length(trim(author)) = 0 then trim(coalesce(p_author, '')) else author end,
      normalized_title = case when char_length(trim(normalized_title)) = 0 then nt else normalized_title end,
      normalized_author = case when char_length(trim(normalized_author)) = 0 then na else normalized_author end
    where id = book_row.id;
  end if;

  select id into candidate_id
  from public.cover_candidates
  where image_url = trim(p_image_url)
  limit 1;

  if candidate_id is null then
    insert into public.cover_candidates(
      book_id, image_url, source, source_title, source_author, status, confidence, uploaded_by
    )
    values(
      book_row.id,
      trim(p_image_url),
      nullif(trim(coalesce(p_source, '')), ''),
      trim(p_title),
      trim(coalesce(p_author, '')),
      case when p_vote = 'correct' then 'approved' else 'pending' end,
      case when p_vote = 'correct' then 100 else 0 end,
      uid
    )
    returning id into candidate_id;
  else
    update public.cover_candidates
    set
      book_id = coalesce(book_id, book_row.id),
      source = coalesce(source, nullif(trim(coalesce(p_source, '')), '')),
      source_title = coalesce(source_title, trim(p_title)),
      source_author = coalesce(source_author, trim(coalesce(p_author, ''))),
      status = case when p_vote = 'correct' then 'approved' else status end,
      confidence = case when p_vote = 'correct' then greatest(confidence, 100) else confidence end,
      updated_at = now()
    where id = candidate_id;
  end if;

  insert into public.cover_candidate_votes(candidate_id, user_id, vote)
  values(candidate_id, uid, p_vote)
  on conflict(candidate_id, user_id)
  do update set vote = excluded.vote, created_at = now();

  update public.cover_candidates c set
    correct_votes = (select count(*) from public.cover_candidate_votes v where v.candidate_id = c.id and v.vote = 'correct'),
    wrong_votes = (select count(*) from public.cover_candidate_votes v where v.candidate_id = c.id and v.vote = 'wrong'),
    different_edition_votes = (select count(*) from public.cover_candidate_votes v where v.candidate_id = c.id and v.vote = 'different_edition'),
    updated_at = now()
  where c.id = candidate_id;

  return candidate_id;
end
$$;

grant execute on function public.sync_library_cover_decision(text,text,text,text,text,text,text) to authenticated;
