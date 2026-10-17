import {changedLines} from './line-diff.js';
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function openHistory(doc,restore){
  const response=await window.desktop.versions(doc.id);if(!response.ok)throw new Error(response.error);
  const versions=response.versions,dialog=document.createElement('dialog');dialog.className='history-dialog';
  dialog.innerHTML=`<header><h3>修改记录与恢复</h3><button data-close aria-label="关闭修改记录">×</button></header><select aria-label="历史版本">${versions.map((v,i)=>`<option value="${i}">${escape(new Date(v.time).toLocaleString())} · ${escape(v.reason)}</option>`).join('')}</select><div class="history-compare"><section><h4>历史内容</h4><pre data-old></pre></section><section><h4>当前内容</h4><pre data-current></pre></section></div><footer><span role="status"></span><button data-restore title="恢复前会保留当前版本">恢复为当前版本</button></footer>`;
  document.body.append(dialog);dialog.showModal();dialog.querySelector('[data-current]').textContent=doc.body;
  function show(){const version=versions[Number(dialog.querySelector('select').value)];if(version){const diff=changedLines(version.body,doc.body);const paint=(text,changed,kind)=>text.split('\n').map((line,i)=>`<span class="${changed.has(i)?kind:''}">${escape(line)||' '}</span>`).join('');dialog.querySelector('[data-old]').innerHTML=paint(version.body,diff.old,'removed');dialog.querySelector('[data-current]').innerHTML=paint(doc.body,diff.fresh,'added');}else dialog.querySelector('[data-old]').textContent='尚无历史版本。修改或外部同步后会保留旧版本。';dialog.querySelector('[data-restore]').disabled=!version;}
  dialog.querySelector('select').onchange=show;dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  dialog.querySelector('[data-restore]').onclick=async()=>{const version=versions[Number(dialog.querySelector('select').value)];try{await restore(version.id);dialog.close();}catch(error){dialog.querySelector('[role=status]').textContent=error.message;}};show();
}
