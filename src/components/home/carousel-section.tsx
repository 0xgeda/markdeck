"use client";
import { useEffect, useState } from "react";
import { ThemeMiniPreview } from "@/components/ui/theme-mini-preview";
import type { ThemeName } from "@/lib/markdeck/types";

const THEMES: { name: ThemeName; label: string; tagline: string }[] = [
  { name: "editorial", label: "Editorial", tagline: "Clean reports" },
  { name: "bold",      label: "Bold",      tagline: "Impactful pitches" },
  { name: "modern",    label: "Modern",    tagline: "Tech decks" },
  { name: "minimal",   label: "Minimal",   tagline: "Clean presentations" },
];

const SAMPLE_TITLE = "Q3 Sales Proposal";

export function CarouselSection() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % THEMES.length), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="bg-zinc-950 py-20 border-t border-zinc-900">
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-10 text-center">
          <span className="text-xs font-mono uppercase tracking-widest text-gold">Themes</span>
          <h2 className="font-display text-4xl font-semibold text-white mt-3">
            One Markdown. Four looks.
          </h2>
          <p className="mt-4 text-zinc-400 text-sm">
            Same content — AI picks the layout for every theme automatically.
          </p>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
          {THEMES.map((t, i) => (
            <div
              key={t.name}
              className={`flex-shrink-0 w-52 rounded-xl overflow-hidden border transition-all duration-300 shadow-2xl shadow-black/40 ${
                i === active
                  ? "border-gold scale-[1.03]"
                  : "border-zinc-700/50 opacity-70"
              }`}
            >
              <div className="aspect-[16/10]">
                <ThemeMiniPreview theme={t.name} title={SAMPLE_TITLE} />
              </div>
              <div className="px-3 py-2 bg-zinc-900 border-t border-zinc-800">
                <p className="text-[10px] font-semibold text-zinc-200">{t.label}</p>
                <p className="text-[9px] text-zinc-500 mt-0.5">{t.tagline}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-2 mt-6">
          {THEMES.map((t, i) => (
            <button
              key={t.name}
              aria-label={`switch to theme ${t.label}`}
              aria-pressed={i === active}
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === active ? "w-5 bg-gold" : "w-1.5 bg-zinc-700"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
