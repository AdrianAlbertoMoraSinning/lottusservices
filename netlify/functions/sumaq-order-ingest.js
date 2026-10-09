const crypto=require('crypto');
function env(name){const v=process.env[name];if(!v)throw new Error(`Missing Netlify environment variable: ${name}`);return v}
function clean(v,max=1000){return String(v??'').trim().slice(0,max)}
function safeEqual(a,b){const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&crypto.timingSafeEqual(x,y)}
function json(statusCode,body){return{statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)}}
async function request(path,{method='GET',body,prefer='return=representation'}={}){const base=env('SUPABASE_URL').replace(/\/$/,'');const key=env('SUPABASE_SERVICE_ROLE_KEY');const r=await fetch(`${base}/rest/v1/${path}`,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:prefer},body:body?JSON.stringify(body):undefined});const t=await r.text();let d=null;try{d=t?JSON.parse(t):null}catch{d=t}if(!r.ok)throw new Error(d?.message||d?.error||`Supabase error ${r.status}`);return d}
function qty(v){const n=Number(v);return Number.isInteger(n)&&n>0&&n<=99?n:1}
exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
  try{
    const supplied=event.headers['x-sumaq-order-ingest-token']||'';
    if(!safeEqual(supplied,env('SUMAQ_ORDER_INGEST_TOKEN')))throw Object.assign(new Error('Unauthorized order source.'),{status:401});
    const p=JSON.parse(event.body||'{}');
    const source=['uber_eats','skip'].includes(p.source)?p.source:null;
    if(!source)throw new Error('Unsupported source.');
    const externalId=clean(p.externalOrderId,120);if(!externalId)throw new Error('External order ID is required.');
    const incomingItems=Array.isArray(p.items)?p.items.slice(0,100):[];if(!incomingItems.length)throw new Error('External order has no items.');
    const dup=await request(`orders?source_channel=eq.${source}&external_order_id=eq.${encodeURIComponent(externalId)}&select=id,public_id,payment_status,kitchen_status&limit=1`);
    if(dup?.length)return json(200,{data:{duplicate:true,order:dup[0]}});

    const publicId=clean(p.publicId||`${source==='uber_eats'?'UBER':'SKIP'}-${externalId}`,80);
    const total=Math.max(0,Number(p.total||0)),tax=Math.max(0,Number(p.tax||0)),subtotal=Math.max(0,Number(p.subtotal??Math.max(0,total-tax)));
    const row={public_id:publicId,order_type:'pickup',source_channel:source,external_order_id:externalId,customer_name:clean(p.customerName||source.replace('_',' '),160),email:clean(p.email||'orders@sumaq17.com',254),phone:clean(p.phone,40),pickup_date:p.pickupDate||null,pickup_time:p.pickupTime||null,fulfillment:clean(p.fulfillment||'Delivery partner',80),notes:clean(p.notes,2000),subtotal,tax,total,status:'Received',payment_status:'Pending external acceptance',paid_at:null,kitchen_status:'New'};
    const created=(await request('orders',{method:'POST',body:row}))?.[0];
    if(!created?.id)throw new Error('External order could not be created.');

    try{
      const lines=incomingItems.map(i=>{const quantity=qty(i.quantity);const unitPrice=Math.max(0,Number(i.unitPrice||0));return{order_id:created.id,product_slug:clean(i.sku||i.id||i.name,100),product_name:clean(i.name,200),unit_price:unitPrice,quantity,line_total:Math.max(0,Number(i.lineTotal??(unitPrice*quantity)))}});
      await request('order_items',{method:'POST',body:lines});
      const paid=(await request(`orders?id=eq.${encodeURIComponent(created.id)}`,{method:'PATCH',body:{status:'Confirmed',payment_status:'Paid (external)',paid_at:new Date().toISOString(),updated_at:new Date().toISOString()}}))?.[0];
      return json(200,{data:{duplicate:false,order:{...(paid||created),items:lines}}});
    }catch(error){
      await request(`orders?id=eq.${encodeURIComponent(created.id)}`,{method:'DELETE',prefer:'return=minimal'}).catch(()=>{});
      throw error;
    }
  }catch(e){console.error(e);return json(e.status||400,{error:e.message||'Request failed'})}
};
