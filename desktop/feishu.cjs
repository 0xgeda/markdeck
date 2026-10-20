const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const {execFile}=require('node:child_process');
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
class Feishu{
 constructor(workspace,{runner=run}={}){this.workspace=workspace;this.run=runner;this.busy=false;this.auth=null;this.file=path.join(path.dirname(workspace.filename),'feishu.json');this.preferences={};if(fs.existsSync(this.file)){try{this.preferences=JSON.parse(fs.readFileSync(this.file,'utf8'));}catch{this.settingsError='飞书设置文件无法读取，原文件已保留。';}}}
 persist(){atomicWrite(this.file,JSON.stringify(this.preferences));}
 async status(){if(this.settingsError)return {available:true,ready:false,error:this.settingsError};try{const status=await this.run(['auth','status','--json']),user=status.identities?.user;const account=user?.openId;return {available:true,ready:!!user?.available,name:user?.userName||'',configured:!!account&&this.preferences.account===account,folder:this.preferences.account===account?this.preferences.folder||'':'',last:this.preferences.account===account?this.preferences.last||null:null};}catch(error){return {available:error.kind!=='missing',ready:false,error:error.message};}}
 async connect(){const result=await this.run(['auth','login','--domain','docs','--domain','drive','--no-wait','--json']);const data=result.data||result;const url=data.verification_url||data.verification_uri_complete;if(!url||!data.device_code)throw new Error('无法获取飞书授权链接，请检查连接配置。');this.auth=data.device_code;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'markdeck-feishu-auth-'));try{await this.run(['auth','qrcode',url,'--output','qr.png'],{cwd:dir});return {url,qr:'data:image/png;base64,'+fs.readFileSync(path.join(dir,'qr.png')).toString('base64')};}finally{fs.rmSync(dir,{recursive:true,force:true});}}
 async finishConnect(){if(!this.auth)throw new Error('请重新发起连接');const code=this.auth;this.auth=null;await this.run(['auth','login','--device-code',code,'--json']);return this.status();}
 async upload(id,folder){if(this.busy)throw new Error('已有文档正在上传，请等待完成。');if(this.settingsError)throw new Error(this.settingsError);const token=folderToken(folder);this.busy=true;let dir,started=false;
 try{const state=await this.run(['auth','status','--json']),user=state.identities?.user;if(!user?.available)throw new Error('请先连接飞书账号');
 const doc=this.workspace.state.docs.find(doc=>doc.id===id);if(!doc)throw new Error('文档不存在');
 dir=fs.mkdtempSync(path.join(os.tmpdir(),'markdeck-feishu-'));const content=prepareContent(this.workspace,{...doc},dir);fs.writeFileSync(path.join(dir,'content.xml'),content.xml);
 this.preferences={account:user.openId,folder,last:{title:doc.title,status:'pending'}};this.persist();started=true;
 const args=['docs','+create','--as','user','--doc-format','xml','--content','@./content.xml',...(token?['--parent-token',token]:['--parent-position','my_library'])];
 const result=await this.run(args,{cwd:dir});const document=result.data?.document;if(!document?.url)throw new Error('飞书未返回文档链接');
 const url=new URL(document.url);if(url.protocol!=='https:'||!/(^|\.)(feishu\.cn|larksuite\.com)$/.test(url.hostname))throw new Error('返回的文档地址无效');
 const warnings=[...content.warnings,...(result.data.warnings||[]).map(w=>typeof w==='string'?w:JSON.stringify(w))];this.preferences.last={title:doc.title,status:'complete',url:url.href,warnings};this.persist();return this.preferences.last;
 }catch(error){if(started){this.preferences.last.status='unknown';this.persist();throw new Error(error.message+' 上传可能已在飞书创建文档，请先检查目标位置，避免重复上传。');}throw error;}finally{this.busy=false;if(dir)fs.rmSync(dir,{recursive:true,force:true});}}
}
module.exports={Feishu,folderToken,run};
