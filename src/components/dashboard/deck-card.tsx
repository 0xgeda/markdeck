"use client";

import Link from "next/link";
import { ExternalLink, Trash2 } from "lucide-react";
import { ThemeMiniPreview } from "@/components/ui/theme-mini-preview";
import type { ThemeName } from "@/lib/markdeck/types";

interface DeckCardProps {
  deck: {
    id: string;
    slug: string;
    title: string;
    theme: ThemeName;
    created_at: string;
  };
  onDelete: (id: string) => void;
}

export function DeckCard({ deck, onDelete }: DeckCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden group">
      <div className="aspect-[16/9]">
        <ThemeMiniPreview theme={deck.theme} title="Proposal" className="w-full h-full" />
      </div>
      <div className="p-4 flex items-start justify-between gap-2 border-t border-zinc-800">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{deck.title}</p>
          <p className="text-xs text-zinc-500 mt-1">
            {new Date(deck.created_at).toLocaleDateString("en-US")}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link href={`/d/${deck.slug}`} aria-label="View" target="_blank">
            <ExternalLink className="h-4 w-4 text-zinc-500 hover:text-white transition" />
          </Link>
          <button aria-label={`Delete ${deck.title}`} onClick={() => onDelete(deck.id)}>
            <Trash2 className="h-4 w-4 text-zinc-600 hover:text-red-400 transition" />
          </button>
        </div>
      </div>
    </div>
  );
}
