const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');const {Workspace}=require('../desktop/workspace.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'markdeck-images-'));
try{
const file=path.join(root,'报告.md');fs.writeFileSync(file,'正文');const workspace=new Workspace(path.join(root,'data'));const opened=workspace.open(file),id=opened.active;
const data='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5xkAAAAASUVORK5CYII=';
const {src}=workspace.attachments.store(id,data);assert.ok(!src.startsWith('data:'));assert.equal(workspace.attachments.read(id,src).data,data);assert.equal(workspace.attachments.store(id,data).src,src);
const snapshot=workspace.snapshot();snapshot.docs[0].body=`![图](${src})`;workspace.save(snapshot);
const destination=path.join(root,'copy');fs.mkdirSync(destination);const result=workspace.saveAs(id,path.join(destination,'副本.md'));const newSrc=result.docs[0].body.match(/\((.*?)\)/)[1];assert.equal(workspace.attachments.read(id,newSrc).data,data);assert.equal(fs.readFileSync(file,'utf8'),snapshot.docs[0].body);
assert.throws(()=>workspace.attachments.read(id,'../报告.md'));assert.throws(()=>workspace.attachments.read(id,'file:///etc/passwd'));assert.throws(()=>workspace.attachments.store('unknown',data));
fs.symlinkSync(root,path.join(destination,'escape'));assert.throws(()=>workspace.attachments.read(id,'escape/报告.md'));
// Same basename in separate folders must not collapse into one attachment.
for(const dir of ['one','two'])fs.mkdirSync(path.join(destination,dir));
fs.writeFileSync(path.join(destination,'one','photo.jpeg'),'first');fs.writeFileSync(path.join(destination,'two','photo.jpeg'),'second');
const edits=workspace.snapshot();edits.docs[0].body='![一](one/photo.jpeg)\n\n![二](two/photo.jpeg)';workspace.save(edits);
assert.match(workspace.attachments.read(id,'one/photo.jpeg').data,/^data:image\/jpeg;base64,/);
const finalDir=path.join(root,'final');fs.mkdirSync(finalDir);
const moved=workspace.saveAs(id,path.join(finalDir,'copied.md'));const links=[...moved.docs[0].body.matchAll(/\((.*?)\)/g)].map(match=>match[1]);
assert.notEqual(links[0],links[1]);assert.notEqual(workspace.attachments.read(id,links[0]).data,workspace.attachments.read(id,links[1]).data);
console.log('Attachment store/read, deduplication, save-as copy, original preservation and traversal protections passed.');
}finally{fs.rmSync(root,{recursive:true,force:true});}
