-- ============================================================
-- FASE 1 SECURITY HARDENING — Wedding SaaS
-- Jalankan setelah schema_phase3b.sql dan seluruh schema_priority*.sql.
-- Idempotent: aman dijalankan ulang.
-- ============================================================

-- 1) Paket resmi: harga/fitur hanya dibaca dari server/database.
create table if not exists public.plans (
  id text primary key,
  name text not null,
  price numeric(14,2) not null check (price >= 0),
  duration_months int not null check (duration_months between 1 and 60),
  features jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.plans(id,name,price,duration_months,features,active) values
 ('basic','Basic',99000,6,'{"gallery":6,"guests":false,"upload":false,"watermark_disabled":false,"custom_domain":false}'::jsonb,true),
 ('premium','Premium',199000,12,'{"gallery":12,"guests":true,"upload":true,"watermark_disabled":false,"custom_domain":false}'::jsonb,true),
 ('exclusive','Exclusive',349000,24,'{"gallery":30,"guests":true,"upload":true,"watermark_disabled":true,"custom_domain":true}'::jsonb,true)
on conflict(id) do update set name=excluded.name,price=excluded.price,duration_months=excluded.duration_months,features=excluded.features,active=excluded.active,updated_at=now();
alter table public.plans enable row level security;
drop policy if exists plans_public_read on public.plans;
create policy plans_public_read on public.plans for select using(active=true);
drop policy if exists plans_admin_all on public.plans;
create policy plans_admin_all on public.plans for all using(public.is_admin()) with check(public.is_admin());

-- 2) Snapshot transaksi dan hak akses server-side.
alter table public.orders add column if not exists plan_id text references public.plans(id);
alter table public.orders add column if not exists plan_name_snapshot text;
alter table public.orders add column if not exists amount_snapshot numeric(14,2);
alter table public.orders add column if not exists duration_snapshot int;
alter table public.orders add column if not exists features_snapshot jsonb not null default '{}'::jsonb;
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists expires_at timestamptz;
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check(status in('pending','paid','failed','expired','cancelled','refunded','partially_refunded'));

create table if not exists public.site_entitlements (
  site_id uuid primary key references public.sites(id) on delete cascade,
  plan_id text not null references public.plans(id),
  order_id uuid references public.orders(id) on delete set null,
  active boolean not null default false,
  starts_at timestamptz,
  expires_at timestamptz,
  watermark_disabled boolean not null default false,
  custom_domain_enabled boolean not null default false,
  features jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_entitlements enable row level security;
drop policy if exists entitlements_owner_read on public.site_entitlements;
create policy entitlements_owner_read on public.site_entitlements for select using(
  public.is_admin() or exists(select 1 from public.sites s where s.id=site_entitlements.site_id and s.owner_id=auth.uid())
);
drop policy if exists entitlements_admin_all on public.site_entitlements;
create policy entitlements_admin_all on public.site_entitlements for all using(public.is_admin()) with check(public.is_admin());

-- 3) Audit append-only; frontend tidak boleh menulis/menghapus.
create table if not exists public.security_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists security_audit_action_idx on public.security_audit_logs(action,created_at desc);
alter table public.security_audit_logs enable row level security;
revoke all on public.security_audit_logs from anon,authenticated;
drop policy if exists audit_admin_read on public.security_audit_logs;
create policy audit_admin_read on public.security_audit_logs for select using(public.is_admin());

-- 4) Pemilik boleh mengedit konten, tetapi tidak boleh mengubah paket/status bayar.
alter table public.sites add column if not exists expiry_reminded_at timestamptz;
create or replace function public.enforce_site_client_fields()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  new.slug:=lower(trim(new.slug));
  if new.slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or length(new.slug) not between 3 and 80 then
    raise exception 'Slug tidak valid';
  end if;
  new.config:=coalesce(new.config,'{}'::jsonb)-array['paid','package','plan','noWatermark','entitlement','entitlements','serverEntitlement'];
  if auth.uid() is not null and not public.is_admin() and coalesce(current_setting('app.allow_privileged_site_update',true),'0')<>'1' then
    if tg_op='INSERT' then
      new.owner_id:=auth.uid(); new.package:='basic'; new.status:='draft';
      new.amount:=0; new.paid:=false; new.expires_at:=null; new.expiry_reminded_at:=null;
    else
      new.owner_id:=old.owner_id; new.package:=old.package; new.status:=old.status;
      new.amount:=old.amount; new.paid:=old.paid; new.expires_at:=old.expires_at;
      new.expiry_reminded_at:=old.expiry_reminded_at; new.subdomain:=old.subdomain;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists sites_security_guard on public.sites;
