const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {Workspace}=require('../desktop/workspace.cjs');
const {confirmClose}=require('../desktop/close-workspace.cjs');

function fixture(t,count=1){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'markdeck-close-'));
  t.after(()=>{const data=path.join(root,'data');if(fs.existsSync(data))fs.chmodSync(data,0o700);fs.rmSync(root,{recursive:true,force:true});});
  const data=path.join(root,'data'),w=new Workspace(data),files=[];
  for(let i=0;i<count;i++){
    const folder=path.join(root,String(i));fs.mkdirSync(folder);
    const file=path.join(folder,'同名文档.md');fs.writeFileSync(file,`# 原文件 ${i}`);w.open(file);files.push(file);
  }
  const state=w.snapshot();for(const d of state.docs)d.body+='\n\n保留的修改';
  for(const file of files)fs.renameSync(file,file+'.moved');
  w.save(state);
  return {root,data,w,files};
}
function dialogs(response,options={}){
  const messages=[];
  return {messages,showMessageBox:async(_window,options)=>{messages.push(options);return {response};},showSaveDialog:async()=>options.save||{canceled:true},showOpenDialog:async()=>options.folder||{canceled:true}};
}
const close=(f,d,result={ok:true,fileErrors:true})=>confirmClose(f.w,d,null,result,f.root);

test('keep draft persists acknowledgment across restart; new edits require confirmation',async t=>{
  const f=fixture(t),d=dialogs(1),body=f.w.snapshot().docs[0].body;
  assert.equal((await close(f,d)).close,true);assert.match(d.messages[0].detail,/同名文档/);assert.match(d.messages[0].detail,/移动或删除/);
  f.w=new Workspace(f.data);f.w.save(f.w.snapshot());
  assert.equal(f.w.snapshot().docs[0].body,body);assert.equal(f.w.pendingWrites()[0].acknowledged,true);
  const quiet=dialogs(0);assert.equal((await close(f,quiet)).close,true);assert.equal(quiet.messages.length,0);
  const state=f.w.snapshot();state.docs[0].body+=' 新编辑';f.w.save(state);
  assert.equal((await close(f,quiet)).close,false);assert.equal(quiet.messages.length,1);
  assert.equal(fs.existsSync(f.files[0]),false);
});

test('successful write clears old acknowledgment even if the same draft is later recreated',async t=>{
  const f=fixture(t),d=dialogs(1),id=f.w.state.active;
  await close(f,d);assert.ok(f.w.state.docs[0].acknowledgedDraft);
  fs.renameSync(f.files[0]+'.moved',f.files[0]);f.w.save(f.w.snapshot());
  assert.equal(f.w.state.docs[0].acknowledgedDraft,undefined);
  const state=f.w.snapshot();state.docs[0].body+=' again';fs.renameSync(f.files[0],f.files[0]+'.moved');f.w.save(state);
  assert.equal(f.w.pendingWrites().find(d=>d.id===id).acknowledged,false);
});

test('failed acknowledgment persistence rolls back and stays open; stale confirmations are rejected',async t=>{
  const f=fixture(t),pending=f.w.pendingWrites();
  fs.chmodSync(f.data,0o500);
  const d=dialogs(1);assert.equal((await close(f,d)).close,false);assert.equal(f.w.pendingWrites()[0].acknowledged,false);
  assert.equal(d.messages[1].message,'无法保存关闭选择');
  fs.chmodSync(f.data,0o700);const state=f.w.snapshot();state.docs[0].body+=' changed';f.w.save(state);
  assert.throws(()=>f.w.acknowledgeDrafts(pending),/文档已变化/);
  state.docs[0].acknowledgedDraft=f.w.pendingWrites()[0].fingerprint;f.w.save(state);
  assert.equal(f.w.pendingWrites()[0].acknowledged,false,'renderer cannot create acknowledgment');
});

test('failed draft save always warns even when prior content was acknowledged',async t=>{
  const f=fixture(t);await close(f,dialogs(1));const d=dialogs(0);
  assert.equal((await close(f,d,{ok:false,error:'no space'})).close,false);
  assert.equal(d.messages[0].message,'保存未完成');assert.deepEqual(d.messages[0].buttons,['返回文档','仍然关闭']);
});

test('save copy from close updates the association and copies available images without changing originals',async t=>{
  const f=fixture(t),file=f.files[0],image=path.join(path.dirname(file),'image.png');
  const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=','base64');fs.writeFileSync(image,bytes);
  const state=f.w.snapshot();state.docs[0].body+='\n\n![图片](image.png)';f.w.save(state);
  const target=path.join(f.root,'副本.md'),d=dialogs(2,{save:{canceled:false,filePath:target}});
  assert.equal((await close(f,d)).close,true);
  const saved=new Workspace(f.data).snapshot().docs[0];assert.equal(saved.filePath,target);assert.match(saved.body,/保留的修改/);
  assert.match(decodeURI(saved.body),/副本.assets\//);assert.deepEqual(fs.readFileSync(image),bytes);
  assert.deepEqual(fs.readFileSync(path.join(f.root,'副本.assets',fs.readdirSync(path.join(f.root,'副本.assets'))[0])),bytes);
  assert.equal(fs.readFileSync(file+'.moved','utf8'),'# 原文件 0');assert.equal(fs.existsSync(file),false);
});

test('multiple failed files need one folder choice and same names do not overwrite each other',async t=>{
  const f=fixture(t,2);let choices=0;const d=dialogs(2,{folder:{canceled:false,filePaths:[f.root]}});
  const choose=d.showOpenDialog;d.showOpenDialog=async(...args)=>{choices++;return choose(...args);};
  assert.equal((await close(f,d)).close,true);assert.equal(choices,1);
  const docs=f.w.snapshot().docs;assert.notEqual(docs[0].filePath,docs[1].filePath);
  assert.equal(path.dirname(docs[0].filePath),path.dirname(docs[1].filePath));
  for(const doc of docs)assert.equal(fs.readFileSync(doc.filePath,'utf8'),doc.body);
  assert.equal(f.w.pendingWrites().length,0);
});

test('canceling copy preserves the draft; partial copy failure returns updated state and keeps the window open',async t=>{
  const f=fixture(t,2),before=f.w.snapshot();assert.equal((await close(f,dialogs(2))).close,false);
  assert.deepEqual(f.w.snapshot(),before);assert.equal(f.w.pendingWrites().some(d=>d.acknowledged),false);
  const state=f.w.snapshot();state.docs[1].body+='\n\n![丢失图片](missing.png)';f.w.save(state);
  const d=dialogs(2,{folder:{canceled:false,filePaths:[f.root]}}),result=await close(f,d);
  assert.equal(result.close,false);assert.equal(d.messages[1].message,'副本保存未完成');
  assert.notEqual(result.state.docs[0].filePath,before.docs[0].filePath);
  assert.equal(fs.readFileSync(result.state.docs[0].filePath,'utf8'),result.state.docs[0].body);
  assert.equal(result.state.docs[1].filePath,before.docs[1].filePath);assert.ok(result.errors[state.docs[1].id]);
  assert.equal(result.errors[state.docs[0].id],undefined);
  f.w.save(result.state);assert.equal(f.w.pendingWrites().length,1);
});
