import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),root=await fs.mkdtemp(path.join(os.tmpdir(),'markdeck-drop-')),file=path.join(root,'中文 拖入.md'),original='# 拖入验收\n\n原文保持。';
await fs.writeFile(file,original);let app;
try{
 app=await electron.launch({executablePath:process.env.YUNJIAN_EXECUTABLE||require('electron'),args:['.'],env:{...process.env,YUNJIAN_DATA_DIR:path.join(root,'data')}});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);await page.getByRole('textbox',{name:'文档正文'}).waitFor();
 async function transfer(filename,type){
  await page.evaluate(()=>{const el=document.createElement('input');el.type='file';el.id='drop-test-input';el.hidden=true;document.body.append(el);});
  await page.locator('#drop-test-input').setInputFiles(filename);
  return page.evaluate(type=>{const input=document.querySelector('#drop-test-input'),dt=new DataTransfer();dt.items.add(input.files[0]);document.body.dispatchEvent(new DragEvent(type,{bubbles:true,cancelable:true,dataTransfer:dt}));input.remove();return !!document.querySelector('.document-drop-overlay');},type);
 }
 assert.equal(await transfer(file,'dragenter'),true);
 await page.screenshot({path:path.join(root,'overlay.png')});
 await transfer(file,'drop');await page.getByRole('textbox',{name:'文档正文'}).getByText('拖入验收',{exact:true}).waitFor();
 let state=await page.evaluate(()=>window.desktop.load());assert.equal(state.state.docs.find(d=>d.id===state.state.active).filePath,await fs.realpath(file));
 assert.equal(await page.locator('.document-drop-overlay').count(),0);
 const count=state.state.docs.length;await transfer(file,'drop');await page.waitForTimeout(300);state=await page.evaluate(()=>window.desktop.load());assert.equal(state.state.docs.length,count);
 assert.equal(await fs.readFile(file,'utf8'),original);
 const image=path.join(root,'image.png');await fs.writeFile(image,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=','base64'));assert.equal(await transfer(image,'dragenter'),false);
 assert.equal((await page.evaluate(()=>window.desktop.openDroppedFile('invented'))).ok,false);
 console.log('PASS: drag overlay, native File path via preload, same-file reuse, unchanged original, image drag excluded, invalid token rejected. Evidence:',root);
}finally{if(app)await app.close();}
