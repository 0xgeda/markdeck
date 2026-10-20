// Deterministic generated JPEGs, not real photographs. No user files/clipboard.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {scanImages} from '../src/image-scan.js';
const require=createRequire(import.meta.url),root=await fs.mkdtemp(path.join(os.tmpdir(),'markdeck-image-stress-'));
const folder=path.join(root,'配图 空格'),file=path.join(root,'多图.md'),short=path.join(root,'短文.md');
await fs.mkdir(folder);await fs.writeFile(short,'# 短文\n\nSHORT-END');
const errors=[],samples=[],hashes=[];let app,page;const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function launch(){
 app=await electron.launch({executablePath:process.env.YUNJIAN_EXECUTABLE||require('electron'),args:['.'],env:{...process.env,YUNJIAN_DATA_DIR:path.join(root,'data')}});
 if(process.env.YUNJIAN_EXECUTABLE)assert.equal(await app.evaluate(({app})=>app.isPackaged),true);
 page=await app.firstWindow();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.stack||e.message));await page.getByRole('textbox',{name:'文档正文'}).waitFor();
}
async function open(filename,marker){await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},filename);if(await page.locator('.sidebar').evaluate(el=>el.getBoundingClientRect().x<0))await page.getByRole('button',{name:'切换导航',exact:true}).click();await page.getByRole('button',{name:'打开文档',exact:true}).click();if(await page.locator('body').evaluate(el=>el.classList.contains('sidebar-open')))await page.getByRole('button',{name:'关闭导航',exact:true}).click();await page.getByRole('textbox',{name:'文档正文'}).getByText(marker,{exact:true}).waitFor();}
async function checkImages(){
 const images=page.getByRole('textbox',{name:'文档正文'}).locator('img[alt^="图 "]');assert.equal(await images.count(),24);
 for(let i=0;i<24;i++){await images.nth(i).scrollIntoViewIfNeeded();await page.waitForFunction(i=>document.querySelectorAll('[role="textbox"][aria-label="文档正文"] img[alt^="图 "]')[i]?.getAttribute('src')?.startsWith('data:'),i);await images.nth(i).evaluate(img=>img.decode());assert.deepEqual(await images.nth(i).evaluate(img=>[img.naturalWidth,img.naturalHeight]),[1024,768]);}
 assert.equal(await page.locator('.missing-images').count(),0);
}
async function diskContains(text){for(let n=0;n<100;n++){if((await fs.readFile(file,'utf8')).includes(text))return;await delay(100);}assert.fail('save not completed: '+text);}
try{
 await launch();let totalBytes=0;
 for(let index=0;index<12;index++){
  const base64=await app.evaluate(({nativeImage},seed)=>{
   const pixels=Buffer.alloc(1024*768*4);let state=seed+1;
   for(let i=0;i<pixels.length;i+=4){state=(Math.imul(state,1664525)+1013904223)>>>0;pixels[i]=state&255;pixels[i+1]=(state>>>8)&255;pixels[i+2]=(state>>>16)&255;pixels[i+3]=255;}
   return nativeImage.createFromBitmap(pixels,{width:1024,height:768}).toJPEG(90).toString('base64');
  },index);
  const bytes=Buffer.from(base64,'base64');totalBytes+=bytes.length;const filename=path.join(folder,`${index}.jpg`);await fs.writeFile(filename,bytes);hashes.push([filename,createHash('sha256').update(bytes).digest('hex')]);
 }
 // Encoded data URLs exceed the renderer's 16 MiB approximate string cache.
 assert.ok(totalBytes*8/3>16*1024*1024);
 const original='# 多图持续验收\n\n'+Array.from({length:24},(_,i)=>`## 图组 ${i+1}\n\n![图 ${i+1}](${encodeURI('配图 空格')}/${i%12}.jpg)\n\n- 一级 ${i+1}\n  - 子项 ${i+1}\n\n| 项目 | 数值 |\n| --- | --- |\n| 记录 ${i+1} | ${i+1} |\n\n\`\`\`md\n![代码示例](do-not-touch.png)\n\`\`\`\n`).join('\n')+'\nEDIT-END';
 await fs.writeFile(file,original);await open(file,'EDIT-END');await checkImages();
 const cdp=await page.context().newCDPSession(page);
 async function sample(stage){await delay(3000);await cdp.send('HeapProfiler.collectGarbage');const sample={stage,heap:await cdp.send('Runtime.getHeapUsage'),dom:await cdp.send('Memory.getDOMCounters')};samples.push(sample);console.log(JSON.stringify(sample));}
 await sample('loaded');
 // First click on a distant image must not refocus the old caret near the top.
 const last=page.getByRole('textbox',{name:'文档正文'}).locator('img[alt="图 24"]');
 await last.evaluate(img=>img.scrollIntoView({block:'end',behavior:'instant'}));
 const oldScroll=await page.evaluate(()=>scrollY);await last.click();await delay(500);
 assert.ok(Math.abs(await page.evaluate(()=>scrollY)-oldScroll)<50,'first image click jumped to the old text caret');
 const corner=await page.locator('.image-resize-handle.se').boundingBox();assert.ok(corner);
 const viewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight}));assert.ok(corner.x+corner.width/2<viewport.width&&corner.y+corner.height/2<viewport.height,'drag corner must be inside viewport');
 await page.mouse.move(corner.x+corner.width/2,corner.y+corner.height/2);await page.mouse.down();await page.mouse.move(corner.x-80,corner.y-60,{steps:10});await page.mouse.up();await diskContains('data-size=');
 const dragSize=await last.getAttribute('data-size');assert.ok(dragSize&&parseFloat(dragSize)<100);
 const afterDrag=await fs.readFile(file,'utf8');
 await page.locator('[data-action="logic"]').click();await page.locator('.logic-workspace').waitFor();await page.locator('[data-action="presentation"]').click();await page.locator('.display-exit').waitFor();await page.locator('[data-action="write"]').click();assert.equal(await fs.readFile(file,'utf8'),afterDrag);
 const first=page.getByRole('textbox',{name:'文档正文'}).locator('img[alt="图 1"]').first();await first.click();await page.getByRole('toolbar',{name:'图片排版'}).getByRole('button',{name:'中图',exact:true}).click();await diskContains('data-size="50%"');
 async function checkLayout(){const body=page.getByRole('textbox',{name:'文档正文'});assert.equal(await body.locator('img[alt="图 1"]').getAttribute('data-size'),'50%');assert.equal(await body.locator('img[alt="图 12"]').getAttribute('data-size'),null);assert.equal(await body.locator('img[alt="图 24"]').getAttribute('data-size'),dragSize);}
 let paragraph='EDIT-END';
 for(let i=1;i<=30;i++){
  const target=page.getByRole('textbox',{name:'文档正文'}).getByText(paragraph,{exact:true});await target.click();await target.evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);r.collapse(false);const s=getSelection();s.removeAllRanges();s.addRange(r);});
  const text=` 编辑${i}`;await page.keyboard.insertText(text);paragraph+=text;await diskContains(paragraph);
  await page.locator('[data-action="logic"]').click();await page.locator('.logic-workspace').waitFor();await page.locator('[data-action="presentation"]').click();await page.locator('.display-exit').waitFor();await page.locator('[data-action="write"]').click();
  await open(short,'SHORT-END');await open(file,paragraph);
  if(i%10===0){await checkImages();await checkLayout();await sample(`round-${i}`);}await delay(1000);
 }
 const saved=await fs.readFile(file,'utf8');assert.equal(scanImages(saved,root).length,24);assert.match(scanImages(saved,root).find(image=>image.alt==='图 1').raw,/data-size="50%"/);assert.equal((saved.match(/!\[代码示例\]\(do-not-touch.png\)/g)||[]).length,24);
 assert.equal(await page.getByRole('textbox',{name:'文档正文'}).locator('table').count(),24);
 assert.equal(await page.getByRole('textbox',{name:'文档正文'}).locator('ul ul').count(),24);
 await page.screenshot({path:path.join(root,'edited.png')});await app.close();app=null;
 await launch();await page.getByRole('textbox',{name:'文档正文'}).getByText(paragraph,{exact:true}).waitFor();await checkImages();await checkLayout();assert.equal(await fs.readFile(file,'utf8'),saved);assert.equal(await page.getByRole('textbox',{name:'文档正文'}).locator('img[alt="图 24"]').getAttribute('data-size'),dragSize);
 for(const [filename,hash] of hashes)assert.equal(createHash('sha256').update(await fs.readFile(filename)).digest('hex'),hash);
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(root,'evidence.json'),JSON.stringify({totalBytes,uniqueImages:12,imageReferences:24,rounds:30,samples,note:'Generated high-entropy JPEGs; sampled heap forces GC. Not real photos or a day-long soak.'},null,2));
 console.log('PASS: 30 image-heavy edit/save/mode/document cycles, 24 decoded images, sizing, tables/lists/code examples, unchanged attachments and restart');
}finally{if(app)await app.close();console.log('Evidence:',root);}
