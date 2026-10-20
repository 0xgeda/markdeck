const fs=require('node:fs');
const path=require('node:path');
const MarkdownIt=require('markdown-it');
const limits=require('./limits.cjs');
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
// Render a snapshot, never rewrite the source. Only generated image paths reach CLI.
function prepareContent(workspace,doc,directory){
  const md=new MarkdownIt({html:true,linkify:true}),images=new Map(),warnings=new Set();let total=Buffer.byteLength(doc.body);
  const image=(src,alt='')=>{
    if(images.has(src))return images.get(src).replace('caption=""',`caption="${escape(alt)}"`);
    let attr;
    if(/^(https?:)?\/\//i.test(src))attr=`href="${escape(src.startsWith('//')?'https:'+src:src)}"`;
    else{
      let bytes,ext;
      const data=src.match(/^data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/]+=*)$/);
      if(data){bytes=Buffer.from(data[2],'base64');ext=data[1];}
      else{const filename=workspace.attachments.resolve(doc,src);bytes=fs.readFileSync(filename);ext=path.extname(filename).slice(1);}
      if(bytes.length>limits.maxImageBytes)throw new Error('图片超过允许大小，请先压缩');
      total+=bytes.length;if(total>limits.maxFeishuBytes)throw new Error('正文与图片总量超过飞书上传上限');
      const name=`image-${images.size}.${ext}`;fs.writeFileSync(path.join(directory,name),bytes);attr=`path="@./${name}"`;
    }
    const xml=`<img ${attr} caption=""/>`;images.set(src,xml);return xml.replace('caption=""',`caption="${escape(alt)}"`);
  };
  md.renderer.rules.image=(tokens,i)=>image(tokens[i].attrGet('src'),tokens[i].content);
  md.renderer.rules.strong_open=()=>'<b>';md.renderer.rules.strong_close=()=>'</b>';
  md.renderer.rules.s_open=()=>'<del>';md.renderer.rules.s_close=()=>'</del>';
  md.renderer.rules.fence=(tokens,i)=>`<pre lang="${escape(tokens[i].info.split(/\s/)[0]||'text')}"><code>${escape(tokens[i].content)}</code></pre>`;
  md.renderer.rules.code_block=(tokens,i)=>`<pre><code>${escape(tokens[i].content)}</code></pre>`;
  for(const tag of ['th','td']){md.renderer.rules[tag+'_open']=()=>`<${tag}><p>`;md.renderer.rules[tag+'_close']=()=>`</p></${tag}>`;}
  const html=(tokens,i)=>tokens[i].content.replace(/<img\b[^>]*>|<br\s*\/?>|[^<]+|</gi,part=>{
    if(/^<img\b/i.test(part)){
      const attr=name=>{const match=part.match(new RegExp('\\s'+name+'\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))','i'));return md.utils.unescapeAll(match?.[1]??match?.[2]??match?.[3]??'');};
      return image(attr('src'),attr('alt'));
    }
    if(/^<br/i.test(part))return '<br/>';
    warnings.add('自定义 HTML 已按文本保留，图片尺寸与主题样式不随文上传。');return escape(part);
  });
  md.renderer.rules.html_inline=html;md.renderer.rules.html_block=html;
  const xml=`<title>${escape(doc.title)}</title>\n${md.render(doc.body)}`;
  return {xml,warnings:[...warnings],images:images.size};
}
module.exports={prepareContent};
