import MarkdownIt from 'markdown-it';
import createDOMPurify from 'dompurify';
export const markdown=new MarkdownIt({html:true,breaks:true});
export function createDraft(source,title){
  if(!source.trim())throw new Error('文档还没有正文');
  const pages=[];let current={title,body:''},fence=null;
  const push=()=>{if(current.body.trim()||pages.length===0)pages.push({...current,body:current.body.trim()});};
  for(const line of source.split(/\r?\n/)){
    const marker=line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if(marker){if(!fence)fence=marker[1];else if(marker[1][0]===fence[0]&&marker[1].length>=fence.length)fence=null;current.body+=line+'\n';continue;}
    const heading=!fence&&line.match(/^(#{1,3})\s+(.+)$/);
    if(heading){if(current.body.trim())push();current={title:heading[2],body:''};}
    else if(!fence&&/^\s*---\s*$/.test(line)&&!/^\s*\|/.test(current.body.split('\n').at(-2)||'')){if(current.body.trim())push();current={title:current.title+'（续）',body:''};}
    else current.body+=line+'\n';
  }
  if(current.body.trim()||!pages.length)push();
  return {version:1,title,theme:'minimal',pages};
}
export const palettes={minimal:{bg:'FFFFFF',ink:'172018',accent:'2B7D53'},editorial:{bg:'FCF6E8',ink:'372B22',accent:'7A3E1F'},bold:{bg:'161616',ink:'F2F4F1',accent:'8AAB95'},modern:{bg:'F3F4FC',ink:'252548',accent:'4F46E5'},swiss:{bg:'FFFFFF',ink:'111111',accent:'D52628'}};
export function pageBlocks(body,document){
  const holder=document.createElement('div');holder.innerHTML=createDOMPurify(document.defaultView).sanitize(markdown.render(body));
  const blocks=[];
  function visit(element){
    if(element.tagName==='TABLE'){
      blocks.push({type:'table',rows:[...element.querySelectorAll('tr')].map(row=>[...row.children].map(cell=>cell.textContent.trim()))});return;
    }
    const images=[...element.querySelectorAll('img')];
    for(const image of images)blocks.push({type:'image',src:image.getAttribute('src'),alt:image.getAttribute('alt')||'图片'});
    const copy=element.cloneNode(true);copy.querySelectorAll('img').forEach(image=>image.remove());
    if(['UL','OL'].includes(copy.tagName)){
      [...copy.children].forEach((item,index)=>blocks.push({type:'text',text:(copy.tagName==='OL'?`${index+1}. `:'• ')+item.textContent.trim()}));
    }else if(copy.textContent.trim())blocks.push({type:'text',text:copy.textContent.trim()});
  }
  [...holder.children].forEach(visit);return blocks;
}
function textHeight(text,font,width){
  return String(text).split('\n').reduce((sum,line)=>sum+Math.max(1,Math.ceil([...line].reduce((n,char)=>n+(/[\u2e80-\uffff]/.test(char)?1:.55),0)/(Math.max(.3,width)*72/font))),0)*font/72*1.5;
}
export function arrangePage(page,document){
  const blocks=pageBlocks(page.body,document);const font=18;let y=1.55;
  const items=blocks.map(block=>{
    let rowHeights;
    const h=block.type==='image'?2.5:block.type==='table'?(rowHeights=block.rows.map(row=>Math.max(.35,...row.map(cell=>textHeight(cell,16,12.13/Math.max(1,row.length)-.2)+.16)))).reduce((a,b)=>a+b,0):textHeight(block.text,font,12.13)+.16;
    const item={...block,x:.6,y,w:12.13,h,...(rowHeights?{rowHeights}:{})};y+=h+.08;return item;
  });
  return {font,overflow:y>6.9,items};
}
export function paginateDraft(draft,document){
  const result=[];
  for(const page of draft.pages){
    if(!arrangePage(page,document).overflow){result.push(page);continue;}
    const lines=page.body.split('\n'),tokens=markdown.parse(page.body,{}),units=[];
    for(let i=0;i<tokens.length;i++){
      const token=tokens[i];if(token.level!==0||!token.map)continue;
      const [start,end]=token.map;let chunk=lines.slice(start,end).join('\n');
      if(token.type==='table_open'){
        const tableLines=lines.slice(start,end);const header=tableLines.slice(0,2).join('\n');
        for(const row of tableLines.slice(2))units.push({table:true,header,text:row});
      }else if(token.type==='bullet_list_open'||token.type==='ordered_list_open'){
        for(let j=i+1;j<tokens.length&&tokens[j].level>0;j++)if(tokens[j].type==='list_item_open'&&tokens[j].level===1){const map=tokens[j].map;if(map)units.push({text:lines.slice(map[0],map[1]).join('\n')});}
      }else units.push({text:chunk});
      if(token.nesting===1){let depth=1;while(depth&&++i<tokens.length)depth+=tokens[i].nesting;}
    }
    let body='',tableHeader=null,part=0;
    const flush=()=>{if(body.trim())result.push({title:page.title+(part++?'（续 '+part+'）':''),body:body.trim()});body='';tableHeader=null;};
    for(const unit of units){
      const addition=unit.table?((tableHeader===unit.header?'':unit.header+'\n')+unit.text):unit.text;
      const candidate=body+(body?'\n'+(unit.table&&tableHeader===unit.header?'':'\n'):'')+addition;
      if(!arrangePage({title:page.title,body:candidate},document).overflow){body=candidate;tableHeader=unit.table?unit.header:null;continue;}
      flush();
      const fresh=unit.table?unit.header+'\n'+unit.text:unit.text;
      if(!arrangePage({title:page.title,body:fresh},document).overflow){body=fresh;tableHeader=unit.table?unit.header:null;continue;}
      if(unit.table){
        const cells=pageBlocks(fresh,document).find(block=>block.type==='table')?.rows[1]||[];
        const escaped=text=>text.replace(/\|/g,'\\|').replace(/\n/g,'<br>');
        const row=values=>'| '+values.map(escaped).join(' | ')+' |';
        const remaining=[...cells];
        while(remaining.some(Boolean)){
          const pieces=remaining.map((cell,col)=>{
            if(!cell)return '';
            let lo=1,hi=cell.length;
            while(lo<hi){const mid=Math.ceil((lo+hi)/2),values=cells.map(()=>'' );values[col]=cell.slice(0,mid);if(arrangePage({body:unit.header+'\n'+row(values)},document).overflow)hi=mid-1;else lo=mid;}
            return cell.slice(0,lo);
          });
          body=unit.header+'\n'+row(pieces);flush();pieces.forEach((piece,col)=>remaining[col]=remaining[col].slice(piece.length));
        }
        continue;
      }
      if(/^\s*(```|~~~)/.test(fresh)){body=fresh;flush();continue;}
      // Keep content verbatim; split exceptionally long paragraphs at a line or character boundary.
      let rest=fresh;
      while(rest){let lo=1,hi=rest.length;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(arrangePage({title:page.title,body:rest.slice(0,mid)},document).overflow)hi=mid-1;else lo=mid;}body=rest.slice(0,lo);rest=rest.slice(lo);flush();}
    }
    flush();
  }
  return {...draft,pages:result};
}
