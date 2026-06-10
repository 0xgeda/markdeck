-- supabase/migrations/202606100001_markdeck_schema.sql
create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  slug text not null unique,
  title text not null,
  theme text not null check (theme in ('editorial', 'bold', 'modern', 'minimal')),
  html_snapshot text not null,
  source_md text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.deck_assets (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  filename text not null,
  storage_url text not null
);

create index if not exists decks_user_id_created_at_idx on public.decks(user_id, created_at desc);
create index if not exists deck_assets_deck_id_idx on public.deck_assets(deck_id);

alter table public.users enable row level security;
alter table public.decks enable row level security;
alter table public.deck_assets enable row level security;

create policy "users can read own profile"
on public.users for select
using (auth.uid() = id);

create policy "users can insert own profile"
on public.users for insert
with check (auth.uid() = id);

-- All created decks are publicly shareable via /d/:slug — SELECT open to all.
create policy "public can read hosted decks"
on public.decks for select
using (true);

create policy "users can manage own decks"
on public.decks for insert
with check (auth.uid() = user_id);

create policy "users can update own decks"
on public.decks for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can delete own decks"
on public.decks for delete
using (auth.uid() = user_id);

create policy "users can manage own deck assets"
on public.deck_assets for all
using (
  exists (
    select 1 from public.decks
    where decks.id = deck_assets.deck_id and decks.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.decks
    where decks.id = deck_assets.deck_id and decks.user_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public)
values ('deck-assets', 'deck-assets', true)
on conflict (id) do nothing;
