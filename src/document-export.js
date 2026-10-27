import palettes from '../desktop/themes.json';
import DOMPurify from 'dompurify';
import editorCSS from '@toast-ui/editor/dist/toastui-editor.css?raw';
import appCSS from './style.css?raw';
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function exportDocument(editor,doc,theme,format){
  const holder=document.createElement('div');holder.innerHTML=DOMPurify.sanitize(editor.getHTML());
  for(const image of holder.querySelectorAll('img')){
    const src=image.getAttribute('src')||'';if(src.startsWith('data:'))continue;
    if(window.desktop?.readImage&&!/^https?:/i.test(src)){const result=await window.desktop.readImage(doc.id,src);if(!result.ok)throw new Error(result.error);image.src=result.data;continue;}
    const bitmap=new Image();bitmap.crossOrigin='anonymous';
    await new Promise((resolve,reject)=>{bitmap.onload=resolve;bitmap.onerror=()=>reject(new Error('外链图片无法打包，请将图片重新插入文档后导出'));bitmap.src=image.src;});
    const canvas=document.createElement('canvas');canvas.width=bitmap.naturalWidth;canvas.height=bitmap.naturalHeight;canvas.getContext('2d').drawImage(bitmap,0,0);
    try{image.src=canvas.toDataURL('image/png');}catch{throw new Error('图片不允许离线导出，请重新插入本地图片');}finally{canvas.width=canvas.height=0;}
  }
  const palette=palettes[theme]||palettes.light;const variables=Object.entries(palette).filter(([key])=>!['name','mode','onAccent'].includes(key)).map(([key,value])=>'--'+key+':'+value).concat('--on-accent:'+palette.onAccent).join(';');
  const html=`<!doctype html><html lang="zh-CN" data-theme="${escape(theme)}" style="${escape(variables)};color-scheme:${palette.mode}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:"><title>${escape(doc.title)}</title><style>${editorCSS}\n${appCSS}\nbody{padding:40px 28px;background:var(--page);color:var(--ink)}article#editor{max-width:1040px;margin:auto}#editor .toastui-editor-contents{padding:0}article>h1{font-size:32px;margin:0 0 32px}#editor .toastui-editor-contents table{width:100%;table-layout:auto}#editor .toastui-editor-contents img{max-width:100%;height:auto}#editor .toastui-editor-ww-code-block::after{display:none!important;content:none!important}
@media print{
  :root{color-scheme:light!important;--page:#fff!important;--panel:#f5f6f7!important;--ink:#172018!important;--secondary:#465448!important;--border:#c8d0ca!important;--code:#f5f6f7!important;--accent:#245b36!important;--on-accent:#fff!important}
  html,body{background:white!important;color:#172018!important;padding:0}
  #editor .toastui-editor-contents,#editor .toastui-editor-contents :is(p,li,strong,h1,h2,h3,h4,h5,h6,td,th,pre,code){color:#172018!important}
  #editor .toastui-editor-contents pre{white-space:pre-wrap;overflow-wrap:anywhere}
  #editor .toastui-editor-contents table{display:table;width:100%;table-layout:fixed!important}
  #editor .toastui-editor-contents :is(th,td){min-width:0!important;overflow-wrap:anywhere;white-space:normal;padding:6px}
  thead{display:table-header-group}tr,img{break-inside:avoid}h1,h2,h3,h4{break-after:avoid}a{color:inherit!important}
}</style></head><body><article id="editor"><h1>${escape(doc.title)}</h1><div class="toastui-editor-contents">${holder.innerHTML}</div></article></body></html>`;
  if(window.desktop){const result=await window.desktop.exportDocument(doc.title,html,format);if(!result.ok)throw new Error(result.error);return !result.canceled;}
  if(format==='pdf'){const popup=window.open('','_blank');if(!popup)throw new Error('请允许打开打印窗口');popup.document.write(html);popup.document.close();await popup.document.fonts.ready;popup.print();return true;}
  const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=doc.title.replace(/[\\/:*?"<>|]/g,'_')+'.html';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return true;
}
