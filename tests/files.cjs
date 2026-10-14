const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {Workspace}=require('../desktop/workspace.cjs');
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'yunjian-files-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return {root,store:path.join(root,'data'),file:path.join(root,'研究.md')};}
test('open without changes keeps exact bytes; editing writes the same file and survives restart',t=>{
  const f=fixture(t);const original='\ufeff# 研究\r\n\r\n正文\r\n';fs.writeFileSync(f.file,original);
  const w=new Workspace(f.store);const state=w.open(f.file);assert.equal(state.docs[0].body,'# 研究\n\n正文\n');
  assert.deepEqual(w.save(state).errors,{});assert.equal(fs.readFileSync(f.file,'utf8'),original);
  state.docs[0].body+='$已修改\n';assert.deepEqual(w.save(state).errors,{});
  assert.equal(fs.readFileSync(f.file,'utf8'),'\ufeff# 研究\r\n\r\n正文\r\n$已修改\r\n');
  assert.match(new Workspace(f.store).snapshot().docs[0].body,/已修改/);
});
test('external changes are preserved, unsaved edits survive restart, save-as resolves conflict',t=>{
  const f=fixture(t);fs.writeFileSync(f.file,'# 原内容');const w=new Workspace(f.store);const state=w.open(f.file);const id=state.active;
  fs.writeFileSync(f.file,'# 外部修改');state.docs[0].body='# 我的修改';assert.match(w.save(state).errors[id],/其他软件/);
  assert.equal(fs.readFileSync(f.file,'utf8'),'# 外部修改');const recovered=new Workspace(f.store);assert.equal(recovered.snapshot().docs[0].body,'# 我的修改');
  assert.throws(()=>recovered.saveAs(id,f.file),/其他软件/);
  const copy=path.join(f.root,'副本.md');recovered.saveAs(id,copy);assert.equal(fs.readFileSync(copy,'utf8'),'# 我的修改');
  assert.equal(fs.readFileSync(f.file,'utf8'),'# 外部修改');
});
test('renderer paths cannot authorize writes; drafts become real files only through save-as',t=>{
  const f=fixture(t);fs.writeFileSync(f.file,'保持原样');const w=new Workspace(f.store);const d={id:'draft',title:'草稿',body:'## 正文',updated:Date.now(),filePath:f.file};
  w.save({docs:[d],active:d.id});assert.equal(w.snapshot().docs[0].filePath,undefined);assert.equal(fs.readFileSync(f.file,'utf8'),'保持原样');
  const saved=path.join(f.root,'新建.md');Object.assign(d,w.saveAs(d.id,saved).docs[0]);d.body+='\n\n直接编辑';w.save({docs:[d],active:d.id});assert.equal(fs.readFileSync(saved,'utf8'),d.body);
  w.save({docs:[],active:null});assert.equal(fs.readFileSync(saved,'utf8'),d.body);
});
test('restart refreshes unchanged external documents; explicit reload discards a conflicting draft',t=>{
  const f=fixture(t);fs.writeFileSync(f.file,'原内容');const w=new Workspace(f.store);const state=w.open(f.file);
  fs.writeFileSync(f.file,'最新内容');const restarted=new Workspace(f.store);assert.equal(restarted.snapshot().docs[0].body,'最新内容');
  const snapshot=restarted.snapshot();snapshot.docs[0].body='应用修改';fs.writeFileSync(f.file,'再次外部修改');restarted.save(snapshot);
  restarted.reload(state.active);assert.equal(restarted.snapshot().docs[0].body,'再次外部修改');
});
test('missing files retain drafts, invalid snapshots and corrupted stores are rejected',t=>{
  const f=fixture(t);fs.writeFileSync(f.file,'内容');const w=new Workspace(f.store);const state=w.open(f.file);fs.unlinkSync(f.file);state.docs[0].body='新修改';assert.match(w.save(state).errors[state.active],/移动或删除/);
  assert.equal(new Workspace(f.store).snapshot().docs[0].body,'新修改');assert.throws(()=>w.save({docs:[{id:'../bad'}]}),/无效/);
  fs.writeFileSync(path.join(f.store,'workspace.json'),'broken');assert.throws(()=>new Workspace(f.store));assert.equal(fs.readFileSync(path.join(f.store,'workspace.json'),'utf8'),'broken');
});

