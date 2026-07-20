-- ============================================================
-- FASE 3B — Panel Admin, Pembayaran Otomatis & Subdomain
-- Jalankan SETELAH schema.sql, schema_phase2.sql, schema_phase3.sql.
-- Aman dijalankan berkali-kali (idempotent).
-- ============================================================

-- 1) PROFILES : role tiap user (client|admin). Dibuat otomatis saat signup.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  role       text not null default 'client' check (role in ('client','admin')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Buat baris profile otomatis untuk setiap user baru
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: apakah user yang login seorang admin? (security definer -> hindari rekursi RLS)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.role = 'admin');
$$;

-- User boleh membaca profilnya sendiri; admin boleh membaca semua
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (id = auth.uid() or public.is_admin());
-- User boleh update profil sendiri TAPI tidak boleh menaikkan role sendiri jadi admin
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = 'client');
-- Admin boleh mengubah role siapa pun
drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- 2) SITES : tambah kolom untuk subdomain & paket (idempotent)
alter table public.sites add column if not exists subdomain  text unique;
alter table public.sites add column if not exists amount     numeric default 0;
alter table public.sites add column if not exists paid       boolean default false;

-- 3) ORDERS : satu baris = satu transaksi pembelian undangan
create table if not exists public.orders (
  id           uuid primary key default gen_random_uuid(),
  site_id      uuid references public.sites(id) on delete set null,
  owner_id     uuid references auth.users(id) on delete set null,
  package      text not null default 'basic',
  amount       numeric not null default 0,
  currency     text not null default 'IDR',
  status       text not null default 'pending'
               check (status in ('pending','paid','failed','expired','refunded')),
  provider     text,                       -- 'midtrans' | 'xendit'
  provider_ref text,                       -- order_id / invoice id di provider
  payment_url  text,                       -- link bayar (Snap/Invoice)
  months       int default 12,             -- masa aktif yang dibeli
  raw          jsonb default '{}'::jsonb,   -- payload mentah dari provider
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists orders_owner_idx on public.orders (owner_id);
create index if not exists orders_site_idx  on public.orders (site_id);
create index if not exists orders_ref_idx   on public.orders (provider_ref);
drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

alter table public.orders enable row level security;
-- Pemilik boleh membaca ordernya sendiri; admin semua
drop policy if exists orders_owner_read on public.orders;
create policy orders_owner_read on public.orders
  for select using (owner_id = auth.uid() or public.is_admin());
-- Pemilik boleh membuat order untuk dirinya sendiri
drop policy if exists orders_owner_insert on public.orders;
create policy orders_owner_insert on public.orders
  for insert with check (owner_id = auth.uid());
-- Hanya admin (atau service role via webhook) yang boleh mengubah status order
drop policy if exists orders_admin_write on public.orders;
create policy orders_admin_write on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

-- 4) ADMIN RLS : admin bisa kelola SEMUA sites, themes, songs
drop policy if exists sites_admin_all on public.sites;
create policy sites_admin_all on public.sites
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists themes_admin_all on public.themes;
create policy themes_admin_all on public.themes
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists songs_admin_all on public.songs;
create policy songs_admin_all on public.songs
  for all using (public.is_admin()) with check (public.is_admin());

-- themes/songs: pembaca publik hanya yang aktif (themes belum punya filter active -> tambahkan)
drop policy if exists themes_public_read on public.themes;
create policy themes_public_read on public.themes
  for select using (active is true or active is null);

-- 5) AKTIVASI OTOMATIS : saat order menjadi 'paid', publish site + set masa aktif.
--    Dipanggil trigger; berjalan sebagai definer agar webhook (service role) bisa update site.
create or replace function public.activate_site_on_paid()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'paid' and coalesce(old.status,'') <> 'paid' and new.site_id is not null then
    update public.sites
       set status     = 'published',
           paid       = true,
           package    = coalesce(new.package, package),
           amount     = coalesce(new.amount, amount),
           expires_at = coalesce(expires_at, now()) + make_interval(months => coalesce(new.months,12))
     where id = new.site_id;
  end if;
  return new;
end; $$;
drop trigger if exists orders_activate on public.orders;
create trigger orders_activate after update on public.orders
  for each row execute function public.activate_site_on_paid();

-- 6) (Opsional) Jadikan diri Anda admin. Ganti email di bawah, lalu jalankan:
--    update public.profiles set role='admin' where email = 'email-anda@contoh.com';

-- ============================================================
-- SELESAI. Set env berikut di Netlify (Site settings > Environment):
--   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
--   PAYMENT_PROVIDER (midtrans|xendit),
--   MIDTRANS_SERVER_KEY  atau  XENDIT_SECRET_KEY,
--   MIDTRANS_IS_PRODUCTION (true|false)
-- lalu deploy folder netlify/functions.
-- ============================================================
