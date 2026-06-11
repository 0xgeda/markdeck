"use client";

import { Layers } from "lucide-react";
import { ThemeMiniPreview } from "@/components/ui/theme-mini-preview";
import type { ThemeName } from "@/lib/markdeck/types";

const THEMES: { name: ThemeName; label: string }[] = [
  { name: "editorial", label: "Editorial" },
  { name: "bold", label: "Bold" },
  { name: "modern", label: "Modern" },
  { name: "minimal", label: "Minimal" },
];

const PROGRESS_STEPS = ["Parsing…", "AI selecting layouts…", "Rendering…"];

interface OptionsPanelProps {
  theme: ThemeName;
  onThemeChange: (v: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  generatingStep?: number;
  error: string | null;
  markdown: string;
}

export function OptionsPanel({
  theme,
  onThemeChange,
  onGenerate,
  isGenerating,
  generatingStep = 0,
  error,
  markdown,
}: OptionsPanelProps) {
  return (
    <div className="bg-zinc-900 border-l border-zinc-800 w-80 flex-shrink-0 p-6 flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-zinc-400" />
        <span className="text-sm font-medium text-zinc-300">Options</span>
      </div>

      {/* Theme cards */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Theme</legend>
        <label htmlFor="theme-select" className="hidden">Theme</label>
        <select
          id="theme-select"
          aria-label="Theme"
          value={theme}
          onChange={(e) => onThemeChange(e.target.value)}
          hidden
        >
          {THEMES.map((t) => (
            <option key={t.name} value={t.name}>{t.label}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((t) => (
            <label
              key={t.name}
              className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                theme === t.name ? "border-gold" : "border-zinc-700 hover:border-zinc-500"
              }`}
            >
              <input
                type="radio"
                name="theme"
                aria-label={t.label}
                value={t.name}
                checked={theme === t.name}
                onChange={() => onThemeChange(t.name)}
                className="sr-only"
              />
              <div className="aspect-[4/3]">
                <ThemeMiniPreview theme={t.name} title="Proposal" />
              </div>
              <div className={`px-2 py-1 text-[10px] font-semibold text-center border-t ${
                theme === t.name
                  ? "bg-gold/10 border-gold/30 text-gold"
                  : "bg-zinc-800 border-zinc-700 text-zinc-400"
              }`}>
                {t.label}
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Images upload */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-zinc-500 uppercase tracking-widest">Images</label>
        <label className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-zinc-700 rounded-lg text-xs text-zinc-500 hover:border-zinc-500 hover:text-zinc-400 cursor-pointer transition">
          + Add images
          <input type="file" accept="image/*" multiple className="hidden" />
        </label>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex-1" />

      <div>
        <button
          className="w-full bg-gold text-zinc-950 hover:bg-gold/90 font-semibold rounded-lg px-4 py-2.5 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isGenerating || !markdown.trim()}
          onClick={onGenerate}
          aria-label={isGenerating ? PROGRESS_STEPS[generatingStep] : "Generate proposal"}
        >
          {isGenerating ? PROGRESS_STEPS[generatingStep] : "Generate proposal →"}
        </button>
        <p className="text-xs text-zinc-600 text-center mt-3">Powered by DeepSeek</p>
      </div>
    </div>
  );
}
