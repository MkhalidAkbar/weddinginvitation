-- PRIORITAS 3 — RSVP Lengkap
-- Jalankan setelah supabase/schema.sql dan schema_phase5.sql.
-- Aman dijalankan berulang kali.

alter table public.rsvp add column if not exists acara text;
alter table public.rsvp add column if not exists catatan text;
alter table public.rsvp add column if not exists updated_at timestamptz not null default now();

create index if not exists rsvp_site_status_idx on public.rsvp(site_id, kehadiran);
create index if not exists rsvp_site_event_idx on public.rsvp(site_id, acara);

create or replace function public.touch_rsvp_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end; $$;
drop trigger if exists rsvp_touch on public.rsvp;
create trigger rsvp_touch before update on public.rsvp
for each row execute function public.touch_rsvp_updated_at();

alter table public.rsvp enable row level security;

-- Pemilik undangan dapat memperbaiki jawaban tamu.
drop policy if exists rsvp_owner_update on public.rsvp;
create policy rsvp_owner_update on public.rsvp
for update using (
  exists(select 1 from public.sites s where s.id=rsvp.site_id and s.owner_id=auth.uid())
) with check (
  exists(select 1 from public.sites s where s.id=rsvp.site_id and s.owner_id=auth.uid())
);

-- Opsional: pemilik dapat menghapus respons duplikat/salah.
drop policy if exists rsvp_owner_delete on public.rsvp;
create policy rsvp_owner_delete on public.rsvp
for delete using (
  exists(select 1 from public.sites s where s.id=rsvp.site_id and s.owner_id=auth.uid())
);

-- Sinkronkan status RSVP daftar tamu berdasarkan respons terbaru dengan nama sama.
create or replace function public.sync_guest_rsvp(p_site uuid)
returns int language plpgsql security invoker as $$
declare n int:=0;
begin
  with latest as (
    select distinct on (lower(trim(x.nama)))
           lower(trim(x.nama)) as normalized_name, x.kehadiran
      from public.rsvp x
     where x.site_id=p_site
     order by lower(trim(x.nama)), x.created_at desc
  )
  update public.guests g
     set rsvp_status=case
       when lower(coalesce(r.kehadiran,'')) in ('hadir','ya','yes','akan hadir') then 'hadir'
       when lower(coalesce(r.kehadiran,'')) in ('ragu','belum pasti','maybe') then 'ragu'
       when lower(coalesce(r.kehadiran,'')) in ('tidak','tidak hadir','no') then 'tidak'
       else 'pending' end
    from latest r
   where g.site_id=p_site and lower(trim(g.name))=r.normalized_name;
  get diagnostics n=row_count;
  return n;
end $$;
