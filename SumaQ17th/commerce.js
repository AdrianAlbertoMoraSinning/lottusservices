(function(){
'use strict';
const mode=document.body.dataset.commerce||'';
const cartKey='sumaqCart_'+mode;
const pendingKey='sumaqPendingCommerceOrder';
let items=[];
let cart=read(cartKey,[]);
let officialMenu=null;
const initialCategory=new URLSearchParams(location.search).get('category');
let initialCategoryApplied=false;
function read(k,f){try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f))}catch{return f}}
function write(k,v){localStorage.setItem(k,JSON.stringify(v))}
function money(v){return new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(Number(v)||0)}
function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function find(id){return items.find(x=>x.id===id)}
function itemImage(i,extra=''){return i.image?`<img src="${esc(i.image)}" alt="${esc(i.name)}" ${extra}>`:`<div class="product-image-placeholder" role="img" aria-label="${esc(i.name)}"><span>SUMAQ</span><small>on 17th</small></div>`}
function variantPrices(i){return Array.isArray(i.variants)?i.variants.map(v=>Number(v.price)).filter(Number.isFinite):[]}
function priceLabel(i){const ps=variantPrices(i);if(ps.length){const min=Math.min(...ps),max=Math.max(...ps);return min===max?money(min):`${money(min)} – ${money(max)}`}return money(i.price)}
function linePrice(l,i){return Number(l.unitPrice??i?.price??0)}
function lineName(l,i){return l.variantName?`${i.name} — ${l.variantName}`:i.name}
function subtotal(){return cart.reduce((s,l)=>{const i=find(l.id);return s+(i?linePrice(l,i)*Number(l.qty||0):0)},0)}
function setStatus(text,error=false){const el=document.getElementById('checkoutMsg');if(el){el.textContent=text;el.classList.toggle('error',error)}}
async function loadOfficialMenu(){if(mode!=='pickup')return null;try{const r=await fetch('assets/data/official-menu-jan-2026.json',{cache:'no-store'});if(!r.ok)throw new Error('Official menu data unavailable.');officialMenu=await r.json();return officialMenu}catch(error){console.error(error);return null}}
function mergeOfficialCatalog(dbItems){
  if(mode!=='pickup'||!officialMenu?.food)return dbItems||[];
  const central=new Map((dbItems||[]).map(item=>[item.id,item]));
  const merged=officialMenu.food.map(o=>{
    const c=central.get(o.id);central.delete(o.id);
    if(!c)return {...o,active:true};
    return {...o,...c,category:o.category,image:c.image||o.image||'',variants:o.variants||null,optionText:o.optionText||'',sortOrder:Number(o.sortOrder??c.sortOrder??0),active:true};
  });
  central.forEach(item=>{if(item.active!==false&&item.category!=='__system')merged.push(item)});
  return merged.sort((a,b)=>Number(a.sortOrder||0)-Number(b.sortOrder||0)||String(a.name).localeCompare(String(b.name)));
}
function officialFallback(){return (officialMenu?.food||window.SUMAQ_CATALOGS?.pickup||[]).map(i=>({...i,active:true}))}
function ensureDialog(){let d=document.getElementById('productDetailDialog');if(d)return d;d=document.createElement('dialog');d.id='productDetailDialog';d.className='product-detail-dialog';d.innerHTML='<div id="productModalContent"></div>';document.body.appendChild(d);d.addEventListener('click',e=>{if(e.target===d)d.close()});return d}
function openProduct(id){
  const i=find(id);if(!i)return;
  const d=ensureDialog(),c=d.querySelector('#productModalContent');
  const variants=Array.isArray(i.variants)&&i.variants.length?i.variants:null;
  const variantControl=variants?`<label class="variant-select-label">Option<select id="modalVariant">${variants.map(v=>`<option value="${esc(v.id)}">${esc(v.label)} — ${money(v.price)}</option>`).join('')}</select></label>`:'';
  const firstPrice=variants?Number(variants[0].price):Number(i.price);
  c.innerHTML=`<div class="product-modal-grid product-modal-e41"><div class="product-modal-image-wrap">${itemImage(i)}<button class="product-modal-close" type="button" aria-label="Close">×</button></div><div class="product-modal-copy"><span class="eyebrow">${esc(i.category)}</span><div class="product-title-price"><h3>${esc(i.name)}</h3><strong id="modalPrice">${variants?money(firstPrice):priceLabel(i)}</strong></div><p>${esc(i.description)}</p>${i.optionText?`<p class="product-option-note">${esc(i.optionText)}</p>`:''}<div class="product-meta"><small>per ${esc(i.unit)}</small></div>${variantControl}<div class="modal-order"><label>Quantity<input id="modalQty" type="number" min="1" max="99" value="1"></label><button class="btn primary" id="modalAdd" type="button">Add to order ${money(firstPrice)}</button></div></div></div>`;
  c.querySelector('.product-modal-close').onclick=()=>d.close();
  const variantSelect=c.querySelector('#modalVariant'),add=c.querySelector('#modalAdd'),price=c.querySelector('#modalPrice');
  const chosen=()=>variants?variants.find(v=>v.id===variantSelect.value)||variants[0]:null;
  if(variantSelect)variantSelect.onchange=()=>{const v=chosen();price.textContent=money(v.price);add.textContent=`Add to order ${money(v.price)}`};
  add.onclick=()=>{const qty=Math.max(1,Math.min(99,Number(c.querySelector('#modalQty').value)||1));const v=chosen();const variantId=v?.id||'';const line=cart.find(l=>l.id===id&&(l.variantId||'')===variantId);if(line)line.qty+=qty;else cart.push({id,qty,variantId:variantId||undefined,variantName:v?.label||undefined,unitPrice:v?Number(v.price):Number(i.price)});write(cartKey,cart);renderCart();d.close()};
  d.showModal();
}
function renderMenu(){
  const root=document.getElementById('catalog');if(!root)return;
  if(!items.length){root.innerHTML='<div class="catalog-error"><h3>Menu temporarily unavailable</h3><p>The central catalogue could not be loaded.</p></div>';return}
  const cats=[...new Set(items.map(i=>i.category))];
  if(!initialCategoryApplied){
    if(initialCategory&&cats.includes(initialCategory))root.dataset.category=initialCategory;
    initialCategoryApplied=true;
  }
  const selected=root.dataset.category||'All';const visible=selected==='All'?items:items.filter(i=>i.category===selected);
  root.innerHTML='<div class="category-filter" style="grid-column:1/-1">'+['All',...cats].map(c=>`<button type="button" class="${selected===c?'active':''}" data-category="${esc(c)}">${esc(c)}</button>`).join('')+'</div>'+visible.map(i=>`<article class="product-card" tabindex="0" role="button" data-product-id="${esc(i.id)}" aria-label="View ${esc(i.name)}">${itemImage(i,'loading="lazy"')}<div class="product-copy"><span class="eyebrow">${esc(i.category)}</span><h3>${esc(i.name)}</h3><p>${esc(i.description)}</p>${i.optionText?`<p class="product-option-note compact">${esc(i.optionText)}</p>`:''}<div class="product-meta"><strong>${priceLabel(i)}</strong><small>per ${esc(i.unit)}</small></div></div></article>`).join('');
  root.querySelectorAll('[data-category]').forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    const next=b.dataset.category;
    root.dataset.category=next;
    const url=new URL(location.href);
    if(next==='All')url.searchParams.delete('category');else url.searchParams.set('category',next);
    url.hash='catalog';
    history.replaceState({},'',url.pathname+(url.search||'')+url.hash);
    renderMenu();
  });
  root.querySelectorAll('[data-product-id]').forEach(card=>{card.onclick=()=>openProduct(card.dataset.productId);card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openProduct(card.dataset.productId)}}});if(location.hash==='#catalog'){requestAnimationFrame(()=>root.scrollIntoView({block:'start',behavior:'auto'}));}
}
function renderCart(){
  const root=document.getElementById('cartItems');const count=cart.reduce((s,l)=>s+Number(l.qty||0),0);document.querySelectorAll('[data-cart-count]').forEach(n=>n.textContent=count);if(!root)return;
  root.innerHTML=cart.length?cart.map(l=>{const i=find(l.id);return i?`<div class="cart-row">${itemImage(i)}<div><strong>${esc(lineName(l,i))}</strong><small>${money(linePrice(l,i))} / ${esc(i.unit)}</small></div><div class="qty"><button type="button" data-action="minus" data-id="${esc(l.id)}" data-variant="${esc(l.variantId||'')}">−</button><span>${l.qty}</span><button type="button" data-action="plus" data-id="${esc(l.id)}" data-variant="${esc(l.variantId||'')}">+</button></div><strong>${money(linePrice(l,i)*Number(l.qty))}</strong></div>`:''}).join(''):'<p class="empty-state">Your cart is empty. Select a quantity and add your favourites.</p>';
  const sub=subtotal(),tax=sub*.05;document.getElementById('subtotal').textContent=money(sub);document.getElementById('tax').textContent=money(tax);document.getElementById('grandTotal').textContent=money(sub+tax);
  root.querySelectorAll('button[data-action]').forEach(b=>b.onclick=()=>{const l=cart.find(x=>x.id===b.dataset.id&&(x.variantId||'')===b.dataset.variant);if(!l)return;l.qty+=b.dataset.action==='plus'?1:-1;cart=cart.filter(x=>x.qty>0);write(cartKey,cart);renderCart()});
}
function setupMobileCart(){const dock=document.querySelector('.mobile-cart-dock');const panel=document.querySelector('.cart-panel');if(!dock||!panel)return;dock.addEventListener('click',()=>{const open=document.body.classList.toggle('cart-open');dock.firstChild.nodeValue=open?'Close cart · ':'See my cart · ';if(open){panel.scrollTop=0;requestAnimationFrame(()=>panel.scrollTo({top:0,behavior:'auto'}));}else{dock.focus({preventScroll:true});}});}
async function init(){
  try{
    await loadOfficialMenu();
    if(!window.SumaQData?.configured)throw new Error('Central catalogue is not configured.');
    let syncOk=true;
    if(mode==='pickup')try{await SumaQData.callFunction('ensure-menu-jan-2026',{});}catch(error){syncOk=false;console.warn('Official menu sync could not run; using bundled official menu.',error)}
    try{items=mergeOfficialCatalog(await SumaQData.catalog(mode));}catch(error){if(mode==='pickup'&&officialMenu){items=officialFallback();}else throw error;}
    if(mode==='pickup'&&!syncOk)items=mergeOfficialCatalog(items);
    cart=cart.filter(l=>find(l.id));write(cartKey,cart);
    renderMenu();renderCart();setupMobileCart();const params=new URLSearchParams(location.search);if(params.get('payment')==='success'){setStatus(`Demo payment approved. Order ${params.get('order')||''} is confirmed and shared with SumaQ.`);history.replaceState({},'',location.pathname)}
  }catch(err){console.error(err);renderMenu();setStatus(err.message,true)}
}
const form=document.getElementById('checkoutForm');form?.addEventListener('submit',async e=>{
  e.preventDefault();if(!cart.length){alert('Please add at least one item to your order.');return}if(!form.reportValidity())return;if(!window.SumaQData?.configured){setStatus('Central ordering is not configured yet.',true);return}const button=form.querySelector('button[type="submit"]');button.disabled=true;
  try{const customer=Object.fromEntries(new FormData(form).entries()),sub=Number(subtotal().toFixed(2)),tax=Number((sub*.05).toFixed(2));const order={id:'SQ-'+Date.now().toString(36).toUpperCase(),type:mode,createdAt:new Date().toISOString(),status:'Awaiting payment',paymentStatus:'Pending (demo)',items:cart.map(l=>{const i=find(l.id),variantSlug=l.variantId?`${i.id}-${l.variantId}`:i.id;return {...i,id:variantSlug,name:lineName(l,i),price:linePrice(l,i),qty:l.qty}}),subtotal:sub,tax,total:Number((sub+tax).toFixed(2)),...customer};await SumaQData.callFunction('create-order',order);sessionStorage.setItem(pendingKey,JSON.stringify(order));sessionStorage.setItem('sumaqPendingOrder',JSON.stringify({mode}));location.href='order-payment.html'}catch(err){setStatus(err.message,true);button.disabled=false}
});
init();
}());
