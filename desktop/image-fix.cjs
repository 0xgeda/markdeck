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
    const errors={};const validated=[];let total=0;
    for(const pick of picks){
      const raw=pick&&pick.raw,source=pick&&pick.sourcePath;
      if(typeof raw!=='string'||typeof source!=='string'){errors[String(raw)]='图片选择无效';continue;}
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
    const written=[];const imported=[];
    try{
      for(const item of validated){
        const bytes=fs.readFileSync(item.source);
        const name=hashBytes(bytes).slice(0,24)+'.'+(item.ext==='jpeg'?'jpeg':item.ext);
        const target=path.join(folder,name);
        const existed=fs.existsSync(target);
        if(!existed){
          const tmp=target+'.'+Date.now()+'.'+Math.random().toString(36).slice(2)+'.tmp';
          fs.writeFileSync(tmp,bytes);fs.renameSync(tmp,target);
          written.push(target);
        }
        const newSrc=encodeURI(path.relative(path.dirname(doc.filePath),target).split(path.sep).join('/'));
        imported.push({raw:item.raw,newSrc,target});
      }
    }catch(error){
      for(const file of written){try{fs.unlinkSync(file);}catch{}}
      throw error;
    }
    let newBody=doc.body;
    for(const entry of imported){
      const m=entry.raw.match(IMG_RE);
      let replacement;
      if(m){
        const alt=m[1]||'';const title=m[3]??m[4]??m[5]??null;
        replacement=title!=null?`![${alt}](${entry.newSrc} "${title}")`:`![${alt}](${entry.newSrc})`;
      }else{
        replacement=`![](${entry.newSrc})`;
      }
      newBody=newBody.split(entry.raw).join(replacement);
    }
    return {imported,errors,newBody};
  }
}
module.exports={ImageFix};
