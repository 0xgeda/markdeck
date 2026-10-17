import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UploadForm } from "./upload-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("UploadForm", () => {
  it("submits pasted markdown and selected theme to the generate API", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ slug: "proposal" }) })));
    const replace = vi.fn();

    render(<UploadForm navigate={(path) => replace(path)} />);
    fireEvent.change(screen.getByLabelText("Markdown"), { target: { value: "# Proposal" } });
    fireEvent.change(screen.getByLabelText("Theme"), { target: { value: "modern" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate proposal" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/generate", expect.objectContaining({ method: "POST" })));
    expect(JSON.parse(String((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body))).toEqual({ markdown: "# Proposal", theme: "modern" });
    expect(replace).toHaveBeenCalledWith("/preview/proposal");
  });
});
