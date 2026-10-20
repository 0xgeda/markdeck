// Real renderer + preload + main IPC. OS shell calls are recorded to avoid
// opening multiple Finder/browser windows during regression tests.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),root=await fs.mkdtemp(path.join(os.tmpdir(),'markdeck-navigation-'));
const file=path.join(root,'链接.md'),original='# 文档导航\n\n[参考资料](https://example.com/report?q=one&lang=zh#section)\n\n来源：https://example.org/plain-url\n\n```text\nhttps://example.net/code-only\n```\n\n修改位置';await fs.writeFile(file,original);
let app;const errors=[];
try{
 app=await electron.launch({executablePath:process.env.YUNJIAN_EXECUTABLE||require('electron'),args:['.'],env:{...process.env,YUNJIAN_DATA_DIR:path.join(root,'data')}});
 if(process.env.YUNJIAN_EXECUTABLE)assert.equal(await app.evaluate(({app})=>app.isPackaged),true);
 await app.evaluate(({shell,dialog},file)=>{globalThis.navigationCalls={folders:[],urls:[]};shell.showItemInFolder=filename=>globalThis.navigationCalls.folders.push(filename);shell.openExternal=async url=>{globalThis.navigationCalls.urls.push(url);};dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);
 const page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.stack||e.message));await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('textbox',{name:'文档正文'}).waitFor();
 assert.equal(await page.getByRole('button',{name:'在文件夹中显示',exact:true}).isDisabled(),true);
 if(await page.locator('.sidebar').evaluate(el=>el.getBoundingClientRect().x<0))await page.getByRole('button',{name:'切换导航',exact:true}).click();await page.getByRole('button',{name:'打开文档',exact:true}).click();if(await page.locator('body').evaluate(el=>el.classList.contains('sidebar-open')))await page.getByRole('button',{name:'关闭导航',exact:true}).click();await page.getByRole('textbox',{name:'文档正文'}).getByText('文档导航',{exact:true}).waitFor();
 await page.getByRole('button',{name:'在文件夹中显示',exact:true}).click();assert.deepEqual(await app.evaluate(()=>globalThis.navigationCalls.folders),[await fs.realpath(file)]);
 const body=page.getByRole('textbox',{name:'文档正文'}),named=body.getByRole('link',{name:'参考资料',exact:true}),plain=body.getByRole('link',{name:'https://example.org/plain-url',exact:true});
 assert.equal(await body.locator('a').count(),2);await named.click();await plain.click();
 await page.locator('[data-action="presentation"]').click();await page.locator('.display-exit').waitFor();await named.click();await page.locator('[data-action="write"]').click();
 assert.deepEqual(await app.evaluate(()=>globalThis.navigationCalls.urls),['https://example.com/report?q=one&lang=zh#section','https://example.org/plain-url','https://example.com/report?q=one&lang=zh#section']);assert.equal(page.url(),'yun-jian://app/index.html');
 await named.click({modifiers:['Alt']});assert.equal((await app.evaluate(()=>globalThis.navigationCalls.urls)).length,3);await page.keyboard.press('Escape');
 assert.equal(await fs.readFile(file,'utf8'),original,'navigation must not rewrite Markdown');
 for(const href of ['javascript:alert(1)','file:///etc/passwd','data:text/html,hi','not a URL'])assert.equal((await page.evaluate(href=>window.desktop.openExternal(href),href)).ok,false);
 assert.equal((await page.evaluate(()=>window.desktop.showInFolder('../arbitrary-path'))).ok,false);
 await fs.rename(file,path.join(root,'已移动.md'));await page.getByRole('button',{name:'在文件夹中显示',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('原文件已移动'));assert.equal((await app.evaluate(()=>globalThis.navigationCalls.folders)).length,1);
 await page.screenshot({path:path.join(root,'navigation.png')});assert.deepEqual(errors,[]);
 console.log('PASS: current file reveal, disabled draft, Markdown/plain URL clicks in writing/display, Alt editing, code exclusion, unsafe scheme rejection, missing-file feedback and unchanged source (OS shell recorded)');
}finally{if(app)await app.close();console.log('Evidence:',root);}
