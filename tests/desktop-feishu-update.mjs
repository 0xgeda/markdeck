import {_electron as electron} from 'playwright';
import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),root=await fs.mkdtemp(path.join(os.tmpdir(),'markdeck-feishu-update-gui-'));
const bin=path.join(root,'bin'),remoteFile=path.join(root,'remote.json'),file=path.join(root,'更新测试.md');await fs.mkdir(bin);
const source='# 本地文档\n\n这是**更新后的正文**。\n\n![本地图片](photo.png)\n';
await fs.writeFile(file,source);await fs.writeFile(path.join(root,'other.md'),'# 另一份文档\n\n不能自动更新上一个目标。\n');
await fs.writeFile(path.join(root,'photo.png'),Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=','base64'));
await fs.writeFile(remoteFile,JSON.stringify({revision:1,writes:0,creates:0,content:'<title id="DocxTarget">团队文档</title><p>飞书旧正文</p>'}));
await fs.writeFile(path.join(bin,'lark-cli'),`#!/usr/bin/env node
const fs=require('node:fs'),path=require('node:path'),args=process.argv.slice(2),file=process.env.MARKDECK_FAKE_FEISHU_STATE;
const state=JSON.parse(fs.readFileSync(file,'utf8')),arg=name=>args[args.indexOf(name)+1],out=data=>console.log(JSON.stringify(data));
if(args[0]==='auth')out({identities:{user:{available:true,userName:'测试账号',openId:'test'}}});
else if(args[1]==='+fetch')out({ok:true,data:{document:{document_id:'DocxTarget',revision_id:state.revision,content:state.content}}});
else if(args[1]==='+update'&&args.includes('--dry-run'))out({ok:true,dry_run:true});
else if(args[1]==='+update'){
 if(arg('--doc')!=='DocxTarget'||Number(arg('--revision-id'))!==state.revision){console.error(JSON.stringify({ok:false,error:{message:'revision conflict'}}));process.exit(1);}
 const content=fs.readFileSync(path.resolve(arg('--content').slice(1)),'utf8');
 for(const match of content.matchAll(/path="@(.+?)"/g))if(!fs.existsSync(path.resolve(match[1])))throw new Error('Missing uploaded image');
 state.writes++;state.revision++;state.content=content;fs.writeFileSync(file,JSON.stringify(state));
 out({ok:true,data:{result:state.partial?'partial_success':'success',document:{revision_id:state.revision},warnings:[]}});
}else if(args[1]==='+create'){state.creates++;fs.writeFileSync(file,JSON.stringify(state));out({ok:true,data:{document:{url:'https://test.feishu.cn/docx/New'},warnings:[]}});}
else throw new Error('Unexpected CLI call');
`,{mode:0o755});
const readRemote=async()=>JSON.parse(await fs.readFile(remoteFile,'utf8'));
const changeRemote=async patch=>fs.writeFile(remoteFile,JSON.stringify({...await readRemote(),...patch}));
let app;
try{
 app=await electron.launch({executablePath:process.env.YUNJIAN_EXECUTABLE||require('electron'),args:['.'],env:{...process.env,PATH:bin+path.delimiter+process.env.PATH,YUNJIAN_DATA_DIR:path.join(root,'data'),MARKDECK_FAKE_FEISHU_STATE:remoteFile}});
 const page=await app.firstWindow(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByRole('textbox',{name:'文档正文'}).waitFor();
 const openFile=async file=>{await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);await page.evaluate(()=>window.desktop.open());await page.reload();await page.getByRole('textbox',{name:'文档正文'}).waitFor();};
 await openFile(file);
 await page.getByRole('button',{name:'设置',exact:true}).click();await page.locator('[data-theme-choice="sage"]').click();await page.getByRole('checkbox',{name:'显示飞书上传按钮'}).check();await page.getByRole('button',{name:'关闭设置'}).click();
 const open=async()=>{await page.locator('[data-action="feishu"]').click();await page.getByText('已连接 · 测试账号。',{exact:false}).waitFor();};
 const close=()=>page.getByRole('button',{name:'关闭飞书窗口'}).click();
 const link='https://test.feishu.cn/wiki/WikiTarget',target=page.getByRole('textbox',{name:'飞书目标文档链接'}),preview=page.getByRole('button',{name:'读取目标',exact:true}),update=page.getByRole('button',{name:'覆盖更新',exact:true});
 await open();assert.equal((await readRemote()).creates,0);await page.getByRole('combobox',{name:'上传方式'}).selectOption('update');
 await target.fill('https://example.com/docx/Bad');await preview.click();await page.getByText('请粘贴飞书文档或知识库文档链接（docx / wiki）。',{exact:true}).waitFor();assert.equal(await update.isVisible(),false);
 await target.fill(link);await preview.click();await update.waitFor();assert.equal(await page.locator('[data-target-title]').textContent(),'团队文档');assert.equal((await readRemote()).writes,0);
 await target.fill(link+'?from=share');assert.equal(await update.isVisible(),false);await preview.click();await update.waitFor();
 await page.locator('.feishu-dialog').screenshot({path:path.join(root,'update-confirmation.png')});
 // Another editor changed the remote document after the preview.
 await changeRemote({revision:2});await update.click();await page.getByText('飞书文档已被修改，请重新读取目标后再确认更新。',{exact:true}).waitFor();assert.equal((await readRemote()).writes,0);assert.equal(await update.isVisible(),false);
 await preview.click();await update.waitFor();await update.click();await page.getByText('已更新飞书文档，原链接保持不变。',{exact:true}).waitFor();
 let remote=await readRemote();assert.equal(remote.writes,1);assert.equal(remote.creates,0);assert.ok(remote.content.startsWith('<title>团队文档</title>'));assert.match(remote.content,/<b>更新后的正文<\/b>/);assert.match(remote.content,/<img path="@\.\/image-0.png"/);
 assert.equal(await page.getByRole('link',{name:'在飞书打开'}).getAttribute('href'),link);assert.equal(await fs.readFile(file,'utf8'),source);
 const preferences=JSON.parse(await fs.readFile(path.join(root,'data','feishu.json'),'utf8'));assert.equal(JSON.parse(await fs.readFile(preferences.last.backupPath,'utf8')).response.data.document.revision_id,2);
 await close();
 // Remembered targets only read on opening; they never write without a fresh confirmation.
 await page.locator('[data-action="feishu"]').click();await update.waitFor();assert.equal(await target.inputValue(),link);assert.equal((await readRemote()).writes,1);await close();
 await openFile(path.join(root,'other.md'));await open();assert.equal(await page.getByRole('combobox',{name:'上传方式'}).inputValue(),'create');assert.equal((await readRemote()).writes,1);assert.equal((await readRemote()).creates,0);await close();
 await openFile(file);await page.locator('[data-action="feishu"]').click();await update.waitFor();assert.equal(await target.inputValue(),link);
 // Partial completion must not become a success or trigger a repeated write after reload.
 await changeRemote({partial:true});await update.click();await page.getByText('目标文档可能已部分或全部改变',{exact:false}).waitFor();assert.equal(await update.isVisible(),false);assert.equal((await readRemote()).writes,2);
 await close();await page.reload();await page.getByRole('textbox',{name:'文档正文'}).waitFor();await page.locator('[data-action="feishu"]').click();await update.waitFor();await page.getByText('上次操作结果尚未确认',{exact:false}).waitFor();assert.equal((await readRemote()).writes,2);assert.equal((await readRemote()).creates,0);
 assert.equal(await fs.readFile(file,'utf8'),source);assert.deepEqual(errors,[]);
 console.log('PASS: explicit target confirmation, input invalidation, Wiki resolution, conflict stop, images, unchanged source, per-document persistence, partial failure and no automatic writes. CLI stub. Evidence:',root);
}finally{if(app)await app.close();}
