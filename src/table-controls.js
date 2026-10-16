import {NodeSelection} from 'prosemirror-state';
import {closeHistory} from 'prosemirror-history';

// Resolve the current table from the editor selection, never a stale DOM position.
export default function tableControls(editor, root){
  const document=root.ownerDocument,win=document.defaultView,view=editor.wwEditor.view;
  const bar=document.createElement('div');
  bar.className='table-controls';bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','表格操作');bar.hidden=true;
  const row=document.createElement('div');row.className='table-control-row';bar.append(row);
  let activeMenu=null,dismissed=false;
  function tableAtSelection(){
    const {selection}=view.state;
    if(selection.node?.type.name==='table')return {node:selection.node,pos:selection.from,whole:true};
    const {$from,$to}=selection;
    for(let depth=$from.depth;depth>0;depth--){if($from.node(depth).type.name==='table'){
      const pos=$from.before(depth),node=$from.node(depth);
      if($to.pos>pos+node.nodeSize-1)return null;
      return {pos,node,whole:false};
    }}
    return null;
  }
  function editable(){return !view.isDestroyed&&!document.body.classList.contains('display-mode')&&!document.querySelector('dialog[open]');}
  function hideMenus(){for(const el of bar.querySelectorAll('[data-table-menu]'))el.hidden=true;for(const el of row.querySelectorAll('[aria-expanded]'))el.setAttribute('aria-expanded','false');activeMenu=null;}
  function removeTable(){const table=tableAtSelection();if(!editable()||!table)return;
    view.dispatch(closeHistory(view.state.tr).delete(table.pos,table.pos+table.node.nodeSize).scrollIntoView());
    view.dispatch(closeHistory(view.state.tr));view.focus();hideMenus();refresh();
  }
  function command(name){if(!editable())return;const table=tableAtSelection();if(!table)return;
    if(name==='selectTable'){
      view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc,table.pos)));view.focus();
    }else if(name==='removeTable'){removeTable();return;}
    else{editor.exec(name);view.focus();}
    hideMenus();refresh();
  }
  function button(label,name,parent){const el=document.createElement('button');el.type='button';el.textContent=label;el.dataset.command=name;el.onmousedown=e=>e.preventDefault();el.onclick=()=>command(name);parent.append(el);return el;}
  for(const [kind,label,actions] of [
    ['row','行',[['addRowToUp','在上方插入行'],['addRowToDown','在下方插入行'],['removeRow','删除当前行']]],
    ['column','列',[['addColumnToLeft','在左侧插入列'],['addColumnToRight','在右侧插入列'],['removeColumn','删除当前列']]],
  ]){
    const toggle=document.createElement('button');toggle.type='button';toggle.textContent=label+' ▾';toggle.dataset.tableToggle=kind;toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label',label+'操作');toggle.onmousedown=e=>e.preventDefault();row.append(toggle);
    const menu=document.createElement('div');menu.dataset.tableMenu=kind;menu.className='table-action-menu';menu.hidden=true;menu.setAttribute('role','group');menu.setAttribute('aria-label',label+'操作');bar.append(menu);
    actions.forEach(([name,text])=>button(text,name,menu));
    toggle.onclick=()=>{const open=activeMenu!==kind;hideMenus();if(open){activeMenu=kind;menu.hidden=false;toggle.setAttribute('aria-expanded','true');}refresh();};
  }
  button('全选表格','selectTable',row);
  button('删除表格','removeTable',row).className='table-delete';
  root.append(bar);
  function refresh(){
    if(dismissed||!editable()){bar.hidden=true;hideMenus();return;}
    const info=tableAtSelection(),table=info&&view.nodeDOM(info.pos);
    if(!table?.isConnected||!root.contains(table)){bar.hidden=true;hideMenus();return;}
    const selection=view.state.selection;
    let header=false;for(let d=selection.$from.depth;d>0;d--)if(selection.$from.node(d).type.name==='tableHead')header=true;
    for(const el of bar.querySelectorAll('[data-command]')){
      const name=el.dataset.command;
      el.disabled=(info.whole&&!['selectTable','removeTable'].includes(name))||(header&&['addRowToUp','removeRow'].includes(name))||(name==='removeRow'&&table.querySelectorAll('tr').length<=2)||(name==='removeColumn'&&table.querySelectorAll('th').length<=1);
      el.title=el.disabled?(info.whole?'请先点击需要操作的单元格':'Markdown 表格需要保留表头、至少一行内容和一列'):name==='removeTable'?'删除整个表格，可用 ⌘Z / Ctrl+Z 撤销':el.textContent;
    }
    row.querySelector('[data-command="selectTable"]').setAttribute('aria-pressed',String(info.whole));
    bar.hidden=false;
    const rect=table.getBoundingClientRect();
    const safeTop=Math.max(8,(root.querySelector('.toastui-editor-toolbar')?.getBoundingClientRect().bottom||document.querySelector('.topbar')?.getBoundingClientRect().bottom||0)+8);
    const right=Math.min(win.innerWidth-12,(document.querySelector('.reference-pane')?.getBoundingClientRect().left||win.innerWidth)-12);
    bar.style.maxWidth=Math.max(160,right-12)+'px';
    if(rect.width&&(rect.bottom<safeTop||rect.top>win.innerHeight)){bar.hidden=true;return;}
    const height=bar.offsetHeight||42,width=bar.offsetWidth||300;
    bar.style.left=Math.max(12,Math.min(rect.left,right-width))+'px';
    bar.style.top=Math.max(safeTop,Math.min(rect.top-height-8,win.innerHeight-height-12))+'px';
    const menu=activeMenu&&bar.querySelector(`[data-table-menu="${activeMenu}"]`);
    if(menu){menu.style.left=row.querySelector(`[data-table-toggle="${activeMenu}"]`).offsetLeft+'px';bar.classList.toggle('menu-above',parseFloat(bar.style.top)+height+(menu.offsetHeight||115)+8>win.innerHeight);}
  }
  function key(event){
    if(!editable()||event.isComposing)return;
    if(event.key==='Escape'&&!bar.hidden){event.preventDefault();view.focus();dismissed=true;hideMenus();bar.hidden=true;return;}
    if(['Backspace','Delete'].includes(event.key)&&tableAtSelection()?.whole&&(view.dom.contains(event.target)||bar.contains(event.target))){event.preventDefault();event.stopPropagation();removeTable();}
  }
  function outside(event){if(!bar.contains(event.target)){hideMenus();dismissed=!view.dom.contains(event.target);refresh();}}
  const observer=new win.MutationObserver(refresh);observer.observe(view.dom,{childList:true,subtree:true});
  document.addEventListener('selectionchange',refresh);document.addEventListener('mousedown',outside);document.addEventListener('focusin',outside);
  root.addEventListener('keyup',refresh);root.addEventListener('mouseup',refresh);root.addEventListener('keydown',key,true);
  win.addEventListener('scroll',refresh,true);win.addEventListener('resize',refresh);
  return()=>{observer.disconnect();document.removeEventListener('selectionchange',refresh);document.removeEventListener('mousedown',outside);document.removeEventListener('focusin',outside);root.removeEventListener('keyup',refresh);root.removeEventListener('mouseup',refresh);root.removeEventListener('keydown',key,true);win.removeEventListener('scroll',refresh,true);win.removeEventListener('resize',refresh);bar.remove();};
}
