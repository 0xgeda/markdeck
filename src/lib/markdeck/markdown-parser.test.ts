import { describe, expect, it } from "vitest";
import { parseMarkdownToSlides } from "./markdown-parser";

describe("parseMarkdownToSlides", () => {
  it("classifies cover, content, quote, table, bullet, stat, and image-only slides", () => {
    const slides = parseMarkdownToSlides(`# Proposal

## Strategy
Build trust with speed.

## Quoteworthy
> Make every page feel designed.

## Comparison
| Left | Right |
| --- | --- |
| Discovery | Delivery |
| Research | Launch |

## Priorities
- Clarify the goal
- Measure outcomes
- Iterate fast

## Traction
**42%** conversion lift

## Visual
![Mockup](mockup.png)`);

    expect(slides.map((s) => s.type)).toEqual([
      "cover",
      "content",
      "quote",
      "table",
      "bullet",
      "stat",
      "image-full",
    ]);
    expect(slides[0].title).toBe("Proposal");
    expect(slides[3].table?.headers).toEqual(["Left", "Right"]);
    expect(slides[3].table?.rows).toEqual([
      ["Discovery", "Delivery"],
      ["Research", "Launch"],
    ]);
    expect(slides[4].bullets?.items).toEqual([
      "Clarify the goal",
      "Measure outcomes",
      "Iterate fast",
    ]);
    expect(slides[6].images[0]).toEqual({ alt: "Mockup", src: "mockup.png" });
  });

  it("only splits on H1/H2 — H3 and below stay inside their parent slide", () => {
    const slides = parseMarkdownToSlides(`# Title

## One
First paragraph.

### Sub heading
Still part of One.

## Two
Second paragraph.`);
    expect(slides).toHaveLength(3);
    expect(slides[1].title).toBe("One");
    expect(slides[1].body.join(" ")).toContain("Still part of One");
  });

  it("paginates long content slides with a part marker", () => {
    const bodyLines = Array.from({ length: 26 }, (_, i) => `Paragraph ${i + 1}.`).join("\n\n");
    const slides = parseMarkdownToSlides(`## Long section\n\n${bodyLines}`);
    expect(slides).toHaveLength(3);
    expect(slides[0].part).toEqual({ index: 1, total: 3 });
    expect(slides[2].part).toEqual({ index: 3, total: 3 });
    expect(slides.every((s) => s.title === "Long section")).toBe(true);
  });

  it("drops empty slides", () => {
    const slides = parseMarkdownToSlides(`# Cover\n\n## \n\n---\n\n## Real\nContent.`);
    expect(slides.map((s) => s.title)).toEqual(["Cover", "Real"]);
  });
});
