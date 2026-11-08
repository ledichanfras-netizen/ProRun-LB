import test from 'node:test';import assert from 'node:assert/strict';
import {permitsAI} from '../server/prorunAI';
test('only administrator may generate periodization or strength',()=>{
 const coach={active:true,role:'coach',platform_admin:false};assert.equal(permitsAI(coach,'analysis'),true);assert.equal(permitsAI(coach,'periodization'),false);assert.equal(permitsAI(coach,'strength'),false);
 assert.equal(permitsAI({...coach,platform_admin:true},'periodization'),true);assert.equal(permitsAI({...coach,platform_admin:true},'strength'),true);
});
test('student, disabled account, changed role and pending password cannot use AI endpoints',()=>{
 for(const a of [null,{active:false,role:'coach',platform_admin:true},{active:true,role:'athlete',platform_admin:true},{active:true,role:'coach',platform_admin:true,must_change_password:true}])for(const action of ['analysis','periodization','strength'])assert.equal(permitsAI(a,action),false);
 assert.equal(permitsAI({active:true,role:'coach',platform_admin:true},'unknown'),false);
});
