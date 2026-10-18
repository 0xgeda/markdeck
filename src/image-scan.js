import path from 'node:path';import fs from 'node:fs';
import MarkdownIt from 'markdown-it';
const blockParser=new MarkdownIt({html:true});
// Pure scanner: find Markdown image refs ![alt](src "title") AND HTML <img src="..."> tags.
// Classify each by location/accessibility. src is NOT url-decoded in output; decoding is only used
// internally (once) for filesystem lookups so authors can write ![](my%20pic.png) and reference a file
// literally named "my pic.png". HTML <img> entries carry kind:'html' and cannot be auto-rewritten,
// but can be deleted. Markdown entries carry kind:'md'.
const IMG_RE=/!\[([^\]]*)\]\(\s*(<[^>\n]*>|[^\s()]+(?:\([^)]*\)[^\s()]*)*)?\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|\(((?:[^)\\]|\\.)*)\))?\s*\)/g;
const HTML_IMG_RE=/<img\b[^>]*?>/gi;
const ATTR_SRC=/\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;
const ATTR_ALT=/\salt\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;
function maskRanges(md){
  // Build a boolean mask of positions to skip: fenced code (``` or ~~~), inline code (`...`), html comments.
  const mask=new Uint8Array(md.length);
  // Use the existing Markdown parser to distinguish indented code from list and
  // paragraph continuations; token line maps also cover nested fenced blocks.
  const offsets=[0];
  for(let i=0;i<md.length;i++)if(md[i]==='\n')offsets.push(i+1);
  for(const token of blockParser.parse(md,{})){
    if(!['code_block','fence'].includes(token.type)||!token.map)continue;
    mask.fill(1,offsets[token.map[0]],offsets[token.map[1]]??md.length);
  }
  // HTML comments.
  for(let i=0;i<md.length-3;i++){if(md[i]==='<'&&md.startsWith('<!--',i)){const end=md.indexOf('-->',i+4);const stop=end<0?md.length:end+3;for(let j=i;j<stop;j++)mask[j]=1;i=stop-1;}}
  // Inline code `...` or ``...``. Only outside fenced blocks (fenced already masked).
  let i=0;while(i<md.length){if(mask[i]){i++;continue;}if(md[i]==='`'){let n=0;while(md[i+n]==='`')n++;const run='`'.repeat(n);const start=i;const end=md.indexOf(run,i+n);if(end<0){i+=n;continue;}for(let j=start;j<end+n;j++)mask[j]=1;i=end+n;}else i++;}
  return mask;
}
function isEscaped(md,index){
  let slashes=0;while(index>0&&md[--index]==='\\')slashes++;
  return slashes%2===1;
}
function lineCol(md,index){let line=1,col=1;for(let i=0;i<index;i++){if(md[i]==='\n'){line++;col=1;}else col++;}return{line,column:col};}
function stripAngle(src){return src&&src.startsWith('<')&&src.endsWith('>')?src.slice(1,-1):src;}
function isRemote(src){return /^(https?:)?\/\//i.test(src);}
function isData(src){return /^data:/i.test(src);}
function classify(base,docDir,src){
  if(!src)return {...base,status:'missing',resolved:null};
  if(isData(src))return {...base,status:'data'};
  if(isRemote(src))return {...base,status:'remote'};
  if(!docDir)return {...base,status:'no-doc-dir'};
  let decoded=src;try{decoded=decodeURIComponent(src);}catch{}
  const resolved=path.resolve(docDir,decoded);
  const docDirAbs=path.resolve(docDir);
  const docDirReal=(()=>{try{return fs.realpathSync(docDir);}catch{return docDirAbs;}})();
  let real=resolved;try{real=fs.realpathSync(resolved);}catch{}
  const insideOf=root=>real===root||real.startsWith(root+path.sep);
  const inside=insideOf(docDirReal)||insideOf(docDirAbs);
  const exists=(()=>{try{fs.statSync(resolved);return true;}catch{return false;}})();
  if(!inside){const abs=path.isAbsolute(decoded)||real!==resolved;return {...base,status:abs?'absolute-outside':'relative-outside',resolved};}
  return {...base,status:exists?'ok':'missing',resolved};
}
function extractAttr(tag,re){const m=tag.match(re);if(!m)return '';return (m[1]??m[2]??m[3]??'').trim();}
export function scanImages(markdown,docDir){
  const results=[];if(typeof markdown!=='string'||!markdown)return results;
  const mask=maskRanges(markdown);
  const mdRe=new RegExp(IMG_RE.source,'g');let m;
  while((m=mdRe.exec(markdown))){
    if(mask[m.index]||isEscaped(markdown,m.index))continue;
    const raw=m[0],alt=m[1]||'',src=stripAngle((m[2]||'').trim()),title=m[3]??m[4]??m[5]??null;
    const{line,column}=lineCol(markdown,m.index);
    const base={raw,src,alt,title,line,column,index:m.index,length:raw.length,kind:'md'};
    results.push(classify(base,docDir,src));
  }
  const htmlRe=new RegExp(HTML_IMG_RE.source,'gi');let h;
  while((h=htmlRe.exec(markdown))){
    if(mask[h.index]||isEscaped(markdown,h.index))continue;
    const raw=h[0],src=extractAttr(raw,ATTR_SRC),alt=extractAttr(raw,ATTR_ALT);
    const{line,column}=lineCol(markdown,h.index);
    const base={raw,src,alt,title:null,line,column,index:h.index,length:raw.length,kind:'html'};
    results.push(classify(base,docDir,src));
  }
  results.sort((a,b)=>a.index-b.index);
  return results;
}
