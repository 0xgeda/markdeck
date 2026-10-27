const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const {execFile}=require('node:child_process');
const {createHash,randomUUID}=require('node:crypto');
const {unescapeAll}=new (require('markdown-it'))().utils;
const {atomicWrite}=require('./workspace.cjs');const {prepareContent}=require('./feishu-content.cjs');const limits=require('./limits.cjs');
function executable(){for(const file of [...(process.env.PATH||'').split(path.delimiter).filter(Boolean).map(dir=>path.join(dir,'lark-cli')),'/opt/homebrew/bin/lark-cli','/usr/local/bin/lark-cli',path.join(os.homedir(),'.local/bin/lark-cli')])if(fs.existsSync(file))return file;return 'lark-cli';}
function run(args,{cwd=os.tmpdir()}={}){return new Promise((resolve,reject)=>{
  execFile(executable(),args,{cwd,timeout:limits.feishuTimeoutMs,maxBuffer:limits.feishuOutputBytes,env:{...process.env,PATH:[process.env.PATH,'/opt/homebrew/bin','/usr/local/bin'].filter(Boolean).join(path.delimiter),LARKSUITE_CLI_NO_UPDATE_NOTIFIER:'1',LARKSUITE_CLI_NO_SKILLS_NOTIFIER:'1'}},(error,stdout,stderr)=>{
    let value;try{value=JSON.parse(stdout||stderr);}catch{}
    if(error||value?.ok===false){const failure=new Error(error?.code==='ENOENT'?'尚未安装飞书连接工具，请先完成连接设置。':value?.error?.message||'飞书请求未完成，请检查连接或授权状态。');failure.kind=error?.code==='ENOENT'?'missing':'request';reject(failure);}
    else resolve(value??{});
  });
});}
function folderToken(input){if(!input)return '';if(typeof input!=='string')throw new Error('文件夹地址无效');try{const url=new URL(input);if(url.protocol!=='https:'||!/(^|\.)(feishu\.cn|larksuite\.com)$/.test(url.hostname))throw new Error();const match=url.pathname.match(/^\/drive\/folder\/([a-zA-Z0-9]+)\/?$/);if(!match)throw new Error();return match[1];}catch{throw new Error('请粘贴飞书云空间的文件夹链接，或留空使用我的空间。');}}
function documentUrl(input){
 try{if(typeof input!=='string')throw new Error();const url=new URL(input.trim());
  if(url.protocol!=='https:'||url.username||url.password||url.port||!/(^|\.)(feishu\.cn|larksuite\.com)$/.test(url.hostname)||!/^\/(docx|wiki)\/[a-zA-Z0-9]+\/?$/.test(url.pathname))throw new Error();
  url.search='';url.hash='';return url.href;
 }catch{throw new Error('请粘贴飞书文档或知识库文档链接（docx / wiki）。');}
}
function documentData(result){
 const doc=result.data?.document;
 if(!doc||typeof doc.document_id!=='string'||!/^[a-zA-Z0-9]+$/.test(doc.document_id)||!Number.isSafeInteger(doc.revision_id)||doc.revision_id<0||typeof doc.content!=='string')throw new Error('无法读取目标文档及版本，请确认链接指向可编辑的飞书云文档。');
 const title=doc.content.match(/<title\b[^>]*>([\s\S]*?)<\/title>/)?.[1];
 if(title===undefined)throw new Error('无法读取目标文档标题，请重新读取目标。');
 return {id:doc.document_id,revision:doc.revision_id,title:unescapeAll(title.replace(/<[^>]*>/g,''))};
}
const fingerprint=doc=>createHash('sha256').update(JSON.stringify([doc.id,doc.title,doc.body])).digest('hex');
const resultWarnings=result=>(result.data?.warnings||[]).map(w=>typeof w==='string'?w:JSON.stringify(w));
class Feishu{
 constructor(workspace,{runner=run}={}){this.workspace=workspace;this.run=runner;this.busy=false;this.auth=null;this.file=path.join(path.dirname(workspace.filename),'feishu.json');this.preferences={};if(fs.existsSync(this.file)){try{this.preferences=JSON.parse(fs.readFileSync(this.file,'utf8'));}catch{this.settingsError='飞书设置文件无法读取，原文件已保留。';}}}
 persist(){atomicWrite(this.file,JSON.stringify(this.preferences));}
 async status(id){if(this.settingsError)return {available:true,ready:false,error:this.settingsError};try{const status=await this.run(['auth','status','--json']),user=status.identities?.user;const account=user?.openId,same=!!account&&this.preferences.account===account;return {available:true,ready:!!user?.available,name:user?.userName||'',configured:same,folder:same?this.preferences.folder||'':'',targetUrl:same?this.preferences.targets?.[id]||'':'',last:same?this.preferences.last||null:null};}catch(error){return {available:error.kind!=='missing',ready:false,error:error.message};}}
 async connect(){const result=await this.run(['auth','login','--domain','docs','--domain','drive','--no-wait','--json']);const data=result.data||result;const url=data.verification_url||data.verification_uri_complete;if(!url||!data.device_code)throw new Error('无法获取飞书授权链接，请检查连接配置。');this.auth=data.device_code;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'markdeck-feishu-auth-'));try{await this.run(['auth','qrcode',url,'--output','qr.png'],{cwd:dir});return {url,qr:'data:image/png;base64,'+fs.readFileSync(path.join(dir,'qr.png')).toString('base64')};}finally{fs.rmSync(dir,{recursive:true,force:true});}}
 async finishConnect(){if(!this.auth)throw new Error('请重新发起连接');const code=this.auth;this.auth=null;await this.run(['auth','login','--device-code',code,'--json']);return this.status();}
 async upload(id,folder){if(this.busy)throw new Error('已有文档正在上传，请等待完成。');if(this.settingsError)throw new Error(this.settingsError);const token=folderToken(folder);this.busy=true;let dir,started=false;
 try{const state=await this.run(['auth','status','--json']),user=state.identities?.user;if(!user?.available)throw new Error('请先连接飞书账号');
 const doc=this.workspace.state.docs.find(doc=>doc.id===id);if(!doc)throw new Error('文档不存在');
 dir=fs.mkdtempSync(path.join(os.tmpdir(),'markdeck-feishu-'));const content=prepareContent(this.workspace,{...doc},dir);fs.writeFileSync(path.join(dir,'content.xml'),content.xml);
 this.preferences={...(this.preferences.account===user.openId?this.preferences:{}),account:user.openId,folder,last:{title:doc.title,mode:'create',status:'pending'}};this.persist();started=true;
 const args=['docs','+create','--as','user','--doc-format','xml','--content','@./content.xml',...(token?['--parent-token',token]:['--parent-position','my_library'])];
 const result=await this.run(args,{cwd:dir});const document=result.data?.document;if(!document?.url)throw new Error('飞书未返回文档链接');
 const url=new URL(document.url);if(url.protocol!=='https:'||!/(^|\.)(feishu\.cn|larksuite\.com)$/.test(url.hostname))throw new Error('返回的文档地址无效');
 const warnings=[...content.warnings,...resultWarnings(result)];this.preferences.last={title:doc.title,mode:'create',status:'complete',url:url.href,warnings};if(this.preferences.targets)delete this.preferences.targets[id];this.persist();return this.preferences.last;
 }catch(error){if(started){this.preferences.last.status='unknown';this.persist();throw new Error(error.message+' 上传可能已在飞书创建文档，请先检查目标位置，避免重复上传。');}throw error;}finally{this.busy=false;if(dir)fs.rmSync(dir,{recursive:true,force:true});}}
 currentDocument(id){const doc=this.workspace.state.docs.find(doc=>doc.id===id);if(!doc||this.workspace.state.active!==id)throw new Error('当前文档已切换，请关闭窗口后重新操作。');return doc;}
 async account(){const state=await this.run(['auth','status','--json']),user=state.identities?.user;if(!user?.available||!user.openId)throw new Error('请先连接飞书账号');return user.openId;}
 fetchTarget(url){return this.run(['docs','+fetch','--as','user','--doc',url,'--detail','full']);}
 async prepareUpdate(id,input){
  if(this.busy)throw new Error('已有飞书操作正在进行，请等待完成。');if(this.settingsError)throw new Error(this.settingsError);
  const url=documentUrl(input);this.busy=true;this.updatePreview=null;
  try{
   const account=await this.account(),source=fingerprint(this.currentDocument(id));
   const remote=documentData(await this.fetchTarget(url));
   if(source!==fingerprint(this.currentDocument(id)))throw new Error('本地文档已变化，请重新读取目标。');
   this.updatePreview={confirmation:randomUUID(),id,account,source,url,documentId:remote.id,revision:remote.revision};
   return {confirmation:this.updatePreview.confirmation,url,title:remote.title||'无标题文档'};
  }finally{this.busy=false;}
 }
 async update(id,confirmation){
  if(this.busy)throw new Error('已有飞书操作正在进行，请等待完成。');if(this.settingsError)throw new Error(this.settingsError);
  const preview=this.updatePreview;
  if(!preview||preview.id!==id||preview.confirmation!==confirmation)throw new Error('请先读取目标文档，再确认覆盖更新。');
  this.updatePreview=null;this.busy=true;let dir,started=false;
  try{
   const account=await this.account();if(account!==preview.account)throw new Error('飞书账号已变化，请重新读取目标。');
   const doc={...this.currentDocument(id)};if(fingerprint(doc)!==preview.source)throw new Error('本地文档已变化，请重新读取目标。');
   const before=await this.fetchTarget(preview.url),remote=documentData(before);
   if(remote.id!==preview.documentId||remote.revision!==preview.revision)throw new Error('飞书文档已被修改，请重新读取目标后再确认更新。');
   if(fingerprint(this.currentDocument(id))!==preview.source)throw new Error('本地文档已变化，请重新读取目标。');
   dir=fs.mkdtempSync(path.join(os.tmpdir(),'markdeck-feishu-update-'));
   const content=prepareContent(this.workspace,{...doc,title:remote.title},dir);fs.writeFileSync(path.join(dir,'content.xml'),content.xml);
   const args=['docs','+update','--as','user','--doc',remote.id,'--command','overwrite','--doc-format','xml','--content','@./content.xml','--revision-id',String(remote.revision)];
   await this.run([...args,'--dry-run'],{cwd:dir});
   if(fingerprint(this.currentDocument(id))!==preview.source)throw new Error('本地文档已变化，请重新读取目标。');
   const backupDir=path.join(path.dirname(this.file),'feishu-backups');fs.mkdirSync(backupDir,{recursive:true});
   const backupPath=path.join(backupDir,preview.confirmation+'.json');atomicWrite(backupPath,JSON.stringify({url:preview.url,savedAt:new Date().toISOString(),response:before}));
   this.preferences={...(this.preferences.account===account?this.preferences:{}),account};
   this.preferences.targets={...this.preferences.targets,[id]:preview.url};
   this.preferences.last={title:doc.title,mode:'update',status:'pending',url:preview.url,backupPath};this.persist();started=true;
   const result=await this.run(args,{cwd:dir});
   this.preferences.last.warnings=[...content.warnings,...resultWarnings(result)];
   if(result.data?.result!=='success')throw new Error(result.data?.result==='partial_success'?'飞书只完成了部分更新。':'飞书未确认完整更新。');
   const after=documentData(await this.fetchTarget(preview.url));
   if(after.id!==remote.id||after.revision<=remote.revision)throw new Error('无法核实更新后的文档版本。');
   this.preferences.last.status='complete';this.persist();return this.preferences.last;
  }catch(error){
   if(started){this.preferences.last.status='unknown';this.persist();throw new Error(error.message+' 目标文档可能已部分或全部改变，请先在飞书检查，再重新读取目标。');}
   throw error;
  }finally{this.busy=false;if(dir)fs.rmSync(dir,{recursive:true,force:true});}
 }
}
module.exports={Feishu,folderToken,documentUrl,run};
