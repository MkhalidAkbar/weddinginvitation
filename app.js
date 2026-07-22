Promise.race([Promise.resolve(window.__configReady).catch(function(){}),new Promise(function(_r){setTimeout(_r,1200);})]).then(function(){
/* ====== DATA UNDANGAN (dari database via db.js; fallback: konten default HTML) ====== */
var CFG = (window.WEDDING_CONFIG) || {};
window.__applyWeddingConfig = function(c){
  if(!c || !Object.keys(c).length) return;
  var d = document;
  function t(sel,val){var e=d.querySelector(sel); if(e&&val!=null) e.textContent=val;}
  function h(sel,val){var e=d.querySelector(sel); if(e&&val!=null) e.innerHTML=val;}
  function attr(sel,a,val){var e=d.querySelector(sel); if(e&&val) e.setAttribute(a,val);}
  // meta
  if(c.meta){ if(c.meta.title) d.title=c.meta.title; if(c.meta.favicon) attr('link[rel=icon]','href',c.meta.favicon);
    /* SEO (Fase 4): meta description, Open Graph, Twitter card, JSON-LD Event */
    var _sm=function(k,v,val){ if(!val) return; var e=d.head.querySelector('meta['+k+'="'+v+'"]'); if(!e){e=d.createElement('meta'); e.setAttribute(k,v); d.head.appendChild(e);} e.setAttribute('content',val); };
    var _nm=((c.couple&&c.couple.brideShort)||'')+' & '+((c.couple&&c.couple.groomShort)||'');
    var _desc=c.meta.description||((c.event&&c.event.dateText)? 'Undangan pernikahan '+_nm+' \u2014 '+c.event.dateText : 'Undangan pernikahan '+_nm);
    _sm('name','description',_desc);
    _sm('property','og:title',c.meta.title||('Undangan '+_nm));
    _sm('property','og:description',_desc);
    _sm('property','og:type','website');
    var _img=c.meta.ogImage||(c.gallery&&c.gallery[0]); if(_img) _sm('property','og:image',_img);
    _sm('name','twitter:card','summary_large_image');
    try{ var _ld=d.getElementById('wed-jsonld'); if(!_ld){_ld=d.createElement('script'); _ld.type='application/ld+json'; _ld.id='wed-jsonld'; d.head.appendChild(_ld);} _ld.textContent=JSON.stringify({'@context':'https://schema.org','@type':'Event','name':(c.meta.title||('Pernikahan '+_nm)),'startDate':(c.event&&c.event.dateISO)||undefined,'description':_desc,'eventAttendanceMode':'https://schema.org/OfflineEventAttendanceMode','location':(c.events&&c.events[0]&&c.events[0].location)?{'@type':'Place','name':c.events[0].location}:undefined}); }catch(e){} }
  if(c.music && c.music.src) attr('#bgm','src',c.music.src);
  // cover
  if(c.cover){ t('#cover .the-wedding',c.cover.eyebrow); t('#cover .kepada',c.cover.kepada);
    if(c.cover.guestDefault) t('#guestName',c.cover.guestDefault);
    var ob=d.getElementById('openBtn'); if(ob&&c.cover.openButton) ob.innerHTML='<span class="ico">\u2709</span> '+c.cover.openButton; }
  var bs=(c.couple&&c.couple.brideShort)||'', gs=(c.couple&&c.couple.groomShort)||'';
  if(bs&&gs){ h('#cover .names', bs+' <span class="amp">&amp;</span> '+gs);
              h('#hero .names', bs+'<span class="amp">&amp;</span>'+gs);
              h('#thanks .names', bs+' <span class="amp">&amp;</span> '+gs); }
  if(c.hero) t('#hero .bism', c.hero.bismillah);
  if(c.event) t('#hero .date-pill', c.event.dateText);
  if(c.quote){ t('#quote .ayat',c.quote.text); t('#quote .src',c.quote.source); }
  // couple
  if(c.couple){
    var persons=d.querySelectorAll('#couple .person');
    [c.couple.bride,c.couple.groom].forEach(function(p,i){
      var el=persons[i]; if(!el||!p) return;
      var ini=el.querySelector('.initial'); if(ini&&p.initial) ini.textContent=p.initial;
      var nm=el.querySelector('h3'); if(nm&&p.full) nm.textContent=p.full;
      var rl=el.querySelector('.role'); if(rl&&p.role) rl.textContent=p.role;
      var pr=el.querySelector('.parents'); if(pr){ if(p.father||p.mother){ var _st=p.status?('<span class="ps">'+p.status+'</span><br>'):''; pr.innerHTML=_st+'<b>'+(p.father||'')+'</b> &amp; <b>'+(p.mother||'')+'</b>'; } else if(p.parents){ pr.innerHTML=p.parents; } }
      var so=el.querySelector('.social'); if(so&&p.social) so.textContent=p.social;
    });
  }
  // story
  if(c.story){ var tl=d.querySelectorAll('#story .tl-item'); c.story.forEach(function(s,i){var el=tl[i]; if(!el)return;
    var y=el.querySelector('.yr'); if(y)y.textContent=s.year; var hh=el.querySelector('h4'); if(hh)hh.textContent=s.title;
    var pp=el.querySelector('p'); if(pp)pp.textContent=s.text;}); }
  // events
  if(c.events){ var ev=d.querySelectorAll('#events .event-card'); c.events.forEach(function(e,i){var el=ev[i]; if(!el)return;
    var b=el.querySelector('.badge'); if(b&&e.badge)b.textContent=e.badge;
    var hh=el.querySelector('h3'); if(hh&&e.title)hh.textContent=e.title;
    var big=el.querySelector('.big'); if(big&&e.dateBig)big.textContent=e.dateBig;
    var rows=el.querySelectorAll('.row'); if(rows[0]&&e.time)rows[0].innerHTML='\uD83D\uDD50 '+e.time; if(rows[1]&&e.location)rows[1].innerHTML='\uD83D\uDCCD '+e.location;
    var mb=el.querySelector('.map-btn'); if(mb&&e.mapUrl)mb.href=e.mapUrl;}); }
  // gallery
  var _gg=d.querySelector('#gallery .gal-grid');
  if(_gg){ if(c.galleryLayout!==undefined){ ['grid','mosaic','masonry','film','collage','polaroid'].forEach(function(k){_gg.classList.remove('gl-'+k);}); if(c.galleryLayout) _gg.classList.add('gl-'+c.galleryLayout); }
    var _ph=(c.gallery||[]).filter(function(x){return x&&String(x).trim();});
    if(_ph.length){ var _gnm=((c.couple&&c.couple.brideShort)||'')+' & '+((c.couple&&c.couple.groomShort)||''); var _gh=''; _ph.forEach(function(src,i){ _gh+='<div class="cell"><img src="'+src+'" loading="lazy" alt="Galeri '+_gnm+' '+(i+1)+'"></div>'; }); _gg.innerHTML=_gh; _gg.setAttribute('data-count',_ph.length); } }
  // gift / rekening
  if(c.banks){ var gc=d.querySelectorAll('#gift .gift-card'); c.banks.forEach(function(bk,i){var el=gc[i]; if(!el)return;
    var bn=el.querySelector('.bank'); if(bn&&bk.bank)bn.textContent=bk.bank;
    var no=el.querySelector('.no'); if(no&&bk.number)no.textContent=bk.number;
    var an=el.querySelector('.an'); if(an&&bk.holder)an.textContent=bk.holder;}); }
  // info
  if(c.info){ var ic=d.querySelectorAll('#info .info-card'); c.info.forEach(function(ff,i){var el=ic[i]; if(!el)return;
    var g=el.querySelector('.ic'); if(g&&ff.icon)g.textContent=ff.icon;
    var hh=el.querySelector('h4'); if(hh&&ff.title)hh.textContent=ff.title;
    var pp=el.querySelector('p'); if(pp&&ff.text)pp.textContent=ff.text;}); }
  // thanks
  if(c.thanks){ t('#thanks .eyebrow',c.thanks.eyebrow); t('#thanks .fam',c.thanks.closing); h('#thanks .credit',c.thanks.credit);
    var tp=d.querySelector('#thanks p:not(.eyebrow):not(.fam):not(.credit)'); if(tp&&c.thanks.message) tp.textContent=c.thanks.message; }
  /* THEME (Fase 2): warna & font dari config.theme */
  if(c.theme){ var _rs=d.documentElement.style, T=c.theme, M={sage:'--sage',sageDark:'--sage-dark',gold:'--gold',goldSoft:'--gold-soft',blush:'--blush',ivory:'--ivory',cream:'--cream',ink:'--ink',inkSoft:'--ink-soft',serif:'--serif',script:'--script',sans:'--sans'};
    for(var _k in M){ if(T[_k]) _rs.setProperty(M[_k], T[_k]); }
    var _hx2rgba=function(h,a){ h=(h||'').replace('#',''); if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2]; var n=parseInt(h,16); return isNaN(n)?'':'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')'; };
    if(T.blush) _rs.setProperty('--petal-1', T.blush);
    if(T.gold||T.blush) _rs.setProperty('--petal-2', T.gold||T.blush);
    var _tint=_hx2rgba(T.cream||T.ivory,.5); if(_tint) _rs.setProperty('--cover-tint', _tint); }
  /* COVER KIND: bentuk kartu cover mengikuti template terpilih */
  if(c.coverKind!==undefined){ var _cv=d.getElementById('cover'); if(_cv){ ['minimal','arch','frame','stamp','wave','botanical'].forEach(function(k){_cv.classList.remove('cover-'+k);}); if(c.coverKind) _cv.classList.add('cover-'+c.coverKind); } }
  /* SECTIONS (Fase 3A): tampil/sembunyi section pilihan */
  if(c.sections){ var S=c.sections; ['quote','countdown','story','events','gallery','gift','info','wishes'].forEach(function(id){ var el=d.getElementById(id); if(!el) return; if(S[id]===false) el.style.display='none'; else el.style.display=''; }); }
  var _mb=d.getElementById('madeBy'); if(_mb) _mb.style.display=(c.noWatermark?'none':'');
};
window.__applyWeddingConfig(CFG);
/* Live preview dari panel klien (Fase 2): terima config via postMessage */
window.addEventListener('message', function(ev){
  if(ev && ev.data && ev.data.type==='WEDDING_PREVIEW' && ev.data.config){
    window.WEDDING_CONFIG = ev.data.config;
    try{ window.__applyWeddingConfig(ev.data.config); }catch(e){}
  }
});
const WEDDING_DATE = new Date((CFG.event&&CFG.event.dateISO)||'2026-12-12T08:00:00+07:00');
/* Penyimpanan RSVP & Ucapan ke Google Sheets.
   Tempel URL Web App Google Apps Script di bawah (lihat panduan code.gs).
   Jika dibiarkan kosong, data hanya tersimpan sementara di perangkat tamu (mode demo). */
const SHEET_ENDPOINT = (CFG.integrations&&CFG.integrations.sheetEndpoint)||'';

/* Kirim data (RSVP / ucapan) ke Google Sheets */
function sendToSheet(payload){
  if(!SHEET_ENDPOINT) return Promise.resolve({offline:true});
  return fetch(SHEET_ENDPOINT,{
    method:'POST',
    headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify(payload)
  }).then(r=>r.json()).catch(()=>({error:true}));
}
/* Ambil daftar ucapan dari Google Sheets */
function fetchWishes(){
  if(!SHEET_ENDPOINT) return Promise.resolve(null);
  return fetch(SHEET_ENDPOINT+'?action=wishes').then(r=>r.json()).catch(()=>null);
}

/* ====== Guest name from URL (?to=Nama) ====== */
(function(){
  const p=new URLSearchParams(location.search).get('to');
  if(p) document.getElementById('guestName').textContent=decodeURIComponent(p);
})();

/* ====== Ornaments (aksesoris) & Falling Effects (efek turun) ====== */
window.__buildFalling=function(type){
  var host=document.getElementById('petals'); if(!host) return;
  host.innerHTML='';
  var map={petals:18,sakura:20,snow:28,leaves:16,hearts:16,sparkle:30};
  var n=map[type]; if(!n) return;
  var cls={petals:'fp-petal',sakura:'fp-sakura',snow:'fp-snow',leaves:'fp-leaf',hearts:'fp-heart',sparkle:'fp-spark'}[type];
  for(var i=0;i<n;i++){
    var el=document.createElement('div'); el.className='fall '+cls;
    var s=(type==='snow'||type==='sparkle')?(4+Math.random()*8):(10+Math.random()*16);
    el.style.left=(Math.random()*100)+'vw';
    el.style.width=el.style.height=s+'px';
    el.style.animationDuration=(7+Math.random()*8)+'s';
    el.style.animationDelay=(-Math.random()*12)+'s';
    el.style.opacity=(.4+Math.random()*.5);
    host.appendChild(el);
  }
};
window.__applyDeco=function(c){
  c=c||{};
  if(!document.querySelector('.orn-frame')) return;
  var O=c.ornaments||{}, b=document.body;
  b.classList.toggle('orn-corners', O.corners!==false);
  b.classList.toggle('orn-border', O.border!==false);
  b.classList.toggle('orn-floral', O.floral!==false);
  b.classList.toggle('orn-divider', O.divider!==false);
  window.__buildFalling((c.effects&&c.effects.falling)||'');
};
window.__applyDeco(window.WEDDING_CONFIG||{});
window.addEventListener('message',function(ev){
  if(ev&&ev.data&&ev.data.type==='WEDDING_PREVIEW'&&ev.data.config){ try{ window.__applyDeco(ev.data.config); }catch(e){} }
});
/* Backward-compat: template tanpa ornamen tetap pakai petals klasik */
(function(){
  if(document.querySelector('.orn-frame')) return;
  var c=document.getElementById('petals'); if(!c) return;
  for(var i=0;i<16;i++){
    var el=document.createElement('div');el.className='petal';
    var s=8+Math.random()*14;
    el.style.left=Math.random()*100+'vw';
    el.style.width=el.style.height=s+'px';
    el.style.animationDuration=(7+Math.random()*8)+'s';
    el.style.animationDelay=(-Math.random()*10)+'s';
    el.style.opacity=(.4+Math.random()*.5);
    c.appendChild(el);
  }
})();

/* ====== Open invitation ====== */
const openBtn=document.getElementById('openBtn');
const cover=document.getElementById('cover');
openBtn.addEventListener('click',()=>{
  cover.classList.add('open');
  document.body.classList.remove('locked');
  startMusic();
  window.scrollTo({top:0});
});

/* ====== Countdown ====== */
function pad(n){return n<10?'0'+n:n}
function tick(){
  const now=new Date();let diff=Math.max(0,WEDDING_DATE-now);
  const d=Math.floor(diff/86400000);diff-=d*86400000;
  const h=Math.floor(diff/3600000);diff-=h*3600000;
  const m=Math.floor(diff/60000);diff-=m*60000;
  const s=Math.floor(diff/1000);
  document.getElementById('cd-d').textContent=d;
  document.getElementById('cd-h').textContent=pad(h);
  document.getElementById('cd-m').textContent=pad(m);
  document.getElementById('cd-s').textContent=pad(s);
}
tick();setInterval(tick,1000);

/* ====== Add to calendar (Google) ====== */
(function(){
  var cal=(CFG.event&&CFG.event.calendar)||{};
  const start=cal.start||'20261212T010000Z',end=cal.end||'20261212T070000Z';
  const url='https://www.google.com/calendar/render?action=TEMPLATE&text='+encodeURIComponent(cal.title||'Pernikahan')+'&dates='+start+'/'+end+'&details='+encodeURIComponent(cal.details||'')+'&location='+encodeURIComponent(cal.location||'');
  document.getElementById('calBtn').href=url;
})();

/* ====== Scroll reveal ====== */
const io=new IntersectionObserver((es)=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.15});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

