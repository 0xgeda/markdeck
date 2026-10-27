export function findMatches(doc,query){
  if(!query)return [];
  const matches=[];
  doc.descendants((node,pos)=>{
    if(!node.isTextblock)return;
    let text='',positions=[];
    node.descendants((child,offset)=>{if(child.isText){for(let i=0;i<child.text.length;i++){text+=child.text[i];positions.push(pos+1+offset+i);}}else if(child.isLeaf){text+='\ufffc';positions.push(pos+1+offset);}});
    for(let start=0;(start=text.toLowerCase().indexOf(query.toLowerCase(),start))!==-1;start+=query.length)matches.push({from:positions[start],to:positions[start+query.length-1]+1});
    return false;
  });return matches;
}
let activeFind;
export function openFind(editor,initialQuery){
  const document=window.document;
  if(activeFind?.editor===editor){activeFind.focus(initialQuery);return activeFind.close;}
  activeFind?.close();
  const view=editor.wwEditor.view;
  const readOnly=document.body.classList.contains('display-mode');
  const panel=document.createElement('section');panel.className='find-panel';panel.setAttribute('aria-label','查找替换');
  panel.innerHTML=`
    <input data-query aria-label="查找内容" placeholder="查找正文…">
    <div class="find-navigation" role="group" aria-label="匹配导航">
      <span data-count role="status"></span>
      <button data-prev aria-label="上一个匹配" title="上一个匹配（Shift+Enter）"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 14 5-5 5 5"/></svg></button>
      <button data-next aria-label="下一个匹配" title="下一个匹配（Enter）"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg></button>
      <button data-close aria-label="关闭查找" title="关闭查找（Esc）"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
    </div>
    <input data-replacement aria-label="替换为" placeholder="替换为…">
    <div class="find-actions"><button data-replace>替换此处</button><button data-all>全部替换</button></div>`;
  document.body.append(panel);let index=0;
  const query=panel.querySelector('[data-query]'),replacement=panel.querySelector('[data-replacement]');replacement.disabled=readOnly;
  function refresh(jump=false){const matches=findMatches(view.state.doc,query.value);index=Math.max(0,Math.min(index,matches.length-1));panel.querySelector('[data-count]').textContent=matches.length?`${index+1} / ${matches.length}`:'0 个匹配';panel.querySelector('[data-replace]').disabled=panel.querySelector('[data-all]').disabled=readOnly||!matches.length;if(jump&&matches[index]){editor.setSelection(matches[index].from,matches[index].to);const dom=view.domAtPos(matches[index].from).node; (dom.nodeType===1?dom:dom.parentElement)?.scrollIntoView?.({block:'center'});}return matches;}
  query.oninput=()=>{index=0;refresh(true);};
  panel.querySelector('[data-next]').onclick=()=>{const matches=refresh();index=matches.length?(index+1)%matches.length:0;refresh(true);};
  panel.querySelector('[data-prev]').onclick=()=>{const matches=refresh();index=matches.length?(index-1+matches.length)%matches.length:0;refresh(true);};
  function replace(all){if(readOnly)return;const matches=refresh();const chosen=all?matches:matches.slice(index,index+1);let tr=view.state.tr;for(const match of chosen.reverse())tr=tr.insertText(replacement.value,match.from,match.to);if(tr.docChanged)view.dispatch(tr);refresh(true);}
  panel.querySelector('[data-replace]').onclick=()=>replace(false);panel.querySelector('[data-all]').onclick=()=>replace(true);
  function close(){panel.remove();document.removeEventListener('keydown',key);observer.disconnect();if(activeFind?.close===close)activeFind=null;}
  function key(event){if(event.isComposing)return;if(event.key==='Escape'){event.preventDefault();close();}else if(event.key==='Enter'&&panel.contains(event.target)){event.preventDefault();const matches=refresh();index=matches.length?(index+(event.shiftKey?-1:1)+matches.length)%matches.length:0;refresh(true);}}
  panel.querySelector('[data-close]').onclick=close;document.addEventListener('keydown',key);const observer=new MutationObserver(()=>refresh());observer.observe(view.dom,{subtree:true,childList:true,characterData:true});
  const focus=value=>{if(value!==undefined){query.value=value;index=0;refresh(true);}query.focus();};
  activeFind={editor,close,focus};focus(initialQuery);refresh();return close;
}
