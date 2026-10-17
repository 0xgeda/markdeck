import PptxGenJS from 'pptxgenjs';
import {arrangePage,palettes} from './draft.js';
async function imageData(src){
  if(/^data:image\/(png|jpeg|gif);base64,/i.test(src))return src;
  if(!/^data:image\/|^https?:\/\//i.test(src))throw new Error('图片地址无法导出，请重新插入该图片');
  const image=new Image();image.crossOrigin='anonymous';
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('图片读取失败，请检查图片链接或重新插入'));image.src=src;});
  const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  const context=canvas.getContext('2d');if(!context)throw new Error('图片转换失败');context.drawImage(image,0,0);
  try{return canvas.toDataURL('image/png');}finally{canvas.width=canvas.height=0;}
}
export async function exportPptx(draft,document=globalThis.document){
  const pptx=new PptxGenJS();pptx.layout='LAYOUT_WIDE';pptx.author='Larkdown';pptx.title=draft.title;pptx.subject='Markdown 演示确认稿';pptx.lang='zh-CN';
  pptx.theme={headFontFace:'Microsoft YaHei',bodyFontFace:'Microsoft YaHei',lang:'zh-CN'};
  const colors=palettes[draft.theme]||palettes.minimal;
  for(const [index,page] of draft.pages.entries()){
    const slide=pptx.addSlide();slide.background={color:colors.bg};
    slide.addText(page.title,{x:.6,y:.4,w:12.13,h:.9,fontSize:Math.max(18,Math.min(28,28*44/Math.max(1,[...page.title].length))),bold:true,color:colors.ink,margin:0,breakLine:false,fit:'shrink'});
    slide.addShape(pptx.ShapeType.line,{x:.6,y:1.35,w:12.13,h:0,line:{color:colors.accent,width:1}});
    const layout=arrangePage(page,document);
    if(layout.overflow)throw new Error(`第 ${index+1} 页内容过多，请拆分页面后再导出，避免缩成小字或丢失内容。`);
    for(const item of layout.items){
      const {x,y,w,h}=item;
      if(item.type==='text')slide.addText(item.text,{x,y,w,h,fontSize:layout.font,color:colors.ink,margin:0,fit:'shrink',valign:'top',paraSpaceAfterPt:6});
      else if(item.type==='table')slide.addTable(item.rows,{x,y,w,h,fontSize:16,rowH:item.rowHeights,color:colors.ink,fill:colors.bg,border:{color:colors.accent,pt:.5},margin:.05,autoPage:false});
      else if(item.type==='image'){const data=await imageData(item.src);slide.addImage({data,x,y,w,h,sizing:{type:'contain',w,h},altText:item.alt});}
    }
    slide.addText(String(index+1),{x:12,y:7.1,w:.7,h:.2,fontSize:10,color:colors.accent,align:'right'});
    slide.addNotes(page.body);
  }
  return pptx.write({outputType:'base64',compression:true});
}
