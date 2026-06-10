import { describe, expect, it } from "vitest";
import { renderDeckHtml } from "./theme-renderer";
import type { ParsedSlide } from "./types";

describe("renderDeckHtml", () => {
  it("renders a complete editorial content document with editable attributes", () => {
    const slides: ParsedSlide[] = [{ id: "slide-1", type: "content", title: "Plan", body: ["One clear page."], images: [] }];
    const html = renderDeckHtml(slides, [{ slideId: "slide-1", layout: "content" }], "editorial");

    expect(html).toContain("<!doctype html>");
    expect(html).toContain('data-theme="editorial"');
    expect(html).toContain('data-layout="content"');
    expect(html).toContain('data-editable="text"');
    expect(html).toContain("font-family: Georgia");
  });

  it("falls back to slide.type when slide is absent from selections", () => {
    const slides: ParsedSlide[] = [{ id: "slide-1", type: "quote", title: "Q", body: ["> Bold claim."], images: [] }];
    const html = renderDeckHtml(slides, [], "bold");

    expect(html).toContain('data-layout="quote"');
  });

  it("escapes HTML special characters in title and body to prevent XSS", () => {
    const slides: ParsedSlide[] = [{ id: "slide-1", type: "content", title: "<script>alert(1)</script>", body: ['<img src="x" onerror="alert(1)">'], images: [] }];
    const html = renderDeckHtml(slides, [{ slideId: "slide-1", layout: "content" }], "editorial");

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain('onerror="alert(1)"');
  });
});
