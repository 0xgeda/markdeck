import type { LayoutSelection, ParsedSlide, SlideType, ThemeName } from "./types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
    .replaceAll("`", "&#096;");
}

function renderInline(text: string): string {
  const escaped = escapeHtml(text.replace(/^>\s?/, ""));
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+?)\*/g, "<em>$1</em>");
}

function renderBody(slide: ParsedSlide): string {
  return slide.body
    .map((line, i) => `<p data-editable="text" data-field="body-${i}">${renderInline(line)}</p>`)
    .join("");
}

function coverSlide(slide: ParsedSlide): string {
  const img = slide.images[0];
  return `<section class="slide layout-cover" data-slide-id="${escapeHtml(slide.id)}" data-layout="cover">
  <div class="cover-inner">
    <h1 data-editable="text" data-field="title">${escapeHtml(slide.title)}</h1>
    ${slide.body.length ? `<div class="body">${renderBody(slide)}</div>` : ""}
    ${img ? `<img data-editable="image" src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt)}" class="cover-img" />` : ""}
  </div>
</section>`;
}

function partBadge(slide: ParsedSlide): string {
  if (!slide.part) return "";
  return ` <span class="pagebadge">Part ${slide.part.index} / ${slide.part.total}</span>`;
}

function kicker(slide: ParsedSlide): string {
  return `<div class="kicker">Markdeck Proposal${partBadge(slide)}</div>`;
}

function contentSlide(slide: ParsedSlide): string {
  return `<section class="slide layout-content" data-slide-id="${escapeHtml(slide.id)}" data-layout="content">
  ${kicker(slide)}
  <h1 data-editable="text" data-field="title">${escapeHtml(slide.title)}</h1>
  <div class="body">${renderBody(slide)}</div>
