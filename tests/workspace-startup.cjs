// Assert scheduling directly: wall-clock thresholds cannot prove disk reads are
// deferred. Matching hashes ensure these fixtures actually enter readInto.
const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {createHash}=require('node:crypto');
const {Workspace}=require('../desktop/workspace.cjs');
const nextTurn=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'markdeck-startup-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const file=path.join(root,'note.md'),directory=path.join(root,'data');
  fs.mkdirSync(directory);fs.writeFileSync(file,'new disk content');
  const body='saved content';
  fs.writeFileSync(path.join(directory,'workspace.json'),JSON.stringify({
    active:'doc-1',docs:[{id:'doc-1',title:'note',body,updated:Date.now(),star:false,
      filePath:file,diskHash:createHash('sha256').update(body).digest('hex'),bom:false,eol:'\n',blocked:false}]
  }));
  return {file,directory,body};
}
test('startup reads clean documents only after constructor returns',async t=>{
  const f=fixture(t);let reads=0;
  class ObservedWorkspace extends Workspace{
    readInto(...args){reads++;return super.readInto(...args);}
  }
  const workspace=new ObservedWorkspace(f.directory);
  assert.equal(reads,0,'constructor must not read external files');
  assert.equal(workspace.state.docs[0].body,f.body);
  await nextTurn();
  assert.equal(reads,1,'fixture must exercise the deferred read');
  assert.equal(workspace.state.docs[0].body,'new disk content');
});
test('failed deferred reads preserve saved content',async t=>{
  const f=fixture(t);let reads=0;
  fs.unlinkSync(f.file);
  class ObservedWorkspace extends Workspace{
    readInto(...args){reads++;return super.readInto(...args);}
  }
  const workspace=new ObservedWorkspace(f.directory);
  assert.equal(reads,0);
  await nextTurn(); // An uncaught deferred exception fails the Node test runner.
  assert.equal(reads,1);
  assert.equal(workspace.state.docs[0].body,f.body);
});
test('edits made before deferred startup read are preserved',async t=>{
  const f=fixture(t);let reads=0;
  class ObservedWorkspace extends Workspace{
    readInto(...args){reads++;return super.readInto(...args);}
  }
  const workspace=new ObservedWorkspace(f.directory);
  workspace.state.docs[0].body='unsaved edit';
  await nextTurn();
  assert.equal(reads,0);
  assert.equal(workspace.state.docs[0].body,'unsaved edit');
  assert.equal(fs.readFileSync(f.file,'utf8'),'new disk content');
});
