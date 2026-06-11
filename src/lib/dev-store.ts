// Temporary in-memory deck store — bypasses Supabase for local dev/testing.
// Remove this file and the references in generate/route.ts and preview/page.tsx
// once auth + Supabase are wired up.

interface DevDeck {
  id: string;
  html: string;
  title: string;
}

export const devStore = new Map<string, DevDeck>();
