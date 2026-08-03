/* Secure payment order creation. Price and duration are server-controlled. */
const SUPABASE_URL=(process.env.SUPABASE_URL||'').replace(/\/+$/,'');
const SERVICE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
const PROVIDER=(process.env.PAYMENT_PROVIDER||'midtrans').toLowerCase();
const BASE_URL=(process.env.PUBLIC_BASE_URL||'').replace(/\/+$/,'');
const PLANS={
  basic:{name:'Basic',amount:99000,months:6,features:{gallery:6,guests:false,upload:false,watermark_disabled:false,custom_domain:false}},
  premium:{name:'Premium',amount:199000,months:12,features:{gallery:12,guests:true,upload:true,watermark_disabled:false,custom_domain:false}},
  exclusive:{name:'Exclusive',amount:349000,months:24,features:{gallery:30,guests:true,upload:true,watermark_disabled:true,custom_domain:true}}
};
function allowedOrigin(event){const origin=(event.headers.origin||event.headers.Origin||'').replace(/\/+$/,'');if(!BASE_URL)return origin||'';try{return origin&&new URL(origin).origin===new URL(BASE_URL).origin?origin:''}catch(e){return''}}
function json(code,obj,event){const origin=allowedOrigin(event);const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};if(origin)headers['Access-Control-Allow-Origin']=origin;return{statusCode:code,headers,body:JSON.stringify(obj)}}
function rest(path){return SUPABASE_URL+'/rest/v1/'+path}
function svc(extra){return Object.assign({apikey:SERVICE_KEY,Authorization:'Bearer '+SERVICE_KEY,'Content-Type':'application/json'},extra||{})}
function clean(v,n){return String(v||'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n)}
function uuid(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''))}
async function getUser(token){if(!token)return null;const r=await fetch(SUPABASE_URL+'/auth/v1/user',{headers:{apikey:SERVICE_KEY,Authorization:'Bearer '+token}});return r.ok?r.json():null}
async function getOwnedSite(siteId,userId){const q='sites?id=eq.'+encodeURIComponent(siteId)+'&owner_id=eq.'+encodeURIComponent(userId)+'&select=id,owner_id,status&limit=1';const r=await fetch(rest(q),{headers:svc()});const rows=await r.json().catch(()=>[]);return r.ok&&rows[0]?rows[0]:null}
async function rateAllowed(userId){const since=new Date(Date.now()-5*60*1000).toISOString();const q='orders?owner_id=eq.'+encodeURIComponent(userId)+'&created_at=gte.'+encodeURIComponent(since)+'&select=id';const r=await fetch(rest(q),{headers:svc({'Range':'0-9'})});const rows=await r.json().catch(()=>[]);return r.ok&&rows.length<5}
function providerReady(){return PROVIDER==='xendit'?!!process.env.XENDIT_SECRET_KEY:!!process.env.MIDTRANS_SERVER_KEY}
async function createMidtrans(order,customer,plan){const isProd=String(process.env.MIDTRANS_IS_PRODUCTION)==='true';const base=isProd?'https://app.midtrans.com':'https://app.sandbox.midtrans.com';const auth='Basic '+Buffer.from(process.env.MIDTRANS_SERVER_KEY+':').toString('base64');const r=await fetch(base+'/snap/v1/transactions',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',Authorization:auth},body:JSON.stringify({transaction_details:{order_id:order.id,gross_amount:plan.amount},customer_details:{first_name:customer.name||'Pelanggan',email:customer.email||undefined,phone:customer.phone||undefined},item_details:[{id:order.plan_id,price:plan.amount,quantity:1,name:'Undangan Digital — '+plan.name}],callbacks:BASE_URL?{finish:BASE_URL+'/panel.html'}:undefined})});const j=await r.json().catch(()=>({}));if(!r.ok||!j.redirect_url)throw new Error('Provider menolak transaksi');return{ref:order.id,url:j.redirect_url}}
async function createXendit(order,customer,plan){const auth='Basic '+Buffer.from(process.env.XENDIT_SECRET_KEY+':').toString('base64');const r=await fetch('https://api.xendit.co/v2/invoices',{method:'POST',headers:{'Content-Type':'application/json',Authorization:auth},body:JSON.stringify({external_id:order.id,amount:plan.amount,currency:'IDR',payer_email:customer.email||undefined,description:'Undangan Digital — '+plan.name,success_redirect_url:BASE_URL?BASE_URL+'/panel.html':undefined})});const j=await r.json().catch(()=>({}));if(!r.ok||!j.invoice_url)throw new Error('Provider menolak transaksi');return{ref:j.id,url:j.invoice_url}}
exports.handler=async(event)=>{
  if(event.httpMethod==='OPTIONS'){if(BASE_URL&&!allowedOrigin(event))return json(403,{error:'Origin tidak diizinkan'},event);return json(204,{},event)}
  if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'},event);
  if(BASE_URL&&(event.headers.origin||event.headers.Origin)&&!allowedOrigin(event))return json(403,{error:'Origin tidak diizinkan'},event);
  if(!SUPABASE_URL||!SERVICE_KEY||!BASE_URL)return json(500,{error:'Konfigurasi server belum lengkap'},event);
  if(!providerReady()||!['midtrans','xendit'].includes(PROVIDER))return json(500,{error:'Provider pembayaran belum siap'},event);
  if(Buffer.byteLength(event.body||'','utf8')>12000)return json(413,{error:'Request terlalu besar'},event);
  let body;try{body=JSON.parse(event.body||'{}')}catch(e){return json(400,{error:'Body bukan JSON'},event)}
  const token=(event.headers.authorization||event.headers.Authorization||'').replace(/^Bearer\s+/i,'');const user=await getUser(token);if(!user||!user.id)return json(401,{error:'Tidak terautentikasi'},event);
  const planId=clean(body.package,30).toLowerCase(),plan=PLANS[planId];if(!plan)return json(400,{error:'Paket tidak valid'},event);
  if(!uuid(body.site_id))return json(400,{error:'site_id tidak valid'},event);
  const site=await getOwnedSite(body.site_id,user.id);if(!site)return json(403,{error:'Undangan bukan milik pengguna'},event);
  if(!await rateAllowed(user.id))return json(429,{error:'Terlalu banyak percobaan pembayaran. Coba lagi beberapa menit.'},event);
  const customer={name:clean(body.customer&&body.customer.name,100),email:clean((body.customer&&body.customer.email)||user.email,160),phone:clean(body.customer&&body.customer.phone,30)};
  const payload={site_id:site.id,owner_id:user.id,package:planId,plan_id:planId,plan_name_snapshot:plan.name,amount:plan.amount,amount_snapshot:plan.amount,months:plan.months,duration_snapshot:plan.months,features_snapshot:plan.features,currency:'IDR',provider:PROVIDER,status:'pending',expires_at:new Date(Date.now()+24*60*60*1000).toISOString()};
  const ins=await fetch(rest('orders'),{method:'POST',headers:svc({Prefer:'return=representation'}),body:JSON.stringify(payload)});const rows=await ins.json().catch(()=>[]);if(!ins.ok||!rows[0])return json(500,{error:'Gagal membuat order'},event);const order=rows[0];
  let pay;try{pay=PROVIDER==='xendit'?await createXendit(order,customer,plan):await createMidtrans(order,customer,plan)}catch(e){await fetch(rest('orders?id=eq.'+encodeURIComponent(order.id)),{method:'PATCH',headers:svc(),body:JSON.stringify({status:'failed',raw:{stage:'create_payment',message:'provider_error'}})});return json(502,{error:'Gagal membuat pembayaran'},event)}
  await fetch(rest('orders?id=eq.'+encodeURIComponent(order.id)),{method:'PATCH',headers:svc(),body:JSON.stringify({provider_ref:pay.ref,payment_url:pay.url})});
  return json(200,{order_id:order.id,payment_url:pay.url,package:planId,amount:plan.amount,currency:'IDR'},event);
};
