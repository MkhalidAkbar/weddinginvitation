-- ============================================================
-- FASE 1 — SKEMA DATABASE PLATFORM UNDANGAN (Supabase / PostgreSQL)
-- Cara pakai: Supabase Dashboard > SQL Editor > New query >
--            tempel seluruh isi file ini > Run.
-- Aman dijalankan berkali-kali (idempotent).
-- ============================================================

-- 1) SITES : satu baris = satu undangan (satu tenant)
create table if not exists public.sites (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,                 -- mis. 'sekar-bimo' (dipakai di URL)
  owner_id    uuid references auth.users(id) on delete set null,
  package     text default 'basic',
  status      text not null default 'draft'
              check (status in ('draft','published','expired')),
  theme_id    text,
  config      jsonb not null default '{}'::jsonb,   -- SELURUH isi WEDDING_CONFIG
  expires_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists sites_slug_idx  on public.sites (slug);
create index if not exists sites_owner_idx on public.sites (owner_id);

-- 2) RSVP : konfirmasi kehadiran (hanya pemilik yang bisa baca)
create table if not exists public.rsvp (
  id         bigint generated always as identity primary key,
  site_id    uuid not null references public.sites(id) on delete cascade,
  nama       text not null,
  kehadiran  text,
  jumlah     int default 1,
  catatan    text,
  created_at timestamptz not null default now()
);
create index if not exists rsvp_site_idx on public.rsvp (site_id);

-- 3) WISHES : ucapan & doa (ditampilkan publik di undangan)
create table if not exists public.wishes (
  id         bigint generated always as identity primary key,
  site_id    uuid not null references public.sites(id) on delete cascade,
  nama       text not null,
  kehadiran  text,
  pesan      text not null,
  created_at timestamptz not null default now()
);
create index if not exists wishes_site_idx on public.wishes (site_id);

-- 4) THEMES : perpustakaan tema (dipakai penuh di Fase 3)
create table if not exists public.themes (
  id             text primary key,
  nama           text not null,
  preview_url    text,
  config_default jsonb default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

-- 5) updated_at otomatis saat sites di-update
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists sites_touch on public.sites;
create trigger sites_touch before update on public.sites
  for each row execute function public.touch_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — INTI MULTI-TENANT YANG AMAN
-- Isolasi ditegakkan DATABASE, bukan sekadar filter di kode.
-- ============================================================
alter table public.sites  enable row level security;
alter table public.rsvp   enable row level security;
alter table public.wishes enable row level security;
alter table public.themes enable row level security;

-- ---------- SITES ----------
-- Publik hanya boleh membaca undangan yang SUDAH published
drop policy if exists sites_public_read on public.sites;
create policy sites_public_read on public.sites
  for select using (status = 'published');

-- Pemilik boleh membaca semua miliknya (termasuk draft)
drop policy if exists sites_owner_read on public.sites;
create policy sites_owner_read on public.sites
  for select using (auth.uid() = owner_id);

-- Pemilik boleh insert/update/delete HANYA miliknya sendiri
drop policy if exists sites_owner_write on public.sites;
create policy sites_owner_write on public.sites
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ---------- RSVP ----------
-- Siapa pun boleh mengirim RSVP ke undangan yang published
drop policy if exists rsvp_public_insert on public.rsvp;
create policy rsvp_public_insert on public.rsvp
  for insert with check (
    exists (select 1 from public.sites s
            where s.id = site_id and s.status = 'published'));

-- Hanya pemilik undangan yang boleh MELIHAT daftar RSVP
drop policy if exists rsvp_owner_read on public.rsvp;
create policy rsvp_owner_read on public.rsvp
  for select using (
    exists (select 1 from public.sites s
            where s.id = site_id and s.owner_id = auth.uid()));

-- ---------- WISHES ----------
-- Siapa pun boleh mengirim ucapan ke undangan published
drop policy if exists wishes_public_insert on public.wishes;
create policy wishes_public_insert on public.wishes
  for insert with check (
    exists (select 1 from public.sites s
            where s.id = site_id and s.status = 'published'));

-- Ucapan tampil publik di undangan published
drop policy if exists wishes_public_read on public.wishes;
create policy wishes_public_read on public.wishes
  for select using (
    exists (select 1 from public.sites s
            where s.id = site_id and s.status = 'published'));

-- ---------- THEMES ----------
drop policy if exists themes_public_read on public.themes;
create policy themes_public_read on public.themes
  for select using (true);

-- ============================================================
-- SELESAI. Selanjutnya jalankan seed.sql untuk memasukkan
-- undangan pertama (Sekar & Bimo) sebagai contoh tenant.
-- ============================================================
