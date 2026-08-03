/* Wedding Studio Analytics v1 — anonymous, theme-independent, preview-safe. */
(function(){
  'use strict';
  if(window.WEDDING_ANALYTICS)return;
  var API=window.WEDDING_ANALYTICS={version:'1.0.0'},queue=[],siteId='',ready=false,resolving=false;
  var DB=window.WEDDING_DB||{},base=String(DB.url||'').replace(/\/+$/,''),key=DB.anonKey||'';
  var qs=new URLSearchParams(location.search),preview=qs.get('preview')==='1'||qs.get('mode')==='preview';
  try{if(window.self!==window.top)preview=true;}catch(e){preview=true;}
  function visitor(){var k='wedding_visitor_v1',v='';try{v=localStorage.getItem(k)||'';if(!v){v='wv_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,12);localStorage.setItem(k,v);}}catch(e){v='wv_session_'+Math.random().toString(36).slice(2,12);}return v;}
  var visitorId=visitor();
  function source(){var u=qs.get('utm_source');if(u)return String(u).slice(0,80);try{if(document.referrer){var h=new URL(document.referrer).hostname;if(h&&h!==location.hostname)return h.slice(0,80);}}catch(e){}return'direct';}
  function slug(){var s=qs.get('site')||qs.get('slug')||'';if(s)return s;var p=location.pathname.split('/').filter(Boolean).pop()||'';return /\.html?$/i.test(p)?'':decodeURIComponent(p);}
  function headers(){return{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};}
  function resolve(){
    if(preview||!base||!key||resolving)return Promise.resolve('');resolving=true;
    if(window.WEDDING_SITE_ID){siteId=window.WEDDING_SITE_ID;ready=true;flush();return Promise.resolve(siteId);}
    var s=slug();if(!s)return Promise.resolve('');
    return fetch(base+'/rest/v1/sites?slug=eq.'+encodeURIComponent(s)+'&status=eq.published&select=id&limit=1',{headers:headers()}).then(function(r){return r.ok?r.json():[]}).then(function(rows){siteId=rows&&rows[0]&&rows[0].id||'';ready=!!siteId;if(ready)flush();return siteId;}).catch(function(){return'';});
  }
  function send(type,meta){
    if(preview||!siteId||!base||!key)return Promise.resolve(false);
    var body={p_site:siteId,p_visitor:visitorId,p_event:type,p_source:source(),p_path:(location.pathname+location.search).slice(0,500),p_meta:meta||{}};
    return fetch(base+'/rest/v1/rpc/track_analytics_event',{method:'POST',headers:headers(),body:JSON.stringify(body),keepalive:true}).then(function(r){return r.ok}).catch(function(){return false;});
  }
  function flush(){var q=queue.splice(0);q.forEach(function(x){send(x[0],x[1]);});}
  API.track=function(type,meta){if(preview)return Promise.resolve(false);if(ready)return send(type,meta);queue.push([type,meta||{}]);return resolve();};
  API.getVisitorId=function(){return visitorId;};API.isPreview=function(){return preview;};
  function closest(t,sel){return t&&t.closest?t.closest(sel):null;}
  document.addEventListener('click',function(e){
    var t=e.target;
    if(closest(t,'.map-btn,.t5-route,[data-analytics="location"],a[href*="google.com/maps"],a[href*="maps.google"]'))API.track('location_click');
    else if(closest(t,'.copy-btn,#t5-qris,[data-analytics="gift"],.gift-card button'))API.track('gift_click');
    else if(closest(t,'#musicBtn,.music-btn')){var b=closest(t,'#musicBtn,.music-btn');if(!b.classList.contains('playing'))API.track('music_play');}
  },true);
  document.addEventListener('wedding:rsvp-success',function(){API.track('rsvp');});
  function boot(){resolve().then(function(id){if(id)API.track('open',{title:document.title||''});});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
