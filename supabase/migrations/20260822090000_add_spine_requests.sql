create table public.spine_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null constraint spine_requests_requested_by_fkey references public.profiles(id) on delete cascade,
  book_key text not null check (length(book_key) between 6 and 500),
  title text not null check (length(btrim(title)) between 1 and 500),
  author text not null default '' check (length(author) <= 500),
  isbn text,
  asin text,
  cover_url text check (cover_url is null or length(cover_url) <= 4000),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'declined')),
  curator_note text check (curator_note is null or length(curator_note) <= 2000),
  fulfilled_spine_id uuid references public.spines(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index spine_requests_one_active_per_reader_book
on public.spine_requests (requested_by, book_key)
where status in ('pending', 'in_progress');

create index spine_requests_queue_order
on public.spine_requests (status, created_at);

alter table public.spine_requests enable row level security;

grant select, insert on table public.spine_requests to authenticated;
grant update (status, curator_note, fulfilled_spine_id, updated_at) on table public.spine_requests to authenticated;

create policy spine_requests_reader_select
on public.spine_requests for select to authenticated
using ((select auth.uid()) = requested_by);

create policy spine_requests_curator_select
on public.spine_requests for select to authenticated
using (exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and trusted_curator = true
));

create policy spine_requests_reader_insert
on public.spine_requests for insert to authenticated
with check (
  (select auth.uid()) = requested_by
  and status = 'pending'
  and curator_note is null
  and fulfilled_spine_id is null
);

create policy spine_requests_curator_update
on public.spine_requests for update to authenticated
using (exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and trusted_curator = true
))
with check (exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and trusted_curator = true
));
