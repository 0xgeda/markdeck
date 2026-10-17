import Link from "next/link";
import { PlusCircle, LayoutDashboard } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-gray-950 border-r border-gray-800 flex flex-col py-6 px-4 fixed left-0 top-0 h-full">
        <span className="text-sm font-bold text-white mb-8">Markdeck</span>
        <nav className="flex flex-col gap-1">
          <Link
            href="/upload"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <PlusCircle className="h-4 w-4" />
            New Deck
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <LayoutDashboard className="h-4 w-4" />
            My Decks
          </Link>
        </nav>
      </aside>
      <main className="ml-56 flex-1 bg-gray-950 min-h-screen">
        {children}
      </main>
    </div>
  );
}
