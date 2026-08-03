/* FASE 3 — authenticated payment summary, active entitlement, and transaction history. */
const SUPABASE_URL=(process.env.SUPABASE_URL||'').replace(/\/+$/,'');
const SERVICE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
const BASE_URL=(process.env.PUBLIC_BASE_URL||'').replace(/\/+$/,'');
const rest=p=>SUPABASE_URL+'/rest/v1/'+p;
const svc=e=>Object.assign({apikey:SERVICE_KEY,Authorization:'Bearer '+SERVICE_KEY,'Content-Type':'application/json'},e||{});
const isUuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''));
function origin(event){const o=(event.headers.origin||event.headers.Origin||'').replace(/\/+$/,'');if(!BASE_URL)return o;try{return o&&new URL(o).origin===new URL(BASE_URL).origin?o:''}catch(e){return''}}
function json(code,obj,event){const h={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};const o=origin(event);if(o)h['Access-Control-Allow-Origin']=o;return{statusCode:code,headers:h,body:JSON.stringify(obj)}}
async function userFor(token){if(!token)return null;const r=await fetch(SUPABASE_URL+'/auth/v1/user',{headers:{apikey:SERVICE_KEY,Authorization:'Bearer '+token}});return r.ok?r.json():null}
async function query(path){const r=await fetch(rest(path),{headers:svc()});const j=await r.json().catch(()=>[]);if(!r.ok)throw new Error('query failed');return j}
function displayName(config,slug){const c=config&&config.couple||{},a=c.brideShort||c.bride&&c.bride.full,b=c.groomShort||c.groom&&c.groom.full;return [a,b].filter(Boolean).join(' & ').slice(0,120)||slug||'Undangan digital'}
exports.handler=async event=>{
 if(event.httpMethod==='OPTIONS'){if(BASE_URL&&!origin(event))return json(403,{error:'Origin tidak diizinkan'},event);return json(204,{},event)}
 if(event.httpMethod!=='GET')return json(405,{error:'Method not allowed'},event);
 if(BASE_URL&&(event.headers.origin||event.headers.Origin)&&!origin(event))return json(403,{error:'Origin tidak diizinkan'},event);
 if(!SUPABASE_URL||!SERVICE_KEY)return json(500,{error:'Konfigurasi server belum lengkap'},event);
 const token=(event.headers.authorization||event.headers.Authorization||'').replace(/^Bearer\s+/i,'');const user=await userFor(token);if(!user||!user.id)return json(401,{error:'Sesi login tidak valid'},event);
 const siteId=event.queryStringParameters&&event.queryStringParameters.site_id;if(!isUuid(siteId))return json(400,{error:'site_id tidak valid'},event);
 try{
  const sites=await query('sites?id=eq.'+encodeURIComponent(siteId)+'&owner_id=eq.'+encodeURIComponent(user.id)+'&select=id,slug,status,package,expires_at,config&limit=1');const site=sites[0];if(!site)return json(403,{error:'Undangan bukan milik pengguna'},event);
  const [plans,orders,ents]=await Promise.all([
   query('plans?active=eq.true&select=id,name,price,duration_months,features&order=price.asc'),
   query('orders?site_id=eq.'+encodeURIComponent(siteId)+'&owner_id=eq.'+encodeURIComponent(user.id)+'&select=id,plan_id,plan_name_snapshot,amount,currency,status,provider,payment_url,expires_at,paid_at,created_at,updated_at&order=created_at.desc&limit=20'),
   query('site_entitlements?site_id=eq.'+encodeURIComponent(siteId)+'&select=plan_id,active,starts_at,expires_at,watermark_disabled,custom_domain_enabled,features&limit=1').catch(()=>[])
  ]);
  const now=Date.now();await Promise.all(orders.filter(o=>o.status==='pending'&&o.expires_at&&Date.parse(o.expires_at)<now).map(o=>{o.status='expired';return fetch(rest('orders?id=eq.'+encodeURIComponent(o.id)+'&status=eq.pending'),{method:'PATCH',headers:svc(),body:JSON.stringify({status:'expired'})})}));
  return json(200,{user:{email:user.email||''},site:{id:site.id,slug:site.slug,status:site.status,package:site.package,expires_at:site.expires_at,display_name:displayName(site.config,site.slug)},plans:plans.map(p=>({id:p.id,name:p.name,price:Number(p.price),duration_months:p.duration_months,features:p.features||{}})),entitlement:ents[0]||null,orders},event);
 }catch(e){return json(500,{error:'Gagal memuat data pembayaran'},event)}
};