</section>`;
}

function tableSlide(slide: ParsedSlide): string {
  const t = slide.table;
  if (!t) return contentSlide(slide);
  const head = t.headers.map((h) => `<th>${renderInline(h)}</th>`).join("");
  const rows = t.rows
    .map(
      (row, i) =>
        `<tr>${row
          .map((cell, j) => `<td data-editable="text" data-field="cell-${i}-${j}">${renderInline(cell)}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  const wide = t.headers.length > 4;
  const hint = wide ? `<p class="scroll-hint">← swipe to see all ${t.headers.length} columns →</p>` : "";
  return `<section class="slide layout-table${wide ? " is-wide" : ""}" data-slide-id="${escapeHtml(slide.id)}" data-layout="table">
  ${kicker(slide)}
  <h1 data-editable="text" data-field="title">${escapeHtml(slide.title)}</h1>
  <div class="table-scroll">
    <table class="data-table">
      <thead><tr>${head}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  ${hint}
</section>`;
}

function bulletSlide(slide: ParsedSlide): string {
  const b = slide.bullets;
  if (!b) return contentSlide(slide);
  const tag = b.ordered ? "ol" : "ul";
  const items = b.items
    .map((it, i) => `<li data-editable="text" data-field="item-${i}">${renderInline(it)}</li>`)
    .join("");
  return `<section class="slide layout-bullet" data-slide-id="${escapeHtml(slide.id)}" data-layout="bullet">
  ${kicker(slide)}
  <h1 data-editable="text" data-field="title">${escapeHtml(slide.title)}</h1>
  <${tag} class="bullet-list">${items}</${tag}>
</section>`;
}

function quoteSlide(slide: ParsedSlide): string {
  const quoteText = slide.body.map((l) => l.replace(/^>\s?/, "")).join(" ") || slide.title;
  const hasAttribution = slide.title && slide.title !== quoteText;
  return `<section class="slide layout-quote" data-slide-id="${escapeHtml(slide.id)}" data-layout="quote">
  <blockquote data-editable="text" data-field="body-0">${renderInline(quoteText)}</blockquote>
  ${hasAttribution ? `<cite data-editable="text" data-field="title">${escapeHtml(slide.title)}</cite>` : ""}
</section>`;
}

function twoColSlide(slide: ParsedSlide): string {
  const pairs = slide.body
    .filter((l) => l.includes("|"))
    .map((l) => {
      const [left, right] = l.split("|").map((s) => s.trim());
      return { left: left ?? "", right: right ?? "" };
    });
  const colLeft = pairs.map((p, i) => `<p data-editable="text" data-field="left-${i}">${renderInline(p.left)}</p>`).join("");
  const colRight = pairs.map((p, i) => `<p data-editable="text" data-field="right-${i}">${renderInline(p.right)}</p>`).join("");
  return `<section class="slide layout-two-col" data-slide-id="${escapeHtml(slide.id)}" data-layout="two-col">
  <h1 data-editable="text" data-field="title">${escapeHtml(slide.title)}</h1>
  <div class="two-col-grid">
    <div class="col">${colLeft || "<p>&nbsp;</p>"}</div>
    <div class="col">${colRight || "<p>&nbsp;</p>"}</div>
  </div>
</section>`;
}

function statSlide(slide: ParsedSlide): string {
  const [statLine, ...rest] = slide.body;
  const statText = statLine ? statLine.replace(/\*\*/g, "") : slide.title;
  const supporting = rest.map((l, i) => `<p data-editable="text" data-field="body-${i + 1}">${renderInline(l)}</p>`).join("");
  return `<section class="slide layout-stat" data-slide-id="${escapeHtml(slide.id)}" data-layout="stat">
  <div class="stat-number" data-editable="text" data-field="body-0">${escapeHtml(statText)}</div>
  <h2 data-editable="text" data-field="title">${escapeHtml(slide.title)}</h2>
  ${supporting ? `<div class="body">${supporting}</div>` : ""}
</section>`;
}

function imageFullSlide(slide: ParsedSlide): string {
  const img = slide.images[0];
  return `<section class="slide layout-image-full" data-slide-id="${escapeHtml(slide.id)}" data-layout="image-full">
  ${img ? `<img data-editable="image" src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt)}" class="full-img" />` : `<div class="img-placeholder">Image</div>`}
  <div class="image-caption">
    <h2 data-editable="text" data-field="title">${escapeHtml(slide.title)}</h2>
    ${slide.body.length ? `<div class="body">${renderBody(slide)}</div>` : ""}
  </div>
</section>`;
}

function statementSlide(slide: ParsedSlide): string {
  const line = slide.body[0] ?? slide.title;
  const showTitle = slide.body.length > 0 && slide.title && slide.title !== line;
  return `<section class="slide layout-statement" data-slide-id="${escapeHtml(slide.id)}" data-layout="statement">
  ${showTitle ? `<div class="statement-kicker" data-editable="text" data-field="title">${escapeHtml(slide.title)}</div>` : ""}
  <h1 class="statement-line" data-editable="text" data-field="body-0">${renderInline(line)}</h1>
</section>`;
}

function closingSlide(slide: ParsedSlide): string {
  return `<section class="slide layout-closing" data-slide-id="${escapeHtml(slide.id)}" data-layout="closing">
  <div class="closing-ink">
    <div class="closing-kicker">END · ${partBadge(slide) || "Closing"}</div>
    <h1 data-editable="text" data-field="title">${escapeHtml(slide.title)}</h1>
  </div>
  <div class="closing-paper">
    ${slide.body.length ? `<div class="body">${renderBody(slide)}</div>` : `<p class="closing-meta">— Markdeck —</p>`}
  </div>
</section>`;
}

function manifestoBannerSlide(slide: ParsedSlide): string {
  const banner = slide.body[0] ?? "";
  const rest = slide.body.slice(1);
  const restHtml = rest
    .map((line, i) => `<p data-editable="text" data-field="body-${i + 1}">${renderInline(line)}</p>`)
    .join("");
  return `<section class="slide layout-manifesto" data-slide-id="${escapeHtml(slide.id)}" data-layout="manifesto-banner">
  <h1 data-editable="text" data-field="title">${escapeHtml(slide.title)}</h1>
  ${banner ? `<div class="manifesto-banner" data-editable="text" data-field="body-0">${renderInline(banner)}</div>` : ""}
  ${restHtml ? `<div class="body">${restHtml}</div>` : ""}
</section>`;
}

interface KpiPair { value: string; label: string; }

function parseKpiPairs(slide: ParsedSlide): KpiPair[] {
  const items = slide.bullets?.items ?? slide.body;
  const pattern = /^\s*\*?\*?([\d][\d.,]*\s*[KMm%×x+]*)\*?\*?\s*[—\-:|]\s*(.+?)\s*$/;
  return items
    .map((it) => {
      const m = it.match(pattern);
      return m ? { value: m[1].trim(), label: m[2].trim() } : null;
    })
    .filter((p): p is KpiPair => p !== null);
}

function kpiNumeric(raw: string): number {
  const n = parseFloat(raw.replace(/[^\d.]/g, ""));
  if (Number.isNaN(n)) return 0;
  if (/M/i.test(raw)) return n * 1_000_000;
  if (/K/i.test(raw)) return n * 1_000;
  return n;
}

function kpiTowerSlide(slide: ParsedSlide): string {
  const pairs = parseKpiPairs(slide);
  if (pairs.length === 0) return statSlide(slide);
  const max = Math.max(...pairs.map((p) => kpiNumeric(p.value)), 1);
  const bars = pairs
    .map((p, i) => {
      const ratio = kpiNumeric(p.value) / max;
      const pct = Math.max(12, Math.round(Math.sqrt(ratio) * 100));
      return `<div class="kpi-bar" style="--h:${pct}%">
      <div class="kpi-fill"></div>
      <div class="kpi-meta">
        <div class="kpi-val" data-editable="text" data-field="kpi-val-${i}">${escapeHtml(p.value)}</div>
        <div class="kpi-lbl" data-editable="text" data-field="kpi-lbl-${i}">${renderInline(p.label)}</div>
      </div>
    </div>`;
    })
    .join("");
  return `<section class="slide layout-kpi-tower" data-slide-id="${escapeHtml(slide.id)}" data-layout="kpi-tower">
  ${kicker(slide)}
  <h1 data-editable="text" data-field="title">${escapeHtml(slide.title)}</h1>
  <div class="kpi-tower">${bars}</div>
</section>`;
}

function kpiLedgerSlide(slide: ParsedSlide): string {
  const pairs = parseKpiPairs(slide);
  if (pairs.length === 0) return statSlide(slide);
  const rows = pairs
    .map(
      (p, i) =>
        `<div class="ledger-row">
      <div class="ledger-val" data-editable="text" data-field="kpi-val-${i}">${escapeHtml(p.value)}</div>
      <div class="ledger-lbl" data-editable="text" data-field="kpi-lbl-${i}">${renderInline(p.label)}</div>
    </div>`,
    )
    .join("");
  return `<section class="slide layout-kpi-ledger" data-slide-id="${escapeHtml(slide.id)}" data-layout="kpi-ledger">
  ${kicker(slide)}
  <h1 data-editable="text" data-field="title">${escapeHtml(slide.title)}</h1>
  <div class="ledger">${rows}</div>
</section>`;
}

function splitCellItem(raw: string): { title: string; desc: string } {
  const m = raw.match(/^(.+?)\s*[—:|]\s+(.+)$/);
  if (m) return { title: m[1].trim(), desc: m[2].trim() };
  return { title: raw.trim(), desc: "" };
}

function cellsSlide(slide: ParsedSlide, count: 3 | 4 | 6): string {
  const items = slide.bullets?.items ?? slide.body;
  if (items.length === 0) return bulletSlide(slide);
  const cells = items
    .slice(0, count)
    .map((raw, i) => {
      const { title, desc } = splitCellItem(raw);
      const num = String(i + 1).padStart(2, "0");
      return `<div class="cell">
      <span class="cell-num">${num}</span>
      <h4 data-editable="text" data-field="cell-title-${i}">${renderInline(title)}</h4>
      ${desc ? `<p data-editable="text" data-field="cell-desc-${i}">${renderInline(desc)}</p>` : ""}
    </div>`;
    })
    .join("");
  return `<section class="slide layout-cells layout-cells-${count}" data-slide-id="${escapeHtml(slide.id)}" data-layout="cells-${count}">
  ${kicker(slide)}
  <h1 data-editable="text" data-field="title">${escapeHtml(slide.title)}</h1>
  <div class="cells">${cells}</div>
</section>`;
}

function loopSlide(slide: ParsedSlide): string {
  const items = (slide.bullets?.items ?? slide.body).slice(0, 5);
  if (items.length < 2) return contentSlide(slide);
  const n = items.length;
  const cx = 400, cy = 300, r = 170;
  const nodes = items.map((raw, i) => {
    const { title } = splitCellItem(raw);
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    const lx = cx + (r + 60) * Math.cos(angle);
    const ly = cy + (r + 60) * Math.sin(angle);
    const anchor = Math.cos(angle) > 0.2 ? "start" : Math.cos(angle) < -0.2 ? "end" : "middle";
    return { x, y, lx, ly, anchor, title, i };
  });
  const arcs = nodes
    .map((node, i) => {
      const next = nodes[(i + 1) % n];
      const dx = next.x - node.x;
      const dy = next.y - node.y;
      const angle = Math.atan2(dy, dx);
      const sx = node.x + 26 * Math.cos(angle);
      const sy = node.y + 26 * Math.sin(angle);
      const ex = next.x - 30 * Math.cos(angle);
      const ey = next.y - 30 * Math.sin(angle);
      const mx = (sx + ex) / 2 + (ey - sy) * 0.18;
      const my = (sy + ey) / 2 - (ex - sx) * 0.18;
      return `<path d="M${sx},${sy} Q${mx},${my} ${ex},${ey}" class="loop-arc" marker-end="url(#loop-arrow)" />`;
    })
    .join("");
  const dots = nodes
    .map(
      (node, i) =>
        `<g class="loop-node">
      <circle cx="${node.x}" cy="${node.y}" r="26" />
      <text x="${node.x}" y="${node.y + 5}" class="loop-num">${i + 1}</text>
      <text x="${node.lx}" y="${node.ly}" class="loop-lbl" text-anchor="${node.anchor}" data-editable="text" data-field="loop-${i}">${escapeHtml(node.title)}</text>
    </g>`,
    )
    .join("");
  return `<section class="slide layout-loop" data-slide-id="${escapeHtml(slide.id)}" data-layout="loop">
  ${kicker(slide)}
  <h1 data-editable="text" data-field="title">${escapeHtml(slide.title)}</h1>
  <div class="loop-wrap">
    <svg viewBox="0 0 800 600" class="loop-svg" aria-hidden="true">
      <defs>
        <marker id="loop-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" />
        </marker>
      </defs>
      ${arcs}
      ${dots}
    </svg>
  </div>
</section>`;
}

function systemRingsSlide(slide: ParsedSlide): string {
  const items = (slide.bullets?.items ?? slide.body).slice(0, 5);
  if (items.length < 2) return contentSlide(slide);
  const cx = 400, cy = 300;
  const outer = 240, inner = 70;
  const step = (outer - inner) / items.length;
  const layers = items
    .map((raw, i) => {
      const { title } = splitCellItem(raw);
      const r = outer - i * step;
      const labelY = cy - r + step / 2 + 6;
      return `<g class="ring-layer">
      <circle cx="${cx}" cy="${cy}" r="${r}" />
      <text x="${cx}" y="${labelY}" class="ring-lbl" text-anchor="middle" data-editable="text" data-field="ring-${i}">${escapeHtml(title)}</text>
    </g>`;
    })
    .join("");
  return `<section class="slide layout-rings" data-slide-id="${escapeHtml(slide.id)}" data-layout="system-rings">
  ${kicker(slide)}
  <h1 data-editable="text" data-field="title">${escapeHtml(slide.title)}</h1>
  <div class="rings-wrap">
    <svg viewBox="0 0 800 600" class="rings-svg" aria-hidden="true">
      ${layers}
    </svg>
  </div>
</section>`;
}

interface TimelinePair { marker: string; event: string; }

function parseTimelinePairs(slide: ParsedSlide): TimelinePair[] {
  const items = slide.bullets?.items ?? slide.body;
  const pattern = /^\s*\*?\*?(.{1,18}?)\*?\*?\s*[—\-:|]\s*(.+?)\s*$/;
  return items
    .map((it) => {
      const m = it.match(pattern);
      return m ? { marker: m[1].trim(), event: m[2].trim() } : null;
    })
    .filter((p): p is TimelinePair => p !== null);
}

function verticalTimelineSlide(slide: ParsedSlide): string {
  const pairs = parseTimelinePairs(slide);
  if (pairs.length === 0) return bulletSlide(slide);
  const rows = pairs
    .map(
      (p, i) =>
        `<div class="tl-row">
      <div class="tl-marker"><span class="tl-dot"></span><span class="tl-date" data-editable="text" data-field="tl-date-${i}">${escapeHtml(p.marker)}</span></div>
      <div class="tl-event" data-editable="text" data-field="tl-event-${i}">${renderInline(p.event)}</div>
    </div>`,
    )
    .join("");
  return `<section class="slide layout-timeline" data-slide-id="${escapeHtml(slide.id)}" data-layout="vertical-timeline">
  ${kicker(slide)}
  <h1 data-editable="text" data-field="title">${escapeHtml(slide.title)}</h1>
  <div class="timeline">${rows}</div>
</section>`;
}

function imageHeroSlide(slide: ParsedSlide): string {
  const image = slide.images[0];
  if (!image) return contentSlide(slide);
  const lines = slide.body
    .map((line, i) => `<p data-editable="text" data-field="body-${i}">${renderInline(line)}</p>`)
    .join("");
  return `<section class="slide layout-image-hero" data-slide-id="${escapeHtml(slide.id)}" data-layout="image-hero">
  <div class="hero-text">
    ${kicker(slide)}
    <h1 data-editable="text" data-field="title">${escapeHtml(slide.title)}</h1>
    ${lines ? `<div class="body">${lines}</div>` : ""}
  </div>
  <div class="hero-media">
    <img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" data-editable="image" data-field="image-0" />
  </div>
</section>`;
}

interface DuoPair { label: string; description: string; }

function parseDuoPairs(slide: ParsedSlide): DuoPair[] {
  const items = slide.bullets?.items ?? slide.body;
  const pattern = /^\s*\*?\*?(.{1,24}?)\*?\*?\s*[—\-:|]\s*(.+?)\s*$/;
  return items
    .map((it) => {
      const m = it.match(pattern);
      return m ? { label: m[1].trim(), description: m[2].trim() } : null;
    })
    .filter((p): p is DuoPair => p !== null)
    .slice(0, 2);
}

function duoCompareSlide(slide: ParsedSlide): string {
  const pairs = parseDuoPairs(slide);
  if (pairs.length < 2) return twoColSlide(slide);
  const cols = pairs
    .map(
      (p, i) =>
        `<div class="duo-col duo-col-${i === 0 ? "a" : "b"}">
      <div class="duo-label" data-editable="text" data-field="duo-label-${i}">${escapeHtml(p.label)}</div>
      <div class="duo-desc" data-editable="text" data-field="duo-desc-${i}">${renderInline(p.description)}</div>
    </div>`,
    )
    .join('<div class="duo-vs" aria-hidden="true">VS</div>');
  return `<section class="slide layout-duo" data-slide-id="${escapeHtml(slide.id)}" data-layout="duo-compare">
  ${kicker(slide)}
  <h1 data-editable="text" data-field="title">${escapeHtml(slide.title)}</h1>
  <div class="duo-grid">${cols}</div>
</section>`;
}

function renderSlide(slide: ParsedSlide, layout: SlideType): string {
  switch (layout) {
    case "cover": return coverSlide(slide);
    case "content": return contentSlide(slide);
    case "quote": return quoteSlide(slide);
    case "two-col": return twoColSlide(slide);
    case "stat": return statSlide(slide);
    case "image-full": return imageFullSlide(slide);
    case "table": return tableSlide(slide);
    case "bullet": return bulletSlide(slide);
    case "statement": return statementSlide(slide);
    case "closing": return closingSlide(slide);
    case "manifesto-banner": return manifestoBannerSlide(slide);
    case "kpi-tower": return kpiTowerSlide(slide);
    case "kpi-ledger": return kpiLedgerSlide(slide);
    case "cells-3": return cellsSlide(slide, 3);
    case "cells-4": return cellsSlide(slide, 4);
    case "cells-6": return cellsSlide(slide, 6);
    case "loop": return loopSlide(slide);
    case "system-rings": return systemRingsSlide(slide);
    case "vertical-timeline": return verticalTimelineSlide(slide);
    case "image-hero": return imageHeroSlide(slide);
    case "duo-compare": return duoCompareSlide(slide);
  }
}

const STYLES = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; }

  /* ── Theme tokens ── */
  [data-theme="editorial"] {
    --bg: linear-gradient(135deg, #f0e4c7 0%, #d9c39a 100%);
    --surface: rgba(252, 246, 232, 0.96);
    --text: #1a1410;
    --text-muted: #5a4a32;
    --accent: #7a3e1f;
    --accent-focus: #a05a30;
    --border: rgba(70, 54, 35, 0.24);
    --shadow: 0 32px 80px rgba(58, 41, 20, 0.2);
    --radius: 0px;
    --col-bg: rgba(122, 62, 31, 0.08);
  }
  [data-theme="bold"] {
    --bg: #0d0d0d;
    --surface: #161616;
    --text: #f5f5f5;
    --text-muted: #a0a0a0;
    --accent: #ff4500;
    --accent-focus: #ff6a35;
    --border: rgba(255, 255, 255, 0.07);
    --shadow: 0 24px 80px rgba(0, 0, 0, 0.7);
    --radius: 4px;
    --col-bg: rgba(255, 69, 0, 0.08);
  }
  [data-theme="modern"] {
    --bg: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
    --surface: #ffffff;
    --text: #0f172a;
    --text-muted: #475569;
    --accent: #4f46e5;
    --accent-focus: #4338ca;
    --border: rgba(79, 70, 229, 0.14);
    --shadow: 0 20px 50px rgba(79, 70, 229, 0.14);
    --radius: 16px;
    --col-bg: rgba(79, 70, 229, 0.08);
  }
  [data-theme="minimal"] {
    --bg: #ffffff;
    --surface: #ffffff;
    --text: #111111;
    --text-muted: #555555;
    --accent: #111111;
    --accent-focus: #444444;
    --border: #e4e4e7;
    --shadow: none;
    --radius: 0px;
    --col-bg: transparent;
  }

  /* ── Base ── */
  body {
    color: var(--text);
    background: var(--bg);
    min-height: 100vh;
  }
  [data-theme="editorial"] body { font-family: Georgia, "Times New Roman", serif; }
  [data-theme="bold"] body { font-family: "Arial Black", Arial, system-ui, sans-serif; }
  [data-theme="modern"] body { font-family: system-ui, -apple-system, sans-serif; }
  [data-theme="minimal"] body { font-family: Georgia, "Times New Roman", serif; }

  /* ── Theme overrides ── */
  [data-theme="editorial"] .layout-cover h1,
  [data-theme="editorial"] .layout-content h1,
  [data-theme="editorial"] .layout-two-col h1 {
    font-style: italic;
    letter-spacing: -0.02em;
  }
  [data-theme="editorial"] .layout-content .kicker {
    font-style: italic;
    letter-spacing: 0.18em;
  }
  [data-theme="minimal"] .slide {
    border: none;
    box-shadow: none;
    padding: 96px 80px;
  }
  [data-theme="minimal"] .layout-content .body,
  [data-theme="minimal"] .layout-cover .body { max-width: 56ch; }

  main.deck {
    width: min(1120px, calc(100vw - 32px));
    margin: 0 auto;
    padding: 48px 0;
  }
  .slide {
    min-height: 640px;
    margin: 0 0 40px;
    padding: 72px;
    background: var(--surface);
    border: 1px solid var(--border);
    box-shadow: var(--shadow);
    border-radius: var(--radius);
    color: var(--text);
  }
  [data-editable="text"]:focus {
    outline: 2px solid var(--accent-focus);
    outline-offset: 6px;
    border-radius: 2px;
  }
  img { max-width: 100%; height: auto; display: block; }

  /* ── Layout: cover ── */
  .layout-cover {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 720px;
    text-align: center;
  }
  .cover-inner { max-width: 720px; }
  .layout-cover h1 {
    font-size: 80px;
    line-height: 1;
    font-weight: 700;
    margin: 0 0 24px;
    color: var(--text);
  }
  [data-theme="bold"] .layout-cover h1 { font-size: 96px; font-weight: 900; }
  .layout-cover .body { font-size: 22px; line-height: 1.6; color: var(--text-muted); }
  .layout-cover .body p { margin: 0 0 16px; }
  .cover-img { max-height: 280px; margin: 32px auto 0; object-fit: cover; border-radius: var(--radius); }

  /* ── Layout: content ── */
  .layout-content {
    display: grid;
    grid-template-columns: 0.8fr 1.2fr;
    gap: 56px;
    align-content: center;
  }
  .layout-content .kicker {
    grid-column: 1 / -1;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent);
    border-bottom: 1px solid var(--border);
    padding-bottom: 16px;
  }
  [data-theme="minimal"] .layout-content .kicker { display: none; }
  .layout-content h1 {
    margin: 0;
    font-size: 56px;
    line-height: 1.05;
    font-weight: 600;
    max-width: 9ch;
    color: var(--text);
  }
  [data-theme="bold"] .layout-content h1 { font-size: 64px; font-weight: 900; }
  .layout-content .body {
    align-self: end;
    font-size: 22px;
    line-height: 1.6;
    color: var(--text-muted);
  }
  .layout-content .body p { margin: 0 0 20px; }

  /* ── Layout: quote ── */
  .layout-quote {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    min-height: 640px;
  }
  .layout-quote blockquote {
    font-size: 48px;
    line-height: 1.2;
    font-style: italic;
    font-weight: 400;
    color: var(--text);
    margin: 0 0 32px;
    max-width: 760px;
    quotes: "\u201C" "\u201D";
  }
  .layout-quote blockquote::before { content: open-quote; }
  .layout-quote blockquote::after { content: close-quote; }
  [data-theme="bold"] .layout-quote blockquote { font-style: normal; font-weight: 900; font-size: 52px; }
  .layout-quote cite {
    font-size: 15px;
    color: var(--accent);
    font-style: normal;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  /* ── Layout: two-col ── */
  .layout-two-col h1 {
    font-size: 44px;
    line-height: 1.1;
    font-weight: 600;
    margin: 0 0 40px;
    color: var(--text);
  }
  [data-theme="bold"] .layout-two-col h1 { font-weight: 900; }
  .two-col-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
  }
  .col {
    padding: 32px;
    background: var(--col-bg);
    border-radius: var(--radius);
    border: 1px solid var(--border);
  }
  [data-theme="minimal"] .col { background: transparent; }
  .col p {
    font-size: 18px;
    line-height: 1.6;
    color: var(--text-muted);
    margin: 0 0 14px;
  }
  .col p:first-child {
    font-size: 20px;
    font-weight: 600;
    color: var(--text);
    border-bottom: 2px solid var(--accent);
    padding-bottom: 12px;
    margin-bottom: 20px;
  }

  /* ── Layout: stat ── */
  .layout-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    min-height: 640px;
  }
  .stat-number {
    font-size: 120px;
    font-weight: 700;
    line-height: 1;
    color: var(--accent);
    margin: 0 0 16px;
  }
  [data-theme="bold"] .stat-number { font-size: 140px; font-weight: 900; }
  [data-theme="minimal"] .stat-number { color: var(--text); }
  .layout-stat h2 {
    font-size: 28px;
    font-weight: 400;
    color: var(--text);
    margin: 0 0 20px;
  }
  .layout-stat .body { font-size: 20px; color: var(--text-muted); max-width: 560px; }
  .layout-stat .body p { margin: 0 0 12px; }

  /* ── Layout: image-full ── */
  .layout-image-full {
    padding: 0;
    overflow: hidden;
    display: grid;
    grid-template-rows: 1fr auto;
    min-height: 640px;
  }
  .full-img { width: 100%; height: 460px; object-fit: cover; display: block; }
  .img-placeholder {
    height: 460px;
    background: var(--col-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: 24px;
  }
  .image-caption { padding: 32px 48px; background: var(--surface); }
  .image-caption h2 {
    font-size: 32px;
    font-weight: 600;
    margin: 0 0 12px;
    color: var(--text);
  }
  .image-caption .body { font-size: 18px; color: var(--text-muted); }
  .image-caption .body p { margin: 0 0 10px; }

  /* ── Pagination badge (kicker) ── */
  .pagebadge {
    display: inline-block;
    background: var(--col-bg);
    color: var(--accent);
    padding: 2px 10px;
    border-radius: 999px;
    margin-left: 8px;
    font-style: normal;
    font-size: 10px;
    letter-spacing: 0.1em;
  }

  /* ── Layout: table ── */
  .layout-table {
    display: grid;
    grid-template-rows: auto auto 1fr auto;
    gap: 24px;
    align-content: start;
  }
  .layout-table .kicker {
    grid-column: 1 / -1;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent);
    border-bottom: 1px solid var(--border);
    padding-bottom: 16px;
  }
  [data-theme="minimal"] .layout-table .kicker { border-bottom-color: var(--border); }
  .layout-table h1 {
    margin: 0;
    font-size: 36px;
    font-weight: 600;
    line-height: 1.15;
    color: var(--text);
  }
  [data-theme="bold"] .layout-table h1 { font-weight: 900; }
  .layout-table .table-scroll {
    overflow-x: auto;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    color: var(--text);
    font-size: 13px;
    font-family: inherit;
  }
  [data-theme="editorial"] .data-table { font-family: Georgia, serif; }
  .data-table th {
    text-align: left;
    font-weight: 600;
    background: var(--col-bg);
    color: var(--accent);
    padding: 12px 14px;
    border-bottom: 2px solid var(--accent);
    white-space: nowrap;
    font-style: italic;
  }
  [data-theme="bold"] .data-table th { font-style: normal; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; }
  .data-table td {
    padding: 12px 14px;
    border-bottom: 1px solid var(--border);
    line-height: 1.5;
    vertical-align: top;
    color: var(--text);
  }
  .data-table tr:last-child td { border-bottom: none; }
  .layout-table.is-wide .data-table { min-width: 960px; }
  .layout-table .scroll-hint {
    font-size: 12px;
    color: var(--accent);
    text-align: right;
    margin: 0;
    font-style: italic;
  }

  /* ── Layout: bullet ── */
  .layout-bullet {
    display: grid;
    grid-template-rows: auto auto 1fr;
    gap: 24px;
    align-content: start;
  }
  .layout-bullet .kicker {
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent);
    border-bottom: 1px solid var(--border);
    padding-bottom: 16px;
  }
  .layout-bullet h1 {
    margin: 0;
    font-size: 44px;
    font-weight: 600;
    line-height: 1.1;
    color: var(--text);
  }
  [data-theme="bold"] .layout-bullet h1 { font-weight: 900; }
  .layout-bullet .bullet-list {
    font-size: 22px;
    line-height: 1.55;
    color: var(--text-muted);
    margin: 0;
    padding-left: 1.4em;
  }
  .layout-bullet .bullet-list li { margin: 0 0 16px; }
  .layout-bullet .bullet-list li::marker { color: var(--accent); font-weight: 700; }

  /* ── Layout: statement ── */
  .layout-statement {
    display: flex; flex-direction: column; justify-content: center;
    min-height: 720px; padding: 96px 80px;
  }
  .statement-kicker {
    font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase;
    color: var(--accent); margin-bottom: 48px;
    border-top: 1px solid var(--border); padding-top: 24px;
  }
  .statement-line {
    margin: 0; font-size: 96px; line-height: 0.94;
    font-weight: 200; letter-spacing: -0.04em; color: var(--text);
    max-width: 18ch;
  }
  [data-theme="editorial"] .statement-line { font-style: italic; font-weight: 400; }
  [data-theme="bold"] .statement-line { font-weight: 900; letter-spacing: -0.02em; }

  /* ── Layout: closing ── */
  .layout-closing {
    padding: 0; overflow: hidden;
    display: grid; grid-template-columns: 1.1fr 0.9fr;
    min-height: 640px;
  }
  .closing-ink {
    background: var(--accent); color: var(--surface);
    padding: 80px 64px; display: flex; flex-direction: column; justify-content: space-between;
  }
  [data-theme="minimal"] .closing-ink { background: var(--text); }
  .closing-kicker {
    font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase;
    opacity: 0.78;
  }
  .closing-ink h1 {
    font-size: 72px; line-height: 1; font-weight: 200;
    letter-spacing: -0.03em; margin: 0;
  }
  [data-theme="bold"] .closing-ink h1 { font-weight: 900; }
  .closing-paper {
    background: var(--surface); padding: 80px 64px;
    display: flex; flex-direction: column; justify-content: center;
  }
  .closing-paper .body p { font-size: 22px; line-height: 1.6; color: var(--text); margin: 0 0 16px; }
  .closing-meta { font-size: 13px; letter-spacing: 0.2em; color: var(--text-muted); text-transform: uppercase; }

  /* ── Layout: manifesto-banner ── */
  .layout-manifesto {
    display: grid; grid-template-rows: auto auto 1fr; gap: 40px;
    padding: 72px;
  }
  .layout-manifesto h1 {
    margin: 0; font-size: 52px; line-height: 1.05;
    font-weight: 600; color: var(--text); max-width: 14ch;
  }
  [data-theme="bold"] .layout-manifesto h1 { font-weight: 900; }
  .manifesto-banner {
    background: var(--accent); color: var(--surface);
    padding: 28px 40px; font-size: 28px; line-height: 1.3;
    font-weight: 500; letter-spacing: -0.01em;
    margin: 0 -72px;
  }
  [data-theme="minimal"] .manifesto-banner { background: var(--text); }
  .layout-manifesto .body p { font-size: 18px; line-height: 1.6; color: var(--text-muted); margin: 0 0 12px; max-width: 56ch; }

  /* ── Layout: kpi-tower ── */
  .layout-kpi-tower {
    display: grid; grid-template-rows: auto auto 1fr; gap: 32px;
  }
  .layout-kpi-tower .kicker {
    font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 16px;
  }
  .layout-kpi-tower h1 {
    margin: 0; font-size: 44px; font-weight: 600; line-height: 1.1; color: var(--text);
  }
  [data-theme="bold"] .layout-kpi-tower h1 { font-weight: 900; }
  .kpi-tower {
    display: grid; grid-auto-columns: 1fr; grid-auto-flow: column;
    gap: 24px; align-items: end; min-height: 340px;
  }
  .kpi-bar {
    display: grid; grid-template-rows: 1fr auto;
    height: var(--h); min-height: 80px;
  }
  .kpi-fill {
    background: var(--accent); border-top: 3px solid var(--accent-focus);
    min-height: 24px;
  }
  [data-theme="minimal"] .kpi-fill { background: var(--text); border-top-color: var(--text); }
  .kpi-meta {
    padding-top: 12px; border-top: 1px solid var(--border);
  }
  .kpi-val {
    font-size: 36px; font-weight: 700; line-height: 1; color: var(--text);
    font-feature-settings: "tnum";
  }
  [data-theme="bold"] .kpi-val { font-weight: 900; }
  .kpi-lbl {
    margin-top: 8px; font-size: 13px; color: var(--text-muted); line-height: 1.4;
  }

  /* ── Layout: kpi-ledger ── */
  .layout-kpi-ledger {
    display: grid; grid-template-rows: auto auto 1fr; gap: 28px;
  }
  .layout-kpi-ledger .kicker {
    font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 16px;
  }
  .layout-kpi-ledger h1 {
    margin: 0; font-size: 44px; font-weight: 600; line-height: 1.1; color: var(--text);
  }
  [data-theme="bold"] .layout-kpi-ledger h1 { font-weight: 900; }
  .ledger { display: flex; flex-direction: column; }
  .ledger-row {
    display: grid; grid-template-columns: minmax(160px, 22%) 1fr;
    gap: 32px; align-items: baseline;
    padding: 18px 0; border-bottom: 1px solid var(--border);
  }
  .ledger-row:first-child { border-top: 1px solid var(--border); }
  .ledger-val {
    font-size: 40px; font-weight: 700; line-height: 1; color: var(--accent);
    font-feature-settings: "tnum"; letter-spacing: -0.02em;
  }
  [data-theme="minimal"] .ledger-val { color: var(--text); }
  [data-theme="bold"] .ledger-val { font-weight: 900; }
  .ledger-lbl { font-size: 18px; line-height: 1.5; color: var(--text); }

  /* ── Layout: cells ── */
  .layout-cells {
    display: grid; grid-template-rows: auto auto 1fr; gap: 32px;
  }
  .layout-cells .kicker {
    font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 16px;
  }
  .layout-cells h1 {
    margin: 0; font-size: 44px; font-weight: 600; line-height: 1.1; color: var(--text);
  }
  [data-theme="bold"] .layout-cells h1 { font-weight: 900; }
  .cells { display: grid; gap: 24px; }
  .layout-cells-3 .cells { grid-template-columns: repeat(3, 1fr); }
  .layout-cells-4 .cells { grid-template-columns: repeat(4, 1fr); }
  .layout-cells-6 .cells { grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr); }
  .cell {
    padding: 24px; background: var(--col-bg);
    border-top: 2px solid var(--accent);
    display: flex; flex-direction: column; gap: 12px;
  }
  [data-theme="minimal"] .cell { background: transparent; border-top-color: var(--text); }
  .cell-num {
    font-size: 11px; letter-spacing: 0.18em; color: var(--accent);
    font-weight: 700; font-feature-settings: "tnum";
  }
  .cell h4 {
    margin: 0; font-size: 20px; font-weight: 600;
    line-height: 1.25; color: var(--text);
  }
  [data-theme="bold"] .cell h4 { font-weight: 900; }
  .cell p {
    margin: 0; font-size: 14px; line-height: 1.5; color: var(--text-muted);
  }

  /* ── Layout: loop ── */
  .layout-loop, .layout-rings {
    display: grid; grid-template-rows: auto auto 1fr; gap: 24px;
  }
  .layout-loop .kicker, .layout-rings .kicker {
    font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 16px;
  }
  .layout-loop h1, .layout-rings h1 {
    margin: 0; font-size: 40px; font-weight: 600; line-height: 1.1; color: var(--text);
  }
  [data-theme="bold"] .layout-loop h1, [data-theme="bold"] .layout-rings h1 { font-weight: 900; }
  .loop-wrap, .rings-wrap {
    display: flex; align-items: center; justify-content: center; min-height: 0;
  }
  .loop-svg, .rings-svg { width: 100%; max-width: 760px; height: auto; max-height: 480px; }
  .loop-arc {
    fill: none; stroke: var(--accent); stroke-width: 2;
    stroke-dasharray: 6 4; opacity: 0.85;
  }
  #loop-arrow path { fill: var(--accent); }
  .loop-node circle {
    fill: var(--accent); stroke: var(--surface); stroke-width: 3;
  }
  [data-theme="minimal"] .loop-node circle { fill: var(--text); }
  .loop-num {
    fill: var(--surface); font-size: 18px; font-weight: 700; text-anchor: middle;
    font-family: inherit;
  }
  .loop-lbl {
    fill: var(--text); font-size: 14px; font-weight: 500; font-family: inherit;
  }

  /* ── Layout: system-rings ── */
  .ring-layer circle {
    fill: none; stroke: var(--accent); stroke-width: 1;
  }
  .ring-layer:first-child circle { stroke-width: 2; }
  [data-theme="minimal"] .ring-layer circle { stroke: var(--text); }
  .ring-lbl {
    fill: var(--text); font-size: 16px; font-weight: 600;
    letter-spacing: 0.04em; font-family: inherit;
    paint-order: stroke fill; stroke: var(--surface); stroke-width: 4;
    stroke-linejoin: round;
  }

  /* ── Layout: vertical-timeline ── */
  .layout-timeline {
    display: grid; grid-template-rows: auto auto 1fr; gap: 28px;
  }
  .layout-timeline .kicker {
    font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 16px;
  }
  .layout-timeline h1 {
    margin: 0; font-size: 40px; font-weight: 600; line-height: 1.1; color: var(--text);
  }
  [data-theme="bold"] .layout-timeline h1 { font-weight: 900; }
  .timeline {
    display: flex; flex-direction: column;
    padding-left: 12px;
  }
  .tl-row {
    display: grid; grid-template-columns: minmax(140px, 18%) 1fr;
    gap: 32px; align-items: baseline;
    padding: 18px 0 18px 24px; position: relative;
    border-left: 2px solid var(--border);
  }
  .tl-row:first-child { padding-top: 0; }
  .tl-row:last-child { padding-bottom: 0; }
  .tl-marker {
    display: flex; align-items: center; gap: 12px;
    position: relative; margin-left: -25px;
  }
  .tl-dot {
    display: inline-block; width: 12px; height: 12px;
    border-radius: 50%; background: var(--accent);
    box-shadow: 0 0 0 4px var(--surface);
    flex-shrink: 0;
  }
  [data-theme="minimal"] .tl-dot { background: var(--text); }
  .tl-date {
    font-size: 18px; font-weight: 700; color: var(--accent);
    font-feature-settings: "tnum"; letter-spacing: -0.01em;
  }
  [data-theme="minimal"] .tl-date { color: var(--text); }
  [data-theme="bold"] .tl-date { font-weight: 900; }
  .tl-event { font-size: 18px; line-height: 1.5; color: var(--text); }

  /* ── Layout: image-hero ── */
  .layout-image-hero {
    display: grid; grid-template-columns: 1fr 1fr; gap: 56px;
    align-items: center;
  }
  .hero-text { display: flex; flex-direction: column; gap: 20px; }
  .layout-image-hero .kicker {
    font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--accent);
  }
  .layout-image-hero h1 {
    margin: 0; font-size: 56px; font-weight: 600; line-height: 1.05; color: var(--text);
    letter-spacing: -0.01em;
  }
  [data-theme="bold"] .layout-image-hero h1 { font-weight: 900; }
  .layout-image-hero .body p {
    margin: 0 0 12px; font-size: 18px; line-height: 1.6; color: var(--text-muted);
    max-width: 36ch;
  }
  .hero-media img {
    width: 100%; height: 100%; max-height: 540px; object-fit: cover;
    border-radius: var(--radius);
  }

  /* ── Layout: duo-compare ── */
  .layout-duo {
    display: grid; grid-template-rows: auto auto 1fr; gap: 32px;
  }
  .layout-duo .kicker {
    font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 16px;
  }
  .layout-duo h1 {
    margin: 0; font-size: 44px; font-weight: 600; line-height: 1.1; color: var(--text);
  }
  [data-theme="bold"] .layout-duo h1 { font-weight: 900; }
  .duo-grid {
    display: grid; grid-template-columns: 1fr auto 1fr;
    align-items: stretch; gap: 0;
  }
  .duo-col {
    display: flex; flex-direction: column; gap: 18px;
    padding: 32px;
  }
  .duo-col-a { background: var(--col-bg); border-top: 3px solid var(--border); }
  .duo-col-b { background: var(--surface); border-top: 3px solid var(--accent); }
  [data-theme="minimal"] .duo-col-a { background: transparent; }
  [data-theme="minimal"] .duo-col-b { background: transparent; border-top-color: var(--text); }
  .duo-label {
    font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase;
    font-weight: 700; color: var(--accent);
  }
  .duo-col-a .duo-label { color: var(--text-muted); }
  [data-theme="minimal"] .duo-col-b .duo-label { color: var(--text); }
  .duo-desc { font-size: 22px; line-height: 1.4; color: var(--text); font-weight: 500; }
  .duo-vs {
    display: flex; align-items: center; justify-content: center;
    padding: 0 24px; font-size: 14px; font-weight: 700;
    letter-spacing: 0.2em; color: var(--text-muted);
  }

  /* ── Responsive ── */
  @media (max-width: 760px) {
    main.deck { width: 100%; padding: 0; }
    .slide { min-height: 100svh; margin: 0; padding: 36px 24px; }
    .layout-content { grid-template-columns: 1fr; gap: 28px; }
    .layout-content h1 { font-size: 40px; max-width: none; }
    .layout-content .body { font-size: 18px; }
    .layout-cover h1 { font-size: 52px; }
    .two-col-grid { grid-template-columns: 1fr; }
    .stat-number { font-size: 80px; }
    .layout-quote blockquote { font-size: 32px; }
    .full-img { height: 280px; }
    .image-caption { padding: 24px; }
    .layout-table h1 { font-size: 28px; }
    .layout-bullet h1 { font-size: 32px; }
    .layout-bullet .bullet-list { font-size: 18px; }
    .data-table { font-size: 12px; }
    .data-table th, .data-table td { padding: 8px 10px; }
    .layout-statement { padding: 48px 24px; min-height: 100svh; }
    .statement-line { font-size: 44px; }
    .layout-closing { grid-template-columns: 1fr; }
    .closing-ink, .closing-paper { padding: 40px 24px; }
    .closing-ink h1 { font-size: 40px; }
    .layout-manifesto h1 { font-size: 32px; }
    .manifesto-banner { font-size: 18px; padding: 20px 24px; margin: 0 -24px; }
    .kpi-tower { grid-auto-flow: row; grid-auto-columns: auto; min-height: auto; }
    .kpi-bar { height: auto; }
    .kpi-fill { height: 12px; }
    .kpi-val { font-size: 28px; }
    .ledger-row { grid-template-columns: 1fr; gap: 6px; }
    .ledger-val { font-size: 28px; }
    .layout-kpi-tower h1, .layout-kpi-ledger h1 { font-size: 30px; }
    .layout-cells-3 .cells, .layout-cells-4 .cells, .layout-cells-6 .cells {
      grid-template-columns: 1fr; grid-template-rows: auto;
    }
    .layout-cells h1 { font-size: 30px; }
    .cell h4 { font-size: 17px; }
  }
`;

export function renderDeckHtml(slides: ParsedSlide[], selections: LayoutSelection[], theme: ThemeName): string {
  const selectionById = new Map(selections.map((s) => [s.slideId, s.layout]));
  const renderedSlides = slides
    .map((slide) => renderSlide(slide, selectionById.get(slide.id) ?? slide.type))
    .join("\n");

  return `<!doctype html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Markdeck Proposal</title>
  <style>${STYLES}</style>
</head>
<body>
  <main class="deck">
${renderedSlides}
  </main>
</body>
</html>`;
}
