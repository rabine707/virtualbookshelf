drop function if exists public.consume_spine_generation_attempt(text,text,text,text,text,integer);

create or replace function public.consume_spine_generation_attempt(
  p_book_key text,
  p_title text,
  p_author text,
  p_isbn text default null,
  p_asin text default null,
  p_limit integer default 3
)
returns table (
  allowed boolean,
  attempts integer,
  remaining integer,
  shared_storage_path text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  current_attempts integer;
  shared_path text;
  norm_title text := lower(regexp_replace(coalesce(p_title,''), '[^a-zA-Z0-9]+', ' ', 'g'));
  norm_author text := lower(regexp_replace(coalesce(p_author,''), '[^a-zA-Z0-9]+', ' ', 'g'));
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  select s.storage_path into shared_path
  from public.spines s
  join public.books b on b.id = s.book_id
  where s.status = 'approved'
    and (
      (p_isbn is not null and b.isbn = p_isbn)
      or (p_asin is not null and b.asin = p_asin)
      or (b.normalized_title = trim(norm_title) and b.normalized_author = trim(norm_author))
    )
  order by s.vote_score desc, s.created_at desc
  limit 1;

  if shared_path is not null then
    select coalesce(u.attempts, 0) into current_attempts
    from public.spine_generation_usage u
    where u.user_id = uid and u.book_key = p_book_key;
    current_attempts := coalesce(current_attempts, 0);
    return query select false, current_attempts, greatest(p_limit - current_attempts, 0), shared_path;
    return;
  end if;

  insert into public.spine_generation_usage (
    user_id, book_key, title, author, isbn, asin, attempts, last_generated_at, updated_at
  ) values (
    uid, p_book_key, coalesce(p_title,''), coalesce(p_author,''), p_isbn, p_asin, 0, null, now()
  ) on conflict (user_id, book_key) do nothing;

  select u.attempts into current_attempts
  from public.spine_generation_usage u
  where u.user_id = uid and u.book_key = p_book_key
  for update;

  if current_attempts >= p_limit then
    return query select false, current_attempts, 0, null::text;
    return;
  end if;

  update public.spine_generation_usage
  set attempts = attempts + 1,
      title = coalesce(nullif(p_title,''), title),
      author = coalesce(nullif(p_author,''), author),
      isbn = coalesce(p_isbn, isbn),
      asin = coalesce(p_asin, asin),
      last_generated_at = now(),
      updated_at = now()
  where user_id = uid and book_key = p_book_key
  returning spine_generation_usage.attempts into current_attempts;

  return query select true, current_attempts, greatest(p_limit - current_attempts, 0), null::text;
end;
$$;

revoke execute on function public.consume_spine_generation_attempt(text,text,text,text,text,integer) from public, anon;
grant execute on function public.consume_spine_generation_attempt(text,text,text,text,text,integer) to authenticated;
