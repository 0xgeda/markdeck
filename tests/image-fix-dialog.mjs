import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

function setup(){
  const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://fix.test',pretendToBeVisual:true});
  globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.HTMLElement=dom.window.HTMLElement;globalThis.Event=dom.window.Event;
  // Polyfill dialog element — jsdom doesn't implement it.
  const proto=dom.window.HTMLDialogElement?dom.window.HTMLDialogElement.prototype:dom.window.HTMLElement.prototype;
  Object.defineProperty(proto,'showModal',{configurable:true,value:function(){this.open=true;this.setAttribute('open','');}});
  Object.defineProperty(proto,'close',{configurable:true,value:function(){if(!this.open)return;this.open=false;this.removeAttribute('open');this.dispatchEvent(new dom.window.Event('close'));}});
  return dom;
}
function tick(ms=0){return new Promise(resolve=>setTimeout(resolve,ms));}

function makeDesktop(overrides={}){
  const calls={scan:0,locate:0,import:0,choose:0};
  const defaults={
    scanImages:async()=>{calls.scan++;return {ok:true,entries:[],docDir:'/tmp'};},
    locateImageFolder:async(_id,_folder)=>{calls.locate++;return {ok:true,candidates:{}};},
    importImages:async(_id,picks)=>{calls.import++;return {ok:true,imported:picks.map(p=>({raw:p.raw,newSrc:'new/'+p.raw,target:'/t/'+p.raw})),errors:{},newBody:'REWRITTEN'};},
    chooseImageFolder:async()=>{calls.choose++;return {ok:true,folder:'/external'};}
  };
  return {calls,desktop:{...defaults,...overrides}};
}

async function openDialog(desktop,onApplyBody=async()=>{}){
  globalThis.window.desktop=desktop;
  const {openImageFix}=await import('../src/image-fix-dialog.js?r='+Math.random());
  const promise=openImageFix({docId:'doc-1',onApplyBody});
  await tick(0);await tick(0);
  return {promise};
}

test('opens, loading state, rows render after scan',async()=>{
  const dom=setup();
  const entries=[
    {raw:'![](a.png)',src:'a.png',alt:'A',title:null,line:1,column:1,status:'missing',resolved:null},
    {raw:'![](http://x/b.png)',src:'http://x/b.png',alt:'',title:null,line:3,column:1,status:'remote'}
  ];
  const {desktop}=makeDesktop({scanImages:async()=>({ok:true,entries,docDir:'/tmp'})});
  await openDialog(desktop);
  const dialog=document.querySelector('.image-fix-dialog');
  assert.ok(dialog,'dialog mounted');
  const rows=dialog.querySelectorAll('tbody tr[data-raw]');
  assert.equal(rows.length,2);
  assert.match(dialog.querySelector('[data-status]').textContent,/共 2/);
  dialog.close();dom.window.close();
});

test('scan error shows error and no table',async()=>{
  const dom=setup();
  const {desktop}=makeDesktop({scanImages:async()=>({ok:false,error:'boom'})});
  await openDialog(desktop);
  const dialog=document.querySelector('.image-fix-dialog');
  assert.match(dialog.querySelector('[data-status]').textContent,/boom/);
  assert.ok(dialog.querySelector('.image-fix-table').hidden);
  dialog.close();dom.window.close();
});

test('全选可修复 only checks rows with candidate + fixable status',async()=>{
  const dom=setup();
  const entries=[
    {raw:'![](a.png)',src:'a.png',alt:'',title:null,line:1,column:1,status:'missing'},
    {raw:'![](b.png)',src:'b.png',alt:'',title:null,line:2,column:1,status:'missing'},
    {raw:'![](c.png)',src:'c.png',alt:'',title:null,line:3,column:1,status:'ok'}
  ];
  const {desktop}=makeDesktop({
    scanImages:async()=>({ok:true,entries,docDir:'/tmp'}),
    chooseImageFolder:async()=>({ok:true,folder:'/ext'}),
    locateImageFolder:async()=>({ok:true,candidates:{'![](a.png)':{src:'a.png',candidate:'/ext/a.png'}}})
  });
  await openDialog(desktop);
  const dialog=document.querySelector('.image-fix-dialog');
  // Trigger folder locate.
  dialog.querySelector('[data-locate]').click();await tick(5);await tick(5);
  dialog.querySelector('[data-select-all]').click();
  const checked=[...dialog.querySelectorAll('tbody input[type=checkbox]:checked')];
  assert.equal(checked.length,1);
  const row=checked[0].closest('tr');assert.equal(row.dataset.raw,'![](a.png)');
  dialog.close();dom.window.close();
});

