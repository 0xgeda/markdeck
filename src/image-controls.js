import {closeHistory} from 'prosemirror-history';
import {compressImage} from './compress-image.js';
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const imageMarkdownRenderer={image:({node},context)=>{
  const attrs=node.attrs.htmlAttrs;
  if(!attrs?.['data-larkdown-image'])return context.origin();
  return {rawHTML:`<img src="${escape(node.attrs.imageUrl)}" alt="${escape(node.attrs.altText||'')}" style="${escape(attrs.style)}" data-larkdown-image="true" data-align="${escape(attrs['data-align']||'center')}" data-size="${escape(attrs['data-size']||'100%')}">`};
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
    const pair=image.getAttribute('style')?.includes('display:inline-block');
    const align=['left','center','right','text-left','text-right'].includes(image.dataset.align)?image.dataset.align:'center';
    const size=['33%','50%','100%'].includes(image.dataset.size)?image.dataset.size:'100%';
    const margin=align==='left'?'0 auto 0 0':align==='right'?'0 0 0 auto':'0 auto';
    const wrap=align.startsWith('text-');
    const style=wrap?`width:45%;max-width:100%;height:auto;display:block;float:${align==='text-left'?'left':'right'};margin:0 4% 20px 0`:pair?'width:48%;max-width:100%;height:auto;display:inline-block;vertical-align:middle;margin:0 1%':`width:${size};max-width:100%;height:auto;display:block;margin:${margin}`;
    tr=tr.setNodeMarkup(pos,null,{...node.attrs,htmlAttrs:{'data-larkdown-image':'true','data-align':align,'data-size':size,style}});
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
    const size=width||old['data-size']||'100%';
    const placement=align||old['data-align']||'center';
    const margin=placement==='left'?'0 auto 0 0':placement==='right'?'0 0 0 auto':'0 auto';
    const style=placement.startsWith('text-')?`width:45%;max-width:100%;height:auto;display:block;float:${placement==='text-left'?'left':'right'};margin:0 4% 20px 0`:`width:${size};max-width:100%;height:auto;display:block;margin:${margin}`;
    const target=position;view.dispatch(view.state.tr.setNodeMarkup(position,null,{...node.attrs,htmlAttrs:{...old,style,'data-larkdown-image':'true','data-align':placement,'data-size':size}}));position=target;bar.hidden=false;
  }
  for(const [label,run] of [['左对齐',()=>format('left')],['居中',()=>format('center')],['右对齐',()=>format('right')],['小图',()=>format(null,'33%')],['中图',()=>format(null,'50%')],['大图',()=>format(null,'100%')],['图左文右',()=>format('text-left')],['图右文左',()=>format('text-right')],['与下一张并排',pair]]){
    const button=document.createElement('button');button.type='button';button.textContent=label;
    button.addEventListener('mousedown',event=>event.preventDefault());button.addEventListener('click',run);bar.append(button);
  }
  function pair(){
    const node=selected();if(node?.type.name!=='image')return;
    const $pos=view.state.doc.resolve(position);
    const paragraph=$pos.parent;
    if(paragraph.type.name!=='paragraph'||paragraph.childCount!==1){window.alert('请把两张图片分别放在相邻的独立段落中，再选择第一张并排。');return;}
    let end=$pos.after();let next=view.state.doc.nodeAt(end);
    while(next?.type.name==='paragraph'&&next.content.size===0){end+=next.nodeSize;next=view.state.doc.nodeAt(end);}
    if(next?.type.name!=='paragraph'||next.childCount!==1||next.firstChild.type.name!=='image'){window.alert('下一段需要是一张图片，才能并排。');return;}
    const resize=image=>image.type.create({...image.attrs,htmlAttrs:{...image.attrs.htmlAttrs,'data-larkdown-image':'true',style:'width:48%;max-width:100%;height:auto;display:inline-block;vertical-align:middle;margin:0 1%'}},null,image.marks);
    const replacement=paragraph.type.create(paragraph.attrs,[resize(node),resize(next.firstChild)]);
    view.dispatch(view.state.tr.replaceWith($pos.before(),end+next.nodeSize,replacement));
    position=$pos.before()+1;bar.hidden=false;
  }
  function click(event){
    const image=event.target.closest('.ProseMirror img[src]');
    if(image&&root.contains(image)){position=view.posAtDOM(image,0);bar.hidden=false;root.querySelector('.table-controls:not(.image-controls)')?.setAttribute('hidden','');}
    else if(!bar.contains(event.target)){bar.hidden=true;position=null;}
  }
  // Hide when the document changes elsewhere: stale positions must never edit another image.
  function change(){bar.hidden=true;position=null;}
  document.addEventListener('click',click);editor.on('change',change);root.append(bar);
  return ()=>{document.removeEventListener('click',click);editor.off('change',change);bar.remove();};
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
