-- PRIORITAS 4 — Moderasi Ucapan dan Doa
-- Jalankan setelah schema dasar. Aman dijalankan berulang kali.

-- Pertahankan ucapan lama sebagai sudah disetujui saat migrasi pertama.
do $$
declare status_was_missing boolean;
begin
  select not exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='wishes' and column_name='status'
  ) into status_was_missing;
  alter table public.wishes add column if not exists status text;
  alter table public.wishes add column if not exists is_visible boolean;
  if status_was_missing then
    update public.wishes set status='approved',is_visible=true;
  end if;
end $$;
alter table public.wishes alter column status set default 'pending';
alter table public.wishes alter column is_visible set default false;
update public.wishes set status='pending' where status is null;
update public.wishes set is_visible=false where is_visible is null;
alter table public.wishes alter column status set not null;
alter table public.wishes alter column is_visible set not null;
alter table public.wishes add column if not exists is_pinned boolean not null default false;
alter table public.wishes add column if not exists reaction_heart integer not null default 0;
alter table public.wishes add column if not exists reaction_pray integer not null default 0;
alter table public.wishes add column if not exists reaction_smile integer not null default 0;
alter table public.wishes add column if not exists client_hash text;
alter table public.wishes add column if not exists reviewed_at timestamptz;
alter table public.wishes add column if not exists updated_at timestamptz not null default now();

create index if not exists wishes_site_status_idx on public.wishes(site_id,status,is_visible);
create index if not exists wishes_site_created_idx on public.wishes(site_id,created_at desc);

create or replace function public.touch_wishes_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;
drop trigger if exists wishes_touch on public.wishes;
create trigger wishes_touch before update on public.wishes for each row execute function public.touch_wishes_updated_at();

alter table public.wishes enable row level security;
revoke insert,select,update,delete on public.wishes from anon;
grant select,update,delete on public.wishes to authenticated;

drop policy if exists wishes_owner_select on public.wishes;
create policy wishes_owner_select on public.wishes for select using(exists(select 1 from public.sites s where s.id=wishes.site_id and s.owner_id=auth.uid()));
drop policy if exists wishes_owner_update on public.wishes;
create policy wishes_owner_update on public.wishes for update using(exists(select 1 from public.sites s where s.id=wishes.site_id and s.owner_id=auth.uid())) with check(exists(select 1 from public.sites s where s.id=wishes.site_id and s.owner_id=auth.uid()));
drop policy if exists wishes_owner_delete on public.wishes;
create policy wishes_owner_delete on public.wishes for delete using(exists(select 1 from public.sites s where s.id=wishes.site_id and s.owner_id=auth.uid()));

create table if not exists public.wish_reactions(
 id bigint generated always as identity primary key,
 wish_id bigint not null references public.wishes(id) on delete cascade,
 client_hash text not null,
 emoji text not null check(emoji in('heart','pray','smile')),
 created_at timestamptz not null default now(),
 unique(wish_id,client_hash,emoji)
);
alter table public.wish_reactions enable row level security;
revoke all on public.wish_reactions from anon,authenticated;

create or replace function public.submit_wish(p_site uuid,p_nama text,p_kehadiran text,p_pesan text,p_client_hash text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id bigint;v_now timestamptz:=now();
begin
 p_nama:=trim(coalesce(p_nama,''));p_pesan:=trim(coalesce(p_pesan,''));p_client_hash:=left(trim(coalesce(p_client_hash,'')),100);
 if length(p_nama)<2 or length(p_nama)>80 or length(p_pesan)<3 or length(p_pesan)>500 then raise exception 'Nama atau ucapan tidak valid';end if;
 if not exists(select 1 from public.sites where id=p_site and status='published') then raise exception 'Undangan tidak tersedia';end if;
 if exists(select 1 from public.wishes where site_id=p_site and client_hash=p_client_hash and created_at>v_now-interval '30 seconds') then raise exception 'Tunggu 30 detik sebelum mengirim lagi';end if;
 if (select count(*) from public.wishes where site_id=p_site and client_hash=p_client_hash and created_at>v_now-interval '1 hour')>=3 then raise exception 'Batas 3 ucapan per jam telah tercapai';end if;
 if exists(select 1 from public.wishes where site_id=p_site and lower(trim(nama))=lower(p_nama) and lower(trim(pesan))=lower(p_pesan) and created_at>v_now-interval '24 hours') then raise exception 'Ucapan yang sama sudah terkirim';end if;
 insert into public.wishes(site_id,nama,kehadiran,pesan,status,is_visible,client_hash) values(p_site,p_nama,left(coalesce(p_kehadiran,''),80),p_pesan,'pending',false,p_client_hash) returning id into v_id;
 return jsonb_build_object('ok',true,'id',v_id,'status','pending');
end $$;

create or replace function public.public_wishes(p_site uuid)
returns table(id bigint,nama text,kehadiran text,pesan text,created_at timestamptz,is_pinned boolean,reaction_heart integer,reaction_pray integer,reaction_smile integer)
language sql stable security definer set search_path=public as $$
 select w.id,w.nama,w.kehadiran,w.pesan,w.created_at,w.is_pinned,w.reaction_heart,w.reaction_pray,w.reaction_smile from public.wishes w
 where w.site_id=p_site and w.status='approved' and w.is_visible=true
 order by w.is_pinned desc,w.created_at desc limit 200
$$;

create or replace function public.react_to_wish(p_wish_id bigint,p_emoji text,p_client_hash text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare inserted_count int:=0;w public.wishes%rowtype;
begin
 if p_emoji not in('heart','pray','smile') then raise exception 'Reaction tidak valid';end if;
 if not exists(select 1 from public.wishes where id=p_wish_id and status='approved' and is_visible=true) then raise exception 'Ucapan tidak tersedia';end if;
 insert into public.wish_reactions(wish_id,client_hash,emoji) values(p_wish_id,left(coalesce(p_client_hash,''),100),p_emoji) on conflict do nothing;
 get diagnostics inserted_count=row_count;
 if inserted_count>0 then update public.wishes set reaction_heart=reaction_heart+case when p_emoji='heart' then 1 else 0 end,reaction_pray=reaction_pray+case when p_emoji='pray' then 1 else 0 end,reaction_smile=reaction_smile+case when p_emoji='smile' then 1 else 0 end where id=p_wish_id;end if;
 select * into w from public.wishes where id=p_wish_id;
 return jsonb_build_object('ok',true,'added',inserted_count>0,'heart',w.reaction_heart,'pray',w.reaction_pray,'smile',w.reaction_smile);
end $$;

grant execute on function public.submit_wish(uuid,text,text,text,text) to anon,authenticated;
grant execute on function public.public_wishes(uuid) to anon,authenticated;
grant execute on function public.react_to_wish(bigint,text,text) to anon,authenticated;
