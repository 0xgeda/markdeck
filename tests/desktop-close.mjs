import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{Workspace}=require('../desktop/workspace.cjs');
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'markdeck-close-gui-'))),data=path.join(root,'data');
const oldFile=path.join(root,'旧文件.md'),currentFile=path.join(root,'当前文件.md'),copy=path.join(root,'恢复副本.md');
await fs.writeFile(oldFile,'# 旧文件\n\n旧正文');await fs.writeFile(currentFile,'# 当前文件\n\n当前正文');
const seed=new Workspace(data);const oldId=seed.open(oldFile).active;seed.open(currentFile);
const state=seed.snapshot();state.docs.find(d=>d.id===oldId).body+=' 未写回修改';
await fs.rename(oldFile,oldFile+'.moved');seed.save(state);
let app,page;const errors=[];
async function launch(){
  app=await electron.launch({executablePath:process.env.YUNJIAN_EXECUTABLE||require('electron'),args:['.'],env:{...process.env,YUNJIAN_DATA_DIR:data}});
  page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  await page.getByRole('textbox',{name:'文档正文'}).waitFor();
  if(process.env.YUNJIAN_EXECUTABLE)assert.equal(await app.evaluate(({app})=>app.isPackaged),true);
}
async function choose(response,save){
  await app.evaluate(({dialog},{response,save})=>{
    globalThis.closeMessages=[];
    dialog.showMessageBox=async(_window,options)=>{globalThis.closeMessages.push(options);return {response:options.type==='error'?0:response};};
    dialog.showSaveDialog=async()=>save||{canceled:true};
  },{response,save});
}
async function requestClose(){const win=await app.browserWindow(page);await win.evaluate(window=>window.close());}
async function waitForDialog(){
  for(let i=0;i<100;i++){const messages=await app.evaluate(()=>globalThis.closeMessages);if(messages?.length)return messages;await new Promise(resolve=>setTimeout(resolve,30));}
  throw new Error('Close dialog was not shown');
}
async function closed(){await Promise.all([page.waitForEvent('close'),requestClose()]);await app.close();app=null;}
async function editable(){await page.waitForFunction(()=>!document.body.inert);}
try{
  await launch();await page.keyboard.press('Meta+s');
  await page.waitForFunction(()=>document.querySelector('#toast')?.textContent==='文档已保存');
  await choose(0);
  // Keep the native decision pending: editor/menu changes and repeated closes
  // must not mutate the saved snapshot or create overlapping prompts.
  await app.evaluate(({dialog})=>{dialog.showMessageBox=async(_window,options)=>{globalThis.closeMessages.push(options);return new Promise(resolve=>{globalThis.resolveClose=resolve;});};});
  await requestClose();const [message]=await waitForDialog();
  assert.match(message.detail,/旧文件/);assert.match(message.detail,/移动或删除/);assert.ok(message.buttons.includes('保存副本并关闭'));
  assert.equal(await page.evaluate(()=>document.body.inert),true);
  await requestClose();await app.evaluate(({Menu})=>Menu.getApplicationMenu().items.find(item=>item.label==='文件').submenu.items.find(item=>item.label==='新建文档').click());
  assert.equal((await app.evaluate(()=>globalThis.closeMessages)).length,1);
  assert.equal((await page.evaluate(()=>window.desktop.load())).state.docs.length,2);
  await app.evaluate(()=>globalThis.resolveClose({response:0}));await editable();
  assert.equal(await page.locator('#title').inputValue(),'当前文件');
  await choose(1);await closed();
  const kept=JSON.parse(await fs.readFile(path.join(data,'workspace.json'),'utf8')).docs.find(d=>d.id===oldId);
  assert.ok(kept.acknowledgedDraft);assert.match(kept.body,/未写回修改/);

  await launch();await choose(0);const quietApp=app;
  await Promise.all([page.waitForEvent('close'),requestClose()]);assert.equal((await quietApp.evaluate(()=>globalThis.closeMessages)).length,0);
  await app.close();app=null;
  console.log('PASS: named background file, frozen close decision, no duplicate prompts, acknowledgment survives relaunch and unchanged drafts close quietly.');

  await launch();
  if(await page.locator('.sidebar').evaluate(el=>el.getBoundingClientRect().x<0))await page.getByRole('button',{name:'切换导航',exact:true}).click();
  await page.getByRole('button',{name:'旧文件',exact:true}).click();
  await page.getByRole('textbox',{name:'文档正文'}).locator('p').last().click();await page.keyboard.press('End');await page.keyboard.insertText(' 再次编辑');
  await page.waitForFunction(()=>document.querySelector('#save-state').textContent.includes('文件未写回'));
  await choose(2,{canceled:true});await requestClose();await waitForDialog();await editable();assert.equal(page.isClosed(),false);
  assert.match(await page.getByRole('textbox',{name:'文档正文'}).textContent(),/再次编辑/);
  const readonly=path.join(root,'只读目录');await fs.mkdir(readonly);await fs.chmod(readonly,0o500);
  await choose(2,{canceled:false,filePath:path.join(readonly,'副本.md')});await requestClose();await waitForDialog();await editable();
  const messages=await app.evaluate(()=>globalThis.closeMessages);assert.equal(messages[1].message,'副本保存未完成');assert.equal(page.isClosed(),false);
  await fs.chmod(readonly,0o700);
  await choose(2,{canceled:false,filePath:copy});await closed();
  assert.match(await fs.readFile(copy,'utf8'),/未写回修改.*再次编辑/);assert.equal(await fs.readFile(oldFile+'.moved','utf8'),'# 旧文件\n\n旧正文');
  await assert.rejects(fs.stat(oldFile),{code:'ENOENT'});
  await launch();await page.waitForFunction(copy=>document.querySelector('#save-state')?.title===copy,copy);
  await page.screenshot({path:path.join(root,'saved-copy.png')});assert.match(await page.getByRole('textbox',{name:'文档正文'}).textContent(),/再次编辑/);
  assert.deepEqual(errors,[]);
  console.log('PASS: new edits prompt again, save-dialog cancel and real write failure stay open, copy saves from close and survives relaunch. Evidence:',root);
}finally{
  await fs.chmod(path.join(root,'只读目录'),0o700).catch(()=>{});
  if(app){await choose(1).catch(()=>{});await app.close();}
}
