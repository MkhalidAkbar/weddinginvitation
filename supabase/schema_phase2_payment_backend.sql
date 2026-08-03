-- ============================================================
-- FASE 2 — PAYMENT BACKEND HARDENING
-- Prasyarat: schema_phase1_security_hardening.sql sudah dijalankan.
-- Idempotent dan aman dijalankan ulang.
-- ============================================================

-- Identitas order yang mudah ditampilkan dan metadata lifecycle checkout.
alter table public.orders add column if not exists order_number text;
alter table public.orders add column if not exists checkout_started_at timestamptz not null default now();
create unique index if not exists orders_order_number_uidx on public.orders(order_number) where order_number is not null;
create index if not exists orders_owner_created_idx on public.orders(owner_id,created_at desc);
create index if not exists orders_pending_expiry_idx on public.orders(status,expires_at) where status='pending';

create or replace function public.assign_order_number()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.order_number is null then
    new.order_number := 'INV-' || to_char(coalesce(new.created_at,now()) at time zone 'Asia/Jakarta','YYYYMMDD') || '-' || upper(substr(replace(new.id::text,'-',''),1,8));
  end if;
  return new;
end; $$;
drop trigger if exists orders_assign_number on public.orders;
create trigger orders_assign_number before insert on public.orders for each row execute function public.assign_order_number();
update public.orders set order_number='INV-'||to_char(created_at at time zone 'Asia/Jakarta','YYYYMMDD')||'-'||upper(substr(replace(id::text,'-',''),1,8)) where order_number is null;

-- Menyimpan event callback terverifikasi untuk audit dan deduplikasi.
create table if not exists public.payment_events (
  id bigint generated always as identity primary key,
  provider text not null check(provider in('midtrans','xendit')),
  event_key text not null,
  order_id uuid references public.orders(id) on delete set null,
  status text,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now(),
  unique(provider,event_key)
);
create index if not exists payment_events_order_idx on public.payment_events(order_id,processed_at desc);
alter table public.payment_events enable row level security;
revoke all on public.payment_events from anon,authenticated;
drop policy if exists payment_events_admin_read on public.payment_events;
create policy payment_events_admin_read on public.payment_events for select using(public.is_admin());

-- Frontend hanya membaca order miliknya. Pembuatan/perubahan tetap melalui backend service role.
revoke insert,update,delete on public.orders from anon,authenticated;
grant select on public.orders to authenticated;
revoke insert,update,delete on public.site_entitlements from anon,authenticated;
grant select on public.site_entitlements to authenticated;

-- Hanya paket aktif yang dapat dibaca publik; perubahan paket oleh admin/service role.
grant select on public.plans to anon,authenticated;

-- Audit perubahan status order secara append-only.
create or replace function public.audit_order_status_change()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status is distinct from old.status then
    insert into public.security_audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(new.owner_id,'payment_status_'||new.status,'order',new.id::text,jsonb_build_object('from',old.status,'to',new.status,'site_id',new.site_id,'provider',new.provider));
  end if;
  return new;
end; $$;
drop trigger if exists orders_audit_status on public.orders;
create trigger orders_audit_status after update on public.orders for each row execute function public.audit_order_status_change();

-- Catatan endpoint:
-- POST /.netlify/functions/create-payment  (wajib Bearer token)
-- GET  /.netlify/functions/payment-status?site_id=<uuid> (wajib Bearer token)
-- POST /.netlify/functions/payment-webhook (signature/token provider)
