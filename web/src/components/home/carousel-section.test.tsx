import { render, screen, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { CarouselSection } from "./carousel-section";

describe("CarouselSection", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("renders all 4 theme previews", () => {
    render(<CarouselSection />);
    expect(screen.getByTestId("theme-mini-editorial")).toBeInTheDocument();
    expect(screen.getByTestId("theme-mini-bold")).toBeInTheDocument();
    expect(screen.getByTestId("theme-mini-modern")).toBeInTheDocument();
    expect(screen.getByTestId("theme-mini-minimal")).toBeInTheDocument();
  });

  it("advances active index after 3 seconds", () => {
    render(<CarouselSection />);
    const dots = screen.getAllByRole("button", { name: /switch to theme/i });
    expect(dots[0]).toHaveAttribute("aria-pressed", "true");
    act(() => { vi.advanceTimersByTime(3000); });
    expect(dots[1]).toHaveAttribute("aria-pressed", "true");
  });
});