create trigger sites_security_guard before insert or update on public.sites for each row execute function public.enforce_site_client_fields();

drop policy if exists sites_public_read on public.sites;
drop policy if exists sites_owner_write on public.sites;
drop policy if exists sites_owner_insert on public.sites;
create policy sites_owner_insert on public.sites for insert to authenticated with check(owner_id=auth.uid());
drop policy if exists sites_owner_update on public.sites;
create policy sites_owner_update on public.sites for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
drop policy if exists sites_owner_delete on public.sites;
create policy sites_owner_delete on public.sites for delete to authenticated using(owner_id=auth.uid());

-- Order hanya dibuat serverless function. User hanya membaca order miliknya.
drop policy if exists orders_owner_insert on public.orders;
revoke insert,delete on public.orders from anon,authenticated;
grant select on public.orders to authenticated;
grant update on public.orders to authenticated; -- tetap dibatasi policy admin

-- 5) Entitlement mengikuti order yang tervalidasi webhook.
create or replace function public.sync_entitlement_from_order()
returns trigger language plpgsql security definer set search_path=public as $$
declare p public.plans%rowtype; v_exp timestamptz;
begin
  if new.site_id is null then return new; end if;
  if new.status='paid' and coalesce(old.status,'')<>'paid' then
    select * into p from public.plans where id=coalesce(new.plan_id,new.package) and active=true;
    if p.id is null then raise exception 'Plan tidak valid'; end if;
    v_exp:=now()+make_interval(months=>coalesce(new.duration_snapshot,new.months,p.duration_months));
    insert into public.site_entitlements(site_id,plan_id,order_id,active,starts_at,expires_at,watermark_disabled,custom_domain_enabled,features)
    values(new.site_id,p.id,new.id,true,now(),v_exp,coalesce((p.features->>'watermark_disabled')::boolean,false),coalesce((p.features->>'custom_domain')::boolean,false),p.features)
    on conflict(site_id) do update set plan_id=excluded.plan_id,order_id=excluded.order_id,active=true,starts_at=excluded.starts_at,expires_at=excluded.expires_at,watermark_disabled=excluded.watermark_disabled,custom_domain_enabled=excluded.custom_domain_enabled,features=excluded.features,updated_at=now();
    new.paid_at:=coalesce(new.paid_at,now());
    insert into public.security_audit_logs(actor_id,action,entity_type,entity_id,metadata) values(new.owner_id,'payment_paid','order',new.id::text,jsonb_build_object('site_id',new.site_id,'plan_id',p.id,'amount',new.amount));
  elsif new.status in('refunded','partially_refunded','cancelled') and old.status is distinct from new.status then
    update public.site_entitlements set active=false,updated_at=now() where site_id=new.site_id and order_id=new.id;
    insert into public.security_audit_logs(actor_id,action,entity_type,entity_id,metadata) values(new.owner_id,'payment_'||new.status,'order',new.id::text,jsonb_build_object('site_id',new.site_id));
  end if;
  return new;
end $$;
drop trigger if exists orders_entitlement_sync on public.orders;
create trigger orders_entitlement_sync before update on public.orders for each row execute function public.sync_entitlement_from_order();

-- 6) Endpoint publik minimal: config diproteksi dan entitlement disuntikkan server.
create or replace function public.public_site_payload(p_slug text)
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'id',s.id,
    'config',(s.config-array['paid','package','plan','noWatermark','entitlement','entitlements','serverEntitlement']) ||
      jsonb_build_object('noWatermark',coalesce(e.watermark_disabled,false),'serverEntitlement',jsonb_build_object('plan',coalesce(e.plan_id,'basic'),'active',coalesce(e.active,false),'expiresAt',e.expires_at))
  )
  from public.sites s
  left join public.site_entitlements e on e.site_id=s.id and e.active=true and (e.expires_at is null or e.expires_at>now())
  where s.slug=lower(trim(p_slug)) and s.status='published' and (s.expires_at is null or s.expires_at>now())
  limit 1
$$;
revoke all on function public.public_site_payload(text) from public;
grant execute on function public.public_site_payload(text) to anon,authenticated;

