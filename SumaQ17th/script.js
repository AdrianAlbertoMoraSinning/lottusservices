const CONFIG_KEY='sumaqReservationConfig';
const RES_KEY='sumaqReservations';
const EVENT_KEY='sumaqEventInquiries';
const DEFAULT_CONFIG={depositRequired:true,adultDeposit:50,minorDeposit:0,currency:'CAD',depositThreshold:4};
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
function calculateDeposit(){const p=totalParty();return p.total>4?50:0}
function updatePartyAndPayment(){const p=totalParty();const partySize=document.getElementById('partySize');if(partySize)partySize.value=`${p.total} guest${p.total===1?'':'s'}`;const amount=calculateDeposit();const payBox=document.getElementById('paymentBox');const noPay=document.getElementById('noPaymentBox');const summary=document.getElementById('paymentSummary');if(payBox&&noPay){if(amount>0){payBox.hidden=false;noPay.hidden=true;if(summary)summary.textContent='Fixed reservation deposit: $50.00 CAD.'}else{payBox.hidden=true;noPay.hidden=false}}}
['adults','minors'].forEach(id=>document.getElementById(id)?.addEventListener('input',updatePartyAndPayment));
updatePartyAndPayment();

async function sendOptionalWebhook(type,data){if(!APPS_SCRIPT_URL)return;try{await fetch(APPS_SCRIPT_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,data})})}catch(e){console.warn('Webhook not available',e)}}

const reservationForm=document.getElementById('reservationForm');
reservationForm?.addEventListener('submit',async e=>{e.preventDefault();const fd=Object.fromEntries(new FormData(reservationForm).entries());const c=config();const p=totalParty();const deposit=calculateDeposit();const reservation={id:uid(),createdAt:new Date().toISOString(),status:deposit>0?'Pending deposit':'Pending confirmation',paymentStatus:deposit>0?'Not paid':'No payment required',depositRequired:deposit>0,depositAmount:deposit,depositThreshold:c.depositThreshold||4,adults:p.adults,minors:p.minors,partySize:p.total,...fd};const items=read(RES_KEY,[]);items.unshift(reservation);write(RES_KEY,items);await sendOptionalWebhook('reservation',reservation);document.getElementById('reservationMsg').textContent=deposit>0?`Reservation saved. Deposit required for this group: ${money(deposit)}. Use the Stripe button to continue.`:`Reservation request saved. No online payment is required for this party size.`;reservationForm.dataset.lastReservationId=reservation.id;});

document.getElementById('payDepositBtn')?.addEventListener('click',()=>{if(calculateDeposit()<=0)return;let reservationId=reservationForm?.dataset.lastReservationId||'';const params=new URLSearchParams({reservationId,amount:'50.00'});window.location.href='reservation-payment.html?'+params.toString();});

const eventForm=document.getElementById('eventForm');
eventForm?.addEventListener('submit',async e=>{e.preventDefault();const inquiry={id:uid(),createdAt:new Date().toISOString(),status:'New',...Object.fromEntries(new FormData(eventForm).entries())};const items=read(EVENT_KEY,[]);items.unshift(inquiry);write(EVENT_KEY,items);await sendOptionalWebhook('private_event',inquiry);document.getElementById('eventMsg').textContent='Private event inquiry saved. SumaQ will contact the guest.';eventForm.reset();});



