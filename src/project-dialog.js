export async function openProject(onOpen,onLocate=()=>{}){
  if(document.querySelector('.project-dialog'))return;
  const dialog=document.createElement('dialog');dialog.className='project-dialog';
  dialog.innerHTML='<header><div><h3>文档文件夹</h3><p data-folder hidden></p></div><button data-close aria-label="关闭文件夹">×</button></header><div class="project-tools"><button data-choose>选择文件夹</button><button data-refresh>刷新</button><input data-query aria-label="搜索文件夹" placeholder="搜索文件名或正文…"></div><p data-status role="status"></p><div data-results></div>';
  document.body.append(dialog);dialog.showModal();
  const status=dialog.querySelector('[data-status]'),list=dialog.querySelector('[data-results]'),query=dialog.querySelector('[data-query]');let revision=0,timer,closed=false,busy=false;
  function render(result,searchTerm){
    if(!result.ok)throw new Error(result.error);
    const folder=dialog.querySelector('[data-folder]');folder.textContent=result.folder||'';folder.hidden=!result.folder;
    status.textContent=result.folder?`${result.results.length} 份文档`+(result.truncated?' · 结果较多，请缩小搜索范围':'')+(result.skipped?` · ${result.skipped} 份文档过大或无法读取，未搜索正文`:''):'请选择文档文件夹';list.replaceChildren();
    for(const item of result.results){const button=document.createElement('button');button.className='project-result';const title=document.createElement('strong');title.textContent=item.path;button.append(title);
      if(item.snippet){const detail=document.createElement('small');detail.textContent=`第 ${item.line} 行 · ${item.snippet}`;button.append(detail);}
      button.onclick=async()=>{if(busy)return;busy=true;try{if(await onOpen(item.path)){dialog.close();if(item.line)onLocate(searchTerm);}}catch(error){status.textContent=error.message;}finally{busy=false;}};list.append(button);
    }
  }
  async function run(action,searchTerm=''){clearTimeout(timer);const request=++revision;status.textContent='正在读取…';list.inert=true;try{const result=await action();if(closed||request!==revision)return;if(result.canceled){status.textContent='已取消选择';return;}render(result,searchTerm);}catch(error){if(!closed&&request===revision)status.textContent=error.message;}finally{if(request===revision)list.inert=false;}}
  query.oninput=()=>{clearTimeout(timer);revision++;list.inert=true;const term=query.value;timer=setTimeout(()=>run(()=>window.desktop.searchProject(term),term),200);};
  dialog.querySelector('[data-choose]').onclick=()=>{query.value='';run(()=>window.desktop.chooseProject());};
  dialog.querySelector('[data-refresh]').onclick=()=>{query.value='';run(()=>window.desktop.refreshProject());};
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{closed=true;clearTimeout(timer);dialog.remove();},{once:true});
  await run(()=>window.desktop.searchProject(''));
}
