(function(){
  var DB = window.WEDDING_DB || {};
  var API = (DB.url||'').replace(/\/+$/,'');
  var KEY = DB.anonKey||'';
  var token=null, userId=null, userEmail=null;
  var sites=[], cur=null, cfg=null, activeTab='Konten', selPkg='basic';
  var EDITOR_MODE_KEY='undangan_editor_mode_v1', editorMode='simple';
  try{ editorMode=localStorage.getItem(EDITOR_MODE_KEY)==='advance'?'advance':'simple'; }catch(e){}
  var el=function(id){return document.getElementById(id)};

  if(!API||!KEY){ var w=el('cfgWarn'); w.style.display='block';
    w.textContent='⚠ db-config.js belum diisi (url & anonKey Supabase). Panel butuh itu untuk berfungsi.'; }

  function getP(o,p){ return p.split('.').reduce(function(a,k){ return (a==null)?undefined:a[k]; }, o); }
  function setP(o,p,v){ var ks=p.split('.'),last=ks.pop(),t=o;
    ks.forEach(function(k){ if(t[k]==null||typeof t[k]!=='object') t[k]=(/^\d+$/.test(k))?[]:{}; t=t[k]; });
    t[last]=v; }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function clone(o){ return JSON.parse(JSON.stringify(o)); }

  function authFetch(path,opts){ opts=opts||{}; opts.headers=Object.assign({apikey:KEY,'Content-Type':'application/json'},opts.headers||{}); return fetch(API+path,opts); }
  function db(path,opts){ opts=opts||{}; opts.headers=Object.assign({apikey:KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},opts.headers||{}); return fetch(API+'/rest/v1/'+path,opts); }
  function authMsg(m,c){ var x=el('authMsg'); x.className='msg '+(c||''); x.textContent=m; }
  function edMsg(m,c){ var x=el('edMsg'); x.className='msg '+(c||''); x.textContent=m; }
  var CLOUD_TOAST_TIMER=0;
  function showCloudToast(text,kind){var x=el('cloudToast');if(!x)return;clearTimeout(CLOUD_TOAST_TIMER);x.className='cloud-toast on '+(kind||'ok');x.querySelector('span').textContent=kind==='info'?'G':'✓';x.querySelector('b').textContent=text;CLOUD_TOAST_TIMER=setTimeout(function(){x.classList.remove('on')},2600)}


  function login(signup){
    var email=el('email').value.trim(), password=el('password').value;
    if(!email||!password){ return authMsg('Isi email & password.','err'); }
    var path = signup?'/auth/v1/signup':'/auth/v1/token?grant_type=password';
    authMsg('Memproses…','ok');
    authFetch(path,{method:'POST',body:JSON.stringify({email:email,password:password})})
     .then(function(r){return r.json().then(function(j){return{ok:r.ok,j:j}})})
     .then(function(res){
       if(!res.ok){ return authMsg(res.j.error_description||res.j.msg||res.j.error||'Gagal masuk.','err'); }
       var j=res.j;
       if(signup && !j.access_token){ return authMsg('Pendaftaran berhasil. Cek email untuk verifikasi, lalu Masuk.','ok'); }
       token=j.access_token; userId=(j.user&&j.user.id)||j.id; userEmail=(j.user&&j.user.email)||email;
       _sessExp=j.expires_at?(j.expires_at*1000):(Date.now()+((j.expires_in||3600)*1000)); persistSession(); afterLogin();
     }).catch(function(e){ authMsg('Kesalahan jaringan: '+e,'err'); });
  }

  function onLoggedIn(){ el('auth').style.display='none';
    db('sites?owner_id=eq.'+userId+'&select=id,slug,status,config,package,updated_at&order=updated_at.desc')
     .then(function(r){return r.json()})
     .then(function(rows){ sites=rows||[]; var target=resumePreferredSite(sites); if(target){ enterEditor(target); } else { startLocalEditor(true); } })
     .catch(function(){ startLocalEditor(true); }); }

  function showDash(){ el('dash').style.display='block'; el('editor').style.display='none'; el('previewPane').style.display='none'; el('backBtn').style.display='none'; }

  function loadSites(){
    showDash(); el('siteList').innerHTML='<p class="sub">Memuat…</p>';
    db('sites?owner_id=eq.'+userId+'&select=id,slug,status,config,updated_at&order=updated_at.desc')
     .then(function(r){return r.json()})
     .then(function(rows){ sites=rows||[]; renderSites(); })
     .catch(function(e){ el('siteList').innerHTML='<p class="msg err">Gagal memuat: '+esc(e)+'</p>'; });
  }
  function renderSites(){
    if(!sites.length){ el('siteList').innerHTML='<div class="empty"><div class="empty-ill">💌</div><h3>Belum ada undangan</h3><p class="sub">Mulai perjalanan indahmu — buat undangan pernikahan digital pertamamu sekarang.</p><button class="btn lg" id="newEmptyBtn">✨ Buat Undangan Pertamaku</button></div>'; var nb=el('newEmptyBtn'); if(nb) nb.onclick=newSite; return; }
    el('siteList').innerHTML=sites.map(function(s){
      var nm=(s.config&&s.config.couple)?(s.config.couple.brideShort+' & '+s.config.couple.groomShort):s.slug;
      return '<div class="site-row"><div style="flex:1"><b>'+esc(nm)+'</b><br><small class="hint">/'+esc(s.slug)+'</small></div>'+
        '<span class="badge '+esc(s.status)+'">'+esc(s.status)+'</span>'+
        '<button class="btn sm" data-edit="'+esc(s.id)+'">Edit</button></div>';
    }).join('');
    Array.prototype.forEach.call(document.querySelectorAll('[data-edit]'),function(b){ b.onclick=function(){ openEditor(b.getAttribute('data-edit')); }; });
  }

  function newSite(){
    var slug=prompt('Slug undangan (huruf kecil & tanda hubung, mis. "andi-sari"):'); if(!slug) return;
    slug=slug.toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
    if(!slug) return alert('Slug tidak valid.');
    var c=clone(STARTER);
    db('sites',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({slug:slug,owner_id:userId,status:'draft',config:c})})
     .then(function(r){return r.json().then(function(j){return{ok:r.ok,j:j}})})
     .then(function(res){ if(!res.ok){ alert('Gagal membuat: '+(res.j.message||res.j.hint||JSON.stringify(res.j))); return; }
       var row=(res.j&&res.j[0])||res.j; sites.unshift(row); openEditor(row.id); })
     .catch(function(e){ alert('Kesalahan: '+e); });
  }

  function openEditor(id){ var s=sites.filter(function(s){return String(s.id)===String(id)})[0]; if(s) enterEditor(s); }
  function enterEditor(site){
    cur=site; cfg=cur.config?clone(cur.config):clone(STARTER); p5InitHistory();
    if(cur.local){ cur.slug=autoSlug(cfg); }
    if(el('landing')) el('landing').style.display='none'; el('auth').style.display='none'; el('app').style.display='grid';
    el('dash').style.display='none'; el('editor').style.display='block'; el('previewPane').style.display='block';
    updateHeaderUI();
    el('edTitle').textContent=(cur.local?'Undangan kamu · /':'Edit: /')+cur.slug; updateStatusUI();
    var iframe=el('preview');
    iframe.onload=function(){ pushPreview(); setTimeout(pushPreview,700); setTimeout(pushPreview,1500); };
    iframe.src=templateFile(cfg.style)+'?site='+encodeURIComponent(cur.slug);
    el('openLink').href=publicLink();
    selPkg=(cur.package||'basic'); restoreEditorResume(site); updateBuy();
    renderTabs(); renderForm(); refreshWishBadge();
    loadLibraries(function(){ if(activeTab==='Tampilan'||activeTab==='Upload') renderForm(); });
  }

  function updateStatusUI(){ var pub=cur.status==='published';
    el('edStatus').className='badge '+cur.status; el('edStatus').textContent=pub?'live ✓':cur.status;
    el('pubBtn').textContent=pub?'Jadikan Draft':'Publikasikan'; el('pubBtn').className='btn '+(pub?'ghost':'gold');
    var sb=el('shareBtn'), ol=el('openLink'), pb=el('previewBtn');
    if(sb) sb.style.display=pub?'':'none';
    if(ol){ ol.href=publicLink(); ol.style.display=pub?'':'none'; }
    if(pb) pb.innerHTML=pub?'<span class="fab-icon">✓</span><span class="fab-label">Pratinjau</span>':'<span class="fab-icon">✓</span><span class="fab-label">Selesai</span>'; }

  /* LIVE PREVIEW RELIABLE: intent target + ACK/retry, agar toggle tidak perlu refresh */
  var _previewSeq=0,_previewAck=0,_previewFocusPath='',_previewTimers=[];
  window.addEventListener('message',function(ev){ if(ev&&ev.data&&ev.data.type==='WEDDING_PREVIEW_ACK'){ _previewAck=Math.max(_previewAck,parseInt(ev.data.seq,10)||0); if(_previewAck>=_previewSeq){_previewTimers.forEach(clearTimeout);_previewTimers=[];} } });
  function previewIntent(elm){ if(!elm)return ''; var e=elm.closest?elm.closest('[data-p],[data-bool],[data-t1],[data-t3check],[data-sec],[data-glayout],[data-orn],[data-fx],[data-mv],[data-streset],[data-style],[data-pal],[data-upload],[data-preset]'):elm;
    if(!e)return ''; var p=e.getAttribute('data-p')||e.getAttribute('data-bool')||e.getAttribute('data-t1')||e.getAttribute('data-t3check')||e.getAttribute('data-upload'); if(p)return p;
    if(e.hasAttribute('data-sec'))return 'sections.'+e.getAttribute('data-sec'); if(e.hasAttribute('data-mv'))return 'sections.'+e.getAttribute('data-sid'); if(e.hasAttribute('data-streset'))return 'sectionOrder'; if(e.hasAttribute('data-glayout'))return 'galleryLayout'; if(e.hasAttribute('data-orn'))return 'ornaments.'+e.getAttribute('data-orn'); if(e.hasAttribute('data-fx'))return 'effects.falling'; if(e.hasAttribute('data-style')||e.hasAttribute('data-pal'))return 'style'; var pr=e.getAttribute('data-preset'); if(pr)return pr==='closing'?'thanks.message':'quote.text'; return ''; }
  function bindPreviewIntent(host){ if(!host||host.__previewIntentBound)return; host.__previewIntentBound=true; ['input','change','click'].forEach(function(ev){host.addEventListener(ev,function(e){var p=previewIntent(e.target);if(p)_previewFocusPath=p;},true);}); }
  function pushPreview(){ var seq=++_previewSeq,focus=_previewFocusPath||'';_previewFocusPath=''; var _pc;
    try{ _pc=clone(cfg); _pc.noWatermark=!!plan().noWatermark; if(_pc.effects && !plan().fallingFx){ _pc.effects=Object.assign({},_pc.effects,{falling:''}); } _pc.__previewFocusPath=focus; _pc.__previewSeq=seq; }catch(e){return;}
    var send=function(){ if(_previewAck>=seq)return; try{var fr=el('preview');if(fr&&fr.contentWindow)fr.contentWindow.postMessage({type:'WEDDING_PREVIEW',config:_pc,seq:seq},'*');}catch(e){} };
    _previewTimers.forEach(clearTimeout);_previewTimers=[];send();[120,450,1350].forEach(function(ms){_previewTimers.push(setTimeout(send,ms));});
    window.__lastPreviewSent=clone(cfg); p5RecordChange();
    if(cur&&cur.local){ saveDraftLocal(); cur.slug=autoSlug(cfg); var _et=el('edTitle'); if(_et) _et.textContent='Undangan kamu · /'+cur.slug; } }

  var TABS=['Konten','Tampilan','Perpustakaan','Upload','Paket','Tamu','Ucapan','Analitik'], SIMPLE_TABS=['Template','Konten','Paket'];
  function isMobileEditor(){return !!(window.matchMedia&&window.matchMedia('(max-width: 767px)').matches)}
  function advanceAllowed(){return currentPlan()!=='basic'}
  function applyEditorViewport(){var simple=editorMode==='simple',desktopMobile=isMobileEditor()&&!simple&&advanceAllowed();document.documentElement.classList.toggle('simple-editor',simple);document.documentElement.classList.toggle('mobile-advance-desktop',desktopMobile);document.body.classList.toggle('simple-editor',simple);document.body.classList.toggle('mobile-advance-desktop',desktopMobile)}
  function applySimpleRestrictions(host){if(!host)return;host.querySelectorAll('.content-collapsed,.opt-off').forEach(function(x){x.classList.remove('content-collapsed','opt-off')});host.querySelectorAll('.p11-dependent-hidden').forEach(function(x){x.classList.remove('p11-dependent-hidden')});host.querySelectorAll('input[type=checkbox]').forEach(function(cb){var row=cb.closest('.sw-row,.toggle-row,label');if(row)row.style.display='none';else cb.style.display='none'});host.querySelectorAll('[data-cover-pos],.p2-range,.p5-group-tools,[data-streset],[data-glayout],[data-orn],[data-fx],[data-pal]').forEach(function(x){x.style.display='none'});host.querySelectorAll('.group').forEach(function(g){var h=g.querySelector(':scope>h3');if(h&&/musik\s+latar/i.test(h.textContent||''))g.style.display='none'});var colors=Array.prototype.slice.call(host.querySelectorAll('input[type="color"][data-p^="dressCode."]')).map(function(x){return x.closest('.fld')}).filter(Boolean);if(colors.length){var row=document.createElement('div');row.className='dresscode-mobile-row';colors[0].parentNode.insertBefore(row,colors[0]);colors.forEach(function(f,i){var lab=f.querySelector(':scope>span');if(lab)lab.textContent=String(i+1);row.appendChild(f)})}var title=el('edTitle');if(title){var br=cfg&&cfg.couple&&(cfg.couple.brideShort||cfg.couple.bride&&cfg.couple.bride.full),gr=cfg&&cfg.couple&&(cfg.couple.groomShort||cfg.couple.groom&&cfg.couple.groom.full);title.textContent=br&&gr?br+' & '+gr:'Edit Undangan'}}

  /* Pemulihan editor: fungsi ini harus tersedia sebelum enterEditor/bootAuth berjalan. */
  var EDITOR_RESUME_KEY='undangan_editor_resume_v2', resumeScrollTimer=0;
  function editorSiteKey(site){site=site||cur;if(!site)return'';if(site.local||!site.id)return'local';return'id:'+String(site.id)}
  function readEditorResume(){try{var r=JSON.parse(localStorage.getItem(EDITOR_RESUME_KEY)||'null');if(!r||typeof r!=='object')return null;if(r.updatedAt&&Date.now()-r.updatedAt>30*24*60*60*1000){localStorage.removeItem(EDITOR_RESUME_KEY);return null}return r}catch(e){return null}}
  function hasEditorResume(){var r=readEditorResume();if(!r)return false;if(r.siteKey==='local'){try{return !!localStorage.getItem(DRAFT_KEY)}catch(e){return false}}return !!r.siteKey}
  function persistEditorResume(){if(!cur)return;try{localStorage.setItem(EDITOR_RESUME_KEY,JSON.stringify({siteKey:editorSiteKey(cur),slug:cur.slug||'',local:!!cur.local,tab:activeTab,mode:editorMode,scrollY:Math.max(0,window.scrollY||document.documentElement.scrollTop||0),updatedAt:Date.now()}));localStorage.setItem(EDITOR_MODE_KEY,editorMode)}catch(e){}}
  function restoreEditorResume(site){var r=readEditorResume(),same=r&&r.siteKey===editorSiteKey(site);if(same){editorMode=r.mode==='advance'&&advanceAllowed()?'advance':'simple';var list=modeTabs();activeTab=list.indexOf(r.tab)>=0?r.tab:(editorMode==='simple'?'Template':'Konten');if(typeof r.scrollY==='number')setTimeout(function(){try{window.scrollTo(0,r.scrollY)}catch(e){}},120)}else{editorMode=editorMode==='advance'&&advanceAllowed()?'advance':'simple';activeTab=editorMode==='simple'?'Template':'Konten'}applyEditorViewport()}
  function resumeLocalEditorFromHistory(){startLocalEditor(true)}
  function resumePreferredSite(rows){rows=rows||[];if(!rows.length)return null;var r=readEditorResume();if(r&&r.siteKey){for(var i=0;i<rows.length;i++)if(editorSiteKey(rows[i])===r.siteKey||(r.slug&&rows[i].slug===r.slug))return rows[i]}return rows[0]}
  function modeTabs(){return editorMode==='simple'?SIMPLE_TABS:TABS}
  function setEditorMode(mode,targetTab){mode=mode==='advance'?'advance':'simple';if(mode==='advance'&&!advanceAllowed()){editorMode='simple';activeTab='Paket';persistEditorResume();renderTabs();renderForm();edMsg('Mode Advance tersedia untuk paket Premium dan Exclusive.','err');return}if(mode==='advance'&&isMobileEditor()){openUxModal('deviceNoticeModal');editorMode='simple';persistEditorResume();return}editorMode=mode;var list=modeTabs();activeTab=targetTab&&list.indexOf(targetTab)>=0?targetTab:(list.indexOf(activeTab)>=0?activeTab:(mode==='simple'?'Template':'Konten'));applyEditorViewport();persistEditorResume();renderTabs();renderForm()}
  function contentSectionId(title){title=String(title||'').trim().toLowerCase();var map=[['kutipan','quote'],['hitung mundur','countdown'],['countdown','countdown'],['kisah','story'],['galeri foto','gallery'],['foto galeri','gallery'],['amplop','gift'],['hadiah','gift'],['informasi tambahan','info'],['info tambahan','info'],['ucapan dan doa','wishes']];for(var i=0;i<map.length;i++)if(title.indexOf(map[i][0])>=0)return map[i][1];return''}
  function decorateContentCollapse(host){host=host||document;var simple=editorMode==='simple';host.querySelectorAll('.group,.p5-group,.form-group,.section-card').forEach(function(g){var h=g.querySelector(':scope>h2,:scope>h3,:scope>h4,.p5-title,.section-title');if(!h)return;var id=contentSectionId(h.textContent),off=!simple&&!!(id&&cfg&&cfg.sections&&cfg.sections[id]===false);g.classList.toggle('content-collapsed',off);if(id)g.setAttribute('data-content-section',id)})}
  function collapseContentFeatureGroups(host){host=host||document;var simple=editorMode==='simple';host.querySelectorAll('.group').forEach(function(g){var master=g.querySelector('input[type=checkbox][data-bool$=".enabled"]');if(!master)return;var row=master.closest('.sw-row,.fld,label'),heading=g.querySelector(':scope>h3');Array.prototype.forEach.call(g.children,function(n){if(n===heading||n===row)return;n.classList.toggle('p11-dependent-hidden',!simple&&!master.checked)})})}
  function syncSharedSectionToggles(host){host=host||document;host.querySelectorAll('[data-sec]').forEach(function(cb){var id=cb.getAttribute('data-sec');cb.checked=!(cfg&&cfg.sections&&cfg.sections[id]===false)})}

  function renderTabs(){if(editorMode==='advance'&&!advanceAllowed())editorMode='simple';applyEditorViewport();var list=modeTabs();if(list.indexOf(activeTab)<0)activeTab=editorMode==='simple'?'Template':'Konten';var simple=editorMode==='simple',locked=!advanceAllowed(),desktopNote=isMobileEditor()&&!simple&&advanceAllowed()?'<div class="mobile-desktop-note">Mode Advance Premium memakai layout desktop. Geser layar ke samping untuk melihat seluruh editor.</div>':'';el('tabs').innerHTML='<div class="editor-mode-box"><div class="editor-mode-switch"><button class="editor-mode-btn'+(simple?' active':'')+'" data-editor-mode="simple">Simple</button><button class="editor-mode-btn'+(!simple?' active':'')+(locked?' premium-locked':'')+'" data-editor-mode="advance">Advance '+(locked?'🔒 Premium':'Premium')+'</button></div>'+desktopNote+'</div><div class="mode-tabs">'+list.map(function(t){var lab=t==='Ucapan'&&WISH_PENDING?'Ucapan <span class="tab-pending">'+WISH_PENDING+'</span>':t;return '<button data-tab="'+t+'" class="'+(t===activeTab?'active':'')+'">'+lab+'</button>'}).join('')+'</div>';
    Array.prototype.forEach.call(document.querySelectorAll('[data-editor-mode]'),function(b){b.onclick=function(){setEditorMode(b.getAttribute('data-editor-mode'));};});
    Array.prototype.forEach.call(document.querySelectorAll('[data-tab]'),function(b){ b.onclick=function(){ activeTab=b.getAttribute('data-tab'); persistEditorResume(); renderTabs(); renderForm(); }; }); }

  var QUOTES=[
    {label:"QS. Ar-Rum : 21",text:"Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.",src:"QS. Ar-Rum : 21"},
    {label:"QS. An-Nur : 32",text:"Dan nikahkanlah orang-orang yang masih membujang di antara kamu, dan juga orang-orang yang layak menikah dari hamba-hamba sahayamu yang laki-laki maupun perempuan.",src:"QS. An-Nur : 32"},
    {label:"QS. Az-Zariyat : 49",text:"Dan segala sesuatu Kami ciptakan berpasang-pasangan agar kamu mengingat kebesaran Allah.",src:"QS. Az-Zariyat : 49"},
    {label:"QS. An-Nisa : 1",text:"Bertakwalah kepada Allah yang dengan nama-Nya kamu saling meminta, dan peliharalah hubungan kekeluargaan.",src:"QS. An-Nisa : 1"},
    {label:"HR. Ibnu Majah",text:"Tidak ada solusi bagi dua orang yang saling mencintai seperti pernikahan.",src:"HR. Ibnu Majah"},
    {label:"HR. Muslim",text:"Dunia adalah perhiasan, dan sebaik-baik perhiasan dunia adalah pasangan yang salih dan salihah.",src:"HR. Muslim"},
    {label:"HR. Tirmidzi",text:"Sebaik-baik kalian adalah yang paling baik terhadap keluarganya.",src:"HR. Tirmidzi"},
    {label:"Cinta & ketidaksempurnaan",text:"Cinta bukan tentang menemukan seseorang yang sempurna, melainkan belajar mencintai seseorang dengan segala ketidaksempurnaannya.",src:"Anonim"},
    {label:"Saling melengkapi",text:"Pernikahan bukanlah menyatukan dua orang yang sempurna, tetapi dua orang yang bersedia saling melengkapi seumur hidup.",src:"Anonim"},
    {label:"Rumah dalam pelukan",text:"Bersamamu, aku menemukan rumah yang tak berbentuk bangunan, melainkan pelukan dan doa.",src:"Untaian Kata"},
    {label:"Jalaluddin Rumi",text:"Para kekasih tidak akhirnya bertemu di suatu tempat. Mereka ada di dalam satu sama lain sepanjang waktu.",src:"Jalaluddin Rumi"},
    {label:"Doa penyatuan",text:"Semoga Allah menyatukan kami dalam kebaikan, meridhai setiap langkah, dan menjadikan cinta ini ibadah yang tak pernah usai.",src:"Doa"},
    {label:"Dua hati satu tujuan",text:"Dua hati, satu tujuan; dua jiwa, satu ikatan. Hari ini kami memulai perjalanan selamanya.",src:"Anonim"},
    {label:"Kahlil Gibran",text:"Cinta tidak memiliki keinginan lain selain memenuhi dirinya sendiri.",src:"Kahlil Gibran"},
    {label:"Dalam setiap doa",text:"Di setiap doa yang kupanjatkan, namamu selalu ada. Kini, izinkan kita menuliskan kisah bersama.",src:"Untaian Kata"}
  ];
  QUOTES.forEach(function(q,i){ q.faith=(i<7?'islam':'general'); });
  QUOTES.push(
    {faith:'christian',label:'1 Korintus 13:4–7',text:'Kasih itu sabar; kasih itu murah hati; ia tidak cemburu. Ia tidak memegahkan diri dan tidak sombong. Kasih tidak berkesudahan.',src:'1 Korintus 13:4–8'},
    {faith:'christian',label:'Pengkhotbah 4:9–10',text:'Berdua lebih baik daripada seorang diri, karena mereka menerima upah yang baik dalam jerih payah mereka. Karena kalau mereka jatuh, yang seorang mengangkat temannya.',src:'Pengkhotbah 4:9–10'},
    {faith:'catholic',label:'Kolose 3:14',text:'Dan di atas semuanya itu: kenakanlah kasih, sebagai pengikat yang mempersatukan dan menyempurnakan.',src:'Kolose 3:14'},
    {faith:'catholic',label:'Markus 10:9',text:'Karena itu, apa yang telah dipersatukan Allah, tidak boleh diceraikan manusia.',src:'Markus 10:9'},
    {faith:'hindu',label:'Reg Weda X.85.36',text:'Aku menggenggam tanganmu untuk kebahagiaan, agar engkau hidup bersamaku sampai usia lanjut sebagai suami dan istri.',src:'Reg Weda X.85.36'},
    {faith:'hindu',label:'Doa Wiwaha',text:'Semoga kami berjalan bersama dalam pikiran, perkataan, dan perbuatan; saling menguatkan dalam dharma sepanjang kehidupan.',src:'Doa Wiwaha'},
    {faith:'buddhist',label:'Dhammapada 5',text:'Kebencian tidak akan pernah berakhir apabila dibalas dengan kebencian. Kebencian berakhir bila dibalas dengan cinta kasih.',src:'Dhammapada 5'},
    {faith:'buddhist',label:'Doa Metta',text:'Semoga semua makhluk berbahagia. Semoga cinta kasih, pengertian, dan kedamaian menyertai perjalanan hidup kami.',src:'Doa Metta'}
  );
  var CLOSING_MSGS=[
    "Merupakan suatu kebahagiaan dan kehormatan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir untuk memberikan doa restu kepada kedua mempelai.",
    "Atas kehadiran dan doa restunya, kami mengucapkan terima kasih yang sebesar-besarnya.",
    "Sebuah kebahagiaan bagi kami dapat berbagi momen istimewa ini bersama orang-orang terkasih. Terima kasih atas doa dan restunya.",
    "Doa restu Bapak/Ibu/Saudara/i adalah anugerah terindah bagi awal perjalanan kami. Terima kasih telah menjadi bagian dari hari bahagia ini.",
    "Tanpa mengurangi rasa hormat, kami mengundang Bapak/Ibu/Saudara/i untuk hadir dan memberikan doa restu di hari bahagia kami.",
    "Terima kasih telah meluangkan waktu untuk berbagi kebahagiaan bersama kami. Semoga kebaikan Anda dibalas berlipat oleh Tuhan.",
    "Dengan penuh syukur, kami menantikan kehadiran Anda untuk menyempurnakan kebahagiaan di hari yang kami nanti.",
    "Kehadiran dan restu Anda merupakan hadiah paling berharga bagi kami berdua."
  ];
  var GALLERY_LAYOUTS=[{id:"",name:"Bawaan template"},{id:"grid",name:"Grid Rapi"},{id:"mosaic",name:"Mosaik"},{id:"masonry",name:"Masonry"},{id:"film",name:"Filmstrip"},{id:"collage",name:"Kolase"},{id:"polaroid",name:"Polaroid"}];
  var SELECTS={status:["Putri dari","Putri pertama dari","Putri kedua dari","Putri ketiga dari","Putra dari","Putra pertama dari","Putra kedua dari","Putra ketiga dari","Putra-putri dari"]};
  var CONTENT=[
    ['Umum',[['meta.title','Judul tab browser','text']]],
    ['Mempelai',[['couple.brideShort','Panggilan mempelai wanita','text'],['couple.groomShort','Panggilan mempelai pria','text'],
      ['couple.bride.full','Nama lengkap wanita','text'],['couple.bride.status','Status (mis. Putri kedua dari)','select:status'],['couple.bride.father','Nama ayah (mempelai wanita)','text'],['couple.bride.mother','Nama ibu (mempelai wanita)','text'],['couple.bride.social','Sosial media wanita','text'],
      ['couple.groom.full','Nama lengkap pria','text'],['couple.groom.status','Status (mis. Putra pertama dari)','select:status'],['couple.groom.father','Nama ayah (mempelai pria)','text'],['couple.groom.mother','Nama ibu (mempelai pria)','text'],['couple.groom.social','Sosial media pria','text']]],
    ['Acara',[['events.0.title','Acara 1 — nama','text'],['events.0.dateISO','Acara 1 — tanggal & jam','datetime'],['events.0.location','Acara 1 — lokasi','text'],['events.0.mapUrl','Acara 1 — link maps','text'],['events.0.mapButtonEnabled','Acara 1 — tombol buka Maps','checkbox'],['events.0.embedEnabled','Acara 1 — peta di halaman','checkbox'],['events.0.routeEnabled','Acara 1 — rute dari lokasi tamu','checkbox'],
      ['events.1.title','Acara 2 — nama','text'],['events.1.dateISO','Acara 2 — tanggal & jam','datetime'],['events.1.location','Acara 2 — lokasi','text'],['events.1.mapUrl','Acara 2 — link maps','text'],['events.1.mapButtonEnabled','Acara 2 — tombol buka Maps','checkbox'],['events.1.embedEnabled','Acara 2 — peta di halaman','checkbox'],['events.1.routeEnabled','Acara 2 — rute dari lokasi tamu','checkbox']]],
    ['Akses Lokasi',[['locationInfo.enabled','Tampilkan akses lokasi','checkbox'],['locationInfo.landmarkEnabled','Tampilkan patokan','checkbox'],['locationInfo.landmark','Patokan lokasi','textarea'],['locationInfo.parkingEnabled','Tampilkan parkir','checkbox'],['locationInfo.parking','Informasi parkir','textarea'],['locationInfo.transportEnabled','Tampilkan transportasi','checkbox'],['locationInfo.transport','Transportasi umum','textarea']]],
    ['Kutipan',[['quote.text','Ayat / kutipan','textarea'],['quote.source','Sumber','text']]],
    ['Kisah',[['story.0.year','Kisah 1 — tahun','text'],['story.0.title','Kisah 1 — judul','text'],['story.0.text','Kisah 1 — cerita','textarea'],
      ['story.1.year','Kisah 2 — tahun','text'],['story.1.title','Kisah 2 — judul','text'],['story.1.text','Kisah 2 — cerita','textarea'],
      ['story.2.year','Kisah 3 — tahun','text'],['story.2.title','Kisah 3 — judul','text'],['story.2.text','Kisah 3 — cerita','textarea'],
      ['story.3.year','Kisah 4 — tahun','text'],['story.3.title','Kisah 4 — judul','text'],['story.3.text','Kisah 4 — cerita','textarea']]],
    ['Restu Orang Tua',[['parentsBlessing.enabled','Tampilkan kartu restu orang tua','checkbox'],['parentsBlessing.title','Judul kartu','text'],['parentsBlessing.brideText','Pesan keluarga mempelai wanita','textarea'],['parentsBlessing.brideNames','Nama orang tua mempelai wanita','text'],['parentsBlessing.groomText','Pesan keluarga mempelai pria','textarea'],['parentsBlessing.groomNames','Nama orang tua mempelai pria','text']]],
    ['Tanda Tangan Penutup',[['signature.enabled','Tampilkan tanda tangan digital','checkbox'],['signature.bride','Nama/tanda tangan mempelai wanita','text'],['signature.groom','Nama/tanda tangan mempelai pria','text']]],
    ['Amplop',[['banks.0.bank','Bank 1','text'],['banks.0.number','No. rekening 1','text'],['banks.0.holder','Atas nama 1','text'],
      ['banks.1.bank','Bank 2','text'],['banks.1.number','No. rekening 2','text'],['banks.1.holder','Atas nama 2','text'],['qris.enabled','Tampilkan QRIS','checkbox'],['qris.label','Judul QRIS','text'],['qris.holder','Nama pemilik QRIS','text']]],
    ['Info',[['info.0.title','Info 1 — judul','text'],['info.0.text','Info 1 — isi','textarea'],
      ['info.1.title','Info 2 — judul','text'],['info.1.text','Info 2 — isi','textarea'],
      ['info.2.title','Info 3 — judul','text'],['info.2.text','Info 3 — isi','textarea'],['dressCode.enabled','Tampilkan palet warna dress code','checkbox'],['dressCode.color1','Warna dress code 1','color'],['dressCode.color2','Warna dress code 2','color'],['dressCode.color3','Warna dress code 3','color'],['dressCode.color4','Warna dress code 4','color']]],
    ['Penutup',[['thanks.message','Pesan penutup','textarea'],['thanks.closing','Salam penutup','text']]],
    ['Berbagi',[['share.waText','Teks WhatsApp saat dibagikan','textarea']]]
  ];
  var THEME=[['theme.sage','Warna utama (sage)','color'],['theme.sageDark','Warna utama gelap','color'],['theme.gold','Emas / aksen','color'],['theme.blush','Blush / pink','color'],['theme.ivory','Latar terang','color'],['theme.cream','Latar krem','color'],['theme.ink','Warna teks','color']];
  var FONTS=[["'Cormorant Garamond','Playfair Display',Georgia,serif",'Cormorant (klasik)'],["'Playfair Display',Georgia,serif",'Playfair'],["'Poppins','Segoe UI',system-ui,sans-serif",'Poppins (modern)'],["Georgia,'Times New Roman',serif",'Georgia']];

  /* ===== FASE 3A: perpustakaan style/tema + lagu + section toggle ===== */
  var SECTION_LABELS=[['quote','Ayat / Kutipan'],['countdown','Hitung Mundur'],['story','Kisah / Love Story'],['events','Detail Acara'],['gallery','Galeri Foto'],['gift','Amplop Digital'],['info','Info Tambahan'],['wishes','Ucapan & Doa']];
  var STYLE_LIB=[], SONG_LIB=[], libLoaded=false;
  function loadLibraries(cb){ if(libLoaded){ cb&&cb(); return; }
    Promise.all([
      db('themes?select=id,nama,preview_url,palettes,sort,active&order=sort.asc').then(function(r){return r.ok?r.json():[]}).catch(function(){return[]}),
      db('songs?select=id,nama,artist,url,sort,active&order=sort.asc').then(function(r){return r.ok?r.json():[]}).catch(function(){return[]})
    ]).then(function(res){ STYLE_LIB=(res[0]||[]).filter(function(x){return x.active!==false}); SONG_LIB=(res[1]||[]).filter(function(x){return x.active!==false&&x.url}); libLoaded=true; cb&&cb(); });
  }
  function curStyleObj(){ var id=cfg.style||'elegant-floral'; return STYLE_LIB.filter(function(x){return x.id===id})[0]; }
  /* ===== PAKET: definisi & gating fitur (Basic / Premium / Exclusive) ===== */
  var PLANS={
    basic:{label:'Basic',price:99000,months:6,gallery:6,guests:false,upload:false,noWatermark:false,domain:false,fallingFx:false,
      features:['Editor Simple untuk isi undangan','Template siap pakai tanpa custom desain','Galeri sampai 6 foto','Musik dari perpustakaan lagu','RSVP + Ucapan &amp; Doa','Undangan aktif 6 bulan']},
    premium:{label:'Premium',price:199000,months:12,gallery:12,guests:true,upload:true,noWatermark:false,domain:false,fallingFx:true,
      features:['Advance Editor untuk custom desain','Custom font, warna, animasi &amp; layout','Galeri sampai 12 foto','Upload lagu sendiri','Manajer Tamu + link personal','RSVP + Ucapan &amp; Doa','Undangan aktif 12 bulan']},
    exclusive:{label:'Exclusive',price:349000,months:24,gallery:30,guests:true,upload:true,noWatermark:true,domain:true,fallingFx:true,
      features:['Advance Editor dengan seluruh custom Premium','Custom font, warna, animasi &amp; layout','Galeri sampai 30 foto','Upload lagu sendiri','Manajer Tamu + link personal','Tanpa label "Dibuat oleh"','Custom domain + analitik kunjungan','Undangan aktif 24 bulan','Dukungan prioritas']}
  };
  function currentPlan(){ return selPkg||(cur&&cur.package)||'basic'; }
  function plan(){ return PLANS[currentPlan()]||PLANS.basic; }
  function styleAllowed(id){ return true; } /* semua template terbuka; paket dibedakan lewat fitur */
  function galleryLimit(){ return plan().gallery||6; }
  function guestsAllowed(){ return !!plan().guests; }
  function uploadAllowed(){ return !!plan().upload; }
  function setTab(t){ if(editorMode==='simple'&&SIMPLE_TABS.indexOf(t)<0){setEditorMode('advance',t);return;} activeTab=t; persistEditorResume(); renderTabs(); renderForm(); }
  function updateBuy(){ var pl=plan(), b=el('buyBtn'); if(b) b.innerHTML='💳 Beli '+pl.label+' · Rp'+pl.price.toLocaleString('id-ID'); }
  var SEC_ICON={quote:'🕊️',countdown:'⏳',story:'💞',events:'📅',gallery:'🖼️',gift:'🎁',info:'📍',wishes:'💌'};
  function styleMock(id,st){ var pal=(st&&st.palettes&&st.palettes[0]&&st.palettes[0].colors)||{};
    var bg=pal.cream||'#F4ECE0',ink=pal.ink||'#40372F',gold=pal.gold||'#C9A24B',sage=pal.sage||'#8A9A82',blush=pal.blush||'#E7C6C2';
    var lux=(id==='luxury-gold');
    var grad=lux?'linear-gradient(135deg,#1d1712,#2c2318 55%,#100c08)':'linear-gradient(135deg,'+bg+' 0%,'+blush+' 130%)';
    var tcol=lux?(gold||'#d9b45a'):ink;
    var pets=lux?'<span class="pet" style="width:14px;height:14px;background:'+(gold||'#d9b45a')+';opacity:.25;top:8px;left:10px"></span>':'<span class="pet" style="width:18px;height:18px;background:'+blush+';top:7px;left:9px"></span><span class="pet" style="width:13px;height:13px;background:'+sage+';bottom:9px;right:11px"></span>';
    return '<div class="mk" style="background:'+grad+';color:'+tcol+'">'+pets+'<div class="mk-script">Mempelai</div><div class="mk-amp">&amp;</div><div class="mk-rule"></div><div class="mk-date">12 · 12 · 2026</div></div>';
  }
  function lockCard(title,desc){ return '<div class="group lock-card" style="text-align:center;padding:28px 20px"><div style="font-size:38px;line-height:1">🔒</div><h3 style="justify-content:center;margin-top:8px">'+title+'</h3><p class="sub" style="max-width:360px;margin:8px auto 16px">'+desc+'</p><button class="btn gold lg" data-goplan="1">✨ Lihat Paket</button></div>'; }
  function bindLock(host){ var b=host.querySelector('[data-goplan]'); if(b) b.onclick=function(){ setTab('Paket'); }; }
  function planCardsHtml(){ var curp=currentPlan(), order=['basic','premium','exclusive'];
    var h='<div class="group"><h3>Pilih Paket</h3><p class="sub">Semua template &amp; palet warna <b>terbuka gratis untuk dicoba</b> di semua paket. Paket hanya membedakan fitur: jumlah foto galeri, upload musik, Manajer Tamu, penghapusan label, custom domain, dan masa aktif — pilih saat akan membayar.</p><div class="plan-grid">';
    order.forEach(function(k){ var p=PLANS[k], on=k===curp;
      h+='<div class="plan'+(on?' on':'')+(k==='premium'?' pop':'')+'" data-plan="'+k+'">'+(k==='premium'?'<span class="rib">Terpopuler</span>':'')+'<h4>'+p.label+'</h4><div class="price">Rp'+p.price.toLocaleString('id-ID')+' <small>/ '+p.months+' bln</small></div><ul>'+p.features.map(function(f){return '<li>'+f+'</li>'}).join('')+'</ul><button class="btn '+(on?'gold':'ghost')+' lg pick" data-plan="'+k+'">'+(on?'✓ Paket Terpilih':'Pilih '+p.label)+'</button></div>'; });
    h+='</div></div>'; return h;
  }
  function bindPlans(host){ Array.prototype.forEach.call(host.querySelectorAll('[data-plan]'),function(b){ b.onclick=function(ev){ if(ev&&ev.stopPropagation)ev.stopPropagation(); var k=b.getAttribute('data-plan'); selPkg=k; updateBuy(); renderForm(); }; }); }
  /* ===== PERPUSTAKAAN: galeri template + preview per-template ===== */
  var TEMPLATES={'elegant-floral':'undangan-template-db.html','modern-editorial':'undangan-modern.html','luxury-gold':'undangan-luxury-gold.html','garden-botanical':'undangan-botani.html','midnight-luxe':'undangan-midnight.html','rustic-terracotta':'undangan-terracotta.html','blush-minimal':'undangan-blush.html','ocean-breeze':'undangan-ocean.html'};
  function templateFile(s){ return TEMPLATES[s]||'undangan-template-db.html'; }
  function syncPreviewSrc(){ if(!cur) return; var f=templateFile(cfg.style||'elegant-floral'), want=f+'?site='+encodeURIComponent(cur.slug), ifr=el('preview');
    if(ifr){ var base=(ifr.getAttribute('src')||'').split('?')[0]; if(base!==f){ ifr.onload=function(){ pushPreview(); setTimeout(pushPreview,700); setTimeout(pushPreview,1500); }; ifr.src=want; } }
    var ol=el('openLink'); if(ol) ol.href=publicLink(); }
  function themeAllowed(){ return currentPlan()!=='basic'; }
  var LIBRARY=[
    {id:'elegant-floral',name:'Elegant Floral',style:'elegant-floral',paletteId:'sage-gold',kind:'botanical',tags:['Floral','Romantis','Klasik'],tagline:'Undangan klasik bernuansa taman bunga \u2014 lembut, hangat, penuh detail botani. Cocok untuk pernikahan tradisional yang elegan.',mk:{bg1:'#F3F1E7',bg2:'#DDE6D5',ink:'#3f4a3a',acc:'#C9A24B',acc2:'#8A9A82'},theme:{cream:'#F3F1E7',ink:'#3f4a3a',gold:'#C9A24B',sage:'#8A9A82',blush:'#DDE6D5'}},
    {id:'aurora-editorial',name:'Aurora Editorial',style:'modern-editorial',paletteId:'aurora-sand',kind:'minimal',tags:['Aurora','Editorial','Modern'],tagline:'Editorial modern dengan cahaya aurora, tipografi majalah, komposisi asimetris, section bernomor, dan galeri dinamis. Identitasnya sepenuhnya berbeda dari template floral.',mk:{bg1:'#fbfaf7',bg2:'#ecdfd4',ink:'#211d19',acc:'#b0894e',acc2:'#7d8a72'},theme:{cream:'#fbfaf7',ink:'#211d19',gold:'#b0894e',sage:'#7d8a72',blush:'#ecdfd4'}},
    {id:'luxury-gold',name:'Luxury Gold',style:'luxury-gold',paletteId:'classic-gold',kind:'frame',tags:['Mewah','Eksklusif','Dramatis'],tagline:'Latar gelap dengan kilau emas dan bingkai tipis \u2014 mewah, dramatis, eksklusif untuk kesan istimewa.',mk:{bg1:'#2a2117',bg2:'#0d0a06',ink:'#efe6d2',acc:'#d9b45a',acc2:'#8a6d2e'},theme:{cream:'#2a2117',ink:'#efe6d2',gold:'#d9b45a',sage:'#8a6d2e',blush:'#0d0a06'}},
    {id:'garden-botanical',name:'Taman Botani',style:'garden-botanical',paletteId:'garden-sage',kind:'botanical',tags:['Botani','Segar','Romantis'],tagline:'Nuansa taman hijau yang segar \u2014 lengkung arch, tipografi script, aksen dedaunan. Lembut dan alami untuk pernikahan bertema kebun.',theme:{cream:'#f6f4ea',ink:'#3b3f34',gold:'#a98b52',sage:'#7c8a6f',blush:'#e7d8d0'}},
    {id:'midnight-luxe',name:'Midnight Luxe',style:'midnight-luxe',paletteId:'midnight-gold',kind:'frame',tags:['Gelap','Mewah','Elegan'],tagline:'Latar navy gelap dengan kilau emas dan bingkai tipis \u2014 dramatis dan berkelas untuk kesan mewah di malam hari.',theme:{cream:'#0d1020',ink:'#ece7db',gold:'#c9a24b',sage:'#8a6d28',blush:'#2a3350'}},
    {id:'rustic-terracotta',name:'Rustic Terracotta',style:'rustic-terracotta',paletteId:'terracotta-sand',kind:'stamp',tags:['Rustic','Hangat','Earthy'],tagline:'Warna terakota hangat dengan bingkai stempel garis putus \u2014 kesan rustic dan membumi untuk pesta outdoor.',theme:{cream:'#f7ece0',ink:'#43342a',gold:'#bd7d43',sage:'#b5623a',blush:'#e9c9a8'}},
    {id:'blush-minimal',name:'Blush Minimalis',style:'blush-minimal',paletteId:'blush-nude',kind:'minimal',tags:['Minimalis','Bersih','Modern'],tagline:'Serba putih dengan sentuhan blush lembut \u2014 banyak ruang kosong, tipografi tipis. Bersih, modern, dan tenang.',theme:{cream:'#ffffff',ink:'#40383a',gold:'#b98e79',sage:'#c79a9a',blush:'#f5e7e3'}},
    {id:'ocean-breeze',name:'Ocean Breeze',style:'ocean-breeze',paletteId:'ocean-teal',kind:'wave',tags:['Teal','Segar','Pantai'],tagline:'Nuansa teal dan pasir yang menyegarkan dengan aksen gelombang \u2014 cocok untuk pernikahan tepi pantai atau bertema laut.',theme:{cream:'#f2f8f7',ink:'#2c3a3a',gold:'#c2a34e',sage:'#4f8a86',blush:'#cfe6e2'}}
  ];
  /* Palet warna sesuai tiap template (dipilih di tab Tampilan). Font mengikuti desain template. */
  var TPL_PALETTES={
    'elegant-floral':[
      {id:'sage-gold',name:'Sage Gold',colors:{cream:'#F3F1E7',ink:'#3f4a3a',gold:'#C9A24B',sage:'#8A9A82',blush:'#DDE6D5'}},
      {id:'rose-blush',name:'Rose Blush',colors:{cream:'#FBF1EE',ink:'#5b4340',gold:'#C98A78',sage:'#c9a24b',blush:'#F0D3CE'}},
      {id:'mauve',name:'Mauve',colors:{cream:'#F5F0F3',ink:'#4d3f49',gold:'#9c7c93',sage:'#b79db0',blush:'#E3D3DE'}},
      {id:'navy-gold',name:'Navy Gold',colors:{cream:'#F2F4F8',ink:'#1f2a44',gold:'#C9A24B',sage:'#33415c',blush:'#C9D2E0'}},
      {id:'emerald-gold',name:'Emerald',colors:{cream:'#EEF3EF',ink:'#1e3d31',gold:'#C9A24B',sage:'#2f6b52',blush:'#CBE0D2'}},
      {id:'terracotta',name:'Terracotta',colors:{cream:'#F7EFE7',ink:'#5b3f2e',gold:'#b5713f',sage:'#8a7a4b',blush:'#E8CDB6'}}
    ],
    'modern-editorial':[
      {id:'aurora-sand',name:'Aurora Sand',colors:{cream:'#fbfaf7',ink:'#211d19',gold:'#b0894e',sage:'#7d8a72',blush:'#ecdfd4'}},
      {id:'mono-ink',name:'Mono Ink',colors:{cream:'#f6f5f2',ink:'#1a1a1a',gold:'#8f8f8f',sage:'#555555',blush:'#e6e6e6'}},
      {id:'olive-editorial',name:'Olive',colors:{cream:'#f4f3ec',ink:'#2c2f26',gold:'#8f8b4e',sage:'#6d7358',blush:'#dfe0cf'}},
      {id:'dusty-rose',name:'Dusty Rose',colors:{cream:'#faf4f1',ink:'#3a2e2b',gold:'#b07d6e',sage:'#b79a90',blush:'#ecd8d0'}},
      {id:'slate-blue',name:'Slate Blue',colors:{cream:'#f3f5f7',ink:'#20303a',gold:'#5f7d8c',sage:'#48606c',blush:'#d6e0e5'}}
    ],
    'luxury-gold':[
      {id:'classic-gold',name:'Classic Gold',colors:{cream:'#2a2117',ink:'#efe6d2',gold:'#d9b45a',sage:'#8a6d2e',blush:'#0d0a06'}},
      {id:'rose-gold',name:'Rose Gold',colors:{cream:'#2b2020',ink:'#f2e2dc',gold:'#e0a487',sage:'#a06b56',blush:'#0d0808'}},
      {id:'emerald-gold',name:'Emerald Gold',colors:{cream:'#12271f',ink:'#e7f0e7',gold:'#d9b45a',sage:'#2f6b52',blush:'#060d09'}},
      {id:'champagne',name:'Champagne',colors:{cream:'#26211a',ink:'#f3ebd9',gold:'#e6c98a',sage:'#9c7c48',blush:'#0b0906'}},
      {id:'burgundy-gold',name:'Burgundy Gold',colors:{cream:'#2a1418',ink:'#f2dfe0',gold:'#d9b45a',sage:'#7d2f3c',blush:'#0d0506'}}
    ],
    'garden-botanical':[
      {id:'garden-sage',name:'Garden Sage',colors:{cream:'#f6f4ea',ink:'#3b3f34',gold:'#a98b52',sage:'#7c8a6f',blush:'#e7d8d0'}},
      {id:'fresh-eucalyptus',name:'Eucalyptus',colors:{cream:'#eef3ee',ink:'#2f4034',gold:'#9c8a4e',sage:'#6a8f74',blush:'#d7e6da'}},
      {id:'dusty-olive',name:'Dusty Olive',colors:{cream:'#f3f2e7',ink:'#33372a',gold:'#8f8b4e',sage:'#6d7358',blush:'#dfe0cf'}},
      {id:'rose-garden',name:'Rose Garden',colors:{cream:'#faf2ee',ink:'#4a3a36',gold:'#c08a6a',sage:'#8a9a82',blush:'#f0d8ce'}}
    ],
    'midnight-luxe':[
      {id:'midnight-gold',name:'Midnight Gold',colors:{cream:'#0d1020',ink:'#ece7db',gold:'#c9a24b',sage:'#8a6d28',blush:'#2a3350'}},
      {id:'royal-emerald',name:'Royal Emerald',colors:{cream:'#0c1a15',ink:'#e7f0e7',gold:'#cbb26a',sage:'#2f6b52',blush:'#12271f'}},
      {id:'plum-noir',name:'Plum Noir',colors:{cream:'#160f1c',ink:'#efe3ef',gold:'#c39bd3',sage:'#6a4b7a',blush:'#251830'}},
      {id:'steel-navy',name:'Steel Navy',colors:{cream:'#0b1220',ink:'#e2e8f0',gold:'#9db4d0',sage:'#3a516e',blush:'#1a2740'}}
    ],
    'rustic-terracotta':[
      {id:'terracotta-sand',name:'Terracotta Sand',colors:{cream:'#f7ece0',ink:'#43342a',gold:'#bd7d43',sage:'#b5623a',blush:'#e9c9a8'}},
      {id:'clay-olive',name:'Clay Olive',colors:{cream:'#f3ece0',ink:'#3d3527',gold:'#a98b4e',sage:'#7d7a4b',blush:'#e0d3b6'}},
      {id:'warm-brick',name:'Warm Brick',colors:{cream:'#f6e7dd',ink:'#4a2f26',gold:'#c06a43',sage:'#9c5a3a',blush:'#e8c3ac'}},
      {id:'honey-caramel',name:'Honey Caramel',colors:{cream:'#faf0e2',ink:'#4a3826',gold:'#c89a4e',sage:'#b5844a',blush:'#ecd6b6'}}
    ],
    'blush-minimal':[
      {id:'blush-nude',name:'Blush Nude',colors:{cream:'#ffffff',ink:'#40383a',gold:'#b98e79',sage:'#c79a9a',blush:'#f5e7e3'}},
      {id:'soft-greige',name:'Soft Greige',colors:{cream:'#faf8f5',ink:'#3d3a36',gold:'#a8927a',sage:'#b3a596',blush:'#ece5db'}},
      {id:'powder-pink',name:'Powder Pink',colors:{cream:'#fff8f9',ink:'#463a3e',gold:'#c58fa0',sage:'#d0a6ae',blush:'#f7e2e7'}},
      {id:'lilac-mist',name:'Lilac Mist',colors:{cream:'#faf7fb',ink:'#403a47',gold:'#9a86ad',sage:'#b5a6c4',blush:'#e9e0f0'}}
    ],
    'ocean-breeze':[
      {id:'ocean-teal',name:'Ocean Teal',colors:{cream:'#f2f8f7',ink:'#2c3a3a',gold:'#c2a34e',sage:'#4f8a86',blush:'#cfe6e2'}},
      {id:'deep-lagoon',name:'Deep Lagoon',colors:{cream:'#eef5f4',ink:'#20383a',gold:'#b39a52',sage:'#356663',blush:'#c2ded9'}},
      {id:'sky-aqua',name:'Sky Aqua',colors:{cream:'#f1f8fb',ink:'#26383f',gold:'#b9a35e',sage:'#5a92a6',blush:'#cfe4ec'}},
      {id:'sage-mint',name:'Sage Mint',colors:{cream:'#f2f8f3',ink:'#2f3d34',gold:'#a89a56',sage:'#6a9a82',blush:'#d3e8da'}}
    ]
  };
  function tplPalettes(){ return TPL_PALETTES[cfg.style||'elegant-floral']||TPL_PALETTES['elegant-floral']; }
  function libMock(it){ var th=it.theme||{}, m=it.mk||{};
    var cream=th.cream||m.bg1||'#F4ECE0', ink=th.ink||m.ink||'#40372F', gold=th.gold||m.acc||'#C9A24B', sage=th.sage||m.acc2||'#8A9A82', blush=th.blush||m.bg2||'#E7C6C2';
    var s=it.style;
    if(s==='modern-editorial'){
      return '<div class="lib-mock" style="background:'+cream+'">'
        +'<span style="position:absolute;inset:11px;border:1px solid '+gold+';opacity:.75"></span>'
        +'<div style="position:relative;z-index:2;text-align:center;color:'+ink+'">'
        +'<div style="font-size:7px;letter-spacing:3px;text-transform:uppercase;color:'+gold+'">The Wedding Of</div>'
        +'<div style="font-family:Georgia,serif;font-weight:400;letter-spacing:1px;font-size:26px;line-height:1.05;margin:8px 0 2px">Sekar</div>'
        +'<div style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:'+gold+';margin:1px 0">&amp;</div>'
        +'<div style="font-family:Georgia,serif;font-weight:400;letter-spacing:1px;font-size:26px;line-height:1.05;margin:2px 0 9px">Bimo</div>'
        +'<div style="border-top:1px solid '+gold+';border-bottom:1px solid '+gold+';display:inline-block;padding:3px 0;font-size:7px;letter-spacing:2px;text-transform:uppercase;color:'+ink+'">12 Des 2026</div>'
        +'</div></div>';
    }
    if(s==='luxury-gold'){
      var grad='radial-gradient(120% 100% at 50% 0%,'+(m.bg1||'#2a2117')+','+(m.bg2||'#0d0a06')+' 72%,#050403)';
      return '<div class="lib-mock" style="background:'+grad+'">'
        +'<span style="position:absolute;inset:11px;border:1.4px solid '+gold+';opacity:.65"></span>'
        +'<span style="position:absolute;inset:15px;border:.8px solid '+gold+';opacity:.4"></span>'
        +'<div style="position:relative;z-index:2;text-align:center">'
        +'<div style="font-size:7px;letter-spacing:3px;text-transform:uppercase;color:'+gold+';opacity:.85">The Wedding Of</div>'
        +'<div class="mk-script" style="color:'+gold+'">Sekar</div><div class="mk-amp" style="color:'+gold+'">&amp;</div><div class="mk-script" style="color:'+gold+'">Bimo</div>'
        +'<div style="font-size:7px;letter-spacing:3px;margin-top:6px;color:'+gold+';opacity:.8">12 &middot; 12 &middot; 2026</div>'
        +'</div></div>';
    }
    var gradF='linear-gradient(160deg,'+cream+','+blush+')';
    return '<div class="lib-mock" style="background:'+gradF+'">'
      +'<span style="position:absolute;top:-14px;left:-10px;width:54px;height:54px;border-radius:0 62% 62% 62%;background:'+sage+';opacity:.34;transform:rotate(20deg)"></span>'
      +'<span style="position:absolute;bottom:-12px;right:-10px;width:46px;height:46px;border-radius:62% 0 62% 62%;background:'+gold+';opacity:.30;transform:rotate(-16deg)"></span>'
      +'<div style="position:relative;z-index:2;background:rgba(255,255,255,.34);border:1px solid rgba(255,255,255,.55);border-radius:12px;padding:12px 22px;text-align:center">'
      +'<div style="font-size:7px;letter-spacing:3px;text-transform:uppercase;color:'+gold+'">The Wedding Of</div>'
      +'<div class="mk-script" style="color:'+ink+'">Sekar</div><div class="mk-amp" style="color:'+gold+'">&amp;</div><div class="mk-script" style="color:'+ink+'">Bimo</div>'
      +'<div style="font-size:7px;letter-spacing:3px;margin-top:6px;color:'+ink+';opacity:.72">12 &middot; 12 &middot; 2026</div>'
      +'</div></div>';
  }
  function capNames(){
    var c=(cfg&&cfg.couple)||{};
    function pick(short,obj,fb){ var s=(short||'').trim(); if(s) return s;
      var f=((obj&&obj.full)||'').trim(); return f?f.split(/\s+/)[0]:fb; }
    return { b:pick(c.brideShort,c.bride,'Mempelai'), g:pick(c.groomShort,c.groom,'Pasangan') };
  }
  function libThumb(it){
    var t=it.theme||{}, mk=it.mk||{};
    var ink=t.ink||mk.ink||'#3f4a3a', gold=t.gold||mk.acc||'#c9a24b';
    var cream=t.cream||mk.bg1||'#f4efe6', blush=t.blush||mk.bg2||'#e6ded0';
    var n=capNames(), dt=((cfg.event&&cfg.event.dateText)||'').trim();
    var useSerif=(it.kind==='minimal'||it.kind==='frame');
    return '<div class="lib-shot" style="background:linear-gradient(160deg,'+esc(cream)+','+esc(blush)+')">'
      +'<img class="lib-img" src="images/thumbs/'+esc(it.style)+'.webp" alt="Tampilan depan '+esc(it.name)+'" loading="lazy" decoding="async" onerror="this.remove()">'
      +'<div class="lib-cap">'
        +'<div class="cap-eyebrow" style="color:'+esc(gold)+'">The Wedding Of</div>'
        +'<div class="cap-names '+(useSerif?'serif':'script')+'" style="color:'+esc(ink)+'">'
          +esc(n.b)+' <span style="color:'+esc(gold)+'">&amp;</span> '+esc(n.g)+'</div>'
        +(dt?'<div class="cap-date" style="color:'+esc(ink)+'">'+esc(dt)+'</div>':'')
      +'</div></div>';
  }
  function libraryHtml(){ var curS=cfg.style||'elegant-floral', curP=cfg.paletteId||'';
    var h='<div class="group"><h3>Perpustakaan Template</h3><p class="sub">Koleksi desain undangan siap pakai — pilih salah satu untuk langsung mengubah tampilan undangan Anda. Hasilnya tampil di pratinjau kanan. Semua template terbuka untuk dicoba — pilih paket saat akan membayar.</p><div class="lib-grid">';
    LIBRARY.forEach(function(it){ var ok=styleAllowed(it.style), on=(it.style===curS);
      var lockBadge= ok?'':'<span class="lib-lock">'+(it.style==='luxury-gold'?'✨ Exclusive':'Premium')+'</span>';
      var btnLabel= on?'✓ Sedang Dipakai':(ok?'Gunakan Template':'🔒 Perlu '+(it.style==='luxury-gold'?'Exclusive':'Premium'));
      h+='<div class="lib-card'+(on?' on':'')+(ok?'':' lock')+'" data-lib="'+esc(it.id)+'">'+lockBadge+libThumb(it)+'<div class="lib-body"><div class="lib-name">'+esc(it.name)+(on?' <span class="ok">✓</span>':'')+'</div><div class="lib-tag-row">'+it.tags.map(function(t){return '<span class="lib-tag">'+esc(t)+'</span>'}).join('')+'</div><p class="lib-desc">'+esc(it.tagline)+'</p><button class="btn '+(on?'gold ':'')+'sm lib-use" data-lib="'+esc(it.id)+'">'+btnLabel+'</button></div></div>'; });
    h+='</div></div>'; return h; }
  function bindLibrary(host){ Array.prototype.forEach.call(host.querySelectorAll('[data-lib]'),function(b){ b.onclick=function(ev){ if(ev&&ev.stopPropagation)ev.stopPropagation(); var it=LIBRARY.filter(function(x){return x.id===b.getAttribute('data-lib')})[0]; if(it) useLibItem(it); }; }); }
  function useLibItem(it){ if(!styleAllowed(it.style)){ edMsg('Template “'+it.name+'” termasuk paket '+(it.style==='luxury-gold'?'Exclusive':'Premium')+'. Buka tab Paket untuk upgrade.','err'); setTab('Paket'); return; }
    cfg.style=it.style; cfg.paletteId=it.paletteId||''; cfg.theme=Object.assign({},it.theme||{}); cfg.coverKind=it.kind||'';
    activeTab=editorMode==='simple'?'Template':'Perpustakaan'; renderTabs(); renderForm(); syncPreviewSrc(); pushPreview();
    edMsg('Template “'+it.name+'” diterapkan. Lihat pratinjau di kanan.','ok'); }
  function paletteHtml(){
    var curPal=cfg.paletteId||'', pals=tplPalettes(), plim=pals.length;
    var curName=(LIBRARY.filter(function(x){return x.style===(cfg.style||'elegant-floral')})[0]||{}).name||'';
    var h='<div class="group"><h3>Palet Warna</h3><p class="sub">Warna untuk template <b>'+esc(curName)+'</b> yang sedang dipakai. Pilih palet \u2014 font otomatis mengikuti desain template. Untuk mengganti bentuk / tata letak undangan, buka tab <b>Perpustakaan</b>.</p><div style="display:flex;flex-wrap:wrap;gap:10px">';
    pals.forEach(function(p,idx){ var on=p.id===curPal, c=p.colors||{}, pl=idx>=plim;
      h+='<div data-pal="'+esc(p.id)+'"'+(pl?' data-locked="1"':'')+' class="pal-chip'+(pl?' pal-lock':'')+'" title="'+esc(p.name||p.id)+'" style="cursor:pointer;border:2px solid '+(on?'var(--gold)':'var(--line)')+';border-radius:12px;padding:6px;text-align:center;width:92px;transition:transform .15s,box-shadow .15s"><div style="display:flex;height:30px;border-radius:7px;overflow:hidden">'+['sage','gold','blush','cream'].map(function(k){return '<span style="flex:1;background:'+esc(c[k]||'#ddd')+'"></span>'}).join('')+'</div><div style="font-size:11px;margin-top:5px;font-weight:500">'+esc(p.name||p.id)+(on?' \u2713':'')+'</div></div>'; });
    h+='</div>'; if(plim<pals.length) h+='<small class="hint">Paket '+plan().label+' membuka '+plim+' palet pertama. Upgrade untuk semua palet.</small>';
    h+='</div>'; return h;
  }
  function sectionsHtml(){ var S=cfg.sections||{}, h='<div class="group"><h3>Tampilkan / Sembunyikan Section</h3><div class="sw-list">';
    SECTION_LABELS.forEach(function(x){ var on=S[x[0]]!==false;
      h+='<label class="sw-row"><span class="ic">'+(SEC_ICON[x[0]]||'•')+'</span><span class="lbl">'+x[1]+'</span><input type="checkbox" class="sw" data-sec="'+x[0]+'"'+(on?' checked':'')+'></label>'; });
    h+='</div><small class="hint">Section inti (pembuka, mempelai, acara, RSVP, penutup) selalu tampil.</small></div>'; return h;
  }
  function ornamentsHtml(){ var O=cfg.ornaments||{}, items=[['corners','Hiasan Sudut'],['border','Bingkai Tepi'],['floral','Semprotan Bunga'],['divider','Pembatas Ornamen']];
    var h='<div class="group"><h3>Aksesoris &amp; Bingkai</h3><p class="sub">Undangan meriah penuh hiasan. Nyalakan / matikan tiap komponen sesuai selera.</p><div class="sw-list">';
    items.forEach(function(x){ var on=O[x[0]]!==false; h+='<label class="sw-row"><span class="ic">🎀</span><span class="lbl">'+x[1]+'</span><input type="checkbox" class="sw" data-orn="'+x[0]+'"'+(on?' checked':'')+'></label>'; });
    h+='</div></div>'; return h;
  }
  function effectsHtml(){ var cur=getP(cfg,'effects.falling')||'', allowed=!!plan().fallingFx;
    var opts=[['','Tidak ada'],['petals','Kelopak Bunga'],['sakura','Sakura'],['snow','Salju'],['leaves','Daun Gugur'],['hearts','Hati'],['sparkle','Kilau']];
    var h='<div class="group"><h3>Efek Turun (Animasi)'+(allowed?'':' 🔒 Premium')+'</h3><p class="sub">'+(allowed?'Pilih animasi lembut yang berjatuhan di layar undangan (salju, kelopak, sakura, dll).':'Efek animasi turun tersedia di paket <b>Premium</b> &amp; <b>Exclusive</b>. Buka tab Paket untuk upgrade.')+'</p><div style="display:flex;flex-wrap:wrap;gap:10px">';
    opts.forEach(function(o){ var on=(cur===o[0]); h+='<div data-fx="'+esc(o[0])+'"'+(allowed?'':' data-fxlock="1"')+' class="gl-chip" style="cursor:pointer;color:var(--ink);border:2px solid '+(on&&allowed?'var(--gold)':'var(--line)')+';border-radius:12px;padding:10px 12px;text-align:center;font-size:12px;font-weight:500'+(allowed?'':';opacity:.6')+'">'+(allowed?'':'🔒 ')+esc(o[1])+(on&&allowed?' ✓':'')+'</div>'; });
    return h+'</div></div>'; }
  function songLibHtml(){ if(!SONG_LIB.length) return '<p class="sub" style="margin:0 0 8px">Perpustakaan lagu masih kosong (admin menambah via tabel <b>songs</b>). Anda tetap bisa upload lagu sendiri di bawah.</p>';
    var cur=getP(cfg,'music.src')||'', h='<label class="fld"><span>Pilih dari perpustakaan lagu</span><select data-song><option value="">— pilih lagu —</option>';
    SONG_LIB.forEach(function(s){ h+='<option value="'+esc(s.url)+'"'+(s.url===cur?' selected':'')+'>'+esc(s.nama)+(s.artist?(' — '+esc(s.artist)):'')+'</option>'; });
    return h+'</select></label>';
  }
  function applyPalette(styleId,palId){ var pals=TPL_PALETTES[styleId]||[]; var p=pals.filter(function(x){return x.id===palId})[0]; if(!p)return; cfg.paletteId=palId; cfg.theme=Object.assign({},cfg.theme||{},p.colors||{}); }
  var OPTIONAL_APPEARANCE={'Palet Warna':'palette','Huruf & Ukuran':'fonts','Warna Kustom':'colors','Bunga & Tekstur Kertas':'texture','Aksesoris & Bingkai':'ornaments','Efek Turun (Animasi)':'effects','Bahasa & Kalender':'culture','Tata Letak Galeri Foto':'galleryLayout','Sentuhan Visual':'visual'};
  function optGroupKey(t){var f='';Object.keys(OPTIONAL_APPEARANCE).some(function(k){if(t.indexOf(k)===0){f=OPTIONAL_APPEARANCE[k];return true}});return f;}
  function resetOptionalAppearance(k){if(k==='fonts'){setP(cfg,'theme.serif','');setP(cfg,'theme.script','');setP(cfg,'theme.sans','');cfg.textScale='md'}else if(k==='colors'){applyPalette(cfg.style||'elegant-floral',cfg.paletteId||'')}else if(k==='texture'){cfg.floraDensity='med';cfg.grain='none'}else if(k==='ornaments'){cfg.ornaments={corners:false,border:false,floral:false,divider:false}}else if(k==='effects'){setP(cfg,'effects.falling','')}else if(k==='culture'){cfg.languageMode='id';cfg.showHijri=false;cfg.showWeton=false}else if(k==='galleryLayout'){cfg.galleryLayout=''}else if(k==='visual'){cfg.coverOpenStyle='';cfg.revealStyle='';cfg.revealSpeed='normal';cfg.countdownStyle='';cfg.cursorPetals=false}else if(k==='palette'){cfg.paletteId=''}}
  function decorateAppearanceGroups(host){cfg.appearanceEnabled=cfg.appearanceEnabled||{};Array.prototype.forEach.call(host.querySelectorAll('.group'),function(g){var h=g.querySelector('h3');if(!h)return;var k=optGroupKey(h.textContent.trim());if(!k)return;var on=cfg.appearanceEnabled[k]===true;g.classList.toggle('opt-off',!on);var lab=document.createElement('label');lab.className='p11-opt-toggle';lab.innerHTML='Aktif <input type="checkbox" class="sw" data-opt-group="'+k+'"'+(on?' checked':'')+'>';h.appendChild(lab);lab.querySelector('input').onchange=function(){cfg.appearanceEnabled[k]=this.checked;if(!this.checked)resetOptionalAppearance(k);renderForm();pushPreview()};})}
  function collapseDependentFields(host){if(typeof editorMode!=='undefined'&&editorMode==='simple'){host.querySelectorAll('.p11-dependent-hidden').forEach(function(x){x.classList.remove('p11-dependent-hidden')});return}var masters=['coverPhoto.enabled','locationInfo.enabled','parentsBlessing.enabled','signature.enabled','qris.enabled','dressCode.enabled'];masters.forEach(function(path){var cb=host.querySelector('[data-bool="'+path+'"]');if(!cb)return;var g=cb.closest('.group'),keep=cb.closest('.sw-row');if(!g)return;Array.prototype.forEach.call(g.children,function(n){if(n!==g.querySelector('h3')&&n!==keep)n.classList.toggle('p11-dependent-hidden',!cb.checked)});});[['landmark','landmarkEnabled'],['parking','parkingEnabled'],['transport','transportEnabled']].forEach(function(x){var cb=host.querySelector('[data-bool="locationInfo.'+x[1]+'"]'),f=host.querySelector('[data-p="locationInfo.'+x[0]+'"]');if(cb&&f)f.closest('.fld').classList.toggle('p11-dependent-hidden',!cb.checked)})}

  function bindTampilan(host){
    decorateAppearanceGroups(host);
    bindInputs(host);
    collapseDependentFields(host);
    Array.prototype.forEach.call(host.querySelectorAll('[data-t1]'),function(b){ b.onclick=function(){ setP(cfg,b.getAttribute('data-t1'),b.getAttribute('data-t1v')); renderForm(); pushPreview(); }; });
    Array.prototype.forEach.call(host.querySelectorAll('[data-resetcolor]'),function(b){ b.onclick=function(){ applyPalette(cfg.style||'elegant-floral', cfg.paletteId||''); renderForm(); pushPreview(); edMsg('Warna dikembalikan mengikuti palet.','ok'); }; });
    Array.prototype.forEach.call(host.querySelectorAll('[data-t3check]'),function(cb){ cb.onchange=function(){ setP(cfg,cb.getAttribute('data-t3check'),!!cb.checked); pushPreview(); }; });
    Array.prototype.forEach.call(host.querySelectorAll('[data-mv]'),function(b){ b.onclick=function(){ moveSec(b.getAttribute('data-sid'),b.getAttribute('data-mv')); renderForm(); pushPreview(); }; });
    Array.prototype.forEach.call(host.querySelectorAll('[data-streset]'),function(b){ b.onclick=function(){ cfg.sectionOrder=SEC_MID_DEFAULT.slice(); ['quote','countdown','story','gallery','wishes','gift','info'].forEach(function(id){ setP(cfg,'sections.'+id,true); }); renderForm(); pushPreview(); edMsg('Urutan & tampilan section dikembalikan ke bawaan.','ok'); }; });
    (function(){ var dragId=null;
      Array.prototype.forEach.call(host.querySelectorAll('.st-row[draggable]'),function(row){
        row.addEventListener('dragstart',function(e){ dragId=row.getAttribute('data-sid'); e.dataTransfer.effectAllowed='move'; row.style.opacity='.4'; });
        row.addEventListener('dragend',function(){ row.style.opacity=''; });
        row.addEventListener('dragover',function(e){ e.preventDefault(); row.style.borderColor='var(--gold)'; });
        row.addEventListener('dragleave',function(){ row.style.borderColor='var(--line)'; });
        row.addEventListener('drop',function(e){ e.preventDefault(); row.style.borderColor='var(--line)'; var tgt=row.getAttribute('data-sid'); if(!dragId||dragId===tgt) return; var a=secOrder(),from=a.indexOf(dragId),to=a.indexOf(tgt); if(from<0||to<0) return; a.splice(to,0,a.splice(from,1)[0]); cfg.sectionOrder=a; renderForm(); pushPreview(); });
      });
    })();
    Array.prototype.forEach.call(host.querySelectorAll('[data-style]'),function(b){ b.onclick=function(){ var id=b.getAttribute('data-style'); if(!styleAllowed(id)){ edMsg('Style ini termasuk paket '+(id==='luxury-gold'?'Exclusive':'Premium')+'. Buka tab Paket untuk upgrade.','err'); setTab('Paket'); return; } cfg.style=id; cfg.paletteId=''; renderForm(); syncPreviewSrc(); pushPreview(); }; });
    Array.prototype.forEach.call(host.querySelectorAll('[data-pal]'),function(b){ b.onclick=function(){ if(b.getAttribute('data-locked')){ edMsg('Palet ini terkunci di paket '+plan().label+'. Buka tab Paket untuk upgrade.','err'); setTab('Paket'); return; } applyPalette(cfg.style||'elegant-floral', b.getAttribute('data-pal')); renderForm(); pushPreview(); }; });
    Array.prototype.forEach.call(host.querySelectorAll('[data-sec]'),function(cb){ cb.onchange=function(){ setP(cfg,'sections.'+cb.getAttribute('data-sec'),cb.checked); pushPreview(); }; });
    Array.prototype.forEach.call(host.querySelectorAll('[data-glayout]'),function(b){ b.onclick=function(){ cfg.galleryLayout=b.getAttribute('data-glayout'); renderForm(); pushPreview(); }; });
    Array.prototype.forEach.call(host.querySelectorAll('[data-orn]'),function(cb){ cb.onchange=function(){ setP(cfg,'ornaments.'+cb.getAttribute('data-orn'),cb.checked); pushPreview(); }; });
    Array.prototype.forEach.call(host.querySelectorAll('[data-fx]'),function(b){ b.onclick=function(){ if(b.getAttribute('data-fxlock')){ edMsg('Efek turun animasi tersedia di paket Premium & Exclusive. Buka tab Paket untuk upgrade.','err'); setTab('Paket'); return; } setP(cfg,'effects.falling',b.getAttribute('data-fx')); renderForm(); pushPreview(); }; });    bindCoverPhoto(host);
  }

  /* ===== PRIORITAS 1: perpustakaan Upload ala Canva ===== */
  var ML_STATE={target:'',multi:false,selected:[],drag:-1,uploading:false,queue:[]};
  function mediaLibrary(){
    if(!Array.isArray(cfg.mediaLibrary))cfg.mediaLibrary=[];
    cfg.mediaLibrary=cfg.mediaLibrary.map(function(x,i){return typeof x==='string'?{id:'legacy-'+i,url:x,name:'Foto '+(i+1)}:x;}).filter(function(x){return x&&x.url;});
    var used=[];(cfg.gallery||[]).forEach(function(x){if(x)used.push(x)});(cfg.story||[]).forEach(function(x){if(x&&x.photo)used.push(x.photo)});if(cfg.qris&&cfg.qris.image)used.push(cfg.qris.image);if(cfg.coverPhoto&&cfg.coverPhoto.image)used.push(cfg.coverPhoto.image);
    used.forEach(function(url){if(!cfg.mediaLibrary.some(function(x){return x.url===url}))cfg.mediaLibrary.push({id:'used-'+Math.random().toString(36).slice(2),url:url,name:'Foto tersimpan'});});return cfg.mediaLibrary;
  }
  function mediaUseCount(url){var n=(cfg.gallery||[]).filter(function(x){return x===url}).length;(cfg.story||[]).forEach(function(x){if(x&&x.photo===url)n++});if(cfg.qris&&cfg.qris.image===url)n++;if(cfg.coverPhoto&&cfg.coverPhoto.image===url)n++;return n;}
  function queueHtml(){if(!ML_STATE.queue.length)return'';return '<div class="ml-progress">'+ML_STATE.queue.map(function(q,i){var st=q.status==='done'?'Berhasil':q.status==='error'?'Gagal':q.status==='upload'?'Mengunggah':'Menunggu';return '<div><b>'+esc(q.name)+'</b><span>'+st+(q.status==='error'?' · <button data-ml-retry="'+i+'">Coba lagi</button>':'')+'</span></div><i><span style="width:'+(q.progress||0)+'%"></span></i>';}).join('')+'</div>';}
  function deleteStoredMedia(url){url=String(url||'');var mark='/storage/v1/object/public/media/',i=url.indexOf(mark);if(i<0||!token)return Promise.resolve();var path=url.slice(i+mark.length);return fetch(API+'/storage/v1/object/media/'+path,{method:'DELETE',headers:{apikey:KEY,Authorization:'Bearer '+token}}).then(function(){}).catch(function(){})}
  function clearMediaPath(path){var url=getP(cfg,path)||'';return deleteStoredMedia(url).then(function(){setP(cfg,path,'');renderForm();pushPreview();saveDraftLocal();edMsg('Media dihapus.','ok')})}

  function uploadTabHtml(){var a=mediaLibrary(),h='<div class="group"><h3>Upload Foto</h3><p class="sub">Upload semua bahan foto di sini, kemudian gunakan kembali dari tab Konten dan Tampilan seperti perpustakaan Upload di Canva.</p><div class="ml-drop" data-ml-drop><b>⬆ Tarik beberapa foto ke sini</b><span>JPG, PNG, atau WebP · maksimal 15 MB per foto</span><button class="btn" data-ml-upload>Pilih banyak foto</button></div>'+queueHtml()+'</div><div class="group"><h3>Foto Terupload</h3><p class="sub">'+a.length+' foto tersedia · dapat dipakai ulang di beberapa bagian</p>';
    if(!a.length)h+='<div class="ml-empty">Belum ada foto. Upload beberapa foto untuk mulai mengisi undangan.</div>';else{h+='<div class="ml-grid">';a.forEach(function(x){var u=mediaUseCount(x.url);h+='<div class="ml-card"><img src="'+esc(x.url)+'" alt="'+esc(x.name||'Foto')+'"><div class="ml-card-foot"><span>'+esc(x.name||'Foto')+'</span>'+(u?'<b>'+u+'× dipakai</b>':'<button data-ml-delete="'+esc(x.id)+'">Hapus</button>')+'</div></div>';});h+='</div>';}return h+'</div><div class="group"><h3>Musik Latar</h3>'+songLibHtml()+(uploadAllowed()?mediaField('music.src','File musik MP3'):'<small class="hint">Upload lagu sendiri tersedia di paket Premium dan Exclusive.</small>')+'</div>';}
  function storyPhotoSelectors(){var h='<div class="ml-content-block"><h4>Foto Kisah Cinta</h4><p class="sub">Pilih dari foto yang sudah diupload.</p><div class="ml-assign-grid">';for(var i=0;i<4;i++){var p='story.'+i+'.photo',v=getP(cfg,p)||'';h+='<div class="ml-assign">'+(v?'<img src="'+esc(v)+'">':'<div class="ml-ph">Belum dipilih</div>')+'<b>Foto Kisah '+(i+1)+'</b><button class="btn ghost sm" data-ml-pick="'+p+'">'+(v?'Ganti foto':'Pilih dari Upload')+'</button>'+(v?'<button class="ml-remove" data-ml-clear="'+p+'">Hapus</button>':'')+'</div>';}return h+'</div></div>';}
  function qrisPhotoSelector(){var p='qris.image',v=getP(cfg,p)||'';return '<div class="ml-content-block"><h4>Gambar QRIS</h4><div class="ml-assign ml-qris">'+(v?'<img src="'+esc(v)+'">':'<div class="ml-ph">Belum dipilih</div>')+'<button class="btn ghost sm" data-ml-pick="'+p+'">'+(v?'Ganti QRIS':'Pilih dari Upload')+'</button>'+(v?'<button class="ml-remove" data-ml-clear="'+p+'">Hapus</button>':'')+'</div></div>';}
  function gallerySelectionHtml(){var a=(cfg.gallery||[]).filter(Boolean),lim=galleryLimit(),h='<div class="group"><h3>Foto Galeri</h3>';if(!a.length)h+='<div class="ml-empty">Belum ada foto galeri.</div>';else{h+='<div class="ml-selected">';a.forEach(function(url,i){h+='<div class="ml-selected-card" draggable="true" data-ml-index="'+i+'"><span>'+(i+1)+'</span><img src="'+esc(url)+'"><button data-ml-gallery-remove="'+i+'">×</button><small>☰</small></div>';});h+='</div>';}return h+'<button class="btn" data-ml-pick="gallery" data-ml-multi="1">＋ Pilih foto</button></div>';}
  function ensureMediaPicker(){var m=document.getElementById('mlPicker');if(m)return m;m=document.createElement('div');m.id='mlPicker';m.className='ml-picker';m.innerHTML='<div class="ml-picker-card"><div class="ml-picker-head"><div><h3>Pilih Foto</h3><p></p></div><button data-ml-close>×</button></div><div class="ml-picker-grid"></div><div class="ml-picker-foot"><span></span><button class="btn ghost" data-ml-close>Batal</button><button class="btn" data-ml-apply>Gunakan pilihan</button></div></div>';document.body.appendChild(m);m.onclick=function(e){if(e.target===m||e.target.closest('[data-ml-close]'))closeMediaPicker();var b=e.target.closest('[data-ml-asset]');if(b)toggleMediaAsset(b.getAttribute('data-ml-asset'));if(e.target.closest('[data-ml-apply]'))applyMediaPicker();};return m;}
  function drawMediaPicker(){var m=ensureMediaPicker(),a=mediaLibrary();m.querySelector('.ml-picker-head p').textContent=ML_STATE.multi?'Pilih beberapa foto untuk galeri':'Pilih satu foto';m.querySelector('[data-ml-apply]').style.display=ML_STATE.multi?'':'none';m.querySelector('.ml-picker-foot span').textContent=ML_STATE.selected.length+' dipilih';m.querySelector('.ml-picker-grid').innerHTML=a.length?a.map(function(x){var on=ML_STATE.selected.indexOf(x.url)>=0;return '<button class="ml-picker-asset'+(on?' selected':'')+'" data-ml-asset="'+esc(x.id)+'"><img src="'+esc(x.url)+'"><i>'+(on?'✓':'')+'</i><span>'+esc(x.name||'Foto')+'</span></button>';}).join(''):'<div class="ml-empty">Belum ada foto. Upload terlebih dahulu dari tab Upload.</div>';}
  function openMediaPicker(target,multi){ML_STATE.target=target;ML_STATE.multi=!!multi;ML_STATE.selected=multi?(cfg.gallery||[]).filter(Boolean):[];drawMediaPicker();ensureMediaPicker().classList.add('on');document.body.style.overflow='hidden';}
  function closeMediaPicker(){var m=document.getElementById('mlPicker');if(m)m.classList.remove('on');document.body.style.overflow='';}
  function toggleMediaAsset(id){var x=mediaLibrary().filter(function(a){return a.id===id})[0];if(!x)return;if(!ML_STATE.multi){setP(cfg,ML_STATE.target,x.url);closeMediaPicker();renderForm();pushPreview();return;}var i=ML_STATE.selected.indexOf(x.url);if(i>=0)ML_STATE.selected.splice(i,1);else if(ML_STATE.selected.length<galleryLimit())ML_STATE.selected.push(x.url);else edMsg('Batas galeri paket ini '+galleryLimit()+' foto.','err');drawMediaPicker();}
  function applyMediaPicker(){if(ML_STATE.target==='gallery')cfg.gallery=ML_STATE.selected.slice(0,galleryLimit());closeMediaPicker();renderForm();pushPreview();}
  function compressImage(file,cb){if(!/^image\/(jpeg|png|webp)$/i.test(file.type))return cb(new Error('Format tidak didukung'));if(file.size>15*1024*1024)return cb(new Error('Ukuran lebih dari 15 MB'));var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){if(im.width<240||im.height<240)return cb(new Error('Resolusi terlalu kecil'));var max=1800,s=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);c.toBlob(function(b){if(!b)return cb(new Error('Kompresi gagal'));cb(null,{blob:b,data:c.toDataURL('image/webp',.82),width:c.width,height:c.height});},'image/webp',.82);};im.onerror=function(){cb(new Error('Gambar rusak'))};im.src=r.result;};r.readAsDataURL(file);}
  function uploadOne(file,cb){compressImage(file,function(err,o){if(err)return cb(err);if(!token)return cb(null,o.data,o);var path=userId+'/'+Date.now()+'_'+Math.random().toString(36).slice(2)+'.webp';fetch(API+'/storage/v1/object/media/'+path,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+token,'Content-Type':'image/webp','x-upsert':'false'},body:o.blob}).then(function(r){if(!r.ok)return r.text().then(function(t){throw new Error(t)});cb(null,API+'/storage/v1/object/public/media/'+path,o);}).catch(cb);});}
  function runQueue(){if(ML_STATE.uploading)return;var idx=ML_STATE.queue.findIndex(function(q){return q.status==='wait'});if(idx<0){saveDraftLocal();renderForm();pushPreview();return;}ML_STATE.uploading=true;var q=ML_STATE.queue[idx];q.status='upload';q.progress=25;renderForm();uploadOne(q.file,function(err,url,o){ML_STATE.uploading=false;if(err){q.status='error';q.error=String(err.message||err);q.progress=100;}else{q.status='done';q.progress=100;mediaLibrary().push({id:'media-'+Date.now()+'-'+Math.random().toString(36).slice(2),url:url,name:q.name,width:o.width,height:o.height});}renderForm();runQueue();});}
  function uploadMany(files){var list=Array.prototype.slice.call(files||[]);if(list.length>30){edMsg('Maksimal 30 foto per sekali upload.','err');list=list.slice(0,30)}list.forEach(function(f){if(!/^image\/(jpeg|png|webp)$/i.test(f.type)||f.size>15*1024*1024){ML_STATE.queue.push({file:f,name:f.name,status:'error',progress:100,error:'Format atau ukuran tidak valid'});return}ML_STATE.queue.push({file:f,name:f.name,status:'wait',progress:0})});runQueue();}
  function bindUploadTab(host){function choose(){var i=document.createElement('input');i.type='file';i.accept='image/jpeg,image/png,image/webp';i.multiple=true;i.onchange=function(){uploadMany(i.files)};i.click();}var u=host.querySelector('[data-ml-upload]'),d=host.querySelector('[data-ml-drop]');if(u)u.onclick=choose;if(d){d.ondragover=function(e){e.preventDefault();d.classList.add('over')};d.ondragleave=function(){d.classList.remove('over')};d.ondrop=function(e){e.preventDefault();d.classList.remove('over');uploadMany(e.dataTransfer.files)}}Array.prototype.forEach.call(host.querySelectorAll('[data-ml-delete]'),function(b){b.onclick=function(){var a=mediaLibrary(),i=a.findIndex(function(x){return x.id===b.getAttribute('data-ml-delete')});if(i>=0&&!mediaUseCount(a[i].url)){var item=a[i];if(!confirm('Hapus media ini?'))return;deleteStoredMedia(item.url).then(function(){a.splice(i,1);saveDraftLocal();renderForm();edMsg('Foto dihapus.','ok')})}}});Array.prototype.forEach.call(host.querySelectorAll('[data-ml-retry]'),function(b){b.onclick=function(){var q=ML_STATE.queue[+b.getAttribute('data-ml-retry')];if(q){q.status='wait';q.progress=0;runQueue()}}});bindInputs(host);}
  function bindMediaContent(host){Array.prototype.forEach.call(host.querySelectorAll('[data-ml-pick]'),function(b){b.onclick=function(){openMediaPicker(b.getAttribute('data-ml-pick'),b.getAttribute('data-ml-multi')==='1')}});Array.prototype.forEach.call(host.querySelectorAll('[data-ml-clear]'),function(b){b.onclick=function(){setP(cfg,b.getAttribute('data-ml-clear'),'');renderForm();pushPreview()}});Array.prototype.forEach.call(host.querySelectorAll('[data-ml-gallery-remove]'),function(b){b.onclick=function(){var a=(cfg.gallery||[]).filter(Boolean);a.splice(+b.getAttribute('data-ml-gallery-remove'),1);cfg.gallery=a;renderForm();pushPreview()}});var drag=-1;Array.prototype.forEach.call(host.querySelectorAll('.ml-selected-card'),function(r){r.ondragstart=function(){drag=+r.getAttribute('data-ml-index');r.classList.add('dragging')};r.ondragend=function(){r.classList.remove('dragging')};r.ondragover=function(e){e.preventDefault()};r.ondrop=function(e){e.preventDefault();var to=+r.getAttribute('data-ml-index'),a=(cfg.gallery||[]).filter(Boolean);if(drag<0||drag===to)return;a.splice(to,0,a.splice(drag,1)[0]);cfg.gallery=a;renderForm();pushPreview()}});}

  /* ===== PRIORITAS 2: foto sampul dan hero ===== */
  function coverPhotoHtml(){var p=cfg.coverPhoto||(cfg.coverPhoto={enabled:false,image:'',target:'cover',mode:'full',position:'center',focalX:50,focalY:50,zoom:100,overlayTone:'dark',overlay:35,blur:0,height:100}),v=p.image||'',pos=p.position||'center';function opt(val,lab,cur){return '<option value="'+val+'"'+(cur===val?' selected':'')+'>'+lab+'</option>'}return '<div class="group"><h3>Foto Sampul &amp; Hero</h3><p class="sub">Pilih foto dari tab Upload. Semua perubahan langsung terlihat di preview.</p><label class="sw-row"><span class="lbl">Aktifkan foto sampul</span><input type="checkbox" class="sw" data-bool="coverPhoto.enabled"'+(p.enabled?' checked':'')+'></label>'+(v?'<div class="p2-photo-preview"><img src="'+esc(v)+'"><i>Foto terpilih</i></div>':'<div class="ml-empty">Belum ada foto sampul.</div>')+'<div style="display:flex;gap:7px;margin:10px 0"><button class="btn" data-ml-pick="coverPhoto.image">'+(v?'Ganti dari Upload':'Pilih dari Upload')+'</button>'+(v?'<button class="btn ghost" data-ml-clear="coverPhoto.image">Hapus</button>':'')+'</div><div class="p2-control-grid"><label class="fld"><span>Tampilkan pada</span><select data-p="coverPhoto.target">'+opt('cover','Sampul pembuka',p.target)+opt('hero','Hero utama',p.target)+opt('both','Sampul dan hero',p.target)+'</select></label><label class="fld"><span>Mode foto</span><select data-p="coverPhoto.mode">'+opt('full','Foto penuh',p.mode)+opt('frame','Di dalam bingkai',p.mode)+'</select></label><label class="fld"><span>Warna overlay</span><select data-p="coverPhoto.overlayTone">'+opt('dark','Gelap',p.overlayTone)+opt('light','Terang',p.overlayTone)+'</select></label><label class="fld"><span>Tinggi area</span><select data-p="coverPhoto.height">'+opt('70','Ringkas · 70%',String(p.height))+opt('100','Normal · 100%',String(p.height))+opt('120','Tinggi · 120%',String(p.height))+'</select></label></div><div class="fld"><span>Posisi cepat</span><div class="p2-pos-grid">'+[['top','Atas'],['center','Tengah'],['bottom','Bawah'],['left','Kiri'],['right','Kanan']].map(function(x){return '<button data-cover-pos="'+x[0]+'" class="'+(pos===x[0]?'on':'')+'">'+x[1]+'</button>'}).join('')+'</div></div><div class="p2-control-grid"><label class="p2-range"><span>Focal point X <b>'+p.focalX+'%</b></span><input type="range" min="0" max="100" data-p="coverPhoto.focalX" value="'+p.focalX+'"></label><label class="p2-range"><span>Focal point Y <b>'+p.focalY+'%</b></span><input type="range" min="0" max="100" data-p="coverPhoto.focalY" value="'+p.focalY+'"></label><label class="p2-range"><span>Zoom <b>'+p.zoom+'%</b></span><input type="range" min="100" max="170" data-p="coverPhoto.zoom" value="'+p.zoom+'"></label><label class="p2-range"><span>Overlay <b>'+p.overlay+'%</b></span><input type="range" min="0" max="80" data-p="coverPhoto.overlay" value="'+p.overlay+'"></label><label class="p2-range"><span>Blur latar <b>'+p.blur+' px</b></span><input type="range" min="0" max="20" data-p="coverPhoto.blur" value="'+p.blur+'"></label></div><p class="p2-note">Jika foto gagal dimuat, undangan otomatis menampilkan latar gradasi yang tetap serasi dan teks tetap terbaca.</p></div>';}
  function bindCoverPhoto(host){Array.prototype.forEach.call(host.querySelectorAll('[data-cover-pos]'),function(b){b.onclick=function(){var m={top:[50,15],center:[50,50],bottom:[50,85],left:[20,50],right:[80,50]},v=b.getAttribute('data-cover-pos'),xy=m[v];setP(cfg,'coverPhoto.position',v);setP(cfg,'coverPhoto.focalX',xy[0]);setP(cfg,'coverPhoto.focalY',xy[1]);renderForm();pushPreview()}});}



  var P11_LITE=false,P11_LISTENER=false;
  function renderPerformance(host){host.innerHTML='<div class="p11-shell"><div class="p11-hero"><div class="ico">⚡</div><div><h3>Audit performa & aksesibilitas</h3><p>Mengukur preview aktif tanpa menambah beban pada undangan publik.</p></div><div class="p11-actions"><button class="btn ghost sm" id="p11Lite">Simulasikan perangkat lemah</button><button class="btn sm" id="p11Audit">Audit ulang</button></div></div><div id="p11Body" class="p11-empty">Menunggu laporan dari preview…</div></div>';el('p11Audit').onclick=p11Request;el('p11Lite').onclick=function(){P11_LITE=!P11_LITE;var f=el('preview');if(f&&f.contentWindow)f.contentWindow.postMessage({type:'WEDDING_PERFORMANCE_LITE',enabled:P11_LITE},'*');el('p11Lite').textContent=P11_LITE?'Matikan simulasi':'Simulasikan perangkat lemah'};if(!P11_LISTENER){P11_LISTENER=true;window.addEventListener('message',function(e){var d=e.data||{};if(d.type==='WEDDING_PERFORMANCE_REPORT'&&activeTab==='Performa')p11Draw(d.report||{})})}setTimeout(p11Request,120);}
  function p11Request(){var b=el('p11Body'),f=el('preview');if(b)b.innerHTML='Menganalisis preview…';if(!f||!f.contentWindow){if(b)b.innerHTML='<div class="p11-empty">Preview belum siap.</div>';return}try{f.contentWindow.postMessage({type:'WEDDING_PERFORMANCE_AUDIT'},'*');setTimeout(function(){try{var api=f.contentWindow.WEDDING_PERFORMANCE;if(api)p11Draw(api.getReport())}catch(e){}},500)}catch(e){if(b)b.innerHTML='<div class="p11-empty">Tidak dapat membaca preview.</div>';}}
  function p11FmtBytes(n){n=Number(n||0);return n>1048576?(n/1048576).toFixed(1)+' MB':Math.round(n/1024)+' KB';}
  function p11Check(ok,title,sub){return'<div class="p11-check'+(ok?'':' warn')+'"><i>'+(ok?'✓':'!')+'</i><div class="txt"><b>'+title+'</b><small>'+sub+'</small></div></div>';}
  function p11Draw(r){var b=el('p11Body');if(!b)return;var nonHero=Math.max(0,(r.imageCount||0)-(r.heroImages||0)),lazyOk=(r.lazyImages||0)>=nonHero,cards=[[(r.loadMs||0)+' ms','Waktu muat'],[p11FmtBytes(r.transferBytes),'Transfer'],[r.resourceCount||0,'Resource'],[r.imageCount||0,'Gambar'],[r.webpImages||0,'WebP'],[(r.lazyImages||0)+'/'+nonHero,'Lazy non-hero']],h='<div class="p11-score"><div class="p11-ring" style="--score:'+(r.score||0)+'"><div><b>'+(r.score||0)+'</b><span>SKOR / 100</span></div></div><div class="p11-cards">'+cards.map(function(x){return'<div class="p11-card"><b>'+x[0]+'</b><span>'+x[1]+'</span></div>'}).join('')+'</div></div><div class="p11-grid"><section class="p11-panel"><h3>Pemeriksaan aksesibilitas</h3>'+p11Check(!r.missingAlt,'Alt text gambar',r.missingAlt?r.missingAlt+' gambar belum memiliki alt.':'Semua gambar memiliki alt.')+p11Check(!r.smallTouchTargets,'Ukuran target sentuh',r.smallTouchTargets?r.smallTouchTargets+' kontrol di bawah 40 px.':'Kontrol utama nyaman disentuh.')+p11Check(!!r.mapFallbacks,'Fallback lokasi',r.mapFallbacks+' fallback peta disiapkan.')+p11Check(!r.failedMedia,'Fallback media',r.failedMedia?r.failedMedia+' media memakai fallback.':'Tidak ada media rusak saat audit.')+'</section><section class="p11-panel"><h3>Optimasi perangkat</h3>'+p11Check(lazyOk,'Lazy loading gambar',lazyOk?'Semua gambar non-hero ditunda.':'Masih ada gambar non-hero eager.')+p11Check((r.webpImages||0)>0||!r.imageCount,'Format WebP',r.webpImages+' gambar WebP terdeteksi.')+p11Check(true,'Reduced motion','Runtime mengikuti preferensi perangkat.')+p11Check(true,'Mode perangkat lemah',r.liteMode?'Mode ringan sedang aktif.':'Mode penuh; aktif otomatis pada perangkat lemah.')+'<div class="p11-conn" style="margin-top:10px"><span class="p11-pill">Jaringan: '+esc((r.connection&&r.connection.effectiveType)||'unknown')+'</span><span class="p11-pill">Save Data: '+((r.connection&&r.connection.saveData)?'aktif':'nonaktif')+'</span><span class="p11-pill">Mode: '+(r.liteMode?'ringan':'penuh')+'</span></div></section></div>';b.className='';b.innerHTML=h;}

  var P8_RANGE={from:'',to:''};
  function p8Date(d){var y=d.getFullYear(),m=('0'+(d.getMonth()+1)).slice(-2),x=('0'+d.getDate()).slice(-2);return y+'-'+m+'-'+x;}
  function p8Num(n){n=Number(n||0);return n.toLocaleString('id-ID');}
  function p8DefaultRange(){if(!P8_RANGE.to){var t=new Date(),f=new Date();f.setDate(f.getDate()-29);P8_RANGE={from:p8Date(f),to:p8Date(t)};}return P8_RANGE;}
  function renderAnalytics(host){
    var r=p8DefaultRange();
    host.innerHTML='<div class="p8-shell"><div class="p8-head"><div><h3>Analytics undangan</h3><p>Data anonim, preview editor tidak ikut dihitung.</p></div><div class="p8-range"><label class="fld"><span>Dari tanggal</span><input id="p8From" type="date" value="'+r.from+'"></label><label class="fld"><span>Sampai tanggal</span><input id="p8To" type="date" value="'+r.to+'"></label><button class="btn sm" id="p8Apply">Terapkan</button></div></div><div id="p8Body" class="p8-loading">Memuat analytics…</div></div>';
    if(!cur||cur.local||!cur.id){el('p8Body').innerHTML='<div class="p8-empty"><b>Analytics tersedia setelah undangan disimpan</b>Login, simpan undangan, lalu publikasikan untuk mulai mengumpulkan data.</div>';return;}
    el('p8Apply').onclick=function(){var f=el('p8From').value,t=el('p8To').value;if(!f||!t)return;if(f>t){var x=f;f=t;t=x;el('p8From').value=f;el('p8To').value=t;}P8_RANGE={from:f,to:t};p8Load(host);};
    p8Load(host);
  }
  function p8Load(host){
    var r=p8DefaultRange(),body=el('p8Body');if(!body)return;body.className='p8-loading';body.textContent='Memuat analytics…';
    db('rpc/analytics_summary',{method:'POST',body:JSON.stringify({p_site:cur.id,p_from:r.from,p_to:r.to})}).then(function(x){return x.json().then(function(j){return{ok:x.ok,data:j}})}).then(function(res){if(!res.ok)throw res.data;p8Draw(res.data||{});}).catch(function(){body.className='';body.innerHTML='<div class="p8-empty"><b>Analytics belum aktif</b>Jalankan <code>schema_priority8_analytics.sql</code> di Supabase, lalu buka undangan published untuk mulai merekam data.</div>';});
  }
  function p8Draw(data){
    var body=el('p8Body');if(!body)return;var t=data.totals||{},daily=data.daily||[],sources=data.sources||[],max=1;daily.forEach(function(x){max=Math.max(max,Number(x.opens||0));});
    var cards=[['👁',t.opens,'Undangan dibuka'],['◉',t.uniqueVisitors,'Pengunjung unik'],['📍',t.locationClicks,'Klik lokasi'],['🎁',t.giftClicks,'Klik rekening / QRIS'],['♪',t.musicPlays,'Musik diputar'],['✓',t.rsvps,'RSVP terkirim'],['%',t.rsvpRate||0,'Rasio buka → RSVP']];
    var h='<div class="p8-cards">'+cards.map(function(c){return'<div class="p8-card"><i>'+c[0]+'</i><b>'+p8Num(c[1])+(c[0]==='%'?'%':'')+'</b><span>'+c[2]+'</span></div>';}).join('')+'</div><div class="p8-grid"><section class="p8-panel"><h3>Kunjungan harian</h3><p>Jumlah pembukaan undangan pada rentang yang dipilih.</p>';
    if(!daily.length)h+='<div class="p8-empty"><b>Belum ada kunjungan</b>Bagikan link undangan published untuk mulai mengumpulkan data.</div>';
    else h+='<div class="p8-chart">'+daily.map(function(x,i){var pct=Math.max(2,Math.round(Number(x.opens||0)/max*100)),lab=(i%Math.max(1,Math.ceil(daily.length/8))===0||i===daily.length-1)?String(x.date||'').slice(5):'';return'<div class="p8-bar"><i style="height:'+pct+'%"></i><em>'+esc(x.date)+' · '+p8Num(x.opens)+' buka · '+p8Num(x.visitors)+' unik</em><span>'+lab+'</span></div>';}).join('')+'</div>';
    h+='</section><section class="p8-panel"><h3>Sumber kunjungan</h3><p>UTM source, referral domain, atau direct.</p><div class="p8-sources">';
    if(!sources.length)h+='<div class="p8-empty"><b>Belum ada sumber</b>Data akan muncul setelah link dibuka tamu.</div>';
    else{var sm=Math.max.apply(null,sources.map(function(x){return Number(x.total||0)}).concat([1]));h+=sources.map(function(x){return'<div class="p8-source"><b>'+esc(x.name||'direct')+'</b><span>'+p8Num(x.total)+'</span><i style="--p:'+Math.round(Number(x.total||0)/sm*100)+'%"></i></div>';}).join('');}
    h+='</div></section></div>';body.className='';body.innerHTML=h;
  }

  function renderForm(){ if(cfg&&Object.prototype.hasOwnProperty.call(cfg,'culturePreset')) delete cfg.culturePreset; var host=el('form'), html='';
    if(activeTab==='Template'){host.innerHTML='<div class="simple-intro"><b>Mode Simple</b> · Pilih desain yang disukai, lalu buka tab Konten untuk mengisi undangan. Semua detail desain sudah diatur oleh template.</div>'+libraryHtml();bindLibrary(host);return;}
    if(activeTab==='Konten'){ if(editorMode==='simple')html+='<div class="simple-intro"><b>Mode Simple</b> · Isi nama, tanggal, acara, lokasi, link Google Maps, teks undangan, dan upload foto. Font, warna, animasi, tata letak, serta toggle fitur dikunci oleh template.</div>'; CONTENT.forEach(function(g){ var pre=(g[0]==='Kutipan'?quotePresetHtml():(g[0]==='Penutup'?closingPresetHtml():'')),extra=(g[0]==='Kisah'?storyPhotoSelectors():(g[0]==='Amplop'?qrisPhotoSelector():'')); html+='<div class="group"><h3>'+g[0]+'</h3>'+pre+g[1].map(fieldHtml).join('')+extra+'</div>'; }); html+=gallerySelectionHtml()+rsvpEditorHtml()+(editorMode==='simple'?uploadTabHtml():''); }
    else if(activeTab==='Tampilan'){
      host.innerHTML=paletteHtml()+coverStyleHtml()+coverPhotoHtml()+typoHtml()+colorsHtml()+textureHtml()+visualStage3Html()+cultureHtml()+galleryLayoutHtml()+effectsHtml()+structureHtml(); bindTampilan(host); return; }
    else if(activeTab==='Perpustakaan'){
      host.innerHTML=libraryHtml(); bindLibrary(host); return; }
    else if(activeTab==='Upload'){ host.innerHTML=uploadTabHtml(); bindUploadTab(host); return; }
    else if(activeTab==='Paket'){ host.innerHTML=planCardsHtml(); bindPlans(host); return; }
    else if(activeTab==='Tamu'){ renderGuests(host); return; }
    else if(activeTab==='Ucapan'){ renderWishModeration(host); return; }
    else if(activeTab==='Analitik'){ renderAnalytics(host); return; }
    host.innerHTML=html; if(activeTab==='Konten'&&editorMode==='simple')bindUploadTab(host);else bindInputs(host); if(activeTab==='Konten'){collapseDependentFields(host);collapseContentFeatureGroups(host);decorateContentCollapse(host);syncSharedSectionToggles(host);} if(editorMode==='simple')applySimpleRestrictions(host);
  }

  /* ===== PRIORITAS 3: RSVP LENGKAP + REKAP OPERASIONAL ===== */
  var GUESTS=[],RSVPS=[],RSVP_FILTER='all',RSVP_EVENT='all';
  function siteBase(){var p=location.pathname.replace(/[^/]*$/,'');return location.origin+p;}
  function publicLink(){return siteBase()+'?site='+encodeURIComponent((cur&&cur.slug)||'');}
  function guestLink(name){return siteBase()+'?site='+encodeURIComponent(cur.slug)+(name?('&to='+encodeURIComponent(name)):'');}
  function rsvpState(k){k=String(k||'').toLowerCase().trim();if(/^(tidak|tidak hadir|no|berhalangan)$/.test(k))return'tidak';if(/^(ragu|belum pasti|maybe)$/.test(k))return'ragu';if(/^(hadir|ya|yes|akan hadir)$/.test(k))return'hadir';return'pending';}
  function isHadir(k){return rsvpState(k)==='hadir';}
  function loadRsvpRows(){var q='rsvp?site_id=eq.'+cur.id+'&order=created_at.desc&select=id,nama,kehadiran,jumlah,acara,catatan,created_at,updated_at';return db(q).then(function(r){if(r.ok)return r.json();return db('rsvp?site_id=eq.'+cur.id+'&order=created_at.desc&select=id,nama,kehadiran,jumlah,catatan,created_at').then(function(x){return x.ok?x.json():[]})});}
  function renderGuests(host){if(!cur||!cur.id){RSVPS=[];GUESTS=[];drawGuests(host);return;}host.innerHTML='<p class="sub">Memuat data RSVP…</p>';Promise.all([loadRsvpRows(),guestsAllowed()?db('guests?site_id=eq.'+cur.id+'&order=created_at.asc&select=id,name,category,invited_count,phone,rsvp_status').then(function(r){return r.ok?r.json():[]}):Promise.resolve([])]).then(function(res){RSVPS=res[0]||[];GUESTS=res[1]||[];drawGuests(host)}).catch(function(){host.innerHTML='<p class="sub" style="color:var(--danger)">Gagal memuat RSVP. Jalankan <b>schema_priority3_rsvp.sql</b> di Supabase.</p>'});}
  function filteredRsvp(){return RSVPS.filter(function(r){return(RSVP_FILTER==='all'||rsvpState(r.kehadiran)===RSVP_FILTER)&&(RSVP_EVENT==='all'||String(r.acara||'')===RSVP_EVENT)});}
  function drawGuests(host){var resp=RSVPS.length,hadir=RSVPS.filter(function(r){return rsvpState(r.kehadiran)==='hadir'}),ragu=RSVPS.filter(function(r){return rsvpState(r.kehadiran)==='ragu'}),tidak=RSVPS.filter(function(r){return rsvpState(r.kehadiran)==='tidak'}),pax=hadir.reduce(function(a,r){return a+(parseInt(r.jumlah,10)||1)},0),rows=filteredRsvp(),events=[];RSVPS.forEach(function(r){if(r.acara&&events.indexOf(r.acara)<0)events.push(r.acara)});var h='<div class="group"><h3>Ringkasan RSVP</h3><div style="display:flex;gap:8px;flex-wrap:wrap">'+statCard('Respons',resp)+statCard('Hadir',hadir.length)+statCard('Belum pasti',ragu.length)+statCard('Tidak hadir',tidak.length)+statCard('Total orang hadir',pax)+'</div></div>';
    h+='<div class="group"><h3>RSVP Masuk ('+resp+')</h3><div class="p3-toolbar"><select id="p3Filter"><option value="all">Semua status</option><option value="hadir">Hadir</option><option value="ragu">Belum pasti</option><option value="tidak">Tidak hadir</option></select><select id="p3Event"><option value="all">Semua acara</option>'+events.map(function(x){return'<option value="'+esc(x)+'">'+esc(x)+'</option>'}).join('')+'</select><button class="btn ghost sm" id="p3Csv">Ekspor CSV</button><button class="btn ghost sm" id="p3Xls">Ekspor Excel</button></div>';
    if(!rows.length)h+='<p class="sub">Belum ada respons untuk filter ini.</p>';else{h+='<div class="p3-table-wrap"><table class="gtbl"><thead><tr><th>Nama</th><th>Status</th><th>Orang</th><th>Acara</th><th>Catatan</th><th>Waktu</th><th></th></tr></thead><tbody>';rows.forEach(function(r){h+='<tr><td>'+esc(r.nama)+'</td><td>'+statusBadge(rsvpState(r.kehadiran))+'</td><td>'+(rsvpState(r.kehadiran)==='hadir'?(parseInt(r.jumlah,10)||1):0)+'</td><td>'+esc(r.acara||'-')+'</td><td class="p3-note-cell">'+esc(r.catatan||'-')+'</td><td>'+fmtDate(r.created_at)+'</td><td><button class="btn ghost sm" data-rsvp-edit="'+r.id+'">Edit</button></td></tr>'});h+='</tbody></table></div>';}h+='</div>';
    if(guestsAllowed()){var total=GUESTS.reduce(function(a,g){return a+(parseInt(g.invited_count,10)||1)},0);h+='<div class="group"><h3>Daftar Tamu ('+GUESTS.length+' • '+total+' orang diundang)</h3><p class="sub">Status otomatis mengikuti respons RSVP terbaru dengan nama yang sama.</p>';if(GUESTS.length){h+='<div class="p3-table-wrap"><table class="gtbl"><thead><tr><th>Nama</th><th>Kategori</th><th>Undangan</th><th>Status RSVP</th><th></th></tr></thead><tbody>';GUESTS.forEach(function(g){var rr=RSVPS.filter(function(r){return String(r.nama||'').trim().toLowerCase()===String(g.name||'').trim().toLowerCase()})[0],st=rr?rsvpState(rr.kehadiran):(g.rsvp_status||'pending');h+='<tr><td>'+esc(g.name)+'</td><td>'+esc(g.category||'-')+'</td><td>'+(parseInt(g.invited_count,10)||1)+'</td><td>'+statusBadge(st)+'</td><td style="white-space:nowrap"><button class="btn ghost sm" data-gcopy="'+esc(g.name)+'">🔗 Salin</button> <button class="btn ghost sm" data-gwa="'+esc(g.name)+'" data-gph="'+esc(g.phone||'')+'">💬 WA</button> <button class="btn ghost sm" data-gdel="'+g.id+'" style="color:var(--danger)">🗑</button></td></tr>'});h+='</tbody></table></div>';}h+='<div style="display:grid;grid-template-columns:1.4fr 1fr .7fr 1fr auto;gap:6px;align-items:end;margin-top:10px"><label class="fld" style="margin:0"><span>Nama tamu</span><input id="gN" type="text"></label><label class="fld" style="margin:0"><span>Kategori</span><select id="gC"><option>Keluarga</option><option>Teman</option><option>VIP</option><option>Kolega</option><option>Lainnya</option></select></label><label class="fld" style="margin:0"><span>Jumlah</span><input id="gJ" type="number" min="1" value="1"></label><label class="fld" style="margin:0"><span>No. WA</span><input id="gP" type="text"></label><button class="btn" id="gAdd">+ Tambah</button></div><div id="gMsg" class="msg"></div></div>';}else h+='<div class="group"><h3>Daftar Tamu Personal</h3><div class="p3-lock-mini">🔒 Link personal dan pengelolaan daftar tamu tersedia pada paket Premium dan Exclusive. Rekap RSVP di atas tetap dapat digunakan.</div></div>';
    host.innerHTML=h;var f=el('p3Filter'),ev=el('p3Event');if(f)f.value=RSVP_FILTER;if(ev)ev.value=RSVP_EVENT;bindGuests(host);}
  function statCard(lab,val){return'<div style="flex:1;min-width:105px;border:1px solid var(--line);border-radius:10px;padding:10px 12px"><div style="font-size:22px;font-weight:700">'+val+'</div><div class="sub" style="margin:0">'+lab+'</div></div>';}
  function statusBadge(s){s=rsvpState(s);var lab=s==='hadir'?'Hadir':s==='ragu'?'Belum pasti':s==='tidak'?'Tidak hadir':'Menunggu';return'<span class="p3-status p3-'+(s==='pending'?'wait':s)+'">'+lab+'</span>';}
  function fmtDate(s){try{var d=new Date(s);return d.toLocaleDateString('id-ID',{day:'2-digit',month:'short'})+' '+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}catch(e){return''}}
  function copyText(txt){try{if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(txt)}catch(e){}var ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();return Promise.resolve();}
  function gMsg(m,c){var x=el('gMsg');if(x){x.className='msg '+(c||'');x.textContent=m}}
  function csvCell(v){v=String(v==null?'':v);return'"'+v.replace(/"/g,'""')+'"';}
  function downloadRsvp(kind){var rows=filteredRsvp(),name='rsvp-'+((cur&&cur.slug)||'undangan');if(kind==='csv'){var csv='\ufeffNama,Status,Jumlah Orang,Acara,Catatan,Waktu\n'+rows.map(function(r){return[csvCell(r.nama),csvCell(rsvpState(r.kehadiran)),rsvpState(r.kehadiran)==='hadir'?(parseInt(r.jumlah,10)||1):0,csvCell(r.acara||''),csvCell(r.catatan||''),csvCell(r.created_at||'')].join(',')}).join('\n');downloadBlob(name+'.csv','text/csv;charset=utf-8',csv);}else{var html='<html><head><meta charset="utf-8"></head><body><table border="1"><tr><th>Nama</th><th>Status</th><th>Jumlah Orang</th><th>Acara</th><th>Catatan</th><th>Waktu</th></tr>'+rows.map(function(r){return'<tr><td>'+esc(r.nama)+'</td><td>'+esc(rsvpState(r.kehadiran))+'</td><td>'+(rsvpState(r.kehadiran)==='hadir'?(parseInt(r.jumlah,10)||1):0)+'</td><td>'+esc(r.acara||'')+'</td><td>'+esc(r.catatan||'')+'</td><td>'+esc(r.created_at||'')+'</td></tr>'}).join('')+'</table></body></html>';downloadBlob(name+'.xls','application/vnd.ms-excel',html);}}
  function downloadBlob(name,type,text){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500);}
  function ensureRsvpModal(){var m=el('p3Modal');if(m)return m;m=document.createElement('div');m.id='p3Modal';m.className='p3-modal';m.innerHTML='<div class="p3-modal-card"><div class="p3-modal-head"><h3>Edit RSVP</h3><button data-p3-close>×</button></div><div class="p3-edit-grid"><label class="fld"><span>Nama</span><input id="p3Name"></label><label class="fld"><span>Status</span><select id="p3Attend"><option value="Hadir">Hadir</option><option value="Ragu">Belum pasti</option><option value="Tidak">Tidak hadir</option></select></label><label class="fld"><span>Jumlah orang</span><input id="p3Count" type="number" min="0" max="20"></label><label class="fld"><span>Acara</span><select id="p3Choice"><option value="">-</option><option>Akad</option><option>Resepsi</option><option>Keduanya</option></select></label></div><label class="fld"><span>Catatan</span><textarea id="p3Note"></textarea></label><div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn ghost" data-p3-close>Batal</button><button class="btn" id="p3Save">Simpan perubahan</button></div><div id="p3Msg" class="msg"></div></div>';document.body.appendChild(m);m.onclick=function(e){if(e.target===m||e.target.closest('[data-p3-close]'))m.classList.remove('on')};return m;}
  function openRsvpEdit(id,host){var r=RSVPS.filter(function(x){return String(x.id)===String(id)})[0];if(!r)return;var m=ensureRsvpModal();m.setAttribute('data-id',id);el('p3Name').value=r.nama||'';el('p3Attend').value=rsvpState(r.kehadiran)==='hadir'?'Hadir':(rsvpState(r.kehadiran)==='tidak'?'Tidak':'Ragu');el('p3Count').value=rsvpState(r.kehadiran)==='hadir'?(parseInt(r.jumlah,10)||1):0;el('p3Choice').value=r.acara||'';el('p3Note').value=r.catatan||'';m.classList.add('on');el('p3Save').onclick=function(){var body={nama:el('p3Name').value.trim(),kehadiran:el('p3Attend').value,jumlah:el('p3Attend').value==='Hadir'?(parseInt(el('p3Count').value,10)||1):0,acara:el('p3Choice').value||null,catatan:el('p3Note').value.trim()||null};el('p3Msg').textContent='Menyimpan…';db('rsvp?id=eq.'+id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(body)}).then(function(x){if(!x.ok)throw 0;return cur&&cur.id?db('rpc/sync_guest_rsvp',{method:'POST',body:JSON.stringify({p_site:cur.id})}):null}).then(function(){m.classList.remove('on');renderGuests(host)}).catch(function(){el('p3Msg').textContent='Gagal menyimpan. Jalankan migration Prioritas 3.'});};}
  function bindGuests(host){var f=el('p3Filter'),ev=el('p3Event');if(f)f.onchange=function(){RSVP_FILTER=f.value;drawGuests(host)};if(ev)ev.onchange=function(){RSVP_EVENT=ev.value;drawGuests(host)};var c=el('p3Csv'),x=el('p3Xls');if(c)c.onclick=function(){downloadRsvp('csv')};if(x)x.onclick=function(){downloadRsvp('xls')};Array.prototype.forEach.call(host.querySelectorAll('[data-rsvp-edit]'),function(b){b.onclick=function(){openRsvpEdit(b.getAttribute('data-rsvp-edit'),host)}});Array.prototype.forEach.call(host.querySelectorAll('[data-gcopy]'),function(b){b.onclick=function(){copyText(guestLink(b.getAttribute('data-gcopy')));gMsg('Link personal disalin ✓','ok')}});Array.prototype.forEach.call(host.querySelectorAll('[data-gwa]'),function(b){b.onclick=function(){var nm=b.getAttribute('data-gwa'),ph=(b.getAttribute('data-gph')||'').replace(/[^0-9]/g,'');if(ph.charAt(0)==='0')ph='62'+ph.slice(1);window.open('https://wa.me/'+ph+'?text='+encodeURIComponent('Kepada Yth. '+nm+',\nUndangan: '+guestLink(nm)),'_blank')}});Array.prototype.forEach.call(host.querySelectorAll('[data-gdel]'),function(b){b.onclick=function(){if(confirm('Hapus tamu ini?'))db('guests?id=eq.'+b.getAttribute('data-gdel'),{method:'DELETE'}).then(function(){renderGuests(host)})}});var add=el('gAdd');if(add)add.onclick=function(){var nm=(el('gN').value||'').trim();if(!nm)return gMsg('Nama tamu wajib diisi.','err');var body={site_id:cur.id,name:nm,category:el('gC').value,invited_count:parseInt(el('gJ').value,10)||1,phone:(el('gP').value||'').trim()||null};db('guests',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(body)}).then(function(r){if(!r.ok)throw 0;renderGuests(host)}).catch(function(){gMsg('Gagal menambah tamu.','err')})};}
  function rsvpEditorHtml(){var r=cfg.rsvp||(cfg.rsvp={deadline:'',askEvent:true,askNote:true,maxGuests:4,eventChoices:['Akad','Resepsi','Keduanya'],buttonText:'Kirim Konfirmasi'});return'<div class="group"><h3>Pengaturan RSVP</h3><p class="sub">Atur batas waktu dan informasi yang diminta dari tamu.</p><div class="p3-config-grid"><label class="fld"><span>Batas waktu RSVP</span><input type="date" data-p="rsvp.deadline" value="'+esc(r.deadline||'')+'"></label><label class="fld"><span>Maksimal jumlah tamu</span><select data-p="rsvp.maxGuests">'+[1,2,3,4,5,6,8,10,15,20].map(function(n){return'<option value="'+n+'"'+(String(r.maxGuests)===String(n)?' selected':'')+'>'+n+' orang</option>'}).join('')+'</select></label></div><label class="sw-row"><span class="lbl">Tanyakan acara: Akad, Resepsi, atau keduanya</span><input type="checkbox" class="sw" data-bool="rsvp.askEvent"'+(r.askEvent!==false?' checked':'')+'></label><label class="sw-row"><span class="lbl">Izinkan catatan dari tamu</span><input type="checkbox" class="sw" data-bool="rsvp.askNote"'+(r.askNote!==false?' checked':'')+'></label><label class="fld"><span>Teks tombol kirim</span><input data-p="rsvp.buttonText" value="'+esc(r.buttonText||'Kirim Konfirmasi')+'"></label></div>';}
  /* ===== PRIORITAS 4: MODERASI UCAPAN DAN DOA ===== */
  var WISHES=[],WISH_PENDING=0,WISH_FILTER='all',WISH_SORT='newest',WISH_SEARCH='';
  function refreshWishBadge(){if(!cur||!cur.id||!token){WISH_PENDING=0;return;}db('wishes?site_id=eq.'+cur.id+'&status=eq.pending&select=id').then(function(r){return r.ok?r.json():[]}).then(function(a){var n=(a||[]).length;if(n!==WISH_PENDING){WISH_PENDING=n;renderTabs();}}).catch(function(){});}
  function renderWishModeration(host){if(!cur||!cur.id){WISHES=[];WISH_PENDING=0;drawWishModeration(host);return;}host.innerHTML='<p class="sub">Memuat ucapan dan doa…</p>';db('wishes?site_id=eq.'+cur.id+'&order=created_at.desc&select=id,nama,kehadiran,pesan,status,is_visible,is_pinned,reaction_heart,reaction_pray,reaction_smile,created_at,reviewed_at').then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(a){WISHES=a||[];WISH_PENDING=WISHES.filter(function(w){return(w.status||'pending')==='pending'}).length;renderTabs();drawWishModeration(host)}).catch(function(){host.innerHTML='<div class="p4-empty">Moderasi belum aktif. Jalankan <b>supabase/schema_priority4_wishes.sql</b> terlebih dahulu.</div>'});}
  function wishRows(){var q=WISH_SEARCH.toLowerCase().trim(),a=WISHES.filter(function(w){var st=w.status||'pending',hidden=st==='approved'&&w.is_visible===false;return(!q||String(w.nama||'').toLowerCase().indexOf(q)>=0)&&(WISH_FILTER==='all'||WISH_FILTER===st||(WISH_FILTER==='hidden'&&hidden));});a.sort(function(x,y){var d=Date.parse(x.created_at)||0,e=Date.parse(y.created_at)||0;return WISH_SORT==='oldest'?d-e:e-d});return a;}
  function wishStatus(st){st=st||'pending';return'<span class="p4-status '+esc(st)+'">'+(st==='approved'?'Disetujui':st==='rejected'?'Ditolak':'Menunggu')+'</span>';}
  function drawWishModeration(host){var pending=WISHES.filter(function(w){return(w.status||'pending')==='pending'}).length,approved=WISHES.filter(function(w){return w.status==='approved'&&w.is_visible!==false}).length,hidden=WISHES.filter(function(w){return w.is_visible===false}).length,pinned=WISHES.filter(function(w){return!!w.is_pinned}).length,rows=wishRows();var h='<div class="group"><h3>Moderasi Ucapan &amp; Doa</h3><p class="sub">Ucapan baru tidak tampil ke publik sebelum disetujui. Anda dapat menyembunyikan, memilih, atau menghapusnya kapan saja.</p><div class="p4-stats">'+statCard('Belum ditinjau',pending)+statCard('Tampil publik',approved)+statCard('Disembunyikan',hidden)+statCard('Dipilih',pinned)+'</div></div><div class="group"><div class="p4-toolbar"><input id="p4Search" placeholder="Cari nama pengirim" value="'+esc(WISH_SEARCH)+'"><select id="p4Filter"><option value="all">Semua status</option><option value="pending">Menunggu</option><option value="approved">Disetujui</option><option value="rejected">Ditolak</option><option value="hidden">Disembunyikan</option></select><select id="p4Sort"><option value="newest">Terbaru</option><option value="oldest">Terlama</option></select></div>';
    if(!rows.length)h+='<div class="p4-empty">Tidak ada ucapan pada filter ini.</div>';else{h+='<div class="p4-list">';rows.forEach(function(w){var st=w.status||'pending',vis=w.is_visible!==false,pin=!!w.is_pinned;h+='<article class="p4-card'+(pin?' pinned':'')+(!vis?' hidden':'')+'"><div class="p4-head"><div class="p4-avatar">'+esc((w.nama||'?').charAt(0).toUpperCase())+'</div><div><div class="p4-name">'+esc(w.nama||'Tanpa nama')+(pin?' · 📌':'')+'</div><div class="p4-meta">'+esc(w.kehadiran||'')+' · '+fmtDate(w.created_at)+'</div></div>'+wishStatus(st)+'</div><div class="p4-msg">'+esc(w.pesan||'')+'</div><div class="p4-reactions">❤️ '+Number(w.reaction_heart||0)+' &nbsp; 🙏 '+Number(w.reaction_pray||0)+' &nbsp; 😊 '+Number(w.reaction_smile||0)+(vis?'':' · 👁 Disembunyikan')+'</div><div class="p4-actions">'+(st!=='approved'?'<button class="btn sm" data-wish-act="approve" data-wish-id="'+w.id+'">✓ Setujui</button>':'')+(st==='pending'?'<button class="btn ghost sm" data-wish-act="reject" data-wish-id="'+w.id+'">Tolak</button>':'')+(st==='approved'?'<button class="btn ghost sm" data-wish-act="'+(vis?'hide':'show')+'" data-wish-id="'+w.id+'">'+(vis?'Sembunyikan':'Tampilkan')+'</button>':'')+'<button class="btn ghost sm" data-wish-act="pin" data-wish-id="'+w.id+'">'+(pin?'Lepas pin':'📌 Pin')+'</button><button class="btn ghost sm" style="color:var(--danger)" data-wish-act="delete" data-wish-id="'+w.id+'">Hapus</button></div></article>';});h+='</div>';}h+='</div>';host.innerHTML=h;el('p4Filter').value=WISH_FILTER;el('p4Sort').value=WISH_SORT;bindWishModeration(host);}
  function bindWishModeration(host){var s=el('p4Search'),f=el('p4Filter'),o=el('p4Sort');s.oninput=function(){WISH_SEARCH=s.value;drawWishModeration(host)};f.onchange=function(){WISH_FILTER=f.value;drawWishModeration(host)};o.onchange=function(){WISH_SORT=o.value;drawWishModeration(host)};Array.prototype.forEach.call(host.querySelectorAll('[data-wish-act]'),function(b){b.onclick=function(){var id=b.getAttribute('data-wish-id'),act=b.getAttribute('data-wish-act'),w=WISHES.filter(function(x){return String(x.id)===String(id)})[0];if(!w)return;if(act==='delete'){if(!confirm('Hapus ucapan ini secara permanen?'))return;db('wishes?id=eq.'+id,{method:'DELETE'}).then(function(r){if(!r.ok)throw 0;renderWishModeration(host)}).catch(function(){edMsg('Gagal menghapus ucapan.','err')});return;}var body={};if(act==='approve')body={status:'approved',is_visible:true,reviewed_at:new Date().toISOString()};if(act==='reject')body={status:'rejected',is_visible:false,reviewed_at:new Date().toISOString()};if(act==='hide')body={is_visible:false};if(act==='show')body={is_visible:true};if(act==='pin')body={is_pinned:!w.is_pinned};b.disabled=true;db('wishes?id=eq.'+id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(body)}).then(function(r){if(!r.ok)throw 0;return renderWishModeration(host)}).catch(function(){b.disabled=false;edMsg('Gagal memperbarui ucapan.','err')});};});}
  function quotePresetHtml(){ var faith=getP(cfg,'quote.faith')||'all'; var names={all:'Semua',islam:'Islam',christian:'Kristen',catholic:'Katolik',hindu:'Hindu',buddhist:'Buddha',general:'Umum'}; var h='<label class="fld"><span>Keyakinan / jenis kutipan</span><select data-faith="1">'; Object.keys(names).forEach(function(k){h+='<option value="'+k+'"'+(k===faith?' selected':'')+'>'+names[k]+'</option>';}); h+='</select></label><label class="fld"><span>Pilih kutipan siap pakai (atau ketik sendiri di bawah)</span><select data-preset="quote"><option value="">— pilih kutipan —</option>'; QUOTES.forEach(function(q,i){ if(faith==='all'||q.faith===faith) h+='<option value="'+i+'">'+esc(q.label||q.src)+'</option>'; }); return h+'</select></label>'; }
  function closingPresetHtml(){ var h='<label class="fld"><span>Pilih pesan penutup siap pakai (atau ketik sendiri di bawah)</span><select data-preset="closing"><option value="">— pilih pesan —</option>'; CLOSING_MSGS.forEach(function(m,i){ var lbl=m.length>64?m.slice(0,64)+'…':m; h+='<option value="'+i+'">'+esc(lbl)+'</option>'; }); return h+'</select></label>'; }
  function glayoutMock(id){ var b='display:grid;gap:2px;width:46px;height:36px'; var box=function(st){return '<span style="background:currentColor;opacity:.75;'+st+'"></span>';};
    if(id==='mosaic') return '<span style="'+b+';grid-template-columns:1fr 1fr;grid-auto-rows:1fr">'+box('grid-row:span 2')+box('')+box('')+'</span>';
    if(id==='masonry') return '<span style="'+b+';grid-template-columns:1fr 1fr 1fr;align-items:start">'+box('height:22px')+box('height:14px')+box('height:18px')+'</span>';
    if(id==='film') return '<span style="display:flex;gap:2px;width:46px;height:36px;overflow:hidden">'+box('flex:0 0 60%')+box('flex:0 0 60%')+'</span>';
    if(id==='collage') return '<span style="'+b+';grid-template-columns:1fr 1fr 1fr;grid-auto-rows:1fr">'+box('grid-column:span 2')+box('')+box('')+box('grid-column:span 2')+'</span>';
    if(id==='polaroid') return '<span style="display:flex;gap:3px;width:46px;height:36px;align-items:center;justify-content:center">'+box('width:15px;height:19px;transform:rotate(-8deg)')+box('width:15px;height:19px;transform:rotate(8deg)')+'</span>';
    if(id==='grid') return '<span style="'+b+';grid-template-columns:1fr 1fr 1fr;grid-auto-rows:1fr">'+box('')+box('')+box('')+box('')+box('')+box('')+'</span>';
    return '<span style="'+b+';grid-template-columns:1fr 1fr 1fr;grid-auto-rows:1fr;opacity:.55">'+box('')+box('')+box('')+'</span>'; }
  /* === TAHAP 1: huruf, ukuran, warna kustom, kepadatan bunga, tekstur kertas === */
  var FONT_HEAD=[["'Cormorant Garamond','Playfair Display',Georgia,serif",'Cormorant — klasik lembut'],["'Playfair Display',Georgia,serif",'Playfair — tegas elegan'],["'Marcellus',Georgia,serif",'Marcellus — seperti pahatan'],["'Lora',Georgia,serif",'Lora — hangat'],["Georgia,'Times New Roman',serif",'Georgia — aman di semua HP']];
  var FONT_SCRIPT=[["'Great Vibes','Snell Roundhand',cursive",'Great Vibes — kaligrafi'],["'Parisienne',cursive",'Parisienne — halus'],["'Dancing Script',cursive",'Dancing Script — santai'],["'Cormorant Garamond',Georgia,serif",'Tanpa tulisan tangan']];
  var FONT_BODY=[["'Poppins','Segoe UI',system-ui,sans-serif",'Poppins — modern'],["'Montserrat','Segoe UI',sans-serif",'Montserrat — bersih'],["'Lora',Georgia,serif",'Lora — serif nyaman dibaca'],["system-ui,-apple-system,'Segoe UI',sans-serif",'Bawaan HP — paling ringan']];
  function fontPick(p,lab,list){ var v=getP(cfg,p)||'';
    var h='<label class="fld"><span>'+lab+'</span><select data-p="'+p+'"><option value=""'+(v?'':' selected')+'>Bawaan template</option>';
    list.forEach(function(f){ h+='<option value="'+esc(f[0])+'"'+(f[0]===v?' selected':'')+' style="font-family:'+esc(f[0])+'">'+esc(f[1])+'</option>'; });
    return h+'</select></label>'; }
  function chipRow(path,cur,opts){ var h='<div style="display:flex;gap:8px;flex-wrap:wrap;margin:2px 0 4px">';
    opts.forEach(function(o){ var on=(cur===o[0]); h+='<div data-t1="'+path+'" data-t1v="'+esc(o[0])+'" style="cursor:pointer;color:var(--ink);border:2px solid '+(on?'var(--gold)':'var(--line)')+';border-radius:12px;padding:8px 14px;font-size:13px">'+esc(o[1])+'</div>'; });
    return h+'</div>'; }
  function typoHtml(){ return '<div class="group"><h3>Huruf &amp; Ukuran</h3><p class="sub">Ganti jenis huruf undangan. Pilih “Bawaan template” kalau ingin memakai huruf asli desain.</p>'
    +fontPick('theme.serif','Huruf judul',FONT_HEAD)
    +fontPick('theme.script','Huruf nama mempelai (tulisan tangan)',FONT_SCRIPT)
    +fontPick('theme.sans','Huruf isi teks',FONT_BODY)
    +'<div class="fld"><span>Skala huruf</span>'+chipRow('textScale',getP(cfg,'textScale')||'md',[['xs','Sangat kecil'],['sm','Kecil'],['md','Normal'],['lg','Besar'],['xl','Sangat besar']])
    +'<small class="hint">Memperbesar seluruh isi undangan secara proporsional — membantu tamu yang matanya sudah kurang awas.</small></div></div>'; }
  function colorsHtml(){ return '<div class="group"><h3>Warna Kustom</h3><p class="sub">Palet di atas mengisi warna secara otomatis. Di sini Anda bisa mengubah tiap warna satu per satu.</p>'
    +THEME.map(fieldHtml).join('')
    +'<button class="btn ghost sm" data-resetcolor="1">Kembalikan ke warna palet</button></div>'; }
  function textureHtml(){ return '<div class="group"><h3>Bunga &amp; Tekstur Kertas</h3><p class="sub">Atur seberapa ramai hiasan bunga di pinggir tiap section, dan seberapa terasa tekstur kertasnya.</p>'
    +'<div class="fld"><span>Kepadatan bunga</span>'+chipRow('floraDensity',getP(cfg,'floraDensity')||'med',[['off','Tanpa bunga'],['low','Tipis'],['med','Sedang'],['high','Ramai']])+'</div>'
    +'<div class="fld"><span>Tekstur kertas</span>'+chipRow('grain',getP(cfg,'grain')||'none',[['none','Halus'],['soft','Tipis'],['med','Sedang'],['strong','Kuat']])+'</div></div>'; }
  /* === TAHAP 2: gaya sampul + susunan section === */
  var SEC_MID_DEFAULT=['quote','couple','countdown','story','events','gallery','rsvp','wishes','gift','info'];
  var SEC_META={hero:['🏵️','Pembuka',false],quote:['🕊️','Ayat / Kutipan',true],couple:['💑','Perkenalan Mempelai',false],countdown:['⏳','Hitung Mundur',true],story:['💞','Kisah / Love Story',true],events:['📅','Detail Acara',false],gallery:['🖼️','Galeri Foto',true],rsvp:['✅','Konfirmasi (RSVP)',false],wishes:['💌','Ucapan & Doa',true],gift:['🎁','Amplop Digital',true],info:['📍','Info Tambahan',true],thanks:['🙏','Penutup',false]};
  function secOrder(){ var d=SEC_MID_DEFAULT.slice(); var c=(cfg.sectionOrder||[]).filter(function(id){return d.indexOf(id)>=0;}); d.forEach(function(id){ if(c.indexOf(id)<0) c.push(id); }); return c; }
  function moveSec(id,dir){ var a=secOrder(),i=a.indexOf(id); if(i<0)return; var j=(dir==='up')?i-1:i+1; if(j<0||j>=a.length)return; var t=a[i];a[i]=a[j];a[j]=t; cfg.sectionOrder=a; }
  function coverStyleHtml(){ var cur=cfg.coverKind||'';
    return '<div class="group"><h3>Gaya Sampul &amp; Teks Pembuka</h3><p class="sub">Bentuk bingkai kartu di halaman pembuka, plus tulisan yang tampil sebelum undangan dibuka.</p>'
    +'<div class="fld"><span>Bentuk bingkai sampul</span>'+chipRow('coverKind',cur,[['','Bawaan'],['minimal','Minimalis'],['arch','Lengkung'],['frame','Berbingkai'],['stamp','Perangko'],['wave','Gelombang'],['botanical','Botani']])+'</div>'
    +'<label class="fld"><span>Teks kecil pembuka</span><input type="text" data-p="cover.eyebrow" value="'+esc(getP(cfg,'cover.eyebrow')||'')+'" placeholder="The Wedding Of"></label>'
    +'<label class="fld"><span>Sapaan untuk tamu</span><input type="text" data-p="cover.kepada" value="'+esc(getP(cfg,'cover.kepada')||'')+'" placeholder="Kepada Yth. Bapak/Ibu/Saudara/i"></label>'
    +'<label class="fld"><span>Nama tamu bawaan</span><input type="text" data-p="cover.guestDefault" value="'+esc(getP(cfg,'cover.guestDefault')||'')+'" placeholder="Tamu Undangan"></label>'
    +'<label class="fld"><span>Tulisan tombol buka</span><input type="text" data-p="cover.openButton" value="'+esc(getP(cfg,'cover.openButton')||'')+'" placeholder="Buka Undangan"></label>'
    +'</div>'; }
  function stRow(id,o){ o=o||{}; var M=SEC_META[id]||['•',id,true],hideable=M[2],on=(cfg.sections||{})[id]!==false;
    var h='<div class="st-row" data-sid="'+id+'"'+(o.drag?' draggable="true"':'')+' style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;margin:6px 0;background:#fff">';
    h+= o.drag ? '<span class="st-grip" title="Seret untuk memindah" style="cursor:grab;color:var(--muted);font-size:17px;line-height:1">⣿</span>' : '<span title="Terkunci" style="color:var(--gold);font-size:14px">🔒</span>';
    h+='<span style="width:22px;text-align:center">'+M[0]+'</span>';
    h+='<span style="flex:1;font-size:14px">'+M[1]+(o.pin==='top'?' <small style="color:var(--muted)">— selalu di atas</small>':(o.pin==='bottom'?' <small style="color:var(--muted)">— selalu di bawah</small>':''))+'</span>';
    if(o.drag) h+='<span style="display:flex;gap:4px"><button class="btn ghost sm" data-mv="up" data-sid="'+id+'" title="Naik">▲</button><button class="btn ghost sm" data-mv="down" data-sid="'+id+'" title="Turun">▼</button></span>';
    h+= hideable ? '<input type="checkbox" class="sw" data-sec="'+id+'"'+(on?' checked':'')+' title="Tampilkan / sembunyikan">' : '<span style="font-size:11px;color:var(--muted);width:48px;text-align:center">wajib</span>';
    return h+'</div>'; }
  function structureHtml(){ var mid=secOrder(),h='<div class="group"><h3>Susunan &amp; Tampilan Section</h3><p class="sub">Seret ⣿ (atau tombol ▲▼) untuk mengatur urutan. Matikan sakelar untuk menyembunyikan. Pembuka selalu di atas, penutup selalu di bawah; section inti (mempelai, acara, RSVP) tidak bisa disembunyikan.</p><div id="stList">';
    h+=stRow('hero',{pin:'top'});
    mid.forEach(function(id){ h+=stRow(id,{drag:true}); });
    h+=stRow('thanks',{pin:'bottom'});
    return h+'</div><button class="btn ghost sm" data-streset="1" style="margin-top:10px">↺ Kembalikan ke urutan bawaan</button></div>'; }
  /* === TAHAP 3: sentuhan visual === */
  function visualStage3Html(){ var petal=(cfg.cursorPetals===true);
    return '<div class="group"><h3>Sentuhan Visual</h3><p class="sub">Atur cara undangan bergerak dan tampil. Jejak kelopak otomatis hanya berjalan di komputer/laptop agar HP tetap ringan.</p>'
    +'<div class="fld"><span>Tombol buka undangan</span>'+chipRow('coverOpenStyle',getP(cfg,'coverOpenStyle')||'', [['','Tombol biasa'],['envelope','Animasi amplop']])+'</div>'
    +'<div class="fld"><span>Animasi masuk section</span>'+chipRow('revealStyle',getP(cfg,'revealStyle')||'', [['','Bawaan'],['fade','Memudar'],['slide','Geser naik'],['zoom','Membesar'],['none','Tidak ada']])+'</div>'
    +'<div class="fld"><span>Kecepatan animasi</span>'+chipRow('revealSpeed',getP(cfg,'revealSpeed')||'normal', [['slow','Pelan'],['normal','Normal'],['fast','Cepat']])+'</div>'
    +'<div class="fld"><span>Gaya hitung mundur</span>'+chipRow('countdownStyle',getP(cfg,'countdownStyle')||'', [['','Bawaan'],['card','Kartu angka'],['circle','Lingkaran'],['minimal','Minimalis']])+'</div>'
    +'<label class="sw-row" style="margin-top:10px"><span class="ic">🌸</span><span class="lbl">Jejak kelopak di layar besar</span><input type="checkbox" class="sw" data-t3check="cursorPetals"'+(petal?' checked':'')+'></label>'
    +'<label class="fld"><span>Judul tab browser</span><input type="text" data-p="meta.title" value="'+esc(getP(cfg,'meta.title')||'')+'" placeholder="Undangan Pernikahan"></label>'
    +'<label class="fld"><span>Ikon tab (emoji)</span><input type="text" data-p="meta.icon" value="'+esc(getP(cfg,'meta.icon')||'')+'" placeholder="💍" maxlength="8"></label>'
    +'<small class="hint">Contoh ikon: 💍 🌸 💐 🤍. Ikon langsung menjadi favicon tanpa perlu upload file.</small></div>'; }
  /* === TAHAP 6: bahasa & kalender === */
  function cultureHtml(){ return '<div class="group"><h3>Bahasa &amp; Kalender</h3><p class="sub">Pilih bahasa utama dan tampilkan informasi tanggal tambahan bila diperlukan. Tema adat tersedia sebagai template tersendiri, bukan pengaturan editor.</p>'
    +'<div class="fld"><span>Bahasa undangan</span>'+chipRow('languageMode',getP(cfg,'languageMode')||'id',[['id','Indonesia'],['en','Inggris'],['bilingual','ID ⇄ EN']])+'</div>'
    +'<label class="sw-row"><span class="ic">🌙</span><span class="lbl">Tanggal Hijriah</span><input type="checkbox" class="sw" data-bool="showHijri"'+(cfg.showHijri===true?' checked':'')+'></label>'
    +'<label class="sw-row"><span class="ic">🗓️</span><span class="lbl">Weton Jawa</span><input type="checkbox" class="sw" data-bool="showWeton"'+(cfg.showWeton===true?' checked':'')+'></label></div>'; }
  function galleryLayoutHtml(){ var cur=cfg.galleryLayout||''; var h='<div class="group"><h3>Tata Letak Galeri Foto</h3><p class="sub">Pilih bentuk susunan foto. Otomatis menyesuaikan berapa pun jumlah foto (5, 9, dst). “Bawaan template” memakai gaya asli desain terpilih.</p><div style="display:flex;flex-wrap:wrap;gap:10px">';
    GALLERY_LAYOUTS.forEach(function(g){ var on=(g.id||'')===cur; h+='<div data-glayout="'+esc(g.id)+'" class="gl-chip" title="'+esc(g.name)+'" style="cursor:pointer;color:var(--ink);border:2px solid '+(on?'var(--gold)':'var(--line)')+';border-radius:12px;padding:8px;text-align:center;width:92px"><div style="display:flex;align-items:center;justify-content:center;height:40px">'+glayoutMock(g.id)+'</div><div style="font-size:11px;margin-top:5px;font-weight:500">'+esc(g.name)+(on?' ✓':'')+'</div></div>'; });
    return h+'</div></div>'; }
  function fieldHtml(f){ var p=f[0],lab=f[1],ty=f[2],v=getP(cfg,p); v=(v==null?'':String(v));
    if(ty&&ty.indexOf('select:')===0){ var _o=SELECTS[ty.split(':')[1]]||[]; var _h='<label class="fld"><span>'+lab+'</span><select data-p="'+p+'">'; if(_o.indexOf(v)<0) _h+='<option value="'+esc(v)+'"'+(v?' selected':'')+'>'+(v?esc(v):'— pilih —')+'</option>'; _o.forEach(function(o){ _h+='<option value="'+esc(o)+'"'+(o===v?' selected':'')+'>'+esc(o)+'</option>'; }); return _h+'</select></label>'; }
    if(ty==='datetime'){if(!v){var em=/events\.(\d+)\.dateISO/.exec(p),base=getP(cfg,'event.dateISO');if(em&&base){var ei=+em[1],tm=String(getP(cfg,'events.'+ei+'.time')||'').match(/\d{1,2}[.:]\d{2}/),hh=tm?tm[0].replace('.',':'):'08:00';v=String(base).slice(0,10)+'T'+hh}}var dv=v?String(v).slice(0,16):'';return '<label class="fld p11-datetime"><span>'+lab+'</span><input type="datetime-local" data-p="'+p+'" data-event-datetime="'+p+'" value="'+esc(dv)+'"></label>';}
    if(ty==='media') return mediaField(p,lab);
    if(ty==='checkbox'){var bv=getP(cfg,p),defOn=/(mapButtonEnabled|routeEnabled|landmarkEnabled|parkingEnabled|transportEnabled)$/.test(p);return '<label class="sw-row"><span class="lbl">'+lab+'</span><input type="checkbox" class="sw" data-bool="'+p+'"'+((bv===true||(bv==null&&defOn))?' checked':'')+'></label>';}
    if(ty==='textarea') return '<label class="fld"><span>'+lab+'</span><textarea data-p="'+p+'">'+esc(v)+'</textarea></label>'; 
    if(ty==='color'){ var col=/^#/.test(v)?v:'#cccccc'; return '<label class="fld"><span>'+lab+'</span><input type="color" data-p="'+p+'" value="'+col+'" style="height:40px;padding:3px"></label>'; }
    return '<label class="fld"><span>'+lab+'</span><input type="text" data-p="'+p+'" value="'+esc(v)+'"></label>'; }
  function fontSel(p,lab){ var v=getP(cfg,p)||''; return '<label class="fld"><span>'+lab+'</span><select data-p="'+p+'">'+FONTS.map(function(f){return '<option value="'+esc(f[0])+'"'+(f[0]===v?' selected':'')+'>'+f[1]+'</option>'}).join('')+'</select></label>'; }
  function mediaField(p,lab){var v=getP(cfg,p)||'',thumb=(p==='qris.image'&&v)?'<div style="margin:8px 0 10px"><img src="'+esc(v)+'" alt="Preview QRIS" style="display:block;width:118px;height:118px;object-fit:contain;padding:6px;background:#fff;border:1px solid var(--line);border-radius:12px"></div>':'',audio=(p==='music.src'&&v)?'<div class="upload-audio-preview"><audio controls preload="metadata" src="'+esc(v)+'"></audio></div>':'';return '<div class="fld"><span>'+lab+'</span>'+thumb+audio+'<div style="display:flex;gap:6px"><input type="text" data-p="'+p+'" value="'+esc(v)+'" placeholder="URL atau nama file"><button class="btn ghost sm" data-upload="'+p+'">Upload</button>'+(v?'<button class="btn ghost sm media-clear" data-media-clear="'+p+'">Hapus</button>':'')+'</div></div>'}

  function syncEventDate(path,value){var m=/events\.(\d+)\.dateISO/.exec(path);if(!m||!value)return;var i=+m[1],iso=value.length===16?value+':00+07:00':value,d=new Date(iso);if(isNaN(d))return;cfg.events=cfg.events||[];cfg.events[i]=cfg.events[i]||{};cfg.events[i].dateISO=iso;cfg.events[i].dateBig=d.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Jakarta'});cfg.events[i].time=value.slice(11,16).replace(':','.')+' WIB';if(i===0){cfg.event=cfg.event||{};cfg.event.dateISO=iso;cfg.event.dateText=cfg.events[i].dateBig}}
  function bindInputs(host){
    bindPreviewIntent(host);
    Array.prototype.forEach.call(host.querySelectorAll('[data-p]'),function(inp){ var ev=(inp.tagName==='SELECT'||inp.type==='color')?'change':'input';
      inp.addEventListener(ev,function(){var path=inp.getAttribute('data-p');setP(cfg,path,inp.value);if(inp.hasAttribute('data-event-datetime'))syncEventDate(path,inp.value);pushPreview()}); });
    Array.prototype.forEach.call(host.querySelectorAll('[data-bool]'),function(cb){cb.onchange=function(){var path=cb.getAttribute('data-bool');setP(cfg,path,!!cb.checked);pushPreview();if(/^(coverPhoto|locationInfo|parentsBlessing|signature|qris|dressCode)\.enabled$/.test(path)||/^locationInfo\.(landmark|parking|transport)Enabled$/.test(path))renderForm()};});
    Array.prototype.forEach.call(host.querySelectorAll('[data-sec]'),function(cb){cb.onchange=function(){setP(cfg,'sections.'+cb.getAttribute('data-sec'),!!cb.checked);pushPreview();renderForm()};});
    Array.prototype.forEach.call(host.querySelectorAll('[data-upload]'),function(b){ b.onclick=function(){ doUpload(b.getAttribute('data-upload')); }; });
    Array.prototype.forEach.call(host.querySelectorAll('[data-media-clear]'),function(b){b.onclick=function(){if(confirm('Hapus media ini?'))clearMediaPath(b.getAttribute('data-media-clear'))};});
    var faith=host.querySelector('[data-faith]'); if(faith){faith.onchange=function(){setP(cfg,'quote.faith',faith.value);renderForm();pushPreview();};}
    Array.prototype.forEach.call(host.querySelectorAll('[data-preset]'),function(sel){ sel.onchange=function(){ if(!sel.value)return; var k=sel.getAttribute('data-preset'); if(k==='quote'){ var q=QUOTES[parseInt(sel.value,10)]; if(q){ setP(cfg,'quote.text',q.text); setP(cfg,'quote.source',q.src); } } else if(k==='closing'){ var m=CLOSING_MSGS[parseInt(sel.value,10)]; if(m!=null){ setP(cfg,'thanks.message',m); } } renderForm(); pushPreview(); }; });
    var song=host.querySelector('[data-song]'); if(song){ song.onchange=function(){ if(song.value){ setP(cfg,'music.src',song.value); var mi=host.querySelector('[data-p="music.src"]'); if(mi) mi.value=song.value; pushPreview(); } }; }    bindMediaContent(host);
  }

  function doUpload(p){ var inp=document.createElement('input'); inp.type='file'; inp.accept=(p==='music.src')?'audio/mpeg,audio/wav,audio/ogg,audio/mp4':'image/jpeg,image/png,image/webp';
    inp.onchange=function(){ var file=inp.files[0]; if(!file) return; var isAudio=p==='music.src',ok=isAudio?/^audio\/(mpeg|mp3|wav|ogg|mp4|x-m4a)$/i.test(file.type):/^image\/(jpeg|png|webp)$/i.test(file.type),max=isAudio?12*1024*1024:15*1024*1024;if(!ok||file.size>max){edMsg('Format atau ukuran file tidak valid.','err');return}
      var ext=isAudio?({"audio/mpeg":"mp3","audio/mp3":"mp3","audio/wav":"wav","audio/ogg":"ogg","audio/mp4":"m4a","audio/x-m4a":"m4a"}[file.type]||"mp3"):'webp'; var path=userId+'/'+Date.now()+'_'+Math.random().toString(36).slice(2)+'.'+ext;
      edMsg('Mengunggah '+file.name+'…','ok');
      fetch(API+'/storage/v1/object/media/'+path,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+token,'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file})
       .then(function(r){ if(!r.ok) return r.text().then(function(t){throw t});
         var url=API+'/storage/v1/object/public/media/'+path; setP(cfg,p,url); renderForm(); pushPreview(); edMsg('Terunggah ✓','ok'); })
       .catch(function(e){ edMsg('Gagal upload: '+e,'err'); }); };
    inp.click(); }


  /* ===== PRIORITAS 5: UX DAN KEAMANAN EDITOR ===== */
  var P5_HISTORY=[],P5_INDEX=-1,P5_REPLAY=false,P5_SAVED='',P5_AUTOSAVE=0,P5_SAVING=false,P5_LAST_SAVED=0,P5_WIRED=false;
  function p5Json(o){try{return JSON.stringify(o)}catch(e){return''}}
  function p5InitHistory(){clearTimeout(P5_AUTOSAVE);P5_HISTORY=[clone(cfg)];P5_INDEX=0;P5_SAVED=p5Json(cfg);P5_LAST_SAVED=Date.now();p5Wire();p5UpdateAll();}
  function p5RecordChange(){if(!cfg||P5_REPLAY)return;var j=p5Json(cfg),cur=P5_HISTORY[P5_INDEX]&&p5Json(P5_HISTORY[P5_INDEX]);if(j!==cur){P5_HISTORY=P5_HISTORY.slice(0,P5_INDEX+1);P5_HISTORY.push(clone(cfg));if(P5_HISTORY.length>60)P5_HISTORY.shift();P5_INDEX=P5_HISTORY.length-1;p5ScheduleAutosave();}p5UpdateAll();}
  function p5Undo(){if(P5_INDEX<=0)return;P5_INDEX--;p5Restore(P5_HISTORY[P5_INDEX]);}
  function p5Redo(){if(P5_INDEX>=P5_HISTORY.length-1)return;P5_INDEX++;p5Restore(P5_HISTORY[P5_INDEX]);}
  function p5Restore(snap){P5_REPLAY=true;cfg=clone(snap);renderForm();syncPreviewSrc();pushPreview();P5_REPLAY=false;p5ScheduleAutosave();p5UpdateAll();}
  var P5_SAVE_TOAST_TIMER=0;function p5SetSaveState(kind,text){var x=el('p5SaveState');if(x){clearTimeout(P5_SAVE_TOAST_TIMER);x.className='p5-save-state '+kind;x.textContent=text}}
  function p5Time(t){if(!t)return'';try{return new Date(t).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}catch(e){return''}}
  function p5ScheduleAutosave(){clearTimeout(P5_AUTOSAVE);if(cur&&cur.local){saveDraftLocal();P5_SAVED=p5Json(cfg);P5_LAST_SAVED=Date.now();p5SetSaveState('saved','Tersimpan di perangkat · '+p5Time(P5_LAST_SAVED));return;}p5SetSaveState('dirty','Perubahan belum tersimpan');P5_AUTOSAVE=setTimeout(function(){p5Persist('auto')},1400);}
  function p5Persist(mode){if(P5_SAVING)return Promise.resolve(false);clearTimeout(P5_AUTOSAVE);if(!token||!cur||!cur.id){saveDraftLocal();P5_SAVED=p5Json(cfg);P5_LAST_SAVED=Date.now();p5SetSaveState('saved','Tersimpan di perangkat · '+p5Time(P5_LAST_SAVED));return Promise.resolve(true);}P5_SAVING=true;var sent=clone(cfg),sentJson=p5Json(sent);p5SetSaveState('saving','Menyimpan otomatis…');return db('sites?id=eq.'+cur.id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({config:sent})}).then(function(r){if(!r.ok)return r.text().then(function(t){throw t});cur.config=clone(sent);P5_SAVED=sentJson;P5_LAST_SAVED=Date.now();p5SetSaveState('saved','Tersimpan · '+p5Time(P5_LAST_SAVED));return true;}).catch(function(e){p5SetSaveState('error','Gagal menyimpan · coba lagi');if(isCloudAuthError(e)){if(mode==='manual')cloudAuthExpired();return false}if(mode==='manual')edMsg('Penyimpanan cloud gagal. Periksa koneksi lalu coba lagi.','err');return false;}).then(function(ok){P5_SAVING=false;if(p5Json(cfg)!==P5_SAVED)p5ScheduleAutosave();return ok;});}
  function p5Dirty(){return!!cfg&&p5Json(cfg)!==P5_SAVED;}
  function p5Completion(){var c=cfg||{},ev=(c.events||[])[0]||{},st=(c.story||[]),banks=c.banks||[],tests=[function(){return c.couple&&c.couple.bride&&c.couple.bride.full&&!/^Nama Lengkap/i.test(c.couple.bride.full)},function(){return c.couple&&c.couple.groom&&c.couple.groom.full&&!/^Nama Lengkap/i.test(c.couple.groom.full)},function(){return c.event&&!isNaN(Date.parse(c.event.dateISO||''))},function(){return ev.title&&ev.time},function(){return ev.location&&!/^Lokasi/i.test(ev.location)},function(){return /^https?:\/\//.test(ev.mapUrl||'')},function(){return(c.gallery||[]).some(Boolean)},function(){return st.some(function(x){return x&&x.title&&x.text&&x.text!=='...'})},function(){return c.music&&!!c.music.src},function(){return(c.qris&&c.qris.enabled&&c.qris.image)||banks.some(function(x){return x&&x.number&&!/^0+\s*0*/.test(x.number)&&x.number.indexOf('0000')<0})}];var n=tests.filter(function(f){try{return!!f()}catch(e){return false}}).length;return{done:n,total:tests.length,pct:Math.round(n/tests.length*100)}}
  function p5UpdateCompletion(){var v=p5Completion(),t=el('p5CompleteText'),b=el('p5ProgressBar');if(t)t.textContent=v.pct+'% · '+v.done+'/'+v.total;if(b)b.style.width=v.pct+'%';}
  function p5UpdateAll(){var u=el('p5Undo'),r=el('p5Redo');if(u)u.disabled=P5_INDEX<=0;if(r)r.disabled=P5_INDEX>=P5_HISTORY.length-1;p5UpdateCompletion();if(!P5_SAVING){if(p5Dirty())p5SetSaveState('dirty','Perubahan belum tersimpan');else p5SetSaveState('saved',(cur&&cur.local?'Tersimpan di perangkat':'Tersimpan')+(P5_LAST_SAVED?' · '+p5Time(P5_LAST_SAVED):''));}setTimeout(function(){p5Decorate(el('form'))},0);}
  function p5DeletePath(path){var a=path.split('.'),k=a.pop(),o=cfg;a.forEach(function(x){if(o)o=o[x]});if(o&&Object.prototype.hasOwnProperty.call(o,k))delete o[k];}
  function p5Default(path){if(path==='sectionOrder'){cfg.sectionOrder=SEC_MID_DEFAULT.slice();return;}var v=getP(STARTER,path);if(v===undefined)p5DeletePath(path);else setP(cfg,path,clone(v));}
  function p5Path(node){if(!node||!node.getAttribute)return'';if(node.hasAttribute('data-p'))return node.getAttribute('data-p');if(node.hasAttribute('data-bool'))return node.getAttribute('data-bool');if(node.hasAttribute('data-t1'))return node.getAttribute('data-t1');if(node.hasAttribute('data-t3check'))return node.getAttribute('data-t3check');if(node.hasAttribute('data-sec'))return'sections.'+node.getAttribute('data-sec');if(node.hasAttribute('data-glayout'))return'galleryLayout';if(node.hasAttribute('data-orn'))return'ornaments.'+node.getAttribute('data-orn');if(node.hasAttribute('data-fx'))return'effects.falling';if(node.hasAttribute('data-style'))return'style';if(node.hasAttribute('data-pal'))return'paletteId';return'';}
  function p5Same(path){var v=getP(cfg,path);if(v===undefined)return true;return p5Json(v)===p5Json(getP(STARTER,path));}
  function p5Decorate(host){if(!host||!cfg)return;Array.prototype.forEach.call(host.querySelectorAll('.p5-modified'),function(x){x.classList.remove('p5-modified')});Array.prototype.forEach.call(host.querySelectorAll('[data-p],[data-bool],[data-t1],[data-t3check],[data-sec],[data-glayout],[data-orn],[data-fx],[data-style],[data-pal]'),function(n){var p=p5Path(n);if(p&&!p5Same(p)){var box=n.closest('.fld,.sw-row,.gl-chip,.style-card')||n;box.classList.add('p5-modified');}});Array.prototype.forEach.call(host.querySelectorAll('.group'),function(g){var controls=g.querySelectorAll('[data-p],[data-bool],[data-t1],[data-t3check],[data-sec],[data-glayout],[data-orn],[data-fx],[data-style],[data-pal]'),paths=[],mods=0;Array.prototype.forEach.call(controls,function(n){var p=p5Path(n);if(p&&paths.indexOf(p)<0){paths.push(p);if(!p5Same(p))mods++;}});if(!paths.length)return;var tools=g.querySelector('.p5-group-tools');if(!tools){tools=document.createElement('div');tools.className='p5-group-tools';tools.innerHTML='<span class="p5-group-change"></span><button type="button" class="p5-reset">↺ Reset grup</button>';g.appendChild(tools);}tools.setAttribute('data-paths',paths.join('|'));var badge=tools.querySelector('.p5-group-change'),bt=mods?mods+' diubah':'';if(badge.textContent!==bt)badge.textContent=bt;badge.style.display=mods?'':'none';});}
  function p5ResetGroup(btn){var tools=btn.closest('.p5-group-tools'),paths=(tools.getAttribute('data-paths')||'').split('|').filter(Boolean);if(!paths.length||!confirm('Kembalikan semua pengaturan pada kelompok ini ke nilai bawaan?'))return;paths.forEach(p5Default);renderForm();pushPreview();edMsg('Kelompok pengaturan dikembalikan ke bawaan.','ok');}
  function p5Catalog(){var out=[];try{CONTENT.forEach(function(g){g[1].forEach(function(f){out.push({tab:'Konten',label:f[1],path:f[0],group:g[0]})});});}catch(e){}[['Tampilan','Foto Sampul dan Hero','coverPhoto.enabled'],['Tampilan','Overlay foto sampul','coverPhoto.overlay'],['Tampilan','Warna kustom dan palet','theme.sage'],['Tampilan','Huruf dan ukuran teks','theme.serif'],['Tampilan','Animasi dan efek','revealStyle'],['Tampilan','Susunan dan urutan section','sectionOrder'],['Tampilan','Tata letak galeri','galleryLayout'],['Tampilan','Bunga dan tekstur kertas','floraDensity'],['Tampilan','Bahasa dan kalender','languageMode'],['Upload','Upload dan perpustakaan foto','mediaLibrary'],['Tamu','RSVP dan daftar tamu','rsvp.deadline'],['Ucapan','Moderasi ucapan dan doa','wishes']].forEach(function(x){out.push({tab:x[0],label:x[1],path:x[2],group:x[0]})});return out;}
  function p5Search(q){var box=el('p5SearchResults');if(!box)return;q=String(q||'').toLowerCase().trim();if(!q){box.classList.remove('on');box.innerHTML='';return;}var rows=p5Catalog().filter(function(x){return(x.label+' '+x.group+' '+x.path).toLowerCase().indexOf(q)>=0}).slice(0,9);box.innerHTML=rows.length?rows.map(function(x,i){return'<button type="button" class="p5-result" data-p5-result="'+i+'"><i>'+(x.tab==='Tampilan'?'🎨':x.tab==='Konten'?'✏️':x.tab==='Upload'?'🖼️':x.tab==='Tamu'?'✅':x.tab==='Ucapan'?'💌':'⚙️')+'</i><b>'+esc(x.label)+'<span>'+esc(x.tab)+' · '+esc(x.group)+'</span></b></button>'}).join(''):'<div class="p5-no-result">Pengaturan tidak ditemukan.</div>';box.classList.add('on');box.__rows=rows;}
  function p5OpenResult(i){var box=el('p5SearchResults'),x=box&&box.__rows&&box.__rows[i];if(!x)return;setEditorMode('advance',x.tab);var si=el('p5Search');if(si)si.value='';p5Search('');setTimeout(function(){var target=null;Array.prototype.some.call(el('form').querySelectorAll('[data-p],[data-bool]'),function(n){if((n.getAttribute('data-p')||n.getAttribute('data-bool'))===x.path){target=n.closest('.group')||n;return true;}});if(!target){Array.prototype.some.call(el('form').querySelectorAll('.group'),function(g){if(g.textContent.toLowerCase().indexOf(x.label.toLowerCase().split(' ')[0])>=0){target=g;return true;}});}if(target){target.scrollIntoView({behavior:'smooth',block:'center'});target.classList.add('p5-flash');setTimeout(function(){target.classList.remove('p5-flash')},1500);}},80);}
  function p5FitPreview(){var pane=el('previewPane'),stage=el('p5PreviewStage'),canvas=el('p5PreviewCanvas'),frame=el('preview'),tag=el('p5PreviewTag');if(!pane||!stage||!canvas||!frame)return;var dv=pane.getAttribute('data-device')||'desktop';var w=dv==='mobile'?390:dv==='tablet'?768:1440;var label=dv==='mobile'?'HP · 390 px':dv==='tablet'?'Tablet · 768 px':'Laptop · 1440 px';var avail=Math.max(240,stage.clientWidth-28);var scale=Math.min(1,avail/w);frame.style.width=w+'px';var nativeH=dv==='mobile'?844:dv==='tablet'?1024:900;frame.style.height=nativeH+'px';try{frame.setAttribute('scrolling','auto');}catch(e){}frame.style.transform='scale('+scale+')';canvas.style.width=Math.floor(w*scale)+'px';canvas.style.height=Math.ceil(nativeH*scale)+'px';if(tag)tag.textContent=label;if(!window.__p5PreviewResize){window.__p5PreviewResize=1;window.addEventListener('resize',function(){clearTimeout(window.__p5FitTimer);window.__p5FitTimer=setTimeout(p5FitPreview,90);});}}
  window.p5FitPreview=p5FitPreview;
  function p5SetDevice(dv){var p=el('previewPane');if(!p)return;p.setAttribute('data-device',dv);try{localStorage.setItem('undangan_preview_device_v1',dv)}catch(e){}Array.prototype.forEach.call(document.querySelectorAll('[data-p5-device]'),function(b){b.classList.toggle('on',b.getAttribute('data-p5-device')===dv)});if(window.p5FitPreview){requestAnimationFrame(p5FitPreview);}}
  function p5ToggleFull(){var p=el('previewPane');if(!p)return;p.classList.toggle('p5-fullscreen');var b=el('p5Full');if(b)b.textContent=p.classList.contains('p5-fullscreen')?'✕ Tutup':'⛶ Penuh';if(window.p5FitPreview){setTimeout(p5FitPreview,60);}}
  function p5Wire(){if(P5_WIRED)return;P5_WIRED=true;var form=el('form'),search=el('p5Search');if(search)search.oninput=function(){p5Search(search.value)};var u=el('p5Undo'),r=el('p5Redo');if(u)u.onclick=p5Undo;if(r)r.onclick=p5Redo;document.addEventListener('click',function(e){var res=e.target.closest('[data-p5-result]');if(res){p5OpenResult(+res.getAttribute('data-p5-result'));return;}var reset=e.target.closest('.p5-reset');if(reset){p5ResetGroup(reset);return;}if(search&&!e.target.closest('.p5-search'))p5Search('');var dv=e.target.closest('[data-p5-device]');if(dv)p5SetDevice(dv.getAttribute('data-p5-device'));if(e.target.closest('#p5Full'))p5ToggleFull();});if(form){['input','change','click'].forEach(function(ev){form.addEventListener(ev,function(){setTimeout(p5RecordChange,0)},true)});new MutationObserver(function(){setTimeout(function(){p5Decorate(form)},0)}).observe(form,{childList:true,subtree:true});}document.addEventListener('keydown',function(e){if(!(e.ctrlKey||e.metaKey))return;if(String(e.key).toLowerCase()==='z'){e.preventDefault();e.shiftKey?p5Redo():p5Undo();}else if(String(e.key).toLowerCase()==='y'){e.preventDefault();p5Redo();}});window.addEventListener('beforeunload',function(e){if(p5Dirty()){e.preventDefault();e.returnValue='Perubahan belum tersimpan.';return e.returnValue;}});var dv='desktop';try{dv=localStorage.getItem('undangan_preview_device_v1')||'desktop'}catch(e){}p5SetDevice(dv);}

  function save(){saveDraftLocal();if(!token){showCloudToast('Masuk dengan Google untuk menyimpan ke cloud','info');setTimeout(function(){startGoogleLogin('cloud-save')},550);return Promise.resolve(false)}return ensureCloudSiteAndSave();} 
  /* ===== PRIORITAS 6: CHECKLIST SEBELUM PUBLIKASI ===== */
  var P6={items:[],devices:{desktop:false,tablet:false,mobile:false},fingerprint:'',running:false};
  function p6Add(id,label,status,detail,tab,path){P6.items.push({id:id,label:label,status:status,detail:detail,tab:tab||'',path:path||''});}
  function p6Set(id,status,detail){P6.items.forEach(function(x){if(x.id===id){x.status=status;x.detail=detail}});p6Render();}
  function p6MediaUrls(){var c=cfg||{},a=[],seen={};function add(l,u,t){u=String(u||'').trim();if(u&&!seen[u]){seen[u]=1;a.push({label:l,url:u,type:t||'image'})}}var cp=c.coverPhoto||{};add('Foto sampul',cp.url);add('Foto hero',cp.heroUrl);(c.gallery||[]).forEach(function(u,i){add('Galeri '+(i+1),u)});(c.story||[]).forEach(function(x,i){if(x)add('Foto kisah '+(i+1),x.photo||x.image)});if(c.qris&&c.qris.enabled)add('QRIS',c.qris.image);if(c.music&&c.music.src)add('Musik',c.music.src,'audio');return a;}
  function p6MediaCheck(x){return new Promise(function(resolve){if(/^data:|^blob:/i.test(x.url))return resolve({ok:true});if(!/^https?:\/\//i.test(x.url))return resolve({ok:false,detail:x.label+' memakai alamat file tidak valid.'});var done=false,t=setTimeout(function(){if(!done){done=true;resolve({ok:null,detail:x.label+' tidak dapat diverifikasi.'})}},5000),m=document.createElement(x.type==='audio'?'audio':'img');m.onload=m.oncanplaythrough=function(){if(done)return;done=true;clearTimeout(t);resolve({ok:true})};m.onerror=function(){if(done)return;done=true;clearTimeout(t);resolve({ok:false,detail:x.label+' tidak dapat dibuka.'})};m.src=x.url;if(x.type==='audio')try{m.load()}catch(e){}});}
  function p6Links(){var a=[];(cfg.events||[]).forEach(function(x,i){if(x&&x.mapUrl)a.push({label:'Peta acara '+(i+1),url:x.mapUrl})});return a;}
  function p6LinkCheck(x){return new Promise(function(resolve){try{var u=new URL(x.url);if(!/^https?:$/.test(u.protocol))throw 0}catch(e){return resolve({ok:false,detail:x.label+' bukan URL valid.'})}fetch(x.url,{mode:'no-cors',cache:'no-store'}).then(function(){resolve({ok:true})}).catch(function(){resolve({ok:null,detail:x.label+' tidak dapat diverifikasi dari editor.'})})});}
  function p6IsMobileSimple(){return isMobileEditor()&&editorMode==='simple'}
  function p6RequiredViews(){return 0}
  function p6Base(){var c=cfg||{},ev=(c.events||[])[0]||{},br=c.couple&&c.couple.bride&&c.couple.bride.full,gr=c.couple&&c.couple.groom&&c.couple.groom.full,dt=Date.parse(c.event&&c.event.dateISO||''),pkg=currentPlan(),compact=p6IsMobileSimple();p6Add('bride','Nama mempelai wanita',br&&!/^Nama Lengkap/i.test(br)?'ok':'error','Wajib diisi dan bukan teks contoh.','Konten','couple.bride.full');p6Add('groom','Nama mempelai pria',gr&&!/^Nama Lengkap/i.test(gr)?'ok':'error','Wajib diisi dan bukan teks contoh.','Konten','couple.groom.full');p6Add('date','Tanggal acara',!isNaN(dt)&&dt>Date.now()?'ok':'error',isNaN(dt)?'Tanggal tidak valid.':dt<=Date.now()?'Tanggal acara sudah lewat.':'Tanggal valid.','Konten','event.dateISO');p6Add('event','Detail acara utama',ev.title&&ev.time&&ev.location&&!/^Lokasi/i.test(ev.location)?'ok':'error','Judul, waktu, dan lokasi wajib lengkap.','Konten','events.0.title');var pkgOk=true,msg=pkg==='basic'?'Basic menggunakan Editor Simple dengan template siap pakai.':PLANS[pkg].label+' membuka Advance Editor untuk custom desain.';if(pkg==='premium')pkgOk=/^https?:\/\//.test(ev.mapUrl||'');if(pkg==='exclusive'){var gift=(c.qris&&c.qris.enabled&&c.qris.image)||(c.banks||[]).some(function(x){return x&&x.number});pkgOk=/^https?:\/\//.test(ev.mapUrl||'')&&!!gift}p6Add('package','Kelengkapan paket '+PLANS[pkg].label,pkgOk?'ok':'error',msg,'Konten','');if(!compact){p6Add('personal','Personalisasi nama tamu',guestLink('Tamu Contoh').indexOf('to=Tamu%20Contoh')>=0?'ok':'error','Link personal siap diuji.','Tamu','');p6Add('rsvp','Alur RSVP',c.rsvp&&c.rsvp.enabled===false?'warning':'ok',c.rsvp&&c.rsvp.enabled===false?'RSVP dinonaktifkan.':'RSVP siap digunakan.','Tamu','');p6Add('visibility','Visibilitas dan urutan section',Array.isArray(c.sectionOrder)&&c.sectionOrder.length?'ok':'warning','Section mengikuti urutan editor.','Tampilan','sectionOrder');p6Add('wishes','Ucapan dan doa',c.sections&&c.sections.wishes===false?'warning':'ok',c.sections&&c.sections.wishes===false?'Ucapan dinonaktifkan.':'Moderasi ucapan aktif.','Ucapan','')}}
  function p6Run(){P6.items=[];P6.running=true;p6Base();var media=p6MediaUrls(),links=p6Links(),paid=!!(cur&&cur.status==='published');p6Add('media','File gambar dan audio',media.length?'running':'ok',media.length?'Memeriksa '+media.length+' file…':'Tidak ada media opsional.');p6Add('links','Tautan eksternal',links.length?'running':'ok',links.length?'Memeriksa '+links.length+' tautan…':'Tidak ada tautan tambahan.');if(paid)p6Add('public','Akses link publik','running','Memeriksa halaman publik…');p6Render();Promise.all(media.map(p6MediaCheck)).then(function(r){var bad=r.filter(function(x){return x.ok===false}),warn=r.filter(function(x){return x.ok===null});p6Set('media',bad.length?'error':warn.length?'warning':'ok',bad.length?bad.map(function(x){return x.detail}).join(' '):warn.length?warn.map(function(x){return x.detail}).join(' '):(media.length+' file dapat dibuka.'))});Promise.all(links.map(p6LinkCheck)).then(function(r){var bad=r.filter(function(x){return x.ok===false}),warn=r.filter(function(x){return x.ok===null});p6Set('links',bad.length?'error':warn.length?'warning':'ok',bad.length?bad.map(function(x){return x.detail}).join(' '):warn.length?warn.map(function(x){return x.detail}).join(' '):(links.length+' tautan dapat diakses.'))});if(paid){fetch(publicLink(),{mode:'no-cors',cache:'no-store'}).then(function(){p6Set('public','ok','Halaman publik dapat diakses.')}).catch(function(){p6Set('public','warning','Link final perlu dicek kembali setelah tayang.')}).finally(function(){P6.running=false;p6Render()})}else{P6.running=false;p6Render()}}
  function p6Counts(){var r={ok:0,warning:0,error:0,running:0};P6.items.forEach(function(x){r[x.status]++});r.viewed=Object.keys(P6.devices).filter(function(k){return P6.devices[k]}).length;r.required=p6RequiredViews();return r}
  function p6Render(){var c=p6Counts(),sum=el('p6Summary'),list=el('p6List'),icons={ok:'✓',warning:'!',error:'×',running:'↻'},compact=p6IsMobileSimple();if(!sum||!list)return;sum.innerHTML='<div class="p6-stat"><b>'+c.ok+'</b><span>Lolos</span></div><div class="p6-stat"><b>'+c.warning+'</b><span>Peringatan</span></div><div class="p6-stat"><b>'+c.error+'</b><span>Perlu diperbaiki</span></div>';list.innerHTML=P6.items.map(function(x){var fix=!compact&&x.tab?'<button class="p6-fix" data-p6-fix="'+esc(x.tab)+'" data-p6-path="'+esc(x.path)+'">Perbaiki</button>':'';return'<div class="p6-item '+x.status+'"><i>'+icons[x.status]+'</i><div><b>'+esc(x.label)+'</b><small>'+esc(x.detail)+'</small></div>'+fix+'</div>'}).join('');Object.keys(P6.devices).forEach(function(d){var b=document.querySelector('[data-p6-device="'+d+'"]');if(b)b.classList.toggle('on',P6.devices[d])});var ready=!c.error&&!c.running&&c.viewed>=c.required,confirm=el('p6Confirm');el('p6Publish').disabled=!confirm.checked;el('p6Hint').textContent=c.running?'Pemeriksaan berjalan…':c.error?c.error+' data wajib dilengkapi.':c.warning?c.warning+' peringatan perlu ditinjau.':'Semua pemeriksaan utama lolos.'}
  function p6Device(d){return}
  function p6Close(){el('p6Modal').classList.remove('on')}
  function p6Open(){var fp=p5Json(cfg),compact=p6IsMobileSimple(),modal=el('p6Modal');if(fp!==P6.fingerprint){P6.fingerprint=fp;P6.devices={desktop:false,tablet:false,mobile:false}}modal.classList.add('on');modal.classList.toggle('p6-mobile-simple',compact);el('p6Confirm').checked=false;p6Run()}
  function p6SafeCopy(t){function legacy(){var a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();try{document.execCommand('copy')}catch(e){}a.remove()}if(navigator.clipboard&&navigator.clipboard.writeText){try{var q=navigator.clipboard.writeText(t);if(q&&q.catch)q.catch(legacy);return}catch(e){}}legacy()}
  function p6Fix(tab,path){if(p6IsMobileSimple())return;p6Close();setEditorMode('advance',tab);setTimeout(function(){var n=path&&el('form').querySelector('[data-p="'+path+'"],[data-bool="'+path+'"]');if(n){var g=n.closest('.group')||n;g.scrollIntoView({behavior:'smooth',block:'center'});g.classList.add('p5-flash');setTimeout(function(){g.classList.remove('p5-flash')},1500)}},80)}
  function p6DoPublish(){if(!el('p6Confirm').checked)return;p6Close();edMsg('Menyiapkan pembayaran…','ok');if(!token){startPayLogin();return}ensureSiteThenCheckout()}
  function p6Wire(){el('p6Close').onclick=p6Close;el('p6Cancel').onclick=p6Close;el('p6Rerun').onclick=p6Run;el('p6Confirm').onchange=p6Render;el('p6Publish').onclick=p6DoPublish;el('p6Modal').onclick=function(e){if(e.target===el('p6Modal'))p6Close();var f=e.target.closest('[data-p6-fix]');if(f)p6Fix(f.getAttribute('data-p6-fix'),f.getAttribute('data-p6-path'))};document.addEventListener('keydown',function(e){if(e.key==='Escape'&&el('p6Modal').classList.contains('on'))p6Close()})}
  p6Wire();
  function togglePublish(){if(cur.status==='published'){if(!confirm('Jadikan undangan kembali sebagai draft?'))return;db('rpc/owner_set_site_draft',{method:'POST',body:JSON.stringify({p_site:cur.id})}).then(function(r){if(!r.ok)throw 0;cur.status='draft';updateStatusUI();edMsg('Undangan kembali menjadi draft.','ok')}).catch(function(){edMsg('Gagal mengubah status.','err')});return}p6Open()}

  el('loginBtn').onclick=function(){login(false)};
  el('signupBtn').onclick=function(){login(true)};
  el('logoutBtn').onclick=function(){ token=null;userId=null;userEmail=''; try{clearSession();}catch(e){} el('app').style.display='none'; el('auth').style.display='none'; try{updateNavLogin();}catch(e){} showLanding(); authMsg('',''); };
  /* ===== FASE 2–3: login gate lalu halaman pembayaran ===== */
  var PAYMENT_INTENT_KEY='undangan_payment_intent_v1';
  function rememberPaymentIntent(site,planId){try{localStorage.setItem(PAYMENT_INTENT_KEY,JSON.stringify({site_id:site||'',plan:planId||currentPlan(),at:Date.now()}))}catch(e){}}
  function readPaymentIntent(){try{return JSON.parse(localStorage.getItem(PAYMENT_INTENT_KEY)||'null')}catch(e){return null}}
  function checkout(siteOverride,planOverride){
    var site=siteOverride||(cur&&cur.id),pkg=planOverride||currentPlan();if(!token){rememberPaymentIntent(site,pkg);startPayLogin();return Promise.resolve(false)}if(!site){edMsg('Undangan harus disimpan sebelum pembayaran.','err');return Promise.resolve(false)}
    rememberPaymentIntent(site,pkg);var url='payment.html?site='+encodeURIComponent(site)+'&plan='+encodeURIComponent(pkg);window.__lastPaymentUrl=url;edMsg('Membuka halaman pembayaran…','ok');if(!window.__NO_NAV)location.href=url;return Promise.resolve({payment_page:url});
  }
  window.__checkout=checkout;

  el('backBtn').onclick=function(){ el('app').style.display='none'; showLanding(); }; var _nb=el('newBtn'); if(_nb) _nb.onclick=newSite; el('saveBtn').onclick=save; el('pubBtn').onclick=function(){ if(!token) return showAuth(); togglePublish(); }; el('buyBtn').onclick=function(){ if(!token){ startPayLogin(); return; } ensureSiteThenCheckout(); };
  var _sh=el('shareBtn'); if(_sh) _sh.onclick=function(){ var link=publicLink(); if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(link).then(function(){ edMsg('Link undangan disalin ✓  '+link,'ok'); },function(){ try{ prompt('Salin link undangan:',link); }catch(e){} }); } else { try{ prompt('Salin link undangan:',link); }catch(e){} } };

  var STARTER={
    meta:{title:"Undangan Pernikahan",favicon:"",icon:"💍"}, music:{src:""},
    coverOpenStyle:"", revealStyle:"", revealSpeed:"normal", countdownStyle:"", cursorPetals:false,
    languageMode:"id", showHijri:false, showWeton:false,
    i18n:{en:{coverEyebrow:"The Wedding Of",coverGreeting:"Dear Mr./Mrs./Family & Friends",openButton:"Open Invitation",quoteText:"",quoteSource:"",event0Title:"Wedding Ceremony",event1Title:"Reception",story0Title:"",story0Text:"",story1Title:"",story1Text:"",story2Title:"",story2Text:"",story3Title:"",story3Text:"",thanksMessage:"",thanksClosing:""}},
    theme:{sage:"#8A9A82",sageDark:"#5F6E58",gold:"#C9A24B",blush:"#E7C6C2",ivory:"#FBF8F3",cream:"#F4ECE0",ink:"#40372F",serif:"'Cormorant Garamond','Playfair Display',Georgia,serif",sans:"'Poppins','Segoe UI',system-ui,sans-serif"},
    style:"elegant-floral", paletteId:"sage-gold",
    sections:{quote:true,countdown:true,story:true,events:true,gallery:true,gift:true,info:true,wishes:true},
    appearanceEnabled:{palette:false,fonts:false,colors:false,texture:false,ornaments:false,effects:false,culture:false,galleryLayout:false,visual:false},
    cover:{eyebrow:"The Wedding Of",kepada:"Kepada Yth. Bapak/Ibu/Saudara/i",guestDefault:"Tamu Undangan",openButton:"Buka Undangan"},
    hero:{bismillah:"Bismillahirrahmanirrahim"},
    couple:{brideShort:"Mempelai",groomShort:"Pasangan",
      bride:{full:"Nama Lengkap Mempelai Wanita",initial:"A",role:"The Bride",status:"Putri dari",father:"Bapak (nama ayah)",mother:"Ibu (nama ibu)",social:"❀ @username"},
      groom:{full:"Nama Lengkap Mempelai Pria",initial:"B",role:"The Groom",status:"Putra dari",father:"Bapak (nama ayah)",mother:"Ibu (nama ibu)",social:"❀ @username"}},
    quote:{faith:"islam",text:"Tulis ayat atau kutipan favorit kalian di sini.",source:"— Sumber"},
    parentsBlessing:{enabled:false,title:"Doa & Restu Orang Tua",brideText:"Semoga kalian membangun rumah tangga yang penuh kasih, kesabaran, dan keberkahan.",brideNames:"Orang tua mempelai wanita",groomText:"Berjalanlah bersama, saling menjaga, dan jadikan cinta sebagai tempat pulang.",groomNames:"Orang tua mempelai pria"},
    signature:{enabled:false,bride:"Mempelai",groom:"Pasangan"},
    event:{dateISO:"2026-12-12T08:00:00+07:00",dateText:"SABTU, 12 DESEMBER 2026",calendar:{title:"Pernikahan Kami",start:"20261212T010000Z",end:"20261212T070000Z",details:"Kami mengundang Anda.",location:"Lokasi acara"}},
    events:[{badge:"💍",title:"Akad Nikah",dateISO:"2026-12-12T08:00:00+07:00",dateBig:"Sabtu, 12 Desember 2026",time:"08.00 WIB",location:"Lokasi akad",mapUrl:"https://maps.google.com",mapButtonEnabled:true,embedEnabled:false,routeEnabled:true},{badge:"🥂",title:"Resepsi",dateISO:"2026-12-12T11:00:00+07:00",dateBig:"Sabtu, 12 Desember 2026",time:"11.00 WIB",location:"Lokasi resepsi",mapUrl:"https://maps.google.com",mapButtonEnabled:true,embedEnabled:false,routeEnabled:true}],
    locationInfo:{enabled:false,landmarkEnabled:true,landmark:"Dekat pintu utama / patokan lokasi",parkingEnabled:true,parking:"Area parkir tersedia di lokasi acara",transportEnabled:true,transport:"Tuliskan akses bus, KRL, MRT, atau angkutan umum"},
    qris:{enabled:false,image:"",label:"Scan QRIS",holder:"a.n. Mempelai"},
    rsvp:{deadline:"",askEvent:true,askNote:true,maxGuests:4,eventChoices:["Akad","Resepsi","Keduanya"],buttonText:"Kirim Konfirmasi"},
    dressCode:{enabled:false,color1:"#8A9A82",color2:"#E7C6C2",color3:"#F4ECE0",color4:"#C9A24B"},
    story:[{year:"2019",title:"Pertama Bertemu",text:"Ceritakan awal pertemuan kalian.",photo:""},{year:"2021",title:"Menjalin Hubungan",text:"...",photo:""},{year:"2025",title:"Lamaran",text:"...",photo:""},{year:"2026",title:"Menuju Pelaminan",text:"...",photo:""}],
    gallery:[],
    mediaLibrary:[],
    coverPhoto:{enabled:false,image:"",target:"cover",mode:"full",position:"center",focalX:50,focalY:50,zoom:100,overlayTone:"dark",overlay:35,blur:0,height:100},
    banks:[{bank:"Bank ...",number:"0000 0000 00",holder:"a.n. ..."},{bank:"Bank ...",number:"0000 0000 00",holder:"a.n. ..."}],
    info:[{icon:"👗",title:"Dress Code",text:"..."},{icon:"🅿️",title:"Parkir",text:"..."},{icon:"🎁",title:"Angpao",text:"..."}],
    thanks:{eyebrow:"Terima Kasih",message:"Merupakan kebahagiaan bagi kami apabila Anda berkenan hadir.",closing:"Wassalamu’alaikum Wr. Wb.",credit:"Made with ❀"},
    share:{waText:"Kami mengundang Anda. Info & konfirmasi kehadiran: "},
    integrations:{sheetEndpoint:"",storageKey:"wishes"}
  };
  var DRAFT_KEY='undangan_draft_v1';
  function autoSlug(c){ var b=(c&&c.couple&&c.couple.brideShort)||'', g=(c&&c.couple&&c.couple.groomShort)||'';
    var s=(b+' '+g).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    return s||'undangan-kami'; }
  function saveDraftLocal(){ try{ localStorage.setItem(DRAFT_KEY, JSON.stringify(cfg)); }catch(e){} }
  function updateHeaderUI(){ var lo=el('logoutBtn'), bb=el('backBtn'), wa=el('whoami');
    if(bb){ bb.style.display=''; bb.textContent='← Beranda'; }
    if(token){ if(wa) wa.textContent=userEmail||''; if(lo){lo.style.display='';lo.title='Keluar dari akun';lo.setAttribute('aria-label','Keluar dari akun');} }
    else { if(wa) wa.textContent='Belum masuk'; if(lo) lo.style.display='none'; } }
  function startLocalEditor(keepLogin){ var draft=null; try{ draft=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null'); }catch(e){}
    var c=draft||clone(STARTER); var site={ id:null, local:true, status:'draft', package:'basic', slug:autoSlug(c), config:c };
    sites=[]; enterEditor(site); }
  function showLanding(){ var l=el('landing'); if(l) l.style.display='block'; var a=el('auth'); if(a) a.style.display='none'; try{window.scrollTo(0,0);}catch(e){} }
  function showAuth(){ var l=el('landing'); if(l) l.style.display='none'; var a=el('auth'); if(a) a.style.display='flex'; var em=el('email'); if(em) try{em.focus();}catch(e){} }
  (function wireLanding(){
    ['startBtn','ctaBtn'].forEach(function(id){ var b=el(id); if(b) b.onclick=function(e){ if(e&&e.preventDefault)e.preventDefault(); startLocalEditor(false); }; });
    var _nlb=el('navLoginBtn'); if(_nlb) _nlb.onclick=function(e){ if(e&&e.preventDefault)e.preventDefault(); showAuth(); };
    var _npb=el('navPriceBtn'); if(_npb) _npb.onclick=function(){var h=['basic','premium','exclusive'].map(function(k){var p=PLANS[k];return '<article class="ux-plan '+(k==='premium'?'featured':'')+'"><span>'+p.label+'</span><b>Rp'+p.price.toLocaleString('id-ID')+'</b><small>/ '+p.months+' bulan</small><ul>'+p.features.slice(0,5).map(function(f){return '<li>✓ '+f+'</li>'}).join('')+'</ul></article>'}).join('');el('navPriceContent').innerHTML=h;openUxModal('navPriceModal')};
    var _ncb=el('navContactBtn'); if(_ncb) _ncb.onclick=function(){openUxModal('navContactModal')};
    var _nps=el('navPriceStart'); if(_nps) _nps.onclick=function(){closeUxModal('navPriceModal');startLocalEditor(false)};
    Array.prototype.forEach.call(document.querySelectorAll('[data-close-modal]'),function(b){b.onclick=function(){closeUxModal(b.getAttribute('data-close-modal'))}});
    Array.prototype.forEach.call(document.querySelectorAll('.ux-modal'),function(m){m.addEventListener('click',function(e){if(e.target===m)closeUxModal(m.id)})});

    var back=el('backToLanding'); if(back) back.onclick=function(e){ if(e&&e.preventDefault)e.preventDefault(); showLanding(); };
    try{ var io=new IntersectionObserver(function(es){ es.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } }); },{threshold:.12});
      Array.prototype.forEach.call(document.querySelectorAll('.reveal'),function(x){ io.observe(x); }); }
    catch(e){ Array.prototype.forEach.call(document.querySelectorAll('.reveal'),function(x){ x.classList.add('in'); }); }
    window.addEventListener('scroll',function(){clearTimeout(resumeScrollTimer);resumeScrollTimer=setTimeout(persistEditorResume,180)},{passive:true});
    window.addEventListener('pagehide',persistEditorResume);window.addEventListener('beforeunload',persistEditorResume);
    document.addEventListener('click',function(e){var dock=e.target.closest&&e.target.closest('.foot-bar');if(!(isMobileEditor()&&editorMode==='simple'))return;if(dock){if(!dock.classList.contains('fab-dock-open')){e.preventDefault();e.stopImmediatePropagation();dock.classList.add('fab-dock-open');return}setTimeout(function(){dock.classList.remove('fab-dock-open')},180);return}var open=document.querySelector('.foot-bar.fab-dock-open');if(open)open.classList.remove('fab-dock-open')},true);
    showLanding();
  })();
  function stabilizeMobilePreview(pf){if(!isMobileEditor()||!pf)return;try{var d=pf.contentDocument;if(!d||!d.documentElement)return;d.documentElement.classList.add('panel-mobile-preview');var st=d.getElementById('panel-mobile-preview-stable');if(!st){st=d.createElement('style');st.id='panel-mobile-preview-stable';st.textContent='html.panel-mobile-preview{scroll-behavior:auto!important;overscroll-behavior-y:contain}html.panel-mobile-preview .reveal{opacity:1!important;transform:none!important;transition:none!important}html.panel-mobile-preview img.p11-pending{animation:none!important}';d.head.appendChild(st)}Array.prototype.forEach.call(d.querySelectorAll('.reveal'),function(x){x.classList.add('in')});Array.prototype.forEach.call(d.images,function(img){if(img.loading==='lazy')img.loading='eager';try{img.fetchPriority='auto'}catch(e){}if(img.decode&&!img.complete)img.decode().catch(function(){})})}catch(e){}}
  function pushModalPreview(pf,paid){try{var _pc=clone(cfg);_pc.noWatermark=paid;if(_pc.effects&&!plan().fallingFx)_pc.effects=Object.assign({},_pc.effects,{falling:''});var _send=function(){try{pf.contentWindow.postMessage({type:'WEDDING_PREVIEW',config:_pc},'*');stabilizeMobilePreview(pf)}catch(e){}};_send();setTimeout(_send,120);setTimeout(_send,500);setTimeout(_send,1400)}catch(e){}}
  function openPreviewModal(){ if(!cur||!cfg) return; var m=el('previewModal'); if(!m) return; var pf=el('pvFrame');
    var paid=!!(cur&&cur.status==='published'); var mk=document.querySelector('.pv-mark'); if(mk) mk.style.display=paid?'none':'';
    var url=templateFile(cfg.style)+'?site='+encodeURIComponent(cur.slug)+'&preview=1';pf.setAttribute('loading','eager');pf.setAttribute('fetchpriority','high');pf.onload=function(){pushModalPreview(pf,paid)};
    var ready=pf.getAttribute('data-preview-url')===url&&pf.contentDocument&&pf.contentDocument.readyState!=='loading';if(ready)pushModalPreview(pf,paid);else{pf.setAttribute('data-preview-url',url);pf.src=url}
    var pay=el('pvPay'); if(pay){var pl=plan();pay.textContent=pl.label;pay.setAttribute('data-package',currentPlan());}
    m.classList.add('on');document.body.classList.add('preview-modal-open'); }
  function closePreviewModal(){ var m=el('previewModal'); if(m) m.classList.remove('on'); document.body.classList.remove('preview-modal-open'); }
  (function wirePreview(){ var pvb=el('previewBtn'); if(pvb) pvb.onclick=openPreviewModal;
    var pvc=el('pvClose'); if(pvc) pvc.onclick=closePreviewModal;
    var pve=el('pvEdit'); if(pve) pve.onclick=closePreviewModal; var pvcx=el('pvChecklist'); if(pvcx) pvcx.onclick=function(){closePreviewModal();p6Open();};
    var pvm=el('previewModal'); if(pvm){ pvm.addEventListener('click',function(e){ if(e.target===pvm) closePreviewModal(); }); pvm.addEventListener('contextmenu',function(e){ e.preventDefault(); }); }
    document.addEventListener('keydown',function(e){ if(e.key==='Escape') closePreviewModal(); }); })();
  /* ===== #4: Google OAuth, sesi, tempel draft ke akun, checkout ===== */
  var PENDING_KEY='undangan_pending_v1', SESS_KEY='undangan_sess_v1', _sessExp=0;
  function persistSession(){ try{ localStorage.setItem(SESS_KEY, JSON.stringify({token:token,userId:userId,userEmail:userEmail,exp:_sessExp})); }catch(e){} }
  function clearSession(){ try{ localStorage.removeItem(SESS_KEY); }catch(e){} }
  function restoreSession(){ try{ var s=JSON.parse(localStorage.getItem(SESS_KEY)||'null'); if(!s||!s.token) return false; if(s.exp&&Date.now()>s.exp){ clearSession(); return false; } token=s.token; userId=s.userId||null; userEmail=s.userEmail||''; _sessExp=s.exp||0; return true; }catch(e){ return false; } }
  function parseHashToken(){ var h=(location.hash||'').replace(/^#/,''); if(h.indexOf('access_token=')<0) return null; var pp={}; h.split('&').forEach(function(kv){ var i=kv.indexOf('='); if(i<0) return; pp[decodeURIComponent(kv.slice(0,i))]=decodeURIComponent(kv.slice(i+1)); }); return pp; }
  function updateNavLogin(){ var b=el('navLoginBtn'); if(!b) return; if(token&&userEmail){ b.textContent='Undanganku'; b.onclick=function(e){ if(e&&e.preventDefault)e.preventDefault(); onLoggedIn(); }; } else { b.textContent='Masuk'; b.onclick=function(e){ if(e&&e.preventDefault)e.preventDefault(); showAuth(); }; } }
  function fetchUser(cb){ if(!token){ return cb(false); }
    authFetch('/auth/v1/user',{headers:{Authorization:'Bearer '+token}})
     .then(function(r){ if(!r.ok){ cb(false); return null; } return r.json(); })
     .then(function(j){ if(!j) return; userId=j.id; userEmail=j.email||userEmail; persistSession(); updateNavLogin(); cb(true); })
     .catch(function(){ cb(false); }); }
  function startGoogleLogin(intent){ if(!API){ authMsg('Login Google belum aktif — isi URL & anon key Supabase di db-config.js lalu aktifkan provider Google di Supabase.','err'); return; }
    if(intent){ try{ localStorage.setItem(PENDING_KEY,intent); }catch(e){} }
    if(cfg&&cfg.couple){ saveDraftLocal(); }
    var redirect=location.origin+location.pathname;
    var url=API+'/auth/v1/authorize?provider=google&redirect_to='+encodeURIComponent(redirect);
    window.__authorizeUrl=url; if(window.__NO_NAV) return; location.href=url; }
  function startPayLogin(){ try{ localStorage.setItem(PENDING_KEY,'checkout'); }catch(e){} rememberPaymentIntent(cur&&cur.id,currentPlan()); if(cfg&&cfg.couple){ saveDraftLocal(); }
    var em=el('email'); if(em&&userEmail) em.value=userEmail; authMsg('Login diperlukan sebelum masuk ke halaman pembayaran — undanganmu tersimpan otomatis. ✨','ok'); showAuth(); }
  function afterLogin(){ fetchUser(function(ok){ if(!ok){try{localStorage.removeItem(SESS_KEY);localStorage.setItem(PENDING_KEY,'cloud-save')}catch(e){}token=null;userId=null;userEmail='';_sessExp=0;updateNavLogin();authMsg('Login belum berhasil diproses. Tekan tombol Google sekali lagi.','err');showAuth(); return; }
      var pend=null; try{ pend=localStorage.getItem(PENDING_KEY); }catch(e){}
      if(pend==='checkout'){ try{ localStorage.removeItem(PENDING_KEY); }catch(e){} return ensureSiteThenCheckout(); }
      if(pend==='cloud-save'){ try{ localStorage.removeItem(PENDING_KEY); }catch(e){} return ensureCloudSiteAndSave(); }
      try{ localStorage.removeItem(PENDING_KEY); }catch(e){} onLoggedIn(); }); }
  function createSiteFromDraft(conf, slug, tries, cb){
    db('sites',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({slug:slug,owner_id:userId,status:'draft',package:currentPlan(),config:conf})})
     .then(function(r){ return r.text().then(function(t){ return {ok:r.ok,status:r.status,t:t}; }); })
     .then(function(res){ if(res.ok){ var row=null; try{ row=JSON.parse(res.t)[0]; }catch(e){} return cb(row); }
       if((res.status===409||/duplicate|unique/i.test(res.t))&&tries<5){ return createSiteFromDraft(conf, slug+'-'+Math.floor(1000+Math.random()*9000), tries+1, cb); }
       if(isCloudAuthError(res.t)){cloudAuthExpired();cb(null);return}edMsg('Penyimpanan akun gagal. Silakan coba lagi.','err'); cb(null); })
     .catch(function(e){ edMsg('Kesalahan jaringan: '+e,'err'); cb(null); }); }
  var CLOUD_REAUTH_BUSY=false;
  function isCloudAuthError(e){var t=String(e||'');return /PGRST303|JWT|token.*expired|invalid.*token|401|403/i.test(t)}
  function cloudAuthExpired(){if(CLOUD_REAUTH_BUSY)return;CLOUD_REAUTH_BUSY=true;saveDraftLocal();try{localStorage.removeItem(SESS_KEY);localStorage.setItem(PENDING_KEY,'cloud-save')}catch(e){}token=null;userId=null;userEmail='';_sessExp=0;updateNavLogin();showCloudToast('Sesi Google berakhir. Silakan masuk kembali.','info');authMsg('Sesi Google berakhir. Tekan tombol Google sekali untuk melanjutkan.','ok');showAuth();setTimeout(function(){CLOUD_REAUTH_BUSY=false},1000)}
  function ensureCloudSiteAndSave(){var a=el('auth');if(a)a.style.display='none';if(token&&_sessExp&&Date.now()>_sessExp-60000){cloudAuthExpired();return Promise.resolve(false)}var done=function(ok){if(ok){showCloudToast('File tersimpan di cloud','ok');p5SetSaveState('saved','Tersimpan di cloud · '+p5Time(Date.now()))}return ok};if(token&&cur&&cur.id)return p5Persist('manual').then(done);var conf=(cfg&&cfg.couple)?clone(cfg):null;if(!conf){try{conf=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null')}catch(e){}}if(!conf)conf=clone(STARTER);showCloudToast('Menyiapkan penyimpanan cloud…','info');return new Promise(function(resolve){createSiteFromDraft(conf,autoSlug(conf),0,function(row){if(!row){showCloudToast('Gagal menyimpan ke cloud','error');resolve(false);return}try{localStorage.removeItem(DRAFT_KEY)}catch(e){}sites=[row];cur=row;cfg=clone(row.config||conf);enterEditor(row);done(true);resolve(true)})})}
  function ensureSiteThenCheckout(){ var a=el('auth'); if(a) a.style.display='none';var intent=readPaymentIntent(),desired=(intent&&intent.plan)||currentPlan();
    if(cur&&cur.id)return checkout(cur.id,desired);
    if(intent&&intent.site_id){return db('sites?id=eq.'+encodeURIComponent(intent.site_id)+'&owner_id=eq.'+encodeURIComponent(userId)+'&select=id,slug,status,config,package,updated_at&limit=1').then(function(r){return r.json()}).then(function(rows){var row=rows&&rows[0];if(!row)throw new Error('Undangan tidak ditemukan');cur=row;cfg=clone(row.config||STARTER);selPkg=desired;return checkout(row.id,desired)}).catch(function(){edMsg('Undangan pembayaran tidak ditemukan. Silakan pilih kembali.','err');onLoggedIn()})}
    var conf=(cfg&&cfg.couple)?clone(cfg):null;if(!conf){try{conf=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null')}catch(e){}}if(!conf)conf=clone(STARTER);edMsg('Menyimpan undangan ke akunmu…','ok');
    createSiteFromDraft(conf,autoSlug(conf),0,function(row){if(!row){onLoggedIn();return}try{localStorage.removeItem(DRAFT_KEY)}catch(e){}sites=[row];cur=row;cfg=clone(row.config||conf);enterEditor(row);selPkg=desired;updateBuy();checkout(row.id,desired)}); }
  function bootAuth(){ var hp=parseHashToken(); if(hp&&hp.access_token){ token=hp.access_token; _sessExp=hp.expires_at?(parseInt(hp.expires_at,10)*1000):(Date.now()+(parseInt(hp.expires_in||'3600',10)*1000));persistSession(); try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){ try{ location.hash=''; }catch(_){} } afterLogin(); return true; }
    if(restoreSession()){ updateNavLogin();var pending=null;try{pending=localStorage.getItem(PENDING_KEY)}catch(e){}if(pending==='checkout'){afterLogin();return true} } return false; }
  var _gb=el('googleBtn'); if(_gb) _gb.onclick=function(){ startGoogleLogin(localStorage.getItem(PENDING_KEY)||'edit'); };
  var _authBoot=bootAuth();var _pendingAuth=null;try{_pendingAuth=localStorage.getItem(PENDING_KEY)}catch(e){}if(!_authBoot&&hasEditorResume()&&!_pendingAuth){if(token)onLoggedIn();else resumeLocalEditorFromHistory()}else if(!_authBoot&&_pendingAuth&&!token){authMsg('Selesaikan login Google untuk melanjutkan penyimpanan.','ok');showAuth()}
  window.__PANEL_READY=true;
})();
