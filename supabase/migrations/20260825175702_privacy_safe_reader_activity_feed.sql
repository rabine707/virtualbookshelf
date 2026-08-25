alter table public.user_settings
  add column if not exists activity_sharing_enabled boolean not null default false,
  add column if not exists activity_share_added boolean not null default true,
  add column if not exists activity_share_finished boolean not null default true,
  add column if not exists activity_share_rated boolean not null default true,
  add column if not exists activity_share_favorited boolean not null default true,
  add column if not exists activity_seen_at timestamptz not null default now(),
  add column if not exists followers_seen_at timestamptz not null default now();

create table if not exists public.reader_activity_events (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  event_type text not null check (event_type in ('added','finished','rated','favorited')),
  rating integer check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

create index if not exists reader_activity_events_actor_created_idx on public.reader_activity_events(actor_id, created_at desc);
alter table public.reader_activity_events enable row level security;
revoke all on table public.reader_activity_events from anon, authenticated;

create or replace function public.capture_reader_book_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare settings public.user_settings%rowtype;
begin
  select * into settings from public.user_settings where user_id = new.user_id;
  if not found or not settings.shelf_public or not settings.activity_sharing_enabled then return new; end if;
  if tg_op = 'INSERT' and settings.activity_share_added then insert into public.reader_activity_events(actor_id,book_id,event_type) values(new.user_id,new.book_id,'added'); end if;
  if tg_op = 'UPDATE' then
    if new.goodreads_shelf is distinct from old.goodreads_shelf and lower(coalesce(new.goodreads_shelf,''))='read' and settings.activity_share_finished then insert into public.reader_activity_events(actor_id,book_id,event_type) values(new.user_id,new.book_id,'finished'); end if;
    if new.rating is distinct from old.rating and new.rating is not null and settings.activity_share_rated then insert into public.reader_activity_events(actor_id,book_id,event_type,rating) values(new.user_id,new.book_id,'rated',new.rating); end if;
    if new.favorite is true and old.favorite is not true and settings.activity_share_favorited then insert into public.reader_activity_events(actor_id,book_id,event_type) values(new.user_id,new.book_id,'favorited'); end if;
  end if;
  return new;
end; $$;
revoke all on function public.capture_reader_book_activity() from public, anon, authenticated;
drop trigger if exists capture_reader_book_activity_trigger on public.user_books;
create trigger capture_reader_book_activity_trigger after insert or update of goodreads_shelf,rating,favorite on public.user_books for each row execute function public.capture_reader_book_activity();

create or replace function public.update_activity_privacy(p_enabled boolean,p_share_added boolean,p_share_finished boolean,p_share_rated boolean,p_share_favorited boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Authentication required'; end if;
  insert into public.user_settings(user_id,activity_sharing_enabled,activity_share_added,activity_share_finished,activity_share_rated,activity_share_favorited,updated_at)
  values(uid,coalesce(p_enabled,false),coalesce(p_share_added,true),coalesce(p_share_finished,true),coalesce(p_share_rated,true),coalesce(p_share_favorited,true),now())
  on conflict(user_id) do update set activity_sharing_enabled=excluded.activity_sharing_enabled,activity_share_added=excluded.activity_share_added,activity_share_finished=excluded.activity_share_finished,activity_share_rated=excluded.activity_share_rated,activity_share_favorited=excluded.activity_share_favorited,updated_at=now();
  return (select jsonb_build_object('shelf_public',us.shelf_public,'activity_sharing_enabled',us.activity_sharing_enabled,'activity_share_added',us.activity_share_added,'activity_share_finished',us.activity_share_finished,'activity_share_rated',us.activity_share_rated,'activity_share_favorited',us.activity_share_favorited) from public.user_settings us where us.user_id=uid);
end; $$;
revoke all on function public.update_activity_privacy(boolean,boolean,boolean,boolean,boolean) from public, anon;
grant execute on function public.update_activity_privacy(boolean,boolean,boolean,boolean,boolean) to authenticated;

create or replace function public.get_reader_activity_feed(p_offset integer default 0,p_limit integer default 20)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); safe_offset integer; safe_limit integer; result jsonb;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  safe_offset:=greatest(coalesce(p_offset,0),0); safe_limit:=least(greatest(coalesce(p_limit,20),1),30);
  select jsonb_build_object(
    'events',coalesce((select jsonb_agg(to_jsonb(feed_row) order by feed_row.created_at desc) from (select e.id,e.event_type,e.rating,e.created_at,p.username,p.display_name,p.avatar_url,b.title book_title,b.author book_author,ub.preferred_cover_url cover_url from public.reader_activity_events e join public.profile_follows f on f.followed_id=e.actor_id and f.follower_id=uid join public.profiles p on p.id=e.actor_id join public.user_settings us on us.user_id=e.actor_id and us.shelf_public and us.activity_sharing_enabled join public.books b on b.id=e.book_id left join public.user_books ub on ub.user_id=e.actor_id and ub.book_id=e.book_id where (e.event_type<>'added' or us.activity_share_added) and (e.event_type<>'finished' or us.activity_share_finished) and (e.event_type<>'rated' or us.activity_share_rated) and (e.event_type<>'favorited' or us.activity_share_favorited) order by e.created_at desc offset safe_offset limit safe_limit) feed_row),'[]'::jsonb),
    'next_offset',case when (select count(*) from public.reader_activity_events e join public.profile_follows f on f.followed_id=e.actor_id and f.follower_id=uid join public.user_settings us on us.user_id=e.actor_id and us.shelf_public and us.activity_sharing_enabled where (e.event_type<>'added' or us.activity_share_added) and (e.event_type<>'finished' or us.activity_share_finished) and (e.event_type<>'rated' or us.activity_share_rated) and (e.event_type<>'favorited' or us.activity_share_favorited))>safe_offset+safe_limit then safe_offset+safe_limit else null end,
    'unread_activity',(select count(*) from public.reader_activity_events e join public.profile_follows f on f.followed_id=e.actor_id and f.follower_id=uid join public.user_settings actor_settings on actor_settings.user_id=e.actor_id and actor_settings.shelf_public and actor_settings.activity_sharing_enabled join public.user_settings mine on mine.user_id=uid where e.created_at>mine.activity_seen_at),
    'new_followers',(select count(*) from public.profile_follows f join public.user_settings mine on mine.user_id=uid where f.followed_id=uid and f.created_at>mine.followers_seen_at),
    'preferences',(select jsonb_build_object('shelf_public',us.shelf_public,'activity_sharing_enabled',us.activity_sharing_enabled,'activity_share_added',us.activity_share_added,'activity_share_finished',us.activity_share_finished,'activity_share_rated',us.activity_share_rated,'activity_share_favorited',us.activity_share_favorited) from public.user_settings us where us.user_id=uid)
  ) into result;
  return result;
end; $$;
revoke all on function public.get_reader_activity_feed(integer,integer) from public, anon;
grant execute on function public.get_reader_activity_feed(integer,integer) to authenticated;

create or replace function public.mark_reader_notifications_seen()
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Authentication required'; end if;
  update public.user_settings set activity_seen_at=now(),followers_seen_at=now() where user_id=uid;
end; $$;
revoke all on function public.mark_reader_notifications_seen() from public, anon;
grant execute on function public.mark_reader_notifications_seen() to authenticated;
