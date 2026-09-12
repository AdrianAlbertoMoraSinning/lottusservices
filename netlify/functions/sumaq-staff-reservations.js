const crypto = require('crypto');

function env(name){const value=process.env[name];if(!value)throw new Error(`Missing Netlify environment variable: ${name}`);return value}
function clean(value,max=500){return String(value??'').trim().slice(0,max)}
function safeEqual(a,b){const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&crypto.timingSafeEqual(x,y)}
function json(statusCode,body){return{statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff'},body:JSON.stringify(body)}}
function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(String(v||''))}
function b64url(value){return Buffer.from(value).toString('base64url')}
function sign(value){return crypto.createHmac('sha256',env('SUMAQ_RESERVATIONS_STAFF_PIN')).update(value).digest('base64url')}
function createToken(name){const body=b64url(JSON.stringify({name:clean(name,80)||'Staff',exp:Date.now()+12*60*60*1000}));return `${body}.${sign(body)}`}
function readToken(event){
  const token=event.headers['x-sumaq-staff-token']||event.headers['X-Sumaq-Staff-Token']||'';
  const [body,sig]=String(token).split('.');if(!body||!sig||!safeEqual(sig,sign(body))){const e=new Error('Staff session expired. Please sign in again.');e.status=401;throw e}
  let payload;try{payload=JSON.parse(Buffer.from(body,'base64url').toString('utf8'))}catch{payload=null}
  if(!payload||!payload.exp||Date.now()>Number(payload.exp)){const e=new Error('Staff session expired. Please sign in again.');e.status=401;throw e}
  return payload;
}
function verifyPin(event){const supplied=event.headers['x-sumaq-staff-pin']||event.headers['X-Sumaq-Staff-Pin']||'';const expected=env('SUMAQ_RESERVATIONS_STAFF_PIN');if(!safeEqual(supplied,expected)){const e=new Error('Invalid staff access PIN.');e.status=401;throw e}}
async function request(path,{method='GET',body,prefer='return=representation'}={}){
  const url=env('SUPABASE_URL').replace(/\/$/,'')+'/rest/v1/'+path;
  const key=env('SUPABASE_SERVICE_ROLE_KEY');
  const response=await fetch(url,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:prefer},body:body?JSON.stringify(body):undefined});
  const text=await response.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
  if(!response.ok)throw new Error(data?.message||data?.error||`Supabase error ${response.status}`);return data;
}
function reservationSelect(){return 'id,first_name,last_name,email,phone,reservation_date,reservation_time,adults,minors,party_size,notes,status,deposit_required,deposit_amount,payment_status,paid_at,table_label,staff_note,created_at,updated_at'}
async function listReservations(payload){
  const mode=['today','date','upcoming'].includes(payload.mode)?payload.mode:'today';const date=validDate(payload.date)?payload.date:new Date().toISOString().slice(0,10);
  const filter=mode==='upcoming'?`reservation_date=gte.${date}`:`reservation_date=eq.${date}`;
  const reservations=await request(`reservations?select=${reservationSelect()}&${filter}&order=reservation_date.asc,reservation_time.asc&limit=150`);
  const activityFilter=mode==='upcoming'?`reservation_date=gte.${date}`:`reservation_date=eq.${date}`;
  let activity=[];try{activity=await request(`reservation_activity?select=id,reservation_id,reservation_date,action,details,created_at&${activityFilter}&order=created_at.desc&limit=30`)}catch(error){activity=[]}
  return{reservations:reservations||[],activity:activity||[]};
}
async function updateReservation(payload){
  const id=clean(payload.id,80);if(!/^[0-9a-f-]{36}$/i.test(id))throw new Error('Invalid reservation ID.');
  const allowedStatuses=new Set(['New','Booked','Awaiting deposit','Confirmed','Seated','Completed','No-show','Cancelled']);
  const patch={updated_at:new Date().toISOString()};
  if(payload.status!==undefined){const status=clean(payload.status,40);if(!allowedStatuses.has(status))throw new Error('Invalid reservation status.');patch.status=status}
  if(payload.tableLabel!==undefined)patch.table_label=clean(payload.tableLabel,40);
  if(payload.staffNote!==undefined)patch.staff_note=clean(payload.staffNote,500);
  const result=await request(`reservations?id=eq.${encodeURIComponent(id)}&select=${reservationSelect()}`,{method:'PATCH',body:patch});
  return Array.isArray(result)?result[0]:result;
}
exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
  try{
    const{action,payload={}}=JSON.parse(event.body||'{}');let data;
    if(action==='verify'){
      verifyPin(event);
      const name=clean(event.headers['x-sumaq-staff-name']||'',80)||'Staff';
      data={ok:true,token:createToken(name),expiresInHours:12};
    }else{
      readToken(event);
      if(action==='list')data=await listReservations(payload);
      else if(action==='update')data=await updateReservation(payload);
      else throw new Error('Unsupported action.');
    }
    return json(200,{data});
  }catch(error){console.error(error);return json(error.status||400,{error:error.message||'Request failed'})}
};
