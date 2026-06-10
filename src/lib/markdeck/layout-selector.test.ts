import { describe, expect, it, vi } from "vitest";
import { selectLayouts } from "./layout-selector";
import type { ParsedSlide } from "./types";

describe("selectLayouts", () => {
  it("sends structural JSON only and returns selected layouts", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ layouts: [{ slideId: "slide-1", layout: "cover" }] }) } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const slides: ParsedSlide[] = [{ id: "slide-1", type: "cover", title: "Secret title", body: ["Sensitive copy"], images: [] }];
    const layouts = await selectLayouts(slides, "deepseek-key");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("deepseek-chat");
    expect(body.messages[0].content).toContain("Return JSON only");
    expect(body.messages[1].content).toBe(JSON.stringify({ slides: [{ id: "slide-1", type: "cover", bodyLineCount: 1, imageCount: 0 }] }));
    expect(layouts).toEqual([{ slideId: "slide-1", layout: "cover" }]);
  });

  it("falls back to slide.type when DeepSeek returns an unrecognized layout", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ layouts: [{ slideId: "slide-1", layout: "unknown-layout" }] }) } }],
      }),
    }));

    const slides: ParsedSlide[] = [{ id: "slide-1", type: "stat", title: "Q1", body: ["42%"], images: [] }];
    const layouts = await selectLayouts(slides, "deepseek-key");

    expect(layouts).toEqual([{ slideId: "slide-1", layout: "stat" }]);
  });

  it("throws a descriptive error when DeepSeek returns non-JSON content", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "Sorry, I cannot help." } }] }),
    }));

    const slides: ParsedSlide[] = [{ id: "slide-1", type: "content", title: "T", body: [], images: [] }];
    await expect(selectLayouts(slides, "deepseek-key")).rejects.toThrow("non-JSON content");
  });
});