/* ====== Nav dots ====== */
const secs=[...document.querySelectorAll('section')];
const nav=document.getElementById('navdots');
secs.forEach((s,i)=>{const a=document.createElement('a');a.href='#'+(s.id||'');a.title=s.id;nav.appendChild(a)});
const dots=[...nav.children];
const io2=new IntersectionObserver((es)=>{es.forEach(e=>{if(e.isIntersecting){const i=secs.indexOf(e.target);dots.forEach(d=>d.classList.remove('active'));if(dots[i])dots[i].classList.add('active')}})},{threshold:.5});
secs.forEach(s=>io2.observe(s));

/* ====== Copy account ====== */
document.querySelectorAll('.copy-btn').forEach(b=>{
  b.addEventListener('click',()=>{
    const t=document.getElementById(b.dataset.acc).textContent.replace(/\s/g,'');
    navigator.clipboard&&navigator.clipboard.writeText(t);
    const o=b.textContent;b.textContent='✓ Tersalin';setTimeout(()=>b.textContent=o,1600);
  });
});

/* ====== RSVP ====== */
document.getElementById('rsvpForm').addEventListener('submit',e=>{
  e.preventDefault();
  const n=document.getElementById('rsvpName').value.trim();
  const a=document.getElementById('rsvpAttend').value;
  const c=document.getElementById('rsvpCount').value;
  const note=document.getElementById('rsvpNote');
  const btn=e.target.querySelector('.submit');
  if(!n||!a){note.textContent='Mohon lengkapi data.';return}
  const ob=btn.textContent;btn.textContent='Mengirim...';btn.disabled=true;
  note.textContent='Mengirim konfirmasi...';
  const _saveR=(window.WEDDING_DB_API&&window.WEDDING_DB_API.saveRsvp)?window.WEDDING_DB_API.saveRsvp({name:n,attend:a,count:c}):sendToSheet({type:'rsvp',name:n,attend:a,count:c,t:Date.now()});
  _saveR.then(()=>{
    note.textContent='Terima kasih '+n+'! Konfirmasi Anda ("'+a+'") telah kami terima 💐';
    e.target.reset();
  }).finally(()=>{btn.textContent=ob;btn.disabled=false;});
});

