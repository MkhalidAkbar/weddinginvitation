/* ============================================================
   db.js  —  FASE 1: sumber data undangan = DATABASE (Supabase).
   ------------------------------------------------------------
   • Mengambil data undangan berdasarkan SLUG (dari ?site=, subdomain,
     atau path URL), lalu mengisi window.WEDDING_CONFIG (bentuk SAMA
     seperti config.js) dan menyelesaikan window.__configReady agar
     template me-render.
   • Menyediakan window.WEDDING_DB_API untuk RSVP & ucapan
     (menggantikan Google Sheets), dengan RLS sebagai penjaga isolasi.
   Tidak perlu diedit — cukup isi db-config.js.
   ============================================================ */
(function(){
  var DB = window.WEDDING_DB || {};
  var resolveFn, done = false;
  window.__configReady = new Promise(function(res){ resolveFn = res; });
  function finish(){ if(done) return; done = true; resolveFn(); }

  function slugFromUrl(){
    try{ var q = new URLSearchParams(location.search).get('site'); if(q) return q; }catch(e){}
    // File lokal (file://): lewati deteksi subdomain/path, pakai defaultSlug
    if(location.protocol === 'file:') return DB.defaultSlug || null;
    var host = (location.hostname || '').split('.');
    if(host.length > 2 && host[0] !== 'www' && host[0] !== 'localhost') return host[0];
    var seg = (location.pathname || '').replace(/^\/+|\/+$/g,'').split('/')[0];
    if(seg && !/\.html?$/i.test(seg)) return seg;
    return DB.defaultSlug || null;
  }

  function headers(extra){
    var h = { apikey: DB.anonKey, Authorization: 'Bearer ' + DB.anonKey };
    if(extra){ for(var k in extra) h[k] = extra[k]; }
    return h;
  }
  function rest(path){ return DB.url.replace(/\/+$/,'') + '/rest/v1/' + path; }

  var siteId = null;

  // API yang dipakai template untuk menyimpan/membaca RSVP & ucapan
  window.WEDDING_DB_API = {
    saveRsvp: function(o){
      if(!siteId) return Promise.reject('no site');
      return fetch(rest('rsvp'), { method:'POST',
        headers: headers({ 'Content-Type':'application/json', Prefer:'return=minimal' }),
        body: JSON.stringify({ site_id: siteId, nama: o.name, kehadiran: o.attend, jumlah: parseInt(o.count,10) || 1 }) });
    },
    saveWish: function(o){
      if(!siteId) return Promise.reject('no site');
      return fetch(rest('wishes'), { method:'POST',
        headers: headers({ 'Content-Type':'application/json', Prefer:'return=minimal' }),
        body: JSON.stringify({ site_id: siteId, nama: o.name, kehadiran: o.attend, pesan: o.msg }) });
    },
    fetchWishes: function(){
      if(!siteId) return Promise.resolve([]);
      return fetch(rest('wishes?site_id=eq.' + siteId + '&order=created_at.asc&select=nama,kehadiran,pesan,created_at'),
        { headers: headers() })
        .then(function(r){ return r.ok ? r.json() : []; })
        .then(function(rows){ return (rows || []).map(function(w){
          return { name:w.nama, attend:w.kehadiran, msg:w.pesan, t:Date.parse(w.created_at) || Date.now() }; }); });
    }
  };

  if(!DB.url || !DB.anonKey){
    console.warn('[wedding] Supabase belum dikonfigurasi di db-config.js — memakai konten default template.');
    window.WEDDING_DB_API = null; return finish();
  }
  var slug = slugFromUrl();
  if(!slug){ console.warn('[wedding] Slug undangan tidak ditemukan di URL.'); window.WEDDING_DB_API = null; return finish(); }
  window.__WEDDING_SLUG = slug;

  fetch(rest('sites?slug=eq.' + encodeURIComponent(slug) + '&status=eq.published&select=id,config'), { headers: headers() })
    .then(function(r){ return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function(rows){
      if(rows && rows[0]){
        siteId = rows[0].id;
        window.__WEDDING_SITE_ID = siteId;
        if(rows[0].config) window.WEDDING_CONFIG = rows[0].config;
        // FASE 4: catat kunjungan (analitik). Gagal diam-diam, tidak mengganggu render.
        try{
          fetch(rest('site_views'), { method:'POST',
            headers: headers({ 'Content-Type':'application/json', Prefer:'return=minimal' }),
            body: JSON.stringify({ site_id: siteId, slug: slug,
              path: (location.pathname || '/'),
              referrer: (document.referrer || null),
              ua: (navigator.userAgent || '').slice(0,300) }) }).catch(function(){});
        }catch(e){}
      } else {
        console.warn('[wedding] Undangan "' + slug + '" tidak ditemukan / belum published.');
        window.WEDDING_DB_API = null;
      }
      finish();
    })
    .catch(function(e){
      console.error('[wedding] Gagal memuat data undangan:', e);
      window.WEDDING_DB_API = null; finish();
    });
})();
