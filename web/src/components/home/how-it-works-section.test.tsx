import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HowItWorksSection } from "./how-it-works-section";

describe("HowItWorksSection", () => {
  it("renders all 3 steps", () => {
    render(<HowItWorksSection />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
    expect(screen.getByText(/Paste your Markdown/i)).toBeInTheDocument();
    expect(screen.getByText(/AI picks the layout/i)).toBeInTheDocument();
    expect(screen.getByText(/Share your link/i)).toBeInTheDocument();
  });
});
