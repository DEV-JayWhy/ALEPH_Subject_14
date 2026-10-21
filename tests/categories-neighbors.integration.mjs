import {createClient}from'@supabase/supabase-js';import assert from'node:assert/strict';
const SUPABASE_URL='https://gvptgromcpetcyclpkds.supabase.co';
const SUPABASE_KEY='sb_publishable_MlIR68TgHkAR58TGNXc0Og_PScv-qwg';
const db=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const checks=[];
const cats=await db.from('categories').select('id,name,icon_key,image_id');assert.equal(cats.error,null);assert.ok(cats.data.length>=1);checks.push('Anonymous categories can be read');
const images=await db.from('category_images').select('id,storage_path');assert.equal(images.error,null);checks.push('Anonymous image catalog can be read');
const forbidden=await db.from('categories').insert({name:'MUST NOT BE CREATED',icon_key:'notebook'});assert.equal(forbidden.error?.code,'42501');checks.push('Anonymous category creation rejected by RLS');
const imageForbidden=await db.from('category_images').insert({label:'MUST NOT BE CREATED',storage_path:'40000000-0000-4000-8000-000000000001.png'});assert.equal(imageForbidden.error?.code,'42501');checks.push('Anonymous image registration rejected by RLS');
const read=await db.from('posts').select('id,title,created_at,visibility').eq('is_published',true).order('created_at').order('id');assert.equal(read.error,null);assert.ok(read.data.every(p=>p.visibility==='public'));
for(const [index,post]of read.data.entries()){
 for(const publicOnly of[true,false]){const result=await db.rpc('get_neighbor_posts',{p_post_id:post.id,p_public_only:publicOnly});assert.equal(result.error,null);
  const prev=result.data.find(p=>p.direction==='previous'),next=result.data.find(p=>p.direction==='next');assert.equal(prev?.id,read.data[index-1]?.id);assert.equal(next?.id,read.data[index+1]?.id);
  for(const neighbor of result.data)assert.ok(read.data.some(p=>p.id===neighbor.id&&p.title===neighbor.title));
 }
}
checks.push(`Anonymous neighbors match public posts only (${read.data.length} visible posts; public-only flag true/false)`);
const missing=await db.rpc('get_neighbor_posts',{p_post_id:'40000000-0000-4000-8000-000000000001',p_public_only:false});assert.equal(missing.error,null);assert.deepEqual(missing.data,[]);checks.push('Unavailable current post returns no neighboring titles');
const privateCurrent=await db.rpc('get_neighbor_posts',{p_post_id:'e2098d8a-2277-4203-beac-1187bce22580',p_public_only:false});assert.equal(privateCurrent.error,null);assert.deepEqual(privateCurrent.data,[]);checks.push('Known private current post exposes no neighboring titles to anonymous caller');
console.log(JSON.stringify({passed:checks.length,checks},null,2));
