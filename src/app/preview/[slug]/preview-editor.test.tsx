import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { PreviewEditor } from "./preview-editor";

beforeEach(() => {
  sessionStorage.setItem("deck:q3-sales", "<html><body><h1 data-editable='text'>Plan</h1></body></html>");
});

describe("PreviewEditor", () => {
  it("renders toolbar with share URL, edit toggle, save, export, and images buttons", () => {
    render(<PreviewEditor slug="q3-sales" />);
    expect(screen.getByRole("link", { name: /My Decks/i })).toBeInTheDocument();
    expect(screen.getByText(/q3-sales/)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /edit mode/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /images/i })).toBeInTheDocument();
  });

  it("shows saved confirmation after save, then reverts", async () => {
    render(<PreviewEditor slug="q3-sales" />);
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    expect(await screen.findByText(/saved/i)).toBeInTheDocument();
  });

  it("toggles images panel on Images button click", () => {
    render(<PreviewEditor slug="q3-sales" />);
    expect(screen.queryByRole("complementary", { name: /images panel/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /images/i }));
    expect(screen.getByRole("complementary", { name: /images panel/i })).toBeInTheDocument();
  });
});
