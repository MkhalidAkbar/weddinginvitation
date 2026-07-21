# Undangan Pernikahan Digital — SaaS (Netlify + Supabase)

Paket ini sudah siap deploy. Alurnya: **push ke GitHub → connect ke Netlify → setup Supabase**.

## 📁 Struktur file

| File | Fungsi | Ini yang dibuka siapa |
|------|--------|-----------------------|
| `index.html` | **Router / homepage** — baca `?site=slug`, arahkan ke style yang benar (elegant / luxury), teruskan `?to=Nama` | Tamu (pintu masuk utama) |
| `undangan-template-db.html` | Style **Elegant Floral** | Tamu (dipilih router) |
| `undangan-luxury-gold.html` | Style **Luxury Gold** | Tamu (dipilih router) |
| `panel.html` | **Panel klien** — edit konten, tampilan, tema, media, tab **Tamu** (guest list + link personal + viewer RSVP) | Pembeli/klien |
| `admin.html` | **Panel admin kamu** — kelola undangan, order, analitik, perpustakaan tema & lagu | Kamu (pemilik bisnis) |
| `db.js` | Helper koneksi Supabase (frontend) | — |
| `db-config.js` | Berisi **Supabase URL + anon key** (AMAN dipublik, dilindungi RLS) | — |
| `netlify.toml` | Konfigurasi Netlify + jadwal cron expiry | — |
| `netlify/functions/` | Fungsi server: `create-payment`, `payment-webhook`, `expiry-cron` | — |
| `supabase/*.sql` | Skema database — **dijalankan di Supabase SQL Editor**, TIDAK dibuka lewat web | Kamu (sekali setup) |

> **Penting:** `index.html` = homepage. Kalau seseorang buka domain tanpa `?site=`, router pakai template default. Setiap klien punya subdomain/slug sendiri, jadi database antar-website tetap terpisah lewat kolom `site_id` + RLS Supabase.

## 🚀 1. Deploy ke GitHub (GRATIS, 0 credit)

Mpush ke GitHub **tidak memicu build apa pun** — jadi aman, credit Netlify tidak kepakai sampai kamu connect.

```bash
cd deploy
git init
git add .
git commit -m "Undangan pernikahan SaaS"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```

Disarankan buat repo **Private**.

## 🌐 2. Connect ke Netlify

1. Netlify → **Add new site → Import from Git → pilih repo** ini.
2. Build command: **kosongkan** (situs statik). Publish directory: **`.`** (root).
3. Deploy. Netlify free tier: 300 menit build/bln, 100GB bandwidth, 125k function request/bln — situs statik nyaris tak makan apa-apa.

## 🗄️ 3. Setup Supabase

1. Buat project di Supabase (free tier cukup untuk mulai).
2. Buka **SQL Editor**, jalankan file `supabase/` berurutan:
   `schema.sql` → `schema_phase2.sql` → `schema_phase3.sql` → `schema_phase3b.sql` → `schema_phase4.sql` → `schema_phase4b.sql` → `schema_phase5.sql`, lalu `seed.sql` (opsional data awal).
3. Salin **Project URL** + **anon key** ke `db-config.js`.
4. Jadikan diri kamu admin: `update public.profiles set role='admin' where email='EMAIL-KAMU';`

## 🔐 4. Environment Variables di Netlify

Set di **Site settings → Environment variables** (JANGAN taruh di file frontend / repo):

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...   # RAHASIA — hanya untuk Netlify Functions, jangan pernah ke frontend
PAYMENT_PROVIDER=midtrans        # atau xendit
MIDTRANS_SERVER_KEY=...
MIDTRANS_IS_PRODUCTION=false
XENDIT_SECRET_KEY=...
XENDIT_CALLBACK_TOKEN=...
PUBLIC_BASE_URL=https://domainkamu.com
```

## ⚠️ Catatan keamanan
- `db-config.js` (anon key) **aman** dipublik — memang dirancang publik, dilindungi RLS.
- `SUPABASE_SERVICE_ROLE_KEY` & key pembayaran **HANYA** di env var Netlify, tidak pernah di file frontend/repo.
