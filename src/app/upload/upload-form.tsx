"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ThemeName } from "@/lib/markdeck/types";

export function UploadForm({ navigate }: { navigate?: (path: string) => void }) {
  const router = useRouter();
  const [markdown, setMarkdown] = useState("");
  const [theme, setTheme] = useState<ThemeName>("editorial");
  const [images, setImages] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  async function submit() {
    setIsGenerating(true);
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown, theme }),
    });
    setIsGenerating(false);
    if (!response.ok) throw new Error("generation failed");
    const result = (await response.json()) as { slug: string };
    (navigate ?? router.push)(`/preview/${result.slug}`);
  }

  return (
    <main className="upload-shell">
      <label>
        Markdown
        <textarea value={markdown} onChange={(event) => setMarkdown(event.target.value)} rows={16} />
      </label>
      <label>
        Upload .md file
        <input
          type="file"
          accept=".md,text/markdown,text/plain"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (file) setMarkdown(await file.text());
          }}
        />
      </label>
      <label>
        Images
        <input type="file" accept="image/*" multiple onChange={(event) => setImages(Array.from(event.target.files ?? []))} />
      </label>
      <p>{images.length} image files ready for drag-in editing.</p>
      <label>
        Theme
        <select value={theme} onChange={(event) => setTheme(event.target.value as ThemeName)}>
          <option value="editorial">editorial</option>
          <option value="bold">bold</option>
          <option value="modern">modern</option>
          <option value="minimal">minimal</option>
        </select>
      </label>
      <button type="button" onClick={submit} disabled={isGenerating || markdown.trim().length === 0}>
        {isGenerating ? "Generating" : "Generate proposal"}
      </button>
    </main>
  );
}
