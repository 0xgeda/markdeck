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
});
