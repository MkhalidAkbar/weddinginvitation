/* Wedding Studio Theme UI v1
   Theme-aware, accessible custom selects + form polish for current/future themes. */
(function(){
  'use strict';
  if(window.WEDDING_THEME_UI)return;
  var API=window.WEDDING_THEME_UI={version:'1.0.0'};
  var enhanced=new WeakMap(), uid=0, active=null;

  function css(){
    if(document.getElementById('wedding-theme-ui-css'))return;
    var s=document.createElement('style');s.id='wedding-theme-ui-css';s.textContent=`
:root{--ui-accent:var(--gold,var(--accent,var(--primary,#c9a24b)));--ui-accent-2:var(--sage,var(--secondary,var(--ui-accent)));--ui-bg:var(--ivory,var(--cream,#fff));--ui-card:var(--white,var(--card,#fff));--ui-text:var(--ink,var(--text,#342e29));--ui-muted:var(--ink-soft,var(--muted,#766d64));--ui-line:var(--gold-soft,var(--line,rgba(120,105,85,.22)));--ui-radius:14px;--ui-shadow:0 16px 42px rgba(38,31,24,.15)}
body.theme-ui-enhanced{--ui-field-bg:color-mix(in srgb,var(--ui-card) 92%,transparent);--ui-hover:color-mix(in srgb,var(--ui-accent) 10%,var(--ui-card));--ui-selected:color-mix(in srgb,var(--ui-accent) 16%,var(--ui-card));--ui-ring:color-mix(in srgb,var(--ui-accent) 28%,transparent)}
body.theme-ui-enhanced .ui-select-native{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important;opacity:0!important;pointer-events:none!important}
body.theme-ui-enhanced .ui-select{position:relative;width:100%;min-width:0;font:inherit;color:var(--ui-text);text-align:left;isolation:isolate}
body.theme-ui-enhanced .ui-select-trigger{box-sizing:border-box;appearance:none;-webkit-appearance:none;width:100%;min-height:46px;display:flex;align-items:center;gap:10px;padding:11px 44px 11px 14px;border:1px solid var(--ui-line);border-radius:var(--ui-radius);background:var(--ui-field-bg);color:var(--ui-text);font:inherit;font-size:inherit;line-height:1.35;text-align:left;cursor:pointer;box-shadow:0 5px 18px rgba(40,32,24,.055),inset 0 1px rgba(255,255,255,.45);transition:border-color .24s ease,box-shadow .24s ease,background .24s ease,transform .18s ease}
body.theme-ui-enhanced .ui-select-trigger:hover{border-color:color-mix(in srgb,var(--ui-accent) 62%,var(--ui-line));background:var(--ui-hover)}
body.theme-ui-enhanced .ui-select-trigger:focus-visible,body.theme-ui-enhanced .ui-select.is-open .ui-select-trigger{outline:none;border-color:var(--ui-accent);box-shadow:0 0 0 4px var(--ui-ring),0 10px 28px rgba(40,32,24,.1)}
body.theme-ui-enhanced .ui-select.is-open .ui-select-trigger{transform:translateY(-1px)}
body.theme-ui-enhanced .ui-select-value{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
body.theme-ui-enhanced .ui-select-value.is-placeholder{color:var(--ui-muted);opacity:.72}
body.theme-ui-enhanced .ui-select-arrow{position:absolute;right:15px;top:50%;width:10px;height:10px;border-right:1.8px solid var(--ui-accent);border-bottom:1.8px solid var(--ui-accent);transform:translateY(-68%) rotate(45deg);transition:transform .3s cubic-bezier(.2,.8,.2,1);pointer-events:none}
body.theme-ui-enhanced .ui-select.is-open .ui-select-arrow{transform:translateY(-28%) rotate(225deg)}
body.theme-ui-enhanced .ui-select-menu{box-sizing:border-box;position:absolute;z-index:10020;left:0;right:0;top:calc(100% + 8px);max-height:min(290px,48vh);overflow:auto;padding:7px;border:1px solid color-mix(in srgb,var(--ui-accent) 28%,var(--ui-line));border-radius:calc(var(--ui-radius) + 2px);background:color-mix(in srgb,var(--ui-card) 96%,transparent);color:var(--ui-text);box-shadow:var(--ui-shadow);backdrop-filter:blur(18px) saturate(1.12);-webkit-backdrop-filter:blur(18px) saturate(1.12);opacity:0;visibility:hidden;transform:translateY(-7px) scale(.985);transform-origin:top;transition:opacity .2s ease,transform .25s cubic-bezier(.2,.85,.25,1),visibility .2s;overscroll-behavior:contain}
body.theme-ui-enhanced .ui-select.open-up .ui-select-menu{top:auto;bottom:calc(100% + 8px);transform-origin:bottom;transform:translateY(7px) scale(.985)}
body.theme-ui-enhanced .ui-select.is-open .ui-select-menu{opacity:1;visibility:visible;transform:translateY(0) scale(1)}
body.theme-ui-enhanced .ui-select-option{box-sizing:border-box;position:relative;width:100%;min-height:42px;display:flex;align-items:center;gap:10px;padding:10px 38px 10px 12px;border:0;border-radius:10px;background:transparent;color:var(--ui-text);font:inherit;font-size:inherit;line-height:1.35;text-align:left;cursor:pointer;transition:background .17s ease,color .17s ease,transform .17s ease}
body.theme-ui-enhanced .ui-select-option:hover,body.theme-ui-enhanced .ui-select-option.is-active{background:var(--ui-hover);transform:translateX(2px)}
body.theme-ui-enhanced .ui-select-option.is-selected{background:var(--ui-selected);color:color-mix(in srgb,var(--ui-accent) 72%,var(--ui-text));font-weight:600}
body.theme-ui-enhanced .ui-select-option.is-selected:after{content:'✓';position:absolute;right:13px;top:50%;transform:translateY(-50%);color:var(--ui-accent);font-weight:800}
body.theme-ui-enhanced .ui-select-option:disabled{opacity:.4;cursor:not-allowed;transform:none}
body.theme-ui-enhanced .ui-select-group{padding:9px 11px 5px;color:var(--ui-muted);font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
body.theme-ui-enhanced .ui-select.is-disabled{opacity:.58;filter:saturate(.65)}
body.theme-ui-enhanced .ui-select.is-disabled .ui-select-trigger{cursor:not-allowed;box-shadow:none}
body.theme-ui-enhanced .ui-select-menu::-webkit-scrollbar,body.theme-ui-enhanced textarea::-webkit-scrollbar{width:7px;height:7px}
body.theme-ui-enhanced .ui-select-menu::-webkit-scrollbar-thumb,body.theme-ui-enhanced textarea::-webkit-scrollbar-thumb{border:2px solid transparent;border-radius:99px;background:color-mix(in srgb,var(--ui-accent) 55%,transparent);background-clip:padding-box}
body.theme-ui-enhanced input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file]),body.theme-ui-enhanced textarea{box-sizing:border-box;transition:border-color .23s ease,box-shadow .23s ease,background .23s ease,transform .18s ease}
body.theme-ui-enhanced input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file]):focus,body.theme-ui-enhanced textarea:focus{outline:none!important;border-color:var(--ui-accent)!important;box-shadow:0 0 0 4px var(--ui-ring),0 9px 24px rgba(40,32,24,.08)!important}
body.theme-ui-enhanced input::placeholder,body.theme-ui-enhanced textarea::placeholder{color:var(--ui-muted);opacity:.58}
body.theme-ui-enhanced input:disabled,body.theme-ui-enhanced textarea:disabled{opacity:.6;cursor:not-allowed;filter:saturate(.65)}
body.theme-ui-enhanced input[type=checkbox]:not(.sw),body.theme-ui-enhanced input[type=radio]{appearance:none;-webkit-appearance:none;width:20px;height:20px;display:inline-grid;place-content:center;margin:0 7px 0 0;border:1px solid var(--ui-line);background:var(--ui-field-bg);vertical-align:-4px;cursor:pointer;transition:.2s ease}
body.theme-ui-enhanced input[type=checkbox]:not(.sw){border-radius:6px}body.theme-ui-enhanced input[type=radio]{border-radius:50%}
body.theme-ui-enhanced input[type=checkbox]:not(.sw):checked,body.theme-ui-enhanced input[type=radio]:checked{border-color:var(--ui-accent);background:var(--ui-accent);box-shadow:0 0 0 4px var(--ui-ring)}
body.theme-ui-enhanced input[type=checkbox]:not(.sw):checked:before{content:'✓';color:#fff;font:bold 13px/1 sans-serif}
body.theme-ui-enhanced input[type=radio]:checked:before{content:'';width:7px;height:7px;border-radius:50%;background:#fff}
body.theme-ui-enhanced button,body.theme-ui-enhanced [role=button]{-webkit-tap-highlight-color:transparent}
body.theme-ui-enhanced button:focus-visible,body.theme-ui-enhanced [role=button]:focus-visible{outline:2px solid var(--ui-accent);outline-offset:3px}
body.theme-ui-enhanced .ui-select-menu-empty{padding:14px;text-align:center;color:var(--ui-muted);font-size:13px}
@media(max-width:560px){body.theme-ui-enhanced{--ui-radius:12px}body.theme-ui-enhanced .ui-select-trigger{min-height:45px}body.theme-ui-enhanced .ui-select-menu{max-height:42vh}}
@media(prefers-reduced-motion:reduce){body.theme-ui-enhanced .ui-select *,body.theme-ui-enhanced input,body.theme-ui-enhanced textarea{transition-duration:.01ms!important;animation-duration:.01ms!important}}
`;
    document.head.appendChild(s);
  }
  function esc(v){return String(v==null?'':v)}
  function options(select){
    var out=[];
    Array.prototype.forEach.call(select.children,function(n){
      if(n.tagName==='OPTGROUP'){
        out.push({group:n.label||''});
        Array.prototype.forEach.call(n.children,function(o){if(o.tagName==='OPTION')out.push({option:o});});
      }else if(n.tagName==='OPTION')out.push({option:n});
    });return out;
  }
  function close(inst,focus){if(!inst||!inst.wrap.classList.contains('is-open'))return;inst.wrap.classList.remove('is-open','open-up');inst.trigger.setAttribute('aria-expanded','false');if(active===inst)active=null;if(focus)inst.trigger.focus();}
  function closeActive(except){if(active&&active!==except)close(active,false)}
  function selectedIndex(inst){var list=options(inst.select).filter(function(x){return x.option});for(var i=0;i<list.length;i++)if(list[i].option===inst.select.options[inst.select.selectedIndex])return i;return 0}
  function sync(inst,rebuild){
    if(!inst||!inst.select.isConnected)return;
    var sel=inst.select,opt=sel.options[sel.selectedIndex],txt=opt?opt.textContent:'— pilih —';
    inst.value.textContent=txt;inst.value.classList.toggle('is-placeholder',!opt||opt.value==='');
    inst.wrap.classList.toggle('is-disabled',!!sel.disabled);inst.trigger.disabled=!!sel.disabled;
    if(rebuild)buildMenu(inst);else Array.prototype.forEach.call(inst.menu.querySelectorAll('.ui-select-option'),function(b){var hit=String(b.dataset.index)===String(sel.selectedIndex);b.classList.toggle('is-selected',hit);b.setAttribute('aria-selected',hit?'true':'false')});
  }
  function choose(inst,index){var o=inst.select.options[index];if(!o||o.disabled)return;inst.select.selectedIndex=index;sync(inst,false);inst.select.dispatchEvent(new Event('input',{bubbles:true}));inst.select.dispatchEvent(new Event('change',{bubbles:true}));close(inst,true)}
  function buildMenu(inst){
    var sel=inst.select,m=inst.menu;m.innerHTML='';var items=options(sel),oi=0;
    if(!sel.options.length){var e=document.createElement('div');e.className='ui-select-menu-empty';e.textContent='Belum ada pilihan';m.appendChild(e);return;}
    items.forEach(function(item){
      if(item.group){var g=document.createElement('div');g.className='ui-select-group';g.textContent=item.group;m.appendChild(g);return;}
      var o=item.option,b=document.createElement('button'),index=Array.prototype.indexOf.call(sel.options,o);b.type='button';b.className='ui-select-option';b.setAttribute('role','option');b.dataset.index=index;b.textContent=o.textContent;b.disabled=!!o.disabled;b.classList.toggle('is-selected',index===sel.selectedIndex);b.setAttribute('aria-selected',index===sel.selectedIndex?'true':'false');b.addEventListener('click',function(){choose(inst,index)});b.addEventListener('mousemove',function(){setActive(inst,b)});m.appendChild(b);oi++;
    });
  }
  function setActive(inst,b){Array.prototype.forEach.call(inst.menu.querySelectorAll('.ui-select-option'),function(x){x.classList.toggle('is-active',x===b)});if(b)b.scrollIntoView({block:'nearest'})}
  function open(inst){
    if(inst.select.disabled)return;closeActive(inst);sync(inst,true);inst.wrap.classList.add('is-open');inst.trigger.setAttribute('aria-expanded','true');active=inst;
    var r=inst.wrap.getBoundingClientRect(),spaceBelow=innerHeight-r.bottom,spaceAbove=r.top;if(spaceBelow<240&&spaceAbove>spaceBelow)inst.wrap.classList.add('open-up');
    var s=inst.menu.querySelector('.is-selected')||inst.menu.querySelector('.ui-select-option');setActive(inst,s);
  }
  function move(inst,dir){var a=[].slice.call(inst.menu.querySelectorAll('.ui-select-option:not(:disabled)')),cur=inst.menu.querySelector('.is-active'),i=a.indexOf(cur);if(dir==='home')i=0;else if(dir==='end')i=a.length-1;else i=Math.max(0,Math.min(a.length-1,(i<0?0:i+dir)));setActive(inst,a[i])}
  function enhance(select){
    if(!select||enhanced.has(select)||select.multiple||select.size>1||select.classList.contains('no-theme-ui'))return;
    var wrap=document.createElement('div'),trigger=document.createElement('button'),value=document.createElement('span'),arrow=document.createElement('span'),menu=document.createElement('div');
    var id='ui-select-'+(++uid);wrap.className='ui-select';trigger.type='button';trigger.className='ui-select-trigger';trigger.id=id+'-trigger';trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');value.className='ui-select-value';arrow.className='ui-select-arrow';arrow.setAttribute('aria-hidden','true');menu.className='ui-select-menu';menu.id=id+'-menu';menu.setAttribute('role','listbox');menu.setAttribute('aria-labelledby',trigger.id);trigger.setAttribute('aria-controls',menu.id);trigger.appendChild(value);trigger.appendChild(arrow);wrap.appendChild(trigger);wrap.appendChild(menu);
    select.parentNode.insertBefore(wrap,select);wrap.insertBefore(select,trigger);select.classList.add('ui-select-native');select.setAttribute('tabindex','-1');select.setAttribute('aria-hidden','true');
    var inst={select:select,wrap:wrap,trigger:trigger,value:value,menu:menu};enhanced.set(select,inst);buildMenu(inst);sync(inst,false);
    trigger.addEventListener('click',function(){wrap.classList.contains('is-open')?close(inst,false):open(inst)});
    trigger.addEventListener('keydown',function(e){if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!wrap.classList.contains('is-open'))open(inst);else move(inst,e.key==='ArrowDown'?1:-1)}else if(e.key==='Home'||e.key==='End'){if(wrap.classList.contains('is-open')){e.preventDefault();move(inst,e.key==='Home'?'home':'end')}}else if(e.key==='Enter'||e.key===' '){if(wrap.classList.contains('is-open')){e.preventDefault();var b=menu.querySelector('.is-active');if(b)choose(inst,Number(b.dataset.index))}}else if(e.key==='Escape'){e.preventDefault();close(inst,true)}else if(e.key==='Tab')close(inst,false)});
    select.addEventListener('change',function(){sync(inst,false)});select.addEventListener('input',function(){sync(inst,false)});
    var mo=new MutationObserver(function(){sync(inst,true)});mo.observe(select,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','label','value','selected']});inst.observer=mo;
    if(select.form)select.form.addEventListener('reset',function(){setTimeout(function(){sync(inst,true)},0)});
  }
  function scan(root){var r=root&&root.querySelectorAll?root:document;Array.prototype.forEach.call(r.querySelectorAll('select'),enhance)}
  function init(){css();if(document.body)document.body.classList.add('theme-ui-enhanced');scan(document);var mo=new MutationObserver(function(ms){ms.forEach(function(m){Array.prototype.forEach.call(m.addedNodes,function(n){if(n.nodeType!==1)return;if(n.matches&&n.matches('select'))enhance(n);scan(n)})})});mo.observe(document.documentElement,{childList:true,subtree:true});API.observer=mo}
  document.addEventListener('pointerdown',function(e){if(active&&!active.wrap.contains(e.target))close(active,false)},true);
  window.addEventListener('resize',function(){if(active)close(active,false)});
  API.refresh=function(root){scan(root||document);enhanced.forEach&&enhanced.forEach(function(x){sync(x,true)})};
  API.enhance=enhance;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
