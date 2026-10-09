const crypto = require('crypto');

function env(name){const v=process.env[name];if(!v)throw new Error(`Missing Netlify environment variable: ${name}`);return v}
function clean(v,max=500){return String(v??'').trim().slice(0,max)}
function safeEqual(a,b){const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&crypto.timingSafeEqual(x,y)}
function json(statusCode,body){return{statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)}}
async function request(path,{method='GET',body,prefer='return=representation'}={}){
  const base=env('SUPABASE_URL').replace(/\/$/,'');const key=env('SUPABASE_SERVICE_ROLE_KEY');
  const r=await fetch(`${base}/rest/v1/${path}`,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:prefer},body:body?JSON.stringify(body):undefined});
  const t=await r.text();let data=null;try{data=t?JSON.parse(t):null}catch{data=t}
  if(!r.ok)throw new Error(data?.message||data?.error||`Supabase error ${r.status}`);return data;
}
function auth(event){const supplied=event.headers['x-sumaq-print-agent-token']||'';const expected=env('SUMAQ_PRINT_AGENT_TOKEN');if(!safeEqual(supplied,expected)){const e=new Error('Unauthorized print agent.');e.status=401;throw e}}
async function poll(payload){
  const agent=clean(payload.agentName||'restaurant-agent',80);
  const jobs=await request('kitchen_print_jobs?select=id,order_id,status,attempts,requested_at&status=eq.pending&order=requested_at.asc&limit=1');
  if(!jobs?.length)return null;
  const job=jobs[0];
  const claimed=await request(`kitchen_print_jobs?id=eq.${encodeURIComponent(job.id)}&status=eq.pending`,{method:'PATCH',body:{status:'claimed',claimed_at:new Date().toISOString(),agent_name:agent,attempts:Number(job.attempts||0)+1,updated_at:new Date().toISOString()}});
  if(!claimed?.length)return null;
  const orders=await request(`orders?id=eq.${encodeURIComponent(job.order_id)}&select=id,public_id,order_type,source_channel,external_order_id,customer_name,email,phone,pickup_date,pickup_time,fulfillment,notes,subtotal,tax,total,status,payment_status,kitchen_status,created_at`);
  if(!orders?.length)throw new Error('Order not found for print job.');
  const items=await request(`order_items?order_id=eq.${encodeURIComponent(job.order_id)}&select=product_name,unit_price,quantity,line_total&order=id.asc`);
  return {jobId:job.id,order:{...orders[0],items:items||[]}};
}
async function ack(payload){
  const id=clean(payload.jobId,80);if(!/^[0-9a-f-]{36}$/i.test(id))throw new Error('Invalid job ID.');
  const ok=Boolean(payload.ok);const patch=ok?{status:'printed',printed_at:new Date().toISOString(),last_error:'',updated_at:new Date().toISOString()}:{status:'error',last_error:clean(payload.error||'Print failed',1000),updated_at:new Date().toISOString()};
  const rows=await request(`kitchen_print_jobs?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:patch});return rows?.[0]||null;
}
exports.handler=async(event)=>{if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});try{auth(event);const{action,payload={}}=JSON.parse(event.body||'{}');if(action==='poll')return json(200,{data:await poll(payload)});if(action==='ack')return json(200,{data:await ack(payload)});throw new Error('Unsupported action.')}catch(e){console.error(e);return json(e.status||400,{error:e.message||'Request failed'})}};
