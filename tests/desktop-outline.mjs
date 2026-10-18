import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),root=await fs.mkdtemp(path.join(os.tmpdir(),'markdeck-outline-'));
const titles=['发现 2 | 国内冷冻烘焙包装有两套语言：效率语言和感官语言','发现 3 | 用户夸复烤面包，最常见的说法是「外面怎样、里面怎样」','发现 4 | 「跟刚出炉一样」是用户最常说的评价，但也有人质疑实际口感与包装描述之间的差异','① ⭐ Pan&（パンド）冷冻面包 | 日本 | 冷冻成品面包，在家复烤','② ⭐ DiGiorno Rising Crust | 美国 | 冷冻披萨（生面饼，在家烤）'];
const original='# 目录验收\n\n'+Array.from({length:8},(_,i)=>`## 分类 ${i+1}\n\n`+titles.map(t=>`### ${t}\n\n正文内容。\n`).join('\n')).join('\n');
const file=path.join(root,'长目录.md');await fs.writeFile(file,original);let app;const errors=[];
try{
 app=await electron.launch({executablePath:process.env.YUNJIAN_EXECUTABLE||require('electron'),args:['.'],env:{...process.env,YUNJIAN_DATA_DIR:path.join(root,'data')}});
 if(process.env.YUNJIAN_EXECUTABLE)assert.equal(await app.evaluate(({app})=>app.isPackaged),true);
 const page=await app.firstWindow();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.stack||e.message));await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByRole('textbox',{name:'文档正文'}).waitFor();await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);await page.getByRole('button',{name:'打开',exact:true}).click();await page.getByRole('textbox',{name:'文档正文'}).getByText('目录验收',{exact:true}).waitFor();
 await page.getByRole('button',{name:'设置',exact:true}).click();await page.locator('#theme-select').selectOption('sage');await page.locator('[data-action="close-settings"]').click();
 const window=await app.browserWindow(page);
 for(const [width,height,zoom] of [[1440,900,1],[900,750,1],[1440,900,1.25]]){
  await window.evaluate((win,{width,height,zoom})=>{win.unmaximize();win.setSize(width,height);win.webContents.setZoomFactor(zoom);},{width,height,zoom});
  await page.locator('#outline a').nth(4).click();await page.waitForTimeout(200);
  const geometry=await page.locator('#outline').evaluate(nav=>{
   const rows=[...nav.querySelectorAll('.outline-entry:not([hidden])')];let previousBottom=-Infinity;
   return {scrolls:nav.scrollHeight>nav.clientHeight,rows:rows.map(row=>{const a=row.querySelector('a'),label=a.querySelector('.outline-label'),r=row.getBoundingClientRect(),ar=a.getBoundingClientRect(),lr=label.getBoundingClientRect(),style=getComputedStyle(label);const result={notOverlapping:r.top>=previousBottom-1,containsLink:r.bottom>=ar.bottom-1,lines:lr.height/parseFloat(style.lineHeight),padding:parseFloat(style.paddingTop)+parseFloat(style.paddingBottom),clipped:style.overflow==='hidden',title:a.title===label.textContent};previousBottom=r.bottom;return result;})};
  });
  assert.ok(geometry.scrolls);for(const row of geometry.rows){assert.ok(row.notOverlapping&&row.containsLink);assert.ok(row.lines<=2.01);assert.equal(row.padding,0);assert.ok(row.clipped&&row.title);}
  await page.mouse.move(800,50);await page.screenshot({path:path.join(root,`outline-${width}-${zoom}.png`)});
 }
 await page.locator('#outline-filter').fill('DiGiorno');assert.equal(await page.locator('#outline .outline-entry:not([hidden])').count(),8);await page.locator('#outline-filter').fill('');
 const chevron=page.locator('#outline [data-fold-outline-node="1"]');await chevron.click();assert.equal(await chevron.getAttribute('aria-expanded'),'false');await chevron.click();assert.equal(await chevron.getAttribute('aria-expanded'),'true');
 assert.equal(await fs.readFile(file,'utf8'),original);assert.deepEqual(errors,[]);console.log('PASS: 49 headings, two-line labels contained by rows, scrolling, active state, search and folding at 900/1440px and 125% zoom');
}finally{if(app)await app.close();console.log('Evidence:',root);}
