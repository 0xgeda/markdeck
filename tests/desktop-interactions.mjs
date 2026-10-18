// Real Chromium pointer/wheel events; does not emulate a physical trackpad's
// momentum or macOS privacy prompts. All files belong to an isolated fixture.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),root=await fs.mkdtemp(path.join(os.tmpdir(),'markdeck-interactions-'));
const file=path.join(root,'交互.md'),data=path.join(root,'data');
const original='# 卡片一\n\n正文一\n\n# 卡片二\n\n正文二\n\n# 卡片三\n\n正文三\n';await fs.writeFile(file,original);
let app;const errors=[];
async function launch(){app=await electron.launch({executablePath:process.env.YUNJIAN_EXECUTABLE||require('electron'),args:['.'],env:{...process.env,YUNJIAN_DATA_DIR:data}});if(process.env.YUNJIAN_EXECUTABLE)assert.equal(await app.evaluate(({app})=>app.isPackaged),true);const page=await app.firstWindow();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.stack||e.message));await page.getByRole('textbox',{name:'文档正文'}).waitFor();return page;}
async function drag(page,from,to){await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:12});await page.mouse.up();}
const center=box=>({x:box.x+box.width/2,y:box.y+box.height/2});
try{
 let page=await launch();await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);await page.getByRole('button',{name:'打开',exact:true}).click();await page.getByRole('textbox',{name:'文档正文'}).locator('h1').first().waitFor();
 await page.locator('[data-action="logic"]').click();await page.locator('.logic-workspace').waitFor();
 const cards=page.locator('.logic-group'),first=cards.first();assert.equal(await cards.count(),3);
 const before=await first.evaluate(el=>({left:parseFloat(el.style.left),top:parseFloat(el.style.top)}));
 const grip=center(await first.locator('.logic-grip').boundingBox());await drag(page,grip,{x:grip.x+80,y:grip.y+100});
 const after=await first.evaluate(el=>({left:parseFloat(el.style.left),top:parseFloat(el.style.top)}));assert.ok(after.left>before.left+50&&after.top>before.top+70);
 const source=first.locator('[data-port="out"]'),target=cards.nth(1).locator('[data-port="in"]');
 await drag(page,center(await source.boundingBox()),center(await target.boundingBox()));await page.locator('.logic-edge').waitFor();
 await page.locator('[data-add-note]').click();await page.getByRole('textbox',{name:'便笺内容'}).fill('独立便笺：不能改正文');
 const viewport=page.locator('.logic-viewport');await viewport.hover();await page.keyboard.down('Control');await page.mouse.wheel(0,120);await page.keyboard.up('Control');
 await page.waitForFunction(()=>document.querySelector('.logic-zoom output').textContent!=='100%');
 await page.locator('[data-action="write"]').click();assert.equal(await fs.readFile(file,'utf8'),original);
 await page.locator('[data-action="logic"]').click();await page.locator('.logic-edge').waitFor();assert.equal(await page.getByRole('textbox',{name:'便笺内容'}).inputValue(),'独立便笺：不能改正文');
 assert.deepEqual(await page.locator('.logic-group').first().evaluate(el=>({left:parseFloat(el.style.left),top:parseFloat(el.style.top)})),after);
 await page.screenshot({path:path.join(root,'canvas.png'),animations:'disabled'});
 await page.locator('[data-action="write"]').click();await app.close();app=null;
 console.log('PASS: pointer drag, wire connection, wheel zoom, notes and positions survive mode switches without changing Markdown');
 // A real EACCES read in a temporary directory. Unlike TCC prompts, this is
 // deterministic and reversible without changing the user's privacy settings.
 const denied=path.join(root,'denied.md'),body='# 受限文件\n\n恢复副本';await fs.writeFile(denied,body);await fs.chmod(denied,0);
 await assert.rejects(fs.readFile(denied),{code:'EACCES'});
 await fs.writeFile(path.join(data,'workspace.json'),JSON.stringify({active:'denied',docs:[{id:'denied',title:'受限文件',body,updated:Date.now(),filePath:denied,diskHash:createHash('sha256').update(body).digest('hex'),bom:false,eol:'\n'}]}));
 page=await launch();await page.getByRole('textbox',{name:'文档正文'}).getByText('恢复副本',{exact:true}).waitFor();
 await page.getByRole('button',{name:'设置',exact:true}).click();await page.locator('#settings-dialog[open]').waitFor();await page.locator('[data-action="close-settings"]').click();
 assert.equal(await page.evaluate(async()=>{const result=await window.desktop.load();return result.state.docs[0].body;}),body);
 await app.close();app=null;await fs.chmod(denied,0o600);assert.equal(await fs.readFile(denied,'utf8'),body);
 assert.deepEqual(errors,[]);console.log('PASS: packaged startup with actual unreadable file remains responsive and retains saved body');
}finally{await fs.chmod(path.join(root,'denied.md'),0o600).catch(()=>{});if(app)await app.close();console.log('Evidence:',root);}
