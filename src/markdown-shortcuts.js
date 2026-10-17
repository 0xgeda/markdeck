import {InputRule,inputRules,undoInputRule,wrappingInputRule} from 'prosemirror-inputrules';

export function createMarkdownRules(){
  const wrap=(pattern,name,attrs,join)=>new InputRule(pattern,(state,match,start,end)=>{
    if(state.selection.$from.parent.type.name!=='paragraph')return null;
    return wrappingInputRule(pattern,state.schema.nodes[name],attrs,join).handler(state,match,start,end);
  });
  return [
    wrap(/^[-+*] $/,'bulletList'),
    wrap(/^(\d{1,9})\. $/,'orderedList',match=>({order:Number(match[1])}),(match,before)=>Number(match[1])===before.childCount+before.attrs.order)
  ];
}
export default function markdownShortcuts({pmKeymap}){
  return {wysiwygPlugins:[()=>inputRules({rules:createMarkdownRules()}),()=>pmKeymap.keymap({Backspace:undoInputRule})]};
}
