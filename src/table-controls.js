// Use the editor's table commands so selection, undo and Markdown stay in sync.
export default function tableControls(editor, root){
  const document=root.ownerDocument;
  const bar=document.createElement('div');
  bar.className='table-controls';
  bar.setAttribute('role','toolbar');
  bar.setAttribute('aria-label','表格行列操作');
  bar.hidden=true;
  const actions=[['addRowToUp','上方插入行'],['addRowToDown','下方插入行'],['addColumnToLeft','左侧插入列'],['addColumnToRight','右侧插入列'],['removeRow','删除行'],['removeColumn','删除列']];
  for(const [command,label] of actions){
    const button=document.createElement('button');
    button.type='button';button.textContent=label;button.dataset.command=command;
    button.addEventListener('mousedown',event=>event.preventDefault());
    button.addEventListener('click',()=>{editor.exec(command);refresh();});
    bar.append(button);
  }
  root.append(bar);
  function refresh(){
    const selection=document.getSelection();
    const node=selection?.anchorNode;
    const cell=(node?.nodeType===1?node:node?.parentElement)?.closest('td,th');
    const inside=cell&&root.contains(cell)&&cell.closest('.ProseMirror');
    if(bar.contains(document.activeElement))return;
    bar.hidden=!inside;
    if(!inside)return;
    const table=cell.closest('table');
    const head=cell.tagName==='TH';
    for(const button of bar.children){
      const command=button.dataset.command;
      button.disabled=(head&&(command==='addRowToUp'||command==='removeRow'))||(command==='removeRow'&&table.querySelectorAll('tr').length<=2)||(command==='removeColumn'&&cell.parentElement.children.length<=1);
      button.title=button.disabled?'Markdown 表格需要保留表头、至少一行内容和一列':button.textContent;
    }
  }
  document.addEventListener('selectionchange',refresh);
  root.addEventListener('keyup',refresh);
  root.addEventListener('mouseup',refresh);
  return ()=>{document.removeEventListener('selectionchange',refresh);root.removeEventListener('keyup',refresh);root.removeEventListener('mouseup',refresh);bar.remove();};
}
