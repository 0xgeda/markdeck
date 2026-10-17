import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {scanImages} from '../src/image-scan.js';
function mkdir(){return fs.mkdtempSync(path.join(os.tmpdir(),'markdeck-scan-'));}
function clean(dir){try{fs.rmSync(dir,{recursive:true,force:true});}catch{}}

test('empty markdown returns empty array',()=>{
  assert.deepEqual(scanImages('',null),[]);
  assert.deepEqual(scanImages('no images here\njust text',null),[]);
});

test('simple ok case: existing file inside docDir',()=>{
  const dir=mkdir();try{fs.writeFileSync(path.join(dir,'a.png'),'x');
    const r=scanImages('hi ![](a.png) there',dir);
    assert.equal(r.length,1);assert.equal(r[0].status,'ok');
    assert.equal(r[0].src,'a.png');assert.equal(r[0].resolved,path.resolve(dir,'a.png'));
  }finally{clean(dir);}
});

test('missing: file not present',()=>{
  const dir=mkdir();try{
    const r=scanImages('![](nope.png)',dir);
    assert.equal(r.length,1);assert.equal(r[0].status,'missing');
  }finally{clean(dir);}
});

test('remote http / https / protocol-relative',()=>{
  const dir=mkdir();try{
    const md='![](http://a.com/x.png)\n![](https://b.com/y.png)\n![](//cdn.example.com/x.png)';
    const r=scanImages(md,dir);
    assert.equal(r.length,3);assert.ok(r.every(x=>x.status==='remote'));
  }finally{clean(dir);}
});

test('data URI',()=>{
  const r=scanImages('![](data:image/png;base64,AAAA)',null);
  assert.equal(r.length,1);assert.equal(r[0].status,'data');
});

test('absolute path outside docDir',()=>{
  const dir=mkdir();try{
    const r=scanImages('![](/tmp/foo-xyz-not-real.png)',dir);
    assert.equal(r.length,1);assert.equal(r[0].status,'absolute-outside');
  }finally{clean(dir);}
});

test('relative path escaping docDir with ..',()=>{
  const dir=mkdir();try{
    const r=scanImages('![](../../etc/passwd)',dir);
    assert.equal(r.length,1);assert.equal(r[0].status,'relative-outside');
  }finally{clean(dir);}
});

test('docDir=null → every local src gets no-doc-dir; remote/data unaffected',()=>{
  const md='![](a.png) ![](http://x.com/y.png) ![](data:image/png;base64,A)';
  const r=scanImages(md,null);
  assert.equal(r.length,3);
  assert.equal(r[0].status,'no-doc-dir');
  assert.equal(r[1].status,'remote');
  assert.equal(r[2].status,'data');
});

test('image inside fenced code block → not reported',()=>{
  const md='```\n![](a.png)\n```\nreal: ![](b.png)';
  const dir=mkdir();try{
    const r=scanImages(md,dir);
    assert.equal(r.length,1);assert.equal(r[0].src,'b.png');
  }finally{clean(dir);}
});

test('image inside inline code → not reported',()=>{
  const md='before `![](a.png)` after ![](b.png)';
  const dir=mkdir();try{
    const r=scanImages(md,dir);
    assert.equal(r.length,1);assert.equal(r[0].src,'b.png');
  }finally{clean(dir);}
});

test('image inside HTML comment → not reported',()=>{
  const md='<!-- ![](secret.png) --> real ![](x.png)';
  const dir=mkdir();try{
    const r=scanImages(md,dir);
    assert.equal(r.length,1);assert.equal(r[0].src,'x.png');
  }finally{clean(dir);}
});

test('URL-encoded filename resolves to spaced file on disk',()=>{
  const dir=mkdir();try{fs.writeFileSync(path.join(dir,'my pic.png'),'x');
    const r=scanImages('![](my%20pic.png)',dir);
    assert.equal(r.length,1);
    assert.equal(r[0].status,'ok');
    assert.equal(r[0].src,'my%20pic.png');
  }finally{clean(dir);}
});

