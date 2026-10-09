const pendingMode=JSON.parse(sessionStorage.getItem('sumaqPendingOrder')||'{}').mode||'pickup';
const PENDING_KEY='sumaqPendingCommerceOrder';
let pending=JSON.parse(sessionStorage.getItem(PENDING_KEY)||'null');
const form=document.getElementById('orderPaymentForm');
const money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(Number(n)||0);
const msg=document.getElementById('orderPaymentMsg');
const button=document.getElementById('orderPayButton');

function renderOrder(order){
  if(!order)return;
  document.getElementById('orderPaymentTotal').textContent=`${money(order.total)} CAD`;
  button.textContent=`Pay ${money(order.total)} securely`;
  document.getElementById('orderSummary').innerHTML=(order.items||[]).map(i=>`<div><span>${Number(i.qty||0)} × ${i.name}</span><strong>${money(Number(i.lineTotal??(Number(i.price||0)*Number(i.qty||0))))}</strong></div>`).join('')+`<div><span>GST</span><strong>${money(order.tax)}</strong></div>`;
}

async function loadAuthoritativeSummary(){
  if(!pending?.id)return;
  try{
    const response=await fetch('/.netlify/functions/sumaq-create-order-checkout',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({publicId:pending.id,preview:true}),
      cache:'no-store'
    });
    const json=await response.json().catch(()=>({}));
    if(!response.ok||!json.order)throw new Error(json.error||'Order summary could not be verified.');
    pending={...pending,...json.order,id:json.order.publicId||pending.id};
    sessionStorage.setItem(PENDING_KEY,JSON.stringify(pending));
    renderOrder(pending);
    if(/^Paid/i.test(pending.paymentStatus||'')){
      msg.textContent='This order is already paid. Please do not pay again.';
      button.disabled=true;
    }
  }catch(error){
    msg.textContent=`${error.message} Please return to Pickup and review your order.`;
    button.disabled=true;
  }
}

if(!pending){
  msg.textContent='No pending order was found.';
  button?.setAttribute('disabled','disabled');
}else{
  renderOrder(pending);
  loadAuthoritativeSummary();
}

if(new URLSearchParams(location.search).get('payment')==='cancelled'){
  msg.textContent='Payment was cancelled. Your order has not been paid. You can try again when ready.';
}

form?.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!pending)return;
  button.disabled=true;
  msg.textContent='Opening secure payment…';
  try{
    const response=await fetch('/.netlify/functions/sumaq-create-order-checkout',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({publicId:pending.id})
    });
    const json=await response.json().catch(()=>({}));
    if(!response.ok||!json.url)throw new Error(json.error||'Secure checkout could not be opened.');
    location.href=json.url;
  }catch(err){
    msg.textContent=err.message;
    button.disabled=false;
  }
});
