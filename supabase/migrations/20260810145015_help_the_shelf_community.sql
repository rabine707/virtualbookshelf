-- Shared cover candidates and crowdsourced identification for Help the Shelf.
create table if not exists public.cover_candidates (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references public.books(id) on delete set null,
  image_url text not null,
  source text,
  source_identifier text,
  source_title text,
  source_author text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','needs_identification')),
  confidence integer not null default 0 check (confidence between 0 and 100),
  correct_votes integer not null default 0,
  wrong_votes integer not null default 0,
  different_edition_votes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (image_url)
);

create table if not exists public.cover_candidate_votes (
  candidate_id uuid not null references public.cover_candidates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vote text not null check (vote in ('correct','wrong','different_edition')),
  created_at timestamptz not null default now(),
  primary key (candidate_id, user_id)
);

create table if not exists public.cover_identifications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.cover_candidates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  author text not null check (char_length(author) between 1 and 200),
  normalized_title text not null,
  normalized_author text not null,
  created_at timestamptz not null default now(),
  unique (candidate_id, user_id)
);

alter table public.cover_candidates enable row level security;
alter table public.cover_candidate_votes enable row level security;
alter table public.cover_identifications enable row level security;

drop policy if exists cover_candidates_read on public.cover_candidates;
create policy cover_candidates_read on public.cover_candidates for select using (true);

drop policy if exists cover_votes_read_own on public.cover_candidate_votes;
create policy cover_votes_read_own on public.cover_candidate_votes for select using (auth.uid() = user_id);
drop policy if exists cover_votes_insert_own on public.cover_candidate_votes;
create policy cover_votes_insert_own on public.cover_candidate_votes for insert with check (auth.uid() = user_id);

drop policy if exists cover_identifications_read on public.cover_identifications;
create policy cover_identifications_read on public.cover_identifications for select using (true);
drop policy if exists cover_identifications_insert_own on public.cover_identifications;
create policy cover_identifications_insert_own on public.cover_identifications for insert with check (auth.uid() = user_id);

create or replace function public.normalize_book_answer(value text)
returns text language sql immutable set search_path=public as $$
  select trim(lower(regexp_replace(coalesce(value,''), '[^a-zA-Z0-9]+', ' ', 'g')))
$$;

create or replace function public.submit_cover_vote(p_candidate_id uuid, p_vote text)
returns void language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_vote not in ('correct','wrong','different_edition') then raise exception 'Invalid vote'; end if;
  insert into public.cover_candidate_votes(candidate_id,user_id,vote) values(p_candidate_id,uid,p_vote)
  on conflict(candidate_id,user_id) do update set vote=excluded.vote, created_at=now();
  update public.cover_candidates c set
    correct_votes=(select count(*) from public.cover_candidate_votes v where v.candidate_id=c.id and v.vote='correct'),
    wrong_votes=(select count(*) from public.cover_candidate_votes v where v.candidate_id=c.id and v.vote='wrong'),
    different_edition_votes=(select count(*) from public.cover_candidate_votes v where v.candidate_id=c.id and v.vote='different_edition'),
    updated_at=now()
  where c.id=p_candidate_id;
end $$;

create or replace function public.submit_cover_identification(p_candidate_id uuid, p_title text, p_author text)
returns void language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); nt text; na text;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  nt := public.normalize_book_answer(p_title); na := public.normalize_book_answer(p_author);
  if char_length(nt)=0 or char_length(na)=0 then raise exception 'Title and author are required'; end if;
  insert into public.cover_identifications(candidate_id,user_id,title,author,normalized_title,normalized_author)
  values(p_candidate_id,uid,trim(p_title),trim(p_author),nt,na)
  on conflict(candidate_id,user_id) do update set title=excluded.title,author=excluded.author,normalized_title=excluded.normalized_title,normalized_author=excluded.normalized_author,created_at=now();
end $$;

grant execute on function public.submit_cover_vote(uuid,text) to authenticated;
grant execute on function public.submit_cover_identification(uuid,text,text) to authenticated;
