import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';
import {build} from 'esbuild';
const require=createRequire(import.meta.url);
const esm=await build({stdin:{contents:"import Editor from '@toast-ui/editor';window.TestEditor=Editor;",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',platform:'browser'});
const umd=await build({stdin:{contents:`window.TestEditor=require(${JSON.stringify(require.resolve('@toast-ui/editor'))});`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',platform:'browser'});
for(const [format,source] of [['UMD',umd.outputFiles[0].text],['ESM',esm.outputFiles[0].text]]){
 const dom=new JSDOM('<main></main>',{url:'https://test.invalid',runScripts:'dangerously',pretendToBeVisual:true});const w=dom.window;
 w.matchMedia=()=>({matches:false});w.scrollTo=()=>{};
 w.Range.prototype.getBoundingClientRect=()=>({left:0,top:0,right:0,bottom:0});w.Range.prototype.getClientRects=()=>[];
 try{
  w.eval(source);const Editor=w.TestEditor||w.toastui.Editor;
  function create(body){const el=w.document.createElement('div');w.document.body.append(el);return new Editor({el,initialValue:body,initialEditType:'wysiwyg',usageStatistics:false,autofocus:false});}
  function nodes(editor){const result=[],pending=[editor.toastMark.getRootNode()];while(pending.length){const node=pending.pop();result.push(node);for(let child=node.firstChild;child;child=child.next)pending.push(child);}return result;}
  const survivor=create('# 保留文档\n\n- 列表\n- **粗体**\n\n> 引用');
  const liveNodes=nodes(survivor);
  for(let i=0;i<10;i++){
   const retired=create('# 关闭文档\n\n## 子章节\n\n正文\n\n- 列表\n- 嵌套内容\n\n```js\nconst x=1;\n```');
   const oldNodes=nodes(retired),index=retired.toastMark;
   assert.ok(oldNodes.length>5);retired.destroy();
   for(const node of oldNodes)assert.notEqual(index.findNodeById(node.id),node,'destroyed document remains globally indexed');
   for(const node of liveNodes.filter(n=>n.id!==-1))assert.equal(survivor.toastMark.findNodeById(node.id),node,'destroy cleared another live editor');
   assert.match(survivor.getMarkdown(),/保留文档/);
  }
  survivor.setMarkdown('# 仍可编辑\n\n更新正文');assert.match(survivor.getMarkdown(),/更新正文/);survivor.destroy();
  console.log(`PASS ${format}: retired nodes released; concurrent editor lookup and editing preserved`);
 }finally{w.close();}
}
