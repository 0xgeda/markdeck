import type { ThemeName } from "@/lib/markdeck/types";

interface ThemeMiniPreviewProps {
  theme: ThemeName;
  title?: string;
  className?: string;
}

export function ThemeMiniPreview({ theme, title = "Proposal", className = "" }: ThemeMiniPreviewProps) {
  if (theme === "editorial") {
    return (
      <div data-testid="theme-mini-editorial" className={`h-full flex flex-col bg-stone-50 p-3 ${className}`}>
        <div className="text-[6px] font-mono uppercase tracking-widest text-stone-400 mb-2">Report</div>
        <div className="text-[11px] font-bold text-stone-900 leading-tight mb-auto" style={{ fontFamily: "Georgia, serif" }}>
          {title}
        </div>
        <div className="space-y-1">
          <div className="h-1 w-16 bg-stone-300 rounded-full" />
          <div className="h-1 w-12 bg-stone-200 rounded-full" />
          <div className="h-1 w-14 bg-stone-200 rounded-full" />
        </div>
      </div>
    );
  }

  if (theme === "bold") {
    return (
      <div data-testid="theme-mini-bold" className={`h-full flex flex-col bg-zinc-900 p-3 ${className}`}>
        <div className="text-[6px] font-mono uppercase tracking-widest text-gold mb-2">Pitch</div>
        <div className="text-[13px] font-black text-white leading-none mb-auto uppercase">
          {title}
        </div>
        <div className="text-[6px] text-zinc-500">Series A · $5M</div>
      </div>
    );
  }

  if (theme === "modern") {
    return (
      <div data-testid="theme-mini-modern" className={`h-full flex flex-col bg-blue-950 p-3 ${className}`}>
        <div className="text-[6px] font-mono uppercase tracking-widest text-blue-400 mb-2">Arch</div>
        <div className="text-[9px] font-semibold text-white mb-2">{title}</div>
        <div className="space-y-0.5 mt-auto">
          <div className="text-[6px] text-blue-300 flex items-center gap-1"><span className="text-blue-500">→</span> API Gateway</div>
          <div className="text-[6px] text-blue-300 flex items-center gap-1"><span className="text-blue-500">→</span> Edge Cache</div>
          <div className="text-[6px] text-blue-300 flex items-center gap-1"><span className="text-blue-500">→</span> Database</div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="theme-mini-minimal" className={`h-full flex flex-col bg-white p-3 ${className}`}>
      <div className="text-[6px] font-mono uppercase tracking-widest text-stone-400 mb-2">Report</div>
      <div className="h-px bg-stone-200 mb-3" />
      <div className="text-[9px] font-light text-stone-700 leading-relaxed mb-auto">{title}</div>
    </div>
  );
}
