// Keep the same reading block in view when typography and toolbars change.
function readingPosition(editable){
  const top=window.document.querySelector('.topbar')?.getBoundingClientRect().bottom||0;
  const blocks=[...editable.querySelectorAll('h1,h2,h3,h4,h5,h6,p,tr,pre')];
  const node=blocks.find(node=>node.getBoundingClientRect().bottom>top);
  const offset=node?.getBoundingClientRect().top;
  return ()=>{if(node?.isConnected)window.scrollTo({top:Math.max(0,window.scrollY+node.getBoundingClientRect().top-offset),behavior:'instant'});};
}

export function enterDisplay(editor,{onExit=()=>{},onArrange,onRequestExit}={}){
  const document=window.document;if(document.body.classList.contains('display-mode'))return;
  const editable=editor.getEditorElements().wwEditor.querySelector('[contenteditable]'),previous=editable.getAttribute('contenteditable'),title=document.querySelector('#title'),wasReadOnly=title.readOnly;
  const controls=document.createElement('nav');controls.className='display-exit';controls.setAttribute('aria-label','展示工具');
  const canHighlight=!!(window.CSS?.highlights&&window.Highlight);
  controls.innerHTML=`<select aria-label="跳转章节"><option value="">跳转到…</option></select><button data-arrange aria-expanded="false">章节安排</button><button data-highlight ${canHighlight?'':'title="当前浏览器不支持文本标注"'}>标注选中文字</button><button data-clear>清除标注</button><button data-full>全屏</button><button data-exit aria-label="退出展示">退出 · Esc</button>`;
  const headings=[...editable.querySelectorAll('h1,h2,h3,h4,h5,h6')];for(const [index,heading] of headings.entries()){const option=document.createElement('option');option.value=index;option.textContent=heading.textContent;controls.querySelector('select').append(option);}
  const restorePosition=readingPosition(editable);
  document.querySelector('#settings-dialog')?.close();document.body.classList.add('display-mode');editable.setAttribute('contenteditable','false');title.readOnly=true;document.body.append(controls);restorePosition();
  controls.querySelector('[data-arrange]').hidden=!onArrange;controls.querySelector('[data-arrange]').onclick=onArrange;
  const cssHighlights=window.CSS?.highlights,highlightName='markdeck-display';let ranges=[];
  const select=controls.querySelector('select');
  function syncSelect(){
    let current=0;const top=controls.getBoundingClientRect().bottom+8;
    for(let i=0;i<headings.length;i++){if(headings[i].getBoundingClientRect().top<=top)current=i;else break;}
    select.value=String(current);
  }
  select.onchange=event=>{if(event.target.value!=='')headings[Number(event.target.value)]?.scrollIntoView({block:'start'});};
  window.addEventListener('scroll',syncSelect,{passive:true});syncSelect();
  controls.querySelector('[data-highlight]').onmousedown=event=>event.preventDefault();
  controls.querySelector('[data-highlight]').onclick=()=>{const selection=document.getSelection();if(!selection?.rangeCount||selection.isCollapsed||!editable.contains(selection.anchorNode)||!editable.contains(selection.focusNode))return;if(canHighlight){ranges.push(selection.getRangeAt(0).cloneRange());cssHighlights.set(highlightName,new window.Highlight(...ranges));}};
  function clear(){ranges=[];cssHighlights?.delete(highlightName);}
  controls.querySelector('[data-clear]').onclick=clear;
  controls.querySelector('[data-highlight]').disabled=!canHighlight;
  const fullButton=controls.querySelector('[data-full]');
  function syncFull(){fullButton.textContent=document.fullscreenElement?'退出全屏':'全屏';}
  fullButton.onclick=()=>{if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});else document.documentElement.requestFullscreen().catch(()=>{fullButton.textContent='全屏不可用';setTimeout(syncFull,1500);});};
  document.addEventListener('fullscreenchange',syncFull);
  let exited=false;
  function exit(){if(exited)return;exited=true;const restore=readingPosition(editable);clear();document.body.classList.remove('display-mode');editable.setAttribute('contenteditable',previous);title.readOnly=wasReadOnly;controls.remove();document.removeEventListener('keydown',key);window.removeEventListener('scroll',syncSelect);document.removeEventListener('fullscreenchange',syncFull);if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});restore();onExit();document.querySelector('[data-mode="write"]')?.focus({preventScroll:true});}
  function key(event){if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();(onRequestExit||exit)();}}
  controls.querySelector('[data-exit]').onclick=onRequestExit||exit;document.addEventListener('keydown',key);controls.querySelector('[data-exit]').focus({preventScroll:true});return exit;
}
