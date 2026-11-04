// Source fixtures are read only; edits and restarts use an isolated copy.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),root=await fs.mkdtemp(path.join(os.tmpdir(),'markdeck-editor-comments-'));
const fixture=process.env.MARKDECK_COMMENT_FIXTURE;
const original=fixture?await fs.readFile(fixture,'utf8'):'<!--\n研究备注\n---\n保留 -- 分隔符\n-->\n\n# 正文标题\n\n正文内容。\n\n<!---->\n\n## 最后一节\n\n结束正文。\n';
const digest=value=>createHash('sha256').update(value).digest('hex'),originalHash=digest(original);
const comments=body=>body.match(/<!--[\s\S]*?-->/g)||[],expectedComments=comments(original);
assert.ok(expectedComments.length,'fixture needs a comment');
const file=path.join(root,'注释解析回归.md'),other=path.join(root,'另一份文档.md');
await fs.writeFile(file,original);await fs.writeFile(other,'# 另一份文档\n\n正常文档内容。\n');
const errors=[];let app;
async function launch(){
 app=await electron.launch({executablePath:process.env.YUNJIAN_EXECUTABLE||require('electron'),args:['.'],env:{...process.env,YUNJIAN_DATA_DIR:path.join(root,'data')}});
 if(process.env.YUNJIAN_EXECUTABLE)assert.equal(await app.evaluate(({app})=>app.isPackaged),true);
 const page=await app.firstWindow();page.setDefaultTimeout(30000);page.on('pageerror',error=>errors.push(error.stack||error.message));
 await page.route(/^https?:/,route=>route.abort());await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByRole('textbox',{name:'文档正文'}).waitFor();return page;
}
async function open(page,file,title){
 await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);
 if(await page.locator('.sidebar').evaluate(el=>el.getBoundingClientRect().x<0))await page.getByRole('button',{name:'切换导航',exact:true}).click();
 await page.getByRole('button',{name:'打开文档',exact:true}).click();
 await page.waitForFunction(title=>document.querySelector('#title').value===title&&document.querySelector('[aria-label="文档正文"]'),title);
}
try{
 let page=await launch();
 for(let i=0;i<3;i++){
  await open(page,file,'注释解析回归');
  assert.equal(await page.locator('[data-html-comment]').count(),expectedComments.length);
  for(const [index,comment] of expectedComments.entries())assert.equal((await page.locator('[data-html-comment]').nth(index).textContent()).trimEnd(),comment);
  assert.equal(await fs.readFile(file,'utf8'),original,'opening must not rewrite Markdown');
  if(i<2)await open(page,other,'另一份文档');
 }
 await page.screenshot({path:path.join(root,'opened.png')});
 await page.locator('[data-action="presentation"]').click();await page.locator('[data-action="write"]').click();
 assert.equal(await fs.readFile(file,'utf8'),original);
 const heading=page.getByRole('textbox',{name:'文档正文'}).locator('h1,h2,h3').first();
 await heading.click();await page.keyboard.press('End');await page.keyboard.insertText('【编辑回归】');
 await page.waitForFunction(()=>document.querySelector('#save-state').textContent==='已保存到文件');
 const saved=await fs.readFile(file,'utf8');assert.match(saved,/【编辑回归】/);assert.deepEqual(comments(saved),expectedComments);
 await app.close();app=null;page=await launch();
 assert.match(await page.getByRole('textbox',{name:'文档正文'}).textContent(),/【编辑回归】/);
 assert.equal(await fs.readFile(file,'utf8'),saved);assert.deepEqual(errors,[]);
 console.log('PASS: comment document open, repeated document switches, display, edit, exact comment preservation and restart. Evidence:',root);
}finally{
 if(app)await app.close();
 if(fixture)assert.equal(digest(await fs.readFile(fixture,'utf8')),originalHash,'read-only fixture changed');
}