/* ====== Wishes / Guestbook ====== */
const KEY=(CFG.integrations&&CFG.integrations.storageKey)||'wishes_sekar_bimo';
const listEl=document.getElementById('wishList');
const countEl=document.getElementById('wishCount');
const wishForm=document.getElementById('wishForm');
function localLoad(){try{return JSON.parse(localStorage.getItem(KEY))||[]}catch(e){return[]}}
function localSave(a){localStorage.setItem(KEY,JSON.stringify(a))}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function timeAgo(t){const d=Math.floor((Date.now()-t)/1000);if(d<60)return'baru saja';if(d<3600)return Math.floor(d/60)+' menit lalu';if(d<86400)return Math.floor(d/3600)+' jam lalu';return Math.floor(d/86400)+' hari lalu';}
function render(a){
  countEl.innerHTML=a.length+' ucapan &amp; doa terkirim';
  listEl.innerHTML='';
  if(!a.length){listEl.innerHTML='<p style="text-align:center;color:#b3a99d">Jadilah yang pertama mengirim doa ❀</p>';return}
  a.slice().reverse().forEach(w=>{
    const el=document.createElement('div');el.className='wish';
    el.innerHTML='<div class="top"><div class="av">'+esc((w.name[0]||'?')).toUpperCase()+'</div><div><div class="who">'+esc(w.name)+'</div><div class="att">'+esc(w.attend)+'</div></div></div><div class="msg">'+esc(w.msg)+'</div><div class="time">'+timeAgo(w.t)+'</div>';
    listEl.appendChild(el);
  });
}
function refreshWishes(){
  if(window.WEDDING_DB_API&&window.WEDDING_DB_API.fetchWishes){
    window.WEDDING_DB_API.fetchWishes().then(d=>{ render(d||[]); }).catch(()=>render(localLoad()));
    return;
  }
  if(SHEET_ENDPOINT){
    fetchWishes().then(d=>{ render((d&&d.wishes)?d.wishes:localLoad()); });
  }else{
    if(localLoad().length===0){localSave([{name:'Rina',attend:'Insya Allah hadir',msg:'Selamat menempuh hidup baru! Semoga menjadi keluarga sakinah, mawaddah, warahmah.',t:Date.now()-7200000},{name:'Andi & Keluarga',attend:'Turut mendoakan',msg:'Barakallahu lakuma wa baraka alaikuma. Bahagia selalu ya kalian berdua!',t:Date.now()-3600000}]);}
    render(localLoad());
  }
}
refreshWishes();
wishForm.addEventListener('submit',e=>{
  e.preventDefault();
  const name=document.getElementById('wishName').value.trim();
  const attend=document.getElementById('wishAttend').value;
  const msg=document.getElementById('wishMsg').value.trim();
  if(!name||!msg)return;
  const btn=wishForm.querySelector('.submit');const ob=btn.textContent;btn.textContent='Mengirim...';btn.disabled=true;
  const entry={type:'wish',name:name,attend:attend,msg:msg,t:Date.now()};
  if(window.WEDDING_DB_API&&window.WEDDING_DB_API.saveWish){
    window.WEDDING_DB_API.saveWish({name:name,attend:attend,msg:msg}).then(()=>{ setTimeout(refreshWishes,400); })
      .finally(()=>{btn.textContent=ob;btn.disabled=false;e.target.reset();});
  }else if(SHEET_ENDPOINT){
    sendToSheet(entry).then(()=>{ setTimeout(refreshWishes,500); })
      .finally(()=>{btn.textContent=ob;btn.disabled=false;e.target.reset();});
  }else{
    const a=localLoad();a.push(entry);localSave(a);render(a);
    btn.textContent=ob;btn.disabled=false;e.target.reset();listEl.scrollTop=0;
  }
});

