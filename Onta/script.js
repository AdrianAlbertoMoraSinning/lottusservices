const cfg = window.ONTA_CONFIG || { whatsapp:'573168749334', email:'ventas@onta.com.co' };
const money = n => '$ ' + Number(n || 0).toLocaleString('es-CO');

const products = [
  {id:'p1', name:'Camiseta Monastery 19 Black Gold', brand:'Monastery', cat:'Camisetas', price:269000, img:'assets/img/monastery-19.webp', badge:'Drop urbano', sizes:['S','M','L','XL'], colors:['Negro / Dorado']},
  {id:'p2', name:'Polo premium negra Monastery', brand:'Monastery', cat:'Polos', price:329000, img:'assets/img/polo-negro.webp', badge:'Elegancia casual', sizes:['S','M','L','XL'], colors:['Negro']},
  {id:'p3', name:'Polo premium blanca Monastery', brand:'Monastery', cat:'Polos', price:329000, img:'assets/img/polo-blanco.webp', badge:'Look ejecutivo', sizes:['S','M','L','XL'], colors:['Blanco']},
  {id:'p4', name:'Jeans negro slim destroyed', brand:'ONTA Select', cat:'Jeans', price:389000, img:'assets/img/jeans-premium.webp', badge:'Fit exclusivo', sizes:['30','32','34','36'], colors:['Black denim']},
  {id:'p5', name:'Camiseta básica premium ONTA', brand:'ONTA Select', cat:'Camisetas', price:179000, img:'assets/img/camisetas-premium.webp', badge:'3 colores', sizes:['S','M','L','XL'], colors:['Naranja','Gris','Negro']},
  {id:'p6', name:'Look Única - crop top premium', brand:'ONTA Women', cat:'Mujer', price:219000, img:'assets/img/model-unica.webp', badge:'Única', sizes:['XS','S','M'], colors:['Blanco']},
  {id:'p7', name:'Look Hipnótica - outfit black & white', brand:'ONTA Women', cat:'Mujer', price:349000, img:'assets/img/model-hipnotica.webp', badge:'Hipnótica', sizes:['XS','S','M'], colors:['Negro / Blanco']},
  {id:'p8', name:'Look Exótica - crop contrast', brand:'ONTA Women', cat:'Mujer', price:229000, img:'assets/img/model-exotica.webp', badge:'Exótica', sizes:['XS','S','M'], colors:['Blanco / Negro']},
  {id:'p9', name:'Selección Giorgio Armani casual premium', brand:'Giorgio Armani', cat:'Camisetas', price:449000, img:'assets/img/polo-negro.webp', badge:'Marca premium', sizes:['S','M','L'], colors:['Negro']},
  {id:'p10', name:'Polo Ralph Lauren estilo clásico', brand:'Polo Ralph Lauren', cat:'Polos', price:419000, img:'assets/img/polo-blanco.webp', badge:'Clásico premium', sizes:['S','M','L','XL'], colors:['Blanco']},
  {id:'p11', name:'Nike lifestyle urbano ONTA', brand:'Nike', cat:'Camisetas', price:299000, img:'assets/img/camisetas-premium.webp', badge:'Lifestyle', sizes:['S','M','L','XL'], colors:['Negro','Gris']}
];

let cart = JSON.parse(localStorage.getItem('ontaCart') || '[]');

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function renderProducts(filter='Todos'){
  const grid = $('#productGrid');
  if(!grid) return;
  const list = filter === 'Todos' ? products : products.filter(p => p.cat === filter);
  grid.innerHTML = list.map(p => `
    <article class="product-card">
      <div class="imgwrap"><img src="${p.img}" alt="${p.name}"><span class="badge">${p.badge}</span></div>
      <div class="product-body">
        <p class="muted">${p.brand} · ${p.cat}</p>
        <h3>${p.name}</h3>
        <div class="price">${money(p.price)}</div>
        <div class="option-row">
          <select id="size-${p.id}">${p.sizes.map(s=>`<option>${s}</option>`).join('')}</select>
          <select id="color-${p.id}">${p.colors.map(c=>`<option>${c}</option>`).join('')}</select>
        </div>
        <button class="btn primary full" onclick="addToCart('${p.id}')">Agregar al carrito</button>
      </div>
    </article>`).join('');
}

