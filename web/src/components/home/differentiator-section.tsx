const rows = [
  { label: "Modifies your content", other: true, markdeck: false },
  { label: "Rewrites your headlines", other: true, markdeck: false },
  { label: "Requires account to view", other: true, markdeck: false },
  { label: "AI layout selection", other: false, markdeck: true },
  { label: "Inline text editing", other: false, markdeck: true },
  { label: "Hosted share link", other: false, markdeck: true },
];

export function DifferentiatorSection() {
  return (
    <section className="bg-zinc-950 py-24 border-t border-zinc-900">
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-14 text-center">
          <span className="text-xs font-mono uppercase tracking-widest text-gold">Why us</span>
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-white mt-3">
            Your words. Untouched.
          </h2>
          <p className="mt-4 text-zinc-400 max-w-md mx-auto leading-relaxed">
            AI decides the layout. Your content stays exactly as you wrote it — word for word.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="text-left px-6 py-3 text-zinc-500 font-medium">Feature</th>
                <th className="px-6 py-3 text-zinc-500 font-medium text-center">Other AI tools</th>
                <th className="px-6 py-3 text-gold font-semibold text-center">Markdeck</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.label} className={`border-b border-zinc-900 ${i % 2 === 0 ? "bg-zinc-950" : "bg-zinc-950/50"}`}>
                  <td className="px-6 py-3 text-zinc-300">{row.label}</td>
                  <td className="px-6 py-3 text-center text-lg">{row.other ? "✓" : "–"}</td>
                  <td className="px-6 py-3 text-center text-lg text-gold">{row.markdeck ? "✓" : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
