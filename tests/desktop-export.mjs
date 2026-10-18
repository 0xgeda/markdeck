// Real packaged/source Electron: nine skins, HTML and Chromium PDF export.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const themes=JSON.parse(await fs.readFile('desktop/themes.json','utf8'));
const root=await fs.mkdtemp(path.join(os.tmpdir(),'markdeck-export-'));
const file=path.join(root,'验收.md');
const markdown='# 导出验收\n\n'+Array.from({length:12},(_,i)=>`## 第 ${i+1} 章\n\n中文与 English 正文，检查 PDF 分页及内容完整性。\n\n| 项目 | 数量 | 说明 |\n| --- | --- | --- |\n| 示例 ${i+1} | 20 | 本地保存 |\n\n\`\`\`js\nconst chapter = ${i+1};\nconsole.log(chapter);\n\`\`\`\n`).join('\n')+'\n文档结束标记 END-OF-DOCUMENT\n';
await fs.writeFile(file,markdown);let app;const errors=[];
async function exists(filename){for(let n=0;n<150;n++){try{if((await fs.stat(filename)).size>0)return;}catch{}await new Promise(r=>setTimeout(r,100));}assert.fail('Export not written: '+filename);}
try{
 app=await electron.launch({executablePath:process.env.YUNJIAN_EXECUTABLE||require('electron'),args:['.'],env:{...process.env,YUNJIAN_DATA_DIR:path.join(root,'data')}});
 if(process.env.YUNJIAN_EXECUTABLE)assert.equal(await app.evaluate(({app})=>app.isPackaged),true);
 const page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.stack||e.message));await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByRole('textbox',{name:'文档正文'}).waitFor();
 await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);
 await page.getByRole('button',{name:'打开',exact:true}).click();await page.getByRole('textbox',{name:'文档正文'}).locator('h1').waitFor();
 for(const theme of Object.keys(themes)){
  await page.getByRole('button',{name:'设置',exact:true}).click();await page.locator(`[data-theme-choice="${theme}"]`).click();await page.locator('[data-action="close-settings"]').click();
  assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'document overflows in '+theme);
  await page.screenshot({animations:'disabled',path:path.join(root,`theme-${theme}.png`)});
 }
 // Export from a dark skin too: print CSS must keep output readable on paper.
 await page.getByRole('button',{name:'设置',exact:true}).click();await page.locator('[data-theme-choice="midnight"]').click();await page.locator('[data-action="close-settings"]').click();
 for(const format of ['html','pdf']){
  const output=path.join(root,'output.'+format);
  await app.evaluate(({dialog},filePath)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath});},output);
  await page.getByRole('button',{name:'设置',exact:true}).click();await page.locator(`[data-action="export-${format}"]`).click();await exists(output);
 }
 const html=await fs.readFile(path.join(root,'output.html'),'utf8');assert.match(html,/END-OF-DOCUMENT/);assert.match(html,/data-theme="midnight"/);
 const pdf=await fs.readFile(path.join(root,'output.pdf'));assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
 const info=execFileSync('pdfinfo',[path.join(root,'output.pdf')],{encoding:'utf8'});const pages=Number(info.match(/Pages:\s+(\d+)/)?.[1]);assert.ok(pages>1);assert.match(info,/A4/);
 const raster=path.join(root,'pdf-first');execFileSync('pdftoppm',['-f','1','-l','1','-scale-to','1400','-png','-singlefile',path.join(root,'output.pdf'),raster]);
 const paper=await app.evaluate(({nativeImage},filename)=>Array.from(nativeImage.createFromPath(filename).toBitmap().subarray(0,3)),raster+'.png');
 assert.ok(paper.every(channel=>channel>=250),'PDF paper margin must stay white when exporting a dark skin');
 const text=execFileSync('pdftotext',[path.join(root,'output.pdf'),'-'],{encoding:'utf8'});assert.match(text,/END-OF-DOCUMENT/);assert.match(text,/第 12 章/);
 assert.equal(await fs.readFile(file,'utf8'),markdown,'themes/export must not change source Markdown');
 assert.deepEqual(errors,[]);console.log(`PASS: nine skins, source unchanged, standalone HTML and real A4 PDF (${pages} pages; final chapter and end marker present)`);
}finally{if(app)await app.close();console.log('Evidence:',root);}
