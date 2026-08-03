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
    var mb=el.querySelector('.map-btn');if(mb){if(e.mapButtonEnabled===false||!e.mapUrl){mb.style.display='none';mb.removeAttribute('href')}else{mb.style.display='inline-block';mb.href=e.mapUrl}}}); }
  // gallery — layout adapts to the actual number of uploaded photos
  var _gg=d.querySelector('#gallery .gal-grid');
  if(_gg){
    var _ags=d.getElementById('adaptive-gallery-css');if(!_ags){_ags=d.createElement('style');_ags.id='adaptive-gallery-css';_ags.textContent=
      '#gallery .gal-grid{width:100%;margin-inline:auto;transition:max-width .25s ease}' +
      '#gallery .gal-grid .cell{min-width:0;box-sizing:border-box}' +
      '#gallery .gal-grid.gc-1{max-width:680px}' +
      '#gallery .gal-grid.gl-grid.gc-1{grid-template-columns:minmax(0,1fr)!important}#gallery .gal-grid.gl-grid.gc-2{grid-template-columns:repeat(2,minmax(0,1fr))!important}#gallery .gal-grid.gl-grid.gc-3{grid-template-columns:repeat(3,minmax(0,1fr))!important}' +
      '#gallery .gal-grid.gl-grid.gc-4{grid-template-columns:repeat(2,minmax(0,1fr))!important}#gallery .gal-grid.gl-grid.gc-odd .cell:last-child{grid-column:auto}' +
      '#gallery .gal-grid.gl-mosaic.gc-1{grid-template-columns:1fr!important;grid-auto-rows:auto!important}#gallery .gal-grid.gl-mosaic.gc-1 .cell{grid-column:1!important;grid-row:auto!important;aspect-ratio:16/10!important}' +
      '#gallery .gal-grid.gl-mosaic.gc-2{grid-template-columns:repeat(2,minmax(0,1fr))!important;grid-auto-rows:auto!important}#gallery .gal-grid.gl-mosaic.gc-2 .cell{grid-column:auto!important;grid-row:auto!important;aspect-ratio:4/5!important}' +
      '#gallery .gal-grid.gl-mosaic.gc-3{grid-template-columns:repeat(2,minmax(0,1fr))!important;grid-auto-rows:150px!important}#gallery .gal-grid.gl-mosaic.gc-3 .cell:first-child{grid-row:span 2!important}#gallery .gal-grid.gl-mosaic.gc-3 .cell:not(:first-child){grid-column:2!important;grid-row:span 1!important}' +
      '#gallery .gal-grid.gl-mosaic.gc-odd:not(.gc-1):not(.gc-3) .cell:last-child{grid-column:1/-1!important;grid-row:span 2!important}' +
      '#gallery .gal-grid.gl-masonry.gc-1{column-count:1!important;max-width:620px}#gallery .gal-grid.gl-masonry.gc-2{column-count:2!important}#gallery .gal-grid.gl-masonry.gc-3,#gallery .gal-grid.gl-masonry.gc-4,#gallery .gal-grid.gl-masonry.gc-many{column-count:3!important}' +
      '#gallery .gal-grid.gl-film.gc-1{justify-content:center;overflow:hidden!important}#gallery .gal-grid.gl-film.gc-1 .cell{flex:0 1 680px!important}#gallery .gal-grid.gl-film.gc-2{overflow:hidden!important}#gallery .gal-grid.gl-film.gc-2 .cell{flex:1 1 0!important}#gallery .gal-grid.gl-film.gc-3 .cell{flex:0 0 calc(50% - 6px)!important}' +
      '#gallery .gal-grid.gl-collage.gc-1{grid-template-columns:1fr!important;grid-auto-rows:auto!important}#gallery .gal-grid.gl-collage.gc-1 .cell{grid-column:1!important;grid-row:auto!important;aspect-ratio:16/10!important}' +
      '#gallery .gal-grid.gl-collage.gc-2{grid-template-columns:repeat(2,minmax(0,1fr))!important;grid-auto-rows:auto!important}#gallery .gal-grid.gl-collage.gc-2 .cell{grid-column:auto!important;grid-row:auto!important;aspect-ratio:4/5!important}' +
      '#gallery .gal-grid.gl-collage.gc-3{grid-template-columns:repeat(2,minmax(0,1fr))!important;grid-auto-rows:145px!important}#gallery .gal-grid.gl-collage.gc-3 .cell:first-child{grid-column:1/-1!important;grid-row:span 2!important}#gallery .gal-grid.gl-collage.gc-3 .cell:not(:first-child){grid-column:span 1!important;grid-row:span 1!important}' +
      '#gallery .gal-grid.gl-collage.gc-odd:not(.gc-1):not(.gc-3) .cell:last-child{grid-column:1/-1!important;grid-row:span 2!important}' +
      '#gallery .gal-grid.gl-polaroid.gc-1 .cell{width:min(100%,360px)!important}#gallery .gal-grid.gl-polaroid.gc-2 .cell{width:min(44%,260px)!important}#gallery .gal-grid.gl-polaroid.gc-3 .cell{width:min(29%,210px)!important}' +
      '@media(max-width:640px){#gallery .gal-grid.gl-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}#gallery .gal-grid.gl-grid.gc-1{grid-template-columns:1fr!important}#gallery .gal-grid.gl-grid.gc-3 .cell:last-child,#gallery .gal-grid.gl-grid.gc-odd:not(.gc-1) .cell:last-child{grid-column:1/-1!important;aspect-ratio:16/10}' +
      '#gallery .gal-grid.gl-masonry.gc-1{column-count:1!important}#gallery .gal-grid.gl-masonry:not(.gc-1){column-count:2!important}#gallery .gal-grid.gl-film.gc-2 .cell,#gallery .gal-grid.gl-film.gc-3 .cell{flex:0 0 78%!important}#gallery .gal-grid.gl-polaroid.gc-2 .cell,#gallery .gal-grid.gl-polaroid.gc-3 .cell{width:min(43%,170px)!important}' +
      '#gallery .gal-grid.gl-mosaic.gc-3,#gallery .gal-grid.gl-collage.gc-3{grid-auto-rows:105px!important}}';d.head.appendChild(_ags);}
    if(c.galleryLayout!==undefined){ ['grid','mosaic','masonry','film','collage','polaroid'].forEach(function(k){_gg.classList.remove('gl-'+k);}); if(c.galleryLayout) _gg.classList.add('gl-'+c.galleryLayout); }
    var _ph=(c.gallery||[]).filter(function(x){return x&&String(x).trim();}),_cnt=_ph.length;
    ['gc-0','gc-1','gc-2','gc-3','gc-4','gc-5','gc-6','gc-many','gc-odd','gc-even'].forEach(function(k){_gg.classList.remove(k);});
    _gg.classList.add(_cnt<=6?'gc-'+_cnt:'gc-many');_gg.classList.add(_cnt%2?'gc-odd':'gc-even');_gg.setAttribute('data-count',_cnt);
    var _gnm=((c.couple&&c.couple.brideShort)||'')+' & '+((c.couple&&c.couple.groomShort)||''),_gh='';_ph.forEach(function(src,i){_gh+='<div class="cell"><img src="'+src+'" loading="lazy" decoding="async" alt="Galeri '+_gnm+' '+(i+1)+'"></div>';});_gg.innerHTML=_gh;var _gsec=d.getElementById('gallery');if(_gsec)_gsec.style.display=_cnt?'':'none';
  }
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
    for(var _k in M){ if(T[_k]) _rs.setProperty(M[_k], T[_k]); } }
  /* PRIORITAS 2: FOTO SAMPUL DAN HERO */
  (function(){
    var P=c.coverPhoto||{},style=d.getElementById('p2-cover-photo-css');
    if(!style){style=d.createElement('style');style.id='p2-cover-photo-css';style.textContent='.p2-photo-host{isolation:isolate;overflow:hidden!important}.p2-photo-host>*:not(.p2-cover-photo-layer){position:relative;z-index:2}.p2-cover-photo-layer{position:absolute;z-index:0;pointer-events:none;overflow:hidden}.p2-cover-photo-layer.p2-full{inset:0}.p2-cover-photo-layer.p2-frame{inset:9% 11% 17%;border:clamp(4px,1vw,10px) solid rgba(255,255,255,.9);border-radius:clamp(18px,4vw,42px);box-shadow:0 18px 55px rgba(24,18,13,.25)}.p2-cover-photo-layer img{width:100%;height:100%;object-fit:cover;transform:scale(var(--p2-zoom,1));filter:blur(var(--p2-blur,0px));transition:transform .28s ease,filter .28s ease}.p2-cover-photo-layer:after{content:"";position:absolute;inset:0;background:rgba(20,15,12,var(--p2-overlay,.35));transition:background .25s}.p2-cover-photo-layer.p2-light:after{background:rgba(255,249,238,var(--p2-overlay,.35))}.p2-cover-photo-layer.p2-error{background:radial-gradient(circle at 50% 35%,rgba(255,255,255,.25),transparent 42%),linear-gradient(145deg,var(--cream,#eee3d2),var(--blush,#c9a99c))}.p2-cover-photo-layer.p2-error img{display:none}@media(max-width:620px){.p2-cover-photo-layer.p2-frame{inset:8% 7% 18%;border-width:5px;border-radius:24px}}';d.head.appendChild(style);}
    ['cover','hero'].forEach(function(id){var h=d.getElementById(id);if(!h)return;var old=h.querySelector('.p2-cover-photo-layer');if(old)old.remove();h.classList.remove('p2-photo-host');if(h.hasAttribute('data-p2-old-minheight')){h.style.minHeight=h.getAttribute('data-p2-old-minheight')||'';h.removeAttribute('data-p2-old-minheight');}});
    if(!P.enabled||!P.image)return;
    var ids=P.target==='hero'?['hero']:(P.target==='both'?['cover','hero']:['cover']);
    ids.forEach(function(id){var h=d.getElementById(id);if(!h)return;h.setAttribute('data-p2-old-minheight',h.style.minHeight||'');h.style.minHeight=(Math.max(60,Math.min(130,parseInt(P.height,10)||100)))+'svh';h.classList.add('p2-photo-host');var layer=d.createElement('div');layer.className='p2-cover-photo-layer p2-'+(P.mode==='frame'?'frame':'full')+(P.overlayTone==='light'?' p2-light':'');layer.style.setProperty('--p2-zoom',String(Math.max(100,Math.min(170,+P.zoom||100))/100));layer.style.setProperty('--p2-blur',Math.max(0,Math.min(20,+P.blur||0))+'px');layer.style.setProperty('--p2-overlay',String(Math.max(0,Math.min(80,+P.overlay||0))/100));var img=d.createElement('img');img.alt='Foto sampul pernikahan';img.decoding='async';img.src=P.image;img.style.objectPosition=(Math.max(0,Math.min(100,+P.focalX||50)))+'% '+(Math.max(0,Math.min(100,+P.focalY||50)))+'%';img.onerror=function(){layer.classList.add('p2-error')};img.onload=function(){layer.classList.remove('p2-error')};layer.appendChild(img);h.insertBefore(layer,h.firstChild);});
  })();
  /* PRIORITAS 3: RSVP LENGKAP */
  (function(){
    var R=c.rsvp||{},form=d.getElementById('rsvpForm');if(!form)return;
    var st=d.getElementById('p3-rsvp-css');if(!st){st=d.createElement('style');st.id='p3-rsvp-css';st.textContent='#rsvpForm .p3-rsvp-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}#rsvpForm .p3-deadline{margin:4px 0 14px;padding:9px 11px;border-radius:10px;background:rgba(201,162,75,.12);font-size:12px;text-align:center}#rsvpForm.p3-closed{opacity:.82}#rsvpForm.p3-closed .submit{cursor:not-allowed;filter:grayscale(.5)}@media(max-width:560px){#rsvpForm .p3-rsvp-two{grid-template-columns:1fr}}';d.head.appendChild(st);}
    var attend=d.getElementById('rsvpAttend'),count=d.getElementById('rsvpCount'),submit=form.querySelector('.submit');
    if(attend){var av=attend.value;attend.innerHTML='<option value="">-- Pilih kehadiran --</option><option value="Hadir">Hadir</option><option value="Ragu">Belum pasti</option><option value="Tidak">Tidak hadir</option>';if(['Hadir','Ragu','Tidak'].indexOf(av)>=0)attend.value=av;}
    if(count){var cv=parseInt(count.value,10)||1,max=Math.max(1,Math.min(20,parseInt(R.maxGuests,10)||4)),oh='';for(var i=1;i<=max;i++)oh+='<option value="'+i+'">'+i+' orang</option>';count.innerHTML=oh;count.value=String(Math.min(cv,max));}
    var ev=d.getElementById('rsvpEvent');if(!ev){var ef=d.createElement('div');ef.className='field p3-event-field';ef.innerHTML='<label>Acara yang akan dihadiri</label><select id="rsvpEvent"><option value="">-- Pilih acara --</option></select>';var cf=count&&count.closest('.field');if(cf)cf.insertAdjacentElement('afterend',ef);else form.insertBefore(ef,submit);ev=d.getElementById('rsvpEvent');}
    var choices=(R.eventChoices&&R.eventChoices.length?R.eventChoices:['Akad','Resepsi','Keduanya']),evv=ev.value;ev.innerHTML='<option value="">-- Pilih acara --</option>'+choices.map(function(x){return '<option value="'+String(x).replace(/"/g,'&quot;')+'">'+x+'</option>';}).join('');if(choices.indexOf(evv)>=0)ev.value=evv;var efld=ev.closest('.field');if(efld)efld.style.display=R.askEvent===false?'none':'';
    var gn=d.getElementById('rsvpGuestNote');if(!gn){var nf=d.createElement('div');nf.className='field p3-note-field';nf.innerHTML='<label>Catatan untuk mempelai (opsional)</label><textarea id="rsvpGuestNote" rows="3" maxlength="500" placeholder="Tuliskan kebutuhan atau informasi tambahan"></textarea>';form.insertBefore(nf,submit);gn=d.getElementById('rsvpGuestNote');}var nfld=gn.closest('.field');if(nfld)nfld.style.display=R.askNote===false?'none':'';
    var info=d.getElementById('rsvpDeadlineInfo');if(!info){info=d.createElement('p');info.id='rsvpDeadlineInfo';info.className='p3-deadline';form.insertBefore(info,form.firstChild);}
    var expired=false;if(R.deadline){var end=new Date(R.deadline+'T23:59:59');expired=!isNaN(end)&&Date.now()>end.getTime();info.textContent=expired?'Batas RSVP telah berakhir.':'Mohon konfirmasi paling lambat '+end.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})+'.';info.style.display='';}else info.style.display='none';
    form.classList.toggle('p3-closed',expired);Array.prototype.forEach.call(form.querySelectorAll('input,select,textarea'),function(x){x.disabled=expired;});if(submit){submit.disabled=expired;submit.textContent=expired?'RSVP Ditutup':(R.buttonText||'Kirim Konfirmasi');}
    function countState(){if(!count||expired)return;var yes=attend&&attend.value==='Hadir';count.disabled=!yes;if(!yes)count.value='1';}
    if(attend)attend.onchange=countState;countState();
  })();
  /* SECTIONS (Fase 3A): tampil/sembunyi section pilihan */
  if(c.sections){ var S=c.sections; ['quote','countdown','story','events','gallery','gift','info','wishes'].forEach(function(id){ var el=d.getElementById(id); if(!el) return; if(S[id]===false||(id==='gallery'&&!(c.gallery||[]).filter(function(x){return x&&String(x).trim()}).length))el.style.display='none';else el.style.display=''; }); }
  /* TAHAP 3: amplop, animasi masuk, hitung mundur, jejak kelopak, favicon */
  var _t3s=d.getElementById('t3-visual-css');
  if(!_t3s){ _t3s=d.createElement('style'); _t3s.id='t3-visual-css'; _t3s.textContent=
    '#openBtn.open-envelope{background:transparent!important;color:var(--ink,#40372f)!important;box-shadow:none!important;flex-direction:column!important;gap:9px!important;padding:8px 18px!important}' +
    '#openBtn.open-envelope:hover{transform:translateY(-3px)!important;background:transparent!important}' +
    '#openBtn.open-envelope .ico{display:block;position:relative;width:56px;height:38px;border:2px solid var(--gold,#c9a24b);border-radius:5px;background:rgba(255,255,255,.62);font-size:0!important;animation:t3Envelope 1.8s ease-in-out infinite!important;overflow:hidden}' +
    '#openBtn.open-envelope .ico:before{content:"";position:absolute;left:7px;top:-20px;width:38px;height:38px;background:rgba(255,255,255,.95);border-right:2px solid var(--gold,#c9a24b);border-bottom:2px solid var(--gold,#c9a24b);transform:rotate(45deg);transform-origin:center;animation:t3Flap 1.8s ease-in-out infinite}' +
    '#openBtn.open-envelope .ico:after{content:"♥";position:absolute;inset:8px 0 0;color:var(--gold,#c9a24b);font-size:18px;line-height:24px}' +
    '@keyframes t3Envelope{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes t3Flap{0%,100%{transform:rotate(45deg) translate(0,0)}45%,65%{transform:rotate(45deg) translate(-5px,-5px)}}' +
    'body.rv-none .reveal{opacity:1!important;transform:none!important;transition:none!important}' +
    'body.rv-fade .reveal{opacity:0!important;transform:none!important}body.rv-fade .reveal.in{opacity:1!important;transform:none!important}' +
    'body.rv-slide .reveal{opacity:0!important;transform:translateY(38px)!important}body.rv-slide .reveal.in{opacity:1!important;transform:none!important}' +
    'body.rv-zoom .reveal{opacity:0!important;transform:scale(.88)!important}body.rv-zoom .reveal.in{opacity:1!important;transform:scale(1)!important}' +
    'body.rv-speed-slow .reveal{transition-duration:1.35s!important}body.rv-speed-normal .reveal{transition-duration:.85s!important}body.rv-speed-fast .reveal{transition-duration:.38s!important}' +
    'body.cd-card #countdown .cd-box,body.cd-card #countdown .cd>div{background:rgba(255,255,255,.68)!important;border:1px solid var(--gold,#c9a24b)!important;border-radius:16px!important;box-shadow:0 12px 30px rgba(0,0,0,.09)!important;padding:18px 8px!important}' +
    'body.cd-circle #countdown .cd-grid,body.cd-circle #countdown .cd{align-items:center!important}' +
    'body.cd-circle #countdown .cd-box,body.cd-circle #countdown .cd>div{aspect-ratio:1!important;border:2px solid var(--gold,#c9a24b)!important;border-radius:50%!important;background:rgba(255,255,255,.38)!important;box-shadow:none!important;padding:8px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;min-width:0!important}' +
    'body.cd-minimal #countdown .cd-box,body.cd-minimal #countdown .cd>div{background:transparent!important;border:0!important;border-bottom:2px solid var(--gold,#c9a24b)!important;border-radius:0!important;box-shadow:none!important;padding:12px 5px!important}' +
    '.t3-trail-petal{position:fixed;z-index:9999;pointer-events:none;width:11px;height:16px;border-radius:80% 15% 80% 15%;background:var(--petal-1,#e7c6c2);box-shadow:0 0 5px rgba(0,0,0,.08);animation:t3Petal .9s ease-out forwards;transform:rotate(var(--r,0deg))}' +
    '@keyframes t3Petal{0%{opacity:.9;translate:0 0;scale:1}100%{opacity:0;translate:var(--dx,12px) 34px;scale:.35;rotate:120deg}}' +
    '@media(max-width:899px),(pointer:coarse){.t3-trail-petal{display:none!important}}'; d.head.appendChild(_t3s); }
  var _tb=d.body;
  if(_tb){ ['rv-fade','rv-slide','rv-zoom','rv-none','rv-speed-slow','rv-speed-normal','rv-speed-fast','cd-card','cd-circle','cd-minimal'].forEach(function(k){_tb.classList.remove(k);});
    var _rv=c.revealStyle||''; if(_rv) _tb.classList.add('rv-'+_rv);
    _tb.classList.add('rv-speed-'+(c.revealSpeed||'normal'));
    if(c.countdownStyle) _tb.classList.add('cd-'+c.countdownStyle); }
  var _ob3=d.getElementById('openBtn'); if(_ob3){ var _env=c.coverOpenStyle==='envelope'; _ob3.classList.toggle('open-envelope',_env); var _oi=_ob3.querySelector('.ico'); if(_oi) _oi.textContent=_env?'':'✉'; }
  if(c.meta&&c.meta.icon){ var _fi=d.querySelector('link[rel="icon"]'); if(!_fi){_fi=d.createElement('link');_fi.rel='icon';d.head.appendChild(_fi);} var _svg="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.88em' font-size='86'>"+c.meta.icon+"</text></svg>"; _fi.href='data:image/svg+xml,'+encodeURIComponent(_svg); }
  var _trailOn=(c.cursorPetals===true)&&window.matchMedia&&window.matchMedia('(min-width:900px) and (pointer:fine)').matches;
  if(_trailOn&&!window.__t3TrailBound){ window.__t3TrailLast=0; window.__t3TrailHandler=function(e){ var _now=Date.now(); if(_now-window.__t3TrailLast<55)return; window.__t3TrailLast=_now; var _p=document.createElement('i');_p.className='t3-trail-petal';_p.style.left=(e.clientX-5)+'px';_p.style.top=(e.clientY-7)+'px';_p.style.setProperty('--r',(Math.random()*180)+'deg');_p.style.setProperty('--dx',((Math.random()-.5)*34)+'px');document.body.appendChild(_p);setTimeout(function(){_p.remove();},950);}; window.addEventListener('pointermove',window.__t3TrailHandler,{passive:true}); window.__t3TrailBound=true; }
  else if(!_trailOn&&window.__t3TrailBound){ window.removeEventListener('pointermove',window.__t3TrailHandler); window.__t3TrailBound=false; }
  /* TAHAP 4: foto kisah, restu orang tua, tanda tangan digital */
  var _t4s=d.getElementById('t4-content-css'); if(!_t4s){_t4s=d.createElement('style');_t4s.id='t4-content-css';_t4s.textContent=
    '#story .t4-story-photo{display:block;width:100%;height:190px;object-fit:cover;border-radius:16px;margin:0 0 18px;box-shadow:0 12px 28px rgba(0,0,0,.12)}' +
    '#t4-parent-blessing{max-width:960px;margin:54px auto 0;padding:0 22px;text-align:center;color:inherit}' +
    '#t4-parent-blessing .t4-bless-title{font-family:var(--serif,Georgia,serif);font-size:clamp(25px,5vw,40px);margin:0 0 22px;color:inherit}' +
    '#t4-parent-blessing .t4-bless-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}' +
    '#t4-parent-blessing .t4-bless-card{padding:26px 22px;border:1px solid var(--gold,#c9a24b);border-radius:18px;background:rgba(255,255,255,.38);box-shadow:0 14px 34px rgba(0,0,0,.07)}' +
    '#t4-parent-blessing .t4-bless-card p{margin:0 0 16px;font-family:var(--serif,Georgia,serif);font-style:italic;line-height:1.75}' +
    '#t4-parent-blessing .t4-bless-card strong{display:block;color:var(--gold,#c9a24b);font-weight:600}' +
    '#t4-signature{margin:28px auto 22px;display:flex;justify-content:center;align-items:flex-end;gap:48px;flex-wrap:wrap}' +
    '#t4-signature .t4-sign{min-width:140px;text-align:center}' +
    '#t4-signature .t4-sign span{display:block;font-family:var(--script,"Great Vibes",cursive);font-size:clamp(34px,7vw,56px);line-height:1.05;color:inherit}' +
    '#t4-signature .t4-sign small{display:block;margin-top:8px;padding-top:7px;border-top:1px solid currentColor;opacity:.65;font-size:11px;letter-spacing:.12em;text-transform:uppercase}' +
    '@media(max-width:640px){#t4-parent-blessing .t4-bless-grid{grid-template-columns:1fr}#story .t4-story-photo{height:160px}#t4-signature{gap:24px}}';d.head.appendChild(_t4s);}
  if(c.story){var _tls=d.querySelectorAll('#story .tl-item');c.story.forEach(function(_st,_i){var _el=_tls[_i];if(!_el)return;var _im=_el.querySelector('.t4-story-photo');if(_st.photo){if(!_im){_im=d.createElement('img');_im.className='t4-story-photo';_im.loading='lazy';_im.alt='Foto '+(_st.title||('kisah '+(_i+1)));_el.insertBefore(_im,_el.firstChild);}_im.src=_st.photo;_im.style.display='block';}else if(_im){_im.remove();}});}
  var _pb=c.parentsBlessing,_pbs=d.getElementById('t4-parent-blessing'),_cpl=d.getElementById('couple');
  if(_pb&&_pb.enabled&&_cpl){if(!_pbs){_pbs=d.createElement('div');_pbs.id='t4-parent-blessing';_pbs.innerHTML='<h3 class="t4-bless-title"></h3><div class="t4-bless-grid"><div class="t4-bless-card"><p></p><strong></strong></div><div class="t4-bless-card"><p></p><strong></strong></div></div>';_cpl.appendChild(_pbs);} _pbs.style.display='block';_pbs.querySelector('.t4-bless-title').textContent=_pb.title||'Doa & Restu Orang Tua';var _bc=_pbs.querySelectorAll('.t4-bless-card');_bc[0].querySelector('p').textContent=_pb.brideText||'';_bc[0].querySelector('strong').textContent=_pb.brideNames||'';_bc[1].querySelector('p').textContent=_pb.groomText||'';_bc[1].querySelector('strong').textContent=_pb.groomNames||'';}else if(_pbs){_pbs.remove();}
  var _sg=c.signature,_sge=d.getElementById('t4-signature'),_thx=d.getElementById('thanks');
  if(_sg&&_sg.enabled&&_thx){if(!_sge){_sge=d.createElement('div');_sge.id='t4-signature';_sge.innerHTML='<div class="t4-sign"><span></span><small>Mempelai wanita</small></div><div class="t4-sign"><span></span><small>Mempelai pria</small></div>';var _share=_thx.querySelector('.share,.share-row');if(_share)_share.parentNode.insertBefore(_sge,_share);else _thx.appendChild(_sge);} _sge.style.display='flex';var _sn=_sge.querySelectorAll('.t4-sign span');_sn[0].textContent=_sg.bride||((c.couple&&c.couple.brideShort)||'');_sn[1].textContent=_sg.groom||((c.couple&&c.couple.groomShort)||'');}else if(_sge){_sge.remove();}
  /* TAHAP 5: peta, rute, akses lokasi, QRIS, palet dress code */
  var _t5s=d.getElementById('t5-location-css');if(!_t5s){_t5s=d.createElement('style');_t5s.id='t5-location-css';_t5s.textContent=
    '.t5-event-map{margin-top:18px;overflow:hidden;border:1px solid var(--gold,#c9a24b);border-radius:15px;background:rgba(255,255,255,.35)}.t5-event-map iframe{display:block;width:100%;height:220px;border:0}.t5-route{display:inline-flex;align-items:center;justify-content:center;margin:12px;padding:10px 16px;border-radius:999px;background:var(--gold,#c9a24b);color:#fff!important;text-decoration:none;font-size:13px;font-weight:600}' +
    '#t5-location-info{max-width:1040px;margin:34px auto 0;padding:0 22px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px;text-align:center;color:inherit}.t5-access-card{padding:21px 17px;border:1px solid var(--gold,#c9a24b);border-radius:16px;background:rgba(255,255,255,.38)}.t5-access-card b{display:block;margin-bottom:8px;color:var(--gold,#c9a24b)}.t5-access-card p{margin:0;line-height:1.65}' +
    '#t5-qris{max-width:360px;margin:28px auto 0;padding:24px;text-align:center;border:1px solid var(--gold,#c9a24b);border-radius:20px;background:rgba(255,255,255,.5);color:inherit}#t5-qris h3{margin:0 0 14px;font-family:var(--serif,Georgia,serif)}#t5-qris img{display:block;width:min(100%,260px);height:auto;margin:0 auto 12px;border-radius:12px;background:#fff;padding:8px;box-sizing:border-box}#t5-qris p{margin:0;opacity:.75}' +
    '.t5-dress-colors{display:flex;justify-content:center;gap:10px;margin-top:16px}.t5-dress-dot{width:30px;height:30px;border-radius:50%;border:3px solid rgba(255,255,255,.85);box-shadow:0 0 0 1px rgba(0,0,0,.18),0 5px 12px rgba(0,0,0,.12)}' +
    '@media(max-width:700px){#t5-location-info{grid-template-columns:1fr}.t5-event-map iframe{height:190px}}';d.head.appendChild(_t5s);}
  if(c.events){var _ecs=d.querySelectorAll('#events .event-card');c.events.forEach(function(_ev,_i){var _ec=_ecs[_i];if(!_ec)return;var _mx=_ec.querySelector('.t5-event-map');if(_ev.embedEnabled){if(!_mx){_mx=d.createElement('div');_mx.className='t5-event-map';_mx.innerHTML='<iframe loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Peta lokasi acara"></iframe><a class="t5-route" target="_blank" rel="noopener">🧭 Rute dari lokasi saya</a>';_ec.appendChild(_mx);}var _ms='https://www.google.com/maps?q='+encodeURIComponent(_ev.location||'')+'&output=embed';_mx.querySelector('iframe').src=_ms;var _ra=_mx.querySelector('.t5-route');if(_ev.routeEnabled!==false){_ra.style.display='inline-flex';_ra.href='https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(_ev.location||'');}else{_ra.style.display='none';_ra.removeAttribute('href');}}else if(_mx){_mx.remove();}});}
  var _li=c.locationInfo,_lie=d.getElementById('t5-location-info'),_evs=d.getElementById('events');if(_li&&_li.enabled&&_evs){if(!_lie){_lie=d.createElement('div');_lie.id='t5-location-info';_lie.innerHTML='<div class="t5-access-card"><b>📍 Patokan</b><p></p></div><div class="t5-access-card"><b>🅿️ Parkir</b><p></p></div><div class="t5-access-card"><b>🚆 Transportasi Umum</b><p></p></div>';_evs.appendChild(_lie);}var _cards=_lie.querySelectorAll('.t5-access-card'),_lp=_lie.querySelectorAll('p');_lp[0].textContent=_li.landmark||'';_lp[1].textContent=_li.parking||'';_lp[2].textContent=_li.transport||'';_cards[0].style.display=_li.landmarkEnabled===false?'none':'';_cards[1].style.display=_li.parkingEnabled===false?'none':'';_cards[2].style.display=_li.transportEnabled===false?'none':'';}else if(_lie){_lie.remove();}
  var _qr=c.qris,_qre=d.getElementById('t5-qris'),_gift=d.getElementById('gift');if(_qr&&_qr.enabled&&_qr.image&&_gift){if(!_qre){_qre=d.createElement('div');_qre.id='t5-qris';_qre.innerHTML='<h3></h3><img loading="lazy" decoding="async" alt="Kode QRIS hadiah"><p></p>';_gift.appendChild(_qre);}_qre.querySelector('h3').textContent=_qr.label||'Scan QRIS';_qre.querySelector('img').src=_qr.image;_qre.querySelector('p').textContent=_qr.holder||'';}else if(_qre){_qre.remove();}
  var _dc=c.dressCode,_dce=d.querySelector('#info .t5-dress-colors');if(_dc&&_dc.enabled){var _cards=d.querySelectorAll('#info .info-card'),_target=null;for(var _di=0;_di<_cards.length;_di++){var _hh=_cards[_di].querySelector('h4');if(_hh&&/dress/i.test(_hh.textContent)){_target=_cards[_di];break;}}if(!_target&&_cards[0])_target=_cards[0];if(_target){if(!_dce){_dce=d.createElement('div');_dce.className='t5-dress-colors';_target.appendChild(_dce);}_dce.innerHTML='';[_dc.color1,_dc.color2,_dc.color3,_dc.color4].filter(Boolean).forEach(function(_col){var _dot=d.createElement('span');_dot.className='t5-dress-dot';_dot.style.background=_col;_dot.title=_col;_dce.appendChild(_dot);});}}else if(_dce){_dce.remove();}
  /* TAHAP 6: dwibahasa, Hijriah/weton, preset adat */
  var _t6s=d.getElementById('t6-culture-css');if(!_t6s){_t6s=d.createElement('style');_t6s.id='t6-culture-css';_t6s.textContent=
    '#t6-lang-toggle{position:fixed;top:14px;left:14px;z-index:9997;display:flex;padding:4px;border:1px solid var(--gold,#c9a24b);border-radius:999px;background:rgba(255,255,255,.9);box-shadow:0 8px 24px rgba(0,0,0,.12);backdrop-filter:blur(8px)}#t6-lang-toggle button{border:0;background:transparent;color:#40372f;padding:7px 11px;border-radius:999px;font:600 12px/1 sans-serif;cursor:pointer}#t6-lang-toggle button.active{background:var(--gold,#c9a24b);color:#fff}' +
    '#t6-cultural-date{margin:14px auto 0;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;font-size:13px}#t6-cultural-date span{padding:7px 12px;border:1px solid var(--gold,#c9a24b);border-radius:999px;background:rgba(255,255,255,.42)}' +
    '#t6-culture-frame{position:fixed;inset:7px;z-index:54;pointer-events:none;border:3px double var(--t6-accent,#c9a24b);border-radius:10px;box-shadow:inset 0 0 0 3px rgba(255,255,255,.28)}#t6-culture-frame:before{content:attr(data-label);position:absolute;top:7px;right:12px;padding:3px 9px;border-radius:999px;background:var(--t6-accent,#c9a24b);color:#fff;font:600 10px/1.4 sans-serif;letter-spacing:.12em;text-transform:uppercase}' +
    'body.culture-jawa{--t6-accent:#9a652e}body.culture-jawa #t6-culture-frame{border-style:double;background:repeating-linear-gradient(45deg,transparent 0 18px,rgba(154,101,46,.08) 18px 21px)}' +
    'body.culture-sunda{--t6-accent:#4e8b58}body.culture-sunda #t6-culture-frame{border-radius:22px;background:repeating-linear-gradient(90deg,transparent 0 24px,rgba(78,139,88,.09) 24px 27px)}' +
    'body.culture-minang{--t6-accent:#b92828}body.culture-minang #t6-culture-frame{border-width:4px;background:repeating-linear-gradient(135deg,transparent 0 20px,rgba(185,40,40,.09) 20px 24px)}' +
    'body.culture-batak{--t6-accent:#8b2e26}body.culture-batak #t6-culture-frame{border-style:dashed;background:repeating-linear-gradient(0deg,transparent 0 22px,rgba(139,46,38,.09) 22px 25px)}' +
    'body.culture-bali{--t6-accent:#c88916}body.culture-bali #t6-culture-frame{border-radius:28px;border-width:4px;background:repeating-radial-gradient(circle at 0 0,rgba(200,137,22,.09) 0 4px,transparent 5px 24px)}' +
    '@media(max-width:640px){#t6-lang-toggle{top:9px;left:9px}#t6-culture-frame{inset:4px}}';d.head.appendChild(_t6s);}
  var _cp=c.culturePreset||'',_cb=d.body;['jawa','sunda','minang','batak','bali'].forEach(function(_k){_cb.classList.remove('culture-'+_k);});if(_cp)_cb.classList.add('culture-'+_cp);
  var _cf=d.getElementById('t6-culture-frame'),_cl={jawa:'Adat Jawa',sunda:'Adat Sunda',minang:'Adat Minang',batak:'Adat Batak',bali:'Adat Bali'};if(_cp){if(!_cf){_cf=d.createElement('div');_cf.id='t6-culture-frame';d.body.appendChild(_cf);}_cf.setAttribute('data-label',_cl[_cp]||'Adat');}else if(_cf){_cf.remove();}
  var _cd=d.getElementById('t6-cultural-date'),_hero=d.getElementById('hero'),_dt=c.event&&c.event.dateISO?new Date(c.event.dateISO):null;if((c.showHijri||c.showWeton)&&_dt&&_hero){if(!_cd){_cd=d.createElement('div');_cd.id='t6-cultural-date';var _pill=_hero.querySelector('.date-pill');if(_pill&&_pill.parentNode)_pill.parentNode.insertBefore(_cd,_pill.nextSibling);else _hero.appendChild(_cd);}_cd.innerHTML='';if(c.showHijri){var _hs=d.createElement('span');try{_hs.textContent='🌙 '+new Intl.DateTimeFormat('id-ID-u-ca-islamic',{day:'numeric',month:'long',year:'numeric'}).format(_dt);}catch(_e){_hs.textContent='🌙 Kalender Hijriah';}_cd.appendChild(_hs);}if(c.showWeton){var _ref=Date.UTC(1945,7,17),_day=Date.UTC(_dt.getFullYear(),_dt.getMonth(),_dt.getDate()),_dif=Math.round((_day-_ref)/86400000),_pas=['Legi','Pahing','Pon','Wage','Kliwon'][((_dif%5)+5)%5],_dn=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][_dt.getDay()],_ws=d.createElement('span');_ws.textContent='🗓️ '+_dn+' '+_pas;_cd.appendChild(_ws);}}else if(_cd){_cd.remove();}
  var _cultureTerms={jawa:['Ijab Kabul','Panggih'],sunda:['Akad Nikah','Saweran & Resepsi'],minang:['Akad Nikah','Baralek'],batak:['Pamasu-masu','Pesta Adat'],bali:['Pawiwahan','Resepsi']};
  window.__t6Cfg=c;
  window.__setWeddingLanguage=function(_lang){var _cfg=window.__t6Cfg||{},_en=(_cfg.i18n&&_cfg.i18n.en)||{};if(window.__t6Saved){window.__t6Saved.forEach(function(_x){if(_x.n&&_x.n.parentNode)_x.n.nodeValue=_x.v;});}window.__t6Saved=[];
    function _txt(_sel,_v){var _e=d.querySelector(_sel);if(_e&&_v!=null&&_v!=='')_e.textContent=_v;}function _htmlBtn(_v){var _b=d.getElementById('openBtn');if(_b&&_v){_b.innerHTML='<span class="ico">'+(_b.classList.contains('open-envelope')?'':'✉')+'</span> '+_v;}}
    var _isEn=_lang==='en',_ct=_cultureTerms[_cfg.culturePreset||''];_txt('#cover .the-wedding',_isEn?(_en.coverEyebrow||'The Wedding Of'):_cfg.cover&&_cfg.cover.eyebrow);_txt('#cover .kepada',_isEn?(_en.coverGreeting||'Dear Family & Friends'):_cfg.cover&&_cfg.cover.kepada);_htmlBtn(_isEn?(_en.openButton||'Open Invitation'):_cfg.cover&&_cfg.cover.openButton);
    if(_cfg.quote){_txt('#quote .ayat',_isEn?(_en.quoteText||_cfg.quote.text):_cfg.quote.text);_txt('#quote .src',_isEn?(_en.quoteSource||_cfg.quote.source):_cfg.quote.source);}
    if(_cfg.story){var _tls=d.querySelectorAll('#story .tl-item');_cfg.story.forEach(function(_s,_i){var _el=_tls[_i];if(!_el)return;var _h=_el.querySelector('h4'),_p=_el.querySelector('p');if(_h)_h.textContent=_isEn?(_en['story'+_i+'Title']||_s.title):_s.title;if(_p)_p.textContent=_isEn?(_en['story'+_i+'Text']||_s.text):_s.text;});}
    if(_cfg.events){var _ecs=d.querySelectorAll('#events .event-card');_cfg.events.forEach(function(_ev,_i){var _h=_ecs[_i]&&_ecs[_i].querySelector('h3');if(_h)_h.textContent=_isEn?(_en['event'+_i+'Title']||(_i?'Reception':'Wedding Ceremony')):((_ct&&_ct[_i])||_ev.title);});}
    if(_cfg.thanks){var _tp=d.querySelector('#thanks p:not(.eyebrow):not(.fam):not(.credit)');if(_tp)_tp.textContent=_isEn?(_en.thanksMessage||_cfg.thanks.message):_cfg.thanks.message;var _fam=d.querySelector('#thanks .fam');if(_fam)_fam.textContent=_isEn?(_en.thanksClosing||_cfg.thanks.closing):_cfg.thanks.closing;}
    if(_isEn){var _pairs=[['Kepada Yth.','Dear'],['Tamu Undangan','Invited Guest'],['Mempelai','The Couple'],['Menghitung Hari','Counting Down'],['Perjalanan Kami','Our Journey'],['Perjalanan Cinta','Love Journey'],['Waktu & Tempat','Time & Venue'],['Rangkaian Acara','Wedding Events'],['Galeri Kami','Our Gallery'],['Galeri','Gallery'],['Konfirmasi Kehadiran','Attendance Confirmation'],['Ucapan & Doa','Wishes & Prayers'],['Tanda Kasih','Wedding Gift'],['Amplop Digital','Wedding Gift'],['Informasi','Information'],['Catatan untuk Tamu','Guest Information'],['Terima Kasih','Thank You'],['Simpan ke Kalender','Save to Calendar'],['Salin Nomor','Copy Number'],['Lihat Lokasi','View Location'],['Lihat Peta','View Map'],['Rute dari lokasi saya','Directions from My Location'],['Hari','Days'],['Jam','Hours'],['Menit','Minutes'],['Detik','Seconds'],['Kirim Konfirmasi','Send Confirmation'],['Nama lengkap','Full name']];var _wk=d.createTreeWalker(d.body,NodeFilter.SHOW_TEXT);var _nodes=[];while(_wk.nextNode())_nodes.push(_wk.currentNode);_nodes.forEach(function(_n){if(!_n.parentNode||/^(SCRIPT|STYLE|TEXTAREA|OPTION)$/.test(_n.parentNode.nodeName)||_n.parentNode.closest&&_n.parentNode.closest('#t6-lang-toggle'))return;var _v=_n.nodeValue,_nv=_v;_pairs.forEach(function(_p){_nv=_nv.split(_p[0]).join(_p[1]);});if(_nv!==_v){window.__t6Saved.push({n:_n,v:_v});_n.nodeValue=_nv;}});}
    d.documentElement.lang=_isEn?'en':'id';var _tg=d.getElementById('t6-lang-toggle');if(_tg){Array.prototype.forEach.call(_tg.querySelectorAll('button'),function(_b){_b.classList.toggle('active',_b.getAttribute('data-lang')===_lang);});}window.__weddingLanguage=_lang;};
  var _mode=c.languageMode||'id',_lt=d.getElementById('t6-lang-toggle');if(_mode==='bilingual'){if(!_lt){_lt=d.createElement('div');_lt.id='t6-lang-toggle';_lt.innerHTML='<button data-lang="id">ID</button><button data-lang="en">EN</button>';d.body.appendChild(_lt);Array.prototype.forEach.call(_lt.querySelectorAll('button'),function(_b){_b.onclick=function(){window.__setWeddingLanguage(_b.getAttribute('data-lang'));};});}_lt.style.display='flex';window.__setWeddingLanguage(window.__weddingLanguage==='en'?'en':'id');}else{if(_lt)_lt.remove();window.__setWeddingLanguage(_mode==='en'?'en':'id');}
  /* SMART PREVIEW FOCUS: scroll hanya bila target belum terlihat */
  var _pfs=d.getElementById('preview-focus-css');if(!_pfs){_pfs=d.createElement('style');_pfs.id='preview-focus-css';_pfs.textContent='.preview-change-pulse{position:relative;z-index:60;animation:previewChangePulse 1.45s ease-out 1!important}@keyframes previewChangePulse{0%{outline:0 solid rgba(201,162,75,0);box-shadow:0 0 0 0 rgba(201,162,75,0)}22%{outline:3px solid rgba(201,162,75,.9);outline-offset:6px;box-shadow:0 0 0 12px rgba(201,162,75,.20)}55%{outline:2px solid rgba(201,162,75,.55);outline-offset:3px;box-shadow:0 0 0 5px rgba(201,162,75,.10)}100%{outline:0 solid rgba(201,162,75,0);outline-offset:0;box-shadow:none}}@media(prefers-reduced-motion:reduce){.preview-change-pulse{animation:none!important;outline:3px solid rgba(201,162,75,.75)!important}}';d.head.appendChild(_pfs);}
  window.__previewFocusChange=function(_path,_seq){if(!_path)return;if(_seq&&window.__previewFocusLastSeq===_seq)return;window.__previewFocusLastSeq=_seq||0;var _sel='',_m,_force=false;
    if(/^coverPhoto\./.test(_path)){var _ct=(c.coverPhoto&&c.coverPhoto.target)||'cover';_sel=_ct==='hero'?'#hero':'#cover .cover-inner,#cover';var _pcv=d.getElementById('cover');if(_ct!=='hero'&&_pcv&&_pcv.classList.contains('open')){_force=true;_pcv.classList.remove('open');d.body.classList.add('locked');}}
    else if(/^cover\.|^coverKind$|^coverOpenStyle$/.test(_path)){_sel='#cover .cover-inner,#cover';var _cv=d.getElementById('cover');if(_cv&&_cv.classList.contains('open')){_force=true;_cv.classList.remove('open');d.body.classList.add('locked');}}
    else if(/^rsvp\./.test(_path))_sel='#rsvpForm,#rsvp';
    else if(/^couple\./.test(_path)||_path==='theme.script')_sel='#couple .person,#couple';
    else if(/^quote\./.test(_path))_sel='#quote .ayat,#quote';
    else if((_m=_path.match(/^story\.(\d+)/)))_sel='#story .tl-item:nth-child('+(parseInt(_m[1],10)+1)+')';
    else if(/^story/.test(_path))_sel='#story';
    else if((_m=_path.match(/^events\.(\d+)/)))_sel='#events .event-card:nth-of-type('+(parseInt(_m[1],10)+1)+')';
    else if(/^event\.|^locationInfo/.test(_path))_sel='#events';
    else if(/^gallery/.test(_path))_sel='#gallery .gal-grid,#gallery';
    else if(/^qris|^banks/.test(_path))_sel='#t5-qris,#gift';
    else if(/^dressCode|^info/.test(_path))_sel='#info .info-card,#info';
    else if(/^parentsBlessing/.test(_path))_sel='#t4-parent-blessing,#couple';
    else if(/^signature/.test(_path))_sel='#t4-signature,#thanks';
    else if(/^thanks|^share/.test(_path))_sel='#thanks';
    else if(/^sections\./.test(_path)){_sel='#'+_path.split('.')[1];}
    else if(_path==='sectionOrder')_sel='section:not([style*="display: none"])';
    else if(/^languageMode|^showHijri|^showWeton|^culturePreset/.test(_path))_sel='#t6-cultural-date,#hero';
    else if(/^rsvp/.test(_path))_sel='#rsvp';
    else if(/^wishes/.test(_path))_sel='#wishes';
    var _el=_sel?d.querySelector(_sel):null;
    if(!_el){var _mid=d.elementFromPoint(Math.max(1,innerWidth/2),Math.max(1,innerHeight/2));_el=_mid&&(_mid.closest('section')||_mid.closest('#cover'));}
    if(!_el)return;if(getComputedStyle(_el).display==='none'){var _nx=_el.nextElementSibling||_el.previousElementSibling;if(_nx)_el=_nx;else return;}
    var _r=_el.getBoundingClientRect(),_over=Math.min(_r.bottom,innerHeight-45)-Math.max(_r.top,45),_need=Math.min(120,Math.max(30,_r.height*.28)),_visible=_over>=_need;
    if(_visible&&!_force)return;
    if(window.__previewFocusTarget===_el&&Date.now()-(window.__previewFocusStarted||0)<1100)return;window.__previewFocusTarget=_el;window.__previewFocusStarted=Date.now();
    if(!_force)_el.scrollIntoView({behavior:(matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)?'auto':'smooth',block:'center'});
    clearTimeout(window.__previewFocusTimer);window.__previewFocusTimer=setTimeout(function(){_el.classList.remove('preview-change-pulse');void _el.offsetWidth;_el.classList.add('preview-change-pulse');setTimeout(function(){_el.classList.remove('preview-change-pulse');},1500);window.__previewFocusTarget=null;},_force?60:520);
  };
  var _mb=d.getElementById('madeBy'); if(_mb) _mb.style.display=(c.noWatermark?'none':'');
};
window.__applyWeddingConfig(CFG);
/* Live preview dari panel klien (Fase 2): terima config via postMessage */
window.addEventListener('message', function(ev){
  if(ev && ev.data && ev.data.type==='WEDDING_PREVIEW' && ev.data.config){
    var _seq=parseInt(ev.data.seq||(ev.data.config&&ev.data.config.__previewSeq),10)||0;
    if(_seq&&window.__previewAppliedSeq>=_seq){ try{ev.source&&ev.source.postMessage({type:'WEDDING_PREVIEW_ACK',seq:_seq},'*');}catch(e){} return; }
    window.WEDDING_CONFIG = ev.data.config;
    try{ window.__applyWeddingConfig(ev.data.config); window.__previewAppliedSeq=_seq||window.__previewAppliedSeq||0;
      var _fp=ev.data.config.__previewFocusPath||''; if(_fp&&window.__previewFocusChange) requestAnimationFrame(function(){window.__previewFocusChange(_fp,_seq);});
      ev.source&&ev.source.postMessage({type:'WEDDING_PREVIEW_ACK',seq:_seq},'*'); }catch(e){}
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

/* ====== RSVP LENGKAP ====== */
const _rsvpForm=document.getElementById('rsvpForm');
if(_rsvpForm)_rsvpForm.addEventListener('submit',e=>{
  e.preventDefault();
  const n=document.getElementById('rsvpName').value.trim();
  const a=document.getElementById('rsvpAttend').value;
  const countEl=document.getElementById('rsvpCount');
  const eventEl=document.getElementById('rsvpEvent');
  const guestNote=document.getElementById('rsvpGuestNote');
  const note=document.getElementById('rsvpNote');
  const btn=e.target.querySelector('.submit');
  const rCfg=CFG.rsvp||{};
  if(rCfg.deadline){const end=new Date(rCfg.deadline+'T23:59:59');if(!isNaN(end)&&Date.now()>end.getTime()){note.textContent='Maaf, batas waktu RSVP telah berakhir.';return;}}
  if(!n||!a){note.textContent='Mohon isi nama dan pilihan kehadiran.';return;}
  if(rCfg.askEvent!==false&&eventEl&&!eventEl.value){note.textContent='Mohon pilih acara yang akan dihadiri.';return;}
  const c=a==='Hadir'?(parseInt(countEl&&countEl.value,10)||1):0;
  const ev=eventEl&&rCfg.askEvent!==false?eventEl.value:'';
  const msg=guestNote&&rCfg.askNote!==false?guestNote.value.trim():'';
  const ob=btn.textContent;btn.textContent='Mengirim...';btn.disabled=true;note.textContent='Mengirim konfirmasi...';
  const payload={name:n,attend:a,count:c,eventChoice:ev,note:msg};
  const _saveR=(window.WEDDING_DB_API&&window.WEDDING_DB_API.saveRsvp)?window.WEDDING_DB_API.saveRsvp(payload):sendToSheet({type:'rsvp',name:n,attend:a,count:c,eventChoice:ev,note:msg,t:Date.now()});
  _saveR.then(r=>{if(r&&r.ok===false)throw new Error('Gagal menyimpan');document.dispatchEvent(new CustomEvent('wedding:rsvp-success'));note.textContent='Terima kasih '+n+'! Konfirmasi Anda telah kami terima 💐';e.target.reset();if(document.getElementById('rsvpAttend'))document.getElementById('rsvpAttend').dispatchEvent(new Event('change'));})
    .catch(()=>{note.textContent='Konfirmasi belum berhasil dikirim. Periksa koneksi lalu coba lagi.';})
    .finally(()=>{btn.textContent=ob;btn.disabled=false;});
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
