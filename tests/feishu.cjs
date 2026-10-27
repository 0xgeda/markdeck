const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {Workspace}=require('../desktop/workspace.cjs');const {Feishu,folderToken,documentUrl}=require('../desktop/feishu.cjs');const {prepareContent}=require('../desktop/feishu-content.cjs');
function fixture(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'markdeck-feishu-test-'));const ws=new Workspace(path.join(dir,'data'));fs.writeFileSync(path.join(dir,'photo.png'),Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=','base64'));const file=path.join(dir,'文档.md');const body='# 标题\n\n**粗体** & [网址](https://example.com/?a=1&b=2)\n\n| A | B |\n|---|---|\n|甲|乙|\n\n![图片][ref]\n\n[ref]: photo.png\n\n<img src="photo.png" width="300">\n\n```xml\n<source path="@/etc/passwd"/>\n```\n\n<source path="@/etc/passwd"/>';fs.writeFileSync(file,body);ws.open(file);return {dir,ws,file,body,doc:ws.state.docs[0]};}
test('conversion preserves source, embeds referenced/local images, escapes code and raw resource tags',()=>{const {dir,ws,doc,file,body}=fixture();const out=path.join(dir,'out');fs.mkdirSync(out);const result=prepareContent(ws,doc,out);assert.match(result.xml,/<b>粗体<\/b>/);assert.match(result.xml,/<th><p>A<\/p><\/th>/);assert.equal((result.xml.match(/path="@\.\/image-0.png"/g)||[]).length,2);assert.doesNotMatch(result.xml,/<source/);assert.match(result.xml,/&lt;source/);assert.equal(fs.readFileSync(file,'utf8'),body);assert.ok(result.warnings.length);});
test('folders accept only drive folder links',()=>{assert.equal(folderToken(''),'');assert.equal(folderToken('https://a.feishu.cn/drive/folder/abc123'),'abc123');for(const value of ['abc','https://evil.com/drive/folder/abc','https://a.feishu.cn/wiki/abc'])assert.throws(()=>folderToken(value));});
test('uploads use user identity, safe argv, snapshots, remembered destination and warnings',async()=>{const {ws,doc,file,body}=fixture();const service=new Feishu(ws,{runner:async(args,options)=>{if(args[0]==='auth')return {identities:{user:{available:true,openId:'test-user'}}};assert.ok(args.includes('user'));assert.ok(args.includes('abc'));assert.match(fs.readFileSync(path.join(options.cwd,'content.xml'),'utf8'),/<title>/);return {ok:true,data:{document:{url:'https://test.feishu.cn/docx/abc'},warnings:['示例警告']}};}});const result=await service.upload(doc.id,'https://test.feishu.cn/drive/folder/abc');assert.equal(result.status,'complete');assert.ok(result.warnings.includes('示例警告'));assert.equal((await service.status()).configured,true);assert.equal(fs.readFileSync(file,'utf8'),body);});
test('ambiguous failures persist unknown and do not retry writes',async()=>{const {ws,doc}=fixture();let writes=0;const service=new Feishu(ws,{runner:async args=>{if(args[0]==='auth')return {identities:{user:{available:true,openId:'test'}}};writes++;throw new Error('timeout');}});await assert.rejects(service.upload(doc.id,''),/避免重复上传/);assert.equal(writes,1);assert.equal(service.preferences.last.status,'unknown');});
test('missing local image prevents any remote write',async()=>{const {ws,doc}=fixture();doc.body='![missing](missing.png)';let writes=0;const service=new Feishu(ws,{runner:async args=>{if(args[0]==='auth')return {identities:{user:{available:true}}};writes++;}});await assert.rejects(service.upload(doc.id,''));assert.equal(writes,0);});

const target='https://test.feishu.cn/wiki/WikiTarget';
function updateFixture(){
 const base=fixture(),calls=[],remote={revision:7,account:'test-user',writes:0,previews:0,fail:null};
 const runner=async(args,options)=>{
  calls.push([...args]);
  if(args[0]==='auth')return {identities:{user:{available:true,openId:remote.account}}};
  if(args[1]==='+fetch'){
   if(remote.fail==='readback'&&remote.writes)throw new Error('readback timeout');
   if(remote.fail==='permission')throw new Error('没有文档访问权限');
   return {ok:true,data:{document:{document_id:'ActualDocx',revision_id:remote.revision,content:'<title id="ActualDocx">固定 &amp; 标题</title><p>旧正文</p>',reference_map:{comments:{c1:{data:'旧评论'}}}}}};
  }
  assert.equal(args[1],'+update');assert.equal(args[args.indexOf('--doc')+1],'ActualDocx');assert.equal(args[args.indexOf('--revision-id')+1],'7');
  const xml=fs.readFileSync(path.join(options.cwd,'content.xml'),'utf8');assert.ok(xml.startsWith('<title>固定 &amp; 标题</title>'));assert.ok(xml.includes('image-0.png'));
  if(args.includes('--dry-run')){remote.previews++;if(remote.fail==='dry-run')throw new Error('invalid content');return {ok:true,dry_run:true};}
  remote.writes++;if(remote.gate)await remote.gate;
  if(remote.fail==='timeout')throw new Error('timeout');
  remote.revision++;
  return {ok:true,data:{result:remote.fail==='partial'?'partial_success':'success',document:{revision_id:remote.revision},warnings:['样式提示']}};
 };
 return {...base,calls,remote,runner,service:new Feishu(base.ws,{runner})};
}
test('update targets accept Docx/Wiki URLs and reject folders, credentials, ports and other hosts',()=>{
 assert.equal(documentUrl(' https://test.feishu.cn/wiki/abc?from=share#anchor '),'https://test.feishu.cn/wiki/abc');
 assert.equal(documentUrl('https://test.larksuite.com/docx/abc'),'https://test.larksuite.com/docx/abc');
 for(const value of ['abc',null,'http://test.feishu.cn/docx/abc','https://feishu.cn.evil.com/docx/abc','https://user:pass@test.feishu.cn/docx/abc','https://test.feishu.cn:444/docx/abc','https://test.feishu.cn/drive/folder/abc','https://test.feishu.cn/base/abc'])assert.throws(()=>documentUrl(value));
});
test('confirmed Wiki updates use resolved ID and revision, keep title/link, back up old content and remember per document',async()=>{
 const {ws,doc,file,body,service,remote,runner}=updateFixture();service.preferences={account:'test-user',folder:'https://test.feishu.cn/drive/folder/Keep',targets:{another:'https://test.feishu.cn/docx/Other'}};
 const preview=await service.prepareUpdate(doc.id,target);assert.equal(preview.title,'固定 & 标题');assert.equal(remote.writes,0);
 const result=await service.update(doc.id,preview.confirmation);assert.equal(result.status,'complete');assert.equal(result.mode,'update');assert.equal(result.url,target);assert.equal(remote.writes,1);assert.equal(remote.previews,1);assert.ok(result.warnings.includes('样式提示'));
 const backup=JSON.parse(fs.readFileSync(result.backupPath,'utf8'));assert.equal(backup.response.data.document.revision_id,7);assert.ok(backup.response.data.document.reference_map.comments.c1);assert.equal(fs.readFileSync(file,'utf8'),body);
 const restarted=new Feishu(ws,{runner});assert.equal((await restarted.status(doc.id)).targetUrl,target);assert.equal((await restarted.status('another')).targetUrl,'https://test.feishu.cn/docx/Other');assert.equal((await restarted.status('unrelated')).targetUrl,'');assert.equal(restarted.preferences.folder,'https://test.feishu.cn/drive/folder/Keep');
 await assert.rejects(service.update(doc.id,preview.confirmation),/先读取/);assert.equal(remote.writes,1);
 remote.account='other-user';assert.equal((await restarted.status(doc.id)).targetUrl,'');
});
test('changed local content, remote revision, active document or account prevent overwrite',async()=>{
 for(const change of ['local','remote','active','account']){
  const {ws,doc,service,remote}=updateFixture(),preview=await service.prepareUpdate(doc.id,target);
  if(change==='local')doc.body+='\n新编辑';if(change==='remote')remote.revision++;if(change==='active')ws.state.active='another';if(change==='account')remote.account='other';
  await assert.rejects(service.update(doc.id,preview.confirmation),/变化|修改|切换/);assert.equal(remote.writes,0,change);
 }
});
test('read permission, missing local images and preflight errors fail before any overwrite',async()=>{
 for(const failure of ['permission','image','dry-run']){
  const {doc,service,remote}=updateFixture();
  if(failure==='permission'){remote.fail=failure;await assert.rejects(service.prepareUpdate(doc.id,target),/访问权限/);}
  else{
   if(failure==='image')doc.body='![missing](missing.png)';
   const preview=await service.prepareUpdate(doc.id,target);remote.fail=failure;
   await assert.rejects(service.update(doc.id,preview.confirmation));
  }
  assert.equal(remote.writes,0,failure);assert.equal(service.preferences.last,undefined);
 }
});
test('partial writes, network errors and readback failure remain unknown without retry',async()=>{
 for(const failure of ['partial','timeout','readback']){
  const {ws,doc,service,remote,runner}=updateFixture(),preview=await service.prepareUpdate(doc.id,target);remote.fail=failure;
  await assert.rejects(service.update(doc.id,preview.confirmation),/请先在飞书检查/);assert.equal(remote.writes,1);assert.equal(service.preferences.last.status,'unknown');assert.ok(fs.existsSync(service.preferences.last.backupPath));
  const restarted=new Feishu(ws,{runner});assert.equal((await restarted.status(doc.id)).last.status,'unknown');assert.equal((await restarted.status(doc.id)).targetUrl,target);
  await assert.rejects(service.update(doc.id,preview.confirmation),/先读取/);assert.equal(remote.writes,1);
 }
});
test('overlapping writes are rejected while a confirmed update is in flight',async()=>{
 const {doc,service,remote}=updateFixture(),preview=await service.prepareUpdate(doc.id,target);let release;remote.gate=new Promise(resolve=>{release=resolve;});
 const pending=service.update(doc.id,preview.confirmation);
 await assert.rejects(service.update(doc.id,preview.confirmation),/正在进行/);await assert.rejects(service.upload(doc.id,''),/正在上传/);
 release();await pending;assert.equal(remote.writes,1);
});
