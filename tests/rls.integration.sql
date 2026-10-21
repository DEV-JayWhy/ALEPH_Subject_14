-- Nonpersistent permission checks. All fixtures are rolled back.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000000001','rollback-admin@example.invalid','{"display_name":"rollback admin"}'),
 ('00000000-0000-4000-8000-000000000002','rollback-member@example.invalid','{"display_name":"rollback member"}'),
 ('00000000-0000-4000-8000-000000000003','rollback-pending@example.invalid','{"display_name":"rollback pending"}'),
 ('00000000-0000-4000-8000-000000000004','rollback-rejected@example.invalid','{"display_name":"rollback rejected"}');
update public.profiles set role='admin',status='approved' where id='00000000-0000-4000-8000-000000000001';
update public.profiles set status='approved' where id='00000000-0000-4000-8000-000000000002';
update public.profiles set status='rejected' where id='00000000-0000-4000-8000-000000000004';
insert into public.posts(id,author_id,title,content_html,visibility) values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','rollback public','<p>public</p>','public'),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','rollback private','<p>private</p>','private');
set local role anon;
do $$ begin
 if (select count(*) from public.posts where id::text like '10000000-%')<>1 then raise exception 'anonymous can access private post';end if;
 begin perform * from public.profiles;raise exception 'anonymous profiles exposed';exception when insufficient_privilege then null;end;
 begin insert into public.posts(author_id,title,content_html) values('00000000-0000-4000-8000-000000000001','attack','x');raise exception 'anon insert allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated","user_metadata":{"role":"admin","status":"approved"}}',true);
set local role authenticated;
do $$ declare affected integer;begin
 if (select count(*) from public.posts where id::text like '10000000-%')<>1 then raise exception 'pending can read private';end if;
 if (select count(*) from public.profiles)<>1 then raise exception 'pending sees other profiles';end if;
 begin insert into public.posts(author_id,title,content_html) values('00000000-0000-4000-8000-000000000003','attack','x');raise exception 'pending can create post';exception when insufficient_privilege then null;end;
 update public.profiles set status='approved' where id='00000000-0000-4000-8000-000000000003';get diagnostics affected=row_count;if affected<>0 then raise exception 'self approval succeeded';end if;
 begin update public.profiles set role='admin' where id='00000000-0000-4000-8000-000000000003';raise exception 'self role mutation allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
do $$ declare affected integer;begin
 if (select count(*) from public.posts where id::text like '10000000-%')<>2 then raise exception 'approved member cannot read private';end if;
 update public.posts set title='attack' where id='10000000-0000-4000-8000-000000000001';get diagnostics affected=row_count;if affected<>0 then raise exception 'member can edit posts';end if;
 delete from public.posts where id='10000000-0000-4000-8000-000000000001';get diagnostics affected=row_count;if affected<>0 then raise exception 'member can delete posts';end if;
 update public.profiles set status='approved' where id='00000000-0000-4000-8000-000000000003';get diagnostics affected=row_count;if affected<>0 then raise exception 'member can approve others';end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$ declare affected integer;begin
 if not private.is_admin() then raise exception 'admin check failed';end if;
 if (select count(*) from public.profiles where id::text like '00000000-%')<>4 then raise exception 'admin cannot list members';end if;
 update public.profiles set status='approved' where id='00000000-0000-4000-8000-000000000003';get diagnostics affected=row_count;if affected<>1 then raise exception 'admin approval failed';end if;
 update public.profiles set status='rejected' where id='00000000-0000-4000-8000-000000000004';get diagnostics affected=row_count;if affected<>1 then raise exception 'admin rejection failed';end if;
 insert into public.posts(author_id,title,content_html) values('00000000-0000-4000-8000-000000000001','rollback created','<h2>format</h2><p>saved</p>');
 update public.profiles set status='expelled' where id='00000000-0000-4000-8000-000000000002';
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
do $$ begin if exists(select 1 from public.posts where id='10000000-0000-4000-8000-000000000002') then raise exception 'revoked member retained private access';end if;end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
set local role authenticated;
do $$ begin if exists(select 1 from public.posts where id='10000000-0000-4000-8000-000000000002') then raise exception 'rejected member can read private';end if;end $$;
reset role;
rollback;
select 'PASS: anonymous, pending, approved, rejected, admin, revoked; profile and post RLS; metadata forgery blocked. All fixtures rolled back.' as verification;
