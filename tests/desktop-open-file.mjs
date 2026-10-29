import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {execFileSync} from 'node:child_process';

// Isolate the bundle identifier as well as app data: LaunchServices must not
// route these real Apple Events to the user's already-running Markdeck.
const sourceBundle=path.resolve(process.env.YUNJIAN_EXECUTABLE?path.join(process.env.YUNJIAN_EXECUTABLE,'../../..'):'release/Markdeck-darwin-arm64/Markdeck.app');
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'markdeck-open-file-')));
const bundle=path.join(root,'Markdeck File Open Test.app');
execFileSync('/usr/bin/ditto',[sourceBundle,bundle]);
const info=path.join(bundle,'Contents/Info.plist');
execFileSync('/usr/libexec/PlistBuddy',['-c',`Set :CFBundleIdentifier com.yunjian.markdown.open-file-test.${path.basename(root)}`,info]);
execFileSync('/usr/bin/codesign',['--force','--deep','--sign','-',bundle]);
const files=['中文 空格.md','第二份.markdown','第三份.txt'].map(name=>path.join(root,name));
const missing=path.join(root,'旧文档.md'),moved=path.join(root,'移动后的旧文档.md');
const originals=['# 系统打开一\n\n原始正文。\n','# 系统打开二\n\n第二份正文。\n','# 系统打开三\n\n第三份正文。\n'];
for(let i=0;i<files.length;i++)await fs.writeFile(files[i],originals[i]);
const server=net.createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;await new Promise(resolve=>server.close(resolve));
const openFiles=(...filenames)=>execFileSync('/usr/bin/open',['-a',bundle,...filenames]);
let browser,started=false;
const errors=[];
async function activeFile(page){const {state}=await page.evaluate(()=>window.desktop.load());return state.docs.find(doc=>doc.id===state.active)?.filePath;}
async function waitForFile(page,filename){await page.waitForFunction(filename=>document.querySelector('#save-state')?.title===filename,await fs.realpath(filename));}
try{
  execFileSync('/usr/bin/open',['-a',bundle,'--env',`YUNJIAN_DATA_DIR=${path.join(root,'data')}`,'--stderr',path.join(root,'stderr.log'),files[0],'--args',`--remote-debugging-port=${port}`]);started=true;
  for(let i=0;i<100;i++){
    try{browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`);break;}catch{await new Promise(resolve=>setTimeout(resolve,100));}
  }
  assert.ok(browser,'Cold-launched app must expose its test debugging port');
  const context=browser.contexts()[0];
  let page=context.pages()[0]||await context.waitForEvent('page');
  page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  await waitForFile(page,files[0]);
  assert.match(await page.getByRole('textbox',{name:'文档正文'}).textContent(),/系统打开一/);
  assert.equal(await fs.readFile(files[0],'utf8'),originals[0]);
  console.log('PASS: native cold launch opens Chinese/spaced filename without changing bytes.');

  // A system open waits for modal work to finish, then uses the normal save path.
  await page.getByRole('button',{name:'设置',exact:true}).click();
  openFiles(files[1]);await page.waitForTimeout(400);
  assert.equal(await activeFile(page),await fs.realpath(files[0]));
  await page.getByRole('button',{name:'关闭设置',exact:true}).click();
  await waitForFile(page,files[1]);
  openFiles(files[0],files[2]);await waitForFile(page,files[2]);
  let {state}=await page.evaluate(()=>window.desktop.load());
  for(const filename of files)assert.equal(state.docs.filter(doc=>doc.filePath===filename).length,1);
  for(let i=0;i<files.length;i++)assert.equal(await fs.readFile(files[i],'utf8'),originals[i]);
  console.log('PASS: warm open, multiple files, modal deferral, duplicate reuse, Markdown/text associations.');

  // Switching immediately after typing must flush the previous editor first.
  const body=page.getByRole('textbox',{name:'文档正文'});
  await body.locator('p').last().click();await page.keyboard.press('End');await page.keyboard.insertText('切换前保存');
  openFiles(files[0]);await waitForFile(page,files[0]);
  assert.match(await fs.readFile(files[2],'utf8'),/切换前保存/);

  // A missing, dirty document elsewhere in the list must not block Finder open.
  await fs.writeFile(missing,'# 旧文档\n\n旧文档正文。\n');
  openFiles(missing);await waitForFile(page,missing);
  await fs.rename(missing,moved);
  await page.getByRole('textbox',{name:'文档正文'}).locator('p').last().click();await page.keyboard.press('End');await page.keyboard.insertText('保留旧草稿');
  await page.waitForFunction(()=>document.querySelector('#save-state')?.textContent.includes('文件未写回'));
  if(await page.locator('.sidebar').evaluate(el=>el.getBoundingClientRect().x<0))await page.getByRole('button',{name:'切换导航',exact:true}).click();
  await page.getByRole('button',{name:'中文 空格',exact:true}).click();await waitForFile(page,files[0]);
  openFiles(files[1]);await waitForFile(page,files[1]);
  const persisted=JSON.parse(await fs.readFile(path.join(root,'data/workspace.json'),'utf8'));
  assert.match(persisted.docs.find(doc=>doc.filePath===missing).body,/保留旧草稿/);
  assert.equal(await fs.readFile(moved,'utf8'),'# 旧文档\n\n旧文档正文。\n');
  await fs.rename(moved,missing);openFiles(files[0]);await waitForFile(page,files[0]);
  assert.match(await fs.readFile(missing,'utf8'),/保留旧草稿/);
  console.log('PASS: unrelated missing file does not block native open; its draft survives and can be saved later.');

  // A failed write keeps the current document and its recoverable draft.
  await fs.chmod(files[0],0o444);
  await page.getByRole('textbox',{name:'文档正文'}).locator('p').last().click();await page.keyboard.press('End');await page.keyboard.insertText('只读草稿');
  await page.waitForFunction(()=>document.querySelector('#save-state')?.textContent.includes('文件未写回'));
  openFiles(files[1]);
  await page.waitForFunction(()=>document.querySelector('#toast')?.textContent.includes('当前文档尚未写回'));
  assert.equal(await activeFile(page),await fs.realpath(files[0]));
  assert.equal(await fs.readFile(files[0],'utf8'),originals[0]);
  await fs.chmod(files[0],0o644);
  await page.keyboard.press('Meta+s');
  await page.waitForFunction(()=>document.querySelector('#save-state')?.textContent==='已保存到文件');
  openFiles(files[1]);await waitForFile(page,files[1]);
  assert.match(await fs.readFile(files[0],'utf8'),/只读草稿/);
  console.log('PASS: save before switching, failed write preserves current content, retry succeeds.');

  const unsupported=path.join(root,'不支持.bin');await fs.writeFile(unsupported,'unsupported');openFiles(unsupported);
  await page.waitForFunction(()=>document.querySelector('#toast')?.textContent.includes('Markdown 或文本文件'));
  assert.equal(await activeFile(page),await fs.realpath(files[1]));
  assert.equal((await page.evaluate(()=>window.desktop.openSystemFile('relative.md'))).ok,false);

  // Closing the last window leaves a macOS app running; Finder must recreate it.
  await Promise.all([page.waitForEvent('close'),page.evaluate(()=>{void window.desktop.finishClose({ok:true});})]);
  const nextPage=context.waitForEvent('page');openFiles(files[2]);page=await nextPage;page.setDefaultTimeout(15000);
  await waitForFile(page,files[2]);
  await page.screenshot({path:path.join(root,'finder-open.png')});
  assert.deepEqual(errors,[]);
  console.log('PASS: invalid paths/types rejected; native open recreates a closed window. Evidence:',root);
}finally{
  await fs.rename(moved,missing).catch(error=>{if(error.code!=='ENOENT')throw error;});
  await fs.chmod(files[0],0o644);
  if(started)execFileSync('/usr/bin/osascript',['-e',`tell application "${bundle}" to quit`]);
  if(browser)await browser.close();
  execFileSync('/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister',['-u',bundle]);
  await fs.rm(bundle,{recursive:true,force:true});
}
