const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Plan order is independent of document order. Missing/renamed chapters remain
// visible in the editor so a stale plan cannot silently point at another chapter.
export async function openShowPlan({editor,title,state,sections,level,save,onClose=()=>{}}){
  const document=window.document;
  if(document.querySelector('.show-plan-pane'))return;
  state.plans ||= [];
  if(!Array.isArray(state.plans)||state.plans.some(plan=>!plan||!Array.isArray(plan.items)||plan.items.some(item=>!item||typeof item.key!=='string'||typeof item.title!=='string')))throw new Error('展示方案数据无效，已有数据未被覆盖');
  const dialog=document.createElement('aside');dialog.className='show-plan-pane';
  dialog.setAttribute('aria-label','展示章节');dialog.tabIndex=-1;dialog.inert=true;
  dialog.innerHTML='<header><h2>展示章节</h2><button data-close aria-label="收起展示章节">×</button></header><nav><select aria-label="选择展示方案" data-plans></select><details class="plan-menu"><summary aria-label="方案操作" title="方案操作">⋯</summary><div><button data-new>新建方案</button><button data-rename>重命名</button><button data-delete>删除方案</button></div></details></nav><label class="plan-name" hidden>方案名称<input data-name maxlength="100"></label><div class="plan-meta"><span data-plan-level></span><output data-count></output></div><div data-rows></div><footer><button data-add>加入新增章节</button><span role="status" data-status></span><button data-start>按所选顺序展示</button></footer>';
  document.body.append(dialog);document.body.classList.add('show-plan-open');
  let active=state.plans[0]||null,closed=false,closeViewer;
  const status=dialog.querySelector('[data-status]');
  function create(){active={id:window.crypto.randomUUID(),name:state.plans.length?`展示方案 ${state.plans.length+1}`:'默认顺序',level,items:sections(level).filter(s=>s.index>=0).map(s=>({key:s.key,title:s.title,enabled:true}))};state.plans.push(active);paint();}
  function currentSections(){return sections(active?.level||level).filter(s=>s.index>=0);}
  function paint(){
    const select=dialog.querySelector('[data-plans]');select.innerHTML=state.plans.map(plan=>`<option value="${escape(plan.id)}">${escape(plan.name)}</option>`).join('');select.value=active?.id||'';
    dialog.querySelector('[data-name]').value=active?.name||'';dialog.querySelector('[data-name]').disabled=!active;
    dialog.querySelector('[data-plan-level]').textContent=active?`按 ${active.level} 级标题`:'';
    const available=new Map(currentSections().map(s=>[s.key,s]));
    dialog.querySelector('[data-rows]').innerHTML=active?.items.map((item,index)=>`<div class="show-plan-row"><label><input type="checkbox" data-enabled="${index}" aria-label="展示 ${escape(item.title)}" ${item.enabled?'checked':''} ${available.has(item.key)?'':'disabled'}></label><button class="plan-chapter-title" data-preview="${index}" ${available.has(item.key)?'':'disabled title="原文章节已删除或改名，请移除后重新加入"'}>${escape(item.title)}${available.has(item.key)?'':'（章节已失效）'}</button><button data-up="${index}" ${index===0?'disabled':''} aria-label="上移 ${escape(item.title)}">↑</button><button data-down="${index}" ${index===active.items.length-1?'disabled':''} aria-label="下移 ${escape(item.title)}">↓</button>${available.has(item.key)?'':`<button data-remove="${index}" aria-label="移除 ${escape(item.title)}">移除</button>`}</div>`).join('')||(active?'<p>方案中暂无章节</p>':'<p>暂无展示方案</p>');
    dialog.querySelector('[data-start]').disabled=!active?.items.some(item=>item.enabled&&available.has(item.key));
    dialog.querySelector('[data-delete]').disabled=!active;dialog.querySelector('[data-rename]').disabled=!active;
    dialog.querySelector('[data-add]').hidden=!active||!currentSections().some(section=>!active.items.some(item=>item.key===section.key));
    dialog.querySelector('[data-count]').textContent=active?`${active.items.filter(item=>item.enabled&&available.has(item.key)).length} / ${active.items.length} 章`:'';
  }
  async function persist(){let ok=false;try{ok=await save();}catch{}status.textContent=ok?'已保存':'保存失败，请重试后再关闭';return ok;}
  function dispose(){if(closed)return;closed=true;closeViewer?.();dialog.remove();document.body.classList.remove('show-plan-open');document.removeEventListener('keydown',escapeKey,true);onClose();}
  async function close(){if(closed)return true;if(!await persist())return false;dispose();return true;}
  dialog.querySelector('[data-close]').onclick=close;
  function escapeKey(event){if(event.key==='Escape'&&!document.querySelector('.chapter-show')){event.preventDefault();event.stopImmediatePropagation();close();}}
  const rename=()=>{dialog.querySelector('.plan-menu').open=false;dialog.querySelector('.plan-name').hidden=false;dialog.querySelector('[data-name]').focus();dialog.querySelector('[data-name]').select();};
  dialog.querySelector('[data-new]').onclick=()=>{create();persist();rename();};
  dialog.querySelector('[data-rename]').onclick=rename;
  dialog.querySelector('[data-name]').onkeydown=event=>{if(event.key==='Enter'){dialog.querySelector('.plan-name').hidden=true;dialog.querySelector('[data-plans]').focus();}};
  dialog.querySelector('[data-plans]').onchange=event=>{active=state.plans.find(plan=>plan.id===event.target.value);dialog.querySelector('.plan-name').hidden=true;paint();};
  dialog.querySelector('[data-name]').oninput=event=>{active.name=event.target.value;const option=dialog.querySelector('[data-plans]').selectedOptions[0];if(option)option.textContent=active.name;persist();};
  dialog.querySelector('[data-delete]').onclick=()=>{dialog.querySelector('.plan-menu').open=false;if(!active||!window.confirm('删除这个展示方案？原文会保留。'))return;state.plans=state.plans.filter(plan=>plan!==active);active=state.plans[0]||null;paint();persist();};
  dialog.querySelector('[data-add]').onclick=()=>{for(const section of currentSections()){if(!active.items.some(item=>item.key===section.key))active.items.push({key:section.key,title:section.title,enabled:true});}paint();persist();};
  dialog.querySelector('[data-rows]').onchange=event=>{if(event.target.dataset.enabled===undefined)return;active.items[Number(event.target.dataset.enabled)].enabled=event.target.checked;paint();persist();};
  dialog.querySelector('[data-rows]').onclick=event=>{const button=event.target.closest('button');if(!button)return;if(button.dataset.preview!==undefined){const item=active.items[Number(button.dataset.preview)],section=currentSections().find(section=>section.key===item.key);if(section)editor.getEditorElements().wwEditor.querySelectorAll('h1,h2,h3,h4,h5,h6')[section.index]?.scrollIntoView({block:'start'});return;}for(const [action,delta] of [['up',-1],['down',1],['remove',0]]){if(button.dataset[action]===undefined)continue;const index=Number(button.dataset[action]);if(action==='remove')active.items.splice(index,1);else{const other=index+delta;if(other<0||other>=active.items.length)return;[active.items[index],active.items[other]]=[active.items[other],active.items[index]];}paint();persist();}};
  dialog.querySelector('[data-start]').onclick=async()=>{
    if(!await persist()||closed||closeViewer)return;
    const map=new Map(currentSections().map(s=>[s.key,s]));
    const selected=active.items.filter(item=>item.enabled&&map.has(item.key)).map(item=>map.get(item.key));
    if(!selected.length)return;
    if(active.items.some(item=>item.enabled&&!map.has(item.key))){status.textContent='有章节已删除或改名，请先移除缺失项。';return;}
    dialog.querySelector('.plan-menu').open=false;
    closeViewer=showChapters(editor,active.name||title,selected,state.summaries||{},()=>{closeViewer=null;dialog.querySelector('[data-start]').focus({preventScroll:true});});
  };
  if(!active){create();await persist();}else paint();
  dialog.inert=false;document.addEventListener('keydown',escapeKey,true);dialog.focus({preventScroll:true});return {close};
}

