// Parser and theme renderer adapted from the user's Markdeck project.
import {parseMarkdownToSlides} from './markdown-parser.ts';
import {renderDeckHtml} from './theme-renderer.ts';

export const presentationThemes={minimal:'简洁',editorial:'报告',bold:'深色',modern:'现代',swiss:'瑞士'};
export function documentSections(markdown){
  const lines=markdown.split(/\r?\n/),sections=[];let fence=null;
  lines.forEach((line,index)=>{const marker=line.match(/^\s{0,3}(`{3,}|~{3,})/);if(marker){if(!fence)fence=marker[1];else if(marker[1][0]===fence[0]&&marker[1].length>=fence.length)fence=null;return;}if(fence)return;const match=line.match(/^(#{1,6})\s+(.+)$/);if(match)sections.push({line:index,level:match[1].length,title:match[2]});});
  return sections.map((section,index)=>({...section,text:lines.slice(section.line,sections.slice(index+1).find(next=>next.level<=section.level)?.line??lines.length).join('\n')}));
}
const presentationStyle=`
html,body{height:100%;margin:0;overflow:hidden}main.deck{width:100%;max-width:none;margin:0;padding:0}
.slide:not(.is-current){display:none!important}.slide.is-current{width:100%;height:100vh;min-height:0;max-height:none;margin:0!important;padding:clamp(28px,5vw,72px);overflow:auto;border:0;border-radius:0;box-shadow:none}
.slide.is-current> *{flex-shrink:0}.slide h1{overflow-wrap:anywhere}.slide .body{overflow-wrap:anywhere}
html[data-theme="minimal"]{--accent:#2b7d53;--accent-focus:#246444}html[data-theme="minimal"] body{font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif}
.slide.is-current .data-table{width:100%;font-size:clamp(12px,1.4vw,18px)}

/* Preserve each layout's grid/flex structure and normalize Chinese title sizing. */
html[data-theme] .layout-content{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr);align-content:start;gap:24px}
html[data-theme] .layout-content .body{align-self:start;max-width:none}
html[data-theme] .slide:not(.layout-cover) h1{max-width:none;font-size:clamp(26px,3.2vw,44px);line-height:1.25;letter-spacing:0;font-style:normal}
html[data-theme] .layout-cover h1{max-width:22ch;font-size:clamp(32px,4.6vw,64px);line-height:1.25;letter-spacing:0;font-style:normal}
html[data-theme] .layout-cover h1[data-len="xl"]{font-size:clamp(30px,3.6vw,48px)}
html[data-theme] .slide .body,html[data-theme] .layout-bullet .bullet-list{font-size:clamp(17px,1.8vw,24px);line-height:1.65}
html[data-theme] .layout-content .body p{margin:0 0 18px}
html[data-theme] .slide .kicker{grid-column:1/-1}
html[data-theme] .layout-table{grid-template-rows:auto auto minmax(0,1fr);gap:20px}
html[data-theme] .layout-bullet{grid-template-rows:auto auto minmax(0,1fr);gap:24px}
html[data-theme] .slide .data-table th{font-style:normal;white-space:normal}
.deck-controls{position:fixed;right:14px;bottom:14px;display:flex;gap:6px;align-items:center;background:#fff;color:#172018;border:1px solid #b7c9af;border-radius:8px;padding:6px 10px;font:13px system-ui;z-index:100}
.deck-controls button{cursor:pointer;border:0;background:transparent;color:inherit;font-size:17px;padding:3px 8px}.deck-controls button:disabled{opacity:.3}
@media print{html,body{overflow:visible;height:auto}.slide{display:flex!important;height:auto;min-height:100vh;break-after:page;box-shadow:none}.deck-controls{display:none}}
`;
const navigationScript=`(()=>{const slides=[...document.querySelectorAll('.slide')];let current=0;const count=document.querySelector('[data-count]'),previous=document.querySelector('[data-previous]'),next=document.querySelector('[data-next]');function show(index){current=Math.max(0,Math.min(slides.length-1,index));slides.forEach((s,i)=>{s.classList.toggle('is-current',i===current);if(i===current)s.scrollTop=0});count.textContent=(current+1)+' / '+slides.length;previous.disabled=current===0;next.disabled=current===slides.length-1}previous.onclick=()=>show(current-1);next.onclick=()=>show(current+1);document.addEventListener('keydown',event=>{if(event.target.closest?.('input,textarea,select,[contenteditable=true]'))return;if(event.key===' '&&event.target.closest?.('button'))return;if(['ArrowRight','PageDown',' '].includes(event.key)){event.preventDefault();show(current+1)}else if(['ArrowLeft','PageUp'].includes(event.key)){event.preventDefault();show(current-1)}else if(event.key==='Home')show(0);else if(event.key==='End')show(slides.length-1)});show(0)})();`;
export function createPresentation(markdown,title,theme='minimal'){
  if(!Object.hasOwn(presentationThemes,theme))throw new Error('请选择有效的演示主题');
  if(!markdown.trim())throw new Error('文档还没有正文，写好内容后再生成');
  const source=documentSections(markdown).some(section=>section.level===1)?markdown:`# ${title.replace(/[\r\n]/g,' ')}\n\n${markdown}`;
  const slides=parseMarkdownToSlides(source);
  if(!slides.length)throw new Error('没有可生成的内容');
  const html=renderDeckHtml(slides,slides.map(s=>({slideId:s.id,layout:s.type})),theme).replace('</style>',presentationStyle+'</style>').replace('class="slide ', 'class="slide is-current ');
  const controls='<nav class="deck-controls" aria-label="幻灯片翻页"><button data-previous aria-label="上一页">‹</button><span data-count></span><button data-next aria-label="下一页">›</button></nav>';
  const exported=html.replace('</body>',controls+'<script>'+navigationScript+'</script></body>');
  return {slides,html,exported};
}
