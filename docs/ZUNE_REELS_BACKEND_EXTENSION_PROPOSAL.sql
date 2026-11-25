-- ZUNE REELS BACKEND EXTENSION — PROPOSAL ONLY
-- Reviewed against the current ZUNE Reels schema on 2026-11-25.
-- NOT APPLIED. Requires explicit owner approval before execution.
-- Existing zune_reels / likes / comments / follows and zune-reels bucket are preserved.

begin;

-- Preserve the Seller Portal's separate auth_user_id -> profile owner_id mapping.
-- Storage objects stay under auth.uid(); Reel creator_id stays the actual profiles.id.
create or replace function public.zune_can_upload_reel()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1 from public.profiles p
    where p.id = public.zune_seller_owner_id()
      and p.role::text in ('vendor','admin')
      and coalesce(p.account_status,'active') = 'active'
      and p.removed_at is null
  );
$function$;
revoke all on function public.zune_can_upload_reel() from public;
grant execute on function public.zune_can_upload_reel() to authenticated;

drop policy if exists zune_reels_creator_insert on public.zune_reels;
create policy zune_reels_creator_insert on public.zune_reels
for insert to authenticated with check (
  creator_id = public.zune_seller_owner_id()
  and public.zune_can_upload_reel()
  and split_part(video_path,'/',1) = (select auth.uid())::text
  and status = case when public.zune_is_admin() then 'published' else 'pending' end
  and (public.zune_is_admin() or product_id is null or exists (
    select 1 from public.products p where p.id=product_id and p.vendor_id=public.zune_seller_owner_id()
  ))
);

drop policy if exists zune_reels_creator_read_own on public.zune_reels;
create policy zune_reels_creator_read_own on public.zune_reels
for select to authenticated using (
  creator_id = public.zune_seller_owner_id() or public.zune_is_admin()
);

drop policy if exists zune_reels_creator_update on public.zune_reels;
create policy zune_reels_creator_update on public.zune_reels
for update to authenticated
using (
  (creator_id = public.zune_seller_owner_id() and status in ('pending','rejected'))
  or public.zune_is_admin()
)
with check (
  (
    creator_id = public.zune_seller_owner_id()
    and status in ('pending','rejected')
    and split_part(video_path,'/',1) = (select auth.uid())::text
    and (product_id is null or exists (select 1 from public.products p where p.id=product_id and p.vendor_id=public.zune_seller_owner_id()))
  )
  or public.zune_is_admin()
);

alter table public.zune_reels
  add column if not exists audio_path text,
  add column if not exists audio_source text not null default 'original',
  add column if not exists audio_title text,
  add column if not exists audio_artist text,
  add column if not exists sound_id uuid,
  add column if not exists duration_seconds integer,
  add column if not exists likes_count bigint not null default 0,
  add column if not exists comments_count bigint not null default 0,
  add column if not exists shares_count bigint not null default 0,
  add column if not exists saves_count bigint not null default 0;

do $block$
begin
  if not exists (select 1 from pg_constraint where conname='zune_reels_audio_source_check' and conrelid='public.zune_reels'::regclass) then
    alter table public.zune_reels add constraint zune_reels_audio_source_check check (audio_source in ('original','library')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname='zune_reels_duration_check' and conrelid='public.zune_reels'::regclass) then
    alter table public.zune_reels add constraint zune_reels_duration_check check (duration_seconds is null or duration_seconds between 1 and 180) not valid;
  end if;
end;
$block$;

create table if not exists public.zune_reel_saves (
  reel_id uuid not null references public.zune_reels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reel_id,user_id)
);

