import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HostedDeckPage from "./page";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { title: "Plan", html_snapshot: "<main>Hosted deck</main>" } }) }) }) }),
  }),
}));

describe("HostedDeckPage", () => {
  it("renders the stored deck snapshot", async () => {
    render(await HostedDeckPage({ params: Promise.resolve({ slug: "plan" }) }));
    expect(screen.getByTitle("Plan")).toHaveAttribute("srcDoc", "<main>Hosted deck</main>");
  });
});
