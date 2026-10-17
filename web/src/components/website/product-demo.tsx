'use client';

import { useRef, useState, type PointerEvent, type KeyboardEvent } from 'react';
import { Arrow } from './brand';

type Mode = 'write' | 'organize' | 'present';
type Theme = 'paper' | 'sage' | 'graphite' | 'night';
const modes: { id: Mode; title: string; number: string; heading: string; text: string }[] = [
  { id: 'write', title: '写作', number: '01', heading: '只管写，思路自然往下走。', text: '在排版好的正文里直接编辑。标题、列表、图片和表格，都在你需要的地方。' },
  { id: 'organize', title: '梳理', number: '02', heading: '退后一步，看见想法之间的关系。', text: '让章节成为卡片，用连线整理逻辑，留一张便笺记下新的判断。原文始终保留。' },
  { id: 'present', title: '展示', number: '03', heading: '想清楚了，就从容地讲出来。', text: '选好章节和讲述顺序，让同一份文档成为表达的现场。无需再复制一遍内容。' },
];
const initialSections = [
  { title: '从一次停留开始', text: '我们想开一家让人愿意停留的书店。这里有书，有咖啡，也有不必急着离开的午后。让阅读重新回到日常，而不是待办清单。' },
  { title: '连接人与好内容', text: '把选书、空间与交流放在一起。每一场读书会、每一张手写推荐，都让书架上的故事与眼前的人发生连接。' },
  { title: '让好想法慢慢生长', text: '先从一个街区、一个书架和一群愿意分享的人开始。留出尝试的空间，也给改变一点时间。' },
];
const initialPositions = [{ x: 35, y: 62 }, { x: 330, y: 190 }, { x: 625, y: 62 }];
const themes: { id: Theme; label: string; color: string }[] = [{ id: 'paper', label: '纸白', color: '#f7f6f0' }, { id: 'sage', label: '雾绿', color: '#d9e4d4' }, { id: 'graphite', label: '石墨', color: '#444945' }, { id: 'night', label: '夜色', color: '#212d3a' }];

