import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
const sessions=new Map();
const markdown=new MarkdownIt({html:true,linkify:true});
export function openReference(docs,active,onClose=()=>{}){
  const document=window.document,trigger=document.querySelector('[data-action="reference"]');
  trigger?.setAttribute('aria-pressed','true');
  document.querySelector('.reference-pane')?.remove();
  const pane=document.createElement('aside');pane.className='reference-pane';pane.setAttribute('aria-label','参考文档');
  pane.innerHTML='<header><strong>参考文档 · 只读</strong><button aria-label="关闭参考文档">×</button></header><select aria-label="选择参考文档"></select><article></article>';
  const select=pane.querySelector('select'),content=pane.querySelector('article');let revision=0;
  const session=sessions.get(active)||{selected:null,scroll:{}};sessions.delete(active);sessions.set(active,session);if(sessions.size>30)sessions.delete(sessions.keys().next().value);
  content.addEventListener('scroll',()=>{if(select.value)session.scroll[select.value]=content.scrollTop;});
  const candidates=docs.filter(doc=>doc.id!==active).sort((a,b)=>(b.updated||0)-(a.updated||0));
  if(!candidates.length){const empty=document.createElement('p');empty.className='reference-hint';empty.textContent='暂无参考文档，请先打开另一份文档。';content.append(empty);select.disabled=true;select.hidden=true;}
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=candidates.length?'选择参考文档…':'请先打开另一份文档';select.append(placeholder);
  for(const doc of candidates){const option=document.createElement('option');option.value=doc.id;option.textContent=doc.title;select.append(option);}
  select.onchange=async()=>{const run=++revision,doc=candidates.find(doc=>doc.id===select.value);content.replaceChildren();if(!doc)return;session.selected=doc.id;
    content.innerHTML=DOMPurify.sanitize(markdown.render(doc.body));
    content.scrollTop=session.scroll[doc.id]||0;
    content.querySelectorAll('input,button,textarea,select').forEach(node=>node.disabled=true);
    for(const image of content.querySelectorAll('img')){const src=image.getAttribute('src');if(!src||/^(?:https?:|data:)/i.test(src))continue;
      image.removeAttribute('src');if(window.desktop?.readImage){try{const result=await window.desktop.readImage(doc.id,src);if(run!==revision||!pane.isConnected)return;if(result.ok)image.src=result.data;else image.alt=(image.alt||'图片')+'（附件不可用）';}catch{image.alt='图片读取失败';}}
    }
  };
  // Keep navigation in the main document independent; reference links never replace the app.
  content.onclick=event=>{if(event.target.closest('a'))event.preventDefault();};
  function close(){if(select.value)session.scroll[select.value]=content.scrollTop;revision++;pane.remove();document.body.classList.remove('reference-open');trigger?.setAttribute('aria-pressed','false');if(trigger?.isConnected)trigger.focus();onClose();}
  pane.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}});
  pane.querySelector('button').onclick=close;document.body.append(pane);document.body.classList.add('reference-open');if(candidates.length){select.value=candidates.some(doc=>doc.id===session.selected)?session.selected:candidates[0].id;select.onchange();}select.focus();return close;
}
