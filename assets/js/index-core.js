/* ROUTER STYLE (Fase 3A): satu link publik -> template style yang benar.
   Tambah baris di TEMPLATES saat Anda menambah master style baru. */
(function(){
  var TEMPLATES={
    'elegant-floral':'undangan-template-db.html',
    'modern-editorial':'undangan-modern.html','luxury-gold':'undangan-luxury-gold.html',
    'garden-botanical':'undangan-botani.html','midnight-luxe':'undangan-midnight.html',
    'rustic-terracotta':'undangan-terracotta.html','blush-minimal':'undangan-blush.html','ocean-breeze':'undangan-ocean.html',
    'javanese-heritage':'undangan-javanese.html','cinematic-film':'undangan-cinematic.html'
  };
  var DEFAULT='undangan-template-db.html';
  var DB=window.WEDDING_DB||{}, API=(DB.url||'').replace(/\/+$/,''), KEY=DB.anonKey||'';
  var q=new URLSearchParams(location.search);
  var slug=q.get('site')||DB.defaultSlug||'';
  function go(file){ location.replace(file+(location.search||'')); }
  if(!API||!KEY||!slug){ return go(DEFAULT); }
  fetch(API+'/rest/v1/sites?slug=eq.'+encodeURIComponent(slug)+'&select=config&limit=1',{headers:{apikey:KEY,Authorization:'Bearer '+KEY}})
   .then(function(r){return r.json()})
   .then(function(rows){ var cfg=(rows&&rows[0]&&rows[0].config)||{}; go(TEMPLATES[cfg.style]||DEFAULT); })
   .catch(function(){ go(DEFAULT); });
})();
