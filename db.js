/* Database adapter: Supabase config, RSVP, wishes, and public site loading. */
(function(){
  var DB=window.WEDDING_DB||{},resolveFn,done=false,siteId=null;
  window.__configReady=new Promise(function(res){resolveFn=res});
  function finish(){if(done)return;done=true;resolveFn()}
  function slugFromUrl(){try{var q=new URLSearchParams(location.search).get('site');if(q)return q}catch(e){}if(location.protocol==='file:')return DB.defaultSlug||'';var h=location.hostname.split('.')[0];if(h&&h!=='www'&&h!=='localhost'&&h!=='127')return h;var p=location.pathname.split('/').filter(Boolean);return p[0]||DB.defaultSlug||''}
  function headers(extra){var h={apikey:DB.anonKey,Authorization:'Bearer '+DB.anonKey};if(extra)for(var k in extra)h[k]=extra[k];return h}
  function rest(path){return String(DB.url||'').replace(/\/+$/,'')+'/rest/v1/'+path}
  function clientHash(){var k='wedding_guest_token',v='';try{v=localStorage.getItem(k)||'';if(!v){v='g-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);localStorage.setItem(k,v)}}catch(e){v='g-'+Math.random().toString(36).slice(2)}return v}
  function parseRpc(r){return r.text().then(function(t){var j={};try{j=t?JSON.parse(t):{}}catch(e){}if(!r.ok)throw new Error(j.message||j.hint||'Permintaan belum berhasil');return j})}
  window.WEDDING_DB_API={
    saveRsvp:function(o){if(!siteId)return Promise.reject('no site');return fetch(rest('rsvp'),{method:'POST',headers:headers({'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify({site_id:siteId,nama:o.name,kehadiran:o.attend,jumlah:Math.max(0,parseInt(o.count,10)||0),acara:o.eventChoice||null,catatan:o.note||null})})},
    saveWish:function(o){if(!siteId)return Promise.reject(new Error('Undangan tidak tersedia'));return fetch(rest('rpc/submit_wish'),{method:'POST',headers:headers({'Content-Type':'application/json'}),body:JSON.stringify({p_site:siteId,p_nama:o.name,p_kehadiran:o.attend,p_pesan:o.msg,p_client_hash:clientHash()})}).then(parseRpc)},
    fetchWishes:function(){if(!siteId)return Promise.resolve([]);return fetch(rest('rpc/public_wishes'),{method:'POST',headers:headers({'Content-Type':'application/json'}),body:JSON.stringify({p_site:siteId})}).then(function(r){return r.ok?r.json():[]}).then(function(rows){return(rows||[]).map(function(w){return{id:w.id,name:w.nama,attend:w.kehadiran,msg:w.pesan,t:Date.parse(w.created_at)||Date.now(),pinned:!!w.is_pinned,heart:w.reaction_heart||0,pray:w.reaction_pray||0,smile:w.reaction_smile||0,status:'approved',visible:true}})})},
    reactWish:function(id,emoji){if(!siteId)return Promise.reject(new Error('Undangan tidak tersedia'));return fetch(rest('rpc/react_to_wish'),{method:'POST',headers:headers({'Content-Type':'application/json'}),body:JSON.stringify({p_wish_id:parseInt(id,10),p_emoji:emoji,p_client_hash:clientHash()})}).then(parseRpc)}
  };
  if(!DB.url||!DB.anonKey){console.warn('[wedding] Supabase belum dikonfigurasi; memakai konten default.');window.WEDDING_DB_API=null;return finish()}
  var slug=slugFromUrl();if(!slug){window.WEDDING_DB_API=null;return finish()}window.__WEDDING_SLUG=slug;
  fetch(rest('sites?slug=eq.'+encodeURIComponent(slug)+'&status=eq.published&select=id,config'),{headers:headers()})
    .then(function(r){return r.ok?r.json():Promise.reject(r.status)})
    .then(function(rows){if(rows&&rows[0]){siteId=rows[0].id;window.__WEDDING_SITE_ID=siteId;if(rows[0].config)window.WEDDING_CONFIG=rows[0].config;try{fetch(rest('site_views'),{method:'POST',headers:headers({'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify({site_id:siteId,slug:slug,path:location.pathname||'/',referrer:document.referrer||null,ua:(navigator.userAgent||'').slice(0,300)})}).catch(function(){})}catch(e){}}else window.WEDDING_DB_API=null;finish()})
    .catch(function(e){console.error('[wedding] Gagal memuat undangan:',e);window.WEDDING_DB_API=null;finish()});
})();
