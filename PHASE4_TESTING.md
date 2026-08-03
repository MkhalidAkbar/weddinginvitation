# Fase 4 — Pengujian dan Gate Menuju Production

## Status

Automated test, GitHub Actions, secret scan, pemeriksaan file, dan tutorial deployment sudah disiapkan. Pengujian nyata Midtrans/Xendit sandbox tetap harus dilakukan setelah proyek di-deploy dan environment variables dipasang.

## Automated quality gate

Jalankan sebelum setiap deploy:

```bash
npm test
```

Pemeriksaan mencakup:

- Syntax seluruh JavaScript.
- File deployment dan migration wajib.
- Referensi aset lokal HTML.
- Server Key Midtrans/Xendit dan Supabase Service Role Key tidak masuk repository.
- Route `/api/pay`, `/api/payment-status`, dan `/api/webhook` tersedia.
- Request tanpa login ditolak.
- Akses `site_id` milik akun lain ditolak.
- Manipulasi harga dari browser diabaikan.
- Pending order digunakan kembali.
- Signature Midtrans dan callback token Xendit diverifikasi.
- Nominal webhook harus sama dengan order.
- Webhook ganda idempotent.
- Transisi status yang tidak valid diabaikan.
- Alur paid, expired, dan refund.

GitHub Actions menjalankan quality gate yang sama setiap push dan pull request.

## Matriks sandbox wajib

| Skenario | Hasil yang diharapkan |
|---|---|
| Pembayaran berhasil | Order `paid`, entitlement aktif, situs terpublikasi |
| Pembayaran pending | Order tetap `pending`, tombol lanjutkan pembayaran tersedia |
| Pembayaran gagal | Order `failed`, entitlement tidak aktif |
| Invoice expired | Order `expired`, link lama tidak digunakan untuk order baru |
| Pembayaran dibatalkan | Order `cancelled`, entitlement tidak aktif |
| Refund penuh | Order `refunded`, audit tercatat; kebijakan penonaktifan ditinjau |
| Refund sebagian | Order `partially_refunded`, audit tercatat |
| Webhook dikirim dua kali | Respons idempotent, entitlement tidak diperpanjang dua kali |
| Redirect datang sebelum webhook | UI menunggu/polling sampai webhook mengubah status |
| Webhook datang sebelum redirect | Saat kembali, UI langsung menampilkan status terbaru |
| Harga request diubah | Backend tetap memakai harga tabel `plans` |
| `site_id` akun lain | Request `403` |
| Token kedaluwarsa | Request `401`, pengguna diminta login ulang |
| Origin tidak sesuai | Request `403` saat `PUBLIC_BASE_URL` aktif |

## Security test aplikasi

- Coba upload file dengan ekstensi ganda, MIME palsu, ukuran berlebih, dan folder user lain.
- Kirim RSVP/ucapan berulang untuk memastikan rate limit bekerja.
- Masukkan HTML/script pada nama, cerita, lokasi, RSVP, dan ucapan; hasil harus dirender sebagai teks.
- Pastikan user biasa tidak dapat memperbarui `orders`, `plans`, `site_entitlements`, atau audit log langsung melalui REST.
- Periksa RLS menggunakan dua akun berbeda.
- Pastikan `MIDTRANS_SERVER_KEY`, `XENDIT_SECRET_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` tidak muncul di browser Network/Source.

## Backup dan restore drill

1. Buat backup Supabase sebelum migration dan sebelum production launch.
2. Catat jumlah baris utama: `sites`, `orders`, `site_entitlements`, `rsvp`, dan `wishes`.
3. Restore ke project staging terpisah.
4. Verifikasi foreign key, RLS, function, trigger, storage policy, dan sample undangan.
5. Dokumentasikan waktu pemulihan serta langkah yang gagal.

## Production gate

Production key hanya boleh diaktifkan jika seluruh kondisi berikut lulus:

- [ ] Migration Fase 1 dan Fase 2 sudah diterapkan.
- [ ] `npm test` lulus pada commit yang akan di-deploy.
- [ ] Seluruh matriks sandbox lulus.
- [ ] Uji dua akun untuk RLS/kepemilikan lulus.
- [ ] Upload berbahaya dan spam test lulus.
- [ ] Backup dan restore drill selesai.
- [ ] Legal pages dapat diakses.
- [ ] Notification URL provider memakai HTTPS dan webhook sukses.
- [ ] Monitoring Netlify Functions dan Supabase tersedia.
- [ ] Transaksi production nominal kecil berhasil end-to-end.

## Perintah pemeriksaan production environment

Dijalankan pada lingkungan yang memiliki secret, bukan di GitHub publik:

```bash
node scripts/predeploy-check.js --production
```

Perintah ini hanya memeriksa keberadaan environment dan konfigurasi. Nilai secret tidak dicetak.
