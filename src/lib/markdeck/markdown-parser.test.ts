import { describe, expect, it } from "vitest";
import { parseMarkdownToSlides } from "./markdown-parser";

describe("parseMarkdownToSlides", () => {
  it("classifies cover, section, quote, two column, stat, and image-only slides", () => {
    const slides = parseMarkdownToSlides(`# Proposal

## Strategy
Build trust with speed.

> Make every page feel designed.

## Comparison
Left column | Right column
Discovery | Delivery

## Traction
**42%** conversion lift

![Mockup](mockup.png)`);

    expect(slides.map((slide) => slide.type)).toEqual([
      "cover",
      "content",
      "quote",
      "two-col",
      "stat",
      "image-full",
    ]);
    expect(slides[0].title).toBe("Proposal");
    expect(slides[5].images[0]).toEqual({ alt: "Mockup", src: "mockup.png" });
  });
});
