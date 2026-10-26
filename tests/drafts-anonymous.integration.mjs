import{createClient}from'@supabase/supabase-js';import assert from'node:assert/strict';
const db=createClient('https://gvptgromcpetcyclpkds.supabase.co','sb_publishable_MlIR68TgHkAR58TGNXc0Og_PScv-qwg',{auth:{persistSession:false,autoRefreshToken:false}});
const read=await db.from('posts').select('id,title,excerpt,content_html').eq('is_published',false);assert.equal(read.error,null);assert.deepEqual(read.data,[]);
const create=await db.from('posts').insert({id:'90000000-0000-4000-8000-000000000011',author_id:'90000000-0000-4000-8000-000000000002',title:'MUST NOT BE CREATED',content_html:'x',visibility:'public',is_published:false});assert.equal(create.error?.code,'42501');
console.log(JSON.stringify({passed:2,checks:['Anonymous explicit draft lookup returns no rows','Anonymous draft write blocked by RLS']},null,2));
