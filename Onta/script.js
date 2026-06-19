const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];

const products = [
  {id:'m19', name:'Camiseta Monastery 19 Black Gold', brand:'Monastery', category:'Camisetas', price:269000, badge:'Drop urbano', img:'assets/img/monastery-19.webp', sizes:['S','M','L','XL'], colors:['Negro / Dorado']},
  {id:'pnegra', name:'Polo premium negra Monastery', brand:'Monastery', category:'Polos', price:329000, badge:'Elegancia casual', img:'assets/img/polo-negro.webp', sizes:['S','M','L','XL'], colors:['Negro']},
  {id:'pblanca', name:'Polo premium blanca Monastery', brand:'Monastery', category:'Polos', price:329000, badge:'Look ejecutivo', img:'assets/img/polo-blanco.webp', sizes:['S','M','L','XL'], colors:['Blanco']},
  {id:'jeans', name:'Jeans negro slim destroyed', brand:'ONTA Select', category:'Jeans', price:389000, badge:'Fit exclusivo', img:'assets/img/jeans-premium.webp', sizes:['30','32','34','36'], colors:['Black denim']},
  {id:'basica', name:'Camiseta básica premium ONTA', brand:'ONTA Select', category:'Camisetas', price:179000, badge:'3 colores', img:'assets/img/camisetas-premium.webp', sizes:['S','M','L','XL'], colors:['Naranja','Gris','Negro']},
  {id:'unica', name:'Look Única - crop top premium', brand:'ONTA Women', category:'Mujer', price:219000, badge:'Única', img:'assets/img/model-unica.webp', sizes:['XS','S','M'], colors:['Blanco']},
  {id:'hipnotica', name:'Look Hipnótica - outfit black & white', brand:'ONTA Women', category:'Mujer', price:349000, badge:'Hipnótica', img:'assets/img/model-hipnotica.webp', sizes:['XS','S','M'], colors:['Negro / Blanco']},
  {id:'exotica', name:'Look Exótica - crop contrast', brand:'ONTA Women', category:'Mujer', price:229000, badge:'Exótica', img:'assets/img/model-exotica.webp', sizes:['XS','S','M'], colors:['Blanco / Negro']},
  {id:'armani', name:'Selección Giorgio Armani casual premium', brand:'Giorgio Armani', category:'Camisetas', price:449000, badge:'Marca premium', img:'assets/img/polo-negro.webp', sizes:['S','M','L'], colors:['Negro']},
  {id:'polo', name:'Polo Ralph Lauren estilo clásico', brand:'Polo Ralph Lauren', category:'Polos', price:419000, badge:'Clásico premium', img:'assets/img/polo-blanco.webp', sizes:['S','M','L','XL'], colors:['Blanco']},
  {id:'nike', name:'Nike lifestyle urbano ONTA', brand:'Nike', category:'Camisetas', price:299000, badge:'Lifestyle', img:'assets/img/camisetas-premium.webp', sizes:['S','M','L'], colors:['Negro']}
];

let cart = JSON.parse(localStorage.getItem('ontaCart') || '[]');
const money = n => '$ ' + Number(n || 0).toLocaleString('es-CO');

function renderProducts(filter='Todos'){
  const grid = $('#productGrid');
  if(!grid) return;
  const list = filter === 'Todos' ? products : products.filter(p => p.category === filter);
  grid.innerHTML = list.map(p => `
    <article class="product-card">
      <div class="imgwrap"><img src="${p.img}" alt="${p.name}"><span class="badge">${p.badge}</span></div>
      <div class="product-body">
        <p class="muted">${p.brand} · ${p.category}</p>
        <h3>${p.name}</h3>
        <div class="price">${money(p.price)}</div>
        <div class="option-row">
          <select aria-label="Talla">${p.sizes.map(s=>`<option>${s}</option>`).join('')}</select>
          <select aria-label="Color">${p.colors.map(c=>`<option>${c}</option>`).join('')}</select>
        </div>
        <button class="btn primary full" data-add="${p.id}">Agregar al carrito</button>
      </div>
    </article>
  `).join('');
}

