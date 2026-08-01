const ORDER_KEY='sumaqCommerceOrders';
const pendingMode=JSON.parse(sessionStorage.getItem('sumaqPendingOrder')||'{}').mode||'pickup';
const CART_KEY='sumaqCart_'+pendingMode;
const PENDING_KEY='sumaqPendingCommerceOrder';
const pending=JSON.parse(sessionStorage.getItem(PENDING_KEY)||'null');
const form=document.getElementById('orderDemoPaymentForm');
const card=document.getElementById('orderCardNumber');
const expiry=document.getElementById('orderExpiry');
const money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(n||0);
if(!pending){
  document.getElementById('orderPaymentMsg').textContent='No pending pickup order was found. Return to Order Pickup and select Pay securely again.';
  form.querySelector('button').disabled=true;
}else{
  document.getElementById('orderPaymentTotal').textContent=`${money(pending.total)} CAD`;
  document.getElementById('orderPayButton').textContent=`Simulate ${money(pending.total)} payment`;
  document.getElementById('orderSummary').innerHTML=pending.items.map(i=>`<div><span>${i.qty} × ${i.name}</span><strong>${money(i.price*i.qty)}</strong></div>`).join('')+`<div><span>GST</span><strong>${money(pending.tax)}</strong></div>`;
}
card?.addEventListener('input',()=>{card.value=card.value.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim()});
expiry?.addEventListener('input',()=>{const value=expiry.value.replace(/\D/g,'').slice(0,4);expiry.value=value.length>2?value.slice(0,2)+'/'+value.slice(2):value});
form?.addEventListener('submit',e=>{
  e.preventDefault();if(!pending)return;
  const orders=JSON.parse(localStorage.getItem(ORDER_KEY)||'[]');
  const index=orders.findIndex(o=>o.id===pending.id);
  const completed={...pending,status:'Confirmed',paymentStatus:'Paid (demo)',paidAt:new Date().toISOString(),demoPayment:true};
  if(index>=0)orders[index]=completed;else orders.unshift(completed);
  localStorage.setItem(ORDER_KEY,JSON.stringify(orders));
  localStorage.setItem(CART_KEY,'[]');
  sessionStorage.removeItem(PENDING_KEY);
  const button=form.querySelector('button');button.disabled=true;
  document.getElementById('orderPaymentMsg').textContent='Demo payment approved. Returning to your confirmed pickup order.';
  setTimeout(()=>{window.location.href=`${pendingMode==='shop'?'shop.html':'order-pickup.html'}?payment=success&order=${encodeURIComponent(completed.id)}`},700);
});