export function ProductDemo() {
  const [mode, setMode] = useState<Mode>('write');
  const [theme, setTheme] = useState<Theme>('paper');
  const [sections, setSections] = useState(initialSections);
  const [section, setSection] = useState(0);
  const [slide, setSlide] = useState(0);
  const [positions, setPositions] = useState(initialPositions);
  const [note, setNote] = useState('留一个角落，给还没想好的事。');
  const board = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; pointer: number; x: number; y: number; startX: number; startY: number } | null>(null);
  const current = modes.find(item => item.id === mode)!;

  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % modes.length;
    else if (event.key === 'ArrowLeft') next = (index + modes.length - 1) % modes.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = modes.length - 1;
    else return;
    event.preventDefault(); setMode(modes[next].id);
    document.getElementById(`demo-tab-${modes[next].id}`)?.focus();
  }
  function startDrag(event: PointerEvent<HTMLButtonElement>, id: number) {
    if(event.button !== 0) return;
    drag.current = { id, pointer: event.pointerId, x: event.clientX, y: event.clientY, startX: positions[id].x, startY: positions[id].y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const move = drag.current, bounds = board.current?.getBoundingClientRect();
    if(!move || move.pointer !== event.pointerId || !bounds?.width || !bounds.height) return;
    const x = Math.max(12, Math.min(648, move.startX + (event.clientX - move.x) * 900 / bounds.width));
    const y = Math.max(12, Math.min(270, move.startY + (event.clientY - move.y) * 360 / bounds.height));
    setPositions(value => value.map((point, i) => i === move.id ? { x, y } : point));
  }
  function moveByKey(event: KeyboardEvent<HTMLButtonElement>, id: number) {
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const dx = event.key === 'ArrowLeft' ? -12 : event.key === 'ArrowRight' ? 12 : 0;
    const dy = event.key === 'ArrowUp' ? -12 : event.key === 'ArrowDown' ? 12 : 0;
    setPositions(value => value.map((point, i) => i === id ? { x: Math.max(12, Math.min(648, point.x + dx)), y: Math.max(12, Math.min(270, point.y + dy)) } : point));
  }

  return <section className="website-experience website-container" id="experience" aria-label="Markdeck 交互演示">
    <div className="demo-caption"><span><i/> A SPACE FOR YOUR THOUGHTS</span><span>交互演示 · 示例内容</span></div>
    <div className={`product-demo theme-${theme}`}>
      <div className="demo-window-bar"><div className="demo-traffic" aria-hidden="true"><i/><i/><i/></div><span className="demo-filename">街角书店计划.md</span><span className="demo-local">本地 Markdown</span></div>
      <div className="demo-toolbar"><span className="demo-wordmark">Markdeck<span> / </span></span><div className="demo-tabs" role="tablist" aria-label="切换演示模式">{modes.map((item, index) => <button key={item.id} id={`demo-tab-${item.id}`} role="tab" aria-selected={mode === item.id} aria-controls={`demo-panel-${item.id}`} tabIndex={mode === item.id ? 0 : -1} onClick={() => setMode(item.id)} onKeyDown={event => tabKey(event, index)}>{item.title}</button>)}</div><span className="demo-edit-status">{mode === 'write' ? '点击正文，试着写几句' : mode === 'organize' ? '卡片可以自由拖动' : '同一份内容，换一种表达'}</span></div>
      <div className="demo-stage" role="tabpanel" id={`demo-panel-${mode}`} aria-labelledby={`demo-tab-${mode}`}>
        {mode === 'write' && <div className="demo-writing"><aside className="demo-outline" aria-label="演示文档目录"><span>文档目录</span><strong>街角书店计划</strong>{sections.map((item, i) => <button key={item.title} className={section === i ? 'active' : ''} aria-current={section === i ? 'location' : undefined} onClick={() => setSection(i)}><small>0{i + 1}</small>{item.title}</button>)}<div className="demo-outline-note">一个想法，<br/>从这里展开。</div></aside><article className="demo-paper"><div className="demo-format" aria-hidden="true"><span>H</span><b>B</b><em>I</em><span>≡</span><span>↗</span><span>⋯</span></div><p className="demo-eyebrow">一间书店，和一种生活</p><h2>一家好书店，<br/>不止卖书<span>。</span></h2><h3><span>0{section + 1}</span> {sections[section].title}</h3><textarea aria-label="编辑示例正文" value={sections[section].text} maxLength={600} onChange={event => { const text = event.target.value; setSections(value => value.map((item, i) => i === section ? { ...item, text } : item)); }}/><blockquote>让每次停留，都有新的发现。</blockquote></article><div className="demo-paper-margin" aria-hidden="true"><span>01 — 03</span></div></div>}
        {mode === 'organize' && <div className="demo-organization"><div className="demo-board-meta"><span>书店计划 / 逻辑画布</span><button onClick={() => setPositions(initialPositions)}>恢复布局 ↺</button></div><div className="demo-board-scroll"><div className="demo-board" ref={board}><svg viewBox="0 0 900 360" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="demo-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="var(--demo-accent)"/></marker></defs>{[0,1].map(i => {const from = positions[i], to = positions[i+1];return <path key={i} d={`M${from.x+240} ${from.y+40} C${from.x+275} ${from.y+40}, ${to.x-35} ${to.y+40}, ${to.x} ${to.y+40}`} fill="none" stroke="var(--demo-accent)" strokeWidth="1.3" markerEnd="url(#demo-arrow)"/>;})}</svg>{positions.map((point, i) => <button key={i} className="demo-flow-node" style={{left:`${point.x/9}%`,top:`${point.y/3.6}%`}} onPointerDown={event => startDrag(event, i)} onPointerMove={moveDrag} onPointerUp={() => {drag.current=null;}} onPointerCancel={() => {drag.current=null;}} onLostPointerCapture={() => {drag.current=null;}} onKeyDown={event => moveByKey(event,i)} aria-label={`拖动卡片：${sections[i].title}，也可用方向键移动`}><span><i>{['观察','连接','行动'][i]}</i><small>⋮⋮</small></span><strong>{sections[i].title}</strong><b className="node-in"/><b className="node-out"/></button>)}<label className="demo-sticky"><span>一点想法 <small>↗</small></span><textarea aria-label="编辑示例便笺" maxLength={100} value={note} onChange={event => setNote(event.target.value)}/></label></div></div></div>}
        {mode === 'present' && <div className="demo-presentation"><div className="demo-present-caption"><span>街角书店计划</span><span>从想法，到日常</span></div><div className="demo-slide"><span className="demo-slide-number">0{slide+1}</span><div><p>THE CORNER BOOKSHOP</p><h2>{sections[slide].title}<span>。</span></h2><p className="demo-slide-copy">{sections[slide].text}</p></div></div><div className="demo-slide-controls"><span>每一页，都来自你的正文</span><div><button aria-label="上一章" disabled={slide===0} onClick={() => setSlide(value => value-1)}>←</button><output aria-live="polite">0{slide+1} / 03</output><button aria-label="下一章" disabled={slide===2} onClick={() => setSlide(value => value+1)}>→</button></div></div></div>}
      </div>
      <div className="demo-bottom-bar"><span>你的文字，你的节奏。</span><span>示例编辑仅在本页生效</span></div>
    </div>
    <div className="experience-under"><div className="experience-description" aria-live="polite"><span>{current.number}</span><div><h3>{current.heading}</h3><p>{current.text}</p></div></div><div className="demo-themes" aria-label="演示皮肤"><span>换一种心情</span><div>{themes.map(item => <button key={item.id} style={{'--swatch':item.color} as React.CSSProperties} aria-label={`${item.label}皮肤`} aria-pressed={theme===item.id} title={item.label} onClick={() => setTheme(item.id)}><i/></button>)}</div></div></div>
    <a className="website-text-link experience-link" href="/download">把这份专注，带回桌面 <Arrow /></a>
  </section>;
}
