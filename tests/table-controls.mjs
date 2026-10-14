import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
const bundle=await build({stdin:{contents:`import Editor from '@toast-ui/editor';import controls from './src/table-controls.js';window.make=()=>{const root=document.querySelector('#editor');const editor=new Editor({el:root,initialEditType:'wysiwyg',initialValue:'| A | B |\\n| --- | --- |\\n| a | b |\\n| c | d |',usageStatistics:false});window.editor=editor;window.dispose=controls(editor,root);};`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',platform:'browser'});
const dom=new JSDOM('<div id="editor"></div>',{runScripts:'dangerously',pretendToBeVisual:true,url:'https://test.local'});
const w=dom.window;
w.Range.prototype.getBoundingClientRect=()=>({left:0,right:0,top:0,bottom:0,width:0,height:0});
w.Range.prototype.getClientRects=()=>[];
w.eval(bundle.outputFiles[0].text);w.make();
const root=w.document.querySelector('#editor');
function selectCell(selector){const cell=root.querySelector('.ProseMirror '+selector);w.editor.setSelection(w.editor.wwEditor.view.posAtDOM(cell,0));const range=w.document.createRange();range.selectNodeContents(cell);range.collapse(true);const selection=w.getSelection();selection.removeAllRanges();selection.addRange(range);w.document.dispatchEvent(new w.Event('selectionchange'));root.dispatchEvent(new w.KeyboardEvent('keyup',{bubbles:true}));}
function click(command){const button=root.querySelector(`[data-command="${command}"]`);assert.equal(button.disabled,false);button.click();}
selectCell('td p');
assert.equal(root.querySelector('.table-controls').hidden,false);
click('addRowToDown');assert.equal(root.querySelectorAll('.ProseMirror tr').length,4);
selectCell('td p');click('addColumnToRight');assert.equal(root.querySelectorAll('.ProseMirror th').length,3);
selectCell('td p');click('removeColumn');assert.equal(root.querySelectorAll('.ProseMirror th').length,2);
selectCell('td p');click('removeRow');assert.equal(root.querySelectorAll('.ProseMirror tr').length,3);
w.editor.exec('undo');assert.equal(root.querySelectorAll('.ProseMirror tr').length,4);
assert.match(w.editor.getMarkdown(),/B/);
selectCell('th p');assert.equal(root.querySelector('[data-command="removeRow"]').disabled,true);
w.dispose();w.editor.destroy();dom.window.close();
console.log('Table row/column commands, undo, Markdown and header protection passed.');
