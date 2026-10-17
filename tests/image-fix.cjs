const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {Workspace}=require('../desktop/workspace.cjs');const {ImageFix}=require('../desktop/image-fix.cjs');
function mkroot(){return fs.mkdtempSync(path.join(os.tmpdir(),'markdeck-fix-'));}
function setup(body){
  const root=mkroot();const file=path.join(root,'note.md');fs.writeFileSync(file,body);
  const workspace=new Workspace(path.join(root,'data'));const opened=workspace.open(file);
  return {root,file,workspace,id:opened.active,fix:new ImageFix(workspace)};
}

test('scan returns entries whose shape matches B.1',async()=>{
  const {root,fix,id}=setup('![alt](missing.png)');try{
    const {entries,docDir}=await fix.scan(id);
    assert.equal(entries.length,1);const e=entries[0];
    for(const key of ['raw','src','alt','title','line','column','status'])assert.ok(key in e,`missing ${key}`);
    assert.equal(e.src,'missing.png');assert.equal(e.alt,'alt');assert.equal(e.status,'missing');
    assert.equal(typeof docDir,'string');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('locateFolder finds image basename case-insensitively',async()=>{
  const {root,fix,id}=setup('![](Photo.PNG)');try{
    const external=path.join(root,'extern');fs.mkdirSync(external);
    const srcFile=path.join(external,'photo.png');fs.writeFileSync(srcFile,'xxx');
    const {candidates}=await fix.locateFolder(id,external);
    const keys=Object.keys(candidates);assert.equal(keys.length,1);
    assert.equal(candidates[keys[0]].candidate,srcFile);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('importBatch copies file and rewrites body',async()=>{
  const {root,fix,id,workspace}=setup('![](missing.png)');try{
    const external=path.join(root,'extern');fs.mkdirSync(external);
    const srcFile=path.join(external,'missing.png');fs.writeFileSync(srcFile,'hello');
    const raw='![](missing.png)';
    const {imported,errors,newBody}=await fix.importBatch(id,[{raw,sourcePath:srcFile}]);
    assert.equal(Object.keys(errors).length,0);assert.equal(imported.length,1);
    assert.match(newBody,/!\[\]\(note\.assets\/[0-9a-f]{24}\.png\)/);
    assert.ok(fs.existsSync(imported[0].target));
    assert.equal(workspace.state.docs[0].body,'![](missing.png)','workspace.state untouched');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('importBatch preserves alt and title',async()=>{
  const {root,fix,id}=setup('![caption](miss.png "tip")');try{
    const external=path.join(root,'extern');fs.mkdirSync(external);
    const srcFile=path.join(external,'miss.png');fs.writeFileSync(srcFile,'bytes');
    const raw='![caption](miss.png "tip")';
    const {newBody,imported}=await fix.importBatch(id,[{raw,sourcePath:srcFile}]);
    assert.ok(newBody.startsWith('![caption]('),newBody);
    assert.ok(newBody.includes('"tip"'),newBody);
    assert.ok(newBody.includes(imported[0].newSrc));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('importBatch throws on oversized source',async()=>{
  const {root,fix,id}=setup('![](big.png)');try{
    const external=path.join(root,'extern');fs.mkdirSync(external);
    const srcFile=path.join(external,'big.png');
    const buf=Buffer.alloc(10*1024*1024+1024);fs.writeFileSync(srcFile,buf);
    const {errors,imported}=await fix.importBatch(id,[{raw:'![](big.png)',sourcePath:srcFile}]);
    assert.equal(imported.length,0);assert.match(errors['![](big.png)'],/10 MB/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('importBatch throws on batch total >100 MB',async()=>{
  const {root,fix,id}=setup('![](a.png)\n![](b.png)\n![](c.png)\n![](d.png)\n![](e.png)\n![](f.png)\n![](g.png)\n![](h.png)\n![](i.png)\n![](j.png)\n![](k.png)\n![](l.png)');try{
    const external=path.join(root,'extern');fs.mkdirSync(external);
    const picks=[];const buf=Buffer.alloc(9*1024*1024);
    for(const name of ['a','b','c','d','e','f','g','h','i','j','k','l']){
      const file=path.join(external,name+'.png');fs.writeFileSync(file,Buffer.concat([buf,Buffer.from(name)]));
      picks.push({raw:`![](${name}.png)`,sourcePath:file});
    }
    await assert.rejects(fix.importBatch(id,picks),/100 MB/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('importBatch records error for non-existent sourcePath but continues',async()=>{
  const {root,fix,id}=setup('![](x.png)\n![](y.png)');try{
    const external=path.join(root,'extern');fs.mkdirSync(external);
    const good=path.join(external,'y.png');fs.writeFileSync(good,'yy');
    const missing=path.join(external,'nope.png');
    const {imported,errors,newBody}=await fix.importBatch(id,[
      {raw:'![](x.png)',sourcePath:missing},
      {raw:'![](y.png)',sourcePath:good}
    ]);
    assert.equal(imported.length,1);assert.equal(imported[0].raw,'![](y.png)');
    assert.ok(errors['![](x.png)']);
    assert.ok(newBody.includes('![](x.png)'));
    assert.ok(!newBody.includes('![](y.png)'));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('duplicate raw in body: single pick rewrites all occurrences',async()=>{
  const {root,fix,id}=setup('![](d.png)\n\n![](d.png)');try{
    const external=path.join(root,'extern');fs.mkdirSync(external);
    const file=path.join(external,'d.png');fs.writeFileSync(file,'dd');
    const {newBody}=await fix.importBatch(id,[{raw:'![](d.png)',sourcePath:file}]);
    assert.equal(newBody.split('d.png').length,1,'original src should not remain');
    const occurrences=newBody.match(/note\.assets/g);assert.equal(occurrences.length,2);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('content hash dedupe: two calls produce same filename, no double copy',async()=>{
  const {root,fix,id,workspace}=setup('![](one.png)');try{
    const external=path.join(root,'extern');fs.mkdirSync(external);
    const srcFile=path.join(external,'one.png');fs.writeFileSync(srcFile,'identical');
    const first=await fix.importBatch(id,[{raw:'![](one.png)',sourcePath:srcFile}]);
    // simulate renderer having saved and body being unchanged for second attempt
    const second=await fix.importBatch(id,[{raw:'![](one.png)',sourcePath:srcFile}]);
    assert.equal(first.imported[0].target,second.imported[0].target);
    const files=fs.readdirSync(path.join(path.dirname(workspace.state.docs[0].filePath),'note.assets'));
    assert.equal(files.filter(f=>f.endsWith('.png')).length,1);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('importBatch does not touch identical strings inside fenced code blocks',async()=>{
  const body='![](shot.png)\n\n```md\n![](shot.png)\n```\n\n`![](shot.png)`';
  const {root,fix,id}=setup(body);try{
    const external=path.join(root,'extern');fs.mkdirSync(external);
    const file=path.join(external,'shot.png');fs.writeFileSync(file,'xx');
    const {newBody}=await fix.importBatch(id,[{raw:'![](shot.png)',sourcePath:file}]);
    const fenced=newBody.split('```md\n')[1].split('\n```')[0];
    assert.equal(fenced.trim(),'![](shot.png)','fenced code block must stay literal');
    assert.ok(newBody.includes('`![](shot.png)`'),'inline code must stay literal');
    assert.ok(/^!\[\]\(note\.assets\//.test(newBody),'first occurrence outside code must be replaced');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('importBatch throws if doc has no filePath',async()=>{
  const root=mkroot();try{
    const workspace=new Workspace(path.join(root,'data'));
    // Create an unsaved doc via save() with no filePath.
    const id='doc-xyz';
    workspace.state.docs.push({id,title:'t',body:'![](x.png)',updated:Date.now(),star:false});
    const fix=new ImageFix(workspace);
    await assert.rejects(fix.importBatch(id,[]),/请先保存到本地文件/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
