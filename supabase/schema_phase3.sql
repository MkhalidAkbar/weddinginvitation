-- ============================================================
-- FASE 3A — Perpustakaan Style/Tema + Perpustakaan Lagu
-- Jalankan SETELAH schema.sql dan schema_phase2.sql. Aman diulang.
-- ============================================================

-- 1) themes: tambah kolom untuk style library (idempotent)
alter table public.themes add column if not exists template_file text;
alter table public.themes add column if not exists palettes      jsonb default '[]'::jsonb;
alter table public.themes add column if not exists sort          int default 100;
alter table public.themes add column if not exists active        boolean default true;

-- 2) songs: perpustakaan lagu (admin isi; pembeli pilih atau upload sendiri)
create table if not exists public.songs (
  id         text primary key,
  nama       text not null,
  artist     text,
  url        text not null,
  sort       int default 100,
  active     boolean default true,
  created_at timestamptz not null default now()
);
alter table public.songs enable row level security;
drop policy if exists songs_public_read on public.songs;
create policy songs_public_read on public.songs
  for select using (active = true);

-- 3) Seed STYLE pertama: Elegant Floral (template yang sudah ada) + 5 palet warna
insert into public.themes (id, nama, preview_url, template_file, sort, active, palettes)
values (
  'elegant-floral',
  'Elegant Floral',
  '',
  'undangan-template-db.html',
  10, true,
  '[
    {"id":"sage-gold","name":"Sage & Gold","colors":{"sage":"#8A9A82","sageDark":"#5F6E58","gold":"#C9A24B","goldSoft":"#E7D6A8","blush":"#E7C6C2","ivory":"#FBF8F3","cream":"#F4ECE0","ink":"#40372F","inkSoft":"#6E6258"}},
    {"id":"dusty-rose","name":"Dusty Rose","colors":{"sage":"#C08497","sageDark":"#8E5A6B","gold":"#C9A24B","goldSoft":"#EBD9B4","blush":"#F0D4D9","ivory":"#FCF6F5","cream":"#F6E7E4","ink":"#4A353A","inkSoft":"#7A626A"}},
    {"id":"navy-gold","name":"Navy & Gold","colors":{"sage":"#38506B","sageDark":"#24384E","gold":"#C9A24B","goldSoft":"#E7D6A8","blush":"#AFC1D6","ivory":"#F6F8FB","cream":"#E7EDF3","ink":"#26303B","inkSoft":"#54606E"}},
    {"id":"terracotta","name":"Terracotta","colors":{"sage":"#C06E52","sageDark":"#8F4B34","gold":"#C9922F","goldSoft":"#EAD6A6","blush":"#E9C7A8","ivory":"#FBF6F1","cream":"#F3E6D8","ink":"#432E23","inkSoft":"#7A5E4E"}},
    {"id":"mauve-lavender","name":"Mauve Lavender","colors":{"sage":"#9784B0","sageDark":"#6C5A85","gold":"#C9A24B","goldSoft":"#E7D6A8","blush":"#DAD0EA","ivory":"#F9F7FC","cream":"#ECE6F3","ink":"#372F44","inkSoft":"#655C74"}}
  ]'::jsonb
)
on conflict (id) do update set
  nama=excluded.nama, template_file=excluded.template_file,
  sort=excluded.sort, active=excluded.active, palettes=excluded.palettes;

-- 4) Contoh baris lagu (nonaktif sampai Anda isi url-nya).
--    Cara menambah lagu ke perpustakaan:
--    insert into public.songs (id,nama,artist,url,sort,active)
--    values ('lagu-1','Judul Lagu','Artis','https://.../lagu.mp3',10,true);
insert into public.songs (id, nama, artist, url, sort, active) values
  ('contoh-romantic','Romantic Piano (contoh)','—','', 10, false),
  ('contoh-acoustic','Acoustic Love (contoh)','—','', 20, false)
on conflict (id) do nothing;

-- ============================================================
-- SELESAI. Perpustakaan tema kini punya 1 style (Elegant Floral)
-- dengan 5 palet. Tambahkan style/master baru dengan INSERT ke
-- public.themes (isi template_file dengan nama file HTML style itu),
-- lalu daftarkan file-nya di TEMPLATES pada index.html.
-- ============================================================
