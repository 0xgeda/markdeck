import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';import {JSDOM} from 'jsdom';
const require=createRequire(import.meta.url),{Workspace}=require('../desktop/workspace.cjs');
const {Project}=require('../desktop/project.cjs');const project=new Project();
const root=fs.mkdtempSync(path.join(os.tmpdir(),'markdeck-app-')),file=path.join(root,'source.md');fs.writeFileSync(file,'## 开始\n\n查找 **查找**\n\n### 子章节\n\n正文');const workspace=new Workspace(path.join(root,'data'));workspace.open(file);
const bundle=await build({entryPoints:['src/main.js'],bundle:true,write:false,format:'esm',platform:'browser',loader:{'.css':'empty','.svg':'dataurl'},plugins:[{name:'raw-css',setup(build){build.onLoad({filter:/\.css\?raw$/},args=>({contents:fs.readFileSync(args.path.replace(/\?raw$/,''),'utf8'),loader:'text'}));}}]});
const dom=new JSDOM('<div id="app"></div>',{url:'https://app.test',runScripts:'dangerously',pretendToBeVisual:true});const w=dom.window;
w.matchMedia=()=>({matches:false});w.structuredClone=structuredClone;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};w.HTMLDialogElement.prototype.close=function(){if(!this.open)return;this.removeAttribute('open');setTimeout(()=>this.dispatchEvent(new w.Event('close')),0)};w.Range.prototype.getBoundingClientRect=()=>({left:0,top:0,right:0,bottom:0});w.Range.prototype.getClientRects=()=>[];
let appAction,closeResult;
const ok=fn=>async(...args)=>({ok:true,...fn(...args)});w.desktop={searchProject:async q=>({ok:true,...await project.search(q)}),chooseProject:async()=>({ok:true,...await project.choose(root)}),refreshProject:async()=>({ok:true,...await project.refresh()}),openProjectFile:async relative=>({ok:true,state:workspace.open(await project.resolve(relative))}),setTheme:async()=>({ok:true}),load:ok(()=>({state:workspace.snapshot()})),save:ok(snapshot=>workspace.save(snapshot)),sync:ok(id=>workspace.sync(id)),onAction:callback=>{appAction=callback;},finishClose:async result=>{closeResult=result;},readImage:ok((id,src)=>workspace.attachments.read(id,src)),versions:ok(id=>({versions:workspace.versions(id)})),restore:ok((id,version)=>workspace.restore(id,version))};
try{
await w.eval('(async()=>{'+bundle.outputFiles[0].text+'})()');
const until=async predicate=>{for(let i=0;i<100;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,10));}assert.ok(predicate(),'operation did not finish');};
const settled=()=>new Promise(resolve=>setTimeout(resolve,30));
const click=action=>w.document.querySelector(`[data-action="${action}"]`).click();const beforeFold=fs.readFileSync(file,'utf8');
// Frequent actions are reachable without settings and stay in sync after rerender.
const outlineToggle=()=>w.document.querySelector('.topbar [data-action="outline"]');
assert.equal(w.document.querySelector('#settings-dialog #show-outline'),null);
assert.equal(outlineToggle().getAttribute('aria-pressed'),'true');
w.document.querySelector('.outline-close').click();assert.equal(outlineToggle().getAttribute('aria-label'),'显示目录');assert.ok(w.document.body.classList.contains('outline-hidden'));
outlineToggle().click();assert.equal(w.document.body.classList.contains('outline-hidden'),false);
const imported=w.document.querySelector('.sidebar [data-action="import"]');assert.equal(imported.previousElementSibling.dataset.action,'new');
let opened=0;w.desktop.open=async()=>{opened++;return {ok:true,canceled:true};};
imported.click();await new Promise(resolve=>setTimeout(resolve,20));assert.equal(opened,1);assert.equal(fs.readFileSync(file,'utf8'),beforeFold);
click('sidebar');assert.ok(w.document.body.classList.contains('sidebar-open'));w.document.querySelector('.mobile-close').click();assert.equal(w.document.body.classList.contains('sidebar-open'),false);
w.document.querySelector('[data-fold-outline-node="0"]').click();assert.equal(w.document.querySelector('.section-fold-hidden'),null);assert.ok(w.document.querySelector('#outline .outline-entry[hidden]'));assert.equal(w.document.querySelectorAll('[data-fold-outline-node]').length,1);
await new Promise(resolve=>setTimeout(resolve,300));assert.equal(fs.readFileSync(file,'utf8'),beforeFold);
w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'f',ctrlKey:true,bubbles:true,cancelable:true}));assert.equal(w.document.querySelector('.section-fold-hidden'),null);w.document.querySelector('.find-panel [data-close]').click();
click('reference');await new Promise(resolve=>setTimeout(resolve,20));assert.ok(w.document.querySelector('.reference-pane'));w.document.querySelector('[aria-label="关闭参考文档"]').click();assert.equal(w.document.body.classList.contains('reference-open'),false);
assert.equal(outlineToggle().getAttribute('aria-pressed'),'true');
click('reference');await new Promise(resolve=>setTimeout(resolve,20));assert.equal(outlineToggle().getAttribute('aria-pressed'),'false');
outlineToggle().click();assert.equal(w.document.querySelector('.reference-pane'),null);assert.equal(w.document.body.classList.contains('outline-hidden'),false);
click('find');const panel=w.document.querySelector('.find-panel');const query=panel.querySelector('[data-query]');query.value='查找';query.dispatchEvent(new w.Event('input'));assert.match(panel.querySelector('[data-count]').textContent,/2/);
for(const [shiftKey,count] of [[false,'2 / 2'],[false,'1 / 2'],[true,'2 / 2']]){query.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',shiftKey,bubbles:true,cancelable:true}));assert.equal(panel.querySelector('[data-count]').textContent,count);}
query.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true}));assert.equal(panel.querySelector('[data-count]').textContent,'2 / 2');
panel.querySelector('[data-replacement]').value='替换';panel.querySelector('[data-all]').click();await new Promise(resolve=>setTimeout(resolve,350));assert.match(fs.readFileSync(file,'utf8'),/替换/);panel.querySelector('[data-close]').click();
// Closing find must not remove the application's autosave listener.
const editable=w.document.querySelector('[aria-label="文档正文"]');const paragraph=[...editable.querySelectorAll('p')].at(-1);paragraph.textContent='关闭查找后的编辑';await new Promise(resolve=>setTimeout(resolve,350));assert.match(fs.readFileSync(file,'utf8'),/关闭查找后的编辑/);
const filter=w.document.querySelector('#outline-filter');filter.value='子章节';filter.dispatchEvent(new w.Event('input'));assert.equal([...w.document.querySelectorAll('#outline a')].filter(link=>!link.hidden).length,1);
click('presentation');await settled();assert.equal(editable.getAttribute('contenteditable'),'false');w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));await settled();assert.equal(editable.getAttribute('contenteditable'),'true');
for(const theme of ['paper','mist','rose','graphite','midnight','sage-orange','sage','light','terminal']){w.document.querySelector(`[data-theme-choice="${theme}"]`).click();assert.equal(w.document.documentElement.dataset.theme,theme);assert.equal(w.document.querySelector(`[data-theme-choice="${theme}"]`).getAttribute('aria-pressed'),'true');}
click('logic');await new Promise(resolve=>setTimeout(resolve,20));assert.equal(w.document.querySelectorAll('.logic-group').length,1);assert.equal(w.document.querySelector('.logic-workspace').tagName,'SECTION');assert.equal(w.document.querySelectorAll('.work-modes').length,1);assert.equal(w.document.querySelector('dialog[open]'),null);click('write');await new Promise(resolve=>setTimeout(resolve,0));assert.equal(w.document.querySelector('.logic-workspace'),null);
// Three-mode navigation and secondary planning never leave stacked visible surfaces.
assert.equal(w.document.querySelector('[data-mode="write"]').getAttribute('aria-pressed'),'true');
click('presentation');await settled();assert.equal(w.document.querySelector('[data-mode="display"]').getAttribute('aria-pressed'),'true');
w.document.querySelector('[data-arrange]').click();await new Promise(resolve=>setTimeout(resolve,30));
assert.equal(w.document.body.classList.contains('display-mode'),true);assert.equal(w.document.querySelector('[data-mode="display"]').getAttribute('aria-pressed'),'true');
assert.ok(w.document.querySelector('.show-plan-pane'));w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'f',ctrlKey:true,bubbles:true,cancelable:true}));assert.equal(w.document.querySelector('.find-panel'),null);
assert.equal(w.document.querySelector('.logic-workspace'),null);assert.equal(w.document.querySelector('.show-plan-pane').tagName,'ASIDE');assert.equal(w.document.querySelector('dialog[open]'),null);
w.document.querySelector('.show-plan-pane [data-close]').click();await new Promise(resolve=>setTimeout(resolve,10));
assert.equal(w.document.querySelector('.show-plan-pane'),null);click('logic');await settled();
click('presentation');await new Promise(resolve=>setTimeout(resolve,10));
assert.equal(w.document.querySelector('.logic-workspace'),null);assert.equal(w.document.body.classList.contains('display-mode'),true);assert.equal(w.document.querySelector('[data-mode="display"]').getAttribute('aria-pressed'),'true');assert.equal(w.document.querySelector('[data-mode="write"]').getAttribute('aria-pressed'),'false');
click('write');await settled();assert.equal(editable.getAttribute('contenteditable'),'true');assert.equal(w.document.querySelector('[data-mode="write"]').getAttribute('aria-pressed'),'true');
// Slow loading and saving must not race the selected mode or discard a note.
const modeSource=fs.readFileSync(file,'utf8');let layout=null,failSave=false,loads=0;
w.desktop.loadLogic=async()=>{loads++;await settled();return {ok:true,state:layout};};
w.desktop.saveLogic=async(id,state)=>{await settled();if(failSave)return {ok:false,error:'测试保存失败'};layout=state;return {ok:true};};
click('logic');click('presentation');click('logic');
await until(()=>loads===2&&w.document.querySelector('[data-mode="organize"]').getAttribute('aria-pressed')==='true');
assert.equal(w.document.querySelectorAll('.logic-workspace').length,1);assert.equal(w.document.querySelector('.display-exit'),null);
assert.equal(w.document.querySelector('.document-shell').inert,true);
w.document.querySelector('[data-add-note]').click();const note=w.document.querySelector('[data-note]');note.value='切换前最后输入的便笺';note.dispatchEvent(new w.Event('input',{bubbles:true}));
failSave=true;click('presentation');await until(()=>w.document.querySelector('.logic-workspace [data-status]')?.textContent.includes('保存失败'));
assert.equal(w.document.querySelector('[data-mode="organize"]').getAttribute('aria-pressed'),'true');assert.equal(w.document.querySelector('.display-exit'),null);
failSave=false;click('presentation');await until(()=>w.document.querySelector('[data-mode="display"]').getAttribute('aria-pressed')==='true');
assert.ok(Object.values(JSON.parse(layout).notes).includes('切换前最后输入的便笺'));
// Planning belongs to display; leaving a failed save must not discard it.
w.document.querySelector('[data-arrange]').click();await until(()=>w.document.querySelector('.show-plan-pane')?.inert===false);
const planName=w.document.querySelector('.show-plan-pane [data-name]');planName.value='对客汇报';planName.dispatchEvent(new w.Event('input'));
await until(()=>JSON.parse(layout).plans[0]?.name==='对客汇报');
failSave=true;click('write');await until(()=>w.document.querySelector('.show-plan-pane [data-status]')?.textContent.includes('保存失败'));
assert.equal(w.document.querySelector('[data-mode="display"]').getAttribute('aria-pressed'),'true');
failSave=false;w.document.querySelector('.show-plan-pane [data-start]').click();await until(()=>w.document.querySelector('.chapter-show'));
assert.equal(w.document.querySelector('[data-mode="display"]').getAttribute('aria-pressed'),'true');
click('logic');await until(()=>w.document.querySelector('[data-note]'));
assert.equal(w.document.querySelector('.show-plan-pane,.chapter-show'),null);
assert.equal(w.document.querySelector('[data-note]').value,'切换前最后输入的便笺');
assert.equal(JSON.parse(layout).plans[0].name,'对客汇报');
// The organize shortcut saves the board, then enters display with its sidebar.
w.document.querySelector('[data-show-plan]').click();await until(()=>w.document.querySelector('.show-plan-pane')?.inert===false);
assert.equal(w.document.querySelector('.logic-workspace'),null);assert.equal(w.document.querySelector('[data-mode="display"]').getAttribute('aria-pressed'),'true');
await appAction('open');assert.equal(w.document.querySelector('.logic-workspace'),null);assert.equal(w.document.querySelector('[data-mode="write"]').getAttribute('aria-pressed'),'true');
assert.equal(w.document.querySelector('.show-plan-pane,.chapter-show'),null);
assert.equal(w.document.querySelector('.document-shell').inert,false);assert.equal(fs.readFileSync(file,'utf8'),modeSource);
// Close during the typing buffer must persist the newest edit before acknowledging.
const last=[...editable.querySelectorAll('p')].at(-1);last.textContent='关闭前最后一次输入';
await new Promise(resolve=>setTimeout(resolve,0));await appAction('close');
assert.equal(closeResult.ok,true);assert.match(fs.readFileSync(file,'utf8'),/关闭前最后一次输入/);
await appAction('presentation');await appAction('presentation');await appAction('new');assert.equal(w.document.querySelector('.display-exit'),null);assert.equal(w.document.body.classList.contains('display-mode'),false);
assert.ok(workspace.versions(workspace.state.docs.find(d=>d.filePath===fs.realpathSync(file)).id).length);fs.writeFileSync(path.join(root,'folder-document.md'),'# 文件夹文档\n\n跨文件关键词');
click('find');click('find');assert.equal(w.document.querySelectorAll('.find-panel').length,1);
click('project');await new Promise(resolve=>setTimeout(resolve,10));const projectDialog=w.document.querySelector('.project-dialog');projectDialog.querySelector('[data-choose]').click();await new Promise(resolve=>setTimeout(resolve,20));
const search=projectDialog.querySelector('[data-query]');search.value='跨文件关键词';search.dispatchEvent(new w.Event('input'));await new Promise(resolve=>setTimeout(resolve,250));assert.equal(projectDialog.querySelectorAll('.project-result').length,1);
projectDialog.querySelector('.project-result').click();await until(()=>!w.document.querySelector('.project-dialog'));assert.equal(w.document.querySelector('.project-dialog'),null);assert.match(w.document.querySelector('[aria-label="文档正文"]').textContent,/跨文件关键词/);assert.equal(w.document.querySelectorAll('.find-panel').length,1);assert.equal(w.document.querySelector('.find-panel [data-query]').value,'跨文件关键词');assert.match(w.document.querySelector('.find-panel [data-count]').textContent,/1 \/ 1/);assert.match(fs.readFileSync(file,'utf8'),/关闭前最后一次输入/);
console.log('Whole renderer: find/replace, save after closing find, outline search, display exit and version capture passed.');
}finally{dom.window.close();fs.rmSync(root,{recursive:true,force:true});}
