export function enterDisplay(editor){
  const document=window.document;if(document.body.classList.contains('display-mode'))return;
  const editable=editor.getEditorElements().wwEditor.querySelector('[contenteditable]'),previous=editable.getAttribute('contenteditable'),title=document.querySelector('#title'),wasReadOnly=title.readOnly;
  const controls=document.createElement('nav');controls.className='display-exit';controls.setAttribute('aria-label','展示工具');
  controls.innerHTML='<select aria-label="跳转章节"><option value="">跳转章节…</option></select><button data-highlight>标注选中文字</button><button data-clear>清除标注</button><button data-full>全屏</button><button data-exit aria-label="退出展示">退出展示 · Esc</button>';
  const headings=[...editable.querySelectorAll('h1,h2,h3,h4,h5,h6')];for(const [index,heading] of headings.entries()){const option=document.createElement('option');option.value=index;option.textContent=heading.textContent;controls.querySelector('select').append(option);}
  document.querySelector('#settings-dialog')?.close();document.body.classList.add('display-mode');editable.setAttribute('contenteditable','false');title.readOnly=true;document.body.append(controls);
  const cssHighlights=window.CSS?.highlights,highlightName='markdeck-display';let ranges=[];
  controls.querySelector('select').onchange=event=>{if(event.target.value!=='')headings[Number(event.target.value)]?.scrollIntoView({block:'start'});};
  controls.querySelector('[data-highlight]').onmousedown=event=>event.preventDefault();
  controls.querySelector('[data-highlight]').onclick=()=>{const selection=document.getSelection();if(!selection?.rangeCount||selection.isCollapsed||!editable.contains(selection.anchorNode)||!editable.contains(selection.focusNode))return;if(cssHighlights&&window.Highlight){ranges.push(selection.getRangeAt(0).cloneRange());cssHighlights.set(highlightName,new window.Highlight(...ranges));}};
  function clear(){ranges=[];cssHighlights?.delete(highlightName);}
  controls.querySelector('[data-clear]').onclick=clear;
  controls.querySelector('[data-highlight]').disabled=!cssHighlights||!window.Highlight;
  controls.querySelector('[data-full]').onclick=()=>document.documentElement.requestFullscreen().catch(()=>{controls.querySelector('[data-full]').textContent='全屏不可用';});
  function exit(){clear();document.body.classList.remove('display-mode');editable.setAttribute('contenteditable',previous);title.readOnly=wasReadOnly;controls.remove();document.removeEventListener('keydown',key);if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});}
  function key(event){if(event.key==='Escape'){event.preventDefault();exit();}}
  controls.querySelector('[data-exit]').onclick=exit;document.addEventListener('keydown',key);controls.querySelector('[data-exit]').focus();return exit;
}
