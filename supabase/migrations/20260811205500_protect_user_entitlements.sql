revoke insert, update, delete on table public.user_settings from anon, authenticated;
grant select on table public.user_settings to authenticated;
