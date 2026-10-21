import test from 'node:test';import assert from 'node:assert/strict';
import{normalizeUsername,validUsername,registrationIssue}from'../src/account-rules.js';
test('username login normalizes case and rejects emails or invalid identifiers',()=>{
 assert.equal(normalizeUsername('  Study_01 '),'study_01');
 for(const value of ['ab','1abc','somebody@example.com','홍길동','a'.repeat(33)])assert.equal(validUsername(value),false);
 assert.equal(validUsername('study_01'),true);
});
test('registration allows 10 and 11 characters and rejects short or reserved credentials',()=>{
 const valid={username:'learner',displayName:'배우는 사람',password:'x'.repeat(11)};
 assert.equal(registrationIssue(valid),null);
 assert.equal(registrationIssue({...valid,password:'x'.repeat(10)}),null);
 assert.ok(registrationIssue({...valid,password:'x'.repeat(9)}));
 assert.ok(registrationIssue({...valid,username:'admin'}));
 assert.ok(registrationIssue({...valid,displayName:' '}));
});
