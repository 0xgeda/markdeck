import { Sparkles, LayoutGrid, ImagePlus, Link2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"

const features: { icon: LucideIcon; num: string; title: string; desc: string }[] = [
  { icon: Sparkles,   num: "01", title: "AI Layout",    desc: "DeepSeek reads your content and picks the best slide layout for every section — automatically." },
  { icon: LayoutGrid, num: "02", title: "6 Layouts",    desc: "Cover, Content, Quote, Two-column, Stat, and Image-full — every proposal pattern covered." },
  { icon: ImagePlus,  num: "03", title: "Asset Upload", desc: "Drop in your images. They get embedded directly into your deck without manual formatting." },
  { icon: Link2,      num: "04", title: "Share Link",   desc: "Every deck gets a public URL. Recipients can view it without an account." },
]

export function FeaturesSection() {
  return (
    <section className="bg-zinc-950 py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-16 max-w-xl">
          <span className="text-xs font-mono uppercase tracking-widest text-gold">Features</span>
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-white mt-3 leading-tight">
            Everything you need<br />to ship proposals
          </h2>
          <p className="mt-4 text-zinc-400 leading-relaxed">
            From Markdown to shareable slide deck in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-800">
          {features.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.title} className="bg-zinc-950 p-8 flex flex-col gap-6">
                <div className="flex items-start justify-between">
                  <span className="font-display text-5xl font-light text-zinc-800 leading-none select-none">
                    {f.num}
                  </span>
                  <Icon className="h-5 w-5 text-gold mt-1 flex-shrink-0" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
