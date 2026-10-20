// Observational RSS samples, not a leak proof or a platform-independent budget.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const root=await fs.mkdtemp(path.join(os.tmpdir(),'markdeck-memory-'));
const files=[path.join(root,'长文档.md'),path.join(root,'短文档.md')];
const bodies=['# 内存验收\n\n'+Array.from({length:150},(_,i)=>`## 章节 ${i+1}\n\n${'中文测试内容与 English reference，验证保存和模式切换。'.repeat(35)}\n`).join('\n')+'\nLONG-END','# 短文档\n\nSHORT-END'];
for(let i=0;i<files.length;i++)await fs.writeFile(files[i],bodies[i]);
let app;const errors=[],samples=[],cycles=[];
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const diagnose=process.env.MARKDECK_HEAP_DIAGNOSTICS==='1';
try{
 app=await electron.launch({executablePath:process.env.YUNJIAN_EXECUTABLE||require('electron'),args:['.'],env:{...process.env,YUNJIAN_DATA_DIR:path.join(root,'data')}});
 if(process.env.YUNJIAN_EXECUTABLE)assert.equal(await app.evaluate(({app})=>app.isPackaged),true);
 const page=await app.firstWindow();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.stack||e.message));
 const cdp=await page.context().newCDPSession(page);
 async function retained(stage){
  await delay(3000);await cdp.send('HeapProfiler.collectGarbage');
  await sample(stage+'-collected');
  console.log('DOM counters',stage,await cdp.send('Memory.getDOMCounters'));
  if(['baseline','cycle-60'].includes(stage)){
   const chunks=[];const receive=({chunk})=>chunks.push(chunk);
   cdp.on('HeapProfiler.addHeapSnapshotChunk',receive);
   try{await cdp.send('HeapProfiler.takeHeapSnapshot');await fs.writeFile(path.join(root,stage+'.heapsnapshot'),chunks.join(''));}
   finally{cdp.off('HeapProfiler.addHeapSnapshotChunk',receive);}
  }
 }
 await page.getByRole('textbox',{name:'文档正文'}).waitFor();
 async function sample(stage){
  const processes=await app.evaluate(({app})=>app.getAppMetrics().map(p=>({pid:p.pid,type:p.type})));
  for(const p of processes){try{p.rssKiB=Number(execFileSync('ps',['-o','rss=','-p',String(p.pid)],{encoding:'utf8'}).trim());}catch{p.rssKiB=null;}}
  const heap=await cdp.send('Runtime.getHeapUsage'),dom=await cdp.send('Memory.getDOMCounters');
  const result={stage,at:new Date().toISOString(),processes,sumRssMiB:Math.round(processes.reduce((n,p)=>n+(p.rssKiB||0),0)/1024),heap,dom};
  samples.push(result);console.log(JSON.stringify(result));
 }
 async function open(index){
  await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},files[index]);
  if(await page.locator('.sidebar').evaluate(el=>el.getBoundingClientRect().x<0))await page.getByRole('button',{name:'切换导航',exact:true}).click();await page.getByRole('button',{name:'打开文档',exact:true}).click();if(await page.locator('body').evaluate(el=>el.classList.contains('sidebar-open')))await page.getByRole('button',{name:'关闭导航',exact:true}).click();
  await page.getByRole('textbox',{name:'文档正文'}).getByText(index?'SHORT-END':'LONG-END',{exact:true}).waitFor();
 }
 await delay(3000);await sample('startup');await open(0);await delay(3000);await sample('long-document');
 if(diagnose)await retained('baseline');
 for(let i=1;i<=60;i++){
  const start=performance.now();
  await page.locator('[data-action="logic"]').click();await page.locator('.logic-workspace').waitFor();
  await page.locator('[data-card-level]').selectOption('2');assert.equal(await page.locator('.logic-group:not(.logic-sticky)').count(),150);
  await page.locator('[data-action="presentation"]').click();await page.locator('.display-exit').waitFor();
  await page.locator('[data-action="write"]').click();await open(1);await open(0);
  cycles.push(Math.round(performance.now()-start));
  if([5,10,20,40,60].includes(i))await sample(`cycle-${i}`);
  if(diagnose&&[20,40,60].includes(i))await retained(`cycle-${i}`);
 }
 await delay(10000);await sample('idle-10s');
 for(let i=0;i<files.length;i++)assert.equal(await fs.readFile(files[i],'utf8'),bodies[i]);
 const end=page.getByRole('textbox',{name:'文档正文'}).getByText('LONG-END',{exact:true});
 await end.click();await end.evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);r.collapse(false);const s=getSelection();s.removeAllRanges();s.addRange(r);});
 await page.keyboard.insertText(' 保存验收');
 await page.waitForFunction(async()=>{const result=await window.desktop.load();return result.state.docs.some(d=>d.body.includes('LONG-END 保存验收'));});
 for(let i=0;i<100&&!((await fs.readFile(files[0],'utf8')).includes('LONG-END 保存验收'));i++)await delay(100);
 assert.ok((await fs.readFile(files[0],'utf8')).includes('LONG-END 保存验收'));
 await sample('edited-and-saved');assert.deepEqual(errors,[]);
 // Diagnostic only: never confuse forced collection with normal idle behavior.
 await cdp.send('HeapProfiler.collectGarbage');await sample('diagnostic-forced-gc');
 await fs.writeFile(path.join(root,'memory.json'),JSON.stringify({platform:process.platform,arch:process.arch,bytes:Buffer.byteLength(bodies[0]),cyclesMs:cycles,samples,diagnose,note:'Sum of process RSS may double-count shared pages; not physical footprint. Final sample and diagnostic collected stages force GC. Short run cannot establish absence of leaks.'},null,2));
 console.log('PASS: 60 mode/document cycles retain source; subsequent editing saves; no renderer errors');
}finally{if(app)await app.close();console.log('Evidence:',root);}
