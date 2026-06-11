import Link from "next/link"

export function HeroSection() {
  return (
    <section className="bg-zinc-950 pt-24 pb-20 overflow-hidden relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-gold/5 blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 text-center relative">
        <div className="inline-flex items-center gap-2 border border-zinc-800 rounded-full px-4 py-1.5 text-xs text-zinc-400 bg-zinc-900/60 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          AI-powered layout selection
        </div>

        <h1 className="font-display text-6xl md:text-[84px] font-semibold text-white leading-[1.02] tracking-tight mb-6">
          Turn Markdown into
          <br />
          <em className="text-gold">Beautiful</em> Proposal Slides
        </h1>

        <p className="text-lg text-zinc-400 max-w-sm mx-auto mb-10 leading-relaxed">
          Paste your Markdown. AI picks the layout. Share a link.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/auth"
            className="inline-flex items-center px-7 py-3 rounded-full bg-gold text-zinc-950 text-sm font-semibold hover:bg-gold/90 transition-colors"
          >
            Start for free
          </Link>
          <Link
            href="/upload"
            className="inline-flex items-center px-7 py-3 rounded-full border border-zinc-700 text-zinc-300 text-sm hover:border-zinc-500 hover:text-white transition-colors"
          >
            Try the editor →
          </Link>
        </div>
      </div>
    </section>
  )
}
