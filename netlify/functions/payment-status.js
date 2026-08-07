/* FASE 3 — authenticated payment summary, active entitlement, and transaction history. */
const SUPABASE_URL=(process.env.SUPABASE_URL||'').replace(/\/+$/,'');
const SERVICE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
const BASE_URL=(process.env.PUBLIC_BASE_URL||'').replace(/\/+$/,'');
const rest=p=>SUPABASE_URL+'/rest/v1/'+p;
const svc=e=>Object.assign({apikey:SERVICE_KEY,Authorization:'Bearer '+SERVICE_KEY,'Content-Type':'application/json'},e||{});
const isUuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''));
const eventHeaders=event=>event&&event.headers||{};
function origin(event){const h=eventHeaders(event),o=(h.origin||h.Origin||'').replace(/\/+$/,'');if(!BASE_URL)return o;try{return o&&new URL(o).origin===new URL(BASE_URL).origin?o:''}catch(e){return''}}
function json(code,obj,event){const h={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};const o=origin(event);if(o)h['Access-Control-Allow-Origin']=o;return{statusCode:code,headers:h,body:JSON.stringify(obj)}}
function reference(){return Math.random().toString(36).slice(2,8).toUpperCase()+Date.now().toString(36).slice(-4).toUpperCase()}
async function userFor(token){if(!token)return null;const r=await fetch(SUPABASE_URL+'/auth/v1/user',{headers:{apikey:SERVICE_KEY,Authorization:'Bearer '+token}});if(!r.ok)return null;return r.json()}
async function query(path){const r=await fetch(rest(path),{headers:svc()});const j=await r.json().catch(()=>[]);if(!r.ok){const detail=j&&typeof j==='object'&&(j.message||j.hint||j.code)||'unknown';throw new Error('Supabase query '+r.status+': '+detail)}return j}
function displayName(config,slug){const c=config&&config.couple||{},a=c.brideShort||c.bride&&c.bride.full,b=c.groomShort||c.groom&&c.groom.full;return [a,b].filter(Boolean).join(' & ').slice(0,120)||slug||'Undangan digital'}
exports.handler=async event=>{
 const ref=reference();
 try{
  if(event.httpMethod==='OPTIONS'){if(BASE_URL&&!origin(event))return json(403,{error:'Origin tidak diizinkan',code:'ORIGIN_NOT_ALLOWED'},event);return json(204,{},event)}
  if(event.httpMethod!=='GET')return json(405,{error:'Method not allowed',code:'METHOD_NOT_ALLOWED'},event);
  const h=eventHeaders(event);
  if(BASE_URL&&(h.origin||h.Origin)&&!origin(event))return json(403,{error:'Origin tidak diizinkan',code:'ORIGIN_NOT_ALLOWED'},event);
  if(!SUPABASE_URL||!SERVICE_KEY)return json(500,{error:'Konfigurasi server pembayaran belum lengkap',code:'PAYMENT_CONFIG_MISSING',reference:ref},event);
  const token=(h.authorization||h.Authorization||'').replace(/^Bearer\s+/i,'');
  const user=await userFor(token);if(!user||!user.id)return json(401,{error:'Sesi login tidak valid',code:'SESSION_INVALID'},event);
  const siteId=event.queryStringParameters&&event.queryStringParameters.site_id;if(!isUuid(siteId))return json(400,{error:'site_id tidak valid',code:'SITE_ID_INVALID'},event);
  const sites=await query('sites?id=eq.'+encodeURIComponent(siteId)+'&owner_id=eq.'+encodeURIComponent(user.id)+'&select=id,slug,status,package,expires_at,config&limit=1');const site=sites[0];if(!site)return json(403,{error:'Undangan bukan milik pengguna',code:'SITE_FORBIDDEN'},event);
  const [plans,orders,ents]=await Promise.all([
   query('plans?active=eq.true&select=id,name,price,duration_months,features&order=price.asc'),
   query('orders?site_id=eq.'+encodeURIComponent(siteId)+'&owner_id=eq.'+encodeURIComponent(user.id)+'&select=id,plan_id,plan_name_snapshot,amount,currency,status,provider,payment_url,expires_at,paid_at,created_at,updated_at&order=created_at.desc&limit=20'),
   query('site_entitlements?site_id=eq.'+encodeURIComponent(siteId)+'&select=plan_id,active,starts_at,expires_at,watermark_disabled,custom_domain_enabled,features&limit=1').catch(error=>{console.warn('[payment-status]['+ref+'] entitlement query skipped:',error.message);return[]})
  ]);
  const now=Date.now();await Promise.all(orders.filter(o=>o.status==='pending'&&o.expires_at&&Date.parse(o.expires_at)<now).map(o=>{o.status='expired';return fetch(rest('orders?id=eq.'+encodeURIComponent(o.id)+'&status=eq.pending'),{method:'PATCH',headers:svc(),body:JSON.stringify({status:'expired'})})}));
  return json(200,{user:{email:user.email||''},site:{id:site.id,slug:site.slug,status:site.status,package:site.package,expires_at:site.expires_at,display_name:displayName(site.config,site.slug)},plans:plans.map(p=>({id:p.id,name:p.name,price:Number(p.price),duration_months:p.duration_months,features:p.features||{}})),entitlement:ents[0]||null,orders},event);
 }catch(error){console.error('[payment-status]['+ref+']',error&&error.message||error);return json(503,{error:'Layanan pembayaran belum dapat memuat data',code:'PAYMENT_STATUS_UNAVAILABLE',reference:ref},event)}
};
