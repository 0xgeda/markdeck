import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';
import {build} from 'esbuild';

const require=createRequire(import.meta.url);
const comments=['<!-- ordinary comment -->','<!-- -->','<!---->','<!--\n研究备注\n---\n保留 -- 分隔符、\t制表符及 <img> 示例\n-->','<!-- first --><!-- second -->','<!-- unfinished\n---\nkeep this source'];
for(const format of ['UMD','ESM']){
 const bundle=await build({stdin:{contents:format==='ESM'?"import Editor from '@toast-ui/editor';window.TestEditor=Editor;":`window.TestEditor=require(${JSON.stringify(require.resolve('@toast-ui/editor'))});`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',platform:'browser'});
 const dom=new JSDOM('<main></main>',{url:'https://test.invalid',runScripts:'dangerously',pretendToBeVisual:true}),w=dom.window;
 w.matchMedia=()=>({matches:false});w.scrollTo=()=>{};w.Range.prototype.getBoundingClientRect=()=>({left:0,top:0,right:0,bottom:0});w.Range.prototype.getClientRects=()=>[];
 try{
  w.eval(bundle.outputFiles[0].text);
  for(const comment of comments){
   const source='# 可编辑正文\n\n正文段落\n\n'+comment;
   const host=w.document.createElement('div');w.document.body.append(host);
   const editor=new w.TestEditor({el:host,initialValue:source,initialEditType:'wysiwyg',usageStatistics:false,autofocus:false});
   try{
    const check=()=>{editor.wwEditor.view.state.doc.check();assert.equal(editor.wwEditor.view.dom.querySelector('[data-html-comment]').textContent,comment);assert.ok(editor.getMarkdown().includes(comment),'comment source changed');};
    check();const view=editor.wwEditor.view;view.dispatch(view.state.tr.insertText('已编辑',2));check();
    for(let i=0;i<3;i++){editor.setMarkdown(editor.getMarkdown(),false);check();}
    assert.match(editor.getMarkdown(),/已编辑/);
   }finally{editor.destroy();host.remove();}
  }
  // A tag containing a comment must stay a tag block, not become a comment.
  const editor=new w.TestEditor({el:w.document.querySelector('main'),initialValue:'<div>可见正文<!-- note --></div>\n\n```html\n<!-- code -- -->\n```',initialEditType:'wysiwyg',usageStatistics:false,autofocus:false});
  try{assert.match(editor.wwEditor.view.dom.textContent,/可见正文/);assert.equal(editor.wwEditor.view.dom.querySelector('[data-html-comment]'),null);assert.match(editor.getMarkdown(),/<!-- code -- -->/);}finally{editor.destroy();}
  console.log(`PASS ${format}: comment blocks survive loading, edits and repeated conversion; HTML tags and code remain distinct`);
 }finally{w.close();}
}
