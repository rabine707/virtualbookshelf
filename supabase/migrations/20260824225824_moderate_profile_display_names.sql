create or replace function public.display_name_is_allowed(value text)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  d text := lower(trim(coalesce(value, '')));
  compact text := regexp_replace(lower(trim(coalesce(value, ''))), '[^a-z0-9]', '', 'g');
  blocked text[] := array[
    'admin','administrator','moderator','mod','support','staff','official','shelfoffame','shelf_of_fame','supabase','root','system','help','security',
    'fuck','fucker','fucking','shit','bullshit','bitch','cunt','dick','cock','pussy','asshole','bastard','whore','slut','porn','porno','sex','nude','nudes','naked',
    'nigger','nigga','faggot','fag','retard','tranny','kike','chink','spic','wetback'
  ];
  term text;
begin
  if char_length(trim(coalesce(value, ''))) not between 1 and 50 then
    return false;
  end if;
  foreach term in array blocked loop
    if d = term
       or compact = regexp_replace(term, '[^a-z0-9]', '', 'g')
       or compact like '%' || regexp_replace(term, '[^a-z0-9]', '', 'g') || '%' then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

alter table public.profiles
  drop constraint if exists profiles_display_name_length_check;
alter table public.profiles
  drop constraint if exists profiles_display_name_allowed_check;
alter table public.profiles
  add constraint profiles_display_name_allowed_check
  check (display_name is null or public.display_name_is_allowed(display_name)) not valid;

alter table public.profiles
  validate constraint profiles_display_name_allowed_check;

grant execute on function public.display_name_is_allowed(text) to anon, authenticated;
