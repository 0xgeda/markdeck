const path=require('node:path');
const fs=require('node:fs');
const MarkdownIt=require('markdown-it');
const JSZip=require('jszip');
const limits=require('./limits.cjs');
// Keep Markdown byte-for-byte and retain relative paths, including reference images.
async function bundleDocument(workspace,id){
  const doc=workspace.attachments.doc(id),zip=new JSZip(),sources=new Set();
  const parser=new MarkdownIt({html:true});
  function collect(tokens){for(const token of tokens){
    if(token.type==='image')sources.add(token.attrGet('src'));
    if(token.type==='html_inline'||token.type==='html_block'){
      for(const match of token.content.matchAll(/<img\b[^>]*\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi))sources.add(parser.utils.unescapeAll(match[1]??match[2]??match[3]));
    }
    if(token.children)collect(token.children);
  }}
  collect(parser.parse(doc.body,{}));
  let total=Buffer.byteLength(doc.body),count=0,external=0;const missing=[];
  for(const src of sources){
    if(/^data:/i.test(src))continue;
    if(/^(?:https?:)?\/\//i.test(src)){external++;continue;}
    try{
      const file=workspace.attachments.resolve(doc,src),relative=decodeURIComponent(src).split(path.sep).join('/').replace(/^\.\//,'');
      const bytes=fs.readFileSync(file);total+=bytes.length;
      if(total>limits.maxBundleBytes)throw new Error('打包内容超过 100 MB');
      zip.file(relative,bytes);count++;
    }catch(error){missing.push(`${src}：${error.message}`);}
  }
  if(missing.length)throw new Error('以下图片无法打包，请先修复：\n'+missing.slice(0,20).join('\n'));
  const name=doc.filePath?path.basename(doc.filePath):(doc.title.replace(/[\\/:*?"<>|]/g,'_').slice(0,100)||'文档')+'.md';
  zip.file(name,doc.body);
  return {bytes:await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}),count,external};
}
module.exports={bundleDocument};
