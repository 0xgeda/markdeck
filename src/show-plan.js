const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Plan order is independent of document order. Missing/renamed chapters remain
// visible in the editor so a stale plan cannot silently point at another chapter.
export async function openShowPlan({editor,title,state,sections,level,save}){
  const document=window.document;
  if(document.querySelector('.show-plan-dialog'))return;
  state.plans ||= [];
  const dialog=document.createElement('dialog');dialog.className='show-plan-dialog';
  dialog.setAttribute('aria-label','展示方案');
  dialog.innerHTML='<header><h2>展示方案</h2><button data-close aria-label="关闭展示方案">×</button></header><nav><select aria-label="选择展示方案" data-plans></select><button data-new>新建方案</button><button data-delete>删除方案</button></nav><label>方案名称<input data-name maxlength="100"></label><p data-help></p><div data-rows></div><footer><span role="status" data-status></span><button data-add>加入新增章节</button><button data-start>开始展示</button></footer>';
  document.body.append(dialog);dialog.showModal();
  let active=state.plans[0]||null;
  const status=dialog.querySelector('[data-status]');
  function create(){active={id:window.crypto.randomUUID(),name:`展示方案 ${state.plans.length+1}`,level,items:sections(level).filter(s=>s.index>=0).map(s=>({key:s.key,title:s.title,enabled:true}))};state.plans.push(active);paint();}
  function currentSections(){return sections(active?.level||level).filter(s=>s.index>=0);}
  function paint(){
    const select=dialog.querySelector('[data-plans]');select.innerHTML=state.plans.map(plan=>`<option value="${escape(plan.id)}">${escape(plan.name)}</option>`).join('');select.value=active?.id||'';
    dialog.querySelector('[data-name]').value=active?.name||'';dialog.querySelector('[data-name]').disabled=!active;
    dialog.querySelector('[data-help]').textContent=active?`按 ${active.level} 级标题编排。取消勾选可暂时隐藏章节；顺序和摘要独立保存，不修改原文。`:'新建方案，为不同听众选择章节。';
    const available=new Map(currentSections().map(s=>[s.key,s]));
    dialog.querySelector('[data-rows]').innerHTML=active?.items.map((item,index)=>`<div class="show-plan-row"><label><input type="checkbox" data-enabled="${index}" ${item.enabled?'checked':''} ${available.has(item.key)?'':'disabled'}><span>${escape(item.title)}${available.has(item.key)?'':'（章节已删除或改名，请移除并重新加入）'}</span></label><button data-up="${index}" ${index===0?'disabled':''} aria-label="上移 ${escape(item.title)}">↑</button><button data-down="${index}" ${index===active.items.length-1?'disabled':''} aria-label="下移 ${escape(item.title)}">↓</button><button data-remove="${index}" aria-label="移除 ${escape(item.title)}">移除</button></div>`).join('')||'<p>暂无章节，请先在正文中添加标题。</p>';
    dialog.querySelector('[data-start]').disabled=!active?.items.some(item=>item.enabled&&available.has(item.key));
    dialog.querySelector('[data-delete]').disabled=!active;dialog.querySelector('[data-add]').disabled=!active;
  }
  async function persist(){const ok=await save();status.textContent=ok?'展示方案已保存':'保存失败，请重试后再关闭';return ok;}
  async function close(){if(await persist())dialog.close();}
  dialog.querySelector('[data-close]').onclick=close;
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  dialog.querySelector('[data-new]').onclick=()=>{create();persist();};
  dialog.querySelector('[data-plans]').onchange=event=>{active=state.plans.find(plan=>plan.id===event.target.value);paint();};
  dialog.querySelector('[data-name]').oninput=event=>{active.name=event.target.value;const option=dialog.querySelector('[data-plans]').selectedOptions[0];if(option)option.textContent=active.name;persist();};
  dialog.querySelector('[data-delete]').onclick=()=>{if(!active||!window.confirm('删除这个展示方案？原文和章节摘要会保留。'))return;state.plans=state.plans.filter(plan=>plan!==active);active=state.plans[0]||null;paint();persist();};
  dialog.querySelector('[data-add]').onclick=()=>{for(const section of currentSections()){if(!active.items.some(item=>item.key===section.key))active.items.push({key:section.key,title:section.title,enabled:true});}paint();persist();};
  dialog.querySelector('[data-rows]').onchange=event=>{if(event.target.dataset.enabled===undefined)return;active.items[Number(event.target.dataset.enabled)].enabled=event.target.checked;paint();persist();};
  dialog.querySelector('[data-rows]').onclick=event=>{const button=event.target.closest('button');if(!button)return;for(const [action,delta] of [['up',-1],['down',1],['remove',0]]){if(button.dataset[action]===undefined)continue;const index=Number(button.dataset[action]);if(action==='remove')active.items.splice(index,1);else{const other=index+delta;if(other<0||other>=active.items.length)return;[active.items[index],active.items[other]]=[active.items[other],active.items[index]];}paint();persist();}};
  dialog.querySelector('[data-start]').onclick=async()=>{
    if(!await persist())return;
    const map=new Map(currentSections().map(s=>[s.key,s]));
    const selected=active.items.filter(item=>item.enabled&&map.has(item.key)).map(item=>map.get(item.key));
    if(!selected.length)return;
    if(active.items.some(item=>item.enabled&&!map.has(item.key))){status.textContent='有章节已删除或改名，请先移除缺失项。';return;}
    showChapters(editor,active.name||title,selected,state.summaries||{});
  };
  if(!active){create();await persist();}else paint();
}

export function showChapters(editor,title,sections,summaries){
  const document=window.document,root=editor.getEditorElements().wwEditor;
  const headings=[...root.querySelectorAll('h1,h2,h3,h4,h5,h6')];
  const viewer=document.createElement('dialog');viewer.className='chapter-show';viewer.setAttribute('aria-label',title);
  viewer.innerHTML='<header><strong></strong><button data-exit>退出展示 · Esc</button></header><div class="chapter-show-content toastui-editor-contents"></div><footer><button data-prev>上一章</button><output></output><button data-next>下一章</button></footer>';
  viewer.querySelector('strong').textContent=title;document.body.append(viewer);viewer.showModal();let index=0;
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
  viewer.querySelector('[data-exit]').onclick=()=>viewer.close();
  viewer.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();viewer.querySelector(event.key==='ArrowRight'?'[data-next]':'[data-prev]').click();}});
  viewer.addEventListener('close',()=>viewer.remove(),{once:true});paint();
}
