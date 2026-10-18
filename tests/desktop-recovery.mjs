// Real filesystem permission failures and SIGKILL of this test's isolated app.
// Crash recovery starts only after the UI and workspace file confirm durability.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),root=await fs.mkdtemp(path.join(os.tmpdir(),'markdeck-recovery-'));
const data=path.join(root,'data'),folder=path.join(root,'原目录'),moved=path.join(root,'移动后目录'),file=path.join(folder,'正文.md');
await fs.mkdir(folder);const original='# 保存恢复\n\nRECOVERY';await fs.writeFile(file,original);
let app,page;const errors=[];let text='RECOVERY';
async function launch(){
 app=await electron.launch({executablePath:process.env.YUNJIAN_EXECUTABLE||require('electron'),args:['.'],env:{...process.env,YUNJIAN_DATA_DIR:data}});
 if(process.env.YUNJIAN_EXECUTABLE)assert.equal(await app.evaluate(({app})=>app.isPackaged),true);
 page=await app.firstWindow();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.stack||e.message));await page.getByRole('textbox',{name:'文档正文'}).waitFor();
}
async function append(suffix){const target=page.getByRole('textbox',{name:'文档正文'}).getByText(text,{exact:true});await target.click();await target.evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);r.collapse(false);const s=getSelection();s.removeAllRanges();s.addRange(r);});await page.keyboard.insertText(suffix);text+=suffix;}
async function status(value){await page.waitForFunction(value=>document.querySelector('#save-state').textContent.includes(value),value);}
async function cancelClose(expected){
 await app.evaluate(({dialog})=>{globalThis.testCloseMessage=null;dialog.showMessageBox=async(_window,options)=>{globalThis.testCloseMessage=options;return {response:0};};});
 const win=await app.browserWindow(page);await win.evaluate(w=>w.close());
 for(let i=0;i<100;i++){if(await app.evaluate(()=>globalThis.testCloseMessage))break;await new Promise(r=>setTimeout(r,50));}
 const message=await app.evaluate(()=>globalThis.testCloseMessage);assert.equal(message.message,expected);assert.equal(message.buttons[0],'返回文档');assert.equal(page.isClosed(),false);await page.getByRole('textbox',{name:'文档正文'}).getByText(text,{exact:true}).waitFor();
}
try{
 await launch();await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);await page.getByRole('button',{name:'打开',exact:true}).click();await page.getByRole('textbox',{name:'文档正文'}).getByText(text,{exact:true}).waitFor();
 await fs.chmod(file,0o444);await assert.rejects(fs.access(file,fs.constants.W_OK),{code:'EACCES'});
 await append(' 只读草稿');await status('文件未写回');assert.equal(await fs.readFile(file,'utf8'),original);
 assert.ok(JSON.parse(await fs.readFile(path.join(data,'workspace.json'),'utf8')).docs.some(d=>d.body.includes(text)));
 await cancelClose('有修改尚未写回原文件');await page.screenshot({path:path.join(root,'read-only.png')});
 await fs.chmod(file,0o600);await app.evaluate(({Menu})=>Menu.getApplicationMenu().items.find(item=>item.label==='文件').submenu.items.find(item=>item.label==='保存').click());await status('已保存到文件');const first=await fs.readFile(file,'utf8');assert.ok(first.includes(text));
 console.log('PASS: read-only file unchanged, durable draft, close cancellation, permission restoration and save retry');
 await fs.chmod(data,0o500);await assert.rejects(fs.access(data,fs.constants.W_OK),{code:'EACCES'});
 await append(' 草稿目录不可写');await status('保存失败');assert.equal(await fs.readFile(file,'utf8'),first);
 await cancelClose('保存未完成');await fs.chmod(data,0o700);await app.evaluate(({Menu})=>Menu.getApplicationMenu().items.find(item=>item.label==='文件').submenu.items.find(item=>item.label==='保存').click());await status('已保存到文件');const second=await fs.readFile(file,'utf8');assert.ok(second.includes(text));
 console.log('PASS: failed workspace persistence does not write external file; live edits remain and retry succeeds');
 await fs.rename(folder,moved);await append(' 移动后恢复');await status('文件未写回');assert.equal(await fs.readFile(path.join(moved,'正文.md'),'utf8'),second);
 assert.ok(JSON.parse(await fs.readFile(path.join(data,'workspace.json'),'utf8')).docs.some(d=>d.body.includes(text)));
 const proc=app.process();const exited=new Promise(resolve=>proc.once('exit',resolve));proc.kill('SIGKILL');await exited;app=null;
 await launch();await page.getByRole('textbox',{name:'文档正文'}).getByText(text,{exact:true}).waitFor();await status('文件未写回');
 const copy=path.join(root,'恢复副本.md');await app.evaluate(({dialog},filePath)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath});},copy);
 await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('button',{name:'另存为…',exact:true}).click();await status('已保存到文件');
 assert.ok((await fs.readFile(copy,'utf8')).includes(text));assert.equal(await fs.readFile(path.join(moved,'正文.md'),'utf8'),second);await assert.rejects(fs.stat(folder),{code:'ENOENT'});
 await app.close();app=null;await launch();await page.getByRole('textbox',{name:'文档正文'}).getByText(text,{exact:true}).waitFor();assert.deepEqual(errors,[]);
 console.log('PASS: moved directory preserved, SIGKILL after durable draft, relaunch recovery, save-as and second relaunch');
}catch(error){console.log('Failure state:',await page.evaluate(()=>({text:document.querySelector('#save-state')?.textContent,title:document.querySelector('#save-state')?.title,active:document.activeElement?.outerHTML.slice(0,180)})).catch(()=>null));throw error;}finally{
 await fs.chmod(data,0o700).catch(()=>{});await fs.chmod(file,0o600).catch(()=>{});
 if(app){await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:1});}).catch(()=>{});await app.close();}
 console.log('Evidence:',root);
}
