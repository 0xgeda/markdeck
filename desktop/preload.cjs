const {contextBridge,ipcRenderer,webUtils}=require('electron');
let droppedFileHandler;
const droppedFiles=new Map();
window.addEventListener('drop',event=>{
  const files=Array.from(event.dataTransfer?.files||[]);
  if(!files.length||files.every(file=>file.type.startsWith('image/')))return;
  event.preventDefault();event.stopImmediatePropagation();
  document.querySelector('.document-drop-overlay')?.remove();
  const tokens=files.map(file=>{const token=crypto.randomUUID();droppedFiles.set(token,webUtils.getPathForFile(file));return token;});
  Promise.resolve(droppedFileHandler?.(tokens)).finally(()=>tokens.forEach(token=>droppedFiles.delete(token)));
},true);
contextBridge.exposeInMainWorld('desktop', {
  feishuStatus:()=>ipcRenderer.invoke('feishu:status'),
  feishuConnect:()=>ipcRenderer.invoke('feishu:connect'),
  feishuFinishConnect:()=>ipcRenderer.invoke('feishu:finish-connect'),
  feishuUpload:(id,folder)=>ipcRenderer.invoke('feishu:upload',id,folder),
  bundleDocument:id=>ipcRenderer.invoke('document:bundle',id),
  chooseProject:()=>ipcRenderer.invoke('project:choose'),
  searchProject:query=>ipcRenderer.invoke('project:search',query),
  refreshProject:()=>ipcRenderer.invoke('project:refresh'),
  openProjectFile:relative=>ipcRenderer.invoke('project:open',relative),
  storeImage:(id,data)=>ipcRenderer.invoke('image:store',id,data),
  readImage:(id,src)=>ipcRenderer.invoke('image:read',id,src),
  loadLogic:id=>ipcRenderer.invoke('logic:load',id),
  saveLogic:(id,state)=>ipcRenderer.invoke('logic:save',id,state),
  versions:id=>ipcRenderer.invoke('workspace:versions',id),
  restore:(id,version)=>ipcRenderer.invoke('workspace:restore',id,version),
  exportDocument:(title,html,format)=>ipcRenderer.invoke('document:export',title,html,format),
  scanImages:id=>ipcRenderer.invoke('image-fix:scan',id),
  locateImageFolder:(id,folder)=>ipcRenderer.invoke('image-fix:locate',id,folder),
  importImages:(id,picks)=>ipcRenderer.invoke('image-fix:import',id,picks),
  deleteImages:(id,raws)=>ipcRenderer.invoke('image-fix:delete',id,raws),
  chooseImageFolder:()=>ipcRenderer.invoke('image-fix:choose-folder'),
  // Archived 2026-10-17: deck/presentation surface moved to archive/presentation/.
  // loadDeck:id=>ipcRenderer.invoke('deck:load',id),
  // saveDeck:(id,draft)=>ipcRenderer.invoke('deck:save',id,draft),
  // exportPptx:(title,data)=>ipcRenderer.invoke('deck:export-pptx',title,data),
  // exportPresentation:(title,html)=>ipcRenderer.invoke('presentation:export',title,html),
  setTheme:theme=>ipcRenderer.invoke('app:theme',theme),
  load:()=>ipcRenderer.invoke('workspace:load'),
  sync:id=>ipcRenderer.invoke('workspace:sync',id),
  save:state=>ipcRenderer.invoke('workspace:save',state),
  onDroppedFiles:callback=>{droppedFileHandler=callback;},
  openDroppedFile:token=>{const filename=droppedFiles.get(token);if(!filename)return Promise.resolve({ok:false,error:'无法读取拖入文件的本地路径'});return ipcRenderer.invoke('workspace:open-dropped',filename);},
  open:()=>ipcRenderer.invoke('workspace:open'),
  showInFolder:id=>ipcRenderer.invoke('workspace:show-in-folder',id),
  openExternal:href=>ipcRenderer.invoke('app:open-external',href),
  saveAs:id=>ipcRenderer.invoke('workspace:save-as',id),
  reload:id=>ipcRenderer.invoke('workspace:reload',id),
  onAction:callback=>{const handler=(_event,action)=>callback(action);ipcRenderer.on('app:action',handler);return ()=>ipcRenderer.removeListener('app:action',handler);},
  finishClose:result=>ipcRenderer.invoke('app:finish-close',result)
});