-- 7) RSVP publik hanya lewat RPC dengan validasi dan rate limit sederhana.
alter table public.rsvp add column if not exists client_hash text;
create index if not exists rsvp_rate_idx on public.rsvp(site_id,client_hash,created_at desc);
drop policy if exists rsvp_public_insert on public.rsvp;
revoke insert on public.rsvp from anon,authenticated;
create or replace function public.submit_rsvp(p_site uuid,p_nama text,p_kehadiran text,p_jumlah int,p_acara text,p_catatan text,p_client_hash text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id bigint; v_now timestamptz:=now();
begin
  p_nama:=trim(coalesce(p_nama,'')); p_kehadiran:=left(trim(coalesce(p_kehadiran,'')),40);
  p_acara:=nullif(left(trim(coalesce(p_acara,'')),80),''); p_catatan:=nullif(left(trim(coalesce(p_catatan,'')),500),'');
  p_client_hash:=left(trim(coalesce(p_client_hash,'')),100); p_jumlah:=greatest(0,least(coalesce(p_jumlah,0),20));
  if length(p_nama)<2 or length(p_nama)>100 then raise exception 'Nama tidak valid'; end if;
  if lower(p_kehadiran) not in('hadir','ragu','belum pasti','tidak','tidak hadir','ya','yes','no') then raise exception 'Status kehadiran tidak valid'; end if;
  if not exists(select 1 from public.sites where id=p_site and status='published' and (expires_at is null or expires_at>v_now)) then raise exception 'Undangan tidak tersedia'; end if;
  if p_client_hash='' then raise exception 'Identitas perangkat tidak valid'; end if;
  if exists(select 1 from public.rsvp where site_id=p_site and client_hash=p_client_hash and created_at>v_now-interval '20 seconds') then raise exception 'Tunggu sebelum mengirim lagi'; end if;
  if (select count(*) from public.rsvp where site_id=p_site and client_hash=p_client_hash and created_at>v_now-interval '1 hour')>=8 then raise exception 'Batas pengiriman RSVP tercapai'; end if;
  insert into public.rsvp(site_id,nama,kehadiran,jumlah,acara,catatan,client_hash) values(p_site,p_nama,p_kehadiran,p_jumlah,p_acara,p_catatan,p_client_hash) returning id into v_id;
  return jsonb_build_object('ok',true,'id',v_id);
end $$;
revoke all on function public.submit_rsvp(uuid,text,text,int,text,text,text) from public;
grant execute on function public.submit_rsvp(uuid,text,text,int,text,text,text) to anon,authenticated;

-- 8) Storage: pisahkan policy per aksi dan validasi ekstensi/MIME/ukuran.
drop policy if exists media_owner_write on storage.objects;
drop policy if exists media_owner_insert on storage.objects;
create policy media_owner_insert on storage.objects for insert to authenticated with check(
  bucket_id='media' and (storage.foldername(name))[1]=auth.uid()::text
  and lower(storage.extension(name)) in('jpg','jpeg','png','webp','mp3','wav','ogg','m4a')
  and coalesce(metadata->>'mimetype','') in('image/jpeg','image/png','image/webp','audio/mpeg','audio/mp3','audio/wav','audio/ogg','audio/mp4','audio/x-m4a')
  and case when coalesce(metadata->>'size','') ~ '^[0-9]+$' then (metadata->>'size')::bigint else 0 end between 1 and 15728640
);
drop policy if exists media_owner_update on storage.objects;
create policy media_owner_update on storage.objects for update to authenticated using(bucket_id='media' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='media' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists media_owner_delete on storage.objects;
create policy media_owner_delete on storage.objects for delete to authenticated using(bucket_id='media' and (storage.foldername(name))[1]=auth.uid()::text);

-- Catatan: server/service_role melewati RLS. Jangan pernah menaruh service role key di frontend.


-- Pemilik boleh menonaktifkan publikasi, tetapi aktivasi kembali hanya lewat pembayaran/admin.
create or replace function public.owner_set_site_draft(p_site uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null or not exists(select 1 from public.sites where id=p_site and owner_id=auth.uid()) then
    raise exception 'not authorized';
  end if;
  perform set_config('app.allow_privileged_site_update','1',true);
  update public.sites set status='draft' where id=p_site and owner_id=auth.uid();
  insert into public.security_audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'site_unpublished','site',p_site::text);
  return found;
end $$;
revoke all on function public.owner_set_site_draft(uuid) from public;
grant execute on function public.owner_set_site_draft(uuid) to authenticated;
