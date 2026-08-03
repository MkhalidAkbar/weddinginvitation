(function(){
  var form=document.getElementById('form'),timer=null,hideTimer=null,current=null,sheetTarget=null,lastX=0,lastY=0,dragging=false;
  if(!form)return;
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  var pop=document.createElement('div');pop.id='pvxPop';pop.className='pvx-pop';pop.setAttribute('role','tooltip');document.body.appendChild(pop);
  var sheet=document.createElement('div');sheet.id='pvxSheet';sheet.className='pvx-sheet';sheet.innerHTML='<div class="pvx-sheet-card" role="dialog" aria-modal="true"><div class="pvx-sheet-head"><div><h4></h4><div class="pvx-sub"></div></div><button class="pvx-close" aria-label="Tutup">×</button></div><div class="pvx-stage"></div><button class="pvx-use">Gunakan pilihan ini</button></div>';document.body.appendChild(sheet);
  var mobile=function(){return matchMedia('(pointer:coarse),(max-width:860px)').matches;};
  function controlOf(t){if(!t)return null;if(t.__pvxControl)return t.__pvxControl;return t.matches&&t.matches('[data-t1],[data-glayout],[data-fx],[data-t3check],[data-bool],[data-sec],[data-p]')?t:t.querySelector&&t.querySelector('[data-t1],[data-glayout],[data-fx],[data-t3check],[data-bool],[data-sec],[data-p]');}
  function meta(target){var c=controlOf(target);if(!c)return null;var path='',val='',label=(target.textContent||'').replace('👁','').trim();
    if(c.hasAttribute('data-t1')){path=c.getAttribute('data-t1');val=c.getAttribute('data-t1v')||'';}
    else if(c.hasAttribute('data-glayout')){path='galleryLayout';val=c.getAttribute('data-glayout')||'';}
    else if(c.hasAttribute('data-fx')){path='effects.falling';val=c.getAttribute('data-fx')||'';}
    else if(c.hasAttribute('data-t3check')){path=c.getAttribute('data-t3check');val=c.checked?'on':'off';}
    else if(c.hasAttribute('data-bool')){path=c.getAttribute('data-bool');val=c.checked?'on':'off';}
    else if(c.hasAttribute('data-sec')){path='sections.'+c.getAttribute('data-sec');val=c.checked?'on':'off';}
    else if(c.hasAttribute('data-p')){path=c.getAttribute('data-p');val=c.value||'';if(c.tagName==='SELECT')label=(c.options[c.selectedIndex]||{}).text||label;}
    return {target:target,control:c,path:path,val:val,label:label||path}; }
  function boxes(n){var h='';for(var i=0;i<n;i++)h+='<i></i>';return h;}
  function demo(m){var p=m.path,v=m.val,l=m.label,title=l,sub='Pratinjau visual · belum diterapkan',html='';
    var count='<i>12<small>HARI</small></i><i>08<small>JAM</small></i><i>45<small>MENIT</small></i><i>20<small>DETIK</small></i>';
    if(p==='coverKind'){title='Sampul '+l;html='<div class="pvx-wedding-card '+esc(v||'minimal')+'"><small>THE WEDDING OF</small><b>Naya & Raka</b><em>12 · 12 · 2026</em></div>';}
    else if(p==='coverOpenStyle'){title=l;if(v==='envelope')html='<div class="pvx-envelope-scene"><div class="pvx-envelope-paper"><small>THE WEDDING OF</small><b>N & R</b></div><div class="pvx-envelope-base"></div><div class="pvx-envelope-seal">N</div></div>';else html='<div class="pvx-open-btn">Buka Undangan</div>';}
    else if(p==='revealStyle'){title='Animasi '+l;html='<div class="pvx-reveal-card '+esc(v||'slide')+'"><b>Hari Bahagia</b><small>Sabtu, 12 Desember 2026</small></div>';}
    else if(p==='revealSpeed'){title='Kecepatan '+l;var dur=v==='slow'?'2.4s':v==='fast'?'.75s':'1.5s';html='<div class="pvx-reveal-card slide" style="animation-duration:'+dur+'"><b>Gerakan '+esc(l)+'</b><small>Transisi antar section</small></div>';}
    else if(p==='countdownStyle'){title='Hitung mundur '+l;html='<div class="pvx-count '+esc(v)+'">'+count+'</div>';}
    else if(p==='cursorPetals'||p==='effects.falling'){title=l||'Efek jatuh';var col=v==='snow'?'#f5f7fb':v==='leaves'?'#b8824d':v==='hearts'?'#c87584':'#d49aa4';html='<div class="pvx-petals" style="--petal:'+col+'"><i></i><i></i><i></i></div><div class="pvx-sample"><b>Efek Lembut</b><p>Bergerak tanpa menutupi konten</p></div>';}
    else if(p==='grain'){title='Tekstur '+l;html='<div class="pvx-paper '+esc(v)+'"></div><div class="pvx-sample"><b>Tekstur Kertas</b><p>Detail permukaan latar undangan</p></div>';}
    else if(p==='floraDensity'){title='Kepadatan bunga · '+l;var countFlora=v==='off'?0:v==='low'?1:v==='high'?4:3;html='<div class="pvx-flora '+esc(v)+'">'+(countFlora?'<i></i><i></i><i></i><i></i>':'')+'</div><div class="pvx-sample"><b>Naya & Raka</b><p>12 Desember 2026</p></div>';}
    else if(p==='textScale'){title='Skala teks · '+l;var sz={xs:19,sm:23,md:28,lg:33,xl:38}[v]||28;html='<div class="pvx-sample"><b style="font-size:'+sz+'px">Hari Bahagia</b><p style="font-size:'+Math.max(10,sz*.4)+'px">Teks undangan menyesuaikan</p></div>';}
    else if(/^theme\.(serif|script|sans)$/.test(p)){title=l;html='<div class="pvx-section-demo" style="font-family:'+esc(v)+'"><small>THE WEDDING OF</small><b>Naya & Raka</b><span></span><p>Merupakan kebahagiaan bagi kami</p></div>';}
    else if(/^theme\./.test(p)){title='Palet '+l;html='<div class="pvx-palette"><i style="background:'+esc(v)+'"></i><i style="background:color-mix(in srgb,'+esc(v)+' 62%,white)"></i><i style="background:color-mix(in srgb,'+esc(v)+' 58%,#b58d40)"></i></div>';}
    else if(p==='galleryLayout'){title='Galeri '+l;html='<div class="pvx-gallery '+esc(v||'grid')+'">'+boxes(v==='polaroid'?2:6)+'</div>';}
    else if(p==='showHijri'){title='Tanggal Hijriah';html='<div class="pvx-mini-cards"><i>☾<br><b>3 Rajab<br>1448 H</b></i></div>';}
    else if(p==='showWeton'){title='Weton Jawa';html='<div class="pvx-mini-cards"><i>◇<br><b>Sabtu<br>Pon</b></i></div>';}
    else if(/embedEnabled$/.test(p)){title='Peta tertanam';html='<div class="pvx-map"><span class="pvx-route">Lihat lokasi acara</span></div>';}
    else if(/routeEnabled$/.test(p)){title='Rute dari lokasi tamu';html='<div class="pvx-map"><span class="pvx-route">⌁ Rute dari lokasi saya</span></div>';}
    else if(p==='locationInfo.enabled'){title='Informasi akses lokasi';html='<div class="pvx-mini-cards"><i>⌖<br><b>Patokan</b></i><i>▣<br><b>Parkir</b></i><i>↝<br><b>Transit</b></i></div>';}
    else if(p==='qris.enabled'){title='QRIS hadiah';html='<div class="pvx-qris"></div>';}
    else if(p==='dressCode.enabled'){title='Palet dress code';html='<div class="pvx-dots"><i style="background:#7f9279"></i><i style="background:#d8aaa9"></i><i style="background:#f2e8d8"></i><i style="background:#b88d3d"></i></div>';}
    else if(p==='parentsBlessing.enabled'){title='Kartu restu orang tua';html='<div class="pvx-mini-cards"><i>“Doa terbaik untuk kalian”<br><b>Keluarga Naya</b></i><i>“Selalu saling menjaga”<br><b>Keluarga Raka</b></i></div>';}
    else if(p==='signature.enabled'){title='Tanda tangan digital';html='<div><div class="pvx-sign">Naya</div><br><div class="pvx-sign">Raka</div></div>';}
    else if(p.indexOf('sections.')===0){title=(v==='off'?'Sembunyikan ':'Tampilkan ')+l;html='<div class="pvx-section-demo"><small>SECTION UNDANGAN</small><b>'+esc(l.replace(/wajib|—.*/gi,''))+'</b><span></span><p>Contoh komposisi isi section</p></div>';}
    else {title=l;html='<div class="pvx-section-demo"><small>PRATINJAU</small><b>'+esc(l)+'</b><span></span><p>Contoh tampilan saat pilihan aktif</p></div>';}
    return {title:title,sub:sub,html:html}; }
  function content(m){var x=demo(m);return '<h4>'+esc(x.title)+'</h4><div class="pvx-sub">'+esc(x.sub)+'</div><div class="pvx-stage">'+x.html+'</div>';}
  function place(){var w=pop.offsetWidth||292,h=pop.offsetHeight||215,x=lastX+17,y=lastY+17;if(x+w>innerWidth-10)x=lastX-w-17;if(y+h>innerHeight-10)y=lastY-h-17;pop.style.left=Math.max(10,x)+'px';pop.style.top=Math.max(10,y)+'px';}
  function showPop(t){if(mobile()||dragging)return;var m=meta(t);if(!m)return;current=t;pop.innerHTML=content(m);pop.classList.add('on');requestAnimationFrame(place);}
  function hidePop(){clearTimeout(timer);clearTimeout(hideTimer);pop.classList.remove('on');current=null;}
  function openSheet(t){var m=meta(t);if(!m)return;sheetTarget=t;var x=demo(m);sheet.querySelector('h4').textContent=x.title;sheet.querySelector('.pvx-sub').textContent=x.sub;sheet.querySelector('.pvx-stage').innerHTML=x.html;sheet.querySelector('.pvx-use').hidden=/^theme\.|^meta\./.test(m.path)&&m.control.tagName!=='SELECT';sheet.classList.add('on');document.body.style.overflow='hidden';}
  function closeSheet(){sheet.classList.remove('on');document.body.style.overflow='';sheetTarget=null;}
  function decorate(){var list=form.querySelectorAll('[data-t1],[data-glayout],[data-fx],[data-t3check],[data-bool],[data-sec],select[data-p^="theme."],input[type="color"][data-p]');Array.prototype.forEach.call(list,function(c){var t=c;if(c.matches('input[type=checkbox]'))t=c.closest('.sw-row')||c.parentNode;else if(c.tagName==='SELECT'||c.matches('input[type=color]'))t=c.closest('.fld')||c.parentNode;if(!t||t.classList.contains('pvx-target'))return;t.classList.add('pvx-target');t.__pvxControl=c;c.__pvxTarget=t;var kind=c.matches('input[type=checkbox]')?'toggle':(c.tagName==='SELECT'||c.matches('input[type=color]'))?'field':'chip';t.setAttribute('data-pvx-kind',kind);if(kind==='chip'&&!t.hasAttribute('tabindex'))t.tabIndex=0;var eye=document.createElement('button');eye.type='button';eye.className='pvx-eye';eye.textContent='👁';eye.setAttribute('aria-label','Lihat contoh '+(t.textContent||''));eye.__pvxTarget=t;t.appendChild(eye);});}
  form.addEventListener('pointermove',function(e){lastX=e.clientX;lastY=e.clientY;if(pop.classList.contains('on'))place();});
  form.addEventListener('pointerover',function(e){if(mobile()||dragging)return;var t=e.target.closest&&e.target.closest('.pvx-target');if(!t||t.contains(e.relatedTarget))return;clearTimeout(hideTimer);clearTimeout(timer);timer=setTimeout(function(){showPop(t);},650);});
  form.addEventListener('pointerout',function(e){var t=e.target.closest&&e.target.closest('.pvx-target');if(!t||t.contains(e.relatedTarget))return;clearTimeout(timer);hideTimer=setTimeout(hidePop,120);});
  form.addEventListener('focusin',function(e){var t=e.target.closest&&e.target.closest('.pvx-target');if(!t||mobile())return;var r=t.getBoundingClientRect();lastX=r.right;lastY=r.top+r.height/2;clearTimeout(timer);timer=setTimeout(function(){showPop(t);},450);});
  form.addEventListener('focusout',function(){hideTimer=setTimeout(hidePop,120);});
  form.addEventListener('click',function(e){var eye=e.target.closest&&e.target.closest('.pvx-eye');if(!eye)return;e.preventDefault();e.stopPropagation();openSheet(eye.__pvxTarget||eye.closest('.pvx-target'));},true);
  form.addEventListener('dragstart',function(){dragging=true;hidePop();});form.addEventListener('dragend',function(){dragging=false;});
  sheet.querySelector('.pvx-close').onclick=closeSheet;sheet.addEventListener('click',function(e){if(e.target===sheet)closeSheet();});
  sheet.querySelector('.pvx-use').onclick=function(){if(!sheetTarget)return closeSheet();var t=sheetTarget,m=meta(t),c=m&&m.control;if(!c)return closeSheet();if(c.matches('input[type=checkbox]')){c.checked=!c.checked;c.dispatchEvent(new Event('change',{bubbles:true}));}else if(c.hasAttribute('data-t1')||c.hasAttribute('data-glayout')||c.hasAttribute('data-fx')){c.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));}else{c.focus();}closeSheet();};
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){hidePop();closeSheet();}});window.addEventListener('scroll',function(){if(!current)hidePop();},true);
  new MutationObserver(function(){decorate();}).observe(form,{childList:true,subtree:true});decorate();window.__panelMiniPreview={decorate:decorate,open:function(t){openSheet(t);},close:closeSheet};
})();
