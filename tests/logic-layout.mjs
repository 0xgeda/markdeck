import assert from 'node:assert/strict';
import {layoutLogicCards} from '../src/logic-layout.js';
const groups=Array.from({length:12},(_,i)=>({key:String(i),parentKey:i<5?'research':'decision',parentTitle:i<5?'研究':'决策'}));
const sizes=new Map(groups.map((group,i)=>[group.key,{width:304,height:80+(i%3)*60}]));
for(const width of [390,760,1100,1600]){
  const layout=layoutLogicCards(groups,sizes,{},width);
  assert.deepEqual(layout.labels.map(label=>label.title),['研究','决策']);
  for(const [i,a] of groups.entries())for(const b of groups.slice(i+1)){
    const p=layout.positions[a.key],q=layout.positions[b.key],ps=sizes.get(a.key),qs=sizes.get(b.key);
    assert.ok(p.x+ps.width<=q.x||q.x+qs.width<=p.x||p.y+ps.height<=q.y||q.y+qs.height<=p.y,'expanded cards must not overlap');
  }
  assert.ok(layout.positions['5'].y>layout.positions['4'].y);
  assert.ok(layout.width<=Math.max(width,384));
}
const positions={'2':{x:1200,y:650},note:{x:250,y:200},frame:{x:20,y:25}};
const layout=layoutLogicCards([...groups,{key:'note',sticky:true},{key:'frame',frame:true}],sizes,positions,1100);
for(const key of Object.keys(positions))assert.deepEqual(layout.positions[key],positions[key]);
assert.ok(layout.width>=1544);
console.log('Grouped layout: responsive columns, expanded-card spacing and saved positions passed.');
