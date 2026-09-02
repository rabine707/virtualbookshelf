-- Paid spine generation and shelf scanning have been retired. Manual curator
-- uploads, shared spine selection, and deterministic cover-derived spines remain.
drop function if exists public.refund_spine_generation_attempt(text);
drop function if exists public.consume_spine_generation_attempt(text, text, text, text, text, integer);
drop function if exists public.consume_shelf_scan_pass(integer);

drop table if exists public.spine_generation_usage;
drop table if exists public.shelf_scan_usage;
drop table if exists public.shelf_scans;
