const guide='https://www.feishu.cn/content/article/7623291503305083853';
export async function openFeishu({doc,save,configure=false}){
 if(document.querySelector('.feishu-dialog'))return;
 const api=window.desktop,dialog=document.createElement('dialog');dialog.className='feishu-dialog';
 dialog.innerHTML=`<header><h3>上传到飞书</h3><button data-close aria-label="关闭飞书窗口">×</button></header>
 <p data-status role="status">正在检查连接…</p>
 <section data-setup hidden>
  <label>上传方式<select data-mode aria-label="上传方式"><option value="create">新建文档</option><option value="update">更新已有文档</option></select></label>
  <div data-create-fields><label>保存位置<input data-folder aria-label="飞书文件夹链接" placeholder="粘贴飞书文件夹链接；留空使用我的空间"></label><p>每次新建一份可编辑文档，本地文件保持不变。</p></div>
  <div data-update-fields hidden>
   <label>目标文档链接<input data-target aria-label="飞书目标文档链接" placeholder="粘贴飞书文档或知识库文档链接"></label>
   <button data-preview>读取目标</button>
   <div data-target-preview class="feishu-target-preview" hidden><span>即将更新</span><a data-target-title target="_blank" rel="noopener"></a><p>用当前文档替换目标的全部正文与图片，保留目标标题和链接。旧正文上的评论可能丢失。</p></div>
  </div>
 </section>
 <section data-auth hidden><a data-auth-link target="_blank" rel="noopener">打开飞书授权</a><img data-qr alt="飞书授权二维码"></section>
 <section data-result hidden><a data-url target="_blank" rel="noopener">在飞书打开</a><button data-copy>复制链接</button></section>
 <footer><button data-guide hidden>连接设置说明</button><button data-connect hidden>连接飞书</button><button data-finish hidden>已完成授权</button><button data-upload hidden>上传当前文档</button></footer>`;
 document.body.append(dialog);dialog.showModal();const el=key=>dialog.querySelector('[data-'+key+']');let busy=false,ready=false,finished=false,preview=null;
 const message=text=>{el('status').textContent=text;};
 const check=result=>{if(!result.ok)throw new Error(result.error);return result;};
 const updating=()=>el('mode').value==='update';
 function controls(){
  el('setup').hidden=!ready||finished;el('create-fields').hidden=updating();el('update-fields').hidden=!updating();
  el('target-preview').hidden=!preview;el('upload').hidden=!ready||finished||(updating()&&!preview);
  el('upload').textContent=updating()?'覆盖更新':'上传当前文档';
  for(const b of dialog.querySelectorAll('button,input,select'))b.disabled=busy;
 }
 const lock=value=>{busy=value;controls();};
 const action=async fn=>{lock(true);try{await fn();}catch(error){message(error.message);}finally{lock(false);}};
 const saved=async()=>{const result=await save();if(!result.ok||result.fileErrors)throw new Error(result.error||'本地文档尚未成功保存，请先处理保存问题。');};
 const reset=()=>{preview=null;finished=false;el('result').hidden=true;controls();};
 el('mode').onchange=()=>{reset();message(updating()?'粘贴目标文档链接，读取后确认覆盖。':'将当前文档上传为新的飞书文档。');};
 el('target').oninput=reset;
 el('close').onclick=()=>dialog.close();dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});dialog.addEventListener('close',()=>dialog.remove());
 for(const key of ['auth-link','url','target-title'])el(key).onclick=event=>{event.preventDefault();api.openExternal(el(key).href);};
 el('guide').onclick=()=>api.openExternal(guide);
 el('copy').onclick=()=>action(async()=>{await api.copyText(el('url').href);message('链接已复制');});
 async function refresh(){
  const state=check(await api.feishuStatus(doc.id));ready=state.ready;preview=null;finished=false;
  el('connect').hidden=(state.ready&&!configure)||!state.available;el('connect').textContent=state.ready?'重新授权':'连接飞书';el('guide').hidden=state.ready;
  el('folder').value=state.folder||'';el('target').value=state.targetUrl||'';el('mode').value=state.targetUrl?'update':'create';
  message(state.ready?`已连接${state.name?' · '+state.name:''}。当前文档「${doc.title}」。`:state.error||'首次使用请连接飞书账号。');
  controls();return state;
 }
 async function readTarget(){
  preview=null;el('result').hidden=true;message('正在读取目标文档…');await saved();
  preview=check(await api.feishuPrepareUpdate(doc.id,el('target').value.trim()));
  el('target-title').textContent=preview.title;el('target-title').href=preview.url;
  message(`已读取「${preview.title}」，请确认下方目标后覆盖更新。`);
 }
 el('preview').onclick=()=>action(readTarget);
 el('connect').onclick=()=>action(async()=>{const result=check(await api.feishuConnect());el('auth').hidden=false;el('auth-link').href=result.url;el('qr').src=result.qr;el('finish').hidden=false;el('connect').hidden=true;message('请打开授权链接或扫描二维码，完成后点击“已完成授权”。');});
 el('finish').onclick=()=>action(async()=>{check(await api.feishuFinishConnect());el('auth').hidden=true;el('finish').hidden=true;await refresh();});
 async function upload(){
  const update=updating();message(update?'正在保存并覆盖更新正文与图片…':'正在保存并上传正文与图片…');await saved();
  let result;
  if(update){
   if(!preview)throw new Error('请先读取目标文档。');
   const confirmed=preview;preview=null;el('url').href=confirmed.url;
   try{result=check(await api.feishuUpdate(doc.id,confirmed.confirmation));}catch(error){el('result').hidden=false;throw error;}
  }else result=check(await api.feishuUpload(doc.id,el('folder').value.trim()));
  el('result').hidden=false;el('url').href=result.url;finished=true;
  message(result.warnings?.length?(update?'文档已更新':'文档已创建')+'，请检查以下转换提示：'+result.warnings.join('；'):(update?'已更新飞书文档，原链接保持不变。':'已上传到飞书'));
 }
 el('upload').onclick=()=>action(upload);
 await action(async()=>{
  const state=await refresh();
  if(state.ready&&state.targetUrl&&!configure)await readTarget();
  if(state.last?.status==='unknown'||state.last?.status==='pending')message('上次操作结果尚未确认，请先在飞书检查，再决定是否重新上传或更新。');
 });
}
