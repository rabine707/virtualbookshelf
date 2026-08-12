-- These operations do not need elevated privileges. Run them as the caller so
-- normal grants and RLS remain in force and the privileged RPC surface stays small.
alter function public.get_approved_cover_candidates(text, text, text, text) security invoker;
alter function public.get_approved_covers_for_library(jsonb) security invoker;
alter function public.get_my_shelf() security invoker;
alter function public.submit_cover_identification(uuid, text, text) security invoker;
