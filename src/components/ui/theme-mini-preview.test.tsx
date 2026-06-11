import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeMiniPreview } from "./theme-mini-preview";

describe("ThemeMiniPreview", () => {
  it("renders editorial theme with serif font cue", () => {
    render(<ThemeMiniPreview theme="editorial" title="Q3 Proposal" />);
    expect(screen.getByTestId("theme-mini-editorial")).toBeInTheDocument();
  });

  it("renders bold theme with uppercase title cue", () => {
    render(<ThemeMiniPreview theme="bold" title="Q3 Proposal" />);
    expect(screen.getByTestId("theme-mini-bold")).toBeInTheDocument();
  });

  it("renders modern theme", () => {
    render(<ThemeMiniPreview theme="modern" title="Q3 Proposal" />);
    expect(screen.getByTestId("theme-mini-modern")).toBeInTheDocument();
  });

  it("renders minimal theme", () => {
    render(<ThemeMiniPreview theme="minimal" title="Q3 Proposal" />);
    expect(screen.getByTestId("theme-mini-minimal")).toBeInTheDocument();
  });
});
