export function bindDocumentList(root,onMove){
 let dragged=null;
 const clear=()=>{dragged=null;for(const row of root.querySelectorAll('.doc-row'))row.classList.remove('dragging','drop-before','drop-after');};
 root.addEventListener('dragstart',event=>{const row=event.target.closest?.('.doc-row');if(!row)return;dragged=row.dataset.docId;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/x-markdeck-document',dragged);row.classList.add('dragging');});
 root.addEventListener('dragover',event=>{const row=event.target.closest?.('.doc-row');if(!dragged||!row)return;event.preventDefault();event.dataTransfer.dropEffect='move';for(const other of root.querySelectorAll('.doc-row'))other.classList.remove('drop-before','drop-after');if(row.dataset.docId!==dragged)row.classList.add(event.clientY<row.getBoundingClientRect().top+row.getBoundingClientRect().height/2?'drop-before':'drop-after');});
 root.addEventListener('drop',event=>{const row=event.target.closest?.('.doc-row');if(!dragged||!row){clear();return;}event.preventDefault();const from=dragged,to=row.dataset.docId,after=event.clientY>=row.getBoundingClientRect().top+row.getBoundingClientRect().height/2;clear();if(from!==to)onMove(from,to,after);});
 root.addEventListener('dragend',clear);
}
