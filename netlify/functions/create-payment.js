/* ============================================================
   create-payment.js  —  FASE 3B
   Netlify serverless function. Membuat ORDER + link pembayaran
   (Midtrans Snap atau Xendit Invoice) untuk sebuah undangan.
   ------------------------------------------------------------
   Dipanggil dari panel klien (fetch POST) dengan header:
     Authorization: Bearer <access_token user>
   Body JSON: { site_id, package, amount, months, customer:{name,email,phone} }
   Mengembalikan: { order_id, payment_url }
   ------------------------------------------------------------
   ENV yang dibutuhkan (Netlify > Site settings > Environment):
     SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
     PAYMENT_PROVIDER = 'midtrans' | 'xendit'
     MIDTRANS_SERVER_KEY, MIDTRANS_IS_PRODUCTION (true|false)
     XENDIT_SECRET_KEY
     PUBLIC_BASE_URL  (mis. https://undanganku.com) untuk redirect
   ============================================================ */
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const PROVIDER     = (process.env.PAYMENT_PROVIDER || 'midtrans').toLowerCase();
const BASE_URL     = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');

const json = (code, obj) => ({
  statusCode: code,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(obj),
});

function rest(path) { return SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/' + path; }
function svcHeaders(extra) {
  return Object.assign({
    apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY,
    'Content-Type': 'application/json',
  }, extra || {});
}

// Verifikasi token user -> kembalikan { id, email } atau null
async function getUser(token) {
  if (!token) return null;
  const r = await fetch(SUPABASE_URL.replace(/\/+$/, '') + '/auth/v1/user', {
    headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + token },
  });
  if (!r.ok) return null;
  return r.json();
}

async function createMidtrans(order, customer) {
  const isProd = String(process.env.MIDTRANS_IS_PRODUCTION) === 'true';
  const base = isProd ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com';
  const auth = 'Basic ' + Buffer.from((process.env.MIDTRANS_SERVER_KEY || '') + ':').toString('base64');
  const r = await fetch(base + '/snap/v1/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: auth },
    body: JSON.stringify({
      transaction_details: { order_id: order.id, gross_amount: Math.round(order.amount) },
      customer_details: {
        first_name: (customer && customer.name) || 'Pelanggan',
        email: (customer && customer.email) || undefined,
        phone: (customer && customer.phone) || undefined,
      },
      item_details: [{ id: order.package, price: Math.round(order.amount), quantity: 1,
        name: 'Undangan Digital — ' + order.package }],
      callbacks: BASE_URL ? { finish: BASE_URL + '/panel.html' } : undefined,
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error('Midtrans: ' + JSON.stringify(j));
  return { ref: order.id, url: j.redirect_url };
}

async function createXendit(order, customer) {
  const auth = 'Basic ' + Buffer.from((process.env.XENDIT_SECRET_KEY || '') + ':').toString('base64');
  const r = await fetch('https://api.xendit.co/v2/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify({
      external_id: order.id,
      amount: Math.round(order.amount),
      currency: 'IDR',
      payer_email: (customer && customer.email) || undefined,
      description: 'Undangan Digital — ' + order.package,
      success_redirect_url: BASE_URL ? BASE_URL + '/panel.html' : undefined,
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error('Xendit: ' + JSON.stringify(j));
  return { ref: j.id, url: j.invoice_url };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!SUPABASE_URL || !SERVICE_KEY) return json(500, { error: 'Server belum dikonfigurasi (SUPABASE_URL/SERVICE_ROLE_KEY).' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Body bukan JSON.' }); }

  const token = (event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer\s+/i, '');
  const user = await getUser(token);
  if (!user || !user.id) return json(401, { error: 'Tidak terautentikasi.' });

  const amount = Math.max(0, Math.round(Number(body.amount) || 0));
  if (!amount) return json(400, { error: 'amount wajib > 0.' });
  const pkg = body.package || 'basic';
  const months = parseInt(body.months, 10) || 12;

  // 1) Buat ORDER (service role) berstatus pending
  const ins = await fetch(rest('orders'), {
    method: 'POST', headers: svcHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify({
      site_id: body.site_id || null, owner_id: user.id, package: pkg,
      amount, months, provider: PROVIDER, status: 'pending',
    }),
  });
  const rows = await ins.json();
  if (!ins.ok || !rows[0]) return json(500, { error: 'Gagal membuat order', detail: rows });
  const order = rows[0];

  // 2) Buat transaksi di provider
  let pay;
  try {
    pay = PROVIDER === 'xendit'
      ? await createXendit(order, body.customer)
      : await createMidtrans(order, body.customer);
  } catch (e) {
    await fetch(rest('orders?id=eq.' + order.id), { method: 'PATCH', headers: svcHeaders(),
      body: JSON.stringify({ status: 'failed', raw: { error: String(e.message || e) } }) });
    return json(502, { error: 'Gagal membuat pembayaran', detail: String(e.message || e) });
  }

  // 3) Simpan ref + payment_url ke order
  await fetch(rest('orders?id=eq.' + order.id), { method: 'PATCH', headers: svcHeaders(),
    body: JSON.stringify({ provider_ref: pay.ref, payment_url: pay.url }) });

  return json(200, { order_id: order.id, payment_url: pay.url });
};
