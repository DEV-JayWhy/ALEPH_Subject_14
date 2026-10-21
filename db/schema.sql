-- Initial schema. This project contains no existing user data.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 email text not null,
 display_name text not null check (char_length(display_name) between 1 and 50),
 role text not null default 'member' check(role in ('member','admin')),
 status text not null default 'pending' check(status in ('pending','approved','rejected','expelled')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 constraint admin_is_approved check(role <> 'admin' or status = 'approved')
);
alter table public.profiles enable row level security;

-- Internal RLS lookups bypass profile recursion; never trust user-editable metadata.
create function private.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select auth.uid() is not null and exists(select 1 from public.profiles where id=auth.uid() and role='admin' and status='approved'); $$;
create function private.is_member() returns boolean
language sql stable security definer set search_path = ''
as $$ select auth.uid() is not null and exists(select 1 from public.profiles where id=auth.uid() and status='approved'); $$;
revoke all on function private.is_admin(), private.is_member() from public;
grant execute on function private.is_admin(), private.is_member() to anon, authenticated;

create function private.new_member() returns trigger
language plpgsql security definer set search_path = ''
as $$ begin
 insert into public.profiles(id,email,display_name,role,status)
 values(new.id,coalesce(new.email,''),left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),'새 회원'),50),'member','pending');
 return new;
end; $$;
revoke all on function private.new_member() from public, anon, authenticated;
create trigger create_member_profile after insert on auth.users for each row execute function private.new_member();

create policy profiles_read on public.profiles for select to authenticated using(id=(select auth.uid()) or (select private.is_admin()));
create policy profiles_review on public.profiles for update to authenticated
 using(role='member' and (select private.is_admin()))
 with check(role='member' and (select private.is_admin()));
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update(status,reviewed_at) on public.profiles to authenticated;

create table public.posts (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references public.profiles(id),
 title text not null check(char_length(trim(title)) between 1 and 160),
 excerpt text not null default '' check(char_length(excerpt)<=300),
 content_html text not null check(octet_length(content_html)<=1000000),
 category text not null default '학습 기록' check(char_length(category)<=30),
 visibility text not null default 'public' check(visibility in ('public','private')),
 is_published boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index posts_published_date on public.posts(is_published,created_at desc);
alter table public.posts enable row level security;
create policy posts_read on public.posts for select to anon, authenticated
 using((select private.is_admin()) or (is_published and (visibility='public' or (select private.is_member()))));
create policy posts_create on public.posts for insert to authenticated
 with check((select private.is_admin()) and author_id=(select auth.uid()));
create policy posts_update on public.posts for update to authenticated
 using((select private.is_admin())) with check((select private.is_admin()) and author_id=(select auth.uid()));
create policy posts_delete on public.posts for delete to authenticated using((select private.is_admin()));
revoke all on public.posts from anon, authenticated;
grant select on public.posts to anon, authenticated;
grant insert,update,delete on public.posts to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('blog-images','blog-images',false,5242880,array['image/jpeg','image/png','image/webp','image/gif']);
create policy blog_images_read on storage.objects for select to anon,authenticated
 using(bucket_id='blog-images' and ((select private.is_admin()) or exists(
 select 1 from public.posts p where p.id::text=split_part(name,'/',1) and p.is_published and (p.visibility='public' or (select private.is_member())))));
create policy blog_images_upload on storage.objects for insert to authenticated
 with check(bucket_id='blog-images' and (select private.is_admin()));
create policy blog_images_delete on storage.objects for delete to authenticated
 using(bucket_id='blog-images' and (select private.is_admin()));
