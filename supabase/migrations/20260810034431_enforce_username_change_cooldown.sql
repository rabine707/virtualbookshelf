create or replace function public.enforce_profile_username_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.username is distinct from old.username then
    new.username := public.normalize_username(new.username);
    if not public.username_is_allowed(new.username) then
      raise exception 'Username is unavailable or not allowed.' using errcode = 'check_violation';
    end if;
    if old.username_changed_at is not null and old.username_changed_at > now() - interval '30 days' then
      raise exception 'Username can only be changed once every 30 days.' using errcode = 'check_violation';
    end if;
    new.username_changed_at := now();
  else
    new.username_changed_at := old.username_changed_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_enforce_username_change on public.profiles;
create trigger profiles_enforce_username_change
before update on public.profiles
for each row execute function public.enforce_profile_username_change();
