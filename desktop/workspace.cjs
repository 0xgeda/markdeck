const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const hash = text => createHash('sha256').update(text).digest('hex');
const limits = require('./limits.cjs');
const MAX_FILE_SIZE = limits.maxDocumentBytes;
function atomicWrite(filename, content) {
  // Renaming a new file over an existing one only checks the directory's
  // permissions. Respect the target's read-only status before replacing it.
  if (fs.existsSync(filename)) fs.accessSync(filename, fs.constants.W_OK);
  const temp = path.join(path.dirname(filename), `.${path.basename(filename)}.${randomUUID()}.tmp`);
  const mode = fs.existsSync(filename) ? fs.statSync(filename).mode & 0o777 : 0o600;
  try {
    const fd = fs.openSync(temp, 'wx', mode);
    try { fs.writeFileSync(fd, content, 'utf8'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    fs.renameSync(temp, filename);
  } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}
function validateDocs(docs) {
  if (!Array.isArray(docs) || docs.length > 1000) throw new Error('文档列表无效');
  const ids = new Set();
  return docs.map(d => {
    if (!d || typeof d.id !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(d.id) || ids.has(d.id) || typeof d.title !== 'string' || d.title.length > limits.maxTitleChars || typeof d.body !== 'string' || Buffer.byteLength(d.body) > MAX_FILE_SIZE) throw new Error('文档内容无效或超过 10 MB');
    ids.add(d.id);
    return { id:d.id, title:d.title, body:d.body, updated:Number.isFinite(d.updated)?d.updated:Date.now(), star:Boolean(d.star), ...(typeof d.revision==='string'?{revision:d.revision}:{}) };
  });
}
class Workspace {
  constructor(directory) {
    fs.mkdirSync(directory, {recursive:true});
    this.attachments=new (require('./attachments.cjs').Attachments)(this,atomicWrite);
    this.history=new (require('./history.cjs').History)(directory,atomicWrite);
    this.filename = path.join(directory, 'workspace.json');
    this.state = {docs:[], active:null};
    if (fs.existsSync(this.filename)) {
      // A damaged workspace must never be silently replaced with an empty one.
      const stored = JSON.parse(fs.readFileSync(this.filename, 'utf8'));
      const docs = validateDocs(stored.docs);
      this.state = {docs:docs.map(d=>({...d, ...this.fileFields(stored.docs.find(x=>x.id===d.id))})), active:stored.active};
      // Deferred so a sandbox-approval hang on protected folders (Documents/Downloads)
      // cannot block app startup. Periodic sync in the renderer picks up external
      // changes within 1.5s anyway.
      setImmediate(() => {
        for (const d of this.state.docs) {
          if (!d.filePath || hash(this.encode(d)) !== d.diskHash) continue;
          try { const previous={...d};this.readInto(d,d.filePath);if(previous.body!==d.body)this.history.record(previous,'外部修改前',true); } catch { /* Keep the last saved copy when a file is unavailable. */ }
        }
      });
    }
  }
  fileFields(d) {
    if (!d?.filePath) return {};
    if (typeof d.filePath !== 'string' || !path.isAbsolute(d.filePath) || typeof d.diskHash !== 'string') throw new Error('本地文件关联无效');
    return {filePath:d.filePath, diskHash:d.diskHash, bom:Boolean(d.bom), eol:d.eol==='\r\n'?'\r\n':'\n', blocked:Boolean(d.blocked)};
  }
  snapshot() {
    return {active:this.state.active, docs:this.state.docs.map(({diskHash,bom,eol,blocked,revision,...d})=>({...d,...(diskHash?{revision:diskHash}:{})}))};
  }
  persist() { atomicWrite(this.filename, JSON.stringify(this.state)); }
  encode(d) { return (d.bom?'\ufeff':'') + d.body.replace(/\r?\n/g, d.eol || '\n'); }
  readInto(d, filename) {
    const canonical = fs.realpathSync(filename);
    const stat = fs.statSync(canonical);
    if (!stat.isFile() || stat.size > MAX_FILE_SIZE || !/\.(md|markdown|txt)$/i.test(canonical)) throw new Error('请选择不超过 10 MB 的 Markdown 或文本文件');
    const bytes = fs.readFileSync(canonical);
    const raw = new TextDecoder('utf-8', {fatal:true, ignoreBOM:true}).decode(bytes);
    Object.assign(d, {filePath:canonical, diskHash:hash(bytes), bom:raw.startsWith('\ufeff'), eol:raw.includes('\r\n')?'\r\n':'\n', blocked:false, body:raw.replace(/^\ufeff/,'').replace(/\r\n/g,'\n')});
  }
  open(filename) {
    const canonical = fs.realpathSync(filename);
    let d = this.state.docs.find(d=>d.filePath===canonical);
    if (d && hash(this.encode(d)) !== d.diskHash) throw new Error('此文档还有未写回的修改，请先另存为或重新读取');
    const isNew = !d;
    d ||= {id:randomUUID(), title:path.basename(canonical).replace(/\.(md|markdown|txt)$/i,''), updated:Date.now(), star:false};
    this.readInto(d, canonical);
    if (isNew) this.state.docs.unshift(d);
    this.state.active=d.id;this.persist();return this.snapshot();
  }
  save(snapshot) {
    const incoming = validateDocs(snapshot.docs);
    const known = new Map(this.state.docs.map(d=>[d.id,d]));
    if (incoming.length && !incoming.some(d=>d.id===snapshot.active)) throw new Error('当前文档无效');
    for(const doc of incoming){const previous=known.get(doc.id);if(previous&&previous.body!==doc.body)this.history.record(previous,'编辑前');}
    this.state={active:snapshot.active, docs:incoming.map(({revision,...d})=>{const previous=known.get(d.id);const next={...d,...this.fileFields(previous)};if(previous?.filePath && revision!==previous.diskHash && hash(this.encode(next))!==previous.diskHash)next.blocked=true;return next;})};
    // Save a recoverable draft before attempting any external file write.
    this.persist();
    const errors={};
    for (const d of this.state.docs) {
      if (!d.filePath) continue;
      const content=this.encode(d);
      if (hash(content)===d.diskHash) continue;
      try {
        if(d.blocked)throw new Error('检测到同时修改，已保留草稿；请另存为或刷新');
        if (!fs.existsSync(d.filePath)) throw new Error('原文件已移动或删除，请另存为');
        if (hash(fs.readFileSync(d.filePath))!==d.diskHash) throw new Error('文件已被其他软件修改，已保留草稿；请另存为或重新读取');
        atomicWrite(d.filePath, content);d.diskHash=hash(content);
      } catch(e) { errors[d.id]=e.message; }
    }
    this.persist();return {errors,state:this.snapshot()};
  }
  saveAs(id, filename) {
    const d=this.state.docs.find(d=>d.id===id);
    if (!d) throw new Error('文档不存在');
    if (!/\.(md|markdown|txt)$/i.test(filename)) throw new Error('文件扩展名必须为 .md、.markdown 或 .txt');
    const canonical=fs.existsSync(filename)?fs.realpathSync(filename):path.resolve(filename);
    if (this.state.docs.some(x=>x.id!==id && x.filePath===canonical)) throw new Error('这个文件已经在文档列表中，请选择其他位置');
    if (d.filePath===canonical && fs.existsSync(canonical) && hash(fs.readFileSync(canonical))!==d.diskHash) throw new Error('原文件已被其他软件修改，请选择新的文件位置');
    const body=this.attachments.relocate(d,canonical);atomicWrite(canonical,body);
    Object.assign(d,{body,filePath:canonical, diskHash:hash(body), bom:false, eol:'\n',blocked:false});
    this.persist();return this.snapshot();
  }
  sync(id) {
    const d=this.state.docs.find(d=>d.id===id);
    if(!d?.filePath)return {changed:false};
    try {
      const stat=fs.statSync(d.filePath);
      if(stat.size>MAX_FILE_SIZE)throw new Error('本地文件超过 10 MB，保留当前文档');
      const disk=fs.readFileSync(d.filePath);
      if(hash(disk)===d.diskHash)return {changed:false,clean:!this.hasUnsavedChanges(id)&&!d.blocked};
      if(this.hasUnsavedChanges(id))return {changed:false,error:'文件与编辑器同时有修改，已保留草稿；请另存为或刷新'};
      this.history.record(d,'外部修改前',true);this.readInto(d,d.filePath);d.updated=Date.now();this.persist();
      return {changed:true,doc:this.snapshot().docs.find(x=>x.id===id)};
    }catch(error){return {changed:false,error:error.code==='ENOENT'?'原文件已移动或删除，请另存为':error.message};}
  }
  versions(id){const d=this.state.docs.find(doc=>doc.id===id);if(!d)throw new Error('文档不存在');return this.history.list(id);}
  restore(id,versionId){
    const d=this.state.docs.find(doc=>doc.id===id),version=this.versions(id).find(v=>v.id===versionId);
    if(!version)throw new Error('历史版本不存在');
    if(d.filePath&&hash(fs.readFileSync(d.filePath))!==d.diskHash)throw new Error('原文件又有修改，请先刷新后再恢复');
    this.history.record(d,'恢复前',true);d.body=version.body;d.updated=Date.now();d.blocked=false;
    return this.save(this.snapshot());
  }
  hasUnsavedChanges(id) {
    const d=this.state.docs.find(d=>d.id===id);
    if(!d?.filePath)throw new Error('文档尚未关联本地文件');
    return hash(this.encode(d))!==d.diskHash;
  }
  reload(id) {
    const d=this.state.docs.find(d=>d.id===id);
    if (!d?.filePath) throw new Error('文档尚未关联本地文件');
    this.history.record(d,'外部修改前',true);this.readInto(d,d.filePath);d.updated=Date.now();this.persist();return this.snapshot();
  }
}
module.exports={Workspace,atomicWrite};
