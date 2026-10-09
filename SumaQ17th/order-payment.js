const pendingMode=JSON.parse(sessionStorage.getItem('sumaqPendingOrder')||'{}').mode||'pickup';
const PENDING_KEY='sumaqPendingCommerceOrder';
const pending=JSON.parse(sessionStorage.getItem(PENDING_KEY)||'null');
const form=document.getElementById('orderPaymentForm');
const money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(n||0);
const msg=document.getElementById('orderPaymentMsg');

if(!pending){
  msg.textContent='No pending order was found.';
  form?.querySelector('button')?.setAttribute('disabled','disabled');
}else{
  document.getElementById('orderPaymentTotal').textContent=`${money(pending.total)} CAD`;
  document.getElementById('orderPayButton').textContent=`Pay ${money(pending.total)} securely`;
  document.getElementById('orderSummary').innerHTML=pending.items.map(i=>`<div><span>${i.qty} × ${i.name}</span><strong>${money(i.price*i.qty)}</strong></div>`).join('')+`<div><span>GST</span><strong>${money(pending.tax)}</strong></div>`;
}

if(new URLSearchParams(location.search).get('payment')==='cancelled'){
  msg.textContent='Payment was cancelled. Your order has not been paid. You can try again when ready.';
}

form?.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!pending)return;
  const button=form.querySelector('button');
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
