import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OptionsPanel } from "./options-panel";

const baseProps = {
  theme: "editorial" as const,
  onThemeChange: vi.fn(),
  onGenerate: vi.fn(),
  isGenerating: false,
  error: null,
  markdown: "# Hello",
};

describe("OptionsPanel", () => {
  it("renders 4 theme cards instead of a select", () => {
    render(<OptionsPanel {...baseProps} />);
    expect(screen.getByRole("radio", { name: /editorial/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /bold/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /modern/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /minimal/i })).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("calls onThemeChange when a theme card is clicked", () => {
    const onThemeChange = vi.fn();
    render(<OptionsPanel {...baseProps} onThemeChange={onThemeChange} />);
    fireEvent.click(screen.getByRole("radio", { name: /bold/i }));
    expect(onThemeChange).toHaveBeenCalledWith("bold");
  });

  it("renders generate button with gold styling cue in aria-label", () => {
    render(<OptionsPanel {...baseProps} />);
    expect(screen.getByRole("button", { name: /generate proposal/i })).toBeInTheDocument();
  });
});