create table if not exists public.zune_reel_shares (
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null references public.zune_reels(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  channel text not null default 'native',
  created_at timestamptz not null default now()
);

create table if not exists public.zune_reel_views (
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null references public.zune_reels(id) on delete cascade,
  viewer_id uuid references public.profiles(id) on delete set null,
  session_key text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists zune_reel_views_dedupe_idx
  on public.zune_reel_views(reel_id,coalesce(viewer_id,'00000000-0000-0000-0000-000000000000'::uuid),session_key);

create table if not exists public.zune_reel_sounds (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text,
  audio_path text not null unique,
  license_name text not null,
  license_reference text,
  commercial_use_allowed boolean not null default false,
  is_active boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.zune_reel_reports (
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null references public.zune_reels(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'pending' check (status in ('pending','reviewing','resolved','dismissed')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now()
);

do $block$
begin
  if not exists (select 1 from pg_constraint where conname='zune_reels_sound_id_fkey' and conrelid='public.zune_reels'::regclass) then
    alter table public.zune_reels add constraint zune_reels_sound_id_fkey foreign key (sound_id) references public.zune_reel_sounds(id) on delete set null;
  end if;
end;
$block$;

create table if not exists public.zune_reel_comment_likes (
  comment_id uuid not null references public.zune_reel_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id,user_id)
);

create index if not exists zune_reel_saves_user_idx on public.zune_reel_saves(user_id,created_at desc);
create index if not exists zune_reel_shares_reel_idx on public.zune_reel_shares(reel_id,created_at desc);
create index if not exists zune_reel_views_reel_idx on public.zune_reel_views(reel_id,created_at desc);
create index if not exists zune_reel_reports_status_idx on public.zune_reel_reports(status,created_at desc);
create index if not exists zune_reel_sounds_active_idx on public.zune_reel_sounds(is_active,commercial_use_allowed);

alter table public.zune_reel_saves enable row level security;
alter table public.zune_reel_shares enable row level security;
alter table public.zune_reel_views enable row level security;
alter table public.zune_reel_sounds enable row level security;
alter table public.zune_reel_reports enable row level security;
alter table public.zune_reel_comment_likes enable row level security;

drop policy if exists zune_reel_saves_self_read on public.zune_reel_saves;
create policy zune_reel_saves_self_read on public.zune_reel_saves
for select to authenticated using (user_id = (select auth.uid()) or public.zune_is_admin());

drop policy if exists zune_reel_saves_self_insert on public.zune_reel_saves;
create policy zune_reel_saves_self_insert on public.zune_reel_saves
for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.zune_reels r where r.id = reel_id and r.status = 'published'
  )
);

drop policy if exists zune_reel_saves_self_delete on public.zune_reel_saves;
create policy zune_reel_saves_self_delete on public.zune_reel_saves
for delete to authenticated using (user_id = (select auth.uid()) or public.zune_is_admin());

drop policy if exists zune_reel_shares_self_read on public.zune_reel_shares;
create policy zune_reel_shares_self_read on public.zune_reel_shares
for select to authenticated using (user_id = (select auth.uid()) or public.zune_is_admin());

drop policy if exists zune_reel_shares_self_insert on public.zune_reel_shares;
create policy zune_reel_shares_self_insert on public.zune_reel_shares
for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.zune_reels r where r.id = reel_id and r.status = 'published'
  )
);

drop policy if exists zune_reel_views_admin_read on public.zune_reel_views;
create policy zune_reel_views_admin_read on public.zune_reel_views
for select to authenticated using (public.zune_is_admin());

drop policy if exists zune_reel_sounds_public_read on public.zune_reel_sounds;
create policy zune_reel_sounds_public_read on public.zune_reel_sounds
for select to anon,authenticated using (is_active and commercial_use_allowed);

drop policy if exists zune_reel_sounds_admin_manage on public.zune_reel_sounds;
create policy zune_reel_sounds_admin_manage on public.zune_reel_sounds
for all to authenticated using (public.zune_is_admin()) with check (public.zune_is_admin());

drop policy if exists zune_reel_reports_self_insert on public.zune_reel_reports;
create policy zune_reel_reports_self_insert on public.zune_reel_reports
for insert to authenticated with check (
  reporter_id = (select auth.uid()) and exists (
    select 1 from public.zune_reels r where r.id = reel_id and r.status = 'published'
  )
);

drop policy if exists zune_reel_reports_self_read on public.zune_reel_reports;
create policy zune_reel_reports_self_read on public.zune_reel_reports
for select to authenticated using (reporter_id = (select auth.uid()) or public.zune_is_admin());

drop policy if exists zune_reel_reports_admin_update on public.zune_reel_reports;
create policy zune_reel_reports_admin_update on public.zune_reel_reports
for update to authenticated using (public.zune_is_admin()) with check (public.zune_is_admin());

drop policy if exists zune_reel_comment_likes_public_read on public.zune_reel_comment_likes;
create policy zune_reel_comment_likes_public_read on public.zune_reel_comment_likes
for select to anon,authenticated using (true);

drop policy if exists zune_reel_comment_likes_self_insert on public.zune_reel_comment_likes;
create policy zune_reel_comment_likes_self_insert on public.zune_reel_comment_likes
for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.zune_reel_comments c
    join public.zune_reels r on r.id = c.reel_id
    where c.id = comment_id and r.status = 'published'
  )
);

drop policy if exists zune_reel_comment_likes_self_delete on public.zune_reel_comment_likes;
create policy zune_reel_comment_likes_self_delete on public.zune_reel_comment_likes
for delete to authenticated using (user_id = (select auth.uid()) or public.zune_is_admin());