/* ====== Ambient music (WebAudio, offline) ====== */
let audioCtx=null,musicOn=false,seqTimer=null;
const musicBtn=document.getElementById('musicBtn');
const notes=[523.25,587.33,659.25,783.99,659.25,587.33,493.88,440.00];
let ni=0;
function playNote(){
  if(!audioCtx)return;
  const o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.type='sine';o.frequency.value=notes[ni%notes.length];ni++;
  const bass=audioCtx.createOscillator(),bg=audioCtx.createGain();
  bass.type='triangle';bass.frequency.value=notes[ni%notes.length]/2;
  g.gain.setValueAtTime(0,audioCtx.currentTime);
  g.gain.linearRampToValueAtTime(.12,audioCtx.currentTime+.1);
  g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+1.4);
  bg.gain.setValueAtTime(.05,audioCtx.currentTime);
  bg.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+1.4);
  o.connect(g).connect(audioCtx.destination);
  bass.connect(bg).connect(audioCtx.destination);
  o.start();o.stop(audioCtx.currentTime+1.5);
  bass.start();bass.stop(audioCtx.currentTime+1.5);
}
const bgm=document.getElementById('bgm');
function startMusic(){
  if(musicOn)return;
  musicOn=true;musicBtn.classList.add('playing');
  /* Jika file lagu tersedia (src terisi), putar file itu; jika tidak, pakai instrumental bawaan. */
  if(bgm&&bgm.getAttribute('src')){
    bgm.volume=.6;
    const pr=bgm.play();
    if(pr&&pr.catch)pr.catch(()=>{startSynth();});
    return;
  }
  startSynth();
}
function startSynth(){
  try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();}catch(e){return}
  audioCtx.resume();
  playNote();seqTimer=setInterval(playNote,900);
}
function stopMusic(){
  musicOn=false;musicBtn.classList.remove('playing');clearInterval(seqTimer);
  if(bgm){try{bgm.pause();}catch(e){}}
}
musicBtn.addEventListener('click',()=>{musicOn?stopMusic():startMusic();});

/* ====== Bagikan undangan ====== */
(function(){
  const wa=document.getElementById('waShare');
  const copy=document.getElementById('copyInv');
  const url=location.href.split('?')[0];
  const txt=((CFG.share&&CFG.share.waText)||'Info lengkap & konfirmasi kehadiran: ')+url;
  if(wa)wa.href='https://wa.me/?text='+encodeURIComponent(txt);
  if(copy)copy.addEventListener('click',()=>{
    navigator.clipboard&&navigator.clipboard.writeText(url);
    const o=copy.textContent;copy.textContent='✓ Link tersalin';setTimeout(()=>copy.textContent=o,1800);
  });
})();

}); /* end __configReady boot */
