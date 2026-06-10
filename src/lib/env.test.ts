import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("parses all required Markdeck environment variables", () => {
    const result = parseEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      DEEPSEEK_API_KEY: "deepseek-key",
      NEXT_PUBLIC_SITE_URL: "https://markdeck.pro",
    });

    expect(result.NEXT_PUBLIC_SUPABASE_URL).toBe("https://example.supabase.co");
    expect(result.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("anon-key");
    expect(result.SUPABASE_SERVICE_ROLE_KEY).toBe("service-role-key");
    expect(result.DEEPSEEK_API_KEY).toBe("deepseek-key");
    expect(result.NEXT_PUBLIC_SITE_URL).toBe("https://markdeck.pro");
  });

  it("defaults NEXT_PUBLIC_SITE_URL to https://markdeck.pro when omitted", () => {
    const result = parseEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      DEEPSEEK_API_KEY: "deepseek-key",
    });

    expect(result.NEXT_PUBLIC_SITE_URL).toBe("https://markdeck.pro");
  });

  it("throws ZodError when a required variable is missing", () => {
    expect(() =>
      parseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        // SUPABASE_SERVICE_ROLE_KEY missing
        DEEPSEEK_API_KEY: "deepseek-key",
      })
    ).toThrow();
  });

  it("throws ZodError when a URL variable is invalid", () => {
    expect(() =>
      parseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
        DEEPSEEK_API_KEY: "deepseek-key",
      })
    ).toThrow();
  });
});
