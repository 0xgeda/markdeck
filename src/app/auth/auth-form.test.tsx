import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthForm } from "./auth-form";

describe("AuthForm", () => {
  it("submits email and password to sign in action", () => {
    const signIn = vi.fn();
    render(<AuthForm signInAction={signIn} signUpAction={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(signIn).toHaveBeenCalled();
  });
});
