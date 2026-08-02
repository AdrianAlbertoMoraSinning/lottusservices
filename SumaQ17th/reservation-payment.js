const PENDING_KEY='sumaqPendingReservation';
const form=document.getElementById('demoPaymentForm');
const pending=JSON.parse(sessionStorage.getItem(PENDING_KEY)||'null');
const card=document.getElementById('cardNumber'),expiry=document.getElementById('expiry');
if(!pending){document.getElementById('paymentDemoMsg').textContent='No pending reservation was found.';form?.querySelector('button')?.setAttribute('disabled','disabled')}
card?.addEventListener('input',()=>card.value=card.value.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim());
expiry?.addEventListener('input',()=>{const v=expiry.value.replace(/\D/g,'').slice(0,4);expiry.value=v.length>2?v.slice(0,2)+'/'+v.slice(2):v});
form?.addEventListener('submit',async e=>{e.preventDefault();if(!pending)return;const button=form.querySelector('button');button.disabled=true;try{const completed={...pending,status:'Booked',paymentStatus:'Deposit paid (demo)',paidAt:new Date().toISOString(),demoPayment:true};await SumaQData.callFunction('create-reservation',completed);sessionStorage.removeItem(PENDING_KEY);sessionStorage.setItem('sumaqReservationCompleted',JSON.stringify(completed));document.getElementById('paymentDemoMsg').textContent='Demo payment approved. Your reservation is now stored centrally.';setTimeout(()=>location.href='payment-success.html?type=reservation',700)}catch(err){document.getElementById('paymentDemoMsg').textContent=err.message;button.disabled=false}});
