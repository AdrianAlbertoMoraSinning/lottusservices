(function(){
'use strict';
const $=id=>document.getElementById(id);
const API='/.netlify/functions/sumaq-staff-reservations';
const STATUS_OPTIONS=['New','Booked','Awaiting deposit','Confirmed','Seated','Completed','No-show','Cancelled'];
let token=sessionStorage.getItem('sumaqStaffReservationsToken')||'';
let staffName=sessionStorage.getItem('sumaqStaffReservationsName')||'';
let view='today',selectedDate='',rows=[],activities=[],current=null,refreshTimer=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>{const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`};
const fmtTime=v=>{if(!v)return '—';const [h,m]=String(v).split(':').map(Number);const d=new Date(2000,0,1,h||0,m||0);return d.toLocaleTimeString('en-CA',{hour:'numeric',minute:'2-digit'}).replace('a.m.','AM').replace('p.m.','PM')};
const fmtDay=v=>{if(!v)return {day:'—',mon:''};const d=new Date(v+'T12:00:00');return {day:String(d.getDate()),mon:d.toLocaleDateString('en-CA',{month:'short'}).toUpperCase()}};
const fmtDateLong=v=>v?new Date(v+'T12:00:00').toLocaleDateString('en-CA',{weekday:'long',month:'long',day:'numeric'}):'Today';
const fmtActivityTime=v=>v?new Date(v).toLocaleTimeString('en-CA',{hour:'numeric',minute:'2-digit'}):'';
function message(id,text,error=true){const el=$(id);if(!el)return;el.textContent=text||'';el.style.color=error?'#bd3349':'#14805e'}
async function call(action,payload={},loginPin=''){
  const headers={'Content-Type':'application/json','X-Sumaq-Staff-Name':staffName};
  if(action==='verify')headers['X-Sumaq-Staff-Pin']=loginPin;else headers['X-Sumaq-Staff-Token']=token;
  const response=await fetch(API,{method:'POST',headers,body:JSON.stringify({action,payload}),cache:'no-store'});
  const json=await response.json().catch(()=>({}));
  if(!response.ok){const err=new Error(json.error||'Request failed');err.status=response.status;throw err}
  return json.data;
}
function statusLabel(status){return status==='Booked'?'Reserved':status||'Reserved'}
function depositClass(r){return /paid/i.test(r.payment_status||'')?'paid':'pending'}
function render(){
  $('staffReservationCount').textContent=`${rows.length} reservation${rows.length===1?'':'s'}`;
  $('staffGuestCount').textContent=rows.reduce((s,r)=>s+Number(r.party_size||0),0);
  $('staffDayLabel').textContent=view==='upcoming'?'Upcoming reservations':fmtDateLong(selectedDate||today());
  $('staffEmpty').classList.toggle('hidden',rows.length>0);
  $('staffReservationList').innerHTML=rows.map(r=>{
    const date=fmtDay(r.reservation_date),name=`${r.first_name||''} ${r.last_name||''}`.trim()||'Guest';
    return `<article class="staff-reservation-card" data-id="${esc(r.id)}">
      <div class="staff-date-badge"><strong>${esc(date.day)}</strong><span>${esc(date.mon)}</span></div>
      <div class="staff-card-main">
        <h3>${esc(name)}</h3>
        <div class="staff-meta"><span><b>${esc(fmtTime(r.reservation_time))}</b></span><span>👤 ${Number(r.party_size||0)}</span>${r.table_label?`<span>◉ ${esc(r.table_label)}</span>`:''}</div>
        ${r.notes?`<p class="staff-card-note">${esc(r.notes)}</p>`:''}
        <span class="staff-deposit ${depositClass(r)}">${esc(r.payment_status||'No payment required')}</span>
      </div>
      <div class="staff-card-actions">
        <select class="staff-status-select" data-status-id="${esc(r.id)}" aria-label="Reservation status">${STATUS_OPTIONS.map(s=>`<option value="${esc(s)}"${s===r.status?' selected':''}>${esc(statusLabel(s))}</option>`).join('')}</select>
        <button class="staff-table-pill" data-open-id="${esc(r.id)}" type="button">${esc(r.table_label||'Assign table')}</button>
      </div>
    </article>`}).join('');
  renderActivity();
}
function renderActivity(){
  $('staffActivity').innerHTML=activities.length?activities.map(a=>`<article class="staff-activity-item"><div class="staff-activity-icon">${a.action==='New reservation'?'＋':'↻'}</div><div><strong>${esc(a.action)}</strong><p>${esc(a.details||'Reservation activity')}</p></div><span class="staff-activity-time">${esc(fmtActivityTime(a.created_at))}</span></article>`).join(''):'<div class="staff-empty"><strong>No activity yet</strong><p>Reservation changes will appear here.</p></div>';
}
async function load(showLoading=true){
  if(showLoading)$('staffReservationList').innerHTML='<div class="staff-loading">Loading reservations…</div>';
  try{
    const date=selectedDate||today();
    const data=await call('list',{mode:view,date});
    rows=data.reservations||[];activities=data.activity||[];render();
  }catch(err){
    if(err.status===401){logout('Staff access expired. Please enter the PIN again.');return}
    $('staffReservationList').innerHTML=`<div class="staff-empty"><strong>Could not load reservations</strong><p>${esc(err.message)}</p></div>`;
  }
}
async function login(){
  staffName=$('staffName').value.trim();const loginPin=$('staffPin').value.trim();
  if(!staffName||!loginPin){message('staffLoginMsg','Enter your name and staff PIN.');return}
  try{
    message('staffLoginMsg','Checking access…',false);const verified=await call('verify',{},loginPin);token=verified.token;
    sessionStorage.setItem('sumaqStaffReservationsToken',token);sessionStorage.setItem('sumaqStaffReservationsName',staffName);
    $('staffLogin').classList.add('hidden');$('staffApp').classList.remove('hidden');selectedDate=today();$('staffDate').value=selectedDate;message('staffLoginMsg','');await load();startAutoRefresh();
  }catch(err){message('staffLoginMsg',err.message)}
}
function logout(msg=''){
  token='';sessionStorage.removeItem('sumaqStaffReservationsToken');sessionStorage.removeItem('sumaqStaffReservationsName');clearInterval(refreshTimer);refreshTimer=null;
  $('staffApp').classList.add('hidden');$('staffLogin').classList.remove('hidden');$('staffPin').value='';if(msg)message('staffLoginMsg',msg);
}
function startAutoRefresh(){clearInterval(refreshTimer);refreshTimer=setInterval(()=>load(false),45000)}
function openModal(id){
  current=rows.find(r=>r.id===id);if(!current)return;
  const name=`${current.first_name||''} ${current.last_name||''}`.trim()||'Guest';$('staffModalTitle').textContent=name;
  const details=[['Date',fmtDateLong(current.reservation_date)],['Time',fmtTime(current.reservation_time)],['Party',`${current.party_size||0} guests (${current.adults||0} adults, ${current.minors||0} minors)`],['Phone',current.phone||'—'],['Email',current.email||'—'],['Deposit',`${current.deposit_amount?`$${Number(current.deposit_amount).toFixed(2)} · `:''}${current.payment_status||'—'}`],['Guest notes',current.notes||'—']];
  $('staffDetailGrid').innerHTML=details.map(([a,b])=>`<div class="staff-detail"><small>${esc(a)}</small><strong>${esc(b)}</strong></div>`).join('');
  $('staffModalStatus').innerHTML=STATUS_OPTIONS.map(s=>`<option value="${esc(s)}"${s===current.status?' selected':''}>${esc(statusLabel(s))}</option>`).join('');
  $('staffModalTable').value=current.table_label||'';$('staffModalNote').value=current.staff_note||'';message('staffModalMsg','');$('staffReservationModal').classList.remove('hidden');
}
function closeModal(){$('staffReservationModal').classList.add('hidden');current=null}
async function saveModal(){
  if(!current)return;const btn=$('staffModalSave');btn.disabled=true;
  try{message('staffModalMsg','Saving…',false);await call('update',{id:current.id,status:$('staffModalStatus').value,tableLabel:$('staffModalTable').value.trim(),staffNote:$('staffModalNote').value.trim()});message('staffModalMsg','Saved.',false);await load(false);setTimeout(closeModal,350)}catch(err){message('staffModalMsg',err.message)}finally{btn.disabled=false}
}
async function quickStatus(id,status){try{await call('update',{id,status});await load(false)}catch(err){alert(err.message);await load(false)}}
$('staffLoginBtn').onclick=login;$('staffPin').addEventListener('keydown',e=>{if(e.key==='Enter')login()});$('staffLogout').onclick=()=>logout();$('staffRefresh').onclick=()=>load();
document.querySelectorAll('.staff-tabs button').forEach(btn=>btn.onclick=()=>{view=btn.dataset.view;document.querySelectorAll('.staff-tabs button').forEach(b=>b.classList.toggle('active',b===btn));$('staffDateRow').classList.toggle('hidden',view!=='date');selectedDate=view==='today'?today():(view==='date'?($('staffDate').value||today()):today());load()});
$('staffDate').onchange=()=>{selectedDate=$('staffDate').value||today();if(view==='date')load()};
document.addEventListener('click',e=>{const b=e.target.closest('[data-open-id]');if(b)openModal(b.dataset.openId)});
document.addEventListener('change',e=>{if(e.target.matches('[data-status-id]'))quickStatus(e.target.dataset.statusId,e.target.value)});
$('staffModalClose').onclick=$('staffModalCancel').onclick=closeModal;$('staffModalSave').onclick=saveModal;$('staffReservationModal').addEventListener('click',e=>{if(e.target===$('staffReservationModal'))closeModal()});
(async()=>{if(token&&staffName){try{$('staffLogin').classList.add('hidden');$('staffApp').classList.remove('hidden');selectedDate=today();$('staffDate').value=selectedDate;await load();startAutoRefresh()}catch(_){logout()}}})();
}());
