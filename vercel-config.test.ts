import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Vercel deployment config", () => {
  it("defines build command and documents required environment variables", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8"));
    const docs = readFileSync("docs/deployment.md", "utf8");

    expect(config.buildCommand).toBe("npm run build");
    expect(config.framework).toBe("nextjs");
    expect(docs).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(docs).toContain("DEEPSEEK_API_KEY");
    expect(docs).toContain("markdeck.pro");
  });
});
