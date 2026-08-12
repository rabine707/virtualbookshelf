create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.api_rate_limit_buckets (
  bucket_key text primary key,
  request_count integer not null default 0 check (request_count >= 0),
  reset_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint api_rate_limit_bucket_key_length check (char_length(bucket_key) between 16 and 200)
);

revoke all on table private.api_rate_limit_buckets from public, anon, authenticated;
grant select, insert, update, delete on table private.api_rate_limit_buckets to service_role;

create index if not exists api_rate_limit_buckets_reset_at_idx
  on private.api_rate_limit_buckets(reset_at);

create or replace function public.consume_api_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table(
  allowed boolean,
  request_count integer,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  safe_key text := left(trim(coalesce(p_bucket_key, '')), 200);
  safe_limit integer := greatest(1, least(coalesce(p_limit, 1), 10000));
  safe_window integer := greatest(1, least(coalesce(p_window_seconds, 60), 86400));
  current_count integer;
  current_reset timestamptz;
begin
  if char_length(safe_key) < 16 then
    raise exception 'Invalid rate-limit key';
  end if;

  insert into private.api_rate_limit_buckets(bucket_key, request_count, reset_at, updated_at)
  values (safe_key, 1, now() + make_interval(secs => safe_window), now())
  on conflict (bucket_key) do update
  set request_count = case
        when private.api_rate_limit_buckets.reset_at <= now() then 1
        else private.api_rate_limit_buckets.request_count + 1
      end,
      reset_at = case
        when private.api_rate_limit_buckets.reset_at <= now() then now() + make_interval(secs => safe_window)
        else private.api_rate_limit_buckets.reset_at
      end,
      updated_at = now()
  returning private.api_rate_limit_buckets.request_count,
            private.api_rate_limit_buckets.reset_at
  into current_count, current_reset;

  if random() < 0.01 then
    delete from private.api_rate_limit_buckets
    where reset_at < now() - interval '1 day';
  end if;

  return query select
    current_count <= safe_limit,
    current_count,
    greatest(safe_limit - current_count, 0),
    case
      when current_count <= safe_limit then 0
      else greatest(1, ceil(extract(epoch from (current_reset - now())))::integer)
    end;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer) to service_role;
