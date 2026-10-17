export const CARD_WIDTH=304;

// Layout only unplaced cards. User positions are authoritative across level changes.
export function layoutLogicCards(groups,sizes,saved,availableWidth){
  const gap=24,margin=40,columns=Math.max(1,Math.min(4,Math.floor((availableWidth-margin*2+gap)/(CARD_WIDTH+gap))));
  const sections=new Map(),positions={},labels=[];
  for(const group of groups){
    if(group.sticky||group.frame)continue;
    const key=group.parentKey||'';
    if(!sections.has(key))sections.set(key,[]);
    sections.get(key).push(group);
  }
  let y=32;
  for(const cards of sections.values()){
    const title=cards[0].parentTitle;
    if(title&&cards.some(card=>!saved[card.key])){
      labels.push({title,x:margin,y,width:columns*(CARD_WIDTH+gap)-gap});y+=40;
    }
    for(let start=0;start<cards.length;start+=columns){
      const row=cards.slice(start,start+columns);
      row.forEach((card,column)=>{positions[card.key]=saved[card.key]||{x:margin+column*(CARD_WIDTH+gap),y};});
      y+=Math.max(...row.map(card=>sizes.get(card.key)?.height||100))+gap;
    }
    y+=32;
  }
  for(const group of groups.filter(group=>group.sticky||group.frame)){
    positions[group.key]=saved[group.key]||{x:margin,y};
    if(!saved[group.key])y+=(sizes.get(group.key)?.height||100)+gap;
  }
  return {positions,labels,
    width:Math.max(availableWidth,...groups.map(group=>positions[group.key].x+(sizes.get(group.key)?.width||CARD_WIDTH)+margin)),
    height:Math.max(700,...groups.map(group=>positions[group.key].y+(sizes.get(group.key)?.height||100)+80))};
}
