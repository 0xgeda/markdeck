import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { devStore } from "@/lib/dev-store";

vi.mock("@/lib/env", () => ({ env: { DEEPSEEK_API_KEY: "deepseek-key", NEXT_PUBLIC_SITE_URL: "https://markdeck.pro" } }));
vi.mock("@/lib/markdeck/layout-selector", () => ({ selectLayouts: vi.fn(async () => [{ slideId: "slide-1", layout: "cover" }]) }));

describe("POST /api/generate", () => {
  it("generates, stores in devStore, and returns a deck id and slug", async () => {
    const request = new Request("https://markdeck.pro/api/generate", {
      method: "POST",
      body: JSON.stringify({ markdown: "# Proposal", theme: "editorial" }),
    });

    const response = await POST(request);
    const json = await response.json() as { deck_id: string; slug: string; url: string };

    expect(response.status).toBe(200);
    expect(typeof json.deck_id).toBe("string");
    expect(json.slug).toMatch(/^proposal-/);
    expect(json.url).toBe(`https://markdeck.pro/d/${json.slug}`);
    expect(devStore.has(json.slug)).toBe(true);
  });
});
