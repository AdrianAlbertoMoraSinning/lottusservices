(function(){
'use strict';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(Number(n)||0),fmt=v=>v?new Date(v).toLocaleString('en-CA'):'—';
let reservations=[],events=[],catalogs={pickup:[],shop:[]},allOrders=[],reportRows=[];
function msg(text,error=false){$('loginMsg').textContent=text;$('loginMsg').classList.toggle('error',error)}
function download(name,text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/csv'}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
function csv(v){return `"${String(v??'').replaceAll('"','""')}"`}
function showLogin(message=''){
  $('dashboard').classList.add('hidden');
  $('login').classList.remove('hidden');
  if(message)msg(message,true);
}
async function openDashboard(){$('login').classList.add('hidden');$('dashboard').classList.remove('hidden');return refreshAll()}
$('loginBtn').onclick=async()=>{
  try{
    msg('Signing in…');
    await SumaQData.signIn($('adminEmail').value.trim(),$('pin').value);
    msg('');
    await openDashboard();
  }catch(e){showLogin(e.message)}
};
$('pin').addEventListener('keydown',e=>{if(e.key==='Enter')$('loginBtn').click()});
$('logoutBtn').onclick=async()=>{await SumaQData.signOut();location.reload()};
document.querySelectorAll('.admin-tabs button').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('.admin-tabs button').forEach(b=>b.classList.toggle('active',b===btn));document.querySelectorAll('.admin-panel').forEach(p=>p.classList.toggle('active',p.id===btn.dataset.tab))});
function statusSelect(table,id,current,options){return `<select class="record-status" data-table="${table}" data-id="${id}">${options.map(o=>`<option${o===current?' selected':''}>${o}</option>`).join('')}</select>`}
function renderReservations(){$('reservationsBody').innerHTML=reservations.length?reservations.map(r=>`<tr><td>${esc(fmt(r.created_at))}<br><small>${esc(r.id)}</small></td><td>${esc(r.reservation_date)}<br>${esc(r.reservation_time)}</td><td>${esc(r.first_name+' '+(r.last_name||''))}</td><td>${r.adults} adults<br>${r.minors} minors<br>${r.party_size} total</td><td>${esc(r.phone)}<br>${esc(r.email)}</td><td>${money(r.deposit_amount)}<br>${esc(r.payment_status)}</td><td>${statusSelect('reservations',r.id,r.status,['New','Awaiting deposit','Booked','Confirmed','Seated','Completed','Cancelled','Archived'])}</td><td>${esc(r.notes)}</td><td><button class="mini-btn delete-record" data-table="reservations" data-id="${r.id}">Delete</button></td></tr>`).join(''):'<tr><td colspan="9">No central reservations yet.</td></tr>'}
function renderEvents(){$('eventsBody').innerHTML=events.length?events.map(r=>`<tr><td>${esc(fmt(r.created_at))}<br><small>${esc(r.id)}</small></td><td>${esc(r.first_name+' '+(r.last_name||''))}</td><td>${esc(r.email)}</td><td>${esc(r.phone)}</td><td>${esc(r.message)}</td><td>${statusSelect('private_event_inquiries',r.id,r.status,['New','Contacted','Quoted','Booked','Closed','Cancelled','Archived'])}</td><td><button class="mini-btn delete-record" data-table="private_event_inquiries" data-id="${r.id}">Delete</button></td></tr>`).join(''):'<tr><td colspan="7">No central private-event inquiries yet.</td></tr>'}
function renderOrders(){$('ordersBody').innerHTML=allOrders.length?allOrders.map(o=>`<tr><td>${esc(fmt(o.created_at))}</td><td>${esc(o.public_id)}</td><td>${esc(o.customer_name)}<br><small>${esc(o.email)}</small></td><td>${esc(o.order_type)}</td><td>${money(o.total)}</td><td>${esc(o.payment_status)}</td><td>${statusSelect('orders',o.id,o.status,['Awaiting payment','Confirmed','Preparing','Ready','Completed','Cancelled','Archived'])}</td><td>${(o.order_items||[]).map(i=>`${i.quantity} × ${esc(i.product_name)}`).join('<br>')}</td><td><button class="mini-btn delete-record" data-table="orders" data-id="${o.id}">Delete</button></td></tr>`).join(''):'<tr><td colspan="9">No central orders yet.</td></tr>'}
function renderCatalog(type){const root=$(type==='pickup'?'pickupEditor':'shopEditor');root.innerHTML=catalogs[type].map((i,index)=>`<article class="admin-product-card"><img src="${esc(i.image)}" alt=""><div><span class="eyebrow">${esc(i.category)}</span><h3>${esc(i.name)}</h3><p>${esc(i.description)}</p><strong>${money(i.price)} · ${esc(i.unit)}</strong><div class="admin-card-actions"><button class="mini-btn edit-product" data-type="${type}" data-index="${index}">Edit</button><button class="mini-btn danger delete-product" data-type="${type}" data-id="${esc(i.id)}">Delete</button></div></div></article>`).join('')||'<p>No products found.</p>'}
async function loadCentralData(){
  [reservations,events,catalogs.pickup,catalogs.shop,allOrders]=await Promise.all([SumaQData.getRows('reservations'),SumaQData.getRows('private_event_inquiries'),SumaQData.adminCatalog('pickup'),SumaQData.adminCatalog('shop'),SumaQData.orders()]);
}
async function refreshAll(){
  try{
    [$('reservationsBody'),$('eventsBody')].forEach(x=>x.innerHTML='<tr><td colspan="9">Loading central data…</td></tr>');
    await SumaQData.withAuthRetry(loadCentralData);
    renderReservations();renderEvents();renderOrders();renderCatalog('pickup');renderCatalog('shop');runReport();
    return true;
  }catch(e){
    if(SumaQData.jwtIssuedAtFuture(e)||/refresh token|session.*renew|invalid.*token|jwt/i.test(String(e&&e.message||''))){
      await SumaQData.clearInvalidSession();
      showLogin('Your saved admin session is no longer valid. Please sign in again.');
      return false;
    }
    alert('Central data error: '+e.message);
    return false;
  }
}
document.addEventListener('change',async e=>{if(!e.target.matches('.record-status'))return;try{await SumaQData.updateRow(e.target.dataset.table,e.target.dataset.id,{status:e.target.value})}catch(err){alert(err.message);refreshAll()}});
document.addEventListener('click',async e=>{const del=e.target.closest('.delete-record');if(del&&confirm('Permanently delete this central record?')){try{await SumaQData.deleteRow(del.dataset.table,del.dataset.id);await refreshAll()}catch(err){alert(err.message)}}});
$('clearReservations').onclick=async()=>{if(confirm('Delete all completed, cancelled and archived reservations older than one year?')){const d=new Date();d.setFullYear(d.getFullYear()-1);await SumaQData.deleteOlder('reservations',d.toISOString(),['Completed','Cancelled','Archived']);await refreshAll()}};
$('clearEvents').onclick=async()=>{if(confirm('Delete all closed, cancelled and archived event inquiries older than one year?')){const d=new Date();d.setFullYear(d.getFullYear()-1);await SumaQData.deleteOlder('private_event_inquiries',d.toISOString(),['Closed','Cancelled','Archived']);await refreshAll()}};
$('exportReservations').onclick=()=>download('sumaq-reservations.csv',['ID,Created,Date,Time,First Name,Last Name,Phone,Email,Adults,Minors,Party Size,Deposit,Payment,Status,Notes',...reservations.map(r=>[r.id,r.created_at,r.reservation_date,r.reservation_time,r.first_name,r.last_name,r.phone,r.email,r.adults,r.minors,r.party_size,r.deposit_amount,r.payment_status,r.status,r.notes].map(csv).join(','))].join('\n'));
$('exportEvents').onclick=()=>download('sumaq-private-events.csv',['ID,Created,First Name,Last Name,Phone,Email,Event Date,Guests,Message,Status',...events.map(r=>[r.id,r.created_at,r.first_name,r.last_name,r.phone,r.email,r.event_date,r.estimated_guests,r.message,r.status].map(csv).join(','))].join('\n'));
$('exportOrders').onclick=()=>download('sumaq-orders.csv',['ID,Created,Public ID,Type,Customer,Email,Phone,Subtotal,GST,Total,Payment,Status',...allOrders.map(o=>[o.id,o.created_at,o.public_id,o.order_type,o.customer_name,o.email,o.phone,o.subtotal,o.tax,o.total,o.payment_status,o.status].map(csv).join(','))].join('\n'));
$('clearOrders').onclick=async()=>{if(confirm('Delete completed, cancelled and archived orders older than one year?')){const d=new Date();d.setFullYear(d.getFullYear()-1);await SumaQData.deleteOlder('orders',d.toISOString(),['Completed','Cancelled','Archived']);await refreshAll()}};
const modal=$('productModal'),form=$('productForm');
function openProduct(type,index){const i=Number.isInteger(index)?catalogs[type][index]:{id:'',name:'',category:'',description:'',price:'',unit:'',image:'assets/photos/02-menu-img-2709.webp',active:true,sortOrder:catalogs[type].length};$('productModalTitle').textContent=Number.isInteger(index)?'Edit item':'Add new item';$('productType').value=type;$('productOriginalId').value=Number.isInteger(index)?i.id:'';$('productId').value=i.id;$('productName').value=i.name;$('productCategory').value=i.category;$('productPrice').value=i.price;$('productUnit').value=i.unit;$('productDescription').value=i.description;$('productImage').value=i.image;$('productPreview').src=i.image;modal.classList.remove('hidden')}
function closeProduct(){modal.classList.add('hidden');form.reset();$('productImageFile').value=''}
document.querySelectorAll('.add-product').forEach(b=>b.onclick=()=>openProduct(b.dataset.type));
document.addEventListener('click',async e=>{const edit=e.target.closest('.edit-product'),del=e.target.closest('.delete-product');if(edit)openProduct(edit.dataset.type,Number(edit.dataset.index));if(del&&confirm('Delete this product for every device?')){try{await SumaQData.deleteProduct(del.dataset.type,del.dataset.id);await refreshAll()}catch(err){alert(err.message)}}});
$('closeProductModal').onclick=$('cancelProduct').onclick=closeProduct;$('productImage').oninput=()=>$('productPreview').src=$('productImage').value||'';
form.onsubmit=async e=>{e.preventDefault();const type=$('productType').value,original=$('productOriginalId').value;let image=$('productImage').value.trim();const file=$('productImageFile').files[0];const item={id:$('productId').value.trim(),name:$('productName').value.trim(),category:$('productCategory').value.trim(),price:Number($('productPrice').value),unit:$('productUnit').value.trim(),description:$('productDescription').value.trim(),image,active:true,sortOrder:catalogs[type].find(x=>x.id===original)?.sortOrder||catalogs[type].length};try{const button=form.querySelector('button[type="submit"]');button.disabled=true;if(file){if(file.size>2*1024*1024)throw new Error('Image must be 2 MB or smaller.');item.image=await SumaQData.uploadProductImage(file,item.id)}await SumaQData.saveProduct(type,item);if(original&&original!==item.id)await SumaQData.deleteProduct(type,original);closeProduct();await refreshAll()}catch(err){alert(err.message)}finally{form.querySelector('button[type="submit"]').disabled=false}};
function dateEdge(id,end){const v=$(id).value;if(!v)return null;const d=new Date(v+'T00:00:00');if(end)d.setHours(23,59,59,999);return d}
function runReport(){const type=$('reportType').value,from=dateEdge('reportFrom'),to=dateEdge('reportTo',true);const orders=allOrders.filter(o=>o.order_type===type&&(!from||new Date(o.created_at)>=from)&&(!to||new Date(o.created_at)<=to));const gross=orders.reduce((s,o)=>s+Number(o.total||0),0),tax=orders.reduce((s,o)=>s+Number(o.tax||0),0);$('metricOrders').textContent=orders.length;$('metricGross').textContent=money(gross);$('metricTax').textContent=money(tax);$('metricAverage').textContent=money(orders.length?gross/orders.length:0);const map={};orders.forEach(o=>(o.order_items||[]).forEach(i=>{const k=i.product_name;if(!map[k])map[k]={name:k,qty:0,sales:0};map[k].qty+=Number(i.quantity);map[k].sales+=Number(i.line_total)}));reportRows=Object.values(map).sort((a,b)=>b.sales-a.sales);$('productSalesBody').innerHTML=reportRows.length?reportRows.map(r=>`<tr><td>${esc(r.name)}</td><td>${r.qty}</td><td>${money(r.sales)}</td></tr>`).join(''):'<tr><td colspan="3">No sales for this selection.</td></tr>'}
$('runReport').onclick=runReport;$('exportCommerce').onclick=()=>download(`sumaq-${$('reportType').value}-sales.csv`,['Item,Units Sold,Sales CAD',...reportRows.map(r=>[r.name,r.qty,r.sales.toFixed(2)].map(csv).join(','))].join('\n'));
(async()=>{
  if(!SumaQData.configured){msg('Supabase is not configured. Complete supabase-config.js first.',true);return}
  try{
    const active=await SumaQData.ensureFreshSession();
    if(active)await openDashboard();
    else showLogin();
  }catch(error){
    await SumaQData.clearInvalidSession();
    showLogin('Your saved admin session could not be renewed. Please sign in again.');
  }
})();
}());