function saveCart(){ localStorage.setItem('ontaCart', JSON.stringify(cart)); updateCart(); }
function addToCart(id){
  const p = products.find(x => x.id === id);
  const size = $(`#size-${id}`)?.value || '';
  const color = $(`#color-${id}`)?.value || '';
  cart.push({...p, size, color, key: Date.now()+Math.random()});
  saveCart();
  openCart();
}
window.addToCart = addToCart;

function removeFromCart(key){ cart = cart.filter(x => String(x.key) !== String(key)); saveCart(); }
window.removeFromCart = removeFromCart;

function total(){ return cart.reduce((s,p)=>s+p.price,0); }
function updateCart(){
  $('#cartCount').textContent = cart.length;
  $('#barItems').textContent = `${cart.length} prendas seleccionadas · ${money(total())}`;
  $('#checkoutTotal').textContent = money(total());
  $('#cartTotal').textContent = money(total());
  const box = $('#cartItems');
  if(!box) return;
  if(!cart.length){
    box.innerHTML = '<p class="muted">Tu carrito está vacío. Agrega prendas del catálogo para simular la compra.</p>';
    return;
  }
  box.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.img}" alt="${item.name}">
      <div><strong>${item.name}</strong><p class="muted">${item.size} · ${item.color}</p><b>${money(item.price)}</b></div>
      <button onclick="removeFromCart('${item.key}')">×</button>
    </div>`).join('');
}
function orderText(){
  const lines = cart.length ? cart.map((p,i)=>`${i+1}. ${p.name} | ${p.size} | ${p.color} | ${money(p.price)}`).join('\n') : 'Carrito vacío';
  return `Hola ONTA STORE, quiero confirmar este pedido:\n\n${lines}\n\nTotal: ${money(total())}`;
}
function openCart(){ $('#cartDrawer').classList.add('open'); $('#overlay').classList.add('show'); }
function closeCart(){ $('#cartDrawer').classList.remove('open'); $('#overlay').classList.remove('show'); }
function sendWhatsApp(){ window.open(`https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(orderText())}`, '_blank'); }

$('#openCart')?.addEventListener('click', openCart);
$('#openCart2')?.addEventListener('click', openCart);
$('#closeCart')?.addEventListener('click', closeCart);
$('#overlay')?.addEventListener('click', () => { closeCart(); $('#videoModal')?.classList.remove('show'); });
$('#goPay')?.addEventListener('click', closeCart);
$('#whatsappOrder')?.addEventListener('click', sendWhatsApp);
$('#whatsappOrder2')?.addEventListener('click', sendWhatsApp);
$('#payDemo')?.addEventListener('click', () => {
  const subject = encodeURIComponent('Pedido ONTA STORE');
  const body = encodeURIComponent(orderText());
  window.location.href = `mailto:${cfg.email}?subject=${subject}&body=${body}`;
});
$('#demoCart')?.addEventListener('click', () => { cart = []; ['p1','p2','p4'].forEach(id => { const p = products.find(x=>x.id===id); cart.push({...p, size:p.sizes[0], color:p.colors[0], key:Date.now()+Math.random()}); }); saveCart(); openCart(); document.querySelector('#pago').scrollIntoView({behavior:'smooth'}); });
$('#filters')?.addEventListener('click', e => { if(e.target.matches('button')){ $$('#filters button').forEach(b=>b.classList.remove('active')); e.target.classList.add('active'); renderProducts(e.target.dataset.filter); } });
$('#menuToggle')?.addEventListener('click', () => $('#navLinks').classList.toggle('open'));
$$('#navLinks a').forEach(a => a.addEventListener('click', () => $('#navLinks').classList.remove('open')));

$('#vipForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  data.createdAt = new Date().toISOString();
  const list = JSON.parse(localStorage.getItem('ontaVipClients') || '[]');
  list.push(data);
  localStorage.setItem('ontaVipClients', JSON.stringify(list));
  $('#vipOk').textContent = 'Cliente VIP registrado correctamente.';
  e.target.reset();
});

$$('.playBtn').forEach(btn => btn.addEventListener('click', () => { $('#videoTitle').textContent = btn.dataset.video || 'ONTA Promo'; $('#videoModal').classList.add('show'); $('#overlay').classList.add('show'); }));
$('#closeVideo')?.addEventListener('click', () => { $('#videoModal').classList.remove('show'); $('#overlay').classList.remove('show'); });

renderProducts();
updateCart();
