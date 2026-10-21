import test from 'node:test'; import assert from 'node:assert/strict';
import {canWrite,fileAllowed,escapeHtml} from '../src/utils.js';
test('pending or forged role without approved status has no admin UI',()=>{
 assert.equal(canWrite({role:'admin',status:'pending'}),false);
 assert.equal(canWrite({role:'member',status:'approved'}),false);
 assert.equal(canWrite({role:'admin',status:'approved'}),true);
});
test('active HTML in labels is escaped',()=>assert.equal(escapeHtml('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;'));
test('only supported bounded image uploads are accepted',()=>{
 assert.equal(fileAllowed({type:'image/svg+xml',size:100}),false);
 assert.equal(fileAllowed({type:'image/png',size:5242881}),false);
 assert.equal(fileAllowed({type:'image/png',size:200}),true);
});
