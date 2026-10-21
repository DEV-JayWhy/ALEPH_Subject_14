-- Uses existing identities only; all fixture rows and status changes roll back.
begin;
set local lock_timeout='3s';
set local statement_timeout='15s';
insert into public.posts(id,author_id,title,content_html,visibility) values
 ('20000000-0000-4000-8000-000000000001','5ed3b3cd-a996-4388-b695-ebd18126a966','phase2 rollback public','<p>public</p>','public'),
 ('20000000-0000-4000-8000-000000000002','5ed3b3cd-a996-4388-b695-ebd18126a966','phase2 rollback private','<p>private</p>','private');
insert into storage.objects(bucket_id,name) values
 ('blog-images','20000000-0000-4000-8000-000000000001/rollback.png'),
 ('blog-images','20000000-0000-4000-8000-000000000002/rollback.png');
set local role anon;
do $$ begin
 if (select count(*) from public.posts where id::text like '20000000-%')<>1 then raise exception 'anon private post exposed';end if;
 if (select count(*) from storage.objects where name like '20000000-%')<>1 then raise exception 'anon private image exposed';end if;
 begin insert into public.posts(author_id,title,content_html) values('5ed3b3cd-a996-4388-b695-ebd18126a966','attack','x');raise exception 'anon insert allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"fecf79fd-130d-4353-9dd7-b76f8974bfa5","role":"authenticated","user_metadata":{"role":"admin","status":"approved"}}',true);
set local role authenticated;
do $$ declare n integer;begin
 if (select count(*) from public.posts where id::text like '20000000-%')<>2 then raise exception 'approved member private read denied';end if;
 if (select count(*) from storage.objects where name like '20000000-%')<>2 then raise exception 'approved member image read denied';end if;
 update public.posts set title='attack' where id::text like '20000000-%';get diagnostics n=row_count;if n<>0 then raise exception 'member update allowed';end if;
 delete from public.posts where id::text like '20000000-%';get diagnostics n=row_count;if n<>0 then raise exception 'member delete allowed';end if;
 update public.profiles set status='approved' where id='fecf79fd-130d-4353-9dd7-b76f8974bfa5';get diagnostics n=row_count;if n<>0 then raise exception 'member self approval allowed';end if;
 begin update public.profiles set role='admin' where id='fecf79fd-130d-4353-9dd7-b76f8974bfa5';raise exception 'forged admin role allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
-- Unapproved states use the same user/JWT: current DB state must revoke access.
update public.profiles set status='pending' where id='fecf79fd-130d-4353-9dd7-b76f8974bfa5';
set local role authenticated;
do $$ begin if exists(select 1 from public.posts where id='20000000-0000-4000-8000-000000000002') or exists(select 1 from storage.objects where name='20000000-0000-4000-8000-000000000002/rollback.png') then raise exception 'pending has private access';end if;end $$;
reset role;
update public.profiles set status='rejected' where id='fecf79fd-130d-4353-9dd7-b76f8974bfa5';
set local role authenticated;
do $$ begin if exists(select 1 from public.posts where id='20000000-0000-4000-8000-000000000002') or exists(select 1 from storage.objects where name='20000000-0000-4000-8000-000000000002/rollback.png') then raise exception 'rejected has private access';end if;end $$;
reset role;
update public.profiles set status='approved' where id='fecf79fd-130d-4353-9dd7-b76f8974bfa5';
select set_config('request.jwt.claims','{"sub":"5ed3b3cd-a996-4388-b695-ebd18126a966","role":"authenticated"}',true);
set local role authenticated;
do $$ declare n integer;begin
 update public.posts set title='edited',visibility='private',updated_at=now() where id='20000000-0000-4000-8000-000000000001';get diagnostics n=row_count;if n<>1 then raise exception 'admin edit denied';end if;
 update public.profiles set status='expelled',reviewed_at=now() where id='fecf79fd-130d-4353-9dd7-b76f8974bfa5' and role='member' and status='approved';get diagnostics n=row_count;if n<>1 then raise exception 'admin expulsion denied';end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"fecf79fd-130d-4353-9dd7-b76f8974bfa5","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.posts where id::text like '20000000-%') then raise exception 'expelled retained private access';end if;
 if exists(select 1 from storage.objects where name like '20000000-%') then raise exception 'expelled retained image access';end if;
end $$;
reset role;
set local role anon;
do $$ begin if exists(select 1 from public.posts where id::text like '20000000-%') or exists(select 1 from storage.objects where name like '20000000-%') then raise exception 'public to private leaks';end if;end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"5ed3b3cd-a996-4388-b695-ebd18126a966","role":"authenticated"}',true);
set local role authenticated;
do $$ declare n integer;begin
 delete from public.posts where id='20000000-0000-4000-8000-000000000002';get diagnostics n=row_count;if n<>1 then raise exception 'admin delete denied';end if;
end $$;
reset role;
update public.profiles set status='approved' where id='fecf79fd-130d-4353-9dd7-b76f8974bfa5';
select set_config('request.jwt.claims','{"sub":"fecf79fd-130d-4353-9dd7-b76f8974bfa5","role":"authenticated"}',true);
set local role authenticated;
do $$ begin if exists(select 1 from storage.objects where name='20000000-0000-4000-8000-000000000002/rollback.png') then raise exception 'deleted post image exposed';end if;end $$;
reset role;
rollback;
select 'PASS: post/image RLS for anon, approved, pending, rejected, expelled; member write denied; admin edit, visibility, expel, delete; original data restored.' as verification;
