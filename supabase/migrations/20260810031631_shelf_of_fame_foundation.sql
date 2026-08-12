create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  isbn text,
  asin text,
  title text not null,
  author text not null default '',
  normalized_title text not null default '',
  normalized_author text not null default '',
  created_at timestamptz not null default now(),
  unique (isbn),
  unique (asin)
);

create table if not exists public.user_books (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  shelf text not null default 'library',
  created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

create table if not exists public.spines (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  storage_path text not null unique,
  source_cover_url text,
  provider text,
  model text,
  contributed_by uuid references auth.users(id) on delete set null,
  status text not null default 'approved' check (status in ('pending','approved','rejected')),
  vote_score integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.spine_votes (
  spine_id uuid not null references public.spines(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  value smallint not null check (value in (-1,1)),
  created_at timestamptz not null default now(),
  primary key (spine_id, user_id)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.user_books enable row level security;
alter table public.spines enable row level security;
alter table public.spine_votes enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "books_public_read" on public.books for select using (true);
create policy "books_authenticated_insert" on public.books for insert to authenticated with check (true);
create policy "books_authenticated_update" on public.books for update to authenticated using (true);

create policy "user_books_own_all" on public.user_books for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "spines_public_read_approved" on public.spines for select using (status = 'approved' or auth.uid() = contributed_by);
create policy "spines_authenticated_insert" on public.spines for insert to authenticated with check (auth.uid() = contributed_by);
create policy "spines_contributor_update" on public.spines for update to authenticated using (auth.uid() = contributed_by);

create policy "votes_public_read" on public.spine_votes for select using (true);
create policy "votes_own_all" on public.spine_votes for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('spines', 'spines', true, 5242880, array['image/webp','image/png','image/jpeg'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "public_read_spines" on storage.objects for select using (bucket_id = 'spines');
create policy "authenticated_upload_spines" on storage.objects for insert to authenticated with check (bucket_id = 'spines');
create policy "owner_update_spines" on storage.objects for update to authenticated using (bucket_id = 'spines' and owner_id = auth.uid()::text);
create policy "owner_delete_spines" on storage.objects for delete to authenticated using (bucket_id = 'spines' and owner_id = auth.uid()::text);
