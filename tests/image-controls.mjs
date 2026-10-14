import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
const bundle=await build({stdin:{contents:`import Editor from '@toast-ui/editor';import controls,{imageMarkdownRenderer,restoreImageLayout,imageBlobHook} from './src/image-controls.js';window.restore=restoreImageLayout;window.imageBlobHook=imageBlobHook;window.make=()=>{const root=document.querySelector('#editor');const editor=new Editor({el:root,initialEditType:'wysiwyg',initialValue:'![first](https://example.com/a.png)\\n\\n![second](https://example.com/b.png)',customMarkdownRenderer:imageMarkdownRenderer,usageStatistics:false});window.editor=editor;window.dispose=controls(editor,root);};`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',platform:'browser'});
const dom=new JSDOM('<div id="editor"></div>',{runScripts:'dangerously',pretendToBeVisual:true,url:'https://test.local'});
const w=dom.window;
w.Range.prototype.getBoundingClientRect=()=>({left:0,right:0,top:0,bottom:0,width:0,height:0});
w.Range.prototype.getClientRects=()=>[];
w.eval(bundle.outputFiles[0].text);w.make();
const root=w.document.querySelector('#editor');
const body=w.editor.getEditorElements().wwEditor;
function choose(){body.querySelector('.ProseMirror img[src]').click();}
function click(label){[...root.querySelectorAll('.image-controls button')].find(button=>button.textContent===label).click();}
choose();assert.equal(root.querySelector('.image-controls').hidden,false);
click('中图');click('右对齐');
let markdown=w.editor.getMarkdown();
assert.match(markdown,/width:50%/);assert.match(markdown,/margin:0 0 0 auto/);
w.editor.setMarkdown(markdown,false);w.restore(w.editor,markdown);
assert.match(body.querySelector('.ProseMirror img[src]').getAttribute('style'),/width:50%/);
choose();click('图左文右');assert.match(w.editor.getMarkdown(),/float:left/);markdown=w.editor.getMarkdown();w.editor.setMarkdown(markdown,false);w.restore(w.editor,markdown);assert.match(body.querySelector('.ProseMirror img[src]').style.cssText,/float: left/);choose();click('与下一张并排');
markdown=w.editor.getMarkdown();assert.equal((markdown.match(/width:48%/g)||[]).length,2);
w.editor.setMarkdown(markdown,false);w.restore(w.editor,markdown);
const images=body.querySelectorAll('.ProseMirror img[src]');assert.equal(images.length,2);assert.equal(images[0].parentElement,images[1].parentElement);
w.editor.exec('undo');
let alerts=0;w.alert=()=>alerts++;
const imageData=await new Promise(resolve=>w.imageBlobHook(new w.File(['png'], 'sample.png',{type:'image/png'}),resolve));
assert.match(imageData,/^data:image\/png;base64,/);
w.imageBlobHook(new w.File(['text'],'bad.txt',{type:'text/plain'}),()=>assert.fail('invalid file accepted'));
await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(alerts,1);
// Exercise the same hook used by file selection, paste and drop after compression.
let bitmapClosed=false;
w.createImageBitmap=async()=>({width:4000,height:2000,close:()=>bitmapClosed=true});
const createElement=w.document.createElement.bind(w.document);
w.document.createElement=(tag,...args)=>tag==='canvas'?{width:0,height:0,getContext:()=>({drawImage(){}}),toBlob(callback,type){callback(new w.Blob(['compressed'],{type}));}}:createElement(tag,...args);
const compressedData=await new Promise(resolve=>w.imageBlobHook(new w.File([new Uint8Array(4*1024*1024)],'large.png',{type:'image/png'}),resolve));
assert.match(compressedData,/^data:image\/webp;base64,/);assert.equal(bitmapClosed,true);
w.dispose();w.editor.destroy();dom.window.close();
console.log('Image sizing, alignment, side-by-side and Markdown reload passed.');
