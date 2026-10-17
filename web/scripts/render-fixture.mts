import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseMarkdownToSlides } from "../src/lib/markdeck/markdown-parser";
import { renderDeckHtml } from "../src/lib/markdeck/theme-renderer";
import type { LayoutSelection, SlideType } from "../src/lib/markdeck/types";

const ROOT = process.cwd();
const SAMPLE = join(ROOT, "docs/samples/new-layouts-test.md");
const OUT_DIR = "/tmp/markdeck-preview";

const TITLE_TO_LAYOUT: Record<string, SlideType> = {
  "Markdeck 节奏改造": "cover",
  "我们做错了什么": "statement",
  "过去 90 天": "kpi-tower",
  "一年账本": "kpi-ledger",
  "三种力量": "cells-3",
  "我们的四个支点": "cells-4",
  "六块定义": "cells-6",
  "OODA 闭环": "loop",
  "系统的四层": "system-rings",
  "上线路线": "vertical-timeline",
  "旧做法 vs 新做法": "duo-compare",
  "一句话": "manifesto-banner",
  "谢谢": "closing",
};

const md = readFileSync(SAMPLE, "utf8");
const slides = parseMarkdownToSlides(md);
const selections: LayoutSelection[] = slides.map((s) => ({
  slideId: s.id,
  layout: TITLE_TO_LAYOUT[s.title] ?? s.type,
}));

mkdirSync(OUT_DIR, { recursive: true });

const themes = ["editorial", "bold", "modern", "minimal"] as const;
for (const theme of themes) {
  const html = renderDeckHtml(slides, selections, theme);
  writeFileSync(join(OUT_DIR, `deck-${theme}.html`), html, "utf8");
  console.log(`wrote ${OUT_DIR}/deck-${theme}.html (${slides.length} slides)`);

  for (let i = 0; i < slides.length; i++) {
    const onlySlide = [slides[i]];
    const onlySel = [selections[i]];
    const slideHtml = renderDeckHtml(onlySlide, onlySel, theme);
    const layout = selections[i].layout;
    writeFileSync(join(OUT_DIR, `${theme}-${String(i + 1).padStart(2, "0")}-${layout}.html`), slideHtml, "utf8");
  }
}

console.log("\nLayout mapping:");
for (const sel of selections) {
  const slide = slides.find((s) => s.id === sel.slideId)!;
  console.log(`  ${slide.id.padEnd(10)} ${sel.layout.padEnd(18)} ${slide.title}`);
}