test('row checkbox disabled when no candidate',async()=>{
  const dom=setup();
  const entries=[{raw:'![](a.png)',src:'a.png',alt:'',title:null,line:1,column:1,status:'missing'}];
  const {desktop}=makeDesktop({scanImages:async()=>({ok:true,entries,docDir:'/tmp'})});
  await openDialog(desktop);
  const dialog=document.querySelector('.image-fix-dialog');
  const cb=dialog.querySelector('tbody input[type=checkbox]');
  assert.equal(cb.disabled,true);
  cb.checked=true;// cannot be unchecked via click because disabled; still, apply must stay disabled
  assert.equal(dialog.querySelector('[data-apply]').disabled,true);
  dialog.close();dom.window.close();
});

test('扫描文件夹 updates candidate cell',async()=>{
  const dom=setup();
  const entries=[{raw:'![](a.png)',src:'a.png',alt:'',title:null,line:1,column:1,status:'missing'}];
  const {desktop}=makeDesktop({
    scanImages:async()=>({ok:true,entries,docDir:'/tmp'}),
    chooseImageFolder:async()=>({ok:true,folder:'/ext'}),
    locateImageFolder:async()=>({ok:true,candidates:{'![](a.png)':{src:'a.png',candidate:'/ext/a.png'}}})
  });
  await openDialog(desktop);
  const dialog=document.querySelector('.image-fix-dialog');
  dialog.querySelector('[data-locate]').click();await tick(5);await tick(5);
  const cell=dialog.querySelector('tr[data-raw] [data-cand]');
  assert.match(cell.textContent,/a\.png/);
  assert.match(dialog.querySelector('[data-status]').textContent,/匹配到 1/);
  dialog.close();dom.window.close();
});

test('应用修复 calls importImages with picks and onApplyBody with newBody',async()=>{
  const dom=setup();
  const entries=[{raw:'![](a.png)',src:'a.png',alt:'',title:null,line:1,column:1,status:'missing'}];
  let seenPicks=null,bodyApplied=null;
  const {desktop}=makeDesktop({
    scanImages:async()=>({ok:true,entries,docDir:'/tmp'}),
    chooseImageFolder:async()=>({ok:true,folder:'/ext'}),
    locateImageFolder:async()=>({ok:true,candidates:{'![](a.png)':{src:'a.png',candidate:'/ext/a.png'}}}),
    importImages:async(_id,picks)=>{seenPicks=picks;return {ok:true,imported:picks.map(p=>({raw:p.raw})),errors:{},newBody:'NEW'};}
  });
  await openDialog(desktop,async body=>{bodyApplied=body;});
  const dialog=document.querySelector('.image-fix-dialog');
  dialog.querySelector('[data-locate]').click();await tick(5);await tick(5);
  dialog.querySelector('[data-select-all]').click();
  dialog.querySelector('[data-apply]').click();
  await tick(10);await tick(10);
  assert.deepEqual(seenPicks,[{raw:'![](a.png)',sourcePath:'/ext/a.png'}]);
  assert.equal(bodyApplied,'NEW');
  // close scheduled after 1.5s — force it
  dialog.close();dom.window.close();
});