export function showChapters(editor,title,sections,summaries,onClose=()=>{}){
  const document=window.document,root=editor.getEditorElements().wwEditor;
  const headings=[...root.querySelectorAll('h1,h2,h3,h4,h5,h6')];
  const viewer=document.createElement('section');viewer.className='chapter-show';viewer.tabIndex=-1;viewer.setAttribute('aria-label',title);
  viewer.innerHTML='<header><strong></strong><button data-exit>返回章节 · Esc</button></header><div class="chapter-show-content toastui-editor-contents"></div><footer><button data-prev>上一章</button><output></output><button data-next>下一章</button></footer>';
  viewer.querySelector('strong').textContent=title;document.body.append(viewer);document.body.classList.add('chapter-showing');let index=0;
  function paint(){
    const section=sections[index],heading=headings[section.index],content=viewer.querySelector('.chapter-show-content');content.replaceChildren();
    if(!heading)return;
    const next=headings.slice(section.index+1).find(node=>Number(node.tagName.slice(1))<=section.level);
    const range=document.createRange();range.setStartBefore(heading);
    if(next)range.setEndBefore(next);else{const container=heading.closest('.ProseMirror')||root;range.setEnd(container,container.childNodes.length);}
    const summary=summaries[section.key];
    if(summary?.conclusion||summary?.points){const aside=document.createElement('aside');aside.className='chapter-takeaway';const label=document.createElement('small');label.textContent='本章重点';aside.append(label);for(const text of [summary.conclusion,summary.points]){if(text){const p=document.createElement('p');p.textContent=text;aside.append(p);}}content.append(aside);}
    const fragment=range.cloneContents();fragment.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));fragment.querySelectorAll('[contenteditable]').forEach(node=>node.removeAttribute('contenteditable'));fragment.querySelectorAll('input,textarea,select,button').forEach(node=>node.disabled=true);content.append(fragment);content.scrollTop=0;
    viewer.querySelector('output').textContent=`${index+1} / ${sections.length}`;viewer.querySelector('[data-prev]').disabled=index===0;viewer.querySelector('[data-next]').disabled=index===sections.length-1;
  }
  viewer.querySelector('[data-prev]').onclick=()=>{if(index>0){index--;paint();}};
  viewer.querySelector('[data-next]').onclick=()=>{if(index<sections.length-1){index++;paint();}};
  let closed=false;
  function dispose(){if(closed)return;closed=true;viewer.remove();document.body.classList.remove('chapter-showing');document.removeEventListener('keydown',key,true);onClose();}
  function close(){dispose();}
  viewer.querySelector('[data-exit]').onclick=close;
  function key(event){if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();}else if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();viewer.querySelector(event.key==='ArrowRight'?'[data-next]':'[data-prev]').click();}}
  document.addEventListener('keydown',key,true);paint();viewer.focus({preventScroll:true});return close;
}
