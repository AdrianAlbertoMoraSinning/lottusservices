(function(){
'use strict';
const mode=document.body.dataset.commerce||'';
const cartKey='sumaqCart_'+mode;
const pendingKey='sumaqPendingCommerceOrder';
let items=[];
let cart=read(cartKey,[]);
const CLIENT_IMAGE_OVERRIDES={
  'beef-empanada':'assets/menu-1920/empanadas.webp',
  'chicken-empanada':'assets/menu-1920/empanadas.webp',
  'aji-gallina-empanada':'assets/menu-1920/empanadas.webp',
  'tacos-pork-belly':'assets/menu-1920/tacos-sumaq.webp',
  'pork-belly-ceviche':'assets/menu-1920/pork-ceviche.webp',
  'inca-salad':'assets/menu-1920/inka-salad.webp',
  'polleria-salad':'assets/menu-1920/ensalada-verde.webp',
  'jalea-tacos':'assets/menu-1920/camarones-crocantes.webp',
  'causita-sumaq':'assets/menu-1920/causita-sumaq.webp',
  'tiradito':'assets/menu-1920/tiradito.webp',
  'ceviche':'assets/menu-1920/ceviche-clasico.webp',
  'ceviche-sumaq':'assets/menu-1920/ceviche-sumaq.webp',
  'lomo-saltado':'assets/menu-1920/lomo-saltado.webp',
  'chaufa-aeropuerto':'assets/menu-1920/chaufa.webp',
  'anticuchos':'assets/menu-1920/anticucho.webp',
  'seco-norteno':'assets/menu-1920/seco-norteno.webp',
  'tallarines-abuela':'assets/menu-1920/tallarines-de-la-abuela.webp',
  'pollo-brasa':'assets/menu-1920/pollo-a-la-brasa.webp',
  'aji-gallina':'assets/menu-1920/aji-de-gallina.webp',
  'adobo-cerdo':'assets/menu-1920/adobo.webp',
  'violetas-shrimp':'assets/menu-1920/violeta-shrimp.webp',
  'picarones':'assets/menu-1920/picarones.webp'
};
function applyClientImage(item){const image=CLIENT_IMAGE_OVERRIDES[item.id];return image?{...item,image}:item}

function read(k,f){try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f))}catch{return f}}
function write(k,v){localStorage.setItem(k,JSON.stringify(v))}
function money(v){return new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(Number(v)||0)}
function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function find(id){return items.find(x=>x.id===id)}
function subtotal(){return cart.reduce((s,l)=>{const i=find(l.id);return s+(i?Number(i.price)*Number(l.qty||0):0)},0)}
function setStatus(text,error=false){const el=document.getElementById('checkoutMsg');if(el){el.textContent=text;el.classList.toggle('error',error)}}
function ensureDialog(){let d=document.getElementById('productDetailDialog');if(d)return d;d=document.createElement('dialog');d.id='productDetailDialog';d.className='product-detail-dialog';d.innerHTML='<div id="productModalContent"></div>';document.body.appendChild(d);d.addEventListener('click',e=>{if(e.target===d)d.close()});return d}
function openProduct(id){const i=find(id);if(!i)return;const d=ensureDialog(),c=d.querySelector('#productModalContent');c.innerHTML=`<div class="product-modal-grid product-modal-e41"><div class="product-modal-image-wrap"><img src="${esc(i.image)}" alt="${esc(i.name)}"><button class="product-modal-close" type="button" aria-label="Close">×</button></div><div class="product-modal-copy"><span class="eyebrow">${esc(i.category)}</span><div class="product-title-price"><h3>${esc(i.name)}</h3><strong>${money(i.price)}</strong></div><p>${esc(i.description)}</p><div class="product-meta"><small>per ${esc(i.unit)}</small></div><div class="modal-order"><label>Quantity<input id="modalQty" type="number" min="1" max="99" value="1"></label><button class="btn primary" id="modalAdd" type="button">Add to order ${money(i.price)}</button></div></div></div>`;c.querySelector('.product-modal-close').onclick=()=>d.close();c.querySelector('#modalAdd').onclick=()=>{const qty=Math.max(1,Math.min(99,Number(c.querySelector('#modalQty').value)||1));const line=cart.find(l=>l.id===id);if(line)line.qty+=qty;else cart.push({id,qty});write(cartKey,cart);renderCart();d.close()};d.showModal()}
function renderMenu(){const root=document.getElementById('catalog');if(!root)return;if(!items.length){root.innerHTML='<div class="catalog-error"><h3>Menu temporarily unavailable</h3><p>The central catalogue could not be loaded.</p></div>';return}const cats=[...new Set(items.map(i=>i.category))];const q=new URLSearchParams(location.search).get('category');if(q&&cats.includes(q))root.dataset.category=q;const selected=root.dataset.category||'All';const visible=selected==='All'?items:items.filter(i=>i.category===selected);root.innerHTML='<div class="category-filter" style="grid-column:1/-1">'+['All',...cats].map(c=>`<button type="button" class="${selected===c?'active':''}" data-category="${esc(c)}">${esc(c)}</button>`).join('')+'</div>'+visible.map(i=>`<article class="product-card" tabindex="0" role="button" data-product-id="${esc(i.id)}" aria-label="View ${esc(i.name)}"><img src="${esc(i.image)}" alt="${esc(i.name)}" loading="lazy"><div class="product-copy"><span class="eyebrow">${esc(i.category)}</span><h3>${esc(i.name)}</h3><p>${esc(i.description)}</p><div class="product-meta"><strong>${money(i.price)}</strong><small>per ${esc(i.unit)}</small></div></div></article>`).join('');root.querySelectorAll('[data-category]').forEach(b=>b.onclick=e=>{e.stopPropagation();root.dataset.category=b.dataset.category;renderMenu()});root.querySelectorAll('[data-product-id]').forEach(card=>{card.onclick=()=>openProduct(card.dataset.productId);card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openProduct(card.dataset.productId)}}})}
function renderCart(){const root=document.getElementById('cartItems');const count=cart.reduce((s,l)=>s+Number(l.qty||0),0);document.querySelectorAll('[data-cart-count]').forEach(n=>n.textContent=count);if(!root)return;root.innerHTML=cart.length?cart.map(l=>{const i=find(l.id);return i?`<div class="cart-row"><img src="${esc(i.image)}" alt=""><div><strong>${esc(i.name)}</strong><small>${money(i.price)} / ${esc(i.unit)}</small></div><div class="qty"><button type="button" data-action="minus" data-id="${esc(l.id)}">−</button><span>${l.qty}</span><button type="button" data-action="plus" data-id="${esc(l.id)}">+</button></div><strong>${money(Number(i.price)*Number(l.qty))}</strong></div>`:''}).join(''):'<p class="empty-state">Your cart is empty. Select a quantity and add your favourites.</p>';const sub=subtotal(),tax=sub*.05;document.getElementById('subtotal').textContent=money(sub);document.getElementById('tax').textContent=money(tax);document.getElementById('grandTotal').textContent=money(sub+tax);root.querySelectorAll('button[data-action]').forEach(b=>b.onclick=()=>{const l=cart.find(x=>x.id===b.dataset.id);if(!l)return;l.qty+=b.dataset.action==='plus'?1:-1;cart=cart.filter(x=>x.qty>0);write(cartKey,cart);renderCart()})}
function setupMobileCart(){const dock=document.querySelector('.mobile-cart-dock');const panel=document.querySelector('.cart-panel');if(!dock||!panel)return;dock.addEventListener('click',()=>{const open=document.body.classList.toggle('cart-open');dock.firstChild.nodeValue=open?'Close cart · ':'See my cart · ';if(open){panel.scrollTop=0;requestAnimationFrame(()=>panel.scrollTo({top:0,behavior:'auto'}));}else{dock.focus({preventScroll:true});}});}
async function init(){try{if(!window.SumaQData?.configured)throw new Error('Central catalogue is not configured.');items=(await SumaQData.catalog(mode)).map(applyClientImage);renderMenu();renderCart();setupMobileCart();const params=new URLSearchParams(location.search);if(params.get('payment')==='success'){setStatus(`Demo payment approved. Order ${params.get('order')||''} is confirmed and shared with SumaQ.`);history.replaceState({},'',location.pathname)}}catch(err){console.error(err);renderMenu();setStatus(err.message,true)}}
const form=document.getElementById('checkoutForm');form?.addEventListener('submit',async e=>{e.preventDefault();if(!cart.length){alert('Please add at least one item to your order.');return}if(!form.reportValidity())return;if(!window.SumaQData?.configured){setStatus('Central ordering is not configured yet.',true);return}const button=form.querySelector('button[type="submit"]');button.disabled=true;try{const customer=Object.fromEntries(new FormData(form).entries()),sub=Number(subtotal().toFixed(2)),tax=Number((sub*.05).toFixed(2));const order={id:'SQ-'+Date.now().toString(36).toUpperCase(),type:mode,createdAt:new Date().toISOString(),status:'Awaiting payment',paymentStatus:'Pending (demo)',items:cart.map(l=>{const i=find(l.id);return {...i,qty:l.qty}}),subtotal:sub,tax,total:Number((sub+tax).toFixed(2)),...customer};await SumaQData.callFunction('create-order',order);sessionStorage.setItem(pendingKey,JSON.stringify(order));sessionStorage.setItem('sumaqPendingOrder',JSON.stringify({mode}));location.href='order-payment.html'}catch(err){setStatus(err.message,true);button.disabled=false}});
init();
}());
