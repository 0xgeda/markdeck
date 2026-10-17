import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {openShowPlan} from '../src/show-plan.js';
import {logicSections} from '../src/logic-panel.js';
const dom=new JSDOM('<article><h1>报告</h1><h2>现状</h2><p>证据正文</p><h3>证据来源</h3><p>详细数据</p><h2>建议</h2><p>行动正文</p><h2>附录</h2><p>附录正文</p></article>',{url:'https://plan.test'});
globalThis.window=dom.window;const document=window.document;
const article=document.querySelector('article'),original=article.innerHTML,editor={getEditorElements:()=>({wwEditor:article})};
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
let stored,failSave=false,closed=0,preview;
window.HTMLElement.prototype.scrollIntoView=function(){preview=this.textContent;};
window.confirm=()=>true;
const headings=()=>[...article.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((node,index)=>({index,title:node.textContent,level:Number(node.tagName[1])}));
async function open(){
  const state=stored?JSON.parse(stored):{plans:[],summaries:{}};
  return openShowPlan({editor,title:'报告',state,sections:level=>logicSections(headings(),'报告',level),level:2,
    save:async()=>{if(failSave)return false;stored=JSON.stringify(state);return true;},onClose:()=>closed++});
}
let controller=await open(),plan=document.querySelector('.show-plan-pane');
assert.equal(plan.tagName,'ASIDE');assert.equal(document.querySelector('dialog'),null);
assert.equal(plan.querySelectorAll('.show-plan-row').length,3);
assert.equal(plan.querySelector('.plan-name').hidden,true);assert.equal(plan.querySelector('.plan-menu').open,false);
assert.equal(plan.querySelector('[data-add]').hidden,true);assert.equal(plan.querySelector('[data-remove]'),null);
plan.querySelector('[data-preview="1"]').click();assert.equal(preview,'建议');
plan.querySelector('[data-rename]').click();assert.equal(plan.querySelector('.plan-name').hidden,false);
const name=plan.querySelector('[data-name]');name.value='客户沟通';name.dispatchEvent(new window.Event('input'));
name.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter'}));assert.equal(plan.querySelector('.plan-name').hidden,true);
const appendix=plan.querySelector('[data-enabled="2"]');appendix.checked=false;appendix.dispatchEvent(new window.Event('change',{bubbles:true}));
assert.equal(plan.querySelector('[data-count]').textContent,'2 / 3 章');
plan.querySelector('[data-up="1"]').click();
plan.querySelector('[data-start]').click();await tick();
let viewer=document.querySelector('.chapter-show');assert.equal(viewer.tagName,'SECTION');
assert.match(viewer.querySelector('.chapter-show-content').textContent,/行动正文/);assert.doesNotMatch(viewer.textContent,/附录正文|证据正文/);
viewer.querySelector('[data-next]').click();assert.match(viewer.textContent,/证据正文/);assert.match(viewer.textContent,/详细数据/);assert.equal(viewer.querySelector('script'),null);assert.equal(viewer.querySelector('[data-next]').disabled,true);
assert.equal(article.innerHTML,original);
// Escape returns one level at a time, leaving the saved arrangement intact.
document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',cancelable:true}));
assert.equal(document.querySelector('.chapter-show'),null);assert.ok(document.querySelector('.show-plan-pane'));
assert.equal(document.body.classList.contains('chapter-showing'),false);
plan.querySelector('[data-new]').click();await tick();assert.equal(plan.querySelector('[data-plans]').options.length,2);
document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',cancelable:true}));await tick();
assert.equal(document.querySelector('.show-plan-pane'),null);assert.equal(document.body.classList.contains('show-plan-open'),false);
controller=await open();plan=document.querySelector('.show-plan-pane');
assert.equal(plan.querySelector('[data-name]').value,'客户沟通');assert.equal(plan.querySelectorAll('[data-enabled]:checked').length,2);assert.match(plan.querySelector('.show-plan-row').textContent,/建议/);
assert.equal(await controller.close(),true);
// A renamed chapter is missing; a new chapter is not silently included.
article.querySelector('h2').textContent='新的现状';
controller=await open();plan=document.querySelector('.show-plan-pane');assert.match(plan.textContent,/章节已失效/);
plan.querySelector('[data-start]').click();await tick();assert.equal(document.querySelector('.chapter-show'),null);assert.match(plan.querySelector('[data-status]').textContent,/请先移除/);
plan.querySelector('[data-remove="1"]').click();plan.querySelector('[data-add]').click();assert.match(plan.querySelector('[data-rows]').textContent,/新的现状/);
// Failed saves keep the arrangement available for retry.
failSave=true;assert.equal(await controller.close(),false);assert.ok(document.querySelector('.show-plan-pane'));assert.match(plan.querySelector('[data-status]').textContent,/保存失败/);
failSave=false;plan.querySelector('[data-start]').click();await tick();assert.ok(document.querySelector('.chapter-show'));
// Document/mode changes also dispose the owned chapter viewer.
assert.equal(await controller.close(),true);assert.equal(document.querySelector('.show-plan-pane,.chapter-show'),null);
assert.equal(document.body.classList.contains('chapter-showing'),false);assert.equal(closed,3);
stored=JSON.stringify({plans:[{items:null}]});await assert.rejects(open(),/已有数据未被覆盖/);
assert.equal(document.querySelector('.show-plan-pane'),null);assert.equal(document.body.classList.contains('show-plan-open'),false);
dom.window.close();console.log('Chapter sidebar preview, saved plans, ordering, exclusions, nested content, stale chapters, Escape, save retry and cleanup passed.');
