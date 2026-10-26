import test from'node:test';import assert from'node:assert/strict';import{storeWriting,deleteStoredDraft}from'../src/writing-store.js';
const values={title:'작성 중',excerpt:'요약',content_html:'<p>첫 본문</p>',category:null,visibility:'public'};
function database(){const rows=new Map(),calls=[];let fail=false;const db={from(table){assert.equal(table,'posts');let op,payload,filters=[];const query={insert(data){op='insert';payload=data;calls.push('insert');return this;},delete(){op='delete';return this;},update(data){op='update';payload=data;calls.push('update');return this;},eq(k,v){filters.push([k,v]);return this;},select(){return this;},async maybeSingle(){if(fail)return{error:new Error('offline')};if(op==='insert'){const row={created_at:'first',updated_at:'first',...payload};rows.set(row.id,row);return{data:structuredClone(row),error:null};}const row=[...rows.values()].find(r=>filters.every(([k,v])=>r[k]===v));if(!row)return{data:null,error:null};if(op==='delete'){rows.delete(row.id);return{data:{id:row.id},error:null};}Object.assign(row,payload);return{data:structuredClone(row),error:null};}};return query;}};return{db,rows,calls,setFail:()=>fail=true};}
test('draft saves update one record and publish the latest content without leaving a draft copy',async()=>{
 const {db,rows,calls}=database();let saved=await storeWriting({db,id:'record',authorId:'admin',values,publish:false});assert.equal(saved.is_published,false);
 saved=await storeWriting({db,id:'record',authorId:'admin',previous:saved,values:{...values,content_html:'<p>두 번째</p>'},publish:false});assert.equal(rows.size,1);
 const published=await storeWriting({db,id:'record',authorId:'admin',previous:saved,values:{...values,content_html:'<p>계속 쓴 최종 내용</p>'},publish:true});
 assert.equal(published.id,'record');assert.equal(published.is_published,true);assert.equal(published.content_html,'<p>계속 쓴 최종 내용</p>');assert.equal(rows.size,1);assert.equal([...rows.values()].filter(r=>!r.is_published).length,0);assert.deepEqual(calls,['insert','update','update']);assert.notEqual(published.created_at,'first');
});
test('unfinished drafts allow missing title and preserve image asset references on resume',async()=>{
 const {db}=database();const html='<p></p><img data-asset="record/image.png" alt="공부 사진">';const draft=await storeWriting({db,id:'record',authorId:'admin',values:{...values,title:'',content_html:html},publish:false});assert.equal(draft.title,'제목 없는 임시저장');assert.equal(draft.content_html,html);
 const published=await storeWriting({db,id:'record',authorId:'admin',previous:draft,values:{...values,content_html:html},publish:true});assert.equal(published.content_html,html);
});
test('failed publish keeps the stored draft intact',async()=>{
 const mock=database();const saved=await storeWriting({db:mock.db,id:'record',authorId:'admin',values,publish:false});mock.setFail();await assert.rejects(storeWriting({db:mock.db,id:'record',authorId:'admin',previous:saved,values,publish:true}),/offline/);assert.equal(mock.rows.get('record').is_published,false);
});
test('stale draft cannot overwrite a record already published in another window',async()=>{
 const {db,rows}=database();const stale=await storeWriting({db,id:'record',authorId:'admin',values,publish:false});await storeWriting({db,id:'record',authorId:'admin',previous:stale,values,publish:true});await assert.rejects(storeWriting({db,id:'record',authorId:'admin',previous:stale,values,publish:false}),e=>Boolean(e.publicMessage));assert.equal(rows.get('record').is_published,true);
});
test('draft operation never unpublishes an existing published post',async()=>{
 const {db,rows}=database();const published=await storeWriting({db,id:'record',authorId:'admin',values,publish:true});await assert.rejects(storeWriting({db,id:'record',authorId:'admin',previous:published,values,publish:false}),e=>Boolean(e.publicMessage));assert.equal(rows.get('record').is_published,true);
});

test('draft deletion removes only the selected unchanged draft',async()=>{
 const {db,rows}=database();const draft=await storeWriting({db,id:'discard',authorId:'admin',values,publish:false});await storeWriting({db,id:'keep',authorId:'admin',values,publish:false});await deleteStoredDraft({db,id:draft.id,updatedAt:draft.updated_at});assert.equal(rows.has('discard'),false);assert.equal(rows.has('keep'),true);
});
test('stale deletion cannot remove a draft modified or published elsewhere',async()=>{
 const {db,rows}=database();const draft=await storeWriting({db,id:'record',authorId:'admin',values,publish:false});rows.get('record').updated_at='changed elsewhere';await assert.rejects(deleteStoredDraft({db,id:draft.id,updatedAt:draft.updated_at}),e=>Boolean(e.publicMessage));assert.equal(rows.size,1);rows.get('record').updated_at=draft.updated_at;rows.get('record').is_published=true;await assert.rejects(deleteStoredDraft({db,id:draft.id,updatedAt:draft.updated_at}),e=>Boolean(e.publicMessage));assert.equal(rows.get('record').is_published,true);
});
test('failed draft deletion preserves saved contents',async()=>{
 const mock=database();const draft=await storeWriting({db:mock.db,id:'record',authorId:'admin',values,publish:false});mock.setFail();await assert.rejects(deleteStoredDraft({db:mock.db,id:draft.id,updatedAt:draft.updated_at}),/offline/);assert.equal(mock.rows.get('record').content_html,values.content_html);
});
