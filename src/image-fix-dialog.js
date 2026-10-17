// Renderer-side dialog for the Markdeck image-reference repair feature (B.3).
// Lazy-loaded module. Pattern mirrors src/project-dialog.js / src/history-dialog.js:
// create a <dialog>, wire events, resolve when closed.
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STATUS_LABEL={ok:'本地可读',missing:'缺少文件','absolute-outside':'外部路径','relative-outside':'外部路径',remote:'远程',data:'内嵌','no-doc-dir':'未保存'};
const STATUS_CLASS={ok:'status-ok',missing:'status-missing','absolute-outside':'status-outside','relative-outside':'status-outside',remote:'status-muted',data:'status-muted','no-doc-dir':'status-muted'};
const FIXABLE=new Set(['missing','absolute-outside','relative-outside']);
function truncate(text,limit=48){const s=String(text||'');return s.length>limit?s.slice(0,limit-1)+'…':s;}
export async function openImageFix({docId,onApplyBody}){
  if(document.querySelector('.image-fix-dialog')){const existing=document.querySelector('.image-fix-dialog');existing.focus?.();return;}
  const dialog=document.createElement('dialog');dialog.className='settings-dialog image-fix-dialog';
  dialog.innerHTML='<header><h3>修复图片引用</h3><button class="icon-btn" data-close aria-label="关闭">×</button></header><div class="image-fix-tools" hidden><button data-locate>扫描文件夹</button><button data-select-all>全选可修复</button><button data-select-none>取消全选</button></div><p data-status role="status"></p><div data-table-wrap><table class="image-fix-table" hidden><thead><tr><th></th><th>状态</th><th>行</th><th>原始引用</th><th>说明</th><th>候选</th></tr></thead><tbody data-rows></tbody></table></div><footer class="image-fix-footer"><button data-close-footer>关闭</button><button data-apply disabled>应用修复</button></footer>';
  document.body.append(dialog);dialog.showModal();
  const status=dialog.querySelector('[data-status]'),rows=dialog.querySelector('[data-rows]'),table=dialog.querySelector('.image-fix-table'),tools=dialog.querySelector('.image-fix-tools'),applyBtn=dialog.querySelector('[data-apply]');
  let entries=[],candidates={},closed=false,closeTimer;
  dialog.addEventListener('close',()=>{closed=true;clearTimeout(closeTimer);dialog.remove();},{once:true});
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.querySelector('[data-close-footer]').onclick=()=>dialog.close();
  function setStatus(text,kind=''){status.textContent=text||'';status.dataset.kind=kind;}
  function renderError(message){tools.hidden=true;table.hidden=true;setStatus(message||'扫描失败','error');applyBtn.disabled=true;applyBtn.hidden=true;}
  function updateApplyEnabled(){const picks=collectPicks();applyBtn.disabled=picks.length===0;}
  function collectPicks(){const picks=[];for(const row of rows.querySelectorAll('tr[data-raw]')){const cb=row.querySelector('input[type=checkbox]');if(cb&&cb.checked&&!cb.disabled){const raw=row.dataset.raw,cand=candidates[raw];if(cand&&cand.candidate)picks.push({raw,sourcePath:cand.candidate});}}return picks;}
  function renderRows(){
    const fragment=document.createDocumentFragment();rows.replaceChildren();
    for(let i=0;i<entries.length;i++){const entry=entries[i];const tr=document.createElement('tr');tr.dataset.raw=entry.raw;tr.dataset.index=String(i);
      const cand=candidates[entry.raw]||null;const fixable=FIXABLE.has(entry.status);const canCheck=fixable&&cand&&cand.candidate;
      const cls=STATUS_CLASS[entry.status]||'status-muted';const label=STATUS_LABEL[entry.status]||entry.status;
      tr.innerHTML=`<td><input type="checkbox" aria-label="选择第 ${entry.line} 行的图片"${canCheck?'':' disabled'}></td><td><span class="status-pill ${cls}">${escape(label)}</span></td><td class="image-fix-line">${entry.line}</td><td class="image-fix-src" title="${escape(entry.src||'')}">${escape(truncate(entry.src||'(空)',56))}</td><td class="image-fix-alt">${escape(entry.alt||'')}</td><td class="image-fix-candidate" data-cand>${cand&&cand.candidate?escape(truncate(cand.candidate,52)):'—'}</td>`;
      if(canCheck)tr.querySelector('input').addEventListener('change',updateApplyEnabled);
      fragment.append(tr);
    }
    rows.append(fragment);table.hidden=entries.length===0;updateApplyEnabled();
  }
  function applyRowError(raw,message){for(const tr of rows.querySelectorAll('tr[data-raw]')){if(tr.dataset.raw===raw){let err=tr.querySelector('.image-fix-row-error');if(!err){err=document.createElement('tr');err.className='image-fix-row-error';const td=document.createElement('td');td.colSpan=6;td.className='status-missing';err.append(td);tr.after(err);}err.querySelector('td').textContent=message;}}}
  async function doScan(){setStatus('正在扫描…');tools.hidden=true;table.hidden=true;applyBtn.hidden=false;applyBtn.disabled=true;try{const result=await window.desktop.scanImages(docId);if(closed)return false;if(!result.ok){renderError(result.error);return false;}entries=Array.isArray(result.entries)?result.entries:[];candidates={};tools.hidden=false;const fixable=entries.filter(e=>FIXABLE.has(e.status)).length;setStatus(entries.length?`共 ${entries.length} 条图片引用，${fixable} 条需要修复`:'未检测到图片引用');renderRows();return true;}catch(error){renderError(error.message);return false;}}
  dialog.querySelector('[data-locate]').onclick=async()=>{try{const chose=await window.desktop.chooseImageFolder();if(!chose||!chose.ok||chose.canceled)return;const folder=chose.folder;if(!folder)return;setStatus('正在匹配…');const result=await window.desktop.locateImageFolder(docId,folder);if(!result.ok){setStatus(result.error||'匹配失败','error');return;}const found=result.candidates||{};let matched=0,missing=0;for(const entry of entries){if(!FIXABLE.has(entry.status))continue;missing++;if(found[entry.raw]&&found[entry.raw].candidate){candidates[entry.raw]=found[entry.raw];matched++;}}renderRows();setStatus(`匹配到 ${matched} 张图片 / 共 ${missing} 张缺失`);}catch(error){setStatus(error.message,'error');}};
  dialog.querySelector('[data-select-all]').onclick=()=>{for(const tr of rows.querySelectorAll('tr[data-raw]')){const cb=tr.querySelector('input[type=checkbox]');if(cb&&!cb.disabled)cb.checked=true;}updateApplyEnabled();};
  dialog.querySelector('[data-select-none]').onclick=()=>{for(const cb of rows.querySelectorAll('input[type=checkbox]'))cb.checked=false;updateApplyEnabled();};
  applyBtn.onclick=async()=>{
    const picks=collectPicks();if(!picks.length)return;
    applyBtn.disabled=true;setStatus('正在校验…');
    try{
      const fresh=await window.desktop.scanImages(docId);
      if(closed)return;
      if(!fresh.ok){setStatus(fresh.error||'扫描失败','error');applyBtn.disabled=false;return;}
      const freshIndex=new Map();for(const e of fresh.entries||[])freshIndex.set(e.raw,e);
      const stale=picks.some(pick=>{const now=freshIndex.get(pick.raw);return !now||now.status==='ok';});
      if(stale){const again=window.confirm('文档已变化，建议重新扫描。\n点击确定重新扫描；取消则仍然应用。');if(again){entries=fresh.entries||[];const nextCandidates={};for(const [raw,value] of Object.entries(candidates))if(freshIndex.has(raw))nextCandidates[raw]=value;candidates=nextCandidates;renderRows();const fixable=entries.filter(e=>FIXABLE.has(e.status)).length;setStatus(`共 ${entries.length} 条图片引用，${fixable} 条需要修复`);applyBtn.disabled=false;return;}}
      setStatus('正在应用…');
      const result=await window.desktop.importImages(docId,picks);
      if(closed)return;
      if(!result.ok){setStatus(result.error||'应用失败','error');applyBtn.disabled=false;return;}
      for(const tr of rows.querySelectorAll('.image-fix-row-error'))tr.remove();
      const errors=result.errors||{};const errorEntries=Object.entries(errors);
      await onApplyBody(result.newBody);
      const imported=Array.isArray(result.imported)?result.imported.length:0;
      if(errorEntries.length){for(const [raw,message] of errorEntries)applyRowError(raw,message);setStatus(`已修复 ${imported} 张图片，${errorEntries.length} 条失败`,'error');applyBtn.disabled=collectPicks().length===0;return;}
      setStatus(`已修复 ${imported} 张图片`);applyBtn.disabled=true;
      closeTimer=setTimeout(()=>{if(!closed)dialog.close();},1500);
    }catch(error){if(!closed){setStatus(error.message,'error');applyBtn.disabled=false;}}
  };
  dialog.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.isComposing){const target=event.target;if(target&&(target.tagName==='BUTTON'||target.tagName==='INPUT'))return;if(!applyBtn.disabled){event.preventDefault();applyBtn.click();}}});
  await doScan();
  return new Promise(resolve=>{dialog.addEventListener('close',()=>resolve(),{once:true});});
}
