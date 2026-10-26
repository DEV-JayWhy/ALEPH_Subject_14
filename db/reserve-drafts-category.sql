-- Drafts use posts.is_published=false and existing admin-only unpublished access.
-- Do not create a public categories row for the administrator-only draft view.
alter table public.categories add constraint categories_drafts_reserved_name check(name <> '임시저장');
create index posts_drafts_updated_idx on public.posts(updated_at desc,id) where not is_published;
