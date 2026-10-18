// Actual Electron renderer / file / printer checks. IME uses Chromium's
// composition protocol, not an operating-system input method candidate window.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url),root=await fs.mkdtemp(path.join(os.tmpdir(),'markdeck-boundaries-'));
const errors=[],timings={};let app;
const file=path.join(root,'边界.md');
const code=Array.from({length:240},(_,i)=>`LINE_${String(i+1).padStart(3,'0')}: ${'long_token_'.repeat(12)} END_${String(i+1).padStart(3,'0')}`).join('\n');
const cells=Array.from({length:16},(_,i)=>`COL_${i+1}_END`);
const original='# 边界验收\n\n## 超长代码\n\n```text\n'+code+'\n```\n\n## 超宽表格\n\n| '+cells.join(' | ')+' |\n| '+cells.map(()=>'---').join(' | ')+' |\n| '+cells.map((_,i)=>`VALUE_${i+1}_END`).join(' | ')+' |\n\nBOUNDARY-END\n';
await fs.writeFile(file,original);
async function open(filename){await app.evaluate(({dialog},filename)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[filename]});},filename);await page.getByRole('button',{name:'打开',exact:true}).click();}
async function waitDisk(filename,predicate){for(let n=0;n<200;n++){try{const bytes=await fs.readFile(filename);if(predicate(bytes))return bytes;}catch{}await new Promise(r=>setTimeout(r,100));}assert.fail('Expected disk content not ready: '+filename);}
let page;
try{
 app=await electron.launch({executablePath:process.env.YUNJIAN_EXECUTABLE||require('electron'),args:['.'],env:{...process.env,YUNJIAN_DATA_DIR:path.join(root,'data')}});
 if(process.env.YUNJIAN_EXECUTABLE)assert.equal(await app.evaluate(({app})=>app.isPackaged),true);
 page=await app.firstWindow();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.stack||e.message));await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByRole('textbox',{name:'文档正文'}).waitFor();await open(file);
 await page.getByRole('textbox',{name:'文档正文'}).getByText('BOUNDARY-END',{exact:true}).waitFor();
 const pdf=path.join(root,'boundary.pdf');await app.evaluate(({dialog},filePath)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath});},pdf);
 await page.getByRole('button',{name:'设置',exact:true}).click();await page.locator('[data-action="export-pdf"]').click();await waitDisk(pdf,b=>b.length>100);
 const text=execFileSync('pdftotext',['-raw',pdf,'-'],{encoding:'utf8'});
 for(const marker of ['LINE_001','END_001','LINE_240','END_240','COL_16_END','VALUE_16_END','BOUNDARY-END'])assert.ok(text.replace(/\s/g,'').includes(marker),`PDF clips ${marker}`);
 assert.equal(await fs.readFile(file,'utf8'),original);
 console.log('PASS: 240-line code + 16-column table PDF retains first/last line, last column and end marker');
 const longFile=path.join(root,'长文档.md');
 const longBody='# 长文档验收\n\n'+Array.from({length:150},(_,i)=>`## 章节 ${i+1}\n\n${'中文测试内容与 English reference，验证保存和模式切换。'.repeat(35)}\n`).join('\n')+'\nLONG-END';
 await fs.writeFile(longFile,longBody);let start=performance.now();await open(longFile);
 await page.getByRole('textbox',{name:'文档正文'}).getByText('LONG-END',{exact:true}).waitFor();timings.openMs=Math.round(performance.now()-start);timings.bytes=Buffer.byteLength(longBody);
 assert.equal(await page.locator('#outline a').count(),151);
 start=performance.now();await page.locator('[data-action="logic"]').click();await page.locator('.logic-workspace').waitFor();await page.locator('[data-card-level]').selectOption('2');
 assert.equal(await page.locator('.logic-group:not(.logic-sticky)').count(),150);timings.organizeMs=Math.round(performance.now()-start);
 await page.locator('[data-action="presentation"]').click();await page.locator('.display-exit').waitFor();await page.locator('[data-arrange]').click();await page.locator('.show-plan-pane:not([inert])').waitFor();
 await page.locator('.show-plan-pane [data-start]').click();await page.locator('.chapter-show').waitFor();await page.keyboard.press('Escape');await page.locator('.chapter-show').waitFor({state:'detached'});await page.locator('[data-action="write"]').click();
 assert.equal(await fs.readFile(longFile,'utf8'),longBody,'mode switches must not change source');
 console.log('PASS: long-document outline, 150 canvas cards, chapter playback and source isolation',timings);
 const imeFile=path.join(root,'输入.md');await fs.writeFile(imeFile,'# 输入验收\n\n输入位置');await open(imeFile);
 const target=page.getByRole('textbox',{name:'文档正文'}).getByText('输入位置',{exact:true});await target.click();
 await target.evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);r.collapse(false);const s=getSelection();s.removeAllRanges();s.addRange(r);});
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Input.imeSetComposition',{text:'zhongwen',selectionStart:8,selectionEnd:8});
 await cdp.send('Input.imeSetComposition',{text:'中文输入',selectionStart:4,selectionEnd:4});
 await cdp.send('Input.insertText',{text:'中文输入'});
 await waitDisk(imeFile,b=>b.toString().includes('输入位置中文输入'));
 const ime=await fs.readFile(imeFile,'utf8');assert.equal(ime.match(/中文输入/g)?.length,1);assert.ok(!ime.includes('zhongwen'));
 assert.deepEqual(errors,[]);console.log('PASS: Chromium composition replaces preedit once and saves committed Chinese');
 await fs.writeFile(path.join(root,'timings.json'),JSON.stringify(timings,null,2));
}finally{if(app)await app.close();console.log('Evidence:',root);}
