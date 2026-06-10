import type { LayoutSelection, ParsedSlide, SlideType, ThemeName } from "./types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderBody(slide: ParsedSlide): string {
  return slide.body.map((line, index) => `<p data-editable="text" data-field="body-${index}">${escapeHtml(line.replace(/^>\s?/, ""))}</p>`).join("");
}

function editorialContent(slide: ParsedSlide): string {
  return `<section class="slide editorial-content" data-slide-id="${slide.id}" data-layout="content">
    <div class="kicker">Markdeck Proposal</div>
    <h1 data-editable="text" data-field="title">${escapeHtml(slide.title)}</h1>
    <div class="body">${renderBody(slide)}</div>
  </section>`;
}

function renderSlide(slide: ParsedSlide, layout: SlideType, theme: ThemeName): string {
  if (theme === "editorial" && layout === "content") return editorialContent(slide);
  const images = slide.images.map((image) => `<img data-editable="image" src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" />`).join("");
  return `<section class="slide ${theme}-${layout}" data-slide-id="${slide.id}" data-layout="${layout}">
    <h1 data-editable="text" data-field="title">${escapeHtml(slide.title)}</h1>
    <div class="body">${renderBody(slide)}</div>
    <div class="images">${images}</div>
  </section>`;
}

export function renderDeckHtml(slides: ParsedSlide[], selections: LayoutSelection[], theme: ThemeName): string {
  const selectionById = new Map(selections.map((selection) => [selection.slideId, selection.layout]));
  const renderedSlides = slides.map((slide) => renderSlide(slide, selectionById.get(slide.id) ?? slide.type, theme)).join("\n");

  return `<!doctype html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Markdeck Proposal</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; }
    body {
      font-family: Georgia, "Times New Roman", serif;
      color: #201b17;
      background:
        radial-gradient(circle at 20% 10%, rgba(151, 124, 89, 0.12), transparent 28rem),
        linear-gradient(135deg, #fbf7ef 0%, #efe5d4 100%);
    }
    main.deck {
      width: min(1120px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 48px 0;
    }
    .slide {
      min-height: 720px;
      margin: 0 0 40px;
      padding: 72px;
      background: rgba(255, 252, 246, 0.94);
      border: 1px solid rgba(70, 54, 35, 0.18);
      box-shadow: 0 24px 70px rgba(58, 41, 20, 0.15);
    }
    .editorial-content {
      display: grid;
      grid-template-columns: 0.8fr 1.2fr;
      gap: 56px;
      align-content: center;
    }
    .kicker {
      grid-column: 1 / -1;
      font-family: Arial, sans-serif;
      font-size: 12px;
      letter-spacing: 0;
      text-transform: uppercase;
      color: #8a6240;
      border-bottom: 1px solid rgba(70, 54, 35, 0.2);
      padding-bottom: 16px;
    }
    h1 {
      margin: 0;
      font-size: 64px;
      line-height: 1.02;
      font-weight: 500;
      max-width: 9ch;
    }
    .body {
      align-self: end;
      font-size: 24px;
      line-height: 1.55;
      color: #463627;
    }
    .body p { margin: 0 0 22px; }
    [data-editable="text"]:focus {
      outline: 2px solid #b9824a;
      outline-offset: 6px;
      border-radius: 2px;
    }
    img {
      max-width: 100%;
      height: auto;
      display: block;
    }
    @media (max-width: 760px) {
      main.deck { width: 100%; padding: 0; }
      .slide { min-height: 100vh; margin: 0; padding: 36px 24px; }
      .editorial-content { grid-template-columns: 1fr; gap: 28px; }
      h1 { font-size: 42px; max-width: none; }
      .body { font-size: 19px; }
    }
  </style>
</head>
<body>
  <main class="deck">
${renderedSlides}
  </main>
</body>
</html>`;
}
