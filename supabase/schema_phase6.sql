-- ============================================================
-- FASE 6: Registry Template (katalog layout undangan)
-- ------------------------------------------------------------
-- Tujuan: memindahkan daftar template dari hardcode di panel.html/index.html
-- menjadi tabel yang bisa dibaca front-end. Setiap layout = 1 file HTML
-- terpisah + shared app.js. Menambah template baru = INSERT baris di sini
-- (tanpa mengubah kode panel/router setelah loader dinamis aktif).
-- Jalankan SETELAH schema.sql (butuh fungsi is_admin() dari fase 3B).
-- ============================================================

create table if not exists public.templates (
  id             text primary key,          -- style id, mis. 'garden-botanical'
  name           text not null,             -- nama tampil di Perpustakaan
  file           text not null,             -- file HTML, mis. 'undangan-botani.html'
  cover          text default '',           -- jenis cover: botanical|frame|stamp|minimal|wave
  default_layout text default '',           -- galeri bawaan: ''|grid|mosaic|masonry|film|collage|polaroid
  theme          jsonb default '{}'::jsonb, -- {cream,ink,gold,sage,blush}
  palettes       jsonb default '[]'::jsonb, -- array id palet yang tersedia
  tags           text[] default '{}',       -- label kategori
  sort           int  default 100,          -- urutan tampil
  active         boolean default true,      -- sembunyikan tanpa menghapus
  created_at     timestamptz default now()
);

-- RLS: semua orang boleh MEMBACA template aktif; hanya admin boleh menulis.
alter table public.templates enable row level security;

drop policy if exists templates_read on public.templates;
create policy templates_read on public.templates
  for select using (active = true);

drop policy if exists templates_admin_all on public.templates;
create policy templates_admin_all on public.templates
  for all using (is_admin()) with check (is_admin());

-- ------------------------------------------------------------
-- SEED: 3 template awal + 5 template batch-1
-- ------------------------------------------------------------
insert into public.templates (id,name,file,cover,default_layout,theme,palettes,tags,sort,active) values
 ('elegant-floral','Elegant Floral','undangan-template-db.html','botanical','',
   '{"cream":"#F3F1E7","ink":"#3f4a3a","gold":"#C9A24B","sage":"#8A9A82","blush":"#DDE6D5"}',
   '["sage-gold","rose-blush","mauve","navy-gold","emerald-gold","terracotta"]','{Floral,Romantis,Klasik}',1,true),
 ('modern-editorial','Aurora Editorial','undangan-modern.html','minimal','',
   '{"cream":"#fbfaf7","ink":"#211d19","gold":"#b0894e","sage":"#7d8a72","blush":"#ecdfd4"}',
   '["aurora-sand","mono-ink","olive-editorial","dusty-rose","slate-blue"]','{Modern,Minimalis,Editorial}',2,true),
 ('luxury-gold','Luxury Gold','undangan-luxury-gold.html','frame','',
   '{"cream":"#2a2117","ink":"#efe6d2","gold":"#d9b45a","sage":"#8a6d2e","blush":"#0d0a06"}',
   '["classic-gold","rose-gold","emerald-gold","champagne","burgundy-gold"]','{Mewah,Eksklusif,Dramatis}',3,true),
 ('garden-botanical','Taman Botani','undangan-botani.html','botanical','masonry',
   '{"cream":"#f6f4ea","ink":"#3b3f34","gold":"#a98b52","sage":"#7c8a6f","blush":"#e7d8d0"}',
   '["garden-sage","fresh-eucalyptus","dusty-olive","rose-garden"]','{Botani,Segar,Romantis}',4,true),
 ('midnight-luxe','Midnight Luxe','undangan-midnight.html','frame','collage',
   '{"cream":"#0d1020","ink":"#ece7db","gold":"#c9a24b","sage":"#8a6d28","blush":"#2a3350"}',
   '["midnight-gold","royal-emerald","plum-noir","steel-navy"]','{Gelap,Mewah,Elegan}',5,true),
 ('rustic-terracotta','Rustic Terracotta','undangan-terracotta.html','stamp','polaroid',
   '{"cream":"#f7ece0","ink":"#43342a","gold":"#bd7d43","sage":"#b5623a","blush":"#e9c9a8"}',
   '["terracotta-sand","clay-olive","warm-brick","honey-caramel"]','{Rustic,Hangat,Earthy}',6,true),
 ('blush-minimal','Blush Minimalis','undangan-blush.html','minimal','grid',
   '{"cream":"#ffffff","ink":"#40383a","gold":"#b98e79","sage":"#c79a9a","blush":"#f5e7e3"}',
   '["blush-nude","soft-greige","powder-pink","lilac-mist"]','{Minimalis,Bersih,Modern}',7,true),
 ('ocean-breeze','Ocean Breeze','undangan-ocean.html','wave','film',
   '{"cream":"#f2f8f7","ink":"#2c3a3a","gold":"#c2a34e","sage":"#4f8a86","blush":"#cfe6e2"}',
   '["ocean-teal","deep-lagoon","sky-aqua","sage-mint"]','{Teal,Segar,Pantai}',8,true)
on conflict (id) do update set
  name=excluded.name, file=excluded.file, cover=excluded.cover,
  default_layout=excluded.default_layout, theme=excluded.theme,
  palettes=excluded.palettes, tags=excluded.tags, sort=excluded.sort, active=excluded.active;
