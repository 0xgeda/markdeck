const MB=1024*1024;
export async function compressImage(blob){
  if(!/^image\/(png|jpeg|gif|webp)$/i.test(blob.type))throw new Error('请选择 PNG、JPEG、GIF 或 WebP 图片。');
  if(blob.size<=3*MB)return blob;
  // Re-encoding GIF would silently discard animation.
  if(blob.type.toLowerCase()==='image/gif')throw new Error('超过 3 MB 的 GIF 暂不自动压缩，以保留动画；请缩小 GIF 后再插入。');
  if(blob.size>50*MB)throw new Error('图片超过 50 MB，请先缩小后再插入。');
  let image;
  try{image=await createImageBitmap(blob);}catch{throw new Error('无法读取这张图片，请换一张或重新导出图片。');}
  const canvas=document.createElement('canvas');
  try{
    if(!image.width||!image.height||image.width*image.height>64_000_000)throw new Error('图片尺寸过大，请先缩小后再插入。');
    const context=canvas.getContext('2d');
    if(!context)throw new Error('图片压缩不可用，请重试。');
    let scale=Math.min(1,2560/Math.max(image.width,image.height));
    let smallest=null;
    for(let attempt=0;attempt<4;attempt++){
      canvas.width=Math.max(1,Math.round(image.width*scale));
      canvas.height=Math.max(1,Math.round(image.height*scale));
      context.drawImage(image,0,0,canvas.width,canvas.height);
      for(const quality of [.9,.8,.7]){
        // WebP retains transparent backgrounds and avoids flattening PNG onto black.
        const result=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));
        if(!result)throw new Error('图片压缩失败，请重新选择。');
        if(!smallest||result.size<smallest.size)smallest=result;
        if(result.size<=MB)return result;
      }
      scale*=.75;
    }
    if(smallest?.size<=3*MB)return smallest;
    throw new Error('图片压缩后仍然过大，请先缩小后再插入。');
  }finally{image.close();canvas.width=canvas.height=0;}
}
