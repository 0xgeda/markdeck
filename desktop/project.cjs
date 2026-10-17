const fs=require('node:fs/promises');
const path=require('node:path');
const limits=require('./limits.cjs');
class Project{
  constructor(){this.root=null;this.files=new Set();this.truncated=false;this.revision=0;}
  async choose(directory){return this.scan(directory);}
  async refresh(){
    if(!this.root)throw new Error('请先打开文件夹');
    return this.scan(this.root);
  }
  async scan(directory){
    const revision=++this.revision,root=await fs.realpath(directory);
    const files=new Set();let entries=0,truncated=false;
    const walk=async(directory,depth)=>{
      if(depth>12){truncated=true;return;}
      const children=await fs.readdir(directory,{withFileTypes:true});
      for(const child of children){
        if(++entries>10000||files.size>=2000){truncated=true;return;}
        if(child.name.startsWith('.')||['node_modules','dist','release'].includes(child.name)||child.isSymbolicLink())continue;
        const file=path.join(directory,child.name);
        if(child.isDirectory()){try{await walk(file,depth+1);}catch{/* unreadable subfolder */}}
        else if(child.isFile()&&/\.(md|markdown|txt)$/i.test(child.name))files.add(path.relative(root,file));
      }
    };
    await walk(root,0);if(revision!==this.revision)throw new Error('已切换到另一个文件夹');this.root=root;this.files=files;this.truncated=truncated;return this.search('');
  }
  async resolve(relative,root=this.root,files=this.files){
    if(!root||typeof relative!=='string'||!files.has(relative))throw new Error('文件不在已打开的文件夹中');
    const file=await fs.realpath(path.join(root,relative));
    if(!file.startsWith(root+path.sep))throw new Error('文件已移出文件夹');
    return file;
  }
  async search(query){
    if(typeof query!=='string'||query.length>200)throw new Error('搜索词过长');
    const {root,files,truncated}=this;
    const needle=query.trim().toLowerCase(),results=[];let scanned=0,skipped=0;
    for(const relative of [...files].sort()){
      if(!needle){results.push({path:relative});continue;}
      let found=relative.toLowerCase().includes(needle),line=0,snippet='';
      try{
        const file=await this.resolve(relative,root,files),stat=await fs.stat(file);
        if(stat.size<=limits.projectSearchFileBytes&&scanned+stat.size<=limits.projectSearchBudgetBytes){
          scanned+=stat.size;const text=await fs.readFile(file,'utf8'),lines=text.split(/\r?\n/);
          const index=lines.findIndex(value=>value.toLowerCase().includes(needle));
          if(index>=0){found=true;line=index+1;const offset=Math.max(0,lines[index].toLowerCase().indexOf(needle)-40);snippet=lines[index].slice(offset,offset+160);}
        }else skipped++;
      }catch{skipped++;}
      if(found)results.push({path:relative,line,snippet});
      if(results.length>=limits.projectSearchMaxResults)break;
    }
    return {folder:root,results,truncated:truncated||results.length>=200&&!!needle,skipped};
  }
}
module.exports={Project};
