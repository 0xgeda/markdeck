"use client"

import Link from "next/link"
import { Menu } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 h-16 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-full">
        <Link href="/" className="font-display text-xl font-semibold italic text-white tracking-wide">
          Markdeck
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="#" className="text-sm text-zinc-400 hover:text-white transition-colors">Docs</Link>
          <Link href="https://github.com/0xgeda/markdeck" target="_blank" className="text-sm text-zinc-400 hover:text-white transition-colors">GitHub</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/auth"
            className="hidden md:inline-flex items-center px-4 py-2 rounded-full border border-zinc-700 text-sm text-zinc-300 hover:border-gold hover:text-gold transition-colors"
          >
            Get started
          </Link>

          <Sheet>
            <SheetTrigger className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors">
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent className="bg-zinc-950 border-zinc-800">
              <SheetHeader>
                <SheetTitle className="font-display italic text-white">Markdeck</SheetTitle>
              </SheetHeader>
              <nav className="mt-8 flex flex-col gap-5">
                <Link href="#" className="text-sm text-zinc-400 hover:text-white transition-colors">Docs</Link>
                <Link href="https://github.com/0xgeda/markdeck" target="_blank" className="text-sm text-zinc-400 hover:text-white transition-colors">GitHub</Link>
                <Link href="/auth" className="text-sm text-gold">Get started →</Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
