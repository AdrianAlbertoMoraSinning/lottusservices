const MODE=document.body.dataset.commerce;
const KEY=`sumaqCart_${MODE}`;
const ORDER_KEY='sumaqCommerceOrders';
const PENDING_ORDER_KEY='sumaqPendingCommerceOrder';
const catalog=window.SUMAQ_CATALOGS?.[MODE]||[];
const read=(k,f=[])=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f))}catch{return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(n||0);
let cart=read(KEY,[]);
function product(id){return catalog.find(p=>p.id===id)}
function total(){return cart.reduce((s,i)=>s+(product(i.id)?.price||0)*i.qty,0)}
function renderCatalog(){
  const root=document.getElementById('catalog');
  if(!root)return;
  const categories=[...new Set(catalog.map(p=>p.category))];
  const requested=new URLSearchParams(location.search).get('category');
  if(requested && !root.dataset.category && categories.includes(requested))root.dataset.category=requested;
  const selected=root.dataset.category||'All';
  const filtered=selected==='All'?catalog:catalog.filter(p=>p.category===selected);
  const filters=`<div class="category-filter" style="grid-column:1/-1">${['All',...categories].map(c=>`<button type="button" class="${selected===c?'active':''}" data-category="${c}">${c}</button>`).join('')}</div>`;
  root.innerHTML=filters+filtered.map(p=>`<article class="product-card"><img src="${p.image}" alt="${p.name}" loading="lazy"><div class="product-copy"><span class="eyebrow">${p.category}</span><h3>${p.name}</h3><p>${p.description}</p><div class="product-meta"><strong>${money(p.price)}</strong><small>per ${p.unit}</small></div><div class="product-order-controls"><label>Quantity<input class="catalog-qty" type="number" min="1" max="99" value="1" aria-label="Quantity for ${p.name}"></label><button class="btn primary add" data-id="${p.id}">Add to order</button></div></div></article>`).join('');
  root.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{root.dataset.category=b.dataset.category;renderCatalog()});
  root.querySelectorAll('.add').forEach(b=>b.onclick=()=>{
    const qty=Math.max(1,Number(b.closest('.product-copy').querySelector('.catalog-qty').value)||1);
    const x=cart.find(i=>i.id===b.dataset.id);
    x?x.qty+=qty:cart.push({id:b.dataset.id,qty});
    write(KEY,cart);renderCart();
  });
}
function renderCart(){
  const root=document.getElementById('cartItems');
  document.querySelectorAll('[data-cart-count]').forEach(x=>x.textContent=cart.reduce((s,i)=>s+i.qty,0));
  if(!root)return;
  root.innerHTML=cart.length?cart.map(i=>{const p=product(i.id);return `<div class="cart-row"><img src="${p.image}" alt=""><div><strong>${p.name}</strong><small>${money(p.price)} / ${p.unit}</small></div><div class="qty"><button type="button" data-act="minus" data-id="${i.id}">−</button><span>${i.qty}</span><button type="button" data-act="plus" data-id="${i.id}">+</button></div><strong>${money(p.price*i.qty)}</strong></div>`}).join(''):'<p class="empty-state">Your cart is empty.</p>';
  document.getElementById('subtotal').textContent=money(total());
  document.getElementById('tax').textContent=money(total()*.05);
  document.getElementById('grandTotal').textContent=money(total()*1.05);
  root.querySelectorAll('button').forEach(b=>b.onclick=()=>{const i=cart.find(x=>x.id===b.dataset.id);if(b.dataset.act==='plus')i.qty++;else i.qty--;cart=cart.filter(x=>x.qty>0);write(KEY,cart);renderCart()});
}
function showReturnMessage(){
  const params=new URLSearchParams(location.search);
  if(params.get('payment')!=='success')return;
  const message=document.getElementById('checkoutMsg');
  const orderId=params.get('order');
  if(message)message.textContent=`Demo payment approved. Pickup order ${orderId||''} is confirmed and paid.`;
  history.replaceState({},'',location.pathname);
}
const form=document.getElementById('checkoutForm');
form?.addEventListener('submit',e=>{
  e.preventDefault();
  if(!cart.length)return alert('Please add at least one item.');
  const fd=Object.fromEntries(new FormData(form).entries());
  const subtotal=Number(total().toFixed(2));
  const tax=Number((subtotal*.05).toFixed(2));
  const order={
    id:'SQ-'+Date.now().toString(36).toUpperCase(),type:MODE,createdAt:new Date().toISOString(),status:'Awaiting payment',paymentStatus:'Pending (demo)',
    items:cart.map(i=>({...i,...product(i.id)})),subtotal,tax,total:Number((subtotal+tax).toFixed(2)),...fd
  };
  const orders=read(ORDER_KEY,[]);orders.unshift(order);write(ORDER_KEY,orders);
  sessionStorage.setItem(PENDING_ORDER_KEY,JSON.stringify(order));
  window.location.href='order-payment.html';
});
renderCatalog();renderCart();showReturnMessage();
