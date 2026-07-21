# Undangan Pernikahan SaaS — Paket File (Update Bugfix)

Tanggal update: 21 Juli 2026

## Yang diperbaiki di update ini

### 1. Undangan tidak bisa dibuka & tata letak foto tidak berubah (SATU akar masalah)
Seluruh script undangan dibungkus:
```js
(window.__configReady || Promise.resolve()).then(function(){ ...seluruh app... })
```
Saat situs live mencoba mengambil config dari **Supabase** dan gagal (kredensial
kosong / baris situs belum ada / jaringan), `__configReady` **reject atau
menggantung**, sehingga blok `.then()` **tidak pernah jalan**. Akibatnya:
- Tombol **“Buka Undangan”** mati (handler klik tak terpasang).
- **Tata letak galeri** tidak berubah (config dari panel tak pernah diterapkan).
- Preview tetap terlihat “hidup” karena nama default (SEKAR & BIMO) memang
  tertanam di HTML statis — padahal JS-nya mati.

**Perbaikan (2 lapis):**
1. Boot sekarang tahan-banting:
   ```js
   Promise.race([
     Promise.resolve(window.__configReady).catch(function(){}),
     new Promise(function(r){ setTimeout(r, 1200); })
   ]).then(function(){ ...app... });
   ```
   App **selalu** jalan (resolve, reject, atau hang) — undangan selalu bisa dibuka.
2. `db.js` ditulis ulang agar **selalu** me-resolve `window.__configReady`
   (timeout keras 4 dtk + `.catch`), tak peduli Supabase gagal/kosong.

Diterapkan pada: `app.js`, `undangan-template-db.html`, `undangan-modern.html`,
`undangan-luxury-gold.html` (5 template baru memakai `app.js`).

## Isi paket
- `index.html` — router pemilih template
- `panel.html` — panel klien (editor + preview + Perpustakaan)
- `app.js` — runtime bersama untuk 5 template baru
- `db.js`, `db-config.js` — lapisan data Supabase (isi kredensial di `db-config.js`)
- Template (8):
  - `undangan-template-db.html` (Elegant Floral)
  - `undangan-modern.html`, `undangan-luxury-gold.html`
  - `undangan-botani.html`, `undangan-midnight.html`, `undangan-terracotta.html`,
    `undangan-blush.html`, `undangan-ocean.html` (batch baru)
- `templates.json` — manifest 8 template
- `supabase/schema_phase6.sql` — tabel `templates` + RLS + seed

## Konfigurasi Supabase
Isi `db-config.js`:
```js
window.WEDDING_DB_CONFIG = { url: 'https://xxx.supabase.co', anonKey: 'eyJ...', defaultSlug: 'sekar-bimo' };
```
Kosongkan `url`/`anonKey` untuk mode demo (tanpa backend).
