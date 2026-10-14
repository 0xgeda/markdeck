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

export async function hydrateImages(editor,id){
  if(!window.desktop?.readImage)return;
  const view=editor.wwEditor.view,candidates=[];view.state.doc.descendants((node,pos)=>{if(node.type.name==='image'&&!/^(?:data:|https?:)/i.test(node.attrs.imageUrl))candidates.push({node,pos});});
  for(const {node,pos} of candidates){const result=await window.desktop.readImage(id,node.attrs.imageUrl);if(!result.ok)continue;if(view.state.doc.nodeAt(pos)!==node)continue;const image=view.nodeDOM(pos);if(image?.tagName==='IMG')image.src=result.data;else image?.querySelector('img')?.setAttribute('src',result.data);}
}
