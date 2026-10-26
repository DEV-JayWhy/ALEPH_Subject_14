import test from 'node:test';import assert from 'node:assert/strict';
import{checkReadingAccess}from'../src/access-refresh.js';
const member={id:'reader',role:'member',status:'approved'};
const post={id:'post',updated_at:'first',visibility:'private'};
test('unchanged permission checks leave the reading surface intact',async()=>{
 let count=0;const result=await checkReadingAccess({before:member,after:{...member},post,readPost:async(id,publicOnly)=>{count++;assert.equal(id,post.id);assert.equal(publicOnly,false);return {data:{...post},error:null};}});
 assert.equal(result.action,'unchanged');assert.equal(count,1);
});
test('membership removal or role changes discard private reading surface immediately',async()=>{
 for(const after of[{...member,status:'expelled'},{...member,status:'pending'},{...member,role:'admin'},null]){
  const result=await checkReadingAccess({before:member,after,post,readPost:()=>assert.fail('must react to profile change first')});assert.equal(result.action,'redraw');
 }
});
test('deleted or newly inaccessible post discards the reading surface',async()=>{
 const result=await checkReadingAccess({before:member,after:member,post,readPost:async()=>({data:null,error:null})});assert.equal(result.action,'redraw');
});
test('edited but accessible post is signaled without redrawing the body',async()=>{
 const latest={...post,updated_at:'new',visibility:'public'};const result=await checkReadingAccess({before:member,after:member,post,readPost:async()=>({data:latest,error:null})});assert.equal(result.action,'changed');assert.deepEqual(result.post,latest);
});
test('no open post does not fetch content; failed checks are not treated as successful',async()=>{
 assert.equal((await checkReadingAccess({before:member,after:member,post:null,readPost:()=>assert.fail()})).action,'unchanged');
 await assert.rejects(checkReadingAccess({before:member,after:member,post,readPost:async()=>({error:new Error('network')})}),/network/);
});
