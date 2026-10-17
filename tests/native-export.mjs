import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),root=fs.mkdtempSync(path.join(os.tmpdir(),'markdeck-export-'));let main,printed,closed=0,canceled=false,format='html';const handlers=new Map(),paths=new Map();
const electron={app:{setName(){},setPath:(key,value)=>paths.set(key,value),getPath:key=>paths.get(key)||root,requestSingleInstanceLock:()=>true,on(){},quit(){},whenReady:()=>Promise.resolve()},Menu:{buildFromTemplate:x=>x,setApplicationMenu(){}},nativeTheme:{},dialog:{showOpenDialog:async()=>({canceled:false,filePaths:[root]}),showSaveDialog:async()=>({canceled,filePath:path.join(root,'output.'+format)}),showErrorBox:()=>assert.fail('workspace load error')},ipcMain:{handle:(name,fn)=>handlers.set(name,fn)},protocol:{registerSchemesAsPrivileged(){},handle(){}},net:{},session:{defaultSession:{setPermissionRequestHandler(){}}},BrowserWindow:class{
 constructor(options){this.options=options;this.webContents={mainFrame:{url:''},setWindowOpenHandler(){},on(){},executeJavaScript:async()=>{},printToPDF:async options=>{printed=options;return Buffer.from('%PDF-1.4\nmock printer output');}};if(options.title)main=this;}
 once(){}on(){}maximize(){}show(){}setBackgroundColor(){}destroy(){closed++;}async loadURL(url){this.webContents.mainFrame.url=url;}
}};
try{const filename=path.resolve('desktop/main.cjs');vm.runInNewContext(fs.readFileSync(filename,'utf8'),{require:name=>name==='electron'?electron:name==='./workspace.cjs'?require('../desktop/workspace.cjs'):createRequire(path.resolve('desktop/main.cjs'))(name),__dirname:path.dirname(filename),process:{platform:'darwin',env:{LARKDOWN_DATA_DIR:path.join(root,'data')}},Buffer,Response,console});await new Promise(resolve=>setImmediate(resolve));
const event={sender:main.webContents,senderFrame:main.webContents.mainFrame},call=(...args)=>handlers.get('document:export')(event,...args),html='<html><head></head><body>完整正文</body></html>';
assert.equal((await call('测试',html,'html')).ok,true);assert.match(fs.readFileSync(path.join(root,'output.html'),'utf8'),/完整正文/);assert.match(fs.readFileSync(path.join(root,'output.html'),'utf8'),/default-src 'none'/);
const saveWorkspace=handlers.get('workspace:save');await saveWorkspace(event,{active:'logic-fixture',docs:[{id:'logic-fixture',title:'报告',body:'# 第一章',updated:Date.now()}]});
const logicState=JSON.stringify({version:1,notes:{'第一章::0':'补充依据'},positions:{'第一章::0':{x:120,y:80}},collapsed:{},zoom:.8,left:20,top:0});
assert.equal((await handlers.get('logic:save')(event,'logic-fixture',logicState)).ok,true);assert.equal((await handlers.get('logic:load')(event,'logic-fixture')).state,logicState);assert.equal((await handlers.get('logic:save')(event,'../bad',logicState)).ok,false);
format='zip';assert.equal((await handlers.get('document:bundle')(event,'logic-fixture')).ok,true);assert.equal(fs.readFileSync(path.join(root,'output.zip')).subarray(0,2).toString(),'PK');
fs.writeFileSync(path.join(root,'project.md'),'# 项目\n\n文件夹检索');
assert.equal((await handlers.get('project:choose')(event)).ok,true);
const searched=await handlers.get('project:search')(event,'文件夹检索');assert.ok(searched.results.some(item=>item.path==='project.md'));
assert.equal((await handlers.get('project:open')(event,'project.md')).ok,true);assert.equal((await handlers.get('project:open')(event,'../secret.md')).ok,false);
format='pdf';assert.equal((await call('测试',html,'pdf')).ok,true);assert.equal(printed.pageSize,'A4');assert.equal(closed,1);assert.match(fs.readFileSync(path.join(root,'output.pdf'),'utf8'),/^%PDF/);
canceled=true;assert.equal((await call('测试',html,'pdf')).canceled,true);assert.equal(closed,1);
await assert.rejects(()=>handlers.get('document:export')({sender:{},senderFrame:{}},'bad',html,'pdf'),/来源/);
console.log('Native export handlers: actual file writes, HTML security policy, PDF printer dispatch, cleanup, cancel and origin checks passed (printer mocked).');
}finally{fs.rmSync(root,{recursive:true,force:true});}
