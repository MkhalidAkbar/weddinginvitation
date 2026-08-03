/* Verified and idempotent payment webhook for Midtrans/Xendit. */
const crypto=require('crypto');
const SUPABASE_URL=(process.env.SUPABASE_URL||'').replace(/\/+$/,'');
const SERVICE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
const PROVIDER=(process.env.PAYMENT_PROVIDER||'midtrans').toLowerCase();
const json=(code,obj)=>({statusCode:code,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},body:JSON.stringify(obj)});
const rest=path=>SUPABASE_URL+'/rest/v1/'+path;
const svc=extra=>Object.assign({apikey:SERVICE_KEY,Authorization:'Bearer '+SERVICE_KEY,'Content-Type':'application/json'},extra||{});
function timingEqual(a,b){const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&crypto.timingSafeEqual(x,y)}
function midtransValid(p){const key=process.env.MIDTRANS_SERVER_KEY||'';if(!key||!p.signature_key)return false;const raw=String(p.order_id||'')+String(p.status_code||'')+String(p.gross_amount||'')+key;return timingEqual(crypto.createHash('sha512').update(raw).digest('hex'),p.signature_key)}
function midtransStatus(p){const t=p.transaction_status,f=p.fraud_status;if(t==='capture')return f==='accept'?'paid':'pending';if(t==='settlement')return'paid';if(t==='pending')return'pending';if(t==='deny'||t==='failure')return'failed';if(t==='cancel')return'cancelled';if(t==='expire')return'expired';if(t==='partial_refund')return'partially_refunded';if(t==='refund')return'refunded';return'pending'}
function xenditStatus(p){const s=String(p.status||'').toUpperCase();if(s==='PAID'||s==='SETTLED')return'paid';if(s==='EXPIRED')return'expired';if(s==='FAILED')return'failed';return'pending'}
function safeRaw(p){const keys=['id','external_id','order_id','status','transaction_status','fraud_status','status_code','gross_amount','amount','paid_amount','currency','payment_method','payment_channel','transaction_time','settlement_time','paid_at','expiry_date'];const out={};keys.forEach(k=>{if(p[k]!=null)out[k]=p[k]});return out}
async function getOrder(ref){const q='orders?or=(id.eq.'+encodeURIComponent(ref)+',provider_ref.eq.'+encodeURIComponent(ref)+')&select=id,owner_id,site_id,status,provider,amount,currency,provider_ref&limit=1';const r=await fetch(rest(q),{headers:svc()});const rows=await r.json().catch(()=>[]);return r.ok&&rows[0]?rows[0]:null}
function validAmount(order,p){const incoming=Number(p.gross_amount!=null?p.gross_amount:(p.paid_amount!=null?p.paid_amount:p.amount));return Number.isFinite(incoming)&&Math.round(incoming)===Math.round(Number(order.amount))}
function allowedTransition(from,to){if(from===to)return true;if(from==='paid')return to==='refunded'||to==='partially_refunded';if(from==='refunded'||from==='cancelled'||from==='expired')return false;return ['pending','paid','failed','expired','cancelled','refunded','partially_refunded'].includes(to)}
exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
  if(!SUPABASE_URL||!SERVICE_KEY)return json(500,{error:'Server belum dikonfigurasi'});
  if(Buffer.byteLength(event.body||'','utf8')>100000)return json(413,{error:'Payload terlalu besar'});
  let p;try{p=JSON.parse(event.body||'{}')}catch(e){return json(400,{error:'Body bukan JSON'})}
  let ref,status;
  if(PROVIDER==='xendit'){
    const expected=process.env.XENDIT_CALLBACK_TOKEN||'';const token=event.headers['x-callback-token']||event.headers['X-Callback-Token']||'';
    if(!expected||!timingEqual(token,expected))return json(401,{error:'Callback token tidak valid'});
    ref=p.external_id||p.id;status=xenditStatus(p);
  }else{
    if(!midtransValid(p))return json(401,{error:'Signature Midtrans tidak valid'});
    ref=p.order_id;status=midtransStatus(p);
  }
  if(!ref)return json(400,{error:'Referensi order tidak ada'});
  const order=await getOrder(ref);if(!order)return json(404,{error:'Order tidak ditemukan'});
  if(order.provider&&order.provider!==PROVIDER)return json(409,{error:'Provider tidak sesuai'});
  if(status==='paid'&&!validAmount(order,p))return json(409,{error:'Nominal pembayaran tidak sesuai'});
  if(!allowedTransition(order.status,status))return json(200,{ok:true,ignored:true,reason:'invalid_transition',status:order.status});
  if(order.status===status)return json(200,{ok:true,idempotent:true,ref:order.id,status});
  const r=await fetch(rest('orders?id=eq.'+encodeURIComponent(order.id)+'&status=eq.'+encodeURIComponent(order.status)),{method:'PATCH',headers:svc({Prefer:'return=representation'}),body:JSON.stringify({status,raw:safeRaw(p),paid_at:status==='paid'?new Date().toISOString():undefined})});
  const rows=await r.json().catch(()=>[]);if(!r.ok)return json(500,{error:'Gagal memperbarui order'});
  return json(200,{ok:true,ref:order.id,status,updated:rows.length});
};
