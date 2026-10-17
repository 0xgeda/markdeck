// Candidate key choice: `candidates` is keyed by entry.raw (duplicate raws collapse to the same lookup;
// renderer may still map a single pick to multiple occurrences via importBatch's replaceAll).
const fs=require('node:fs');const path=require('node:path');const {createHash}=require('node:crypto');
const limits=require('./limits.cjs');
const EXT=new Set(['png','jpg','jpeg','webp','gif']);
const SKIP_DIRS=new Set(['node_modules','dist','release']);
const IMG_RE=/^!\[([^\]]*)\]\(\s*(<[^>\n]*>|[^\s()]+(?:\([^)]*\)[^\s()]*)*)?\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|\(((?:[^)\\]|\\.)*)\))?\s*\)$/;
function hashBytes(bytes){return createHash('sha256').update(bytes).digest('hex');}
function walkFolder(root){
  const map=new Map();let visited=0;
  const walk=(dir,depth)=>{
    if(depth>limits.folderScanMaxDepth||visited>=limits.folderScanMaxFiles)return;
    let entries;try{entries=fs.readdirSync(dir,{withFileTypes:true});}catch{return;}
    for(const entry of entries){
      if(visited>=limits.folderScanMaxFiles)return;
      if(entry.isSymbolicLink())continue;
      if(entry.name.startsWith('.'))continue;
      if(SKIP_DIRS.has(entry.name))continue;
      const file=path.join(dir,entry.name);
      if(entry.isDirectory()){walk(file,depth+1);continue;}
      if(!entry.isFile())continue;
      visited++;
      const ext=path.extname(entry.name).slice(1).toLowerCase();
      if(!EXT.has(ext))continue;
      const key=entry.name.toLowerCase();
      if(!map.has(key))map.set(key,file);
    }
  };
  walk(root,0);return map;
}
class ImageFix{
  constructor(workspace){this.workspace=workspace;}
  async scan(id){
    const doc=this.workspace.attachments.doc(id);
    const docDir=doc.filePath?path.dirname(doc.filePath):null;
    const {scanImages}=await import('../src/image-scan.js');
    return {entries:scanImages(doc.body,docDir),docDir};
  }
  async locateFolder(id,folderPath){
    if(typeof folderPath!=='string'||!path.isAbsolute(folderPath))throw new Error('请选择一个本地文件夹');
    let stat;try{stat=fs.statSync(folderPath);}catch{throw new Error('文件夹不存在');}
    if(!stat.isDirectory())throw new Error('请选择一个文件夹');
    const map=walkFolder(folderPath);
    const {entries}=await this.scan(id);
    const candidates={};
    for(const entry of entries){
      if(!['missing','absolute-outside','relative-outside'].includes(entry.status))continue;
      let decoded=entry.src;try{decoded=decodeURIComponent(entry.src);}catch{}
      const base=path.basename(decoded).toLowerCase();
      const match=map.get(base)||null;
      candidates[entry.raw]={src:entry.src,candidate:match};
    }
    return {candidates};
  }
  async importBatch(id,picks){
    const doc=this.workspace.attachments.doc(id);
    if(!doc.filePath)throw new Error('请先保存到本地文件再修复图片');
    if(!Array.isArray(picks)||picks.length>limits.maxImagePicks)throw new Error('选择的图片数量无效');
    const {scanImages}=await import('../src/image-scan.js');
    const preScan=scanImages(doc.body,path.dirname(doc.filePath));
    const kindByRaw=new Map(preScan.map(e=>[e.raw,e.kind]));
    const errors={};const validated=[];let total=0;
    for(const pick of picks){
      const raw=pick&&pick.raw,source=pick&&pick.sourcePath;
      if(typeof raw!=='string'||typeof source!=='string'){errors[String(raw)]='图片选择无效';continue;}
      if(kindByRaw.get(raw)==='html'){errors[raw]='HTML <img> 暂不支持自动替换，请用「删除选中」';continue;}
      try{
        if(!path.isAbsolute(source))throw new Error('图片路径必须是绝对路径');
        const st=fs.statSync(source);
        if(!st.isFile())throw new Error('选择的不是文件');
        const ext=path.extname(source).slice(1).toLowerCase();
        if(!EXT.has(ext))throw new Error('不支持的图片格式');
        if(st.size>limits.maxImageBytes)throw new Error('图片超过 10 MB');
        total+=st.size;
        validated.push({raw,source,ext,size:st.size});
      }catch(e){errors[raw]=e.message;}
    }
    if(total>limits.maxImageBatchBytes)throw new Error('本次导入的图片总大小超过 100 MB');
    const folder=this.workspace.attachments.folder(doc.filePath);
    const parent=fs.realpathSync(folder);
    if(path.dirname(parent)!==fs.realpathSync(path.dirname(doc.filePath)))throw new Error('附件目录不能指向其他位置');
    const written=[],tempFiles=[],imported=[];
    try{
      for(const item of validated){
        const bytes=fs.readFileSync(item.source);
        const name=hashBytes(bytes).slice(0,24)+'.'+(item.ext==='jpeg'?'jpeg':item.ext);
        const target=path.join(folder,name);
        if(fs.existsSync(target)){
          // Validate pre-existing file: must be a regular file inside the attachments folder (no symlinks escaping).
          const real=fs.realpathSync(target);
          if(path.dirname(real)!==parent||!fs.statSync(real).isFile())throw new Error('目标附件路径异常');
        }else{
          const tmp=target+'.'+Date.now()+'.'+Math.random().toString(36).slice(2)+'.tmp';
          tempFiles.push(tmp);
          fs.writeFileSync(tmp,bytes);fs.renameSync(tmp,target);
          tempFiles.pop();written.push(target);
        }
        const newSrc=encodeURI(path.relative(path.dirname(doc.filePath),target).split(path.sep).join('/'));
        imported.push({raw:item.raw,newSrc,target});
      }
    }catch(error){
      for(const file of tempFiles){try{fs.unlinkSync(file);}catch{}}
      for(const file of written){try{fs.unlinkSync(file);}catch{}}
      throw error;
    }
    // Index-based replacement: re-scan body so the scanner's code/comment mask applies to replacements too.
    // We replace by (index, length) in reverse order so earlier offsets stay valid.
    const entries=scanImages(doc.body,path.dirname(doc.filePath));
    const targetSrcByRaw=new Map(imported.map(e=>[e.raw,e.newSrc]));
    const edits=[];
    for(const entry of entries){
      if(entry.kind==='html')continue;
      if(!targetSrcByRaw.has(entry.raw))continue;
      const m=entry.raw.match(IMG_RE);const alt=m?m[1]||'':'',title=m?(m[3]??m[4]??m[5]??null):null;
      const newSrc=targetSrcByRaw.get(entry.raw);
      const replacement=title!=null?`![${alt}](${newSrc} "${title}")`:`![${alt}](${newSrc})`;
      edits.push({index:entry.index,length:entry.length,replacement});
    }
    edits.sort((a,b)=>b.index-a.index);
    let newBody=doc.body;
    for(const edit of edits)newBody=newBody.slice(0,edit.index)+edit.replacement+newBody.slice(edit.index+edit.length);
    return {imported,errors,newBody};
  }
  async deleteBatch(id,raws){
    const doc=this.workspace.attachments.doc(id);
    if(!doc.filePath)throw new Error('请先保存到本地文件再删除图片');
    if(!Array.isArray(raws)||!raws.length)throw new Error('没有可删除的图片');
    if(raws.length>limits.maxImagePicks)throw new Error('一次删除的图片过多');
    const set=new Set(raws);
    const {scanImages}=await import('../src/image-scan.js');
    const entries=scanImages(doc.body,path.dirname(doc.filePath));
    const edits=[];
    for(const entry of entries){
      if(!set.has(entry.raw))continue;
      let start=entry.index,end=entry.index+entry.length;
      // Consume whole-line whitespace if the image is the only content on its line.
      while(start>0&&(doc.body[start-1]===' '||doc.body[start-1]==='\t'))start--;
      const atLineStart=start===0||doc.body[start-1]==='\n';
      const atLineEnd=end===doc.body.length||doc.body[end]==='\n';
      if(atLineStart&&atLineEnd&&end<doc.body.length)end++;
      edits.push({start,end});
    }
    edits.sort((a,b)=>b.start-a.start);
    let newBody=doc.body;
    for(const e of edits)newBody=newBody.slice(0,e.start)+newBody.slice(e.end);
    return {ok:true,removed:edits.length,newBody};
  }
}
module.exports={ImageFix};
