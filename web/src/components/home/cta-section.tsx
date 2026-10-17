import Link from "next/link"

export function CtaSection() {
  return (
    <section className="bg-zinc-950 py-28 border-t border-zinc-900 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-gold/8 blur-3xl rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 text-center relative">
        <h2 className="font-display text-5xl md:text-7xl font-semibold text-white leading-[1.0] tracking-tight">
          Ready to make your
          <br />
          <em className="text-gold">next proposal?</em>
        </h2>
        <p className="mt-6 text-zinc-400 text-lg">Free to use. No credit card required.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/auth"
            className="inline-flex items-center px-8 py-3.5 rounded-full bg-gold text-zinc-950 text-sm font-semibold hover:bg-gold/90 transition-colors"
          >
            Start for free →
          </Link>
        </div>
      </div>
    </section>
  )
}
