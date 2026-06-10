import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PreviewEditor } from "./preview-editor";

describe("PreviewEditor", () => {
  it("toggles edit mode, saves, and exports", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:deck"), revokeObjectURL: vi.fn() });

    render(<PreviewEditor deckId="deck-1" initialHtml="<html><body><h1 data-editable='text'>Plan</h1></body></html>" />);

    // iframe is rendered
    const iframe = screen.getByTitle("Deck preview") as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute("srcDoc")).toContain("Plan");

    // toggle edit mode
    fireEvent.click(screen.getByRole("switch", { name: "Edit mode" }));

    // save
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/decks/deck-1/save",
        expect.objectContaining({ method: "POST" })
      )
    );

    // export
    fireEvent.click(screen.getByRole("button", { name: "Export HTML" }));
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});
