const showcaseItems = [
  {
    title: "Q3 Sales Proposal",
    theme: "Editorial",
    preview: (
      <div className="h-full flex flex-col bg-stone-50 p-5">
        <div className="text-[8px] font-mono uppercase tracking-widest text-stone-400 mb-3">Q3 2026 · Sales</div>
        <div className="text-lg font-bold text-stone-900 leading-tight mb-auto">
          Q3 Sales<br />Proposal
        </div>
        <div className="space-y-1.5">
          <div className="h-1.5 w-24 bg-stone-300 rounded-full" />
          <div className="h-1.5 w-16 bg-stone-200 rounded-full" />
          <div className="h-1.5 w-20 bg-stone-200 rounded-full" />
        </div>
      </div>
    ),
  },
  {
    title: "Product Launch Deck",
    theme: "Bold",
    preview: (
      <div className="h-full flex flex-col bg-zinc-900 p-5">
        <div className="text-[8px] font-mono uppercase tracking-widest text-gold mb-3">Launch</div>
        <div className="text-xl font-black text-white leading-none mb-auto">
          PRODUCT<br />LAUNCH<br />2026
        </div>
        <div className="text-[8px] text-zinc-500">Keynote · Global</div>
      </div>
    ),
  },
  {
    title: "Tech Architecture Overview",
    theme: "Modern",
    preview: (
      <div className="h-full flex flex-col bg-blue-950 p-5">
        <div className="text-[8px] font-mono uppercase tracking-widest text-blue-400 mb-3">Architecture</div>
        <div className="text-sm font-semibold text-white mb-3">System Overview</div>
        <div className="space-y-1 mt-auto">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-sm bg-blue-500" />
            <div className="text-[8px] text-blue-300">API Gateway Layer</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-sm bg-blue-400" />
            <div className="text-[8px] text-blue-300">Edge Cache Cluster</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-sm bg-blue-300" />
            <div className="text-[8px] text-blue-300">PostgreSQL Primary</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Annual Report 2026",
    theme: "Minimal",
    preview: (
      <div className="h-full flex flex-col bg-white p-5">
        <div className="text-[8px] font-mono uppercase tracking-widest text-stone-400 mb-3">Annual · 2026</div>
        <div className="h-px bg-stone-200 mb-4" />
        <div className="text-base font-light text-stone-800 leading-relaxed mb-auto">
          Annual<br />Report
        </div>
        <div className="text-[8px] text-stone-400">Markdeck Inc.</div>
      </div>
    ),
  },
]

export function ShowcaseSection() {
  return (
    <section className="bg-zinc-900 py-24 border-t border-zinc-800">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-14 text-center">
          <span className="text-xs font-mono uppercase tracking-widest text-gold">Showcase</span>
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-white mt-3">
            Decks built with Markdeck
          </h2>
          <p className="mt-4 text-zinc-400">Real proposals made with Markdeck.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {showcaseItems.map((item) => (
            <div key={item.title} className="rounded-xl overflow-hidden border border-zinc-800 shadow-xl group cursor-pointer hover:border-zinc-600 transition-colors">
              <div className="aspect-[16/9]">{item.preview}</div>
              <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-200">{item.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{item.theme}</p>
                </div>
                <span className="text-xs text-zinc-600 group-hover:text-gold transition-colors">
                  View deck →
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-zinc-600">
          Want yours featured?{" "}
          <a href="mailto:hello@markdeck.pro" className="text-zinc-500 hover:text-gold transition-colors underline underline-offset-2">
            Reach out
          </a>
        </p>
      </div>
    </section>
  )
}
