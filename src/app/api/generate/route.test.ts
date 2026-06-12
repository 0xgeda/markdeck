import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/env", () => ({ env: { DEEPSEEK_API_KEY: "deepseek-key", NEXT_PUBLIC_SITE_URL: "https://markdeck.pro" } }));
vi.mock("@/lib/markdeck/layout-selector", () => ({ selectLayouts: vi.fn(async () => [{ slideId: "slide-1", layout: "cover" }]) }));

describe("POST /api/generate", () => {
  it("generates and returns slug, html, and url", async () => {
    const request = new Request("https://markdeck.pro/api/generate", {
      method: "POST",
      body: JSON.stringify({ markdown: "# Proposal", theme: "editorial" }),
    });

    const response = await POST(request);
    const json = await response.json() as { slug: string; html: string; url: string };

    expect(response.status).toBe(200);
    expect(json.slug).toMatch(/^proposal-/);
    expect(typeof json.html).toBe("string");
    expect(json.html.length).toBeGreaterThan(0);
    expect(json.url).toBe(`https://markdeck.pro/d/${json.slug}`);
  });
});