test('image with title captured',()=>{
  const dir=mkdir();try{fs.writeFileSync(path.join(dir,'x.png'),'x');
    const r=scanImages('![alt](x.png "the title")',dir);
    assert.equal(r.length,1);
    assert.equal(r[0].status,'ok');
    assert.equal(r[0].title,'the title');
    assert.equal(r[0].alt,'alt');
  }finally{clean(dir);}
});

test('duplicates are not deduped',()=>{
  const dir=mkdir();try{fs.writeFileSync(path.join(dir,'a.png'),'x');
    const r=scanImages('![](a.png) and ![](a.png)',dir);
    assert.equal(r.length,2);
    assert.ok(r.every(x=>x.status==='ok'));
  }finally{clean(dir);}
});

test('line/column of multi-line document',()=>{
  const dir=mkdir();try{
    const md='line1 text\nline2 ![](a.png) more\n  ![](b.png)';
    const r=scanImages(md,dir);
    assert.equal(r.length,2);
    assert.equal(r[0].line,2);assert.equal(r[0].column,7);
    assert.equal(r[1].line,3);assert.equal(r[1].column,3);
  }finally{clean(dir);}
});

test('HTML <img> with existing src → kind:html, status:ok',()=>{
  const dir=mkdir();try{fs.writeFileSync(path.join(dir,'h.png'),'x');
    const r=scanImages('<img src="h.png" alt="x">',dir);
    assert.equal(r.length,1);
    assert.equal(r[0].kind,'html');
    assert.equal(r[0].status,'ok');
    assert.equal(r[0].src,'h.png');
    assert.equal(r[0].alt,'x');
  }finally{clean(dir);}
});

test('HTML <img> missing → status:missing',()=>{
  const dir=mkdir();try{
    const r=scanImages('<img src="images/gone.png">',dir);
    assert.equal(r.length,1);
    assert.equal(r[0].kind,'html');
    assert.equal(r[0].status,'missing');
  }finally{clean(dir);}
});

test('HTML <img> remote and single-quoted src',()=>{
  const r=scanImages("<img src='https://a.com/x.png' alt='remote'>",null);
  assert.equal(r.length,1);
  assert.equal(r[0].status,'remote');
  assert.equal(r[0].alt,'remote');
});

test('markdown and HTML images mixed, sorted by position',()=>{
  const dir=mkdir();try{fs.writeFileSync(path.join(dir,'a.png'),'x');
    const md='top\n<img src="miss.png">\n![](a.png)\n<img src="a.png" alt="">';
    const r=scanImages(md,dir);
    assert.equal(r.length,3);
    assert.equal(r[0].kind,'html');assert.equal(r[0].status,'missing');
    assert.equal(r[1].kind,'md');assert.equal(r[1].status,'ok');
    assert.equal(r[2].kind,'html');assert.equal(r[2].status,'ok');
  }finally{clean(dir);}
});

test('HTML <img> inside fenced code block is skipped',()=>{
  const dir=mkdir();try{
    const md='```html\n<img src="skip.png">\n```\n<img src="catch.png">';
    const r=scanImages(md,dir);
    assert.equal(r.length,1);
    assert.equal(r[0].src,'catch.png');
  }finally{clean(dir);}
});

test('symlink inside docDir pointing outside → absolute-outside',()=>{
  const dir=mkdir();const outside=mkdir();try{
    fs.writeFileSync(path.join(outside,'target.png'),'x');
    const assets=path.join(dir,'.assets');fs.mkdirSync(assets);
    try{fs.symlinkSync(path.join(outside,'target.png'),path.join(assets,'link.png'));}
    catch(e){return;/* symlink unsupported */}
    const r=scanImages('![](.assets/link.png)',dir);
    assert.equal(r.length,1);
    assert.equal(r[0].status,'absolute-outside');
  }finally{clean(dir);clean(outside);}
});
