create table if not exists public.shelf_scan_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  passes integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date),
  constraint shelf_scan_usage_passes_check check (passes >= 0 and passes <= 100)
);

alter table public.shelf_scan_usage enable row level security;

create or replace function public.consume_shelf_scan_pass(p_limit integer default 10)
returns table(
  allowed boolean,
  passes integer,
  remaining integer
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  today_utc date := (now() at time zone 'utc')::date;
  safe_limit integer := greatest(1, least(coalesce(p_limit, 10), 100));
  current_passes integer;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  insert into public.shelf_scan_usage (user_id, usage_date, passes, updated_at)
  values (uid, today_utc, 0, now())
  on conflict (user_id, usage_date) do nothing;

  select s.passes into current_passes
  from public.shelf_scan_usage s
  where s.user_id = uid and s.usage_date = today_utc
  for update;

  current_passes := coalesce(current_passes, 0);
  if current_passes >= safe_limit then
    return query select false, current_passes, 0;
    return;
  end if;

  update public.shelf_scan_usage s
  set passes = s.passes + 1,
      updated_at = now()
  where s.user_id = uid and s.usage_date = today_utc
  returning s.passes into current_passes;

  return query select true, current_passes, greatest(safe_limit - current_passes, 0);
end;
$function$;

revoke all on function public.consume_shelf_scan_pass(integer) from public;
revoke all on function public.consume_shelf_scan_pass(integer) from anon;
grant execute on function public.consume_shelf_scan_pass(integer) to authenticated;
