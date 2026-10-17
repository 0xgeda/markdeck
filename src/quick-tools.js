import {closeHistory} from 'prosemirror-history';
import {imageBlobHook} from './image-controls.js';
export function quickTools(editor,root,id){
  const view=editor.wwEditor.view,doc=root.ownerDocument;
  const menu=doc.createElement('div'),bar=doc.createElement('div');
  menu.className='insert-menu';menu.hidden=true;menu.setAttribute('role','menu');menu.setAttribute('aria-label','插入内容');
  bar.className='selection-tools';bar.hidden=true;bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','选中文字格式');
  doc.body.append(menu,bar);let slash=null;
  const editable=()=>!view.isDestroyed&&!doc.body.matches('.display-mode,.organize-mode');
  function locate(element){const rect=view.coordsAtPos(view.state.selection.from);element.style.left=Math.max(8,Math.min(rect.left,innerWidth-240))+'px';element.style.top=Math.max(8,Math.min(rect.bottom+8,innerHeight-(element.offsetHeight||(element===menu?350:42))-8))+'px';}
  function dismiss(){menu.hidden=true;slash=null;}
  const actions=[['一级标题','heading',{level:1}],['二级标题','heading',{level:2}],['三级标题','heading',{level:3}],['无序列表','bulletList'],['有序列表','orderedList'],['待办列表','taskList'],['引用','blockQuote'],['代码块','codeBlock'],['表格','addTable',{rowCount:3,columnCount:3,data:[]}],['图片','image']];
  for(const [label,command,args] of actions){const button=doc.createElement('button');button.type='button';button.textContent=label;button.setAttribute('role','menuitem');button.onmousedown=e=>e.preventDefault();button.onclick=()=>{
    if(!editable()||slash===null||view.state.doc.textBetween(slash,slash+1)!=='/'){dismiss();return;}
    const position=slash;dismiss();
    const removeSlash=()=>{view.dispatch(closeHistory(view.state.tr).delete(position,position+1));editor.setSelection(position,position);view.focus();};
    if(command==='image'){
      const input=doc.createElement('input');input.type='file';input.accept='image/png,image/jpeg,image/webp,image/gif';
      const initial=view.state.doc;
      input.onchange=()=>{if(input.files[0])imageBlobHook(input.files[0],(src,altText)=>{if(view.isDestroyed)return;if(view.state.doc!==initial){window.alert('图片处理期间正文已改变，请重新插入图片。');return;}removeSlash();editor.exec('addImage',{imageUrl:src,altText});},id);};input.click();
    }else {removeSlash();editor.exec(command,args);}
  };menu.append(button);}
  for(const [label,command] of [['加粗','bold'],['斜体','italic'],['删除线','strike'],['代码','code']]){const button=doc.createElement('button');button.type='button';button.textContent=label;button.onmousedown=e=>e.preventDefault();button.onclick=()=>{if(editable()){editor.exec(command);view.focus();}};bar.append(button);}
  function key(event){
    if(event.isComposing)return;
    if(!menu.hidden){
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();dismiss();view.focus();return;}
      if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();const buttons=[...menu.children],current=buttons.indexOf(doc.activeElement);buttons[(current+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length].focus();return;}
      if(event.key==='Enter'&&doc.activeElement===view.dom){event.preventDefault();menu.firstChild.click();return;}
      if(!menu.contains(event.target))dismiss();
    }
    if(event.key!=='/'||event.isComposing||event.ctrlKey||event.metaKey||!editable()||!view.dom.contains(event.target))return;
    const {empty,$from,from}=view.state.selection;
    if(!empty||$from.parent.type.name!=='paragraph'||$from.parent.content.size)return;
    event.preventDefault();view.dispatch(view.state.tr.insertText('/'));slash=from;menu.hidden=false;bar.hidden=true;locate(menu);
  }
  function selection(){const {$from,node}=view.state.selection;let inTable=node?.type.name==='table';for(let d=$from.depth;d>0;d--)inTable||=$from.node(d).type.name==='table';if(inTable||!editable()||!view.hasFocus()||view.state.selection.empty||!menu.hidden){bar.hidden=true;return;}bar.hidden=false;locate(bar);}
  function outside(event){if(!menu.contains(event.target))dismiss();if(!bar.contains(event.target)&&!view.dom.contains(event.target))bar.hidden=true;}
  function scroll(event){if(menu.contains(event.target))return;dismiss();bar.hidden=true;}
  doc.addEventListener('keydown',key,true);doc.addEventListener('mouseup',selection);doc.addEventListener('keyup',selection);doc.addEventListener('mousedown',outside);window.addEventListener('scroll',scroll,true);
  return()=>{doc.removeEventListener('keydown',key,true);doc.removeEventListener('mouseup',selection);doc.removeEventListener('keyup',selection);doc.removeEventListener('mousedown',outside);window.removeEventListener('scroll',scroll,true);menu.remove();bar.remove();};
}
