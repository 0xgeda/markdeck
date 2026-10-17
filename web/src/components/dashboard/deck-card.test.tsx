import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeckCard } from "./deck-card";

const deck = {
  id: "deck-1",
  slug: "q3-sales",
  title: "Q3 Sales Proposal",
  theme: "editorial" as const,
  created_at: "2026-06-10T00:00:00Z",
};

describe("DeckCard", () => {
  it("renders theme mini-preview thumbnail", () => {
    render(<DeckCard deck={deck} onDelete={vi.fn()} />);
    expect(screen.getByTestId("theme-mini-editorial")).toBeInTheDocument();
  });

  it("does not show theme label in card info", () => {
    render(<DeckCard deck={deck} onDelete={vi.fn()} />);
    expect(screen.queryByText("editorial")).not.toBeInTheDocument();
  });

  it("view link points to /d/[slug]", () => {
    render(<DeckCard deck={deck} onDelete={vi.fn()} />);
    const link = screen.getByRole("link", { name: /view/i });
    expect(link).toHaveAttribute("href", "/d/q3-sales");
  });

  it("delete button calls onDelete with deck id", () => {
    const onDelete = vi.fn();
    render(<DeckCard deck={deck} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith("deck-1");
  });
});
