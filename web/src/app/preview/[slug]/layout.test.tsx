import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PreviewLayout from "./layout";

describe("PreviewLayout", () => {
  it("renders children without the app sidebar", () => {
    render(<PreviewLayout><div data-testid="child">content</div></PreviewLayout>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.queryByText("New Deck")).not.toBeInTheDocument();
    expect(screen.queryByText("My Decks")).not.toBeInTheDocument();
  });
});
