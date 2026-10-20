// File names are hidden during native dragover; image MIME types remain available.
export function bindDocumentDrop(root){
  let depth=0;
  const clear=()=>{depth=0;root.querySelector('.document-drop-overlay')?.remove();};
  const accepts=event=>{const items=Array.from(event.dataTransfer?.items||[]).filter(item=>item.kind==='file');return items.length&&!items.every(item=>item.type.startsWith('image/'));};
  const show=()=>{if(root.querySelector('.document-drop-overlay'))return;const overlay=root.createElement('div');overlay.className='document-drop-overlay';overlay.setAttribute('role','status');overlay.textContent='松开以打开文档';root.body.append(overlay);};
  root.addEventListener('dragenter',event=>{if(accepts(event)){event.preventDefault();depth++;show();}},true);
  root.addEventListener('dragover',event=>{if(accepts(event)){event.preventDefault();event.dataTransfer.dropEffect='copy';show();}},true);
  root.addEventListener('dragleave',()=>{if(--depth<=0)clear();},true);
  root.addEventListener('drop',clear,true);
  root.addEventListener('dragend',clear,true);
  root.defaultView.addEventListener('blur',clear);
}
