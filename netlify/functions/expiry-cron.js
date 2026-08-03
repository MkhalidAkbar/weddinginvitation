/* ============================================================
   expiry-cron.js  —  FASE 4 (Tahap 2)
   Fungsi TERJADWAL (harian). Dua tugas:
     1) Auto-expire  : undangan yang masa aktifnya (expires_at) sudah
                       lewat -> status di-set 'expired' (offline).
     2) Pengingat    : undangan yang akan berakhir <= 7 hari & belum
                       pernah diingatkan -> ditandai (expiry_reminded_at)
                       dan dikumpulkan untuk dikirimi notifikasi/email.
   ------------------------------------------------------------
   Dijadwalkan lewat netlify.toml:
       [functions."expiry-cron"]
         schedule = "@daily"
   Tidak butuh dependency tambahan (pakai global fetch Node 18+).
   ENV: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
   ============================================================ */
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const REMIND_DAYS  = parseInt(process.env.EXPIRY_REMIND_DAYS || '7', 10);

function rest(path) { return SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/' + path; }
function svcHeaders(extra) {
  return Object.assign(
    { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY, 'Content-Type': 'application/json' },
    extra || {}
  );
}

// Tempat menaruh integrasi email/notifikasi ke pemilik undangan.
// Untuk sekarang hanya dicatat (log). Ganti isi fungsi ini bila sudah
// punya provider email (mis. Resend/SendGrid) atau tabel notifikasi.
async function notifyOwner(site) {
  console.log('[expiry-cron] Pengingat perpanjangan untuk', site.slug || site.id,
              '- berakhir', site.expires_at);
  return true;
}

exports.handler = async () => {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server belum dikonfigurasi.' }) };
  }
  const now  = new Date();
  const soon = new Date(now.getTime() + REMIND_DAYS * 86400000);

  // 1) Auto-expire undangan yang sudah lewat masa aktif.
  let expired = [];
  try {
    const r = await fetch(
      rest('sites?status=eq.published&expires_at=lt.' + encodeURIComponent(now.toISOString()) + '&select=id,slug'),
      { method: 'PATCH', headers: svcHeaders({ Prefer: 'return=representation' }),
        body: JSON.stringify({ status: 'expired' }) }
    );
    expired = await r.json().catch(() => []);
  } catch (e) { console.error('[expiry-cron] gagal auto-expire:', e); }

  // 2) Kirim pengingat untuk yang akan berakhir <= REMIND_DAYS hari.
  let reminded = [];
  try {
    const q = 'sites?status=eq.published'
            + '&expires_at=gte.' + encodeURIComponent(now.toISOString())
            + '&expires_at=lte.' + encodeURIComponent(soon.toISOString())
            + '&expiry_reminded_at=is.null'
            + '&select=id,slug,owner_id,expires_at';
    const due = await (await fetch(rest(q), { headers: svcHeaders() })).json().catch(() => []);
    for (const s of (due || [])) {
      await notifyOwner(s);
      await fetch(rest('sites?id=eq.' + s.id), {
        method: 'PATCH', headers: svcHeaders(),
        body: JSON.stringify({ expiry_reminded_at: now.toISOString() }),
      });
      reminded.push(s.slug || s.id);
    }
  } catch (e) { console.error('[expiry-cron] gagal kirim pengingat:', e); }

  const summary = { ran_at: now.toISOString(), expired: (expired || []).length, reminded };
  console.log('[expiry-cron] selesai:', JSON.stringify(summary));
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(summary) };
};
