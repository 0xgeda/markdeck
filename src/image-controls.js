import {closeHistory} from 'prosemirror-history';
import {compressImage} from './compress-image.js';
const groupStyle=size=>`width:calc(${size}% - 12px);max-width:100%;height:auto;display:inline-block;vertical-align:top;margin:0 6px`;
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const imageMarkdownRenderer={image:({node},context)=>{
  const attrs=node.attrs.htmlAttrs;
  if(!attrs?.['data-larkdown-image'])return context.origin();
  return {rawHTML:`<img src="${escape(node.attrs.imageUrl)}" alt="${escape(node.attrs.altText||'')}" style="${escape(attrs.style)}" data-larkdown-image="true" data-columns="${escape(attrs['data-columns']||'')}" data-align="${escape(attrs['data-align']||'center')}" data-size="${escape(attrs['data-size']||'100%')}">`};
}};
export function imageBlobHook(blob,callback,docId){
  compressImage(blob).then(image=>new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=async()=>{try{let src=reader.result;if(window.desktop?.storeImage&&docId){const result=await window.desktop.storeImage(docId,src);if(!result.ok)throw new Error(result.error);src=result.src;}callback(src,blob.name||'图片');window.document.dispatchEvent(new Event('markdeck-image-added'));resolve();}catch(error){reject(error);}};
    reader.onerror=()=>reject(new Error('图片读取失败，请重新选择。'));
    reader.readAsDataURL(image);
  })).catch(error=>window.alert(error.message));
  return false;
}
// Toast UI drops HTML image attributes while parsing Markdown; restore only our
// constrained layout metadata into its existing image nodes (never arbitrary CSS).
export function restoreImageLayout(editor,markdown){
  const parsed=new DOMParser().parseFromString(markdown,'text/html');
  const layouts=[...parsed.querySelectorAll('img[data-larkdown-image]')];
  const view=editor.wwEditor.view;let tr=view.state.tr;
  view.state.doc.descendants((node,pos)=>{
    if(node.type.name!=='image')return;
    const index=layouts.findIndex(image=>image.getAttribute('src')===node.attrs.imageUrl);
    if(index<0)return;
    const image=layouts.splice(index,1)[0];
    const columns=['2','3'].includes(image.dataset.columns)?image.dataset.columns:null;
    const pair=image.getAttribute('style')?.includes('display:inline-block');
    const align=['left','center','right','text-left','text-right'].includes(image.dataset.align)?image.dataset.align:'center';
    const storedSize=columns?image.dataset.size:pair?image.getAttribute('style')?.match(/(?:^|;)\s*width:(\d+%)/)?.[1]:image.dataset.size;
    const size=/^(?:[1-9]\d?(?:\.\d{1,4})?|100)%$/.test(storedSize)?storedSize:'100%';
    const margin=align==='left'?'0 auto 0 0':align==='right'?'0 0 0 auto':'0 auto';
    const wrap=align.startsWith('text-');
    const style=columns?groupStyle(parseFloat(size)):wrap?`width:${size};max-width:100%;height:auto;display:block;float:${align==='text-left'?'left':'right'};margin:0 4% 20px 0`:pair?`width:${image.dataset.size?size:'48%'};max-width:100%;height:auto;display:inline-block;vertical-align:middle;margin:0 1%`:`width:${size};max-width:100%;height:auto;display:block;margin:${margin}`;
    tr=tr.setNodeMarkup(pos,null,{...node.attrs,htmlAttrs:{'data-larkdown-image':'true','data-columns':columns||'','data-align':align,'data-size':size,style}});
  });
  if(tr.docChanged)view.dispatch(tr.setMeta('addToHistory',false));
}
export default function imageControls(editor,root){
  const document=root.ownerDocument;
  const bar=document.createElement('div');bar.className='table-controls image-controls';bar.hidden=true;
  bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','图片排版');
  let position=null;
  const view=editor.wwEditor.view;
  function selected(){return position===null?null:view.state.doc.nodeAt(position);}
  function format(align,width){
    const node=selected();if(node?.type.name!=='image')return;
    const old=node.attrs.htmlAttrs||{};
    if(old['data-columns']){if(width)resizeGroup(parseFloat(width));return;}

    const size=width||(align?.startsWith('text-')?'45%':old['data-size'])||'100%';
    const placement=align||old['data-align']||'center';
    const margin=placement==='left'?'0 auto 0 0':placement==='right'?'0 0 0 auto':'0 auto';
    const paired=!align&&old.style?.includes('display:inline-block');
    const style=paired?`width:${size};max-width:100%;height:auto;display:inline-block;vertical-align:middle;margin:0 1%`:placement.startsWith('text-')?`width:${size};max-width:100%;height:auto;display:block;float:${placement==='text-left'?'left':'right'};margin:0 4% 20px 0`:`width:${size};max-width:100%;height:auto;display:block;margin:${margin}`;
    const target=position;view.dispatch(closeHistory(view.state.tr).setNodeMarkup(position,null,{...node.attrs,htmlAttrs:{...old,style,'data-larkdown-image':'true','data-align':placement,'data-size':size}}));position=target;bar.hidden=false;refresh();
  }
  for(const [label,run] of [['左对齐',()=>format('left')],['居中',()=>format('center')],['右对齐',()=>format('right')],['小图',()=>format(null,'33%')],['中图',()=>format(null,'50%')],['大图',()=>format(null,'100%')],['图左文右',()=>format('text-left')],['图右文左',()=>format('text-right')],['两列图片',()=>group(2)],['三列图片',()=>group(3)],['恢复单列',ungroup]]){
    const button=document.createElement('button');button.type='button';button.textContent=label;
    button.addEventListener('mousedown',event=>event.preventDefault());button.addEventListener('click',run);bar.append(button);
  }
  function imageParagraph(node){return node?.type.name==='paragraph'&&node.childCount>0&&Array.from({length:node.childCount},(_,i)=>node.child(i)).every(child=>child.type.name==='image');}
  function group(count){
    if(selected()?.type.name!=='image')return;
    const $pos=view.state.doc.resolve(position),paragraph=$pos.parent;
    if(!imageParagraph(paragraph)){window.alert('请把图片放在独立段落中，再选择第一张组成图片组。');return;}
    const images=[];paragraph.forEach(image=>images.push(image));let end=$pos.after();
    while(images.length<count){
      const next=view.state.doc.nodeAt(end);
      if(next?.type.name==='paragraph'&&next.content.size===0){end+=next.nodeSize;continue;}
      if(!imageParagraph(next))break;
      next.forEach(image=>images.push(image));end+=next.nodeSize;
    }
    if(images.length!==count){window.alert(`请选择连续的 ${count} 张图片；图片之间不能夹有正文。已有图片组可先恢复单列。`);return;}
    const size=(100/count).toFixed(4);
    const nodes=images.map(image=>image.type.create({...image.attrs,htmlAttrs:{'data-larkdown-image':'true','data-columns':String(count),'data-align':'center','data-size':`${size}%`,style:groupStyle(size)}},null,image.marks));
    const target=$pos.before()+1;
    view.dispatch(closeHistory(view.state.tr).replaceWith($pos.before(),end,paragraph.type.create(paragraph.attrs,nodes)));
    position=target;bar.hidden=false;refresh();
  }
  function resizeGroup(size){
    const $pos=view.state.doc.resolve(position),paragraph=$pos.parent;
    if(!imageParagraph(paragraph)||paragraph.childCount<2)return;
    const count=paragraph.childCount;size=Math.max(10,Math.min(100-10*(count-1),size));
    const other=(100-size)/(count-1);let tr=closeHistory(view.state.tr);
    paragraph.forEach((image,offset)=>{const pos=$pos.start()+offset;const width=(pos===position?size:other).toFixed(4);tr=tr.setNodeMarkup(pos,null,{...image.attrs,htmlAttrs:{...image.attrs.htmlAttrs,'data-size':`${width}%`,style:groupStyle(width)}});});
    const target=position;view.dispatch(tr);position=target;bar.hidden=false;refresh();
  }
  function ungroup(){
    if(selected()?.type.name!=='image')return;
    const $pos=view.state.doc.resolve(position),paragraph=$pos.parent;if(!imageParagraph(paragraph))return;
    const nodes=[];paragraph.forEach(image=>nodes.push(paragraph.type.create(paragraph.attrs,image.type.create({...image.attrs,htmlAttrs:{'data-larkdown-image':'true','data-align':'center','data-size':'100%',style:'width:100%;max-width:100%;height:auto;display:block;margin:0 auto'}},null,image.marks))));
    view.dispatch(closeHistory(view.state.tr).replaceWith($pos.before(),$pos.after(),nodes));
  }
  const frame=document.createElement('div');frame.className='image-resize-frame';frame.hidden=true;document.body.append(frame);
  const sizeLabel=document.createElement('output');sizeLabel.className='image-size-label';sizeLabel.hidden=true;frame.append(sizeLabel);
  let drag=null;
  function imageElement(){const node=position===null?null:view.nodeDOM(position);return node?.tagName==='IMG'?node:node?.querySelector('img[src]');}
  function refresh(){
    const grouped=!!selected()?.attrs.htmlAttrs?.['data-columns'];
    for(const button of bar.querySelectorAll('button')){const alignment=['左对齐','居中','右对齐','图左文右','图右文左'].includes(button.textContent);button.disabled=grouped&&alignment;button.title=grouped&&alignment?'恢复单列后可调整对齐和环绕':'';}
    const image=imageElement();
    if(!image||view.dom.getAttribute('contenteditable')==='false'){frame.hidden=true;bar.hidden=true;return;}
    const rect=image.getBoundingClientRect();frame.hidden=rect.width===0;
    const toolbarBottom=root.querySelector('.toastui-editor-toolbar')?.getBoundingClientRect().bottom||0;
    const safeTop=Math.max(12,toolbarBottom+8);
    const reference=document.querySelector('.reference-pane')?.getBoundingClientRect();
    const right=reference?.width?Math.min(window.innerWidth-12,reference.left-12):window.innerWidth-12;
    const visible=rect.width>0&&rect.bottom>safeTop&&rect.top<window.innerHeight-12&&rect.left<right;
    // jsdom has no geometry; preserve command availability for DOM-only consumers.
    if(rect.width>0){bar.hidden=!visible;frame.hidden=!visible;}
    bar.style.maxWidth=Math.max(180,right-12)+'px';
    const barWidth=bar.offsetWidth||560,barHeight=bar.offsetHeight||48;
    bar.style.left=Math.max(12,Math.min(rect.left+(rect.width-barWidth)/2,right-barWidth))+'px';
    const above=rect.top-barHeight-14;
    bar.style.top=(above>=safeTop?above:Math.min(window.innerHeight-barHeight-12,Math.max(safeTop,rect.bottom+14)))+'px';
    Object.assign(frame.style,{left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`});
  }
  for(const corner of ['nw','ne','sw','se']){
    const handle=document.createElement('button');handle.type='button';handle.className=`image-resize-handle ${corner}`;handle.setAttribute('aria-label','调整图片大小');
    handle.addEventListener('pointerdown',event=>{
      if(event.button!==0||view.dom.getAttribute('contenteditable')==='false')return;
      const image=imageElement(),rect=image?.getBoundingClientRect(),parent=image?.parentElement.getBoundingClientRect();
      if(!rect?.width||!parent?.width)return;
      event.preventDefault();event.stopPropagation();
      sizeLabel.hidden=false;sizeLabel.textContent='拖动预览 · 松手应用';bar.hidden=true;
      drag={x:event.clientX,rect,parentWidth:parent.width,corner,node:selected(),size:null};
    });
    frame.append(handle);
  }
  function move(event){
    if(!drag)return;event.preventDefault();
    const {rect,corner,parentWidth}=drag;
    const columns=Number(drag.node.attrs.htmlAttrs?.['data-columns']);
    const max=columns?100-10*(columns-1):drag.node.attrs.htmlAttrs?.style?.includes('display:inline-block')?48:100;
    const size=Math.max(10,Math.min(max,Math.round((rect.width+(columns?12:0)+(event.clientX-drag.x)*(corner.includes('w')?-1:1))/parentWidth*100)));
    sizeLabel.textContent=`${size}% · Esc 取消`;
    drag.size=size;const width=parentWidth*size/100-(columns?12:0),height=width*rect.height/rect.width;
    Object.assign(frame.style,{width:`${width}px`,height:`${height}px`,left:`${corner.includes('w')?rect.right-width:rect.left}px`,top:`${corner.includes('n')?rect.bottom-height:rect.top}px`});
  }
  function finish(event){
    if(!drag)return;const previous=drag;drag=null;sizeLabel.hidden=true;
    if(event.type==='pointerup'&&previous.size!==null&&selected()===previous.node)format(null,`${previous.size}%`);
    refresh();
  }
  function escapeResize(event){if(event.key==='Escape'){drag=null;sizeLabel.hidden=true;refresh();}}
  function reposition(){if(drag)drag=null;sizeLabel.hidden=true;refresh();}
  document.addEventListener('pointermove',move);document.addEventListener('pointerup',finish);document.addEventListener('pointercancel',finish);document.addEventListener('keydown',escapeResize);
  document.addEventListener('scroll',reposition,true);document.addEventListener('load',reposition,true);window.addEventListener('resize',reposition);
  function click(event){
    if(frame.contains(event.target))return;
    const image=event.target.closest('.ProseMirror img[src]');
    if(view.dom.getAttribute('contenteditable')==='false')return;
    if(image&&root.contains(image)){position=view.posAtDOM(image,0);bar.hidden=false;root.querySelector('.table-controls:not(.image-controls)')?.setAttribute('hidden','');}
    else if(!bar.contains(event.target)){bar.hidden=true;position=null;}
    refresh();
  }
  // Hide when the document changes elsewhere: stale positions must never edit another image.
  function change(){bar.hidden=true;position=null;drag=null;frame.hidden=true;sizeLabel.hidden=true;}
  document.addEventListener('click',click);editor.on('change',change);root.append(bar);
  return ()=>{document.removeEventListener('click',click);editor.off('change',change);bar.remove();frame.remove();document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',finish);document.removeEventListener('pointercancel',finish);document.removeEventListener('keydown',escapeResize);document.removeEventListener('scroll',reposition,true);document.removeEventListener('load',reposition,true);window.removeEventListener('resize',reposition);};
}

const imageCaches=new WeakMap();
const hydrationRuns=new WeakMap();
const hydratedImages=new WeakMap();
const IMAGE_CACHE_LIMIT=16*1024*1024; // Approximate UTF-16 bytes, excluding browser image surfaces.
function trimImageCache(cache){let bytes=0;for(const entry of cache.values())bytes+=entry.bytes||0;for(const [key,entry] of cache){if(bytes<=IMAGE_CACHE_LIMIT)break;if(entry.bytes){bytes-=entry.bytes;cache.delete(key);}}}
export async function hydrateImages(editor,id){
  if(!window.desktop?.readImage)return;
  const view=editor.wwEditor.view;
  const run=(hydrationRuns.get(editor)||0)+1;hydrationRuns.set(editor,run);
  if(view.isDestroyed)return;
  let cache=imageCaches.get(editor);if(!cache){cache=new Map();imageCaches.set(editor,cache);}
  const candidates=[];view.state.doc.descendants((node,pos)=>{if(node.type.name==='image'&&!/^(?:data:|https?:)/i.test(node.attrs.imageUrl))candidates.push({node,pos});});
  const sources=new Set(candidates.map(({node})=>node.attrs.imageUrl));
  for(const key of cache.keys())if(!sources.has(key))cache.delete(key);
  const missing=[];
  async function hydrate({node,pos}){
    if(view.isDestroyed||hydrationRuns.get(editor)!==run)return;
    const dom=view.nodeDOM(pos),image=dom?.tagName==='IMG'?dom:dom?.querySelector('img');
    if(image){image.setAttribute('loading','lazy');image.setAttribute('decoding','async');}
    const previous=image&&hydratedImages.get(image);
    if(previous?.src===node.attrs.imageUrl&&Date.now()-previous.time<30000)return;
    const src=node.attrs.imageUrl;
    let entry=cache.get(src);
    // Reuse in-flight reads too. Refresh failures quickly and successful images
    // periodically so externally replaced attachments can become visible.
    if(!entry||Date.now()-entry.time>(entry.failed?5000:30000)){
      entry={time:Date.now()};cache.set(src,entry);
      entry.promise=window.desktop.readImage(id,src).catch(error=>({ok:false,error:error.message})).then(result=>{entry.failed=!result.ok;entry.bytes=result.data?result.data.length*2:0;trimImageCache(cache);return result;});
    }
    const result=await entry.promise;
    if(view.isDestroyed||view.state.doc.nodeAt(pos)!==node)return;
    if(result.ok){if(image?.getAttribute('src')!==result.data)image?.setAttribute('src',result.data);image?.removeAttribute('data-image-missing');if(image)hydratedImages.set(image,{src,time:Date.now()});}
    else {image?.setAttribute('data-image-missing','true');missing.push({node,src});}
  }
  let cursor=0;
  await Promise.all(Array.from({length:Math.min(4,candidates.length)},async()=>{while(cursor<candidates.length){if(view.isDestroyed||hydrationRuns.get(editor)!==run)return;await hydrate(candidates[cursor++]);}}));
  if(view.isDestroyed||hydrationRuns.get(editor)!==run)return;
  const root=view.dom.closest('#editor');if(!root)return;
  root.querySelector('.missing-images')?.remove();
  if(!missing.length)return;
  const panel=document.createElement('div');panel.className='missing-images';panel.setAttribute('role','status');
  const heading=document.createElement('strong');heading.textContent='部分本地图片无法读取';panel.append(heading);
  const help=document.createElement('p');help.textContent='请把配套图片文件夹放回文档旁，或重新选择图片。重新选择后可撤销。';panel.append(help);
  for(const {node,src} of missing){
    const row=document.createElement('div'),label=document.createElement('span'),button=document.createElement('button');
    label.textContent=src;button.type='button';button.textContent='重新选择';
    button.onclick=()=>{
      const input=document.createElement('input');input.type='file';input.accept='image/png,image/jpeg,image/webp,image/gif';
      input.onchange=()=>{const file=input.files[0];if(!file)return;
        imageBlobHook(file,newSrc=>{
          if(view.isDestroyed)return;
          let position=null;view.state.doc.descendants((candidate,pos)=>{if(candidate===node)position=pos;});
          if(position===null)return;
          view.dispatch(closeHistory(view.state.tr).setNodeMarkup(position,null,{...node.attrs,imageUrl:newSrc}));
          hydrateImages(editor,id).catch(()=>{});
        },id);
      };input.click();
    };row.append(label,button);panel.append(row);
  }
  root.append(panel);
}
