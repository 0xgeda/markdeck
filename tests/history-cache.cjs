const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {History}=require('../desktop/history.cjs');
const {atomicWrite}=require('../desktop/workspace.cjs');
const {historyMinIntervalMs}=require('../desktop/limits.cjs');
function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'markdeck-history-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  return {root,history:new History(root,atomicWrite),doc:{id:'document',title:'Document',body:'original'}};
}
test('typing skips historical reads, including after the first read on restart',t=>{
  const {root,history,doc}=fixture(t);let now=1000000;t.mock.method(Date,'now',()=>now);
  history.record(doc,'initial');
  const read=t.mock.method(fs,'readFileSync');
  for(let i=0;i<10;i++)history.record({...doc,body:'edit '+i},'typing');
  assert.equal(read.mock.callCount(),0);
  const restarted=new History(root,atomicWrite);
  for(let i=0;i<10;i++)restarted.record({...doc,body:'edit '+i},'typing');
  assert.equal(read.mock.callCount(),1);
  now+=historyMinIntervalMs;
  restarted.record({...doc,body:'after interval'},'typing');
  assert.equal(read.mock.callCount(),2);
  assert.deepEqual(restarted.list(doc.id).map(v=>v.body),['after interval','original']);
});
test('forced snapshots and another document bypass the typing interval; duplicate bodies stay deduplicated',t=>{
  const {history,doc}=fixture(t);t.mock.method(Date,'now',()=>1000000);
  history.record(doc,'initial');
  history.record({...doc,body:'before restore'},'restore',true);
  history.record({...doc,body:'before restore'},'duplicate',true);
  history.record({...doc,id:'other',body:'other source'},'initial');
  assert.deepEqual(history.list(doc.id).map(v=>v.body),['before restore','original']);
  assert.equal(history.list('other')[0].body,'other source');
});
test('failed history write does not suppress retry',t=>{
  const {history,doc}=fixture(t);let now=1000000;t.mock.method(Date,'now',()=>now);
  history.record(doc,'initial');now+=historyMinIntervalMs;
  let fail=true;history.write=(...args)=>{if(fail)throw new Error('disk full');atomicWrite(...args);};
  const changed={...doc,body:'must survive'};
  assert.throws(()=>history.record(changed,'typing'),/disk full/);
  fail=false;history.record(changed,'typing');
  assert.deepEqual(history.list(doc.id).map(v=>v.body),['must survive','original']);
});
