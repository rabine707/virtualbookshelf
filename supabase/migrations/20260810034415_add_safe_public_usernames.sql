alter table public.profiles
  add column if not exists username text,
  add column if not exists avatar_url text,
  add column if not exists bio text,
  add column if not exists username_changed_at timestamptz;

create or replace function public.normalize_username(value text)
returns text
language sql
immutable
set search_path = public
as $$
  select lower(trim(coalesce(value, '')))
$$;

create or replace function public.username_is_allowed(value text)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  u text := public.normalize_username(value);
  compact text := regexp_replace(public.normalize_username(value), '[^a-z0-9]', '', 'g');
  blocked text[] := array[
    'admin','administrator','moderator','mod','support','staff','official','shelfoffame','shelf_of_fame','supabase','root','system','help','security',
    'fuck','fucker','fucking','shit','bullshit','bitch','cunt','dick','cock','pussy','asshole','bastard','whore','slut','porn','porno','sex','nude','nudes','naked',
    'nigger','nigga','faggot','fag','retard','tranny','kike','chink','spic','wetback'
  ];
  term text;
begin
  if u !~ '^[a-z0-9][a-z0-9_.]{2,23}$' then
    return false;
  end if;
  if u ~ '[_.]{2,}' then
    return false;
  end if;
  foreach term in array blocked loop
    if u = term or compact = regexp_replace(term, '[^a-z0-9]', '', 'g') or compact like '%' || regexp_replace(term, '[^a-z0-9]', '', 'g') || '%' then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

update public.profiles
set username = 'reader_' || substr(replace(id::text, '-', ''), 1, 8)
where username is null;

alter table public.profiles
  alter column username set not null;

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username));

alter table public.profiles
  drop constraint if exists profiles_username_format_check;
alter table public.profiles
  add constraint profiles_username_format_check check (public.username_is_allowed(username));

alter table public.profiles
  drop constraint if exists profiles_display_name_length_check;
alter table public.profiles
  add constraint profiles_display_name_length_check check (display_name is null or char_length(display_name) between 1 and 50);

alter table public.profiles
  drop constraint if exists profiles_bio_length_check;
alter table public.profiles
  add constraint profiles_bio_length_check check (bio is null or char_length(bio) <= 240);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text := public.normalize_username(new.raw_user_meta_data->>'username');
  requested_display_name text := nullif(trim(new.raw_user_meta_data->>'display_name'), '');
begin
  if not public.username_is_allowed(requested_username) then
    raise exception 'Username is unavailable or not allowed.' using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, username, display_name, username_changed_at)
  values (new.id, requested_username, coalesce(requested_display_name, requested_username), now());
  return new;
exception
  when unique_violation then
    raise exception 'Username is already taken.' using errcode = 'unique_violation';
end;
$$;

create or replace function public.username_available(candidate text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.username_is_allowed(candidate)
    and not exists (
      select 1 from public.profiles p
      where lower(p.username) = public.normalize_username(candidate)
    )
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.username_is_allowed(text) to anon, authenticated;
grant execute on function public.normalize_username(text) to anon, authenticated;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_public on public.profiles;
create policy profiles_select_public
on public.profiles for select
to anon, authenticated
using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

revoke insert, delete on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (username, display_name, avatar_url, bio, username_changed_at) on public.profiles to authenticated;
