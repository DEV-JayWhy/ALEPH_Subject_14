-- Category names cascade to existing posts; deleting a category keeps every post.
create table public.category_images (
 id uuid primary key default gen_random_uuid(),
 label text not null check(char_length(trim(label)) between 1 and 100),
 storage_path text not null unique check(storage_path ~ '^[a-f0-9-]{36}\.(png|jpg|webp|gif)$'),
 created_at timestamptz not null default now()
);
alter table public.category_images enable row level security;
create policy category_images_read on public.category_images for select to anon,authenticated using(true);
create policy category_images_insert on public.category_images for insert to authenticated with check((select private.is_admin()));
revoke all on public.category_images from anon,authenticated;
grant select on public.category_images to anon,authenticated;
grant insert on public.category_images to authenticated;

create table public.categories (
 id uuid primary key default gen_random_uuid(),
 name text not null unique check(char_length(trim(name)) between 1 and 30 and name=trim(name) and name not in ('전체','미분류') and name !~ '[[:cntrl:]]'),
 icon_key text not null default 'notebook' check(icon_key in ('notebook','network','shield','code','terminal','cloud','book','science','database','folder','idea','globe')),
 image_id uuid references public.category_images(id) on delete set null,
 sort_order integer not null default 0,
 created_at timestamptz not null default now()
);
alter table public.categories enable row level security;
create policy categories_read on public.categories for select to anon,authenticated using(true);
create policy categories_insert on public.categories for insert to authenticated with check((select private.is_admin()));
create policy categories_update on public.categories for update to authenticated using((select private.is_admin())) with check((select private.is_admin()));
create policy categories_delete on public.categories for delete to authenticated using((select private.is_admin()));
revoke all on public.categories from anon,authenticated;
grant select on public.categories to anon,authenticated;
grant insert,update,delete on public.categories to authenticated;
insert into public.categories(name,icon_key,sort_order) values
 ('네트워크','network',10),('보안','shield',20),('개발','code',30),('학습 기록','notebook',40);
insert into public.categories(name)
select distinct category from public.posts where category is not null on conflict(name) do nothing;
alter table public.posts alter column category drop not null;
alter table public.posts alter column category drop default;
alter table public.posts add constraint posts_category_fkey foreign key(category) references public.categories(name) on update cascade on delete set null;
create index posts_category_idx on public.posts(category);
create index posts_neighbor_order_idx on public.posts(created_at,id) where is_published;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('category-images','category-images',false,5242880,array['image/jpeg','image/png','image/webp','image/gif']);
create policy category_assets_read on storage.objects for select to anon,authenticated
 using(bucket_id='category-images' and ((select private.is_admin()) or exists(select 1 from public.category_images i where i.storage_path=name)));
create policy category_assets_upload on storage.objects for insert to authenticated with check(bucket_id='category-images' and (select private.is_admin()));
create policy category_assets_delete on storage.objects for delete to authenticated using(bucket_id='category-images' and (select private.is_admin()));

-- RLS applies to the current post AND each neighbor; no privileged function.
create function public.get_neighbor_posts(p_post_id uuid,p_public_only boolean default false)
returns table(direction text,id uuid,title text,created_at timestamptz)
language sql stable security invoker set search_path=''
as $$
 with current_post as (
  select p.id,p.created_at from public.posts p
  where p.id=p_post_id and p.is_published and (not p_public_only or p.visibility='public')
 )
 select 'previous'::text,n.id,n.title,n.created_at from current_post c
 cross join lateral (
  select p.id,p.title,p.created_at from public.posts p
  where p.is_published and (not p_public_only or p.visibility='public') and (p.created_at,p.id)<(c.created_at,c.id)
  order by p.created_at desc,p.id desc limit 1
 ) n
 union all
 select 'next'::text,n.id,n.title,n.created_at from current_post c
 cross join lateral (
  select p.id,p.title,p.created_at from public.posts p
  where p.is_published and (not p_public_only or p.visibility='public') and (p.created_at,p.id)>(c.created_at,c.id)
  order by p.created_at,p.id limit 1
 ) n;
$$;
revoke all on function public.get_neighbor_posts(uuid,boolean) from public;
grant execute on function public.get_neighbor_posts(uuid,boolean) to anon,authenticated;
