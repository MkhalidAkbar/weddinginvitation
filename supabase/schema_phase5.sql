-- ============================================================
-- FASE 5 — Manajer Tamu (Guest List) + Link Personal + Viewer RSVP
-- Jalankan SETELAH schema.sql, schema_phase2/3/3b/4/4b.sql.
-- Aman dijalankan berkali-kali (idempotent).
-- ============================================================

-- 1) GUESTS : daftar tamu per undangan (dikelola pemilik di panel).
--    Link personal dibuat di sisi klien: ...?site=<slug>&to=<Nama>
--    sehingga TIDAK perlu dibaca publik (privasi tamu terjaga).
create table if not exists public.guests (
  id            uuid primary key default gen_random_uuid(),
  site_id       uuid references public.sites(id) on delete cascade,
  owner_id      uuid references auth.users(id) on delete set null default auth.uid(),
  name          text not null,
  category      text,                       -- VIP / Keluarga / Teman / dll
  invited_count int  not null default 1,    -- jumlah orang diundang
  phone         text,                        -- nomor WA (opsional)
  note          text,
  rsvp_status   text not null default 'pending', -- pending / hadir / tidak
  created_at    timestamptz not null default now()
);
create index if not exists guests_site_idx on public.guests (site_id);

alter table public.guests enable row level security;

-- Hanya pemilik undangan (atau admin) yang boleh MELIHAT & MENGELOLA tamu.
drop policy if exists guests_owner_all on public.guests;
create policy guests_owner_all on public.guests
  for all
  using (
    public.is_admin()
    or exists (select 1 from public.sites s
               where s.id = guests.site_id and s.owner_id = auth.uid())
  )
  with check (
    public.is_admin()
    or exists (select 1 from public.sites s
               where s.id = guests.site_id and s.owner_id = auth.uid())
  );

-- 2) (Opsional) Tandai RSVP yang masuk ke status tamu bila namanya cocok.
--    Dipanggil manual/otomatis; aman, hanya menyentuh baris milik pemilik via RLS.
create or replace function public.sync_guest_rsvp(p_site uuid)
returns int
language plpgsql
security invoker
as $$
declare n int := 0;
begin
  update public.guests g
     set rsvp_status = case
         when lower(coalesce(r.kehadiran,'')) ~ '(hadir|ya|yes|akan)' then 'hadir'
         when lower(coalesce(r.kehadiran,'')) ~ '(tidak|no|ber)' then 'tidak'
         else g.rsvp_status end
    from public.rsvp r
   where r.site_id = p_site
     and g.site_id = p_site
     and lower(trim(g.name)) = lower(trim(r.nama));
  get diagnostics n = row_count;
  return n;
end $$;
