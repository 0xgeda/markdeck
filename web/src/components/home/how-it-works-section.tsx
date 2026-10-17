const steps = [
  {
    num: "01",
    title: "Paste your Markdown",
    desc: "Drop in your .md file or paste text directly. Upload images separately — they get embedded automatically.",
  },
  {
    num: "02",
    title: "AI picks the layout",
    desc: "DeepSeek reads your content structure and selects the best slide layout for each section. Done in ~5 seconds.",
  },
  {
    num: "03",
    title: "Share your link",
    desc: "Click to edit any text inline, download a self-contained HTML file, or share a hosted link — no account needed to view.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="bg-zinc-900 py-24 border-t border-zinc-800">
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-16 text-center">
          <span className="text-xs font-mono uppercase tracking-widest text-gold">How it works</span>
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-white mt-3">
            Three steps to a great deck
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-0 md:divide-x divide-zinc-800">
          {steps.map((step) => (
            <div key={step.num} className="px-8 py-6 first:pl-0 last:pr-0">
              <div className="font-display text-6xl font-light text-zinc-800 leading-none select-none mb-5">
                {step.num}
              </div>
              <h3 className="text-base font-semibold text-white mb-3">{step.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