create or replace function public.zune_reel_record_view(p_reel_id uuid,p_session_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare inserted_count integer;
begin
  if p_session_key is null or length(p_session_key) < 16 or length(p_session_key) > 128 then
    raise exception 'Invalid view session key';
  end if;
  insert into public.zune_reel_views(reel_id,viewer_id,session_key)
  select r.id,(select auth.uid()),p_session_key
  from public.zune_reels r
  where r.id=p_reel_id and r.status='published'
  on conflict do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count > 0 then
    update public.zune_reels set views_count=views_count+1 where id=p_reel_id and status='published';
  end if;
  return inserted_count > 0;
end;
$function$;

create or replace function public.zune_reel_record_share(p_reel_id uuid,p_channel text default 'native')
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in is required to record a share';
  end if;
  if coalesce(p_channel,'native') not in ('native','whatsapp','facebook','copy','other') then
    raise exception 'Invalid share channel';
  end if;
  insert into public.zune_reel_shares(reel_id,user_id,channel)
  select r.id,(select auth.uid()),coalesce(p_channel,'native')
  from public.zune_reels r
  where r.id=p_reel_id and r.status='published';
  if not found then return false; end if;
  update public.zune_reels set shares_count=shares_count+1 where id=p_reel_id;
  return true;
end;
$function$;

revoke all on function public.zune_reel_record_view(uuid,text) from public;
grant execute on function public.zune_reel_record_view(uuid,text) to anon,authenticated;
revoke all on function public.zune_reel_record_share(uuid,text) from public;
grant execute on function public.zune_reel_record_share(uuid,text) to authenticated;

create or replace function public.zune_reel_engagement_counter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare target_reel uuid; delta integer; column_name text;
begin
  target_reel := coalesce(new.reel_id,old.reel_id);
  delta := case when tg_op='INSERT' then 1 else -1 end;
  column_name := tg_argv[0];
  if column_name not in ('likes_count','comments_count','saves_count') then
    raise exception 'Invalid engagement counter';
  end if;
  execute format('update public.zune_reels set %I=greatest(0,%I+$1) where id=$2',column_name,column_name)
    using delta,target_reel;
  if tg_op='DELETE' then return old; else return new; end if;
end;
$function$;

drop trigger if exists zune_reel_likes_count_insert on public.zune_reel_likes;
create trigger zune_reel_likes_count_insert after insert on public.zune_reel_likes
for each row execute function public.zune_reel_engagement_counter('likes_count');
drop trigger if exists zune_reel_likes_count_delete on public.zune_reel_likes;
create trigger zune_reel_likes_count_delete after delete on public.zune_reel_likes
for each row execute function public.zune_reel_engagement_counter('likes_count');
drop trigger if exists zune_reel_comments_count_insert on public.zune_reel_comments;
create trigger zune_reel_comments_count_insert after insert on public.zune_reel_comments
for each row execute function public.zune_reel_engagement_counter('comments_count');
drop trigger if exists zune_reel_comments_count_delete on public.zune_reel_comments;
create trigger zune_reel_comments_count_delete after delete on public.zune_reel_comments
for each row execute function public.zune_reel_engagement_counter('comments_count');
drop trigger if exists zune_reel_saves_count_insert on public.zune_reel_saves;
create trigger zune_reel_saves_count_insert after insert on public.zune_reel_saves
for each row execute function public.zune_reel_engagement_counter('saves_count');
drop trigger if exists zune_reel_saves_count_delete on public.zune_reel_saves;
create trigger zune_reel_saves_count_delete after delete on public.zune_reel_saves
for each row execute function public.zune_reel_engagement_counter('saves_count');

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('zune-reel-audio','zune-reel-audio',false,15728640,array['audio/mpeg','audio/mp4','audio/aac','audio/wav','audio/ogg','audio/webm'])
on conflict(id) do nothing;

drop policy if exists zune_reel_audio_public_read on storage.objects;
create policy zune_reel_audio_public_read on storage.objects
for select to anon,authenticated using (
  bucket_id='zune-reel-audio' and exists (
    select 1 from public.zune_reel_sounds s
    where s.audio_path=name and s.is_active and s.commercial_use_allowed
  )
);

drop policy if exists zune_reel_audio_admin_insert on storage.objects;
create policy zune_reel_audio_admin_insert on storage.objects
for insert to authenticated with check (bucket_id='zune-reel-audio' and public.zune_is_admin());

drop policy if exists zune_reel_audio_admin_update on storage.objects;
create policy zune_reel_audio_admin_update on storage.objects
for update to authenticated using (bucket_id='zune-reel-audio' and public.zune_is_admin())
with check (bucket_id='zune-reel-audio' and public.zune_is_admin());

drop policy if exists zune_reel_audio_admin_delete on storage.objects;
create policy zune_reel_audio_admin_delete on storage.objects
for delete to authenticated using (bucket_id='zune-reel-audio' and public.zune_is_admin());

grant select,insert,delete on public.zune_reel_saves to authenticated;
grant select,insert on public.zune_reel_shares to authenticated;
grant select on public.zune_reel_views to authenticated;
grant select,insert,update,delete on public.zune_reel_sounds to authenticated;
grant select,insert,update on public.zune_reel_reports to authenticated;
grant select,insert,delete on public.zune_reel_comment_likes to authenticated;
grant select on public.zune_reel_sounds to anon;

commit;

-- IMPORTANT BEFORE APPLYING:
-- 1) Confirm the music licenses and license references for every uploaded track.
-- 2) Review the security-definer RPCs and RLS policies with the project owner.
-- 3) Apply only after explicit approval; then connect the Save/Share/Views/Reports/Audio UI.