test('refresh reads external changes without overwriting them and distinguishes unsaved drafts',t=>{
  const f=fixture(t);fs.writeFileSync(f.file,'# 原文');const w=new Workspace(f.store);let state=w.open(f.file);
  assert.equal(w.hasUnsavedChanges(state.active),false);
  fs.writeFileSync(f.file,'# Claude 新标题\n\n最新正文');w.save(state);
  assert.equal(w.hasUnsavedChanges(state.active),false);
  state=w.reload(state.active);assert.equal(state.docs[0].body,'# Claude 新标题\n\n最新正文');
  assert.equal(fs.readFileSync(f.file,'utf8'),state.docs[0].body);
  fs.writeFileSync(f.file,'# Claude 再次修改');state.docs[0].body+='\n\n本地草稿';w.save(state);
  assert.equal(w.hasUnsavedChanges(state.active),true);
  assert.match(new Workspace(f.store).snapshot().docs[0].body,/本地草稿/);
});

test('automatic sync updates clean documents and preserves external file bytes',t=>{
  const f=fixture(t);fs.writeFileSync(f.file,'# 原内容');const w=new Workspace(f.store);const state=w.open(f.file);
  assert.equal(w.sync(state.active).changed,false);
  const external='\ufeff# Claude 更新\r\n\r\n正文\r\n';fs.writeFileSync(f.file,external);
  const result=w.sync(state.active);assert.equal(result.changed,true);assert.equal(result.doc.body,'# Claude 更新\n\n正文\n');
  assert.equal(fs.readFileSync(f.file,'utf8'),external);assert.equal(w.sync(state.active).changed,false);
  assert.equal(new Workspace(f.store).snapshot().docs[0].body,result.doc.body);
});
test('a stale save racing automatic sync cannot overwrite newer external content',t=>{
  const f=fixture(t);fs.writeFileSync(f.file,'原内容');const w=new Workspace(f.store);const stale=w.open(f.file);
  fs.writeFileSync(f.file,'Claude 新内容');assert.equal(w.sync(stale.active).changed,true);
  stale.docs[0].body='并发本地草稿';const saved=w.save(stale);assert.match(saved.errors[stale.active],/同时修改/);
  assert.equal(fs.readFileSync(f.file,'utf8'),'Claude 新内容');assert.equal(new Workspace(f.store).snapshot().docs[0].body,'并发本地草稿');
  assert.match(w.save(w.snapshot()).errors[stale.active],/同时修改/);
  assert.equal(w.sync(stale.active).changed,false);assert.equal(w.snapshot().docs[0].body,'并发本地草稿');
  w.reload(stale.active);assert.equal(w.hasUnsavedChanges(stale.active),false);
});
test('automatic sync preserves conflicting drafts and handles temporary file removal',t=>{
  const f=fixture(t);fs.writeFileSync(f.file,'原内容');const w=new Workspace(f.store);const state=w.open(f.file);
  fs.writeFileSync(f.file,'外部内容');state.docs[0].body='未写回的草稿';w.save(state);
  assert.match(w.sync(state.active).error,/同时有修改/);assert.equal(w.snapshot().docs[0].body,'未写回的草稿');
  fs.unlinkSync(f.file);assert.match(w.sync(state.active).error,/移动或删除/);
  fs.writeFileSync(f.file,'恢复后的外部内容');assert.match(w.sync(state.active).error,/同时有修改/);
  assert.equal(fs.readFileSync(f.file,'utf8'),'恢复后的外部内容');
});
test('consecutive acknowledged saves advance the file revision without false conflicts',t=>{
  const f=fixture(t);fs.writeFileSync(f.file,'原内容');const w=new Workspace(f.store);let state=w.open(f.file);
  for(let i=0;i<5;i++){state.docs[0].body+='修改';const result=w.save(state);assert.deepEqual(result.errors,{});state=result.state;}
  assert.equal(fs.readFileSync(f.file,'utf8'),state.docs[0].body);
});
