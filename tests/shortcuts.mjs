import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Schema} from 'prosemirror-model';
import {EditorState,TextSelection} from 'prosemirror-state';
import {inputRules,undoInputRule} from 'prosemirror-inputrules';
import {createMarkdownRules} from '../src/markdown-shortcuts.js';
const schema=new Schema({nodes:{doc:{content:'block+'},paragraph:{content:'inline*',group:'block'},text:{group:'inline'},bulletList:{content:'listItem+',group:'block'},orderedList:{content:'listItem+',group:'block',attrs:{order:{default:1}}},listItem:{content:'paragraph block*'},codeBlock:{content:'text*',group:'block',code:true}}});
function input(text,type='paragraph'){
  const rule=inputRules({rules:createMarkdownRules()});const doc=schema.node('doc',null,[schema.node(type,null,text?schema.text(text):null)]);
  const view={composing:false,state:EditorState.create({doc,selection:TextSelection.create(doc,1+text.length),plugins:[rule]})};view.dispatch=tr=>{view.state=view.state.apply(tr);};
  const converted=rule.props.handleTextInput(view,view.state.selection.from,view.state.selection.to,' ');
  return {view,converted};
}
test('bullet markers convert at paragraph start and the marker disappears',()=>{
  for(const marker of ['-','*','+']){const {view,converted}=input(marker);assert.equal(converted,true);assert.equal(view.state.doc.firstChild.type.name,'bulletList');assert.equal(view.state.doc.textContent,'');}
});
test('number-dot-space converts to a numbered list with the requested start',()=>{
  for(const order of [1,3,12]){const {view,converted}=input(order+'.');assert.equal(converted,true);assert.equal(view.state.doc.firstChild.type.name,'orderedList');assert.equal(view.state.doc.firstChild.attrs.order,order);}
});
test('inline markers and code stay unchanged',()=>{
  for(const text of ['正文 -','版本 1.','-正文','1.正文'])assert.equal(input(text).converted,false);
  assert.equal(input('-','codeBlock').converted,false);
});
test('undo restores typed characters instead of losing them',()=>{
  const {view}=input('-');assert.equal(undoInputRule(view.state,view.dispatch),true);assert.equal(view.state.doc.firstChild.type.name,'paragraph');assert.equal(view.state.doc.textContent,'- ');
});
