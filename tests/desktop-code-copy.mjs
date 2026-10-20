import {_electron as electron} from 'playwright';
import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),root=await fs.mkdtemp(path.join(os.tmpdir(),'markdeck-code-copy-'));
const file=path.join(root,'复制测试.md'),plain='A 组：中文名单，量贩零食与零食折扣；便利店与硬折扣；这是一段用于验证长行自动换行且不会被复制图标遮住的中文内容。\n\n  保留缩进\n\t保留制表符',js='const greeting = "你好";\n  console.log(greeting);';
const markdown='# 复制测试\n\n```text\n'+plain+'\n```\n\n```javascript\n'+js+'\n```\n';await fs.writeFile(file,markdown);
let app;
try{
 app=await electron.launch({executablePath:process.env.YUNJIAN_EXECUTABLE||require('electron'),args:['.'],env:{...process.env,YUNJIAN_DATA_DIR:path.join(root,'data')}});
 const page=await app.firstWindow();await page.getByRole('textbox',{name:'文档正文'}).waitFor();
 await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);
 await page.evaluate(()=>window.desktop.open());await page.evaluate(()=>localStorage.setItem('yun-jian-theme','sage'));await page.reload();await page.getByRole('textbox',{name:'文档正文'}).waitFor();
 const blocks=page.locator('.toastui-editor-ww-code-block');assert.equal(await blocks.count(),2);
 for(let i=0;i<2;i++){
  const block=blocks.nth(i),button=block.getByRole('button',{name:'复制块内文字'});await button.click();
  await page.waitForFunction(()=>!!document.querySelector('.markdeck-code-copy[data-copied]'));
  assert.equal(await app.evaluate(({clipboard})=>clipboard.readText()),[plain,js][i]);
  assert.equal(await block.evaluate(el=>getComputedStyle(el,'::after').display),'none');
  const clear=await block.evaluate(el=>{const range=document.createRange();range.selectNodeContents(el.querySelector('code'));const b=el.querySelector('button').getBoundingClientRect();return [...range.getClientRects()].every(r=>r.right<=b.left||r.left>=b.right||r.bottom<=b.top||r.top>=b.bottom);});assert.ok(clear,'copy button must not cover text');
  await page.waitForTimeout(1700);assert.equal(await button.getAttribute('data-copied'),null);
 }
 assert.equal(await fs.readFile(file,'utf8'),markdown,'copy must not modify Markdown');
 // Keyboard activation, live edits and persistence must use the current block.
 await blocks.nth(0).locator('code').click();await page.keyboard.press('End');await page.keyboard.type(' updated');
 const latest=await blocks.nth(0).locator('code').textContent();const button=blocks.nth(0).locator('button');await button.focus();await page.keyboard.press('Enter');
 await page.waitForTimeout(300);assert.equal(await app.evaluate(({clipboard})=>clipboard.readText()),latest);
 await page.waitForTimeout(700);const saved=await fs.readFile(file,'utf8');assert.match(saved,/```text/);assert.match(saved,/```javascript/);assert.ok(!saved.includes('复制块内文字'));assert.ok(saved.includes(' updated'));
 await page.screenshot({path:path.join(root,'copy.png')});console.log('PASS: plain text/code clipboard, whitespace, live edits, keyboard, feedback reset, no overlap, language markers preserved. Evidence:',root);
}finally{if(app)await app.close();}
