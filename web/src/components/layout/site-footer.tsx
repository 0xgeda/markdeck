export function SiteFooter() {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-900 py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div className="font-display text-base font-semibold italic text-white">Markdeck</div>
            <p className="text-sm text-zinc-500 mt-1">Turn Markdown into beautiful proposals.</p>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Built with</h2>
            <ul className="space-y-2">
              <li className="text-sm text-zinc-500">DeepSeek</li>
              <li className="text-sm text-zinc-500">Supabase</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-zinc-900 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-2">
          <p className="text-xs text-zinc-600">© 2026 Markdeck</p>
          <p className="text-xs text-zinc-700">markdeck.pro</p>
        </div>
      </div>
    </footer>
  )
}
