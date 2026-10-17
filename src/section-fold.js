import {Plugin,PluginKey} from 'prosemirror-state';
import {Decoration,DecorationSet} from 'prosemirror-view';
const key=new PluginKey('markdeck-section-fold');
export function sectionFold(editor){
  const view=editor.wwEditor.view;
  const plugin=new Plugin({key,state:{init:()=>new Set(),apply(tr,old,oldState){
    if(tr.docChanged){
      const next=new Set();
      for(const pos of old){
        const heading=oldState.doc.nodeAt(pos);if(heading?.type.name!=='heading')continue;
        let end=oldState.doc.content.size;
        oldState.doc.forEach((node,p)=>{if(p>pos&&p<end&&node.type.name==='heading'&&node.attrs.level<=heading.attrs.level)end=p;});
        const startMapped=tr.mapping.mapResult(pos,1),endMapped=tr.mapping.map(end,-1);
        if(startMapped.deleted)continue;
        const mapped=tr.doc.nodeAt(startMapped.pos);
        if(mapped?.type.name!=='heading'||mapped.attrs.level!==heading.attrs.level)continue;
        // Only preserve an untouched chapter. Edits inside it must become visible.
        if(!oldState.doc.slice(pos,end).content.eq(tr.doc.slice(startMapped.pos,endMapped).content))continue;
        next.add(startMapped.pos);
      }
      return next;
    }
    const action=tr.getMeta(key);if(action==='clear')return new Set();
    if(typeof action==='number'){const next=new Set(old);next.has(action)?next.delete(action):next.add(action);return next;}return old;
  }},props:{decorations(state){const folded=key.getState(state),decorations=[];let hiddenLevel=null;
    state.doc.forEach((node,pos)=>{const level=node.type.name==='heading'?node.attrs.level:null;
      if(hiddenLevel!==null&&level&&level<=hiddenLevel)hiddenLevel=null;
      if(hiddenLevel!==null)decorations.push(Decoration.node(pos,pos+node.nodeSize,{class:'section-fold-hidden'}));
      else if(level&&folded.has(pos)){hiddenLevel=level;decorations.push(Decoration.node(pos,pos+node.nodeSize,{class:'section-fold-heading'}));}
    });return DecorationSet.create(state.doc,decorations);
  }}});
  view.updateState(view.state.reconfigure({plugins:[...view.state.plugins,plugin]}));
  function positions(){const list=[];view.state.doc.descendants((node,pos)=>{if(node.type.name==='heading')list.push(pos);});return list;}
  return {toggle(index){const pos=positions()[index];if(pos===undefined)return;view.dispatch(view.state.tr.setMeta(key,pos).setMeta('addToHistory',false));},clear(){view.dispatch(view.state.tr.setMeta(key,'clear').setMeta('addToHistory',false));},isFolded(index){return key.getState(view.state).has(positions()[index]);}};
}
