import test from 'node:test';import assert from 'node:assert/strict';
import{categoryNameIssue,categoryVisual,categoryImageHtml,categoryLabel,categoryIcons}from'../src/category-ui.js';
import{escapeHtml}from'../src/utils.js';
test('category names preserve Korean names, reject reserved/empty/control/overlong input',()=>{
 assert.equal(categoryNameIssue(' 리눅스 실습 '),null);
 for(const name of ['', ' ', '전체','미분류','임시저장','줄\n바꿈','가'.repeat(31)])assert.ok(categoryNameIssue(name));
 assert.equal(categoryNameIssue('가'.repeat(30)),null);assert.equal(categoryLabel(null),'미분류');
});
test('image selections admit only the built-in catalog and UUID upload references',()=>{
 assert.equal(categoryIcons.length,12);
 assert.deepEqual(categoryVisual('builtin:shield'),{icon_key:'shield',image_id:null});
 assert.deepEqual(categoryVisual('upload:12345678-1234-4321-8123-123456789abc'),{icon_key:'notebook',image_id:'12345678-1234-4321-8123-123456789abc'});
 for(const input of ['builtin:../../evil','https://evil/image.png','upload:x" onerror="alert(1)','builtin:shield:extra'])assert.throws(()=>categoryVisual(input));
 assert.ok(!categoryImageHtml({icon_key:'../../evil',image_id:'" onerror="alert(1)'},escapeHtml).includes('onerror'));
});
