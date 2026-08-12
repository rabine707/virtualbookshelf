create or replace function public.username_available(candidate text)
returns boolean
language sql
security invoker
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
