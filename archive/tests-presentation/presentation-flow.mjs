import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
const require=createRequire(import.meta.url);
const bundle=await build({entryPoints:['src/presentation/dialog.js'],bundle:true,platform:'browser',format:'iife',globalName:'Presentation',write:false});
async function nativeHarness(root){
  const handlers=new Map(),menus=[],paths=new Map();let owner,canceled=false;
  const app={setName(){},setPath:(name,value)=>paths.set(name,value),getPath:name=>paths.get(name)||path.join(root,name),requestSingleInstanceLock:()=>true,on(){},whenReady:()=>Promise.resolve(),quit(){}};
  const electron={app,nativeTheme:{},Menu:{buildFromTemplate:menu=>menu,setApplicationMenu:menu=>menus.push(menu)},dialog:{showOpenDialog:async()=>({canceled:false,filePaths:[path.join(root,'source.md')]}),showSaveDialog:async(_window,options)=>({canceled,filePath:path.join(root,options.filters[0].extensions[0]==='pptx'?'确认稿.pptx':'演示.html')}),showMessageBox:async()=>({response:0}),showErrorBox:(_title,message)=>{throw new Error(message)}},ipcMain:{handle:(name,callback)=>handlers.set(name,callback)},protocol:{registerSchemesAsPrivileged(){},handle(){}},net:{},session:{defaultSession:{setPermissionRequestHandler(){}}},BrowserWindow:class{
    constructor(){owner=this;this.ready=null;this.webContents={mainFrame:{url:''},setWindowOpenHandler(){},on(){},getURL:()=>this.webContents.mainFrame.url,send(){}};}
    once(_name,callback){this.ready=callback}on(){}maximize(){}show(){}setBackgroundColor(){}
    loadURL(url){this.webContents.mainFrame.url=url;this.ready?.()}
  }};
  const filename=path.resolve('desktop/main.cjs');
  vm.runInNewContext(fs.readFileSync(filename,'utf8'),{require:name=>name==='electron'?electron:name==='./workspace.cjs'?require('../desktop/workspace.cjs'):createRequire(path.resolve('desktop/main.cjs'))(name),__dirname:path.dirname(filename),process:{platform:process.platform,env:{LARKDOWN_DATA_DIR:path.join(root,'data')}},Buffer,console},{filename});
  await new Promise(resolve=>setImmediate(resolve));
  const event={sender:owner.webContents,senderFrame:owner.webContents.mainFrame};
  return {call:(name,...args)=>handlers.get(name)(event,...args),rejectSender:(name,...args)=>handlers.get(name)({sender:{},senderFrame:{}},...args),menus,setCanceled:value=>{canceled=value}};
}
function domHarness(native){
  const dom=new JSDOM('<!doctype html><html><body><main>原始编辑窗口</main></body></html>',{runScripts:'dangerously',pretendToBeVisual:true,url:'https://larkdown.test'});
  const w=dom.window;w.structuredClone=structuredClone;w.HTMLElement.prototype.scrollIntoView=function(){};
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'))};
  // jsdom has no srcdoc loader; load the real generated HTML into its iframe DOM.
  Object.defineProperty(w.HTMLIFrameElement.prototype,'srcdoc',{set(html){this.contentDocument.open();this.contentDocument.write(html);this.contentDocument.close();this.dispatchEvent(new w.Event('load'));}});
  w.setImmediate=setImmediate;w.clearImmediate=clearImmediate;w.confirm=()=>true;w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.desktop={loadDeck:id=>native.call('deck:load',id),saveDeck:(id,draft)=>native.call('deck:save',id,draft),exportPptx:(title,data)=>native.call('deck:export-pptx',title,data)};
  w.eval(bundle.outputFiles[0].text);
  return dom;
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('editable confirmation draft persists, page operations, theme, actual native PPTX export and source protection',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'larkdown-draft-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const original='# 报告\n\n整理时间：今天\n\n## 结论\n\n第一段\n\n第二段\n\n## 证据\n\n| 名称 | 数字 |\n| --- | --- |\n| 面包 | 120 |';fs.writeFileSync(path.join(root,'source.md'),original);
  const native=await nativeHarness(root);const source=(await native.call('workspace:open')).state.docs[0];
  const dom=domHarness(native);t.after(()=>dom.window.close());const w=dom.window;
  await w.Presentation.openPresentation(source);let dialog=w.document.querySelector('.presentation-dialog');
  assert.match(dialog.querySelector('[data-count]').textContent,/1 \/ 3/);
  dialog.querySelector('[data-next]').click();
  const title=dialog.querySelector('[data-title]');title.value='已确认结论';title.dispatchEvent(new w.Event('input'));
  dialog.querySelector('[data-split]').click();assert.match(dialog.querySelector('[data-count]').textContent,/3 \/ 4/);
  dialog.querySelector('[data-previous]').click();dialog.querySelector('[data-merge]').click();assert.match(dialog.querySelector('[data-count]').textContent,/2 \/ 3/);
  dialog.querySelector('[data-add]').click();dialog.querySelector('[data-delete]').click();assert.match(dialog.querySelector('[data-count]').textContent,/3 \/ 3/);
  dialog.querySelector('[data-undo]').click();assert.match(dialog.querySelector('[data-count]').textContent,/3 \/ 4/);dialog.querySelector('[data-delete]').click();
  const theme=dialog.querySelector('[data-theme]');theme.value='bold';theme.dispatchEvent(new w.Event('change'));
  dialog.querySelector('[data-close]').click();await tick();await tick();assert.equal(w.document.querySelector('.presentation-dialog'),null);
  const stored=JSON.parse((await native.call('deck:load',source.id)).draft);assert.equal(stored.pages[1].title,'已确认结论');assert.equal(stored.theme,'bold');
  await w.Presentation.openPresentation(source);dialog=w.document.querySelector('.presentation-dialog');assert.equal(dialog.querySelector('[data-theme]').value,'bold');
  dialog.querySelector('[data-export]').click();
  for(let i=0;i<100&&!fs.existsSync(path.join(root,'确认稿.pptx'));i++)await new Promise(resolve=>setTimeout(resolve,20));
  assert.ok(fs.existsSync(path.join(root,'确认稿.pptx')),dialog.querySelector('[data-feedback]').textContent);
  assert.equal(fs.readFileSync(path.join(root,'确认稿.pptx')).subarray(0,4).toString('hex'),'504b0304');
  assert.equal(fs.readFileSync(path.join(root,'source.md'),'utf8'),original);
  assert.equal((await native.call('deck:export-pptx','bad','not-a-zip')).ok,false);
  assert.equal((await native.call('deck:save','../other','{}')).ok,false);
  await assert.rejects(()=>native.rejectSender('deck:export-pptx','bad','bad'),/来源无效/);
});
test('empty Markdown gives a useful error without creating a draft',async t=>{
  const dom=new JSDOM('<body></body>',{runScripts:'dangerously',url:'https://empty.test'});t.after(()=>dom.window.close());const w=dom.window;w.structuredClone=structuredClone;
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};w.eval(bundle.outputFiles[0].text);
  await w.Presentation.openPresentation({id:'empty',title:'空文档',body:''});assert.match(w.document.querySelector('[data-feedback]').textContent,/没有正文/);
});
