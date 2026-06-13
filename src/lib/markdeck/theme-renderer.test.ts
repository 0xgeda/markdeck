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

  it("renders a loop layout with one node per bullet and a closing arc", () => {
    const slides: ParsedSlide[] = [{
      id: "slide-1",
      type: "bullet",
      title: "Feedback Cycle",
      body: [],
      images: [],
      bullets: { ordered: false, items: ["Observe", "Orient", "Decide", "Act"] },
    }];
    const html = renderDeckHtml(slides, [{ slideId: "slide-1", layout: "loop" }], "editorial");

    expect(html).toContain('data-layout="loop"');
    expect(html).toContain('class="slide layout-loop"');
    expect(html).toContain("Observe");
    expect(html).toContain("Act");
    expect(html).toContain('data-field="loop-0"');
    expect(html).toContain('data-field="loop-3"');
    expect(html).not.toContain('data-field="loop-4"');
    expect((html.match(/class="loop-node"/g) ?? []).length).toBe(4);
    expect((html.match(/class="loop-arc"/g) ?? []).length).toBe(4);
    expect(html).toContain('marker-end="url(#loop-arrow)"');
  });

  it("renders a system-rings layout with one concentric ring per bullet", () => {
    const slides: ParsedSlide[] = [{
      id: "slide-1",
      type: "bullet",
      title: "Layered Architecture",
      body: [],
      images: [],
      bullets: { ordered: false, items: ["Core", "Domain", "Application", "Interface"] },
    }];
    const html = renderDeckHtml(slides, [{ slideId: "slide-1", layout: "system-rings" }], "editorial");

    expect(html).toContain('data-layout="system-rings"');
    expect(html).toContain('class="slide layout-rings"');
    expect((html.match(/class="ring-layer"/g) ?? []).length).toBe(4);
    expect(html).toContain('data-field="ring-0"');
    expect(html).toContain('data-field="ring-3"');
    expect(html).toContain("Core");
    expect(html).toContain("Interface");
  });

  it("caps loop and system-rings at five items", () => {
    const items = ["A", "B", "C", "D", "E", "F", "G"];
    const slides: ParsedSlide[] = [{
      id: "slide-1",
      type: "bullet",
      title: "Too Many",
      body: [],
      images: [],
      bullets: { ordered: false, items },
    }];

    const loopHtml = renderDeckHtml(slides, [{ slideId: "slide-1", layout: "loop" }], "editorial");
    expect((loopHtml.match(/class="loop-node"/g) ?? []).length).toBe(5);
    expect(loopHtml).not.toContain('data-field="loop-5"');
    expect(loopHtml).not.toContain('data-field="loop-6"');

    const ringsHtml = renderDeckHtml(slides, [{ slideId: "slide-1", layout: "system-rings" }], "editorial");
    expect((ringsHtml.match(/class="ring-layer"/g) ?? []).length).toBe(5);
    expect(ringsHtml).not.toContain('data-field="ring-5"');
    expect(ringsHtml).not.toContain('data-field="ring-6"');
  });

  it("falls back to content layout when loop or rings have fewer than two items", () => {
    const slides: ParsedSlide[] = [{
      id: "slide-1",
      type: "bullet",
      title: "Single",
      body: ["Just one"],
      images: [],
      bullets: { ordered: false, items: ["Only one"] },
    }];

    const loopHtml = renderDeckHtml(slides, [{ slideId: "slide-1", layout: "loop" }], "editorial");
    expect(loopHtml).not.toContain('class="loop-node"');
    expect(loopHtml).toContain('data-layout="content"');

    const ringsHtml = renderDeckHtml(slides, [{ slideId: "slide-1", layout: "system-rings" }], "editorial");
    expect(ringsHtml).not.toContain('class="ring-layer"');
    expect(ringsHtml).toContain('data-layout="content"');
  });

  it("renders a vertical-timeline with one row per dated bullet", () => {
    const slides: ParsedSlide[] = [{
      id: "slide-1",
      type: "bullet",
      title: "Roadmap",
      body: [],
      images: [],
      bullets: { ordered: false, items: ["2024 Q1 — Kickoff", "2024 Q3 — Beta", "2025 Q1 — GA"] },
    }];
    const html = renderDeckHtml(slides, [{ slideId: "slide-1", layout: "vertical-timeline" }], "editorial");

    expect(html).toContain('data-layout="vertical-timeline"');
    expect(html).toContain('class="slide layout-timeline"');
    expect((html.match(/class="tl-row"/g) ?? []).length).toBe(3);
    expect(html).toContain('data-field="tl-date-0"');
    expect(html).toContain("2024 Q1");
    expect(html).toContain("Kickoff");
    expect(html).toContain("GA");
  });

  it("falls back to bullet layout when vertical-timeline has no dated rows", () => {
    const slides: ParsedSlide[] = [{
      id: "slide-1",
      type: "bullet",
      title: "Plain",
      body: [],
      images: [],
      bullets: { ordered: false, items: ["No marker here", "Just a phrase"] },
    }];
    const html = renderDeckHtml(slides, [{ slideId: "slide-1", layout: "vertical-timeline" }], "editorial");
    expect(html).toContain('data-layout="bullet"');
    expect(html).not.toContain('class="tl-row"');
  });

  it("renders image-hero with text column and an image", () => {
    const slides: ParsedSlide[] = [{
      id: "slide-1",
      type: "content",
      title: "Reimagined",
      body: ["A bold new look.", "Crafted with care."],
      images: [{ alt: "Showcase", src: "/hero.png" }],
    }];
    const html = renderDeckHtml(slides, [{ slideId: "slide-1", layout: "image-hero" }], "editorial");

    expect(html).toContain('data-layout="image-hero"');
    expect(html).toContain('class="hero-text"');
    expect(html).toContain('class="hero-media"');
    expect(html).toContain('src="/hero.png"');
    expect(html).toContain('alt="Showcase"');
    expect(html).toContain("Reimagined");
    expect(html).toContain("A bold new look.");
  });

  it("falls back to content layout when image-hero has no image", () => {
    const slides: ParsedSlide[] = [{ id: "slide-1", type: "content", title: "No image", body: ["Just text."], images: [] }];
    const html = renderDeckHtml(slides, [{ slideId: "slide-1", layout: "image-hero" }], "editorial");
    expect(html).toContain('data-layout="content"');
    expect(html).not.toContain('class="hero-media"');
  });

  it("renders duo-compare with two labelled columns and a vs divider", () => {
    const slides: ParsedSlide[] = [{
      id: "slide-1",
      type: "bullet",
      title: "Old vs New",
      body: [],
      images: [],
      bullets: { ordered: false, items: ["Before — Manual every step", "After — One command"] },
    }];
    const html = renderDeckHtml(slides, [{ slideId: "slide-1", layout: "duo-compare" }], "editorial");

    expect(html).toContain('data-layout="duo-compare"');
    expect(html).toContain('class="duo-col duo-col-a"');
    expect(html).toContain('class="duo-col duo-col-b"');
    expect(html).toContain('class="duo-vs"');
    expect(html).toContain("Before");
    expect(html).toContain("After");
    expect(html).toContain("One command");
  });

  it("falls back to two-col layout when duo-compare has fewer than two pairs", () => {
    const slides: ParsedSlide[] = [{
      id: "slide-1",
      type: "bullet",
      title: "Solo",
      body: [],
      images: [],
      bullets: { ordered: false, items: ["Only one — alone"] },
    }];
    const html = renderDeckHtml(slides, [{ slideId: "slide-1", layout: "duo-compare" }], "editorial");
    expect(html).toContain('data-layout="two-col"');
    expect(html).not.toContain('class="duo-grid"');
  });

  it("escapes HTML inside loop and system-rings labels", () => {
    const slides: ParsedSlide[] = [{
      id: "slide-1",
      type: "bullet",
      title: "Escapes",
      body: [],
      images: [],
      bullets: { ordered: false, items: ["<b>A</b>", "<script>x</script>", "C"] },
    }];

    const loopHtml = renderDeckHtml(slides, [{ slideId: "slide-1", layout: "loop" }], "editorial");
    expect(loopHtml).not.toContain("<script>x</script>");
    expect(loopHtml).toContain("&lt;script&gt;");

    const ringsHtml = renderDeckHtml(slides, [{ slideId: "slide-1", layout: "system-rings" }], "editorial");
    expect(ringsHtml).not.toContain("<b>A</b>");
    expect(ringsHtml).toContain("&lt;b&gt;A&lt;/b&gt;");
  });
});
