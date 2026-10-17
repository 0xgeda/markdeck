'use client';

import { useRef, useState, type PointerEvent, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Arrow } from './brand';

type Mode = 'write' | 'organize' | 'present';
type Theme = 'paper' | 'sage' | 'graphite' | 'night';

const modeIds: Mode[] = ['write', 'organize', 'present'];
const initialPositions = [{ x: 35, y: 62 }, { x: 330, y: 190 }, { x: 625, y: 62 }];
const themeIds: { id: Theme; color: string }[] = [
  { id: 'paper', color: '#f7f6f0' },
  { id: 'sage', color: '#d9e4d4' },
  { id: 'graphite', color: '#444945' },
  { id: 'night', color: '#212d3a' },
];

export function ProductDemo() {
  const t = useTranslations('demo');
  const initialSections = (t.raw('sections') as { title: string; text: string }[]).map((s) => ({ ...s }));
  const cardLabels = t.raw('cardLabels') as string[];

  const [mode, setMode] = useState<Mode>('write');
  const [theme, setTheme] = useState<Theme>('paper');
  const [sections, setSections] = useState(initialSections);
  const [section, setSection] = useState(0);
  const [slide, setSlide] = useState(0);
  const [positions, setPositions] = useState(initialPositions);
  const [note, setNote] = useState(t('note'));
  const board = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; pointer: number; x: number; y: number; startX: number; startY: number } | null>(null);

  const current = {
    number: t(`modes.${mode}.number`),
    heading: t(`modes.${mode}.heading`),
    text: t(`modes.${mode}.text`),
  };

  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % modeIds.length;
    else if (event.key === 'ArrowLeft') next = (index + modeIds.length - 1) % modeIds.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = modeIds.length - 1;
    else return;
    event.preventDefault();
    setMode(modeIds[next]);
    document.getElementById(`demo-tab-${modeIds[next]}`)?.focus();
  }
  function startDrag(event: PointerEvent<HTMLButtonElement>, id: number) {
    if (event.button !== 0) return;
    drag.current = { id, pointer: event.pointerId, x: event.clientX, y: event.clientY, startX: positions[id].x, startY: positions[id].y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const move = drag.current, bounds = board.current?.getBoundingClientRect();
    if (!move || move.pointer !== event.pointerId || !bounds?.width || !bounds.height) return;
    const x = Math.max(12, Math.min(648, move.startX + (event.clientX - move.x) * 900 / bounds.width));
    const y = Math.max(12, Math.min(270, move.startY + (event.clientY - move.y) * 360 / bounds.height));
    setPositions((value) => value.map((point, i) => (i === move.id ? { x, y } : point)));
  }
  function moveByKey(event: KeyboardEvent<HTMLButtonElement>, id: number) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const dx = event.key === 'ArrowLeft' ? -12 : event.key === 'ArrowRight' ? 12 : 0;
    const dy = event.key === 'ArrowUp' ? -12 : event.key === 'ArrowDown' ? 12 : 0;
    setPositions((value) => value.map((point, i) => (i === id ? { x: Math.max(12, Math.min(648, point.x + dx)), y: Math.max(12, Math.min(270, point.y + dy)) } : point)));
  }

  return (
    <section className="website-experience website-container" id="experience" aria-label={t('aria')}>
      <div className="demo-caption">
        <span>
          <i /> {t('label')}
        </span>
        <span>{t('sub')}</span>
      </div>
      <div className={`product-demo theme-${theme}`}>
        <div className="demo-window-bar">
          <div className="demo-traffic" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <span className="demo-filename">{t('windowFileName')}</span>
          <span className="demo-local">{t('windowLocal')}</span>
        </div>
        <div className="demo-toolbar">
          <span className="demo-wordmark">
            {t('wordmark')}
            <span> / </span>
          </span>
          <div className="demo-tabs" role="tablist" aria-label={t('tablist')}>
            {modeIds.map((id, index) => (
              <button
                key={id}
                id={`demo-tab-${id}`}
                role="tab"
                aria-selected={mode === id}
                aria-controls={`demo-panel-${id}`}
                tabIndex={mode === id ? 0 : -1}
                onClick={() => setMode(id)}
                onKeyDown={(event) => tabKey(event, index)}
              >
                {t(`modes.${id}.title`)}
              </button>
            ))}
          </div>
          <span className="demo-edit-status">{t(`editHints.${mode}`)}</span>
        </div>
        <div className="demo-stage" role="tabpanel" id={`demo-panel-${mode}`} aria-labelledby={`demo-tab-${mode}`}>
          {mode === 'write' && (
            <div className="demo-writing">
              <aside className="demo-outline" aria-label={t('paperOutline')}>
                <span>{t('paperOutline')}</span>
                <strong>{t('paperOutlineTitle')}</strong>
                {sections.map((item, i) => (
                  <button
                    key={item.title}
                    className={section === i ? 'active' : ''}
                    aria-current={section === i ? 'location' : undefined}
                    onClick={() => setSection(i)}
                  >
                    <small>0{i + 1}</small>
                    {item.title}
                  </button>
                ))}
                <div className="demo-outline-note">
                  {t('paperOutlineNote').split('\n').map((line, i, arr) => (
                    <span key={i}>
                      {line}
                      {i < arr.length - 1 && <br />}
                    </span>
                  ))}
                </div>
              </aside>
              <article className="demo-paper">
                <div className="demo-format" aria-hidden="true">
                  <span>H</span>
                  <b>B</b>
                  <em>I</em>
                  <span>≡</span>
                  <span>↗</span>
                  <span>⋯</span>
                </div>
                <p className="demo-eyebrow">{t('paperEyebrow')}</p>
                <h2>
                  {t('paperHeadingLine1')}
                  <br />
                  {t('paperHeadingLine2')}
                  <span>.</span>
                </h2>
                <h3>
                  <span>0{section + 1}</span> {sections[section].title}
                </h3>
                <textarea
                  aria-label={t('writeTextareaLabel')}
                  value={sections[section].text}
                  maxLength={600}
                  onChange={(event) => {
                    const text = event.target.value;
                    setSections((value) => value.map((item, i) => (i === section ? { ...item, text } : item)));
                  }}
                />
                <blockquote>{t('paperQuote')}</blockquote>
              </article>
              <div className="demo-paper-margin" aria-hidden="true">
                <span>{t('paperMargin')}</span>
              </div>
            </div>
          )}
          {mode === 'organize' && (
            <div className="demo-organization">
              <div className="demo-board-meta">
                <span>{t('boardMeta')}</span>
                <button onClick={() => setPositions(initialPositions)}>{t('boardReset')} ↺</button>
              </div>
              <div className="demo-board-scroll">
                <div className="demo-board" ref={board}>
                  <svg viewBox="0 0 900 360" preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                      <marker id="demo-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
                        <path d="M0 0L6 3L0 6" fill="none" stroke="var(--demo-accent)" />
                      </marker>
                    </defs>
                    {[0, 1].map((i) => {
                      const from = positions[i], to = positions[i + 1];
                      return (
                        <path
                          key={i}
                          d={`M${from.x + 240} ${from.y + 40} C${from.x + 275} ${from.y + 40}, ${to.x - 35} ${to.y + 40}, ${to.x} ${to.y + 40}`}
                          fill="none"
                          stroke="var(--demo-accent)"
                          strokeWidth="1.3"
                          markerEnd="url(#demo-arrow)"
                        />
                      );
                    })}
                  </svg>
                  {positions.map((point, i) => (
                    <button
                      key={i}
                      className="demo-flow-node"
                      style={{ left: `${point.x / 9}%`, top: `${point.y / 3.6}%` }}
                      onPointerDown={(event) => startDrag(event, i)}
                      onPointerMove={moveDrag}
                      onPointerUp={() => {
                        drag.current = null;
                      }}
                      onPointerCancel={() => {
                        drag.current = null;
                      }}
                      onLostPointerCapture={() => {
                        drag.current = null;
                      }}
                      onKeyDown={(event) => moveByKey(event, i)}
                      aria-label={t('cardDragAria', { title: sections[i].title })}
                    >
                      <span>
                        <i>{cardLabels[i]}</i>
                        <small>⋮⋮</small>
                      </span>
                      <strong>{sections[i].title}</strong>
                      <b className="node-in" />
                      <b className="node-out" />
                    </button>
                  ))}
                  <label className="demo-sticky">
                    <span>
                      {t('stickyLabel')} <small>↗</small>
                    </span>
                    <textarea
                      aria-label={t('stickyTextareaLabel')}
                      maxLength={100}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
          {mode === 'present' && (
            <div className="demo-presentation">
              <div className="demo-present-caption">
                <span>{t('presentCaption')}</span>
                <span>{t('presentSub')}</span>
              </div>
              <div className="demo-slide">
                <span className="demo-slide-number">0{slide + 1}</span>
                <div>
                  <p>{t('slideEyebrow')}</p>
                  <h2>
                    {sections[slide].title}
                    <span>.</span>
                  </h2>
                  <p className="demo-slide-copy">{sections[slide].text}</p>
                </div>
              </div>
              <div className="demo-slide-controls">
                <span>{t('slideFooter')}</span>
                <div>
                  <button aria-label={t('prevChapter')} disabled={slide === 0} onClick={() => setSlide((value) => value - 1)}>←</button>
                  <output aria-live="polite">0{slide + 1} / 03</output>
                  <button aria-label={t('nextChapter')} disabled={slide === 2} onClick={() => setSlide((value) => value + 1)}>→</button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="demo-bottom-bar">
          <span>{t('bottomLeft')}</span>
          <span>{t('bottomRight')}</span>
        </div>
      </div>
      <div className="experience-under">
        <div className="experience-description" aria-live="polite">
          <span>{current.number}</span>
          <div>
            <h3>{current.heading}</h3>
            <p>{current.text}</p>
          </div>
        </div>
        <div className="demo-themes" aria-label={t('themes.label')}>
          <span>{t('themes.label')}</span>
          <div>
            {themeIds.map((item) => (
              <button
                key={item.id}
                style={{ '--swatch': item.color } as React.CSSProperties}
                aria-label={`${t(`themes.${item.id}`)}${t('themes.ariaSuffix')}`}
                aria-pressed={theme === item.id}
                title={t(`themes.${item.id}`)}
                onClick={() => setTheme(item.id)}
              >
                <i />
              </button>
            ))}
          </div>
        </div>
      </div>
      <a className="website-text-link experience-link" href="/download">
        {t('experienceLink')} <Arrow />
      </a>
    </section>
  );
}
