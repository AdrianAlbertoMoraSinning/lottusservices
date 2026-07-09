const CONFIG_KEY='sumaqReservationConfig';
const RES_KEY='sumaqReservations';
const EVENT_KEY='sumaqEventInquiries';
const DEFAULT_CONFIG={depositRequired:true,adultDeposit:20,minorDeposit:10,currency:'CAD',depositThreshold:4};
const APPS_SCRIPT_URL='';

const toggle=document.querySelector('.menu-toggle');
const nav=document.querySelector('.nav-links');
toggle?.addEventListener('click',()=>nav.classList.toggle('open'));
document.querySelectorAll('.nav-links a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));

function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}}
function write(key,value){localStorage.setItem(key,JSON.stringify(value))}
function config(){return {...DEFAULT_CONFIG,...read(CONFIG_KEY,DEFAULT_CONFIG)}}
function money(n){return `$${Number(n||0).toFixed(2)} CAD`}
function uid(){return 'SUMAQ-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,7).toUpperCase()}
function totalParty(){const a=Number(document.getElementById('adults')?.value||0);const m=Number(document.getElementById('minors')?.value||0);return {adults:a,minors:m,total:a+m}}
function calculateDeposit(){const c=config();const p=totalParty();const threshold=Number(c.depositThreshold||4);return c.depositRequired && p.total>threshold ? (p.adults*Number(c.adultDeposit||0)+p.minors*Number(c.minorDeposit||0)) : 0}
function updatePartyAndPayment(){const p=totalParty();const partySize=document.getElementById('partySize');if(partySize)partySize.value=`${p.total} guest${p.total===1?'':'s'}`;const c=config();const amount=calculateDeposit();const payBox=document.getElementById('paymentBox');const noPay=document.getElementById('noPaymentBox');const summary=document.getElementById('paymentSummary');if(payBox&&noPay){if(amount>0){payBox.hidden=false;noPay.hidden=true;summary.textContent=`Party size: ${p.total}. Adults: ${p.adults} × ${money(c.adultDeposit)} · Minors: ${p.minors} × ${money(c.minorDeposit)} · Total deposit: ${money(amount)}.`}else{payBox.hidden=true;noPay.hidden=false}}}
['adults','minors'].forEach(id=>document.getElementById(id)?.addEventListener('input',updatePartyAndPayment));
updatePartyAndPayment();

async function sendOptionalWebhook(type,data){if(!APPS_SCRIPT_URL)return;try{await fetch(APPS_SCRIPT_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,data})})}catch(e){console.warn('Webhook not available',e)}}

const reservationForm=document.getElementById('reservationForm');
reservationForm?.addEventListener('submit',async e=>{e.preventDefault();const fd=Object.fromEntries(new FormData(reservationForm).entries());const c=config();const p=totalParty();const deposit=calculateDeposit();const reservation={id:uid(),createdAt:new Date().toISOString(),status:deposit>0?'Pending deposit':'Pending confirmation',paymentStatus:deposit>0?'Not paid':'No payment required',depositRequired:deposit>0,depositAmount:deposit,depositThreshold:c.depositThreshold||4,adults:p.adults,minors:p.minors,partySize:p.total,...fd};const items=read(RES_KEY,[]);items.unshift(reservation);write(RES_KEY,items);await sendOptionalWebhook('reservation',reservation);document.getElementById('reservationMsg').textContent=deposit>0?`Reservation saved. Deposit required for this group: ${money(deposit)}. Use the Stripe button to continue.`:`Reservation request saved. No online payment is required for this party size.`;reservationForm.dataset.lastReservationId=reservation.id;});

document.getElementById('payDepositBtn')?.addEventListener('click',async()=>{const amount=calculateDeposit();if(amount<=0)return;let reservationId=reservationForm?.dataset.lastReservationId;if(!reservationId){document.getElementById('reservationMsg').textContent='First submit the reservation request, then continue to payment.';return}const msg=document.getElementById('reservationMsg');msg.textContent='Preparing secure Stripe checkout...';try{const response=await fetch('/.netlify/functions/sumaq-create-reservation-checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reservationId,amount,description:'SumaQ on 17th reservation deposit'})});const data=await response.json();if(data.url){window.location.href=data.url}else{msg.textContent=data.error||'Stripe payment could not be started. Reservation remains saved as pending deposit.'}}catch(err){msg.textContent='Stripe is not configured in this prototype environment. Reservation remains saved as pending deposit.'}});

const eventForm=document.getElementById('eventForm');
eventForm?.addEventListener('submit',async e=>{e.preventDefault();const inquiry={id:uid(),createdAt:new Date().toISOString(),status:'New',...Object.fromEntries(new FormData(eventForm).entries())};const items=read(EVENT_KEY,[]);items.unshift(inquiry);write(EVENT_KEY,items);await sendOptionalWebhook('private_event',inquiry);document.getElementById('eventMsg').textContent='Private event inquiry saved. SumaQ will contact the guest.';eventForm.reset();});

const menuLinks={
  'Main Menu':'#menu',
  'Nikkei':'#menu',
  'Cocktails':'#menu'
};
const menuDialog=document.getElementById('menuDialog');
document.querySelectorAll('.menu-btn').forEach(btn=>btn.addEventListener('click',()=>{const name=btn.dataset.menu||'Menu';document.getElementById('menuDialogTitle').textContent=name;document.getElementById('menuDialogText').textContent=`${name} is ready to connect to the final PDF or existing restaurant menu link.`;const link=document.getElementById('menuDialogLink');link.href=menuLinks[name]||'#menu';link.textContent='View Here';menuDialog?.showModal()}));
document.querySelector('.dialog-close')?.addEventListener('click',()=>menuDialog?.close());

document.getElementById('botDemoBtn')?.addEventListener('click',()=>alert('SumaQ Assistant placeholder: connect chatbot script here when ready.'));
