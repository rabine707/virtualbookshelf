alter table public.spine_requests
  drop constraint if exists spine_requests_requested_by_fkey;

alter table public.spine_requests
  alter column requested_by drop not null,
  add column if not exists requester_ip_hash text;

drop index if exists public.spine_requests_one_active_per_reader_book;

create unique index if not exists spine_requests_one_per_ip_book
on public.spine_requests (book_key, requester_ip_hash)
where requester_ip_hash is not null;

drop policy if exists spine_requests_reader_select on public.spine_requests;
drop policy if exists spine_requests_reader_insert on public.spine_requests;

revoke insert on table public.spine_requests from anon, authenticated;

-- Public recommendations are inserted only by the server service role.
-- Curators retain the existing SELECT and UPDATE policies.
