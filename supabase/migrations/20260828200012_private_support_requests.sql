create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null check (category in ('account', 'import', 'cover', 'shelf', 'bug', 'other')),
  subject text not null check (char_length(btrim(subject)) between 3 and 120),
  message text not null check (char_length(btrim(message)) between 10 and 2000),
  affected_page text check (affected_page is null or char_length(btrim(affected_page)) <= 500),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_requests_user_created_idx
  on public.support_requests(user_id, created_at desc);

alter table public.support_requests enable row level security;

drop policy if exists support_requests_select_own on public.support_requests;
create policy support_requests_select_own
on public.support_requests
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists support_requests_insert_own on public.support_requests;
create policy support_requests_insert_own
on public.support_requests
for insert
to authenticated
with check ((select auth.uid()) = user_id);

revoke all on table public.support_requests from anon, authenticated;
grant select, insert on table public.support_requests to authenticated;
