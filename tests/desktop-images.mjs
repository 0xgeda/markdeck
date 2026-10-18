// Real Electron renderer + IPC + filesystem; file pickers and remote image
// response are deterministic fixtures. Paste uses a ClipboardEvent with a File.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const root=await fs.mkdtemp(path.join(os.tmpdir(),'markdeck-images-'));
let png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5XcAAAAASUVORK5CYII=','base64');
const file=path.join(root,'图片验收.md'),external=path.join(root,'source');
await fs.mkdir(external);await fs.writeFile(path.join(root,'local.png'),png);await fs.writeFile(path.join(external,'missing.png'),png);
await fs.writeFile(file,'# 图片验收\n\n![本地图](local.png)\n\n![远程图](https://images.example.test/remote.png)\n\n![待修复](missing.png)\n\n## 粘贴区域\n\n在此粘贴\n');
const errors=[];let app;
async function launch(){
 app=await electron.launch({executablePath:process.env.YUNJIAN_EXECUTABLE||require('electron'),args:['.'],env:{...process.env,YUNJIAN_DATA_DIR:path.join(root,'data')}});
 if(process.env.YUNJIAN_EXECUTABLE)assert.equal(await app.evaluate(({app})=>app.isPackaged),true);
 const page=await app.firstWindow();page.setDefaultTimeout(15000);await page.emulateMedia({reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.stack||e.message));
 await page.route('https://images.example.test/**',route=>route.fulfill({contentType:'image/png',body:png}));
 await page.getByRole('textbox',{name:'文档正文'}).waitFor();return page;
}
async function diskMatches(pattern){
 for(let n=0;n<100;n++){if(pattern.test((await fs.readFile(file,'utf8')).replaceAll(encodeURI('图片验收.assets'),'图片验收.assets')))return;await new Promise(r=>setTimeout(r,100));}
 assert.match((await fs.readFile(file,'utf8')).replaceAll(encodeURI('图片验收.assets'),'图片验收.assets'),pattern);
}
try{
 let page=await launch();
 png=Buffer.from(await app.evaluate(({nativeImage})=>{
  const pixels=Buffer.alloc(240*120*4);
  for(let i=0;i<pixels.length;i+=4){pixels[i]=100;pixels[i+1]=150;pixels[i+2]=50;pixels[i+3]=255;}
  return nativeImage.createFromBitmap(pixels,{width:240,height:120}).toPNG().toString('base64');
 }),'base64');
 await fs.writeFile(path.join(root,'local.png'),png);await fs.writeFile(path.join(external,'missing.png'),png);
 await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);
 await page.getByRole('button',{name:'打开',exact:true}).click();
 const body=page.getByRole('textbox',{name:'文档正文'});
 await body.locator('h1').filter({hasText:'图片验收'}).waitFor();
 console.log('Opened image document');
 await page.screenshot({animations:'disabled',path:path.join(root,'opened.png')});
 await page.waitForFunction(()=>['本地图','远程图'].every(alt=>{const img=document.querySelector(`[role="textbox"][aria-label="文档正文"] img[alt="${alt}"]`);return img?.naturalWidth>0;}));
 const pasteTarget=body.getByText('在此粘贴',{exact:true});await pasteTarget.click();
 await pasteTarget.evaluate(element=>{
  const range=document.createRange();range.selectNodeContents(element);range.collapse(false);
  const selection=getSelection();selection.removeAllRanges();selection.addRange(range);
 });
 await page.waitForFunction(()=>getSelection()?.anchorNode?.textContent==='在此粘贴');
 await body.evaluate((element,base64)=>{
  const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
  const data=new DataTransfer();data.items.add(new File([bytes],'pasted.png',{type:'image/png'}));
  element.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:data}));
 },png.toString('base64'));
 await diskMatches(/图片验收\.assets\/[a-f0-9]+\.png/);
 assert.match((await fs.readFile(file,'utf8')).replaceAll(encodeURI('图片验收.assets'),'图片验收.assets'),/在此粘贴.*!\[pasted.png\]/);
 assert.ok((await fs.readdir(path.join(root,'图片验收.assets'))).length>0);
 console.log('PASS: local image hydration, remote image rendering, paste event -> attachment -> Markdown save');
 await page.getByRole('button',{name:'设置',exact:true}).click();await page.locator('[data-action="image-fix"]').click();
 const dialog=page.locator('.image-fix-dialog');await dialog.locator('tbody tr').first().waitFor();
 assert.equal(await dialog.locator('tbody tr').count(),4);
 await page.screenshot({animations:'disabled',path:path.join(root,'repair-before.png')});
 const window=await app.browserWindow(page);await window.evaluate(win=>{win.unmaximize();win.setSize(900,750);});
 await page.waitForFunction(()=>innerWidth<=900);
 await page.screenshot({animations:'disabled',path:path.join(root,'repair-narrow.png')});
 assert.ok(await dialog.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}),'repair dialog must fit narrow window');
 await window.evaluate(win=>win.maximize());
 await app.evaluate(({dialog},folder)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[folder]});},external);
 await dialog.locator('[data-locate]').click();
 await page.waitForFunction(()=>{const row=[...document.querySelectorAll('.image-fix-dialog tr[data-raw]')].find(r=>r.dataset.raw==='![待修复](missing.png)');return !!row&&row.querySelector('[data-cand]').textContent!=='—';});
 await dialog.locator('[data-select-all]').click();await dialog.locator('[data-apply]').click();
 await dialog.waitFor({state:'detached'});
 await diskMatches(/!\[待修复\]\(图片验收\.assets\//);
 assert.match(await fs.readFile(file,'utf8'),/https:\/\/images.example.test\/remote.png/);
 const localImage=page.getByRole('textbox',{name:'文档正文'}).locator('img[alt="本地图"]');
 await localImage.click();const initial=await localImage.boundingBox();
 const handle=page.locator('.image-resize-frame .image-resize-handle.se');await handle.waitFor();const corner=await handle.boundingBox();
 await page.mouse.move(corner.x+corner.width/2,corner.y+corner.height/2);await page.mouse.down();
 await page.mouse.move(corner.x+corner.width/2+80,corner.y+corner.height/2+40,{steps:10});await page.mouse.up();
 await diskMatches(/data-size=/);
 const resized=await localImage.boundingBox();assert.ok(Math.abs(resized.width-initial.width)>10,'drag must resize image');
 assert.ok(Math.abs(resized.width/resized.height-initial.width/initial.height)<0.03,'resize must preserve aspect ratio');
 console.log('PASS: real pointer resize persists image sizing and preserves aspect ratio');
 await page.screenshot({animations:'disabled',path:path.join(root,'write-images.png')});
 await page.locator('[data-action="logic"]').click();await page.locator('.logic-workspace').waitFor();await page.screenshot({animations:'disabled',path:path.join(root,'organize.png')});
 await page.locator('[data-action="presentation"]').click();await page.locator('.display-exit').waitFor();await page.screenshot({animations:'disabled',path:path.join(root,'display.png')});
 await page.locator('[data-action="write"]').click();
 await app.close();app=null;
 await fs.appendFile(file,'\n\n## 重启外部更新\n\n重启读取成功\n');
 page=await launch();await page.getByRole('textbox',{name:'文档正文'}).getByText('重启读取成功',{exact:true}).waitFor();
 await page.waitForFunction(()=>{const img=document.querySelector('[role="textbox"][aria-label="文档正文"] img[alt="待修复"]');return img?.naturalWidth>0;});
 assert.deepEqual(errors,[]);
 console.log('PASS: repair UI, mode switching, relaunch external refresh and attachment hydration');
}finally{
 if(app)await app.close();
 console.log('Evidence and isolated fixtures:',root);
}
