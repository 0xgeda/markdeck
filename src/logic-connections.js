const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function connectionPorts(title){
  return `<button class="logic-port port-in" data-port="in" aria-label="${escape(title)}：输入连接点" title="输入连接点" type="button"></button><button class="logic-port port-out" data-port="out" aria-label="${escape(title)}：输出连接点" title="拖到另一张卡片的输入连接点" type="button"></button>`;
}

// Pointer capture keeps a wire attached to the cursor outside the start handle.
// Client coordinates are converted through the scaled, scrolled canvas itself.
export function logicConnections({canvas,viewport,dialog,getState,save,status}){
  const document=canvas.ownerDocument,win=document.defaultView;
  let wire=null,selected=null,lastPoint=null,suppressClick=false;
  const cards=()=>new Map([...canvas.querySelectorAll('.logic-group:not(.logic-frame)')].map(el=>[el.dataset.group,el]));
  function anchor(card,port){return {x:parseFloat(card.style.left)+(port==='out'?(card.offsetWidth||(card.classList.contains('logic-sticky')?228:304)):0),y:parseFloat(card.style.top)+(card.offsetHeight||140)/2};}
  function curve(a,b){const reach=Math.max(48,Math.abs(b.x-a.x)*.5);return `M${a.x},${a.y} C${a.x+reach},${a.y} ${b.x-reach},${b.y} ${b.x},${b.y}`;}
  function coordinates(event){const rect=canvas.getBoundingClientRect(),zoom=getState().zoom;return {x:(event.clientX-rect.left)/zoom,y:(event.clientY-rect.top)/zoom};}
  function targetAt(event){
    const side=wire.port==='out'?'in':'out';
    const hit=document.elementFromPoint?.(event.clientX,event.clientY)?.closest('.logic-port');
    if(hit&&canvas.contains(hit)&&hit.dataset.port===side&&hit.closest('.logic-group').dataset.group!==wire.key)return hit;
    // A modest hit radius helps trackpad users land on a small visible handle.
    let target=null,distance=24;
    for(const port of canvas.querySelectorAll(`[data-port="${side}"]`)){
      if(port.closest('.logic-group').dataset.group===wire.key)continue;
      const rect=port.getBoundingClientRect();if(!rect.width)continue;
      const delta=Math.hypot(event.clientX-(rect.left+rect.width/2),event.clientY-(rect.top+rect.height/2));
      if(delta<distance){target=port;distance=delta;}
    }
    return target;
  }
  function add(from,to){
    const state=getState();if(from===to||!cards().has(from)||!cards().has(to)||state.edges.some(e=>e.from===from&&e.to===to))return false;
    state.edges.push({from,to});save();return true;
  }
  function syncPortState(){
    canvas.classList.toggle('connecting',!!wire);
    for(const port of canvas.querySelectorAll('[data-port]')){
      const key=port.closest('.logic-group').dataset.group;
      port.classList.toggle('port-source',wire?.key===key&&wire?.port===port.dataset.port);
      port.classList.toggle('port-target',wire?.target===port);
      port.classList.toggle('port-available',!!wire&&wire.key!==key&&wire.port!==port.dataset.port);
    }
  }
  function render(){
    canvas.querySelector('.logic-wires')?.remove();canvas.querySelector('.logic-wire-actions')?.remove();
    const map=cards(),paths=[];
    getState().edges.forEach((edge,index)=>{
      const from=map.get(edge.from),to=map.get(edge.to);if(!from||!to)return;
      const a=anchor(from,'out'),b=anchor(to,'in'),d=curve(a,b),x=(a.x+b.x)/2,y=(a.y+b.y)/2;
      const label=`${from.querySelector('header').textContent.trim()} → ${to.querySelector('header').textContent.trim()}`;
      paths.push(`<g data-edge="${index}" class="logic-edge ${selected===index?'selected':''}" tabindex="0" role="button" aria-label="${escape(label)}；按 Delete 删除连线"><path class="edge-hit" d="${d}"/><path class="edge-line" d="${d}" marker-end="url(#logic-arrow)"/><foreignObject x="${x-14}" y="${y-14}" width="28" height="28"><button xmlns="http://www.w3.org/1999/xhtml" data-remove-edge="${index}" type="button" aria-label="删除连线：${escape(label)}" title="删除连线">×</button></foreignObject></g>`);
    });
    if(wire){const start=map.get(wire.key);if(start){const a=anchor(start,wire.port),target=wire.target?.closest('.logic-group'),b=target?anchor(target,wire.target.dataset.port):wire.point||{x:a.x+80,y:a.y};paths.push(`<path class="edge-preview" d="${wire.port==='out'?curve(a,b):curve(b,a)}" marker-end="url(#logic-arrow)"/>`);}}
    canvas.insertAdjacentHTML('afterbegin',`<svg class="logic-wires" width="100%" height="100%"><defs><marker id="logic-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z"/></marker></defs>${paths.join('')}</svg>`);
    syncPortState();
  }
  function release(pointerId){if(pointerId!==undefined&&viewport.hasPointerCapture?.(pointerId))viewport.releasePointerCapture(pointerId);}
  function cancel(){if(!wire)return false;const id=wire.pointerId;wire=null;lastPoint=null;release(id);render();status.textContent='已取消连线';return true;}
  function begin(port,event){
    cancel();selected=null;
    wire={key:port.closest('.logic-group').dataset.group,port:port.dataset.port,pointerId:event?.pointerId,point:event?coordinates(event):null,target:null};
    if(event){lastPoint={clientX:event.clientX,clientY:event.clientY};viewport.setPointerCapture?.(event.pointerId);}
    status.textContent='松手连接 · Esc 取消';render();
  }
  function down(event){
    const port=event.target.closest('[data-port]'),edge=event.target.closest('[data-edge]');
    if(port&&event.button===0){event.preventDefault();event.stopImmediatePropagation();begin(port,event);return;}
    if(edge){event.stopImmediatePropagation();if(!event.target.closest('[data-remove-edge]')){event.preventDefault();selected=Number(edge.dataset.edge);render();canvas.querySelector(`[data-edge="${selected}"]`)?.focus();}return;}
    if(wire)cancel();if(selected!==null){selected=null;render();}
  }
  function move(event){if(!wire||wire.pointerId===undefined||event.pointerId!==wire.pointerId)return;
    event.preventDefault();event.stopImmediatePropagation();lastPoint={clientX:event.clientX,clientY:event.clientY};wire.point=coordinates(event);wire.target=targetAt(event);render();
  }
  function up(event){if(!wire||wire.pointerId===undefined||event.pointerId!==wire.pointerId)return;
    event.preventDefault();event.stopImmediatePropagation();wire.target=targetAt(event);
    const target=wire.target?.closest('.logic-group').dataset.group,start=wire.key,port=wire.port,id=wire.pointerId;
    wire=null;lastPoint=null;release(id);suppressClick=true;win.setTimeout(()=>suppressClick=false,0);
    if(target){const added=port==='out'?add(start,target):add(target,start);status.textContent=added?'已连接':'这两张卡片已有连线';}else status.textContent='未连接';render();
  }
  function aborted(event){if(wire?.pointerId===event.pointerId){event.stopImmediatePropagation();cancel();}}
  function click(event){
    if(event.target.closest('[data-port]')){event.preventDefault();event.stopImmediatePropagation();return;}
    if(suppressClick){event.preventDefault();event.stopImmediatePropagation();return;}
    const remove=event.target.closest('[data-remove-edge]');if(remove){event.preventDefault();event.stopImmediatePropagation();getState().edges.splice(Number(remove.dataset.removeEdge),1);selected=null;render();save();}
  }
  function key(event){
    if(event.key==='Escape'&&wire){event.preventDefault();event.stopImmediatePropagation();cancel();return;}
    if(event.target.closest('textarea,input,select,[contenteditable=true]'))return;
    if(event.target.closest('[data-remove-edge]')&&['Enter',' '].includes(event.key))return;
    const port=event.target.closest('[data-port]');
    if(port&&['Enter',' '].includes(event.key)){
      event.preventDefault();event.stopImmediatePropagation();const target=port.closest('.logic-group').dataset.group;
      if(wire&&wire.key!==target&&wire.port!==port.dataset.port){const added=wire.port==='out'?add(wire.key,target):add(target,wire.key);cancel();status.textContent=added?'已连接':'这两张卡片已有连线';}
      else begin(port);return;
    }
    const edge=event.target.closest('[data-edge]');if(edge&&['Delete','Backspace','Enter',' '].includes(event.key)){
      event.preventDefault();event.stopImmediatePropagation();selected=Number(edge.dataset.edge);
      if(['Delete','Backspace'].includes(event.key)){getState().edges.splice(selected,1);selected=null;render();save();}else{render();canvas.querySelector(`[data-edge="${selected}"]`)?.focus();}
    }
  }
  function scroll(){if(wire&&lastPoint){wire.point=coordinates(lastPoint);wire.target=targetAt(lastPoint);render();}}
  viewport.addEventListener('pointerdown',down,true);viewport.addEventListener('pointermove',move,true);viewport.addEventListener('pointerup',up,true);viewport.addEventListener('pointercancel',aborted,true);viewport.addEventListener('lostpointercapture',aborted,true);viewport.addEventListener('click',click,true);viewport.addEventListener('scroll',scroll);
  dialog.addEventListener('keydown',key,true);win.addEventListener('blur',cancel);
  return {render,cancel,destroy(){cancel();viewport.removeEventListener('pointerdown',down,true);viewport.removeEventListener('pointermove',move,true);viewport.removeEventListener('pointerup',up,true);viewport.removeEventListener('pointercancel',aborted,true);viewport.removeEventListener('lostpointercapture',aborted,true);viewport.removeEventListener('click',click,true);viewport.removeEventListener('scroll',scroll);dialog.removeEventListener('keydown',key,true);win.removeEventListener('blur',cancel);}};
}
