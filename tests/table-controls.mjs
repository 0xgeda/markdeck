import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
const bundle=await build({stdin:{contents:`import Editor from '@toast-ui/editor';import controls from './src/table-controls.js';window.make=()=>{const root=document.querySelector('#editor');const editor=new Editor({el:root,initialEditType:'wysiwyg',autofocus:false,initialValue:'| A | B |\\n| --- | --- |\\n| a | b |\\n| c | d |',usageStatistics:false});window.editor=editor;window.dispose=controls(editor,root);};`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',platform:'browser'});
const dom=new JSDOM('<div id="editor"></div>',{runScripts:'dangerously',pretendToBeVisual:true,url:'https://test.local'});
const w=dom.window,errors=[];w.addEventListener('error',event=>errors.push(event.message));
w.Range.prototype.getBoundingClientRect=()=>({left:0,right:0,top:0,bottom:0,width:0,height:0});
w.Range.prototype.getClientRects=()=>[];
w.eval(bundle.outputFiles[0].text);w.make();
const root=w.document.querySelector('#editor');
function selectCell(selector){const cell=root.querySelector('.ProseMirror '+selector);w.editor.setSelection(w.editor.wwEditor.view.posAtDOM(cell,0));const range=w.document.createRange();range.selectNodeContents(cell);range.collapse(true);const selection=w.getSelection();selection.removeAllRanges();selection.addRange(range);w.document.dispatchEvent(new w.Event('selectionchange'));root.dispatchEvent(new w.KeyboardEvent('keyup',{bubbles:true}));}
function click(command){const button=root.querySelector(`[data-command="${command}"]`);assert.equal(button.disabled,false);button.click();}
selectCell('td p');
assert.equal(root.querySelector('.table-controls').hidden,false);
root.querySelector('[data-table-toggle="row"]').click();assert.equal(root.querySelector('[data-table-menu="row"]').hidden,false);
root.querySelector('[data-table-toggle="column"]').click();assert.equal(root.querySelector('[data-table-menu="row"]').hidden,true);assert.equal(root.querySelector('[data-table-menu="column"]').hidden,false);

click('addRowToDown');assert.equal(root.querySelectorAll('.ProseMirror tr').length,4);
selectCell('td p');click('addColumnToRight');assert.equal(root.querySelectorAll('.ProseMirror th').length,3);
selectCell('td p');click('removeColumn');assert.equal(root.querySelectorAll('.ProseMirror th').length,2);
selectCell('td p');click('removeRow');assert.equal(root.querySelectorAll('.ProseMirror tr').length,3);
w.editor.exec('undo');assert.equal(root.querySelectorAll('.ProseMirror tr').length,4);
assert.match(w.editor.getMarkdown(),/B/);
selectCell('th p');assert.equal(root.querySelector('[data-command="removeRow"]').disabled,true);
// Whole-table deletion is undoable and preserves paragraphs and other tables.
w.editor.setMarkdown('前文\n\n| A | B |\n| --- | --- |\n| a | b |\n\n后文\n\n| C |\n| --- |\n| c |',false);
const original=w.editor.getMarkdown();selectCell('td p');
click('selectTable');assert.equal(w.editor.wwEditor.view.state.selection.node.type.name,'table');
assert.equal(root.querySelector('[data-command="selectTable"]').getAttribute('aria-pressed'),'true');
w.editor.wwEditor.view.dom.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Backspace',bubbles:true,cancelable:true}));
assert.equal(root.querySelectorAll('.ProseMirror table').length,1);assert.match(w.editor.getMarkdown(),/前文/);assert.match(w.editor.getMarkdown(),/后文/);assert.match(w.editor.getMarkdown(),/C/);assert.doesNotMatch(w.editor.getMarkdown(),/A/);
w.editor.exec('undo');assert.equal(w.editor.getMarkdown(),original);
selectCell('td p');click('removeTable');assert.equal(root.querySelectorAll('.ProseMirror table').length,1);w.editor.exec('undo');assert.equal(w.editor.getMarkdown(),original);
// A document consisting solely of a table remains editable after deletion.
w.editor.setMarkdown('| A |\n| --- |\n| a |',false);selectCell('td p');click('removeTable');assert.equal(root.querySelector('.ProseMirror table'),null);assert.ok(root.querySelector('.ProseMirror p'));w.editor.exec('undo');assert.match(w.editor.getMarkdown(),/a/);
// Position follows a visible table instead of the bottom of the window.
selectCell('td p');const table=root.querySelector('.ProseMirror table');table.getBoundingClientRect=()=>({left:80,top:300,right:680,bottom:500,width:600,height:200});w.dispatchEvent(new w.Event('resize'));assert.equal(root.querySelector('.table-controls').style.top,'250px');
w.document.body.dispatchEvent(new w.MouseEvent('mousedown',{bubbles:true}));w.dispatchEvent(new w.Event('scroll'));assert.equal(root.querySelector('.table-controls').hidden,true,'outside clicks stay dismissed while scrolling');
w.editor.wwEditor.view.dom.dispatchEvent(new w.FocusEvent('focusin',{bubbles:true}));assert.equal(root.querySelector('.table-controls').hidden,false);
w.document.body.classList.add('display-mode');w.document.dispatchEvent(new w.Event('selectionchange'));assert.equal(root.querySelector('.table-controls').hidden,true);
assert.deepEqual(errors,[]);w.dispose();w.editor.destroy();dom.window.close();
console.log('Table row/column commands, undo, Markdown and header protection passed.');
