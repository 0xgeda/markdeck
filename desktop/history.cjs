const fs=require('node:fs');const path=require('node:path');const {randomUUID}=require('node:crypto');
const limits=require('./limits.cjs');
class History{
  constructor(directory,write){this.directory=path.join(directory,'history');this.write=write;fs.mkdirSync(this.directory,{recursive:true});}
  filename(id){if(!/^[a-zA-Z0-9-]{1,100}$/.test(id))throw new Error('文档编号无效');return path.join(this.directory,id+'.json');}
  list(id){const file=this.filename(id);return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):[];}
  record(doc,reason,force=false){if(!doc||typeof doc.body!=='string')return;let versions=this.list(doc.id);if(versions[0]?.body===doc.body)return;if(!force&&versions[0]&&Date.now()-versions[0].time<limits.historyMinIntervalMs)return;versions.unshift({id:randomUUID(),time:Date.now(),title:doc.title,body:doc.body,reason});versions=versions.slice(0,limits.historyMaxEntries);while(versions.length>1&&Buffer.byteLength(JSON.stringify(versions))>limits.historyMaxTotalBytes)versions.pop();this.write(this.filename(doc.id),JSON.stringify(versions));}
}
module.exports={History};
