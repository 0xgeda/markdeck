import path from 'node:path';import fs from 'node:fs';
// Pure scanner: find Markdown image refs ![alt](src "title"), classify each by location/accessibility.
// HTML <img> tags intentionally out of scope. src is NOT url-decoded in output; decoding is only used
// internally (once) for filesystem lookups so authors can write ![](my%20pic.png) and reference a file
// literally named "my pic.png".
const IMG_RE=/!\[([^\]]*)\]\(\s*(<[^>\n]*>|[^\s()]+(?:\([^)]*\)[^\s()]*)*)?\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|\(((?:[^)\\]|\\.)*)\))?\s*\)/g;
function maskRanges(md){
  // Build a boolean mask of positions to skip: fenced code (``` or ~~~), inline code (`...`), html comments.
  const mask=new Uint8Array(md.length);
  // Fenced code blocks first (line-based).
  const lines=md.split('\n');let off=0,fence=null;
  for(const line of lines){const m=line.match(/^(\s{0,3})(`{3,}|~{3,})/);
    if(fence){if(m&&line.trim().startsWith(fence))fence=null;for(let i=0;i<line.length;i++)mask[off+i]=1;}
    else if(m){fence=m[2];for(let i=0;i<line.length;i++)mask[off+i]=1;}
    off+=line.length+1;}
  // HTML comments.
  for(let i=0;i<md.length-3;i++){if(md[i]==='<'&&md.startsWith('<!--',i)){const end=md.indexOf('-->',i+4);const stop=end<0?md.length:end+3;for(let j=i;j<stop;j++)mask[j]=1;i=stop-1;}}
  // Inline code `...` or ``...``. Only outside fenced blocks (fenced already masked).
  let i=0;while(i<md.length){if(mask[i]){i++;continue;}if(md[i]==='`'){let n=0;while(md[i+n]==='`')n++;const run='`'.repeat(n);const start=i;const end=md.indexOf(run,i+n);if(end<0){i+=n;continue;}for(let j=start;j<end+n;j++)mask[j]=1;i=end+n;}else i++;}
  return mask;
}
function lineCol(md,index){let line=1,col=1;for(let i=0;i<index;i++){if(md[i]==='\n'){line++;col=1;}else col++;}return{line,column:col};}
function stripAngle(src){return src&&src.startsWith('<')&&src.endsWith('>')?src.slice(1,-1):src;}
function isRemote(src){return /^(https?:)?\/\//i.test(src);}
function isData(src){return /^data:/i.test(src);}
export function scanImages(markdown,docDir){
  const results=[];if(typeof markdown!=='string'||!markdown)return results;
  const mask=maskRanges(markdown);const re=new RegExp(IMG_RE.source,'g');let m;
  while((m=re.exec(markdown))){
    if(mask[m.index])continue;
    const raw=m[0],alt=m[1]||'',src=stripAngle((m[2]||'').trim()),title=m[3]??m[4]??m[5]??null;
    const{line,column}=lineCol(markdown,m.index);
    const base={raw,src,alt,title,line,column};
    if(!src){results.push({...base,status:'missing',resolved:null});continue;}
    if(isData(src)){results.push({...base,status:'data'});continue;}
    if(isRemote(src)){results.push({...base,status:'remote'});continue;}
    if(!docDir){results.push({...base,status:'no-doc-dir'});continue;}
    // Decode once for filesystem lookup; keep original src unchanged in output.
    let decoded=src;try{decoded=decodeURIComponent(src);}catch{}
    const resolved=path.resolve(docDir,decoded);
    const docDirAbs=path.resolve(docDir);
    const docDirReal=(()=>{try{return fs.realpathSync(docDir);}catch{return docDirAbs;}})();
    // Follow symlinks before inside-docDir check so a symlink inside .assets/ pointing out counts as outside.
    let real=resolved;try{real=fs.realpathSync(resolved);}catch{}
    const insideOf=root=>real===root||real.startsWith(root+path.sep);
    const inside=insideOf(docDirReal)||insideOf(docDirAbs);
    const exists=(()=>{try{fs.statSync(resolved);return true;}catch{return false;}})();
    if(!inside){const abs=path.isAbsolute(decoded)||real!==resolved;results.push({...base,status:abs?'absolute-outside':'relative-outside',resolved});continue;}
    results.push({...base,status:exists?'ok':'missing',resolved});
  }
  return results;
}
