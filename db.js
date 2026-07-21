/* =====================================================================
   db.js — Runtime data layer undangan (Supabase)
   ---------------------------------------------------------------------
   Tugas:
   1. Menentukan slug situs (dari ?site= / ?slug= / subdomain / default).
   2. Mengambil config undangan dari tabel `sites` di Supabase.
   3. Mengekspos window.WEDDING_CONFIG + window.WEDDING_DB_API.
   4. SELALU me-resolve window.__configReady — walau gagal fetch,
      tanpa backend, atau offline — supaya app.js SELALU boot dan
      undangan tetap bisa dibuka. (Perbaikan bug: dulu promise bisa
      reject/menggantung sehingga seluruh script undangan mati.)
   ===================================================================== */
(function () {
  var CFG = (window.WEDDING_DB_CONFIG || {});
  var URL = CFG.url || '';
  var KEY = CFG.anonKey || '';
  var hasBackend = !!(URL && KEY);

  function getSlug() {
    try {
      var qs = new URLSearchParams(location.search);
      var s = qs.get('site') || qs.get('slug');
      if (s) return s;
      if (location.protocol !== 'file:') {
        var host = location.hostname || '';
        var parts = host.split('.');
        // subdomain wildcard: slug.domain.tld (abaikan www & apex)
        if (parts.length > 2 && parts[0] !== 'www') return parts[0];
      }
    } catch (e) {}
    return CFG.defaultSlug || 'demo';
  }

  var SLUG = getSlug();
  window.WEDDING_SLUG = SLUG;

  function api(path, opts) {
    opts = opts || {};
    var headers = Object.assign({
      'apikey': KEY,
      'Authorization': 'Bearer ' + KEY,
      'Content-Type': 'application/json'
    }, opts.headers || {});
    return fetch(URL.replace(/\/$/, '') + '/rest/v1/' + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var ct = r.headers.get('content-type') || '';
      return ct.indexOf('application/json') >= 0 ? r.json() : r.text();
    });
  }

  /* ---------- API publik dipakai app.js ---------- */
  window.WEDDING_DB_API = {
    slug: SLUG,
    saveRsvp: function (payload) {
      if (!hasBackend) return Promise.resolve({ offline: true });
      var row = Object.assign({ slug: SLUG }, payload || {});
      return api('rsvps', { method: 'POST', headers: { Prefer: 'return=representation' }, body: row })
        .catch(function () { return { error: true }; });
    },
    saveWish: function (payload) {
      if (!hasBackend) return Promise.resolve({ offline: true });
      var row = Object.assign({ slug: SLUG }, payload || {});
      return api('wishes', { method: 'POST', headers: { Prefer: 'return=representation' }, body: row })
        .catch(function () { return { error: true }; });
    },
    fetchWishes: function () {
      if (!hasBackend) return Promise.resolve(null);
      return api('wishes?slug=eq.' + encodeURIComponent(SLUG) + '&order=created_at.desc')
        .catch(function () { return null; });
    }
  };

  /* ---------- Muat config situs; SELALU resolve ---------- */
  window.__configReady = new Promise(function (resolve) {
    // Hard timeout: jangan pernah menggantung > 4 detik.
    var done = false;
    function finish() { if (!done) { done = true; resolve(window.WEDDING_CONFIG || null); } }
    setTimeout(finish, 4000);

    if (!hasBackend) { finish(); return; }

    api('sites?slug=eq.' + encodeURIComponent(SLUG) + '&select=config,package,status,theme_id&limit=1')
      .then(function (rows) {
        var row = rows && rows[0];
        if (row && row.config) {
          window.WEDDING_CONFIG = row.config;
          window.WEDDING_SITE_META = { package: row.package, status: row.status, themeId: row.theme_id };
        }
      })
      .catch(function () { /* diamkan: app tetap boot dengan default */ })
      .then(finish, finish);
  });
})();