function saveCart(){ localStorage.setItem('ontaCart', JSON.stringify(cart)); }
function cartTotal(){ return cart.reduce((s, i) => s + i.price * i.qty, 0); }
function renderCart(){
  saveCart();
  const count = cart.reduce((s,i)=>s+i.qty,0);
  $('#cartCount') && ($('#cartCount').textContent = count);
  $('#barItems') && ($('#barItems').textContent = `${count} prendas seleccionadas · ${money(cartTotal())}`);
  $('#cartTotal') && ($('#cartTotal').textContent = money(cartTotal()));
  $('#checkoutTotal') && ($('#checkoutTotal').textContent = money(cartTotal()));
  const box = $('#cartItems');
  if(box){
    box.innerHTML = cart.length ? cart.map(i => `
      <div class="cart-item">
        <img src="${i.img}" alt="">
        <div><strong>${i.name}</strong><br><span class="muted">${i.size} · ${i.color} · x${i.qty}</span><br><span>${money(i.price * i.qty)}</span></div>
        <button data-remove="${i.key}">×</button>
      </div>
    `).join('') : '<p class="muted">Tu carrito está vacío. Agrega prendas del catálogo para simular la compra.</p>';
  }
}
function addProduct(id){
  const p = products.find(x=>x.id===id);
  if(!p) return;
  const card = document.querySelector(`[data-add="${id}"]`)?.closest('.product-card');
  const selects = card ? $$('select', card) : [];
  const size = selects[0]?.value || p.sizes[0];
  const color = selects[1]?.value || p.colors[0];
  const key = `${id}-${size}-${color}`;
  const existing = cart.find(i=>i.key===key);
  if(existing) existing.qty += 1;
  else cart.push({...p, key, size, color, qty:1});
  renderCart(); openCart();
}
function openCart(){ $('#cartDrawer')?.classList.add('open'); $('#overlay')?.classList.add('show'); }
function closeCart(){ $('#cartDrawer')?.classList.remove('open'); $('#overlay')?.classList.remove('show'); }
function orderText(){
  const lines = cart.map(i=>`• ${i.name} / ${i.size} / ${i.color} x${i.qty} = ${money(i.price*i.qty)}`);
  return encodeURIComponent(`Hola ONTA STORE, quiero confirmar este pedido:\n\n${lines.join('\n') || 'Quiero recibir asesoría para una compra.'}\n\nTotal: ${money(cartTotal())}`);
}
function sendWhatsApp(){ window.open(`https://wa.me/${window.ONTA_CONFIG.whatsapp}?text=${orderText()}`, '_blank'); }
function payDemo(){
  const subject = encodeURIComponent('Pedido ONTA STORE');
  const body = orderText();
  window.location.href = `mailto:${window.ONTA_CONFIG.email}?subject=${subject}&body=${body}`;
}

renderProducts(); renderCart();
$('#filters')?.addEventListener('click', e => { if(e.target.matches('button')){ $$('#filters button').forEach(b=>b.classList.remove('active')); e.target.classList.add('active'); renderProducts(e.target.dataset.filter); } });
document.addEventListener('click', e => { if(e.target.matches('[data-add]')) addProduct(e.target.dataset.add); if(e.target.matches('[data-remove]')){ cart = cart.filter(i=>i.key!==e.target.dataset.remove); renderCart(); } });
$('#openCart')?.addEventListener('click', openCart); $('#openCart2')?.addEventListener('click', openCart); $('#closeCart')?.addEventListener('click', closeCart); $('#overlay')?.addEventListener('click', closeCart);
$('#demoCart')?.addEventListener('click', () => { cart=[]; ['m19','pnegra','jeans'].forEach(id=>{ const p=products.find(x=>x.id===id); cart.push({...p,key:id+'-demo',size:p.sizes[0],color:p.colors[0],qty:1}); }); renderCart(); openCart(); document.getElementById('pago').scrollIntoView({behavior:'smooth'}); });
$('#whatsappOrder')?.addEventListener('click', sendWhatsApp); $('#whatsappOrder2')?.addEventListener('click', sendWhatsApp); $('#payDemo')?.addEventListener('click', payDemo);
$('.menu-toggle')?.addEventListener('click',()=>$('.nav-links')?.classList.toggle('open')); $$('.nav-links a').forEach(a=>a.addEventListener('click',()=>$('.nav-links')?.classList.remove('open')));
$('#vipForm')?.addEventListener('submit', e => { e.preventDefault(); const data = Object.fromEntries(new FormData(e.target).entries()); data.createdAt = new Date().toISOString(); const clients = JSON.parse(localStorage.getItem('ontaVipClients')||'[]'); clients.push(data); localStorage.setItem('ontaVipClients', JSON.stringify(clients)); $('#vipOk').textContent = 'Registro VIP guardado correctamente.'; e.target.reset(); });
$$('.playBtn').forEach(b=>b.addEventListener('click',()=>{ $('#videoTitle').textContent=b.dataset.video; $('#videoModal').classList.add('show'); $('#overlay').classList.add('show'); }));
$('#closeVideo')?.addEventListener('click',()=>{ $('#videoModal').classList.remove('show'); $('#overlay').classList.remove('show'); });
