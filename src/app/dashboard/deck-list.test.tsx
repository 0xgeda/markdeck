import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeckList } from "./deck-list";

describe("DeckList", () => {
  it("lists decks and deletes one", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    render(<DeckList decks={[{ id: "deck-1", slug: "plan", title: "Plan", theme: "editorial", created_at: "2026-06-10T00:00:00Z" }]} />);

    expect(screen.getByText("Plan")).toBeInTheDocument();
    expect(screen.getByText("editorial")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete Plan" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/decks/deck-1", { method: "DELETE" }));
  });
});
