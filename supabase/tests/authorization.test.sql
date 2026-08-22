begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(16);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-4111-8111-111111111111', 'rlsalpha987@example.invalid', '{"username":"rlsalpha987","display_name":"RLS Alpha"}'::jsonb),
  ('22222222-2222-4222-8222-222222222222', 'rlsbeta987@example.invalid', '{"username":"rlsbeta987","display_name":"RLS Beta"}'::jsonb);

insert into public.books (id, title, author, normalized_title, normalized_author)
values (
  '33333333-3333-4333-8333-333333333333',
  'Authorization Test Book',
  'Security Test',
  'authorization test book',
  'security test'
);

insert into public.user_books (user_id, book_id, client_key, favorite)
values
  ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'auth-test-a', false),
  ('22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', 'auth-test-b', false);

insert into public.user_settings (user_id, theme, shelf_public)
values
  ('11111111-1111-4111-8111-111111111111', 'classic', false),
  ('22222222-2222-4222-8222-222222222222', 'classic', false);

insert into public.shelf_scans (user_id, source_name)
values
  ('11111111-1111-4111-8111-111111111111', 'auth-test-a'),
  ('22222222-2222-4222-8222-222222222222', 'auth-test-b');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local search_path = public, extensions;

select is(
  (select count(*) from public.user_books),
  1::bigint,
  'authenticated user sees only their own user_books row'
);

select is(
  (select count(*) from public.user_books where user_id = '22222222-2222-4222-8222-222222222222'),
  0::bigint,
  'authenticated user cannot read another users books'
);

select ok(
  not has_table_privilege('authenticated', 'public.user_books', 'UPDATE'),
  'authenticated users cannot directly update shelf rows'
);

select is(
  (select count(*) from public.user_settings where user_id = '22222222-2222-4222-8222-222222222222'),
  0::bigint,
  'authenticated user cannot read another users settings'
);

select is(
  (select count(*) from public.shelf_scans where user_id = '22222222-2222-4222-8222-222222222222'),
  0::bigint,
  'authenticated user cannot read another users shelf scans'
);

select lives_ok(
  $$ insert into public.spine_requests (requested_by, book_key, title, author)
     values ('11111111-1111-4111-8111-111111111111', 'isbn:9780000000001', 'Requested Test Book', 'Security Test') $$,
  'authenticated user can request a spine for themselves'
);

select throws_ok(
  $$ insert into public.spine_requests (requested_by, book_key, title, author)
     values ('22222222-2222-4222-8222-222222222222', 'isbn:9780000000002', 'Forged Request', 'Security Test') $$,
  '42501',
  null,
  'authenticated user cannot create a request for another reader'
);

select is(
  (select count(*) from public.spine_requests),
  1::bigint,
  'authenticated user sees only their own spine requests'
);

select is(
  jsonb_array_length(coalesce(public.get_my_shelf()->'books', '[]'::jsonb)),
  1,
  'get_my_shelf returns only the callers books'
);

select ok(
  not exists (
    select 1
    from jsonb_array_elements(coalesce(public.get_my_shelf()->'books', '[]'::jsonb)) item
    where item->>'id' = 'auth-test-b'
  ),
  'get_my_shelf does not leak another users client key'
);

select lives_ok(
  $$ select public.update_my_shelf_settings('{"community_stars":999999,"decor_owned":["fake-entitlement"]}'::jsonb) $$,
  'settings RPC accepts the request without exposing server-owned writes'
);

select is(
  (select community_stars from public.user_settings where user_id = '11111111-1111-4111-8111-111111111111'),
  0,
  'settings RPC cannot self-award community stars'
);

reset role;
set local search_path = public, extensions;

select ok(
  not has_table_privilege('authenticated', 'public.books', 'UPDATE'),
  'authenticated role cannot directly update the canonical books catalog'
);

select ok(
  not has_function_privilege('authenticated', 'public.consume_api_rate_limit(text,integer,integer)', 'EXECUTE'),
  'authenticated role cannot call the server-only distributed limiter'
);

select ok(
  not has_function_privilege('anon', 'public.consume_api_rate_limit(text,integer,integer)', 'EXECUTE'),
  'anon role cannot call the server-only distributed limiter'
);

select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
set local role anon;
set local search_path = public, extensions;

select is(
  public.get_public_shelf('rlsbeta987'),
  null::jsonb,
  'private shelves are not exposed through the public shelf RPC'
);

select * from finish();
rollback;
