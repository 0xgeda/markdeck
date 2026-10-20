const guide='https://www.feishu.cn/content/article/7623291503305083853';
export async function openFeishu({doc,save,configure=false}){
 if(document.querySelector('.feishu-dialog'))return;
 const api=window.desktop,dialog=document.createElement('dialog');dialog.className='feishu-dialog';
 dialog.innerHTML='<header><h3>上传到飞书</h3><button data-close aria-label="关闭飞书窗口">×</button></header><p data-status role="status">正在检查连接…</p><section data-setup hidden><label>保存位置<input data-folder aria-label="飞书文件夹链接" placeholder="粘贴飞书文件夹链接；留空使用我的空间"></label><p>每次新建一份可编辑文档，本地文件保持不变。</p></section><section data-auth hidden><a data-auth-link target="_blank" rel="noopener">打开飞书授权</a><img data-qr alt="飞书授权二维码"></section><section data-result hidden><a data-url target="_blank" rel="noopener">在飞书打开</a><button data-copy>复制链接</button></section><footer><button data-guide hidden>连接设置说明</button><button data-connect hidden>连接飞书</button><button data-finish hidden>已完成授权</button><button data-upload hidden>上传当前文档</button></footer>';
 document.body.append(dialog);dialog.showModal();const el=key=>dialog.querySelector('[data-'+key+']');let busy=false;
 const message=text=>{el('status').textContent=text;};
 const check=result=>{if(!result.ok)throw new Error(result.error);return result;};
 const lock=value=>{busy=value;for(const b of dialog.querySelectorAll('button,input'))b.disabled=value;};
 const action=async fn=>{lock(true);try{await fn();}catch(error){message(error.message);}finally{lock(false);}};
 el('close').onclick=()=>dialog.close();dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});dialog.addEventListener('close',()=>dialog.remove());
 for(const key of ['auth-link','url'])el(key).onclick=event=>{event.preventDefault();api.openExternal(el(key).href);};
 el('guide').onclick=()=>api.openExternal(guide);
 el('copy').onclick=()=>action(async()=>{await navigator.clipboard.writeText(el('url').href);message('链接已复制');});
 async function refresh(){const state=check(await api.feishuStatus());el('setup').hidden=!state.ready;el('upload').hidden=!state.ready;el('connect').hidden=(state.ready&&!configure)||!state.available;el('connect').textContent=state.ready?'重新授权':'连接飞书';el('guide').hidden=state.ready;el('folder').value=state.folder||'';
 message(state.ready?`已连接${state.name?' · '+state.name:''}。准备上传「${doc.title}」。`:state.error||'首次使用请连接飞书账号。');
 if(state.last?.status==='unknown'||state.last?.status==='pending')message('上次上传结果尚未确认，请先在飞书检查，避免重复创建。');
 return state;
 }
 el('connect').onclick=()=>action(async()=>{const result=check(await api.feishuConnect());el('auth').hidden=false;el('auth-link').href=result.url;el('qr').src=result.qr;el('finish').hidden=false;el('connect').hidden=true;message('请打开授权链接或扫描二维码，完成后点击“已完成授权”。');});
 el('finish').onclick=()=>action(async()=>{check(await api.feishuFinishConnect());el('auth').hidden=true;el('finish').hidden=true;await refresh();});
 const upload=async()=>{message('正在保存并上传正文与图片…');const saved=await save();if(!saved.ok)throw new Error(saved.error||'本地草稿保存失败，请重试');const result=check(await api.feishuUpload(doc.id,el('folder').value.trim()));el('result').hidden=false;el('url').href=result.url;el('upload').hidden=true;el('setup').hidden=true;message(result.warnings?.length?'文档已创建，请检查以下转换提示：'+result.warnings.join('；'):'已上传到飞书');};
 el('upload').onclick=()=>action(upload);
 await action(async()=>{const state=await refresh();if(state.ready&&state.configured&&state.last?.status==='complete'&&!configure)await upload();});
}
