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

function contentSlide(slide: ParsedSlide): string {
  return `<section class="slide layout-content" data-slide-id="${escapeHtml(slide.id)}" data-layout="content">
  <div class="kicker">Markdeck Proposal</div>
  <h1 data-editable="text" data-field="title">${escapeHtml(slide.title)}</h1>
  <div class="body">${renderBody(slide)}</div>
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

function renderSlide(slide: ParsedSlide, layout: SlideType): string {
  switch (layout) {
    case "cover": return coverSlide(slide);
    case "content": return contentSlide(slide);
    case "quote": return quoteSlide(slide);
    case "two-col": return twoColSlide(slide);
    case "stat": return statSlide(slide);
    case "image-full": return imageFullSlide(slide);
  }
}

const STYLES = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; }

  /* ── Theme tokens ── */
  [data-theme="editorial"] {
    --bg: linear-gradient(135deg, #fbf7ef 0%, #efe5d4 100%);
    --surface: rgba(255, 252, 246, 0.94);
    --text: #201b17;
    --text-muted: #463627;
    --accent: #8a6240;
    --accent-focus: #b9824a;
    --border: rgba(70, 54, 35, 0.18);
    --shadow: 0 24px 70px rgba(58, 41, 20, 0.15);
    --radius: 0px;
    --col-bg: rgba(138, 98, 64, 0.07);
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
    --bg: #f1f5f9;
    --surface: #ffffff;
    --text: #0f172a;
    --text-muted: #475569;
    --accent: #2563eb;
    --accent-focus: #1d4ed8;
    --border: rgba(0, 0, 0, 0.07);
    --shadow: 0 8px 32px rgba(15, 23, 42, 0.08);
    --radius: 12px;
    --col-bg: rgba(37, 99, 235, 0.05);
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
