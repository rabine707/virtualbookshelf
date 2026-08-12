create or replace function public.refund_spine_generation_attempt(p_book_key text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  next_attempts integer;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  update public.spine_generation_usage
  set attempts = greatest(attempts - 1, 0), updated_at = now()
  where user_id = uid and book_key = p_book_key
  returning attempts into next_attempts;
  return coalesce(next_attempts, 0);
end;
$$;
revoke execute on function public.refund_spine_generation_attempt(text) from public, anon;
grant execute on function public.refund_spine_generation_attempt(text) to authenticated;
