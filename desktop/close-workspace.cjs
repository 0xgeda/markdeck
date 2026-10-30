const fs=require('node:fs');
const path=require('node:path');
const limits=require('./limits.cjs');

async function saveCopies(workspace,pending,dialog,window,documentsDirectory){
  if(pending.length===1){
    const doc=pending[0],name=path.parse(doc.filePath);
    const result=await dialog.showSaveDialog(window,{title:'保存文档副本',defaultPath:path.join(documentsDirectory,name.name+'-副本'+name.ext),filters:[{name:'Markdown 文档',extensions:['md','markdown','txt']}]});
    if(result.canceled)return false;
    const target=fs.existsSync(result.filePath)?fs.realpathSync(result.filePath):path.resolve(result.filePath);
    if(target===doc.filePath)throw new Error('请为副本选择一个新文件，保留原文件');
    workspace.saveAs(doc.id,target);
  }else{
    const result=await dialog.showOpenDialog(window,{title:'选择文档副本的保存位置',defaultPath:documentsDirectory,properties:['openDirectory','createDirectory']});
    if(result.canceled)return false;
    const folder=fs.mkdtempSync(path.join(result.filePaths[0],'Markdeck 文档副本-'));
    for(const doc of pending){
      const name=path.parse(doc.filePath);let target=path.join(folder,name.base),index=2;
      while(fs.existsSync(target))target=path.join(folder,`${name.name} (${index++})${name.ext}`);
      workspace.saveAs(doc.id,target);
    }
  }
  return true;
}

async function confirmClose(workspace,dialog,window,result,documentsDirectory){
  // An unpersisted editor must never be covered by an earlier acknowledgment.
  if(!result?.ok){
    const answer=await dialog.showMessageBox(window,{type:'warning',message:'保存未完成',detail:'关闭可能丢失最新修改，请返回文档检查保存状态。',buttons:['返回文档','仍然关闭'],defaultId:0,cancelId:0});
    return {close:answer.response===1};
  }
  const pending=workspace.pendingWrites();
  if(!pending.some(doc=>!doc.acknowledged))return {close:true};
  const state=()=>({state:workspace.snapshot(),errors:Object.fromEntries(workspace.pendingWrites().map(doc=>[doc.id,doc.error]))});
  const listed=pending.slice(0,limits.maxCloseIssueDetails).map(doc=>`「${doc.title}」\n${doc.filePath}\n${doc.error}`).join('\n\n');
  const more=pending.length>limits.maxCloseIssueDetails?`\n\n另有 ${pending.length-limits.maxCloseIssueDetails} 份文档。`:'';
  const answer=await dialog.showMessageBox(window,{
    type:'warning',message:'有修改尚未写回原文件',
    detail:`${listed}${more}\n\n上述修改已保存在应用草稿中。可直接保存副本；选择保留草稿并关闭后，相同内容不再重复提醒，有新修改时仍会提醒。`,
    buttons:['返回文档','保留草稿并关闭','保存副本并关闭'],defaultId:2,cancelId:0
  });
  try{
    if(answer.response===1){workspace.acknowledgeDrafts(pending);return {close:true};}
    if(answer.response===2){
      if(!await saveCopies(workspace,pending,dialog,window,documentsDirectory))return {close:false,...state()};
      return {close:true};
    }
  }catch(error){
    await dialog.showMessageBox(window,{type:'error',message:answer.response===2?'副本保存未完成':'无法保存关闭选择',detail:`${error.message}\n\n窗口保持打开，草稿继续保留。${answer.response===2?'已保存成功的副本也会保留。':''}`,buttons:['返回文档']});
  }
  return {close:false,...state()};
}

module.exports={confirmClose};
