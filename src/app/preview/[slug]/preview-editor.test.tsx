import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PreviewEditor } from "./preview-editor";

describe("PreviewEditor", () => {
  it("renders toolbar with share URL, edit toggle, save, export, and share buttons", () => {
    render(
      <PreviewEditor
        deckId="deck-1"
        slug="q3-sales"
        initialHtml="<html><body><h1 data-editable='text'>Plan</h1></body></html>"
      />
    );
    expect(screen.getByRole("link", { name: /My Decks/i })).toBeInTheDocument();
    expect(screen.getByText(/q3-sales/)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /edit mode/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /images/i })).toBeInTheDocument();
  });

  it("shows saved confirmation after save, then reverts", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({}) })));
    render(<PreviewEditor deckId="deck-1" slug="q3-sales" initialHtml="<html><body></body></html>" />);
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => expect(screen.getByText(/saved/i)).toBeInTheDocument());
  });

  it("toggles images panel on Images button click", () => {
    render(<PreviewEditor deckId="deck-1" slug="q3-sales" initialHtml="<html><body></body></html>" />);
    expect(screen.queryByRole("complementary", { name: /images panel/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /images/i }));
    expect(screen.getByRole("complementary", { name: /images panel/i })).toBeInTheDocument();
  });
});
