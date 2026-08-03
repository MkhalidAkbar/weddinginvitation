/* FASE 2 — secure payment order creation. Official plans are read from Supabase. */
const SUPABASE_URL=(process.env.SUPABASE_URL||'').replace(/\/+$/,'');
const SERVICE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
const PROVIDER=(process.env.PAYMENT_PROVIDER||'midtrans').toLowerCase();
const BASE_URL=(process.env.PUBLIC_BASE_URL||'').replace(/\/+$/,'');
function origin(event){const o=(event.headers.origin||event.headers.Origin||'').replace(/\/+$/,'');if(!BASE_URL)return o;try{return o&&new URL(o).origin===new URL(BASE_URL).origin?o:''}catch(e){return''}}
function json(code,obj,event){const h={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};const o=origin(event);if(o)h['Access-Control-Allow-Origin']=o;return{statusCode:code,headers:h,body:JSON.stringify(obj)}}
const rest=p=>SUPABASE_URL+'/rest/v1/'+p;
const svc=e=>Object.assign({apikey:SERVICE_KEY,Authorization:'Bearer '+SERVICE_KEY,'Content-Type':'application/json'},e||{});
const clean=(v,n)=>String(v||'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n);
const isUuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''));
async function userFor(token){if(!token)return null;const r=await fetch(SUPABASE_URL+'/auth/v1/user',{headers:{apikey:SERVICE_KEY,Authorization:'Bearer '+token}});return r.ok?r.json():null}
async function rows(path,headers){const r=await fetch(rest(path),{headers:svc(headers)});const j=await r.json().catch(()=>[]);if(!r.ok)throw new Error('Database request failed');return j}
async function officialPlan(id){const p=await rows('plans?id=eq.'+encodeURIComponent(id)+'&active=eq.true&select=id,name,price,duration_months,features&limit=1');return p[0]||null}
async function ownedSite(id,uid){const s=await rows('sites?id=eq.'+encodeURIComponent(id)+'&owner_id=eq.'+encodeURIComponent(uid)+'&select=id,owner_id,status&limit=1');return s[0]||null}
async function rateAllowed(uid){const since=new Date(Date.now()-5*60*1000).toISOString();const r=await rows('orders?owner_id=eq.'+encodeURIComponent(uid)+'&created_at=gte.'+encodeURIComponent(since)+'&select=id',{'Range':'0-9'});return r.length<5}
async function reusableOrder(uid,site,plan){const now=new Date().toISOString();const q='orders?owner_id=eq.'+encodeURIComponent(uid)+'&site_id=eq.'+encodeURIComponent(site)+'&plan_id=eq.'+encodeURIComponent(plan)+'&status=eq.pending&expires_at=gt.'+encodeURIComponent(now)+'&payment_url=not.is.null&select=id,payment_url,amount,currency,expires_at,provider&order=created_at.desc&limit=1';const r=await rows(q);return r[0]||null}
async function audit(uid,action,entity,id,meta){try{await fetch(rest('security_audit_logs'),{method:'POST',headers:svc(),body:JSON.stringify({actor_id:uid,action,entity_type:entity,entity_id:String(id||''),metadata:meta||{}})})}catch(e){}}
function ready(){return PROVIDER==='xendit'?!!process.env.XENDIT_SECRET_KEY:!!process.env.MIDTRANS_SERVER_KEY}
async function timedFetch(url,opts){const c=new AbortController(),t=setTimeout(()=>c.abort(),20000);try{return await fetch(url,Object.assign({},opts,{signal:c.signal}))}finally{clearTimeout(t)}}
function returnUrl(orderId,result){return BASE_URL+'/payment.html?order='+encodeURIComponent(orderId)+'&result='+encodeURIComponent(result)}
async function midtrans(order,customer,plan){const prod=String(process.env.MIDTRANS_IS_PRODUCTION)==='true';const base=prod?'https://app.midtrans.com':'https://app.sandbox.midtrans.com';const auth='Basic '+Buffer.from(process.env.MIDTRANS_SERVER_KEY+':').toString('base64');const r=await timedFetch(base+'/snap/v1/transactions',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',Authorization:auth},body:JSON.stringify({transaction_details:{order_id:order.id,gross_amount:Number(plan.price)},customer_details:{first_name:customer.name||'Pelanggan',email:customer.email||undefined,phone:customer.phone||undefined},item_details:[{id:plan.id,price:Number(plan.price),quantity:1,name:'Undangan Digital — '+plan.name}],callbacks:{finish:returnUrl(order.id,'finish')}})});const j=await r.json().catch(()=>({}));if(!r.ok||!j.redirect_url)throw new Error('Midtrans rejected transaction');return{ref:order.id,url:j.redirect_url}}
async function xendit(order,customer,plan){
 const auth='Basic '+Buffer.from(process.env.XENDIT_SECRET_KEY+':').toString('base64');
 const r=await timedFetch('https://api.xendit.co/v2/invoices',{method:'POST',headers:{'Content-Type':'application/json',Authorization:auth},body:JSON.stringify({external_id:order.id,amount:Number(plan.price),currency:'IDR',payer_email:customer.email||undefined,description:'Undangan Digital — '+plan.name,success_redirect_url:returnUrl(order.id,'success'),failure_redirect_url:returnUrl(order.id,'failed'),invoice_duration:86400})});
 const j=await r.json().catch(()=>({}));if(!r.ok||!j.invoice_url)throw new Error('Xendit rejected transaction');return{ref:j.id,url:j.invoice_url}
}
exports.handler=async event=>{
 if(event.httpMethod==='OPTIONS'){if(BASE_URL&&!origin(event))return json(403,{error:'Origin tidak diizinkan'},event);return json(204,{},event)}
 if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'},event);
 if(BASE_URL&&(event.headers.origin||event.headers.Origin)&&!origin(event))return json(403,{error:'Origin tidak diizinkan'},event);
 if(!SUPABASE_URL||!SERVICE_KEY||!BASE_URL)return json(500,{error:'Konfigurasi server belum lengkap'},event);
 if(!['midtrans','xendit'].includes(PROVIDER)||!ready())return json(500,{error:'Provider pembayaran belum siap'},event);
 if(Buffer.byteLength(event.body||'','utf8')>12000)return json(413,{error:'Request terlalu besar'},event);
 let body;try{body=JSON.parse(event.body||'{}')}catch(e){return json(400,{error:'Body bukan JSON'},event)}
 const token=(event.headers.authorization||event.headers.Authorization||'').replace(/^Bearer\s+/i,'');const user=await userFor(token);if(!user||!user.id)return json(401,{error:'Silakan login untuk melanjutkan pembayaran'},event);
 const planId=clean(body.package,30).toLowerCase();if(!/^[a-z0-9_-]{2,30}$/.test(planId))return json(400,{error:'Paket tidak valid'},event);
 if(!isUuid(body.site_id))return json(400,{error:'site_id tidak valid'},event);
 try{
  const [plan,site]=await Promise.all([officialPlan(planId),ownedSite(body.site_id,user.id)]);if(!plan)return json(400,{error:'Paket tidak tersedia'},event);if(!site)return json(403,{error:'Undangan bukan milik pengguna'},event);
  const old=await reusableOrder(user.id,site.id,plan.id);if(old)return json(200,{order_id:old.id,payment_url:old.payment_url,package:plan.id,plan_name:plan.name,amount:Number(old.amount),currency:old.currency||'IDR',expires_at:old.expires_at,resumed:true},event);
  if(!await rateAllowed(user.id))return json(429,{error:'Terlalu banyak percobaan pembayaran. Coba lagi beberapa menit.'},event);
  const customer={name:clean(body.customer&&body.customer.name,100),email:clean((body.customer&&body.customer.email)||user.email,160),phone:clean(body.customer&&body.customer.phone,30)};
  const expires=new Date(Date.now()+86400000).toISOString();const payload={site_id:site.id,owner_id:user.id,package:plan.id,plan_id:plan.id,plan_name_snapshot:plan.name,amount:Number(plan.price),amount_snapshot:Number(plan.price),months:plan.duration_months,duration_snapshot:plan.duration_months,features_snapshot:plan.features||{},currency:'IDR',provider:PROVIDER,status:'pending',expires_at:expires};
  const ins=await fetch(rest('orders'),{method:'POST',headers:svc({Prefer:'return=representation'}),body:JSON.stringify(payload)});const created=await ins.json().catch(()=>[]);if(!ins.ok||!created[0])return json(500,{error:'Gagal membuat order'},event);const order=created[0];await audit(user.id,'payment_order_created','order',order.id,{site_id:site.id,plan_id:plan.id,amount:Number(plan.price),provider:PROVIDER});
  let pay;try{pay=PROVIDER==='xendit'?await xendit(order,customer,plan):await midtrans(order,customer,plan)}catch(e){await fetch(rest('orders?id=eq.'+encodeURIComponent(order.id)),{method:'PATCH',headers:svc(),body:JSON.stringify({status:'failed',raw:{stage:'create_payment',message:'provider_error'}})});await audit(user.id,'payment_provider_failed','order',order.id,{provider:PROVIDER});return json(502,{error:'Provider pembayaran belum dapat membuat transaksi'},event)}
  await fetch(rest('orders?id=eq.'+encodeURIComponent(order.id)),{method:'PATCH',headers:svc(),body:JSON.stringify({provider_ref:pay.ref,payment_url:pay.url})});
  return json(200,{order_id:order.id,payment_url:pay.url,package:plan.id,plan_name:plan.name,amount:Number(plan.price),currency:'IDR',expires_at:expires,resumed:false},event);
 }catch(e){return json(500,{error:'Layanan pembayaran sedang bermasalah'},event)}
};
