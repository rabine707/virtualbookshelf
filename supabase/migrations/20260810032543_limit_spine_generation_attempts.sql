create table if not exists public.spine_generation_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_key text not null,
  title text not null default '',
  author text not null default '',
  isbn text,
  asin text,
  attempts integer not null default 0 check (attempts >= 0 and attempts <= 3),
  last_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, book_key)
);

alter table public.spine_generation_usage enable row level security;

create policy "generation_usage_own_read"
on public.spine_generation_usage for select to authenticated
using (auth.uid() = user_id);

create or replace function public.consume_spine_generation_attempt(
  p_book_key text,
  p_title text,
  p_author text,
  p_isbn text default null,
  p_asin text default null,
  p_limit integer default 3
)
returns table (allowed boolean, attempts integer, remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  current_attempts integer;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  insert into public.spine_generation_usage (
    user_id, book_key, title, author, isbn, asin, attempts, last_generated_at, updated_at
  ) values (
    uid, p_book_key, coalesce(p_title,''), coalesce(p_author,''), p_isbn, p_asin, 0, null, now()
  ) on conflict (user_id, book_key) do nothing;

  select s.attempts into current_attempts
  from public.spine_generation_usage s
  where s.user_id = uid and s.book_key = p_book_key
  for update;

  if current_attempts >= p_limit then
    return query select false, current_attempts, 0;
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

  return query select true, current_attempts, greatest(p_limit - current_attempts, 0);
end;
$$;

revoke execute on function public.consume_spine_generation_attempt(text,text,text,text,text,integer) from public, anon;
grant execute on function public.consume_spine_generation_attempt(text,text,text,text,text,integer) to authenticated;

create index if not exists spine_generation_usage_book_key_idx on public.spine_generation_usage(book_key);
