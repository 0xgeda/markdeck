import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
const markdown=new MarkdownIt({html:true,linkify:true});
export function openReference(docs,active){
  const document=window.document;
  document.querySelector('.reference-pane')?.remove();
  const pane=document.createElement('aside');pane.className='reference-pane';pane.setAttribute('aria-label','参考文档');
  pane.innerHTML='<header><strong>参考文档 · 只读</strong><button aria-label="关闭参考文档">×</button></header><select aria-label="选择参考文档"></select><p class="reference-hint">选择已打开过的文档，一边查阅，一边写作。</p><article></article>';
  const select=pane.querySelector('select'),content=pane.querySelector('article');let revision=0;
  const candidates=docs.filter(doc=>doc.id!==active);
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=candidates.length?'选择参考文档…':'请先打开另一份文档';select.append(placeholder);
  for(const doc of candidates){const option=document.createElement('option');option.value=doc.id;option.textContent=doc.title;select.append(option);}
  select.onchange=async()=>{const run=++revision,doc=candidates.find(doc=>doc.id===select.value);content.replaceChildren();if(!doc)return;
    content.innerHTML=DOMPurify.sanitize(markdown.render(doc.body));
    content.querySelectorAll('input,button,textarea,select').forEach(node=>node.disabled=true);
    for(const image of content.querySelectorAll('img')){const src=image.getAttribute('src');if(!src||/^(?:https?:|data:)/i.test(src))continue;
      image.removeAttribute('src');if(window.desktop?.readImage){try{const result=await window.desktop.readImage(doc.id,src);if(run!==revision||!pane.isConnected)return;if(result.ok)image.src=result.data;else image.alt=(image.alt||'图片')+'（附件不可用）';}catch{image.alt='图片读取失败';}}
    }
  };
  // Keep navigation in the main document independent; reference links never replace the app.
  content.onclick=event=>{if(event.target.closest('a'))event.preventDefault();};
  function close(){revision++;pane.remove();document.body.classList.remove('reference-open');}
  pane.querySelector('button').onclick=close;document.body.append(pane);document.body.classList.add('reference-open');select.focus();return close;
}
