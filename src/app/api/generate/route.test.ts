import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/env", () => ({ env: { DEEPSEEK_API_KEY: "deepseek-key", NEXT_PUBLIC_SITE_URL: "https://markdeck.pro" } }));
vi.mock("@/lib/markdeck/layout-selector", () => ({ selectLayouts: vi.fn(async () => [{ slideId: "slide-1", layout: "cover" }]) }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "user-1", email: "user@example.com" } } }) },
    from: () => ({ upsert: async () => ({ error: null }), insert: () => ({ select: () => ({ single: async () => ({ data: { id: "deck-1", slug: "proposal" }, error: null }) }) }) }),
  }),
}));

describe("POST /api/generate", () => {
  it("generates, stores, and returns a deck id and slug", async () => {
    const request = new Request("https://markdeck.pro/api/generate", {
      method: "POST",
      body: JSON.stringify({ markdown: "# Proposal", theme: "editorial" }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ deck_id: "deck-1", slug: "proposal", url: "https://markdeck.pro/d/proposal" });
  });
});
