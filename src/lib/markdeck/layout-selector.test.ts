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
});
