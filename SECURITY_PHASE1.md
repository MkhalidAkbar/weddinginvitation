# Fase 1 — Security Hardening

Fondasi ini harus diterapkan sebelum mengaktifkan production key Midtrans atau Xendit.

## Perubahan yang disiapkan

- Harga dan durasi paket ditentukan server, bukan dari browser.
- Pembuatan transaksi memverifikasi token dan kepemilikan undangan.
- Webhook memverifikasi signature/token, nominal, provider, dan transisi status.
- Webhook idempotent; callback ganda tidak mengaktifkan paket dua kali.
- Model `plans`, `site_entitlements`, snapshot order, dan audit log.
- Kolom `paid`, `package`, `status`, masa aktif, dan entitlement dilindungi dari perubahan klien.
- Config publik dilayani melalui RPC minimal dan `noWatermark` disuntikkan dari entitlement server.
- RSVP menggunakan RPC tervalidasi dengan batas panjang dan rate limit perangkat.
- Upload dibatasi MIME, ukuran, ekstensi, folder pemilik, serta nama file acak.
- Rendering nama, orang tua, lokasi, galeri, dan tautan dipersempit untuk mengurangi risiko XSS.
- Security headers ditambahkan dalam mode CSP Report-Only agar dapat dievaluasi tanpa merusak produksi.

## Urutan penerapan Supabase

1. Buat backup database.
2. Pastikan schema sebelumnya sudah terpasang, khususnya `schema.sql`, `schema_phase2.sql`, `schema_phase3b.sql`, `schema_priority3_rsvp.sql`, dan `schema_priority4_wishes.sql`.
3. Jalankan `supabase/schema_phase1_security_hardening.sql` di SQL Editor Supabase.
4. Verifikasi policy melalui Database > Policies.
5. Uji akun client: membuat draft, menyimpan konten, membaca RSVP, dan mengupload media.
6. Pastikan client tidak dapat mengubah `paid`, `package`, `status`, `expires_at`, atau `noWatermark` lewat REST.

## Environment Netlify

Wajib:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
PUBLIC_BASE_URL
PAYMENT_PROVIDER=midtrans|xendit
```

Midtrans sandbox:

```text
MIDTRANS_SERVER_KEY
MIDTRANS_IS_PRODUCTION=false
```

Xendit sandbox:

```text
XENDIT_SECRET_KEY
XENDIT_CALLBACK_TOKEN
```

Jangan menaruh service role, server key, atau callback token di `db-config.js`, HTML, maupun JavaScript frontend.

## Gate sebelum production payment

- Jalankan seluruh pembayaran dalam sandbox.
- Uji nominal yang dimanipulasi dari DevTools.
- Uji `site_id` milik akun lain.
- Uji webhook ganda dan webhook out-of-order.
- Uji payment berhasil, pending, failed, expired, cancelled, refund, dan partial refund.
- Pantau laporan CSP kemudian pindahkan dari Report-Only ke enforced policy setelah semua sumber valid terdaftar.
- Production key baru boleh diaktifkan setelah semua pengujian lulus.
