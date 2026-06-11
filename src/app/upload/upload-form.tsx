"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ThemeName } from "@/lib/markdeck/types";
import { MarkdownEditor } from "@/components/upload/markdown-editor";
import { OptionsPanel } from "@/components/upload/options-panel";

export function UploadForm({ navigate }: { navigate?: (path: string) => void }) {
  const router = useRouter();
  const [markdown, setMarkdown] = useState("");
  const [theme, setTheme] = useState<ThemeName>("editorial");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setIsGenerating(true);
    setError(null);
    setGeneratingStep(0);
    const stepInterval = setInterval(() => setGeneratingStep((s) => Math.min(s + 1, 2)), 1500);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown, theme }),
      });
      if (!response.ok) throw new Error("Generation failed — please try again.");
      const result = (await response.json()) as { slug: string };
      if (navigate) {
        navigate(`/preview/${result.slug}`);
      } else {
        router.push(`/preview/${result.slug}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed — please try again.");
    } finally {
      clearInterval(stepInterval);
      setGeneratingStep(0);
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-0px)]">
      <MarkdownEditor
        value={markdown}
        onChange={setMarkdown}
        onFileLoad={setMarkdown}
      />
      <OptionsPanel
        theme={theme}
        onThemeChange={(v) => setTheme(v as ThemeName)}
        onGenerate={submit}
        isGenerating={isGenerating}
        generatingStep={generatingStep}
        error={error}
        markdown={markdown}
      />
    </div>
  );
}