test('stale re-scan shows confirm; 重新扫描 aborts',async()=>{
  const dom=setup();
  const initial=[{raw:'![](a.png)',src:'a.png',alt:'',title:null,line:1,column:1,status:'missing'}];
  const fresh=[{raw:'![](a.png)',src:'a.png',alt:'',title:null,line:1,column:1,status:'ok'}];
  let scanCount=0,imported=false;
  const {desktop}=makeDesktop({
    scanImages:async()=>{scanCount++;return {ok:true,entries:scanCount===1?initial:fresh,docDir:'/tmp'};},
    chooseImageFolder:async()=>({ok:true,folder:'/ext'}),
    locateImageFolder:async()=>({ok:true,candidates:{'![](a.png)':{src:'a.png',candidate:'/ext/a.png'}}}),
    importImages:async()=>{imported=true;return {ok:true,imported:[],errors:{},newBody:''};}
  });
  dom.window.confirm=()=>true;
  await openDialog(desktop);
  const dialog=document.querySelector('.image-fix-dialog');
  dialog.querySelector('[data-locate]').click();await tick(5);await tick(5);
  dialog.querySelector('[data-select-all]').click();
  dialog.querySelector('[data-apply]').click();await tick(10);await tick(10);
  assert.equal(imported,false,'should abort import on 重新扫描');
  assert.equal(scanCount>=2,true);
  dialog.close();dom.window.close();
});

test('successful import closes dialog (after delay); onApplyBody called',async()=>{
  const dom=setup();
  const entries=[{raw:'![](a.png)',src:'a.png',alt:'',title:null,line:1,column:1,status:'missing'}];
  let bodyCalled=false;
  const {desktop}=makeDesktop({
    scanImages:async()=>({ok:true,entries,docDir:'/tmp'}),
    chooseImageFolder:async()=>({ok:true,folder:'/ext'}),
    locateImageFolder:async()=>({ok:true,candidates:{'![](a.png)':{src:'a.png',candidate:'/ext/a.png'}}})
  });
  await openDialog(desktop,async()=>{bodyCalled=true;});
  const dialog=document.querySelector('.image-fix-dialog');
  dialog.querySelector('[data-locate]').click();await tick(5);await tick(5);
  dialog.querySelector('[data-select-all]').click();
  dialog.querySelector('[data-apply]').click();await tick(10);await tick(10);
  assert.equal(bodyCalled,true);
  // dialog still open; wait for the 1500ms timer
  await tick(1600);
  assert.equal(document.querySelector('.image-fix-dialog'),null);
  dom.window.close();
});

test('partial errors keep dialog open and render per-row error',async()=>{
  const dom=setup();
  const entries=[
    {raw:'![](a.png)',src:'a.png',alt:'',title:null,line:1,column:1,status:'missing'},
    {raw:'![](b.png)',src:'b.png',alt:'',title:null,line:2,column:1,status:'missing'}
  ];
  const {desktop}=makeDesktop({
    scanImages:async()=>({ok:true,entries,docDir:'/tmp'}),
    chooseImageFolder:async()=>({ok:true,folder:'/ext'}),
    locateImageFolder:async()=>({ok:true,candidates:{'![](a.png)':{src:'a.png',candidate:'/ext/a.png'},'![](b.png)':{src:'b.png',candidate:'/ext/b.png'}}}),
    importImages:async(_id,picks)=>({ok:true,imported:[{raw:picks[0].raw}],errors:{[picks[1].raw]:'文件无法读取'},newBody:'NEW'})
  });
  await openDialog(desktop);
  const dialog=document.querySelector('.image-fix-dialog');
  dialog.querySelector('[data-locate]').click();await tick(5);await tick(5);
  dialog.querySelector('[data-select-all]').click();
  dialog.querySelector('[data-apply]').click();await tick(10);await tick(10);
  assert.ok(document.querySelector('.image-fix-dialog'),'dialog stays open');
  const errRow=dialog.querySelector('.image-fix-row-error');
  assert.ok(errRow);assert.match(errRow.textContent,/文件无法读取/);
  dialog.close();dom.window.close();
});

test('reopen does not create duplicate dialog',async()=>{
  const dom=setup();
  const {desktop}=makeDesktop();
  await openDialog(desktop);
  await openDialog(desktop);
  assert.equal(document.querySelectorAll('.image-fix-dialog').length,1);
  document.querySelector('.image-fix-dialog').close();dom.window.close();
});
