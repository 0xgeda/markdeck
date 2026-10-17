import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Markdeck schema migration", () => {
  const sql = readFileSync(join(__dirname, "202606100001_markdeck_schema.sql"), "utf8");

  it("creates required tables and RLS policies", () => {
    expect(sql).toContain("create table if not exists public.users");
    expect(sql).toContain("create table if not exists public.decks");
    expect(sql).toContain("create table if not exists public.deck_assets");
    expect(sql).toContain("alter table public.users enable row level security");
    expect(sql).toContain('policy "users can read own profile"');
    expect(sql).toContain('policy "users can manage own decks"');
    expect(sql).toContain('policy "users can manage own deck assets"');
  });
});
