import test from 'node:test';
import assert from 'node:assert/strict';
import {reapply} from '../supabase/functions/account-access/reapply.js';
const profile={id:'original-user',email:'internal@example.invalid',role:'member',status:'rejected'};
function setup({status='rejected',role='member',valid=true,match=true,rows=[{id:profile.id}],signOutError=null}={}){
 const calls=[];
 const query={update(value){calls.push(['update',value]);return this;},eq(...args){calls.push(['eq',...args]);return this;},async select(){return {data:rows,error:null};}};
 return {calls,args:{profile:{...profile,status,role},password:'original-password',displayName:' 재신청자 ',auth:{auth:{async signInWithPassword(){calls.push(['verify']);return {data:valid?{session:{},user:{id:match?profile.id:'other-user'}}:{},error:valid?null:{message:'invalid'}};},async signOut(options){calls.push(['signOut',options]);return {error:signOutError};}}},service:{from(){return query;}}}};
}
test('only rejected members can reapply; pending, approved, expelled and admins remain unchanged',async()=>{
 for(const options of [{status:'pending'},{status:'approved'},{status:'expelled'},{role:'admin'}]){
  const {args,calls}=setup(options);assert.equal((await reapply(args)).status,409);assert.deepEqual(calls,[]);
 }
});
test('wrong password and mismatched identity cannot change rejection',async()=>{
 for(const options of [{valid:false},{match:false}]){const {args,calls}=setup(options);assert.equal((await reapply(args)).status,401);assert.ok(!calls.some(c=>c[0]==='update'));}
});
test('verified owner returns to pending, receives no session and preserves identity/password',async()=>{
 const {args,calls}=setup();const result=await reapply(args);assert.equal(result.status,200);assert.equal(result.session,undefined);
 assert.deepEqual(calls,[['verify'],['signOut',{scope:'local'}],['update',{status:'pending',reviewed_at:null,display_name:'재신청자'}],['eq','id',profile.id],['eq','role','member'],['eq','status','rejected']]);
});
test('concurrent review and failed signout do not report reapplication success',async()=>{
 const race=setup({rows:[]});assert.equal((await reapply(race.args)).status,409);
 const failed=setup({signOutError:{message:'unavailable'}});assert.equal((await reapply(failed.args)).status,503);assert.ok(!failed.calls.some(c=>c[0]==='update'));
});
