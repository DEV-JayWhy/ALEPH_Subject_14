-- Add username login without changing existing auth identities, passwords, or posts.
alter table public.profiles add column username text;
update public.profiles set username=case when role='admin' then 'admin' else lower(split_part(email,'@',1)) end;
alter table public.profiles alter column username set not null;
alter table public.profiles add constraint profiles_username_format check(username ~ '^[a-z][a-z0-9._-]{2,31}$');
alter table public.profiles add constraint profiles_username_unique unique(username);

create or replace function private.new_member() returns trigger
language plpgsql security definer set search_path = ''
as $$ declare login_name text;begin
 login_name:=lower(trim(coalesce(new.raw_user_meta_data->>'username',split_part(new.email,'@',1))));
 insert into public.profiles(id,email,display_name,role,status,username)
 values(new.id,coalesce(new.email,''),left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),'새 회원'),50),'member','pending',login_name);
 return new;
end; $$;
revoke all on function private.new_member() from public,anon,authenticated;

create table private.account_request_limits (
 key text primary key,
 hits integer not null default 1,
 expires_at timestamptz not null
);
alter table private.account_request_limits enable row level security;
revoke all on private.account_request_limits from public,anon,authenticated;
grant usage on schema private to service_role;
grant all on private.account_request_limits to service_role;
create function public.take_account_request_slot(rate_key text,max_requests integer,window_seconds integer)
returns boolean language plpgsql security invoker set search_path = ''
as $$ declare affected integer;begin
 delete from private.account_request_limits where expires_at < now();
 insert into private.account_request_limits(key,hits,expires_at)
 values(rate_key,1,now()+make_interval(secs=>window_seconds))
 on conflict(key) do update set hits=private.account_request_limits.hits+1
 where private.account_request_limits.hits<max_requests;
 get diagnostics affected=row_count;
 return affected=1;
end; $$;
revoke all on function public.take_account_request_slot(text,integer,integer) from public,anon,authenticated;
grant execute on function public.take_account_request_slot(text,integer,integer) to service_role;
