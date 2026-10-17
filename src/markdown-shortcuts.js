import {InputRule,inputRules,undoInputRule,wrappingInputRule,textblockTypeInputRule} from 'prosemirror-inputrules';

const paragraphOnly=handler=>(state,match,start,end)=>state.selection.$from.parent.type.name==='paragraph'?handler(state,match,start,end):null;

function markRule(regex,markName,delim){
  return new InputRule(regex,(state,match,start,end)=>{
    const mark=state.schema.marks[markName];if(!mark)return null;
    const content=match[1],trigger=match[2]||'';
    const openStart=start+match[0].length-trigger.length-delim-content.length-delim;
    if(openStart<start)return null;
    const tr=state.tr;
    tr.replaceWith(openStart,end,state.schema.text(content,[mark.create()]));
    tr.removeStoredMark(mark);
    if(trigger)tr.insertText(trigger);
    return tr;
  });
}

function lazyNodeRule(regex,getNode,buildRule){
  return new InputRule(regex,(state,match,start,end)=>{
    const node=getNode(state.schema);if(!node)return null;
    return buildRule(node).handler(state,match,start,end);
  });
}

export function createMarkdownRules(){
  return [
    lazyNodeRule(/^[-+*] $/,s=>s.nodes.bulletList,node=>wrappingInputRule(/^[-+*] $/,node)),
    lazyNodeRule(/^(\d{1,9})\. $/,s=>s.nodes.orderedList,node=>wrappingInputRule(/^(\d{1,9})\. $/,node,match=>({order:Number(match[1])}),(match,before)=>Number(match[1])===before.childCount+before.attrs.order)),
    new InputRule(/^(#{1,6}) $/,paragraphOnly((state,match,start,end)=>{
      const node=state.schema.nodes.heading;if(!node)return null;
      return textblockTypeInputRule(/^(#{1,6}) $/,node,m=>({level:m[1].length})).handler(state,match,start,end);
    })),
    lazyNodeRule(/^> $/,s=>s.nodes.blockQuote,node=>wrappingInputRule(/^> $/,node)),
    new InputRule(/^(?:---|\*\*\*|___)$/,(state,match,start,end)=>{
      const node=state.schema.nodes.thematicBreak;if(!node)return null;
      if(state.selection.$from.parent.type.name!=='paragraph')return null;
      return state.tr.replaceRangeWith(start-1,end,node.create()).scrollIntoView();
    }),
    markRule(/\*\*([^*\s][^*\n]*[^*\s]|[^*\s])\*\*(\s)$/,'strong',2),
    markRule(/__([^_\s][^_\n]*[^_\s]|[^_\s])__(\s)$/,'strong',2),
    markRule(/(?:^|[^*\n])\*([^*\s][^*\n]*[^*\s]|[^*\s])\*(\s)$/,'emph',1),
    markRule(/(?:^|[^_\n\w])_([^_\s][^_\n]*[^_\s]|[^_\s])_(\s)$/,'emph',1),
    markRule(/~~([^~\s][^~\n]*[^~\s]|[^~\s])~~(\s)$/,'strike',2),
    markRule(/`([^`\s][^`\n]*[^`\s]|[^`\s])`(\s)$/,'code',1),
  ];
}
export default function markdownShortcuts({pmKeymap}){
  return {wysiwygPlugins:[()=>inputRules({rules:createMarkdownRules()}),()=>pmKeymap.keymap({Backspace:undoInputRule})]};
}
