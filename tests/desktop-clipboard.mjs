// Native clipboard smoke test using Electron 44 ClipboardItems. Materialize
// every available format before writing, then restore it in finally.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const root=await fs.mkdtemp(path.join(os.tmpdir(),'markdeck-clipboard-'));
const file=path.join(root,'clipboard.md');await fs.writeFile(file,'# Clipboard\n\nPaste here');
let app,clipboardChanged=false;const errors=[];
try{
 app=await electron.launch({executablePath:process.env.YUNJIAN_EXECUTABLE||require('electron'),args:['.'],env:{...process.env,YUNJIAN_DATA_DIR:path.join(root,'data')}});
 if(process.env.YUNJIAN_EXECUTABLE)assert.equal(await app.evaluate(({app})=>app.isPackaged),true);
 const page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.stack||e.message));
 await page.getByRole('textbox',{name:'文档正文'}).waitFor();
 await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);
 if(await page.locator('.sidebar').evaluate(el=>el.getBoundingClientRect().x<0))await page.getByRole('button',{name:'切换导航',exact:true}).click();await page.getByRole('button',{name:'打开文档',exact:true}).click();if(await page.locator('body').evaluate(el=>el.classList.contains('sidebar-open')))await page.getByRole('button',{name:'关闭导航',exact:true}).click();
 const target=page.getByRole('textbox',{name:'文档正文'}).getByText('Paste here',{exact:true});await target.click();
 await target.evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);range.collapse(false);const sel=getSelection();sel.removeAllRanges();sel.addRange(range);});
 await page.waitForFunction(()=>getSelection()?.anchorNode?.textContent==='Paste here');
 await app.evaluate(async({clipboard,nativeImage,ClipboardItem})=>{
  const previous=await clipboard.read();
  const data=await Promise.all(previous.map(async item=>new ClipboardItem(Object.fromEntries(
   await Promise.all(item.types.map(async type=>[type,await item.getType(type)]))
  ))));
  const pixels=Buffer.alloc(80*40*4,255);
  const fixture=nativeImage.createFromBitmap(pixels,{width:80,height:40});
  globalThis.markdeckClipboardBackup={data,pixels:fixture.toBitmap().toString('base64')};
  await clipboard.write([new ClipboardItem({'image/png':new Blob([fixture.toPNG()],{type:'image/png'})})]);
 });
 clipboardChanged=true;
 await page.keyboard.press(process.platform==='darwin'?'Meta+v':'Control+v');
 let saved='';
 for(let n=0;n<100;n++){saved=await fs.readFile(file,'utf8');if(/clipboard\.assets\/[a-f0-9]+\.png/.test(saved))break;await new Promise(r=>setTimeout(r,100));}
 assert.match(saved,/Paste here.*!\[.*\]\(clipboard\.assets\/[a-f0-9]+\.png\)/);
 const imagePath=saved.match(/\]\((clipboard\.assets\/[a-f0-9]+\.png)\)/)[1];
 assert.ok((await fs.stat(path.join(root,imagePath))).size>0);
 assert.deepEqual(errors,[]);
 console.log('PASS: native system clipboard + keyboard paste -> caret position -> local attachment + Markdown');
}finally{
 if(clipboardChanged&&app){
  const restored=await app.evaluate(async({clipboard,nativeImage})=>{
   const backup=globalThis.markdeckClipboardBackup;
   const current=await clipboard.read();
   if(current.length!==1||!current[0].types.includes('image/png'))return false;
   const image=await current[0].getType('image/png');
   // Preserve any newer clipboard content the user copied during the test.
   if(nativeImage.createFromBuffer(Buffer.from(await image.arrayBuffer())).toBitmap().toString('base64')!==backup.pixels)return false;
   if(backup.data.length)await clipboard.write(backup.data);else clipboard.clear();
   delete globalThis.markdeckClipboardBackup;return true;
  });
  console.log(restored?'Original clipboard restored.':'Clipboard changed during test; newer content preserved.');
 }
 if(app)await app.close();
 console.log('Isolated fixture:',root);
}
