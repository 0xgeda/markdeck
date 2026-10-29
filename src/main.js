import {bindDocumentList} from './document-list.js';
import {feishuIcon} from './feishu-icon.js';
import {bindDocumentDrop} from './document-drop.js';
import {sectionFold} from './section-fold.js';
import {bindDocumentLinks} from './document-links.js';
let folds,closeReference,referenceLoading=false;
import {createSaveQueue} from './save-queue.js';
import {quickTools} from './quick-tools.js';
let disposeQuickTools;
import brandIcon from '../desktop/icon.svg';
import themePalettes from '../desktop/themes.json';
import {openFind} from './find.js';
let disposeFind;
import {enterDisplay} from './display-mode.js';
let exitDisplay,logicModule,planView,planOpening,mode='write',modeChange=Promise.resolve(true);
function markMode(mode){document.querySelectorAll('[data-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===mode)));}
window.addEventListener('markdeck-mode',event=>changeMode(event.detail==='display'?'display':'write'));
import Editor from '@toast-ui/editor';
import '@toast-ui/editor/dist/toastui-editor.css';
import '@toast-ui/editor/dist/i18n/zh-cn';
import DOMPurify from 'dompurify';
import './style.css';
import markdownShortcuts from './markdown-shortcuts.js';
import tableControls from './table-controls.js';
import imageControls,{imageBlobHook,imageMarkdownRenderer,restoreImageLayout,hydrateImages} from './image-controls.js';
let disposeTableControls,disposeImageControls;
const icons={reference:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16M6 8h5M6 12h5"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',outline:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M13 9h4M13 13h4"/>',collapse:'<path d="m14 5-7 7 7 7"/>',settings:'<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="5"/>',refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1"/>',doc:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 12h6M9 16h6"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',chevron:'<path d="m9 5 7 7-7 7"/>',plus:'<path d="M12 5v14M5 12h14"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',check:'<path d="m5 12 4 4L19 6"/>',star:'<path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>',trash:'<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',folder:'<path d="M3 7V4h6l3 3h9v13H3z"/>'};
const icon=(name)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.doc}</svg>`;
const welcome=`> 让想法自然发生，让知识有序生长。\n\n## 欢迎来到你的文档空间\n\n这是一个安静、专注的 Markdown 工作空间。像使用飞书文档一样阅读，像写笔记一样轻松表达。所有修改都会自动保存。桌面版打开本地 Markdown 文件后，正文修改会自动写回原文件。\n\n### 从一个想法开始\n\n直接点击正文就可以开始写作，无需切换编辑或预览模式。标题、列表、表格都可以在原处修改，也可以通过工具栏调整格式。\n\n- **清晰地表达**：用标题为想法搭建结构\n- **专注地书写**：用简洁的界面留住灵感\n- **自由地整理**：创建文档，建立自己的知识空间\n\n## 你的第一份 Markdown\n\nMarkdown 让排版变得简单。试试下面这些常用写法：\n\n| 你想做的事 | Markdown 写法 |\n| --- | --- |\n| 二级标题 | \`## 标题\` |\n| 加粗文字 | \`**重点内容**\` |\n| 待办事项 | \`- [ ] 一件待办\` |\n| 插入链接 | \`[链接名称](https://example.com)\` |\n\n### 把计划变成行动\n\n- [x] 创建你的文档空间\n- [x] 阅读这份使用指南\n- [ ] 写下今天的第一个想法\n- [ ] 导出一份 Markdown 文档\n\n## 留下值得记住的内容\n\n不论是项目计划、会议记录，还是一个尚未成熟的想法，都可以从这里开始。\n\n\`\`\`javascript\nconst idea = '一个新的开始';\nconsole.log(idea);\n\`\`\`\n\n---\n\n写作，是与自己的想法相遇。`;
let outlineCollapsed=new Set(),outlineSignature="";
let editor,outlineHeadings=[],outlineFrame=0,applyingExternal=false,syncing=false;
const desktop=window.desktop;
bindDocumentLinks(document,{openExternal:href=>desktop?desktop.openExternal(href):window.open(href,'_blank','noopener,noreferrer'),onError:message=>toast(message)});
const themes=Object.fromEntries(Object.entries(themePalettes).map(([id,palette])=>[id,palette.name]));
let theme='light';
try{const stored=localStorage.getItem('yun-jian-theme');if(themes[stored])theme=stored;}catch{}
function applyTheme(value){
  if(!themePalettes[value])return;theme=value;const palette=themePalettes[value];document.documentElement.dataset.theme=value;document.documentElement.style.colorScheme=palette.mode;for(const key of ['page','panel','ink','secondary','border','accent','hover','code'])document.documentElement.style.setProperty('--'+key,palette[key]);document.documentElement.style.setProperty('--on-accent',palette.onAccent);document.documentElement.style.setProperty('--blue',palette.accent);document.documentElement.style.setProperty('--line',palette.border);for(const button of document.querySelectorAll('[data-theme-choice]'))button.setAttribute('aria-pressed',String(button.dataset.themeChoice===value));const select=document.querySelector('#theme-select');if(select)select.value=value;
  try{localStorage.setItem('yun-jian-theme',value);}catch{}
  desktop?.setTheme(value).catch(()=>{});
}
applyTheme(theme);
let view={outline:!matchMedia('(max-width:760px)').matches,toolbar:true,feishu:false,size:17};
try{const stored=JSON.parse(localStorage.getItem('yun-jian-view'));if(stored){view.outline=typeof stored.outline==='boolean'?stored.outline:view.outline;view.toolbar=typeof stored.toolbar==='boolean'?stored.toolbar:true;view.feishu=stored.feishu===true;view.size=[15,17,19,21].includes(stored.size)?stored.size:17;}}catch{}
function applyView(){for(const button of document.querySelectorAll('[data-action="feishu"],[data-action="feishu-settings"]'))button.hidden=!view.feishu;queueOutline();const toggle=document.querySelector('.outline-toggle');if(toggle){const shown=view.outline&&!document.body.classList.contains('reference-open');toggle.setAttribute('aria-pressed',String(shown));toggle.setAttribute('aria-label',shown?'隐藏目录':'显示目录');toggle.title=shown?'隐藏文档目录':'显示文档目录';}document.body.classList.toggle('outline-hidden',!view.outline);document.body.classList.toggle('toolbar-hidden',!view.toolbar);document.documentElement.style.setProperty('--reading-size',view.size+'px');try{localStorage.setItem('yun-jian-view',JSON.stringify(view));}catch{}}
applyView();

if(desktop)document.body.classList.add('desktop-app');
let saving=Promise.resolve({ok:true}), fileErrors={},fileDialogBusy=false;
let docs,active,filter='',category='all';
if(desktop){const result=await desktop.load();if(!result.ok)throw new Error(result.error);docs=result.state.docs;active=result.state.active;}else{try {const saved=JSON.parse(localStorage.getItem('yun-jian-v1'));docs=saved?.docs;active=saved?.active;}catch{}}
if(Array.isArray(docs))docs=docs.filter(d=>d && typeof d.id==='string' && typeof d.title==='string' && typeof d.body==='string' && Number.isFinite(d.updated));
if(!Array.isArray(docs)||!docs.length)docs=[{id:crypto.randomUUID(),title:'欢迎使用Markdeck',body:welcome,updated:Date.now(),star:false},{id:crypto.randomUUID(),title:'项目计划',body:'## 项目目标\n\n在这里记录目标与思路。\n\n## 行动清单\n\n- [ ] 明确需求\n- [ ] 制定计划\n- [ ] 开始行动',updated:Date.now(),star:false}];
if(!docs.some(d=>d.id===active))active=docs[0].id;
const current=()=>docs.find(d=>d.id===active);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function showSaveState(){const d=current();const el=document.querySelector('#save-state');if(!el)return;el.textContent=desktop?(fileErrors[d.id]?'文件未写回 · 草稿已保存':d.filePath?'已保存到文件':'草稿已保存'):'已保存到浏览器';el.title=fileErrors[d.id]||d.filePath||'新文档选择保存位置后会自动写回文件';}
const queuedSave=createSaveQueue(async()=>{
  const snapshot={docs:docs.map(d=>({...d})),active};
  try{
    if(!desktop){localStorage.setItem('yun-jian-v1',JSON.stringify(snapshot));showSaveState();return {ok:true};}
    const result=await desktop.save(snapshot);if(!result.ok)throw new Error(result.error);
    fileErrors=result.errors;
    for(const stored of result.state.docs){const live=docs.find(d=>d.id===stored.id);if(live&&!fileErrors[live.id])live.revision=stored.revision;}
    showSaveState();return {ok:true,fileErrors:Object.keys(fileErrors).length>0};
  }catch(error){const el=document.querySelector('#save-state');if(el){el.textContent='保存失败，请导出备份';el.title=error.message;}return {ok:false,error:error.message};}
});
function save(defer=false){
  const el=document.querySelector('#save-state');if(el)el.textContent='正在保存…';
  saving=queuedSave(defer);return saving;
}

async function fileAction(action,relative){
  if(fileDialogBusy)return;
  fileDialogBusy=true;
  if(!await changeMode('write')){fileDialogBusy=false;return;}
  document.querySelector('#settings-dialog')?.close();
  const scroll=window.scrollY;document.querySelector('#app').inert=true;
  try{
    const saved=await save();if(!saved.ok){toast(saved.error||'保存失败');return;}
    if(action==='system'&&fileErrors[active]){toast('当前文档尚未写回，草稿已保留。请按 ⌘⇧S 另存为后再打开。');return;}
    const result=action==='system'?await desktop.openSystemFile(relative):action==='drop'?await desktop.openDroppedFile(relative):action==='project'?await desktop.openProjectFile(relative):action==='open'?await desktop.open():action==='reload'?await desktop.reload(active):await desktop.saveAs(active);
    if(!result.ok){toast(result.error);return;}if(result.canceled)return;
    docs=result.state.docs;active=result.state.active;fileErrors={};document.body.classList.remove('sidebar-open');render();showSaveState();if(action==='reload'){window.scrollTo({top:scroll,behavior:'instant'});toast('已刷新为本地文件的最新内容');}return true;
  }catch(error){toast(error.message);}finally{document.querySelector('#app').inert=false;fileDialogBusy=false;void openSystemFiles();}
}
const systemOpenFiles=[];
let openingSystemFiles=false;
async function openSystemFiles(files=[]){
  systemOpenFiles.push(...files);
  if(openingSystemFiles||fileDialogBusy||document.querySelector('dialog[open]'))return;
  openingSystemFiles=true;
  try{
    while(systemOpenFiles.length&&!document.querySelector('dialog[open]'))await fileAction('system',systemOpenFiles.shift());
  }finally{openingSystemFiles=false;}
}
function changeMode(next,arrange=false){
  // Serialize transitions so loading and saving can never leave a stale mode selected.
  modeChange=modeChange.then(async()=>{
    if(mode===next){if(next==='display'&&arrange)await openDisplayPlan();return true;}
    if(mode==='display'&&!await closeDisplayPlan())return false;
    if(mode==='organize'&&!await logicModule.closeLogic())return false;
    exitDisplay?.();exitDisplay=null;
    const writing=()=>{mode='write';markMode(mode);};
    if(next==='write'){writing();return true;}
    folds?.clear();disposeFind?.();closeReference?.();document.body.classList.remove('sidebar-open');
    if(next==='organize'){
      logicModule??=await import('./logic-panel.js');
      await logicModule.openLogicPanel(editor,current().title,current().id,{onClose:writing,onArrange:()=>showPresentation(true)});
    }else exitDisplay=enterDisplay(editor,{onExit:writing,onRequestExit:()=>changeMode('write'),onArrange:()=>openDisplayPlan()});
    mode=next;markMode(mode);if(next==='display'&&arrange)await openDisplayPlan();return true;
  }).catch(error=>{toast('切换失败：'+error.message);return false;});
  return modeChange;
}
const showPresentation=(arrange=false)=>changeMode('display',arrange);
const showLogic=()=>changeMode('organize');
async function closeDisplayPlan(){await planOpening;return planView?planView.close():true;}
function openDisplayPlan(){
  if(planView||planOpening)return planOpening;
  planOpening=(async()=>{
    const [{openShowPlan},logic]=await Promise.all([import('./show-plan.js'),import('./logic-panel.js')]);
    const id=active,headings=[...editor.getEditorElements().wwEditor.querySelectorAll('h1,h2,h3,h4,h5,h6')];
    const entries=headings.map((node,index)=>({title:node.textContent,level:Number(node.tagName[1]),index}));
    const levels=[...new Set(entries.map(entry=>entry.level))].sort();
    const level=entries.filter(entry=>entry.level===1).length===1&&entries.filter(entry=>entry.level===2).length>1?2:levels[0]||1;
    const storageKey='markdeck-logic-'+id;
    const response=desktop?.loadLogic?await desktop.loadLogic(id):{ok:true,state:localStorage.getItem(storageKey)};
    if(!response.ok)throw new Error(response.error);
    const state=response.state?JSON.parse(response.state):{version:1,notes:{},edges:[],frames:{},summaries:{},plans:[],positions:{},collapsed:{},zoom:1,left:0,top:0,cardLevel:level};
    if(state.version!==1||!state.notes||!state.positions||!state.collapsed||!Number.isFinite(state.zoom))throw new Error('布局数据无效');
    let pending=Promise.resolve();
    const save=()=>{
      const snapshot=JSON.stringify(state);
      pending=pending.catch(()=>{}).then(async()=>{if(desktop?.saveLogic){const result=await desktop.saveLogic(id,snapshot);if(!result.ok)throw new Error(result.error);}else localStorage.setItem(storageKey,snapshot);});
      return pending.then(()=>true,()=>false);
    };
    planView=await openShowPlan({editor,title:current().title,state,sections:level=>logic.logicSections(entries,current().title,level),level:levels.includes(state.cardLevel)?state.cardLevel:level,save,onClose:()=>{planView=null;const button=document.querySelector('[data-arrange]');button?.setAttribute('aria-expanded','false');button?.focus({preventScroll:true});}});
    document.querySelector('[data-arrange]')?.setAttribute('aria-expanded','true');
  })().catch(error=>toast('展示章节打开失败：'+error.message)).finally(()=>planOpening=null);
  return planOpening;
}
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2500);}
function render(){closeReference?.();disposeQuickTools?.();disposeFind?.();exitDisplay?.();disposeTableControls?.();disposeImageControls?.();editor?.destroy();const d=current();document.querySelector('#app').innerHTML=`
<aside class="sidebar"><div class="brand"><span class="brand-mark"><img src="${brandIcon}" alt=""></span><strong>Markdeck</strong><button class="icon-btn mobile-close" data-action="sidebar" title="关闭文档导航" aria-label="关闭导航">${icon('close')}</button></div><button class="search" data-action="search">${icon('search')}<span>搜索文档</span><kbd>⌘ K</kbd></button><button class="new-doc" data-action="new">${icon('plus')}新建文档</button><button class="import-doc" data-action="import" title="${desktop?'打开本地 Markdown（⌘O）':'导入 Markdown 文件'}">${icon(desktop?'folder':'upload')}<span>${desktop?'打开文档':'导入文档'}</span></button><nav><button class="nav-item ${category==='all'?'selected':''}" data-category="all">${icon('folder')}我的文档<span>${docs.length}</span></button><button class="nav-item ${category==='star'?'selected':''}" data-category="star">${icon('star')}收藏文档<span>${docs.filter(x=>x.star).length}</span></button></nav><div class="list-label">文档列表</div><input id="filter" class="filter" placeholder="输入文档名称…" value="${escape(filter)}" aria-label="搜索文档"><div id="doc-list"></div></aside>
<main><header class="topbar"><div class="breadcrumb"><button class="icon-btn" data-action="sidebar" aria-label="切换导航">${icon('menu')}</button><button class="outline-toggle" data-action="outline" aria-controls="document-outline" aria-pressed="${view.outline}">${icon('outline')}<span>目录</span></button><span id="crumb" title="${escape(d.filePath||d.title)}">${escape(d.title)}</span></div><nav class="work-modes" aria-label="文档模式"><button data-action="write" data-mode="write" aria-pressed="true">写作</button><button data-action="logic" data-mode="organize" aria-pressed="false">梳理</button><button data-action="presentation" data-mode="display" aria-pressed="false">展示</button></nav><div class="top-actions"><button class="reference-toggle" data-action="reference" aria-pressed="false" title="并排查阅另一份文档">${icon('reference')}<span>参考</span></button><span class="saved">${icon('check')}<span id="save-state"></span></span>${desktop?`<button class="icon-btn" data-action="reload-file" ${d.filePath?'':'disabled'} title="刷新本地文件（⌘R）" aria-label="刷新本地文件">${icon('refresh')}</button><button class="icon-btn" data-action="show-in-folder" ${d.filePath?'':'disabled'} title="${d.filePath?'在文件夹中显示当前文档':'保存到本地后可打开所在文件夹'}" aria-label="在文件夹中显示">${icon('folder')}</button><button class="icon-btn feishu-button" ${view.feishu?'':'hidden'} data-action="feishu" title="上传到飞书" aria-label="上传到飞书">${feishuIcon}</button>${d.filePath?'':`<button class="export" data-action="save-file">保存到文件</button>`}`:''}<button class="icon-btn" data-action="settings" title="设置" aria-label="设置">${icon('settings')}</button></div></header>
<div class="document-shell"><section class="document"><input class="doc-title" id="title" value="${escape(d.title)}" aria-label="文档标题"><div class="doc-meta"><span id="updated">${date(d.updated)} 更新</span><span class="meta-divider"></span><span id="word-count"></span></div><div id="editor"></div></section><aside class="outline" id="document-outline"><div class="outline-title">文档目录 <button class="icon-btn outline-close" data-action="outline" title="收起目录" aria-label="收起目录">${icon('collapse')}</button></div><input id="outline-filter" class="outline-filter" aria-label="搜索目录" placeholder="搜索章节…"><nav id="outline"></nav></aside></div></main><div id="toast" role="status"></div><input type="file" id="file-input" accept=".md,.markdown,.txt,text/plain" hidden><dialog id="settings-dialog" class="settings-dialog" aria-labelledby="settings-title"><header><h3 id="settings-title">设置</h3><button class="icon-btn" data-action="close-settings" aria-label="关闭设置">×</button></header><label class="setting-row"><span>界面皮肤</span><select id="theme-select" class="theme-select" aria-label="界面皮肤">${Object.entries(themes).map(([value,label])=>`<option value="${value}" ${theme===value?'selected':''}>${label}</option>`).join('')}</select></label><div class="theme-gallery" role="group" aria-label="皮肤预览">${Object.entries(themePalettes).map(([id,p])=>`<button type="button" data-theme-choice="${id}" aria-pressed="${id===theme}" aria-label="${p.name}" style="--sample-bg:${p.page};--sample-ink:${p.ink};--sample-accent:${p.accent};--sample-panel:${p.panel}"><span class="theme-preview" aria-hidden="true"><i></i><b>Aa</b><em></em></span><span>${p.name}</span></button>`).join('')}</div><label class="setting-row"><span>正文大小</span><select id="font-size" class="theme-select" aria-label="正文大小">${[15,17,19,21].map(size=>`<option value="${size}" ${view.size===size?'selected':''}>${size} px</option>`).join('')}</select></label><label class="setting-row"><span>显示格式工具栏</span><input id="show-toolbar" type="checkbox" ${view.toolbar?'checked':''}></label>${desktop?`<section class="feishu-preference"><label class="setting-row"><span>显示飞书上传按钮</span><input id="show-feishu" type="checkbox" ${view.feishu?'checked':''}></label><button class="feishu-config" data-action="feishu-settings" ${view.feishu?'':'hidden'}>飞书账号配置 ${icon('chevron')}</button></section>`:''}<nav class="settings-actions" aria-label="文档工具"><section class="settings-group"><h4>文档操作</h4><button data-action="find">${icon('search')}查找与替换</button><button data-action="star">${icon('star')}${d.star?'取消收藏':'收藏文档'}</button>${desktop?`<button data-action="save-file">${icon('download')}${d.filePath?'另存为…':'保存到文件…'}</button>`:`<button data-action="export">${icon('download')}导出 Markdown</button>`}</section><details class="settings-group" data-settings-group="export"><summary>导出与分享 ${icon('chevron')}</summary><button data-action="export-html">${icon('doc')}导出 HTML</button><button data-action="export-pdf">${icon('doc')}导出 PDF</button>${desktop?`<button data-action="bundle">${icon('folder')}打包 Markdown 与图片</button>`:''}</details>${desktop?`<details class="settings-group" data-settings-group="maintenance"><summary>维护工具 ${icon('chevron')}</summary><button data-action="project">${icon('folder')}文档文件夹与搜索</button><button data-action="image-fix">${icon('search')}修复图片引用</button><button data-action="history">${icon('clock')}修改记录与恢复</button></details>`:''}</nav></dialog><dialog id="delete-dialog"><h3>删除这份文档？</h3><p>${desktop?'从文档列表移除“'+escape(d.title)+'”。已关联的本地文件会保留。':'“'+escape(d.title)+'”将从浏览器存储中移除，此操作无法撤销。'}</p><div><button data-action="cancel-delete">取消</button><button class="danger" data-action="confirm-delete">删除文档</button></div></dialog>`;renderList();editor=new Editor({el:document.querySelector('#editor'),initialValue:d.body,initialEditType:'wysiwyg',plugins:[markdownShortcuts],hooks:{addImageBlobHook:(blob,callback)=>imageBlobHook(blob,callback,d.id)},customMarkdownRenderer:imageMarkdownRenderer,hideModeSwitch:true,height:'auto',minHeight:'400px',language:'zh-CN',autofocus:false,usageStatistics:false,extendedAutolinks:true,placeholder:'开始写作…',customHTMLSanitizer:html=>DOMPurify.sanitize(html),toolbarItems:[['heading','bold','italic','strike'],['hr','quote'],['ul','ol','task'],['table','image','link'],['code','codeblock'] ]});
disposeQuickTools=quickTools(editor,document.querySelector('#editor'),d.id);
folds=sectionFold(editor);
disposeTableControls=tableControls(editor,document.querySelector('#editor'));
restoreImageLayout(editor,d.body);
hydrateImages(editor,d.id).catch(()=>{});
disposeImageControls=imageControls(editor,document.querySelector('#editor'));
const editable=editor.getEditorElements().wwEditor.querySelector('[contenteditable]');editable.setAttribute('aria-label','文档正文');editable.setAttribute('role','textbox');editable.setAttribute('aria-multiline','true');editor.on('change',()=>{if(applyingExternal)return;current().body=editor.getMarkdown();update();});renderOutline();bind();applyView();showSaveState();}
function date(t){return new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric'}).format(t);}
function renderList(){document.querySelector('#doc-list').innerHTML=docs.filter(d=>(category!=='star'||d.star)&&d.title.toLowerCase().includes(filter.toLowerCase())).map(d=>`<div draggable="true" data-doc-id="${d.id}" class="doc-row ${d.id===active?'active':''}" title="拖动调整顺序"><button class="doc-select" data-id="${d.id}" title="${escape(d.title)}">${icon('doc')}<span>${escape(d.title)}</span></button><button class="delete-doc icon-btn" data-action="delete" data-remove-id="${d.id}" title="从列表移除" aria-label="从列表移除 ${escape(d.title)}">${icon('trash')}</button></div>`).join('')||'<p class="empty">这里还没有文档</p>';}
let listBusy=false,removeId=null;
bindDocumentList(document,async(from,to,after)=>{
 if(listBusy)return;listBusy=true;
 const previous=[...docs];try{const source=docs.find(d=>d.id===from);if(!source||!docs.some(d=>d.id===to))return;docs=docs.filter(d=>d.id!==from);docs.splice(docs.findIndex(d=>d.id===to)+(after?1:0),0,source);renderList();const result=await save();if(!result.ok){docs=previous;renderList();toast('排序保存失败，请重试');}}finally{listBusy=false;}
});
async function removeFromList(){
 if(listBusy||!removeId)return;listBusy=true;
 try{
  if(!await changeMode('write'))return;
  const saved=await save();if(!saved.ok||fileErrors[removeId]){toast('请先保存或另存这份文档，再从列表移除');return;}
  const previous=docs,previousActive=active;docs=docs.filter(d=>d.id!==removeId);
  if(!docs.length)docs=[{id:crypto.randomUUID(),title:'无标题文档',body:'',updated:Date.now(),star:false}];
  if(!docs.some(d=>d.id===active))active=docs[0].id;
  const result=await save();if(!result.ok){docs=previous;active=previousActive;toast('移除保存失败，请重试');return;}
  removeId=null;render();toast('已从列表移除');
 }finally{listBusy=false;}
}
function filterOutline(){
 const query=(document.querySelector('#outline-filter')?.value||'').trim().toLowerCase();let hiddenBelow=7;
 for(const row of document.querySelectorAll('#outline .outline-entry')){const level=Number(row.dataset.level),index=Number(row.dataset.index),link=row.querySelector('a');if(level<=hiddenBelow)hiddenBelow=7;
 const hidden=query?!link.textContent.toLowerCase().includes(query):level>hiddenBelow;
 row.hidden=hidden;link.hidden=hidden;
 if(!query&&outlineCollapsed.has(index))hiddenBelow=Math.min(hiddenBelow,level);
 }
}
function renderOutline(){
 outlineHeadings=[...editor.getEditorElements().wwEditor.querySelectorAll('h1,h2,h3,h4,h5,h6')];
 const signature=active+JSON.stringify(outlineHeadings.map(h=>[h.tagName,h.textContent]));if(signature!==outlineSignature){outlineCollapsed.clear();outlineSignature=signature;}
 const nav=document.querySelector('#outline'),top=nav.scrollTop;const min=Math.min(...outlineHeadings.map(h=>Number(h.tagName[1])));
 const html=outlineHeadings.map((h,i)=>{const level=Number(h.tagName[1]),children=Number(outlineHeadings[i+1]?.tagName[1])>level;return `<div class="outline-entry" data-index="${i}" data-level="${level}" style="--outline-depth:${level-min}">${children?`<button data-fold-outline-node="${i}" title="${outlineCollapsed.has(i)?'展开':'收起'}子章节" aria-label="展开或折叠子目录：${escape(h.textContent)}" aria-expanded="${!outlineCollapsed.has(i)}"><svg class="outline-chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false"><path d="m7 4 6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`:'<span class="outline-spacer" aria-hidden="true"></span>'}<a class="depth-${h.tagName}" href="#heading-${i}" title="${escape(h.textContent)}"><span class="outline-label">${escape(h.textContent)}</span></a></div>`;}).join('')||'<span class="empty">添加标题后显示目录</span>';
 if(nav.dataset.headings!==html){nav.innerHTML=html;nav.dataset.headings=html;}filterOutline();nav.scrollTop=top;document.querySelector('#word-count').textContent=`${current().body.replace(/\s/g,'').length.toLocaleString()} 字`;queueOutline();
}
function queueOutline(){if(outlineFrame)return;outlineFrame=requestAnimationFrame(()=>{outlineFrame=0;followOutline();});}
function followOutline(){
  if(!outlineHeadings.length)return;
  const toolbar=document.querySelector('.toastui-editor-toolbar');const threshold=document.querySelector('.topbar').getBoundingClientRect().bottom+(view.toolbar?(toolbar?.getBoundingClientRect().height||0):0)+24;
  let index=0;for(let i=0;i<outlineHeadings.length;i++){if(outlineHeadings[i].getBoundingClientRect().top<=threshold)index=i;else break;}
  const nav=document.querySelector('#outline');const link=nav.querySelectorAll('a')[index];if(!link)return;
  for(const a of nav.querySelectorAll('a')){const selected=a===link;a.classList.toggle('active',selected);if(selected)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');}
  if(!view.outline)return;
  const bounds=nav.getBoundingClientRect(),item=link.getBoundingClientRect();if(item.top<bounds.top+8)nav.scrollTop+=item.top-bounds.top-8;else if(item.bottom>bounds.bottom-8)nav.scrollTop+=item.bottom-bounds.bottom+8;
}
async function syncExternal(){
  if(mode!=='write')return;
  if(!desktop||syncing||fileDialogBusy||!current().filePath||document.hidden||document.querySelector('dialog[open]'))return;
  syncing=true;const id=active;
  try{
    await saving;if(active!==id||mode!=='write'||document.body.classList.contains('organize-mode'))return;const body=current().body;
    const result=await desktop.sync(id);if(!result.ok)throw new Error(result.error);
    if(active!==id||mode!=='write'||document.body.classList.contains('organize-mode'))return;
    if(result.error){fileErrors[id]=result.error;showSaveState();return;}
    if(!result.changed){if(result.clean){delete fileErrors[id];showSaveState();}return;}
    // If typing occurred during the check, the old revision will reject its next write.
    if(current().body!==body){await save();return;}
    Object.assign(current(),result.doc);delete fileErrors[id];
    const scroll=window.scrollY;applyingExternal=true;
    try{editor.setMarkdown(current().body,false);restoreImageLayout(editor,current().body);}finally{applyingExternal=false;}
    await hydrateImages(editor,id);renderOutline();document.querySelector('#updated').textContent=date(current().updated)+' 更新';showSaveState();window.scrollTo({top:scroll,behavior:'instant'});queueOutline();
  }catch(error){if(active===id){fileErrors[id]=error.message;showSaveState();}}finally{syncing=false;}
}
window.addEventListener('scroll',queueOutline,{passive:true});window.addEventListener('resize',queueOutline);
let refreshTimer;
function update(){clearTimeout(refreshTimer);const target=editor,id=active;refreshTimer=setTimeout(()=>{if(editor!==target||active!==id)return;hydrateImages(editor,active).catch(()=>{});renderOutline();},120);current().updated=Date.now();document.querySelector('#updated').textContent=date(current().updated)+' 更新';save(true);}
async function newDoc(title='无标题文档',body=''){if(!await changeMode('write'))return;const d={id:crypto.randomUUID(),title,body,updated:Date.now(),star:false};docs.unshift(d);active=d.id;document.body.classList.remove('sidebar-open');filter='';category='all';render();save();document.querySelector('#title').focus();}
function bind(){document.querySelector('#outline-filter').oninput=filterOutline;document.querySelector('#theme-select').addEventListener('change',e=>applyTheme(e.target.value));document.querySelector('#font-size').addEventListener('change',e=>{view.size=Number(e.target.value);applyView();});for(const [id,key] of [['show-toolbar','toolbar'],['show-feishu','feishu']])document.querySelector('#'+id)?.addEventListener('change',e=>{view[key]=e.target.checked;applyView();});document.querySelector('#title').addEventListener('input',e=>{current().title=e.target.value;document.querySelector('#crumb').textContent=e.target.value;document.querySelector('#crumb').title=current().filePath||e.target.value;renderList();update();});document.querySelector('#title').addEventListener('blur',()=>{if(!current().title.trim()){current().title='无标题文档';document.querySelector('#title').value=current().title;document.querySelector('#crumb').textContent=current().title;renderList();save();}});document.querySelector('#filter').addEventListener('input',e=>{filter=e.target.value;renderList();});document.querySelector('#file-input').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{await newDoc(f.name.replace(/\.(md|markdown|txt)$/i,''),await f.text());toast('文档已导入');}catch{toast('读取失败，请重新选择文件');}});}
document.addEventListener('click',async e=>{const button=e.target.closest('button,a');if(!button)return;if(button.dataset.themeChoice){applyTheme(button.dataset.themeChoice);return;}if(button.dataset.id){if(!await changeMode('write'))return;active=button.dataset.id;document.body.classList.remove('sidebar-open');window.scrollTo(0,0);render();save();return;}if(button.dataset.foldOutlineNode!==undefined){const index=Number(button.dataset.foldOutlineNode);if(outlineCollapsed.has(index))outlineCollapsed.delete(index);else outlineCollapsed.add(index);renderOutline();return;}if(button.closest('#outline')){folds.clear();renderOutline();e.preventDefault();const index=Number(button.hash.replace('#heading-',''));editor.getEditorElements().wwEditor.querySelectorAll('h1,h2,h3,h4,h5,h6')[index]?.scrollIntoView({block:'start'});if(innerWidth<=760){view.outline=false;applyView();}return;}if(button.dataset.category){if(!await changeMode('write'))return;category=button.dataset.category;render();return;}switch(button.dataset.action){case 'reference':{if(document.querySelector('.reference-pane')){closeReference?.();break;}if(referenceLoading)break;referenceLoading=true;const id=active;try{const {openReference}=await import('./reference-pane.js');if(active===id&&mode==='write'&&!document.body.classList.contains('organize-mode'))closeReference=openReference(docs,active,applyView);}catch(error){toast('参考文档打开失败：'+error.message);}finally{referenceLoading=false;applyView();}break;}case 'project':{document.querySelector('#settings-dialog').close();const {openProject}=await import('./project-dialog.js');await openProject(relative=>fileAction('project',relative),query=>{disposeFind=openFind(editor,query);});break;}case 'image-fix':try{document.querySelector('#settings-dialog').close();if(!current().filePath){toast('请先保存到本地文件再修复图片');break;}const saved=await save();if(!saved.ok)throw new Error(saved.error||'保存失败');const docId=active;const {openImageFix}=await import('./image-fix-dialog.js');await openImageFix({docId,onApplyBody:async newBody=>{if(active!==docId)throw new Error('当前文档已切换，请关闭窗口后重新修复');current().body=newBody;editor.setMarkdown(newBody,false);const result=await save();if(!result.ok)throw new Error(result.error||'保存失败');toast('已更新文档');}});}catch(error){toast(error.message);}break;case 'bundle':try{document.querySelector('#settings-dialog').close();const saved=await save();if(!saved.ok)throw new Error(saved.error||'保存失败');const result=await desktop.bundleDocument(active);if(!result.ok)throw new Error(result.error);if(!result.canceled)toast(`已打包 Markdown 与 ${result.count} 张本地图片`+(result.external?`；${result.external} 张网络图片仍需联网`:''));}catch(error){window.alert(error.message);}break;case 'write':await changeMode('write');break;case 'logic':await showLogic();break;case 'find':if(mode!=='write'&&!await changeMode('write'))break;folds?.clear();renderOutline();disposeFind=openFind(editor);break;case 'export-html':case 'export-pdf':try{document.querySelector('#settings-dialog').close();const {exportDocument}=await import('./document-export.js');const exported=await exportDocument(editor,{...current()},theme,button.dataset.action==='export-pdf'?'pdf':'html');if(exported)toast('文档已导出');}catch(error){toast(error.message);}break;case 'history':try{if(!await changeMode('write'))break;document.querySelector('#settings-dialog').close();await save();const {openHistory}=await import('./history-dialog.js');await openHistory({...current()},async version=>{await saving;const result=await desktop.restore(active,version);if(!result.ok)throw new Error(result.error);if(Object.keys(result.errors).length)throw new Error(Object.values(result.errors).join('；'));docs=result.state.docs;active=result.state.active;render();showSaveState();});}catch(error){toast(error.message);}break;case 'new':await newDoc();break;case 'search':document.body.classList.add('sidebar-open');document.querySelector('#filter').classList.add('visible');document.querySelector('#filter').focus();break;case 'sidebar':document.body.classList.toggle('sidebar-open');break;case 'outline':if(document.body.classList.contains('reference-open')){closeReference?.();view.outline=true;}else view.outline=!view.outline;applyView();if(!view.outline)document.querySelector('.outline-toggle').focus();break;case 'settings':document.querySelector('#settings-dialog').showModal();break;case 'presentation':await showPresentation();break;case 'close-settings':document.querySelector('#settings-dialog').close();break;case 'star':if(!await changeMode('write'))break;current().star=!current().star;render();save();break;case 'import':if(desktop)await fileAction('open');else document.querySelector('#file-input').click();break;case 'open':await fileAction('open');break;case 'feishu-settings':case 'feishu':{const {openFeishu}=await import('./feishu-dialog.js');document.querySelector('#settings-dialog')?.close();await openFeishu({doc:{...current()},save,configure:button.dataset.action==='feishu-settings'});break;}case 'show-in-folder':{const result=await desktop.showInFolder(active);if(!result.ok)toast(result.error);break;}case 'save-file':await fileAction('save-as');break;case 'reload-file':await fileAction('reload');break;case 'export':{if(desktop){await fileAction('save-as');break;}const d=current();const blob=new Blob([`# ${d.title}\n\n${d.body}`],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(d.title.replace(/[\\/:*?"<>|]/g,'_')||'文档')+'.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Markdown 文档已导出');break;}case 'delete':{removeId=button.dataset.removeId||active;const target=docs.find(d=>d.id===removeId);if(!target)break;const dialog=document.querySelector('#delete-dialog');dialog.querySelector('h3').textContent='从列表移除这份文档？';dialog.querySelector('p').textContent=target.filePath?`移除“${target.title}”的列表条目，磁盘上的 Markdown 文件会保留。`:`“${target.title}”尚未关联本地文件。移除后将不再显示这份草稿，请确认不再需要，或先取消并保存到文件。`;dialog.querySelector('[data-action="confirm-delete"]').textContent='从列表移除';dialog.showModal();break;}case 'cancel-delete':removeId=null;document.querySelector('#delete-dialog').close();break;case 'confirm-delete':await removeFromList();break;}});
document.addEventListener('keydown',async e=>{if(e.defaultPrevented||e.isComposing||document.querySelector('dialog[open]')||mode!=='write'||e.target.closest?.('.reference-pane'))return;if((e.metaKey||e.ctrlKey)&&['f','h'].includes(e.key.toLowerCase())){e.preventDefault();folds?.clear();renderOutline();disposeFind=openFind(editor);return;}if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();document.body.classList.add('sidebar-open');document.querySelector('#filter').classList.add('visible');document.querySelector('#filter').focus();}if((e.metaKey||e.ctrlKey)&&e.key==='s'){e.preventDefault();if(desktop&&!current().filePath)await fileAction('save-as');else{const result=await save();toast(result.ok&&!result.fileErrors?'文档已保存':'请检查保存状态');}}});
if(desktop){desktop.onAction(async action=>{if(action!=='close'&&document.querySelector('dialog[open]')){toast('请先关闭当前对话框');return;}if(action==='close'){await modeChange;if(!await closeDisplayPlan())return;if(document.querySelector('.logic-workspace')){const {flushLogic}=await import('./logic-panel.js');if(!await flushLogic())return;}await desktop.finishClose(await save());}else if(action==='refresh'){if(current().filePath)await fileAction('reload');else toast('请先打开或保存到本地文件');}else if(action==='presentation'){await showPresentation();}else if(action==='new')await newDoc();else if(action==='open')await fileAction('open');else if(action==='save-as'||(action==='save'&&!current().filePath))await fileAction('save-as');else if(action==='save')await save();});}

render();
if(desktop){bindDocumentDrop(document);desktop.onDroppedFiles(async tokens=>{for(const token of tokens){if(!await fileAction('drop',token))break;}});}
if(desktop){await save();desktop.onOpenFiles?.(openSystemFiles);document.addEventListener('close',()=>void openSystemFiles(),true);await desktop.ready?.();setInterval(syncExternal,1500);window.addEventListener('focus',syncExternal);}

document.addEventListener('markdeck-image-added',()=>hydrateImages(editor,active).catch(()=>{}));
