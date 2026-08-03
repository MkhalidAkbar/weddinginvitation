# Fase 2–3 — Payment Backend dan UI Pembayaran

## Yang sudah disiapkan

### Fase 2 — Backend pembayaran
- Paket dan harga resmi dibaca backend dari tabel `plans`.
- Pembuatan order membutuhkan Supabase access token dan memverifikasi pemilik `site_id`.
- Pending order yang masih berlaku digunakan kembali agar tidak membuat transaksi ganda.
- Rate limit pembuatan transaksi, validasi origin, ukuran request, UUID, dan input pelanggan.
- Midtrans/Xendit hanya dipanggil dari Netlify Functions; server key tidak berada di browser.
- Webhook memverifikasi signature Midtrans atau callback token Xendit, nominal, provider, dan transisi status.
- Entitlement tetap diaktifkan oleh trigger server-side setelah status `paid` tervalidasi.
- Riwayat callback terverifikasi disimpan di `payment_events`; audit perubahan status disimpan di `security_audit_logs`.

### Fase 3 — UI pembayaran
- Alur Selesai → Checklist → Login (jika belum masuk) → Halaman Pembayaran.
- Halaman pembayaran menampilkan paket resmi, ringkasan undangan, nominal, masa aktif, keamanan transaksi, status paket, dan riwayat transaksi.
- Order pending dapat dilanjutkan memakai link pembayaran yang sama.
- Status berhasil/pending/gagal/expired/refund ditampilkan dan diperbarui berkala.

## Urutan deployment
1. Backup database Supabase.
2. Pastikan `supabase/schema_phase1_security_hardening.sql` sudah dijalankan.
3. Jalankan `supabase/schema_phase2_payment_backend.sql` di SQL Editor.
4. Atur environment Netlify:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `PUBLIC_BASE_URL` (origin website tanpa trailing slash)
   - `PAYMENT_PROVIDER=midtrans` atau `xendit`
   - Midtrans: `MIDTRANS_SERVER_KEY`, `MIDTRANS_IS_PRODUCTION=false`
   - Xendit: `XENDIT_SECRET_KEY`, `XENDIT_CALLBACK_TOKEN`
5. Deploy seluruh folder.
6. Midtrans sandbox: notification URL `/api/webhook`.
7. Xendit: callback invoice URL `/api/webhook` dan token harus sama dengan environment.
8. Uji sandbox: pending, paid, failed, expired, refresh/return dari provider, dan webhook ganda.

## Catatan penting
- Jangan aktifkan production key sebelum migration dan sandbox test selesai.
- Jangan mengubah harga lewat frontend; UI hanya menampilkan data paket yang dikembalikan backend.
- `payment.html` selalu memvalidasi sesi lagi. Pengguna tanpa sesi akan dikembalikan ke login sebelum checkout.
