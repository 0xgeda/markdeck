import assert from 'node:assert/strict';import {build} from 'esbuild';import {JSDOM} from 'jsdom';
const bundle=await build({stdin:{contents:`import Editor from '@toast-ui/editor';import {quickTools} from './src/quick-tools.js';window.editor=new Editor({el:document.querySelector('#editor'),initialEditType:'wysiwyg',initialValue:'',usageStatistics:false});window.dispose=quickTools(window.editor,document.querySelector('#editor'),'test');`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife'});
const dom=new JSDOM('<div id="editor"></div>',{runScripts:'dangerously',pretendToBeVisual:true,url:'https://test.local'}),w=dom.window;
w.scrollBy=()=>{};
w.Range.prototype.getBoundingClientRect=()=>({left:10,right:10,top:20,bottom:30,width:0,height:10});w.Range.prototype.getClientRects=()=>[];
w.eval(bundle.outputFiles[0].text);const editor=w.editor,view=editor.wwEditor.view;
function slash(){view.focus();view.dom.dispatchEvent(new w.KeyboardEvent('keydown',{key:'/',bubbles:true,cancelable:true}));}
function choose(label){[...w.document.querySelectorAll('.insert-menu button')].find(button=>button.textContent===label).click();}
slash();assert.equal(w.document.querySelector('.insert-menu').hidden,false);choose('二级标题');assert.equal(view.state.doc.firstChild.type.name,'heading');assert.equal(view.state.doc.firstChild.attrs.level,2);
editor.setMarkdown('',false);editor.setSelection(1,1);slash();choose('无序列表');assert.equal(view.state.doc.firstChild.type.name,'bulletList');
editor.setMarkdown('',false);editor.setSelection(1,1);slash();choose('表格');assert.match(editor.getMarkdown(),/\|/);
editor.setMarkdown('',false);editor.setSelection(1,1);slash();view.dom.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(editor.getMarkdown(),'/');assert.equal(w.document.querySelector('.insert-menu').hidden,true);
for(const [label,type] of [['有序列表','orderedList'],['待办列表','bulletList'],['引用','blockQuote'],['代码块','codeBlock']]){editor.setMarkdown('',false);editor.setSelection(1,1);slash();choose(label);assert.equal(view.state.doc.firstChild.type.name,type);editor.exec('undo');assert.equal(view.state.doc.firstChild.type.name,'paragraph');assert.ok(['','/'].includes(editor.getMarkdown()));}
editor.setMarkdown('',false);editor.setSelection(1,1);slash();
w.document.querySelector('.insert-menu').dispatchEvent(new w.Event('scroll'));assert.equal(w.document.querySelector('.insert-menu').hidden,false);
const nativeClick=w.HTMLInputElement.prototype.click;w.HTMLInputElement.prototype.click=function(){this.dispatchEvent(new w.Event('cancel'));};choose('图片');assert.equal(editor.getMarkdown(),'/');w.HTMLInputElement.prototype.click=nativeClick;
editor.setMarkdown('普通正文',false);editor.setSelection(1,3);view.focus();w.document.dispatchEvent(new w.MouseEvent('mouseup'));assert.equal(w.document.querySelector('.selection-tools').hidden,false);w.document.querySelector('.selection-tools button').click();assert.match(editor.getMarkdown(),/\*\*普通\*\*/);editor.exec('undo');assert.doesNotMatch(editor.getMarkdown(),/\*\*/);
w.document.body.classList.add('display-mode');w.document.dispatchEvent(new w.MouseEvent('mouseup'));assert.equal(w.document.querySelector('.selection-tools').hidden,true);
w.dispose();editor.destroy();dom.window.close();console.log('Slash headings, lists, tables, Escape preservation, selection formatting/undo and read-only mode passed.');
