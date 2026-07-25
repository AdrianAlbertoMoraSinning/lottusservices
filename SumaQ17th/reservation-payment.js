const RES_KEY='sumaqReservations';
const PENDING_KEY='sumaqPendingReservation';
const form=document.getElementById('demoPaymentForm');
const card=document.getElementById('cardNumber');
const expiry=document.getElementById('expiry');
const pending=JSON.parse(sessionStorage.getItem(PENDING_KEY)||'null');

if(!pending){
  const message=document.getElementById('paymentDemoMsg');
  if(message)message.textContent='No pending reservation was found. Please return to Reservations and select Book Now again.';
  if(form)form.querySelector('button').disabled=true;
}

card?.addEventListener('input',()=>{
  card.value=card.value.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
});

expiry?.addEventListener('input',()=>{
  const value=expiry.value.replace(/\D/g,'').slice(0,4);
  expiry.value=value.length>2?value.slice(0,2)+'/'+value.slice(2):value;
});

form?.addEventListener('submit',e=>{
  e.preventDefault();
  if(!pending)return;
  const completed={
    ...pending,
    status:'Booked',
    paymentStatus:'Deposit paid (demo)',
    paidAt:new Date().toISOString(),
    demoPayment:true
  };
  const items=JSON.parse(localStorage.getItem(RES_KEY)||'[]');
  items.unshift(completed);
  localStorage.setItem(RES_KEY,JSON.stringify(items));
  sessionStorage.removeItem(PENDING_KEY);
  sessionStorage.setItem('sumaqReservationCompleted',JSON.stringify(completed));
  const button=form.querySelector('button');
  button.disabled=true;
  document.getElementById('paymentDemoMsg').textContent='Demo payment approved. Your reservation is now booked.';
  setTimeout(()=>{window.location.href='payment-success.html?type=reservation';},700);
});
