const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('desktop', {
  storeImage:(id,data)=>ipcRenderer.invoke('image:store',id,data),
  readImage:(id,src)=>ipcRenderer.invoke('image:read',id,src),
  loadLogic:id=>ipcRenderer.invoke('logic:load',id),
  saveLogic:(id,state)=>ipcRenderer.invoke('logic:save',id,state),
  versions:id=>ipcRenderer.invoke('workspace:versions',id),
  restore:(id,version)=>ipcRenderer.invoke('workspace:restore',id,version),
  exportDocument:(title,html,format)=>ipcRenderer.invoke('document:export',title,html,format),
  loadDeck:id=>ipcRenderer.invoke('deck:load',id),
  saveDeck:(id,draft)=>ipcRenderer.invoke('deck:save',id,draft),
  exportPptx:(title,data)=>ipcRenderer.invoke('deck:export-pptx',title,data),
  exportPresentation:(title,html)=>ipcRenderer.invoke('presentation:export',title,html),
  setTheme:theme=>ipcRenderer.invoke('app:theme',theme),
  load:()=>ipcRenderer.invoke('workspace:load'),
  sync:id=>ipcRenderer.invoke('workspace:sync',id),
  save:state=>ipcRenderer.invoke('workspace:save',state),
  open:()=>ipcRenderer.invoke('workspace:open'),
  saveAs:id=>ipcRenderer.invoke('workspace:save-as',id),
  reload:id=>ipcRenderer.invoke('workspace:reload',id),
  onAction:callback=>{const handler=(_event,action)=>callback(action);ipcRenderer.on('app:action',handler);return ()=>ipcRenderer.removeListener('app:action',handler);},
  finishClose:result=>ipcRenderer.invoke('app:finish-close',result)
});
