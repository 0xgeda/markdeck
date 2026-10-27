// Optional source fixtures are read only; all edits use an isolated copy.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import MarkdownIt from 'markdown-it';
import {JSDOM} from 'jsdom';
const require=createRequire(import.meta.url),md=new MarkdownIt({html:true});
const root=await fs.mkdtemp(path.join(os.tmpdir(),'markdeck-html-tables-'));
const fixture=process.env.MARKDECK_HTML_TABLE_FIXTURE;
const original=fixture?await fs.readFile(fixture,'utf8'):'# 表格解析回归\n\n<a id="section"></a>\n\n[跳转](#item)\n\n| 编号 | 内容 |\n| --- | --- |\n| <a id="item"></a>A01 | **表格内容** |\n| A02 | 内容<a name="end"></a> |\n\n最后一段。\n';
const digest=value=>createHash('sha256').update(value).digest('hex'),originalHash=digest(original);
const file=path.join(root,'解析回归.md');await fs.writeFile(file,original);
function inspect(markdown){
  const dom=new JSDOM(md.render(markdown)),doc=dom.window.document;
  const result={tables:[...doc.querySelectorAll('table')].map(table=>[...table.querySelectorAll('th,td')].map(cell=>cell.textContent.replace(/\s/g,''))),anchors:[...doc.querySelectorAll('a[id],a[name]')].map(a=>a.id||a.name),links:[...doc.querySelectorAll('a[href]')].map(a=>a.getAttribute('href'))};
  dom.window.close();return result;
}
const expected=inspect(original),errors=[];
assert.ok(expected.tables.length&&expected.anchors.length,'fixture needs HTML anchors in tables');
let app;
async function launch(){
  app=await electron.launch({executablePath:process.env.YUNJIAN_EXECUTABLE||require('electron'),args:['.'],env:{...process.env,YUNJIAN_DATA_DIR:path.join(root,'data')}});
  if(process.env.YUNJIAN_EXECUTABLE)assert.equal(await app.evaluate(({app})=>app.isPackaged),true);
  const page=await app.firstWindow();page.setDefaultTimeout(30000);page.on('pageerror',error=>errors.push(error.stack||error.message));
  await page.getByRole('textbox',{name:'文档正文'}).waitFor();return page;
}
async function check(page){
  const actual=await page.getByRole('textbox',{name:'文档正文'}).evaluate(root=>({tables:[...root.querySelectorAll('table')].map(table=>[...table.querySelectorAll('th,td')].map(cell=>cell.textContent.replace(/\s/g,''))),anchors:[...root.querySelectorAll('a[id],a[name]')].map(a=>a.id||a.name)}));
  assert.equal(actual.tables.length,expected.tables.length,'table count');
  for(let i=0;i<expected.tables.length;i++)assert.ok(JSON.stringify(actual.tables[i])===JSON.stringify(expected.tables[i]),`table ${i+1} cell content changed`);
  assert.deepEqual(actual.anchors,expected.anchors,'jump targets');
}
try{
  let page=await launch();
  await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);
  if(await page.locator('.sidebar').evaluate(el=>el.getBoundingClientRect().x<0))await page.getByRole('button',{name:'切换导航',exact:true}).click();
  await page.getByRole('button',{name:'打开文档',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#title').value==='解析回归'&&document.querySelector('[aria-label="文档正文"] table'));
  await check(page);assert.equal(await fs.readFile(file,'utf8'),original);
  await page.screenshot({path:path.join(root,'opened.png')});
  const body=page.getByRole('textbox',{name:'文档正文'});
  await body.locator('td a[id],td a[name]').first().evaluate(el=>{
    el.closest('table').scrollIntoView({block:'start',behavior:'instant'});
    window.scrollBy({top:-140,behavior:'instant'});
  });
  await page.waitForFunction(()=>{
    const rect=document.querySelector('[aria-label="文档正文"] td a[id], [aria-label="文档正文"] td a[name]').closest('table').getBoundingClientRect();
    return rect.top>=0&&rect.top<innerHeight/2;
  });
  await page.screenshot({path:path.join(root,'anchor-table.png')});
  await page.locator('[data-action="presentation"]').click();
  await page.locator('[data-action="write"]').click();await check(page);
  assert.equal(await fs.readFile(file,'utf8'),original,'viewing must not rewrite source');
  // Edit outside tables so every table can still be compared to its source.
  const first=body.locator('h1,h2,h3,p').first();await first.click();await page.keyboard.press('End');await page.keyboard.insertText('【回归编辑】');
  await page.waitForFunction(()=>document.querySelector('#save-state').textContent==='已保存到文件');
  const saved=await fs.readFile(file,'utf8');assert.match(saved,/【回归编辑】/);
  const after=inspect(saved);assert.deepEqual(after.anchors,expected.anchors);assert.deepEqual(after.links,expected.links);
  for(let i=0;i<expected.tables.length;i++)assert.ok(JSON.stringify(after.tables[i])===JSON.stringify(expected.tables[i]),`saved table ${i+1} changed`);
  await app.close();app=null;page=await launch();await check(page);
  assert.match(await page.getByRole('textbox',{name:'文档正文'}).textContent(),/【回归编辑】/);
  assert.equal(await fs.readFile(file,'utf8'),saved);
  assert.deepEqual(errors,[]);
  console.log(`PASS: ${expected.tables.length} tables, ${expected.anchors.length} anchors; open, display, edit, save and restart; source untouched`);
}finally{
  if(app)await app.close();
  if(fixture)assert.equal(digest(await fs.readFile(fixture,'utf8')),originalHash,'read-only source was changed');
  console.log('Evidence:',root);
}
