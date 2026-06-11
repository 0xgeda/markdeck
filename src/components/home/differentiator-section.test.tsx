import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DifferentiatorSection } from "./differentiator-section";

describe("DifferentiatorSection", () => {
  it("renders the headline and competitor comparison", () => {
    render(<DifferentiatorSection />);
    expect(screen.getByText(/Your words\. Untouched\./i)).toBeInTheDocument();
    expect(screen.getByText(/Markdeck/i)).toBeInTheDocument();
    expect(screen.getByText(/Other AI tools/i)).toBeInTheDocument();
  });
});
