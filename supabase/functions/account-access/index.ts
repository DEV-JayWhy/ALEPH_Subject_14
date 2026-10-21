import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import {normalizeUsername,validUsername,registrationIssue} from './account-rules.js';
import {reapply} from './reapply.js';
const url=Deno.env.get('SUPABASE_URL')!;
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const service=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const allowedOrigin='https://aleph-subject-14.vercel.app';
const headers={'Access-Control-Allow-Origin':allowedOrigin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store','Content-Type':'application/json'};
const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
async function takeSlot(req:Request,action:string,username:string){
 const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
 const hash=async(text:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(serviceKey+':'+text)))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const keys=[await hash(action+':ip:'+ip)];
 keys.push(await hash(action+':username:'+username));
 for(const key of keys){const{data,error}=await service.rpc('take_account_request_slot',{rate_key:key,max_requests:action==='register'?8:40,window_seconds:900});if(error)return false;if(!data)return false;}
 return true;
}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{message:'허용되지 않은 요청입니다.'});
 const origin=req.headers.get('origin');if(origin&&origin!==allowedOrigin)return reply(403,{message:'허용되지 않은 요청입니다.'});
 if(Number(req.headers.get('content-length')||0)>4096)return reply(413,{message:'요청 크기가 너무 큽니다.'});
 try{
  const text=await req.text();if(text.length>4096)return reply(413,{message:'요청 크기가 너무 큽니다.'});
  let body;try{body=JSON.parse(text);}catch{return reply(400,{message:'입력 내용을 확인해 주세요.'});}
  const username=normalizeUsername(body.username),password=body.password,action=body.action;
  if(action!=='register'&&action!=='login')return reply(400,{message:'올바르지 않은 요청입니다.'});
  if(!validUsername(username)||typeof password!=='string'||password.length<1||password.length>128)return reply(400,{message:'아이디와 비밀번호를 확인해 주세요.'});
  if(action==='register'){
   const issue=registrationIssue({username,password,displayName:body.displayName});if(issue)return reply(400,{message:issue});
  }
  if(!await takeSlot(req,action,username))return reply(429,{message:'시도가 너무 많습니다. 15분 후 다시 시도해 주세요.'});
  if(action==='register'){
   const{data:existing,error:lookupError}=await service.from('profiles').select('id,email,role,status').eq('username',username).maybeSingle();
   if(lookupError)return reply(503,{message:'가입 신청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'});
   if(existing){
    const auth=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
    const result=await reapply({profile:existing,password,displayName:body.displayName,auth,service});
    return reply(result.status,{message:result.message});
   }
   // Internal Auth identifier only. No mailbox, confirmation email, or invitation is used.
   const{error}=await service.auth.admin.createUser({email:`${username}@members.aleph.invalid`,password,email_confirm:true,user_metadata:{username,display_name:body.displayName.trim()}});
   if(error){if(/registered|duplicate|exists/i.test(error.message))return reply(409,{message:'이미 사용 중인 아이디입니다.'});return reply(400,{message:'가입 신청을 처리하지 못했습니다. 아이디와 비밀번호 조건을 확인해 주세요.'});}
   return reply(201,{message:'가입 신청을 접수했습니다. 관리자 승인 전에는 공개 기록만 볼 수 있습니다.'});
  }
  const{data:profile,error:profileError}=await service.from('profiles').select('id,email,status').eq('username',username).maybeSingle();
  if(profileError)return reply(503,{message:'로그인을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'});
  if(profile&&['rejected','expelled'].includes(profile.status))return reply(401,{message:'아이디 또는 비밀번호가 올바르지 않거나 이용이 제한된 계정입니다.'});
  // Use Supabase Auth to verify the password; never return an account's real email address.
  const auth=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const{data,error}=await auth.auth.signInWithPassword({email:profile?.email||'no-such-user@members.aleph.invalid',password});
  if(error||!data.session||!profile||data.user?.id!==profile.id)return reply(401,{message:'아이디 또는 비밀번호가 올바르지 않습니다.'});
  return reply(200,{session:{access_token:data.session.access_token,refresh_token:data.session.refresh_token}});
 }catch{return reply(500,{message:'요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'});}
});
