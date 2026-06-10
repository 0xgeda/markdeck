export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: { id: string; email: string; created_at: string };
        Insert: { id: string; email: string; created_at?: string };
        Update: { id?: string; email?: string; created_at?: string };
      };
      decks: {
        Row: {
          id: string;
          user_id: string;
          slug: string;
          title: string;
          theme: "editorial" | "bold" | "modern" | "minimal";
          html_snapshot: string;
          source_md: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          slug: string;
          title: string;
          theme: "editorial" | "bold" | "modern" | "minimal";
          html_snapshot: string;
          source_md: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["decks"]["Insert"]>;
      };
      deck_assets: {
        Row: { id: string; deck_id: string; filename: string; storage_url: string };
        Insert: { id?: string; deck_id: string; filename: string; storage_url: string };
        Update: { id?: string; deck_id?: string; filename?: string; storage_url?: string };
      };
    };
  };
}
