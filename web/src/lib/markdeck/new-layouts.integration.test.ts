import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseMarkdownToSlides } from "./markdown-parser";
import { renderDeckHtml } from "./theme-renderer";
import type { LayoutSelection, SlideType } from "./types";

const SAMPLE_PATH = join(process.cwd(), "docs/samples/new-layouts-test.md");
const markdown = readFileSync(SAMPLE_PATH, "utf8");

const FIXTURE: Array<{ title: string; layout: SlideType; assert: (html: string) => void }> = [
  {
    title: "Markdeck 节奏改造",
    layout: "cover",
    assert: (html) => expect(html).toContain('data-layout="cover"'),
  },
  {
    title: "我们做错了什么",
    layout: "statement",
    assert: (html) => {
      expect(html).toContain('data-layout="statement"');
      expect(html).toContain("我们做错了什么");
    },
  },
  {
    title: "过去 90 天",
    layout: "kpi-tower",
    assert: (html) => {
      expect(html).toContain('data-layout="kpi-tower"');
      expect(html).toContain("110K");
      expect(html).toContain("行代码");
    },
  },
  {
    title: "一年账本",
    layout: "kpi-ledger",
    assert: (html) => {
      expect(html).toContain('data-layout="kpi-ledger"');
      expect(html).toContain("608");
      expect(html).toContain("Commits 数");
    },
  },
  {
    title: "三种力量",
    layout: "cells-3",
    assert: (html) => {
      expect(html).toContain('data-layout="cells-3"');
      expect(html).toContain("内容力");
      expect(html).toContain("表达力");
    },
  },
  {
    title: "我们的四个支点",
    layout: "cells-4",
    assert: (html) => {
      expect(html).toContain('data-layout="cells-4"');
      expect(html).toContain("Skill 文件");
      expect(html).toContain("一键导出");
    },
  },
  {
    title: "六块定义",
    layout: "cells-6",
    assert: (html) => {
      expect(html).toContain('data-layout="cells-6"');
      expect(html).toContain("封面");
      expect(html).toContain("收尾");
    },
  },
  {
    title: "OODA 闭环",
    layout: "loop",
    assert: (html) => {
      expect(html).toContain('data-layout="loop"');
      expect(html).toContain("观察");
      expect(html).toContain("行动");
      expect((html.match(/class="loop-node"/g) ?? []).length).toBe(4);
    },
  },
  {
    title: "系统的四层",
    layout: "system-rings",
    assert: (html) => {
      expect(html).toContain('data-layout="system-rings"');
      expect(html).toContain("内核");
      expect(html).toContain("界面");
      expect((html.match(/class="ring-layer"/g) ?? []).length).toBe(4);
    },
  },
  {
    title: "上线路线",
    layout: "vertical-timeline",
    assert: (html) => {
      expect(html).toContain('data-layout="vertical-timeline"');
      expect(html).toContain("2024 Q1");
      expect(html).toContain("立项");
      expect((html.match(/class="tl-row"/g) ?? []).length).toBe(4);
    },
  },
  {
    title: "旧做法 vs 新做法",
    layout: "duo-compare",
    assert: (html) => {
      expect(html).toContain('data-layout="duo-compare"');
      expect(html).toContain("旧");
      expect(html).toContain("新");
      expect(html).toContain('class="duo-vs"');
    },
  },
  {
    title: "一句话",
    layout: "manifesto-banner",
    assert: (html) => {
      expect(html).toContain('data-layout="manifesto-banner"');
    },
  },
  {
    title: "谢谢",
    layout: "closing",
    assert: (html) => {
      expect(html).toContain('data-layout="closing"');
      expect(html).toContain("留下回响");
    },
  },
];

describe("new-layouts integration: parse fixture markdown then render each layout", () => {
  const slides = parseMarkdownToSlides(markdown);
  const byTitle = new Map(slides.map((s) => [s.title, s] as const));

  it("parses the fixture into the expected slide titles", () => {
    expect(slides.map((s) => s.title)).toEqual(FIXTURE.map((f) => f.title));
  });

  for (const fix of FIXTURE) {
    it(`renders "${fix.title}" as ${fix.layout}`, () => {
      const slide = byTitle.get(fix.title);
      expect(slide, `slide titled "${fix.title}" must exist`).toBeDefined();
      const selections: LayoutSelection[] = [{ slideId: slide!.id, layout: fix.layout }];
      const html = renderDeckHtml([slide!], selections, "editorial");
      expect(html).toContain("<!doctype html>");
      fix.assert(html);
    });
  }
});
