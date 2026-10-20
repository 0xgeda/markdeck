import { _electron as electron } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const root=await fs.mkdtemp(path.join(os.tmpdir(),'yunjian-desktop-'));
const file=path.join(root,'研究.md');await fs.writeFile(file,'# 项目研究\n\n原始正文\n\n| 品类 | 数量 |\n| --- | --- |\n| 面包 | 2 |');
let app;const errors=[];
async function launch(){const instance=await electron.launch({executablePath:process.env.YUNJIAN_EXECUTABLE||require('electron'),args:['.'],env:{...process.env,YUNJIAN_DATA_DIR:path.join(root,'data')}});if(process.env.YUNJIAN_EXECUTABLE)assert.equal(await instance.evaluate(({app})=>app.isPackaged),true);const page=await instance.firstWindow();page.on('pageerror',e=>errors.push(e.stack||e.message));await page.getByRole('textbox',{name:'文档正文'}).waitFor();return {instance,page};}
try{
  let result=await launch();app=result.instance;let page=result.page;
  assert.equal(await page.evaluate(()=>typeof window.require),'undefined');
  assert.equal(await page.locator('[data-action="edit"],.view-switch').count(),0);
  await app.evaluate(({dialog},filename)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[filename]});},file);
  if(await page.locator('.sidebar').evaluate(el=>el.getBoundingClientRect().x<0))await page.getByRole('button',{name:'切换导航',exact:true}).click();await page.getByRole('button',{name:'打开文档',exact:true}).click();if(await page.locator('body').evaluate(el=>el.classList.contains('sidebar-open')))await page.getByRole('button',{name:'关闭导航',exact:true}).click();
  let body=page.getByRole('textbox',{name:'文档正文'});await body.locator('h1').waitFor();
  await body.locator('p').first().click();await page.keyboard.press('End');await page.keyboard.insertText('自动落盘');
  await page.waitForFunction(()=>document.querySelector('#save-state').textContent==='已保存到文件');assert.match(await fs.readFile(file,'utf8'),/自动落盘/);
  await body.locator('td').first().click();await page.keyboard.press('End');await page.keyboard.insertText('修改');
  await page.waitForFunction(()=>document.querySelector('#save-state').textContent==='已保存到文件');assert.match(await fs.readFile(file,'utf8'),/面包修改/);
  const refreshed=(await fs.readFile(file,'utf8'))+'\n\n## Claude 更新\n\n外部最新内容';await fs.writeFile(file,refreshed);await body.getByText('外部最新内容',{exact:true}).waitFor();assert.match(await page.locator('#outline').textContent(),/Claude 更新/);assert.equal(await fs.readFile(file,'utf8'),refreshed);
  await page.screenshot({path:path.join(root,'desktop.png'),fullPage:true});
  await app.close();app=null;result=await launch();app=result.instance;page=result.page;body=page.getByRole('textbox',{name:'文档正文'});assert.match(await body.textContent(),/自动落盘/);
  await fs.writeFile(file,'# 外部修改');await body.locator('p').first().click();await page.keyboard.press('End');await page.keyboard.insertText('冲突草稿');
  await page.waitForFunction(()=>document.querySelector('#save-state').textContent.includes('文件未写回'));assert.equal(await fs.readFile(file,'utf8'),'# 外部修改');
  const copy=path.join(root,'副本.md');await app.evaluate(({dialog},filename)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:filename});},copy);await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('button',{name:'另存为…',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#save-state').textContent==='已保存到文件');assert.match(await fs.readFile(copy,'utf8'),/冲突草稿/);
  assert.deepEqual(errors,[]);console.log('PASS: automatic external updates, native app, direct editing, autosave to original file, table editing, relaunch, conflict protection, save-as');
}finally{if(app)await app.close();await fs.rm(root,{recursive:true,force:true});}
