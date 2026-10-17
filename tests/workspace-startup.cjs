// Guards the ANR fix: when workspace.json references a filePath that is slow or
// unreadable (e.g. sandbox-approval protected folders in a packaged macOS build),
// the Workspace constructor MUST return promptly. External sync picks up changes
// 1.5 s later via the renderer. If someone refactors the startup readInto loop out
// of setImmediate, the app window will hang indefinitely waiting for approval.
const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {Workspace}=require('../desktop/workspace.cjs');
function mkroot(){return fs.mkdtempSync(path.join(os.tmpdir(),'markdeck-startup-'));}

test('constructor completes synchronously even when a doc.filePath is unreadable',()=>{
  const root=mkroot();try{
    const dataDir=path.join(root,'data');fs.mkdirSync(dataDir,{recursive:true});
    // Save a workspace.json that references a file that does not exist. If the
    // startup read were synchronous and the sandbox blocked on it, this call
    // would hang; if it threw, this test would fail with the thrown error.
    const ghostPath=path.join(root,'nope','ghost.md');
    fs.writeFileSync(path.join(dataDir,'workspace.json'),JSON.stringify({
      active:'doc-1',
      docs:[{id:'doc-1',title:'ghost',body:'previous body',updated:Date.now(),star:false,
             filePath:ghostPath,diskHash:'deadbeef',bom:false,eol:'\n',blocked:false}]
    }));
    const t0=Date.now();
    const workspace=new Workspace(dataDir);
    const elapsed=Date.now()-t0;
    assert.ok(elapsed<500,`constructor took ${elapsed}ms, should be <500ms`);
    assert.equal(workspace.state.docs.length,1);
    assert.equal(workspace.state.docs[0].body,'previous body','draft preserved when disk read fails');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('deferred startup read does not throw out of the constructor',async()=>{
  const root=mkroot();try{
    const dataDir=path.join(root,'data');fs.mkdirSync(dataDir,{recursive:true});
    const ghostPath=path.join(root,'nope','ghost.md');
    fs.writeFileSync(path.join(dataDir,'workspace.json'),JSON.stringify({
      active:'doc-1',
      docs:[{id:'doc-1',title:'ghost',body:'draft',updated:Date.now(),star:false,
             filePath:ghostPath,diskHash:'deadbeef',bom:false,eol:'\n',blocked:false}]
    }));
    // Catch any unhandled rejection the deferred readInto might emit.
    let caught=null;const handler=err=>{caught=err;};process.on('unhandledException',handler);
    const workspace=new Workspace(dataDir);
    await new Promise(resolve=>setImmediate(resolve));
    await new Promise(resolve=>setImmediate(resolve));
    process.removeListener('unhandledException',handler);
    assert.equal(caught,null);
    assert.equal(workspace.state.docs[0].body,'draft');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
