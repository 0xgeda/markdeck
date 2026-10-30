const {app,BrowserWindow,Menu,dialog,ipcMain,protocol,net,session,nativeTheme,shell,clipboard}=require('electron');
const path=require('node:path');
const themePalettes=require('./themes.json');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const {Project}=require('./project.cjs');
const project=new Project();
const {Workspace,atomicWrite}=require('./workspace.cjs');
const {confirmClose}=require('./close-workspace.cjs');
const {ImageFix}=require('./image-fix.cjs');
const limits=require('./limits.cjs');
app.setName('Markdeck');
protocol.registerSchemesAsPrivileged([{scheme:'yun-jian',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
// Keep the previous data directory and renderer origin so renaming preserves drafts and preferences.
const dataDirectory=process.env.LARKDOWN_DATA_DIR||process.env.YUNJIAN_DATA_DIR||path.join(app.getPath('appData'),'云笺');
app.setPath('userData',path.resolve(dataDirectory));
const primary=app.requestSingleInstanceLock();
if(!primary)app.quit();
app.on('second-instance',()=>{window?.show();window?.focus();});
let window,workspace,allowClose=false,quitAfterClose=false,closeInProgress=false;
let rendererReady=false;
const pendingOpenFiles=[];
function deliverOpenFiles(){
  if(rendererReady&&window&&pendingOpenFiles.length)window.webContents.send('app:open-files',pendingOpenFiles.splice(0));
}
// Finder can deliver files before app.ready or before the editor has loaded.
app.on('open-file',(event,filename)=>{
  event.preventDefault();
  if(!primary)return;
  pendingOpenFiles.push(filename);
  if(workspace&&!window)createWindow();
  if(window){if(window.isMinimized())window.restore();window.show();window.focus();}
  deliverOpenFiles();
});
const startURL='yun-jian://app/index.html';
const filters=[{name:'Markdown 文档',extensions:['md','markdown','txt']}];
function action(name){window?.webContents.send('app:action',name);}
function createWindow(){
  allowClose=false;
  rendererReady=false;
  window=new BrowserWindow({width:1440,height:1000,minWidth:820,minHeight:600,show:false,title:'Markdeck',backgroundColor:'#ffffff',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,spellcheck:false,backgroundThrottling:true}});
  window.once('ready-to-show',()=>{window.maximize();window.show();});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',event=>event.preventDefault());
  window.on('close',event=>{if(!allowClose){event.preventDefault();action('close');}});
  window.on('closed',()=>{window=null;rendererReady=false;});
  window.webContents.on('did-start-loading',()=>{rendererReady=false;});
  window.loadURL(startURL);
}
function register(name,handler){ipcMain.handle(name,async(event,...args)=>{
  if(!window || event.sender!==window.webContents || event.senderFrame!==window.webContents.mainFrame || event.senderFrame.url!==startURL) throw new Error('请求来源无效');
  try{return {ok:true,...await handler(...args)};}catch(error){return {ok:false,error:error.message};}
});}
app.whenReady().then(()=>{
  if(!primary)return;
  try{workspace=new Workspace(app.getPath('userData'));}catch(error){dialog.showErrorBox('无法读取文档空间',`已有数据未被覆盖。\n${error.message}`);app.quit();return;}
  const root=path.resolve(__dirname,'../dist');
  protocol.handle('yun-jian',request=>{
    const url=new URL(request.url);
    const filename=path.resolve(root,'.'+decodeURIComponent(url.pathname));
    if(url.hostname!=='app' || !filename.startsWith(root+path.sep)) return new Response('Forbidden',{status:403});
    return net.fetch(pathToFileURL(filename).href);
  });
  session.defaultSession.setPermissionRequestHandler((contents,permission,callback)=>callback(permission==='fullscreen'&&contents===window?.webContents&&contents.getURL()===startURL));
  register('clipboard:write',text=>{if(typeof text!=='string')throw new Error('复制内容无效');clipboard.writeText(text);return {};});
  register('app:theme',theme=>{if(!Object.hasOwn(themePalettes,theme))throw new Error('皮肤无效');const palette=themePalettes[theme];nativeTheme.themeSource=palette.mode;window.setBackgroundColor(palette.page);return {};});
  // Archived 2026-10-17: presentation / deck handlers moved to archive/presentation/.
  // See archive/README.md for restoration steps.
  function logicPath(id){if(typeof id!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(id)||!workspace.state.docs.some(doc=>doc.id===id))throw new Error('文档不存在');const folder=path.join(app.getPath('userData'),'logic');fs.mkdirSync(folder,{recursive:true});return path.join(folder,id+'.json');}
  register('logic:load',id=>{const file=logicPath(id);return {state:fs.existsSync(file)?fs.readFileSync(file,'utf8'):null};});
  register('logic:save',(id,text)=>{if(typeof text!=='string'||Buffer.byteLength(text)>5*1024*1024)throw new Error('布局或批注过大');const state=JSON.parse(text);if(state.version!==1||!state.notes||!state.positions||!state.collapsed||!Number.isFinite(state.zoom)||state.zoom<.25||state.zoom>1.6)throw new Error('布局格式无效');for(const value of Object.values(state.notes))if(typeof value!=='string')throw new Error('批注格式无效');for(const point of Object.values(state.positions))if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.x<0||point.y<0||point.x>100000||point.y>100000)throw new Error('节点坐标无效');atomicWrite(logicPath(id),text);return {};});
  register('image:store',(id,data)=>workspace.attachments.store(id,data));
  register('image:read',(id,src)=>workspace.attachments.read(id,src));
  const imageFix=new ImageFix(workspace);
  register('image-fix:scan',id=>imageFix.scan(id));
  register('image-fix:locate',(id,folder)=>imageFix.locateFolder(id,folder));
  register('image-fix:import',(id,picks)=>imageFix.importBatch(id,picks));
  register('image-fix:delete',(id,raws)=>imageFix.deleteBatch(id,raws));
  register('image-fix:choose-folder',async()=>{const result=await dialog.showOpenDialog(window,{title:'选择图片所在文件夹',properties:['openDirectory']});if(result.canceled)return {canceled:true};return {folder:result.filePaths[0]};});
  register('workspace:versions',id=>({versions:workspace.versions(id)}));
  register('workspace:restore',(id,version)=>workspace.restore(id,version));
  register('document:export',async(title,html,format)=>{
    if(typeof title!=='string'||title.length>limits.maxTitleChars||typeof html!=='string'||Buffer.byteLength(html)>limits.maxExportHtmlBytes||!['html','pdf'].includes(format))throw new Error('导出内容无效');
    const name=(title.replace(/[\\/:*?"<>|]/g,'_')||'文档')+'.'+format;
    const result=await dialog.showSaveDialog(window,{title:'导出 '+format.toUpperCase(),defaultPath:path.join(app.getPath('documents'),name),filters:[{name:format.toUpperCase(),extensions:[format]}]});
    if(result.canceled)return {canceled:true};if(!result.filePath.toLowerCase().endsWith('.'+format))throw new Error('文件扩展名无效');
    if(!/<head(?:\s[^>]*)?>/i.test(html))throw new Error('导出页面缺少头部');
    html=html.replace(/<head(?:\s[^>]*)?>/i,`<head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:">`);
    if(format==='html'){atomicWrite(result.filePath,html);return {};}
    const printWindow=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,javascript:true}});
    printWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));printWindow.webContents.on('will-navigate',event=>event.preventDefault());
    try{
      await printWindow.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(html));
      await printWindow.webContents.executeJavaScript("Promise.all([document.fonts.ready,...Array.from(document.images,image=>image.complete?Promise.resolve():new Promise(resolve=>{image.onload=image.onerror=resolve}))])");
      const bytes=await printWindow.webContents.printToPDF({printBackground:true,pageSize:'A4',margins:{top:.5,bottom:.5,left:.5,right:.5}});atomicWrite(result.filePath,bytes);
    }finally{printWindow.destroy();}return {};
  });
  register('document:bundle',async id=>{
    const doc=workspace.attachments.doc(id);
    const result=await dialog.showSaveDialog(window,{title:'打包 Markdown 与图片',defaultPath:(doc.title.replace(/[\\/:*?"<>|]/g,'_')||'文档')+'.zip',filters:[{name:'ZIP 压缩包',extensions:['zip']}]});
    if(result.canceled)return {canceled:true};if(!/\.zip$/i.test(result.filePath))throw new Error('请选择 .zip 文件');
    const {bundleDocument}=require('./document-bundle.cjs');const bundle=await bundleDocument(workspace,id);atomicWrite(result.filePath,bundle.bytes);return {count:bundle.count,external:bundle.external};
  });
  register('project:choose',async()=>{
    const result=await dialog.showOpenDialog(window,{title:'打开文档文件夹',properties:['openDirectory']});
    if(result.canceled)return {canceled:true};return project.choose(result.filePaths[0]);
  });
  register('project:search',query=>project.search(query));
  register('project:refresh',()=>project.refresh());
  register('project:open',async relative=>({state:workspace.open(await project.resolve(relative))}));
  const feishu=new (require('./feishu.cjs').Feishu)(workspace);
  register('feishu:status',id=>feishu.status(id));
  register('feishu:connect',()=>feishu.connect());
  register('feishu:finish-connect',()=>feishu.finishConnect());
  register('feishu:upload',(id,folder)=>feishu.upload(id,folder));
  register('feishu:prepare-update',(id,url)=>feishu.prepareUpdate(id,url));
  register('feishu:update',(id,confirmation)=>feishu.update(id,confirmation));
  register('workspace:load',()=>({state:workspace.snapshot()}));
  register('app:ready',()=>{rendererReady=true;deliverOpenFiles();return {};});
  register('workspace:show-in-folder',id=>{
    const doc=workspace.state.docs.find(doc=>doc.id===id);
    if(!doc?.filePath)throw new Error('请先将文档保存到本地文件');
    if(!fs.existsSync(doc.filePath))throw new Error('原文件已移动或删除，请另存为后重试');
    shell.showItemInFolder(doc.filePath);return {};
  });
  register('app:open-external',async href=>{
    if(typeof href!=='string')throw new Error('链接无效');
    const url=new URL(href);
    if(!['https:','http:'].includes(url.protocol))throw new Error('仅支持在浏览器中打开 HTTP 或 HTTPS 链接');
    await shell.openExternal(url.href);return {};
  });
  register('workspace:sync',id=>workspace.sync(id));
  register('workspace:save',state=>workspace.save(state));
  register('workspace:open-dropped',filename=>{
    if(typeof filename!=='string'||!path.isAbsolute(filename))throw new Error('拖入文件路径无效');
    return {state:workspace.open(filename)};
  });
  register('workspace:open-system',filename=>{
    if(typeof filename!=='string'||!path.isAbsolute(filename))throw new Error('本地文件路径无效');
    return {state:workspace.open(filename)};
  });
  register('workspace:open',async()=>{
    const result=await dialog.showOpenDialog(window,{title:'打开 Markdown 文档',filters,properties:['openFile']});
    if(result.canceled) return {canceled:true};
    return {state:workspace.open(result.filePaths[0])};
  });
  register('workspace:save-as',async id=>{
    const d=workspace.state.docs.find(d=>d.id===id);
    if(!d)throw new Error('文档不存在');
    const filename=(d.title.replace(/[\\/:*?"<>|]/g,'_')||'无标题文档')+'.md';
    const result=await dialog.showSaveDialog(window,{title:'保存 Markdown 文件',defaultPath:d.filePath||path.join(app.getPath('documents'),filename),filters});
    if(result.canceled)return {canceled:true};
    return {state:workspace.saveAs(id,result.filePath)};
  });
  register('workspace:reload',async id=>{
    if(workspace.hasUnsavedChanges(id)){
      const result=await dialog.showMessageBox(window,{type:'question',message:'刷新将替换尚未写回的修改',detail:'选择取消可先另存为，保留编辑器中的版本；继续刷新会读取本地文件的最新内容。',buttons:['取消','继续刷新'],defaultId:0,cancelId:0});
      if(result.response!==1)return {canceled:true};
    }
    return {state:workspace.reload(id)};
  });
  register('app:finish-close',async result=>{
    if(closeInProgress)return {};
    closeInProgress=true;
    try{
      const decision=await confirmClose(workspace,dialog,window,result,app.getPath('documents'));
      if(!decision.close){quitAfterClose=false;return decision;}
      allowClose=true;window.close();if(quitAfterClose)app.quit();return {};
    }finally{closeInProgress=false;}
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {label:'Markdeck',submenu:[{role:'about'},{type:'separator'},{role:'hide'},{role:'hideOthers'},{role:'unhide'},{type:'separator'},{label:'退出Markdeck',accelerator:'CmdOrCtrl+Q',click:()=>{quitAfterClose=true;window?window.close():app.quit();}}]},
    {label:'文件',submenu:[{label:'新建文档',accelerator:'CmdOrCtrl+N',click:()=>action('new')},{label:'打开…',accelerator:'CmdOrCtrl+O',click:()=>action('open')},{label:'保存',accelerator:'CmdOrCtrl+S',click:()=>action('save')},{label:'进入展示模式',click:()=>action('presentation')},{label:'刷新本地文件',accelerator:'CmdOrCtrl+R',click:()=>action('refresh')},{label:'另存为…',accelerator:'CmdOrCtrl+Shift+S',click:()=>action('save-as')},{type:'separator'},{role:'close'}]},
    {label:'编辑',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},
    {label:'视图',submenu:[{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{type:'separator'},{role:'togglefullscreen'}]},
    {role:'windowMenu'}
  ]));
  createWindow();
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
app.on('activate',()=>{if(!window && workspace)createWindow();});
app.on('before-quit',event=>{if(window && !allowClose){quitAfterClose=true;event.preventDefault();window.close();}});
