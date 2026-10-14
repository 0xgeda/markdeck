export function logicSections(headings){
  if(!headings.length)return [];
  let level=Math.min(...headings.map(h=>h.level));
  const top=headings.filter(h=>h.level===level);
  // A single document title is the canvas heading, rather than an extra oversized branch.
  if(level===1&&top.length===1&&headings.some(h=>h.level>level))level=Math.min(...headings.filter(h=>h.level>level).map(h=>h.level));
  const sections=[];let current=null;
  for(const heading of headings){if(heading.level<level)continue;if(heading.level===level){current={...heading,children:[]};sections.push(current);}else if(current)current.children.push(heading);}
  return sections;
}
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function openLogicPanel(editor,title){
  const document=window.document;if(document.querySelector('.logic-dialog[open]'))return;
  const headings=[...editor.getEditorElements().wwEditor.querySelectorAll('h1,h2,h3,h4,h5,h6')];
  const sections=logicSections(headings.map((node,index)=>({title:node.textContent,level:Number(node.tagName.slice(1)),index})));
  const dialog=document.createElement('dialog');dialog.className='logic-dialog';dialog.setAttribute('aria-labelledby','logic-title');
  dialog.innerHTML=`<header><div><h2 id="logic-title">文档逻辑</h2><p>${escape(title)}</p></div><button data-close aria-label="关闭文档逻辑">×</button></header><nav class="logic-tools"><label>展开层级 <select aria-label="展开层级"><option value="1">主线</option><option value="2" selected>主线与分支</option><option value="6">全部层级</option></select></label><button data-collapse>收起全部分支</button><span></span><button data-zoom-out aria-label="缩小画布">−</button><output>100%</output><button data-zoom-in aria-label="放大画布">＋</button><button data-reset>重置视图</button></nav><div class="logic-viewport"><div class="logic-space"><div class="logic-canvas"></div></div></div><footer>实线表示阅读顺序，虚线表示章节层级 · 点击卡片跳转正文 · 空白处拖动画布</footer>`;
  document.querySelector('#settings-dialog')?.close();document.body.append(dialog);dialog.showModal();
  const viewport=dialog.querySelector('.logic-viewport'),space=dialog.querySelector('.logic-space'),canvas=dialog.querySelector('.logic-canvas');let zoom=1,collapsed=new Set(),depth=2;
  function paint(){
    const width=Math.max(800,sections.length*330+80),nodes=[],edges=[];let height=340;
    sections.forEach((section,lane)=>{
      const x=40+lane*330,y=60;nodes.push({...section,x,y,main:true,lane});
      if(lane<sections.length-1)edges.push(`<path class="logic-sequence" d="M ${x+280} ${y+54} H ${x+330}"/>`);
      const children=collapsed.has(lane)?[]:section.children.filter(child=>child.level<section.level+depth);let parentStack=[{level:section.level,x,y}];
      children.forEach((child,row)=>{
        const childX=x+Math.min(child.level-section.level,3)*12,childY=220+row*128;
        while(parentStack.at(-1)?.level>=child.level)parentStack.pop();const parent=parentStack.at(-1)||{x,y};
        edges.push(`<path class="logic-branch" d="M ${parent.x+12} ${parent.y+108} V ${childY+54} H ${childX}"/>`);
        nodes.push({...child,x:childX,y:childY,lane});parentStack.push({...child,x:childX,y:childY});height=Math.max(height,childY+170);
      });
    });
    canvas.style.width=width+'px';canvas.style.height=height+'px';
    canvas.innerHTML=sections.length?`<svg class="logic-lines" width="${width}" height="${height}" aria-hidden="true"><defs><marker id="logic-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z"/></marker></defs>${edges.join('')}</svg>${nodes.map(node=>`<article class="logic-node ${node.main?'main-node':''}" style="left:${node.x}px;top:${node.y}px"><button data-heading="${node.index}" title="${escape(node.title)}"><b>${escape(node.title)}</b><small>H${node.level} · 正文第 ${node.index+1} 个标题</small></button>${node.main&&node.children.length?`<button class="logic-toggle" data-lane="${node.lane}" aria-expanded="${!collapsed.has(node.lane)&&depth>1}">${collapsed.has(node.lane)||depth===1?'展开':'收起'} · ${node.children.length}</button>`:''}</article>`).join('')}`:'<p class="logic-empty">文档尚无标题。添加标题后，会自动生成主线与分支。</p>';
    scale();
  }
  function scale(){canvas.style.transform=`scale(${zoom})`;space.style.width=(parseFloat(canvas.style.width)*zoom)+'px';space.style.height=(parseFloat(canvas.style.height)*zoom)+'px';dialog.querySelector('output').textContent=Math.round(zoom*100)+'%';}
  dialog.querySelector('select').onchange=event=>{depth=Number(event.target.value);paint();};
  dialog.querySelector('[data-collapse]').onclick=()=>{collapsed=new Set(sections.map((_,i)=>i));paint();};
  dialog.querySelector('[data-zoom-in]').onclick=()=>{zoom=Math.min(1.5,zoom+.1);scale();};dialog.querySelector('[data-zoom-out]').onclick=()=>{zoom=Math.max(.4,zoom-.1);scale();};
  dialog.querySelector('[data-reset]').onclick=()=>{zoom=1;viewport.scrollTo?.(0,0);scale();};
  canvas.onclick=event=>{const heading=event.target.closest('[data-heading]'),toggle=event.target.closest('[data-lane]');if(heading){dialog.close();headings[Number(heading.dataset.heading)]?.scrollIntoView({block:'start'});}else if(toggle){const lane=Number(toggle.dataset.lane);if(depth===1){depth=2;dialog.querySelector('select').value='2';collapsed.delete(lane);}else if(collapsed.has(lane))collapsed.delete(lane);else collapsed.add(lane);paint();}};
  let drag=null;viewport.onpointerdown=event=>{if(event.target.closest('button,article'))return;drag={x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.setPointerCapture?.(event.pointerId);};viewport.onpointermove=event=>{if(drag){viewport.scrollLeft=drag.left+drag.x-event.clientX;viewport.scrollTop=drag.top+drag.y-event.clientY;}};viewport.onpointerup=viewport.onpointercancel=()=>{drag=null;};
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove(),{once:true});paint();
}
