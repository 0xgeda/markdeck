import {documentSections,presentationThemes} from './deck.js';
import {createDraft,arrangePage,palettes,paginateDraft} from './draft.js';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function openPresentation(source){
  const document=window.document;if(document.querySelector('.presentation-dialog[open]'))return;
  source=structuredClone(source);const sections=documentSections(source.body),key='larkdown-deck-'+source.id;
  const dialog=document.createElement('dialog');dialog.className='presentation-dialog draft-dialog';
  dialog.setAttribute('aria-labelledby','presentation-title');
  dialog.innerHTML=`<header><div><h2 id="presentation-title">PPT 确认稿</h2><p>${escape(source.title)} · 独立保存，不修改原文</p></div><button class="icon-btn" data-close aria-label="关闭确认稿">×</button></header><div class="presentation-options"><label>内容范围<select data-scope aria-label="演示内容范围"><option value="all">整篇文档</option>${sections.map((s,i)=>`<option value="${i}">${escape(s.title)}</option>`).join('')}</select></label><label>基础主题<select data-theme>${Object.entries(presentationThemes).map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></label><button class="export" data-generate>从原文重新生成</button><span>一级至三级标题分页面；单独一行 --- 可指定分页</span></div><div class="presentation-stage"><nav class="presentation-pages" aria-label="幻灯片目录"></nav><section class="draft-workspace"><div class="draft-actions"><button data-add>新增页</button><button data-delete>删除页</button><button data-auto>自动整理分页</button><button data-split>拆分此页</button><button data-merge>合并下一页</button><button data-up>上移</button><button data-down>下移</button><button data-undo>撤销</button></div><div class="draft-content"><section class="draft-fields"><label>页标题<input data-title aria-label="页标题"></label><label class="draft-body-label">页面内容 · Markdown<textarea data-body aria-label="页面内容" placeholder="填写正文、列表、表格或图片…"></textarea></label><p>拆分时可将光标放在分页处；未指定位置时按段落拆分。</p></section><iframe title="演示文稿预览" sandbox="allow-same-origin" allowfullscreen></iframe></div></section></div><footer><p data-feedback role="status"></p><div><button class="export" data-previous aria-label="上一张幻灯片">‹</button><span data-count></span><button class="export" data-next aria-label="下一张幻灯片">›</button><button class="export" data-fullscreen>全屏预览</button><button class="new-doc" data-export>导出 PPTX</button></div></footer>`;
  document.body.append(dialog);dialog.showModal();
  let draft=null,index=0,history=[],timer,saving=Promise.resolve(),ready=false,exporting=false;
  const frame=dialog.querySelector('iframe'),pages=dialog.querySelector('.presentation-pages'),feedback=dialog.querySelector('[data-feedback]');
  const title=dialog.querySelector('[data-title]'),body=dialog.querySelector('[data-body]');
  function remember(){history.push(JSON.stringify(draft));if(history.length>30)history.shift();}
  function persist(){
    if(!draft)return;
    const snapshot=JSON.stringify(draft);
    saving=saving.catch(()=>{}).then(async()=>{
      if(window.desktop?.saveDeck){const result=await window.desktop.saveDeck(source.id,snapshot);if(!result.ok)throw new Error(result.error);}
      else localStorage.setItem(key,snapshot);
    }).catch(error=>{feedback.textContent='确认稿保存失败：'+error.message;throw error;});
    saving.catch(()=>{});
  }
  function preview(){
    if(!draft)return;const page=draft.pages[index],colors=palettes[draft.theme]||palettes.minimal,layout=arrangePage(page,document);
    const content=layout.items.map(item=>{
      const style=`left:${item.x/13.333*100}%;top:${item.y/7.5*100}%;width:${item.w/13.333*100}%;height:${item.h/7.5*100}%`;
      if(item.type==='image')return `<div class="object image" style="${style}"><img src="${escape(item.src)}" alt="${escape(item.alt)}"></div>`;
      if(item.type==='table')return `<div class="object" style="${style}"><table>${item.rows.map((row,i)=>`<tr style="height:${item.rowHeights[i]/item.h*100}%">${row.map(cell=>`<${i?'td':'th'}>${escape(cell)}</${i?'td':'th'}>`).join('')}</tr>`).join('')}</table></div>`;
      return `<div class="object text" style="${style}">${escape(item.text)}</div>`;
    }).join('');
    frame.srcdoc=`<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https: http:; style-src 'unsafe-inline'"><style>html,body{margin:0;height:100%;background:#e9eae8}body{display:grid;place-items:center;font-family:-apple-system,BlinkMacSystemFont,'Microsoft YaHei',sans-serif}.slide{position:relative;width:min(100vw,177.77vh);aspect-ratio:16/9;background:#${colors.bg};color:#${colors.ink};container-type:inline-size;overflow:hidden}h1{position:absolute;left:4.5%;top:5.3%;width:91%;height:12%;font-size:${Math.max(18,Math.min(28,28*44/Math.max(1,[...page.title].length)))/9.6}cqw;line-height:1.2;margin:0;overflow:hidden;overflow-wrap:anywhere}.rule{position:absolute;left:4.5%;top:18%;width:91%;border-top:1px solid #${colors.accent}}.object{position:absolute;box-sizing:border-box;overflow:hidden}.text{font-size:${layout.font/9.6}cqw;line-height:1.35;white-space:pre-wrap;overflow-wrap:anywhere}.image{display:flex;align-items:center;justify-content:center}.image img{max-width:100%;max-height:100%;object-fit:contain}table{border-collapse:collapse;width:100%;height:100%;table-layout:fixed;font-size:${16/9.6}cqw}td,th{border:1px solid #${colors.accent};padding:.4cqw;overflow-wrap:anywhere;text-align:left}small{position:absolute;bottom:3%;right:4.5%;color:#${colors.accent}}</style></head><body><section class="slide is-current"><h1>${escape(page.title)}</h1><div class="rule"></div>${content}<small>${index+1}</small></section></body></html>`;
    feedback.textContent=layout.overflow?'此页内容较多，可点击“自动整理分页”；复杂代码可手动拆分。':`${draft.pages.length} 页 · 确认稿自动保存 · 导出后文字、表格可编辑`;
  }
  function show(next=index,fields=true){
    if(!draft)return;index=Math.max(0,Math.min(draft.pages.length-1,next));
    pages.innerHTML=draft.pages.map((page,i)=>`<button data-page="${i}" class="${i===index?'active':''}" aria-current="${i===index?'page':'false'}"><span>${i+1}</span>${escape(page.title||'未命名页')}</button>`).join('');pages.querySelector('.active')?.scrollIntoView?.({block:'nearest'});
    dialog.querySelector('[data-theme]').value=draft.theme;
    if(fields){title.value=draft.pages[index].title;body.value=draft.pages[index].body;}
    dialog.querySelector('[data-count]').textContent=`${index+1} / ${draft.pages.length}`;
    for(const [name,disabled] of [['previous',index===0],['next',index===draft.pages.length-1],['merge',index===draft.pages.length-1],['up',index===0],['down',index===draft.pages.length-1],['delete',draft.pages.length===1],['undo',!history.length]])dialog.querySelector(`[data-${name}]`).disabled=disabled;
    preview();
  }
  function mutate(change){if(!ready||exporting)return;remember();change();persist();show();}
  function generate(){
    const scope=dialog.querySelector('[data-scope]').value;
    if(draft&&!window.confirm('重新生成会替换当前确认稿。继续？')){dialog.querySelector('[data-scope]').value=draft.scope||'all';return;}
    try{if(draft)remember();draft=paginateDraft(createDraft(scope==='all'?source.body:sections[Number(scope)].text,source.title),document);draft.scope=scope;draft.theme=dialog.querySelector('[data-theme]').value;persist();show(0);}catch(error){feedback.textContent=error.message;}
  }
  title.oninput=body.oninput=()=>{if(!ready||!draft)return;remember();draft.pages[index]={title:title.value,body:body.value};persist();clearTimeout(timer);timer=setTimeout(()=>{show(index,false);},200);};
  dialog.querySelector('[data-theme]').onchange=event=>{if(!draft)return;remember();draft.theme=event.target.value;persist();show(index,false);};
  dialog.querySelector('[data-scope]').onchange=generate;dialog.querySelector('[data-generate]').onclick=generate;
  pages.onclick=event=>{const button=event.target.closest('[data-page]');if(button)show(Number(button.dataset.page));};
  dialog.querySelector('[data-auto]').onclick=()=>mutate(()=>{draft=paginateDraft(draft,document);});
  dialog.querySelector('[data-add]').onclick=()=>mutate(()=>{draft.pages.splice(++index,0,{title:'新页面',body:''});});
  dialog.querySelector('[data-delete]').onclick=()=>mutate(()=>{if(draft.pages.length>1)draft.pages.splice(index,1);});
  dialog.querySelector('[data-merge]').onclick=()=>mutate(()=>{const next=draft.pages[index+1];if(next){draft.pages[index].body+='\n\n### '+next.title+'\n\n'+next.body;draft.pages.splice(index+1,1);}});
  dialog.querySelector('[data-split]').onclick=()=>{
    const text=body.value;let at=body.selectionStart;
    if(at<=0||at>=text.length){const breaks=[...text.matchAll(/\n\s*\n/g)].map(match=>match.index);at=breaks.sort((a,b)=>Math.abs(a-text.length/2)-Math.abs(b-text.length/2))[0];}
    if(!at||!text.slice(at).trim()){feedback.textContent='请把光标放在需要分页的位置。';return;}
    mutate(()=>{draft.pages[index].body=text.slice(0,at).trim();draft.pages.splice(index+1,0,{title:draft.pages[index].title+'（续）',body:text.slice(at).trim()});index++;});
  };
  for(const [action,offset] of [['up',-1],['down',1]])dialog.querySelector(`[data-${action}]`).onclick=()=>mutate(()=>{const next=index+offset;if(next>=0&&next<draft.pages.length){[draft.pages[index],draft.pages[next]]=[draft.pages[next],draft.pages[index]];index=next;}});
  dialog.querySelector('[data-undo]').onclick=()=>{if(history.length){draft=JSON.parse(history.pop());persist();show();}};
  function onKey(event){if(event.target.closest?.('input,textarea,select'))return;if(event.key==='ArrowRight'){event.preventDefault();show(index+1);}if(event.key==='ArrowLeft'){event.preventDefault();show(index-1);}}
  frame.onload=()=>frame.contentDocument?.addEventListener('keydown',onKey);dialog.addEventListener('keydown',onKey);
  dialog.querySelector('[data-previous]').onclick=()=>show(index-1);dialog.querySelector('[data-next]').onclick=()=>show(index+1);
  dialog.querySelector('[data-fullscreen]').onclick=async()=>{try{await frame.requestFullscreen();}catch{feedback.textContent='当前环境无法进入全屏。';}};
  async function close(){clearTimeout(timer);persist();try{await saving;dialog.close();}catch{}}
  dialog.querySelector('[data-close]').onclick=close;dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  dialog.querySelector('[data-export]').onclick=async()=>{
    if(!draft||exporting)return;exporting=true;const snapshot=structuredClone(draft),button=dialog.querySelector('[data-export]');button.disabled=true;feedback.textContent='正在生成可编辑 PPTX…';
    try{persist();await saving;const {exportPptx}=await import('./pptx.js');const data=await exportPptx(snapshot,document);
      if(window.desktop){const result=await window.desktop.exportPptx(source.title,data);if(!result.ok)throw new Error(result.error);feedback.textContent=result.canceled?'已取消导出':'PPTX 已导出';}
      else{const bytes=Uint8Array.from(atob(data),char=>char.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'}));const link=document.createElement('a');link.href=url;link.download=(source.title.replace(/[\\/:*?"<>|]/g,'_')||'确认稿')+'.pptx';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);feedback.textContent='PPTX 已导出';}
    }catch(error){feedback.textContent=error.message;}finally{exporting=false;button.disabled=false;}
  };
  try{
    const saved=window.desktop?.loadDeck?await window.desktop.loadDeck(source.id):{ok:true,draft:localStorage.getItem(key)};
    if(!saved.ok)throw new Error(saved.error);
    if(saved.draft){draft=JSON.parse(saved.draft);if(draft.version!==1||!Array.isArray(draft.pages)||!draft.pages.length||draft.pages.some(page=>typeof page.title!=='string'||typeof page.body!=='string'))throw new Error('确认稿数据无效，未覆盖已有确认稿');dialog.querySelector('[data-theme]').value=draft.theme;dialog.querySelector('[data-scope]').value=draft.scope||'all';show();}
    else generate();
    ready=true;
  }catch(error){feedback.textContent=error.message;}
}
