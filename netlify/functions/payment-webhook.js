/* ============================================================
   payment-webhook.js  —  FASE 3B
   Menerima notifikasi pembayaran dari Midtrans / Xendit,
   memverifikasi keasliannya, lalu menandai ORDER 'paid' / 'failed'.
   Trigger DB (activate_site_on_paid) akan otomatis mem-publish
   undangan & mengatur masa aktif ketika order menjadi 'paid'.
   ------------------------------------------------------------
   Set URL fungsi ini sebagai:
     Midtrans: Payment Notification URL
     Xendit  : Invoice callback URL (+ set XENDIT_CALLBACK_TOKEN)
   ENV: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
        PAYMENT_PROVIDER, MIDTRANS_SERVER_KEY, XENDIT_CALLBACK_TOKEN
   ============================================================ */
const crypto = require('crypto');
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const PROVIDER     = (process.env.PAYMENT_PROVIDER || 'midtrans').toLowerCase();

const json = (code, obj) => ({ statusCode: code, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });
function rest(path) { return SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/' + path; }
function svcHeaders(extra) {
  return Object.assign({ apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY, 'Content-Type': 'application/json' }, extra || {});
}

// Cari order berdasarkan id ATAU provider_ref, lalu update statusnya
async function updateOrder(ref, status, raw) {
  const q = 'orders?or=(id.eq.' + ref + ',provider_ref.eq.' + encodeURIComponent(ref) + ')';
  const r = await fetch(rest(q), {
    method: 'PATCH', headers: svcHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify({ status, raw }),
  });
  return { ok: r.ok, rows: await r.json().catch(() => []) };
}

// ---------- Midtrans ----------
function midtransStatus(p) {
  const t = p.transaction_status, fraud = p.fraud_status;
  if (t === 'capture') return fraud === 'accept' ? 'paid' : 'pending';
  if (t === 'settlement') return 'paid';
  if (t === 'pending') return 'pending';
  if (t === 'deny' || t === 'cancel' || t === 'failure') return 'failed';
  if (t === 'expire') return 'expired';
  if (t === 'refund' || t === 'partial_refund') return 'refunded';
  return 'pending';
}
function midtransValid(p) {
  const key = process.env.MIDTRANS_SERVER_KEY || '';
  const raw = String(p.order_id) + String(p.status_code) + String(p.gross_amount) + key;
  const sig = crypto.createHash('sha512').update(raw).digest('hex');
  return sig === p.signature_key;
}

// ---------- Xendit ----------
function xenditStatus(p) {
  const s = (p.status || '').toUpperCase();
  if (s === 'PAID' || s === 'SETTLED') return 'paid';
  if (s === 'EXPIRED') return 'expired';
  if (s === 'FAILED') return 'failed';
  return 'pending';
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!SUPABASE_URL || !SERVICE_KEY) return json(500, { error: 'Server belum dikonfigurasi.' });

  let p;
  try { p = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Body bukan JSON.' }); }

  let ref, status;
  if (PROVIDER === 'xendit') {
    const token = event.headers['x-callback-token'] || event.headers['X-Callback-Token'] || '';
    if (process.env.XENDIT_CALLBACK_TOKEN && token !== process.env.XENDIT_CALLBACK_TOKEN)
      return json(401, { error: 'Callback token tidak valid.' });
    ref = p.external_id || p.id;
    status = xenditStatus(p);
  } else {
    if (!midtransValid(p)) return json(401, { error: 'Signature Midtrans tidak valid.' });
    ref = p.order_id;
    status = midtransStatus(p);
  }
  if (!ref) return json(400, { error: 'Referensi order tidak ada.' });

  const res = await updateOrder(ref, status, p);
  if (!res.ok) return json(500, { error: 'Gagal memperbarui order', detail: res.rows });

  // Selalu balas 200 agar provider tidak retry berlebihan
  return json(200, { ok: true, ref, status, updated: (res.rows || []).length });
};
