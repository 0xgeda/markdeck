"use client";

import { useState } from "react";
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

  async function remove(deck: DashboardDeck) {
    const response = await fetch(`/api/decks/${deck.id}`, { method: "DELETE" });
    if (response.ok) setItems((current) => current.filter((item) => item.id !== deck.id));
  }

  return (
    <main>
      <h1>Your decks</h1>
      <ul>
        {items.map((deck) => (
          <li key={deck.id}>
            <a href={`/preview/${deck.slug}`}>{deck.title}</a>
            <span>{deck.theme}</span>
            <time dateTime={deck.created_at}>{new Date(deck.created_at).toLocaleDateString("en-US")}</time>
            <button type="button" aria-label={`Delete ${deck.title}`} onClick={() => remove(deck)}>Delete</button>
          </li>
        ))}
      </ul>
    </main>
  );
}
