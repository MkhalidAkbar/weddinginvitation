-- ============================================================
-- FASE 4 — Master style baru: LUXURY GOLD (+ 5 palet warna)
-- Jalankan SETELAH schema.sql, schema_phase2.sql, schema_phase3.sql.
-- Aman diulang (idempotent).
-- Setelah menjalankan ini, daftarkan file di index.html TEMPLATES:
--   'luxury-gold':'undangan-luxury-gold.html'   (sudah ada)
-- ============================================================

insert into public.themes (id, nama, preview_url, template_file, sort, active, palettes)
values (
  'luxury-gold',
  'Luxury Gold',
  '',
  'undangan-luxury-gold.html',
  20, true,
  '[
    {"id":"classic-gold","name":"Classic Gold","colors":{"sage":"#C7A052","sageDark":"#0C0A06","gold":"#D9B45B","goldSoft":"#EBD08A","blush":"#C99C6A","ivory":"#14110B","cream":"#1E1810","ink":"#F3E9D2","inkSoft":"#B9A985"}},
    {"id":"rose-gold","name":"Rose Gold","colors":{"sage":"#D89B8B","sageDark":"#100A08","gold":"#E4B08A","goldSoft":"#F0CBB0","blush":"#E0A98F","ivory":"#17110E","cream":"#221812","ink":"#F6E7DD","inkSoft":"#C2A493"}},
    {"id":"champagne","name":"Champagne","colors":{"sage":"#CDBB8E","sageDark":"#0E0C08","gold":"#E4D2A0","goldSoft":"#F1E6C4","blush":"#D8C7A0","ivory":"#16130C","cream":"#211C12","ink":"#F5EEDC","inkSoft":"#C3B594"}},
    {"id":"emerald-gold","name":"Emerald & Gold","colors":{"sage":"#3E7A63","sageDark":"#07120D","gold":"#D9B45B","goldSoft":"#EBD08A","blush":"#7FB39A","ivory":"#0B140F","cream":"#12201A","ink":"#EAF3EC","inkSoft":"#9CB6A8"}},
    {"id":"burgundy-gold","name":"Royal Burgundy & Gold","colors":{"sage":"#9E4B57","sageDark":"#120608","gold":"#D9B45B","goldSoft":"#EBD08A","blush":"#C77E88","ivory":"#140A0C","cream":"#201014","ink":"#F5E4E6","inkSoft":"#C29AA0"}}
  ]'::jsonb
)
on conflict (id) do update set
  nama=excluded.nama, template_file=excluded.template_file,
  sort=excluded.sort, active=excluded.active, palettes=excluded.palettes;

-- ============================================================
-- SELESAI. Perpustakaan tema kini punya 2 style:
--   1) Elegant Floral (5 palet)   2) Luxury Gold (5 palet)
-- Pembeli bisa memilih style + palet di tab "Tampilan" panel.
-- ============================================================
