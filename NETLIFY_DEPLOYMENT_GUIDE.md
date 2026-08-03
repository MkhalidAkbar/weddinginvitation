# Tutorial Deploy GitHub ke Netlify dan Memasang Midtrans

Dokumen ini dapat digunakan nanti ketika pengembangan UI sudah cukup stabil. Source code tetap disimpan dan direvisi di GitHub; Netlify hanya menjalankan hasil deploy serta backend pembayaran.

## 1. Persiapan repository GitHub

1. Upload seluruh isi proyek ke repository GitHub.
2. Pastikan file `.env`, key Midtrans, dan Supabase Service Role Key tidak ikut terunggah.
3. File yang memang boleh publik: `db-config.js` dengan Supabase Anon Key.
4. Buka tab **Actions** di GitHub. Workflow **Security and payment checks** akan menjalankan `npm test` setiap kali ada push.
5. Jangan lanjut deploy apabila quality gate gagal.

## 2. Membuat site Netlify gratis

1. Login ke Netlify menggunakan akun GitHub.
2. Pilih **Add new site → Import an existing project**.
3. Pilih GitHub dan izinkan akses ke repository Wedding SaaS.
4. Pilih repository dan branch utama, biasanya `main`.
5. Build settings:
   - **Build command:** kosong
   - **Publish directory:** `.`
   - **Functions directory:** `netlify/functions`
6. Klik **Deploy site**.
7. Netlify akan memberi subdomain gratis, misalnya `https://undangan-studio.netlify.app`. Domain sendiri belum diperlukan.

Konfigurasi publish dan functions juga sudah tersedia di `netlify.toml`.

## 3. Menjalankan migration Supabase

Backup database lebih dulu. Jalankan berurutan di Supabase SQL Editor:

1. Skema lama proyek sesuai urutan yang sebelumnya sudah digunakan.
2. `supabase/schema_phase1_security_hardening.sql`
3. `supabase/schema_phase2_payment_backend.sql`

Periksa bahwa tabel berikut tersedia: `plans`, `orders`, `site_entitlements`, `payment_events`, dan `security_audit_logs`.

## 4. Memasang Environment Variables Netlify

Buka **Site configuration → Environment variables** dan tambahkan:

```text
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=isi-service-role-key
PAYMENT_PROVIDER=midtrans
MIDTRANS_SERVER_KEY=isi-server-key-sandbox
MIDTRANS_IS_PRODUCTION=false
PUBLIC_BASE_URL=https://nama-site.netlify.app
EXPIRY_REMIND_DAYS=7
```

Untuk Midtrans sandbox, gunakan key dengan awalan sandbox dari **Midtrans Dashboard → Settings → Access Keys**. Jangan masukkan Server Key ke `db-config.js`, GitHub, HTML, atau JavaScript browser.

Setelah mengubah environment variables, pilih **Deploys → Trigger deploy → Deploy site**.

## 5. Konfigurasi Midtrans sandbox

Di Midtrans Dashboard sandbox, atur:

```text
Payment Notification URL:
https://nama-site.netlify.app/api/webhook
```

Endpoint website yang digunakan:

```text
POST /api/pay
GET  /api/payment-status?site_id=<uuid>
POST /api/webhook
```

Finish redirect dibuat otomatis oleh backend menuju `payment.html` dengan ID order.

## 6. Uji deployment

Buka:

```text
https://nama-site.netlify.app/panel.html
```

Lakukan alur berikut:

1. Buat atau edit undangan.
2. Pilih **Selesai** dan jalankan checklist.
3. Jika belum login, pastikan diarahkan ke login.
4. Setelah login, pastikan masuk ke `payment.html`.
5. Pilih paket dan buat transaksi sandbox.
6. Uji pending, berhasil, gagal, dan expired menggunakan simulator Midtrans.
7. Pastikan halaman pembayaran memperbarui status dan paket aktif.
8. Periksa Netlify **Functions logs** untuk `create-payment`, `payment-status`, dan `payment-webhook`.
9. Periksa tabel `orders`, `payment_events`, `site_entitlements`, dan `security_audit_logs` di Supabase.

Smoke test opsional dari terminal lokal:

```bash
TEST_BASE_URL=https://nama-site.netlify.app \
TEST_ACCESS_TOKEN=access-token-user-test \
TEST_SITE_ID=uuid-undangan \
TEST_PLAN=premium \
CONFIRM_CREATE_SANDBOX_ORDER=yes \
npm run test:sandbox
```

Perintah tersebut benar-benar membuat order sandbox ketika konfirmasi bernilai `yes`.

## 7. Auto-deploy dari GitHub

Setiap push ke branch yang dihubungkan akan memicu deploy baru. Environment variables tetap berada di Netlify dan tidak ikut masuk repository. Gunakan Deploy Preview dari pull request untuk meninjau revisi sebelum digabungkan ke branch utama.

## 8. Beralih ke production nanti

Hanya lakukan setelah seluruh checklist `PHASE4_TESTING.md` lulus:

1. Ganti `MIDTRANS_SERVER_KEY` dengan Production Server Key.
2. Ubah `MIDTRANS_IS_PRODUCTION=true`.
3. Pastikan akun Midtrans production sudah aktif dan legal pages dapat diakses.
4. Ubah `PUBLIC_BASE_URL` jika sudah memakai domain sendiri.
5. Atur ulang Notification URL production ke `/api/webhook` pada domain production.
6. Trigger deploy dan lakukan transaksi nominal kecil end-to-end.

## 9. Troubleshooting singkat

- **404 `/api/pay`:** functions directory atau `netlify.toml` tidak ikut ter-deploy.
- **401:** sesi login kedaluwarsa; login ulang.
- **403:** origin atau kepemilikan `site_id` tidak sesuai.
- **Provider belum siap:** Server Key atau `PAYMENT_PROVIDER` belum benar.
- **Webhook 401:** signature Midtrans atau callback token Xendit tidak valid.
- **Pembayaran berhasil tetapi paket belum aktif:** periksa webhook log, migration, trigger entitlement, dan nominal order.
- **Perubahan GitHub belum muncul:** periksa status deploy dan branch yang terhubung di Netlify.
