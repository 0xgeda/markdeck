"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeckCard } from "@/components/dashboard/deck-card";
import { DecksEmptyState } from "@/components/dashboard/decks-empty-state";
import type { ThemeName } from "@/lib/markdeck/types";

export interface DashboardDeck {
  id: string;
  slug: string;
  title: string;
  theme: ThemeName;
  created_at: string;
}

export function DeckList({ decks }: { decks: DashboardDeck[] }) {
  const [items, setItems] = useState(decks);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function remove(id: string) {
    setDeleteError(null);
    const previous = items;
    setItems((current) => current.filter((deck) => deck.id !== id));
    const response = await fetch(`/api/decks/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setItems(previous);
      setDeleteError("Unable to delete deck. Please try again.");
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Your decks</h1>
        <Link href="/upload">
          <Button size="sm" variant="secondary">New deck</Button>
        </Link>
      </div>
      {deleteError && (
        <p className="text-sm text-red-400 mb-6 bg-red-950/30 border border-red-900/50 rounded px-4 py-2" role="alert">
          {deleteError}
        </p>
      )}
      {items.length === 0 ? (
        <DecksEmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((deck) => (
            <DeckCard key={deck.id} deck={deck} onDelete={remove} />
          ))}
        </div>
      )}
    </div>
  );
}
