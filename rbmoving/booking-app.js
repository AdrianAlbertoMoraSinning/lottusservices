(function(){
const defaults=[
{id:'labour',name:'1 Person Labour / Assembly',category:'Labour',description:'Loading help, furniture assembly, packing, organizing and on-site moving support.',price:50,unit:'hour',minimum:2,image:'assets/rb-moving-sofa.jpg',active:true,sort_order:10},
{id:'pickup',name:'1 Mover + Pickup / Small Delivery',category:'Delivery',description:'Pickup truck service for Marketplace, IKEA, small moves, deliveries and light dump runs. Fuel included within Calgary.',price:75,unit:'hour',minimum:2,image:'assets/rb-moving-truck-team.jpg',active:true,sort_order:20},
{id:'truck2',name:'2 Movers + Moving Box Truck',category:'Moving',description:'Professional two-person crew with box truck. Includes blankets, straps, shrink wrap, tape and dolly.',price:135,unit:'hour',minimum:2,image:'assets/service-box-truck.webp',active:true,sort_order:30},
{id:'helper',name:'Additional Helper',category:'Add-on',description:'Extra labour for heavy or oversized items such as pianos, treadmills, pool tables and saunas.',price:50,unit:'helper/hour',minimum:2,image:'assets/service-heavy-moving.webp',active:true,sort_order:40},
{id:'junk',name:'Dump Run / Junk Removal',category:'Junk Removal',description:'Pickup, loading and disposal support. Landfill charges are added from the official receipt.',price:75,unit:'hour',minimum:2,image:'assets/service-junk-removal.webp',active:true,sort_order:50},
{id:'packing',name:'Packing & Unpacking Support',category:'Packing',description:'Careful packing, unpacking and organization assistance before or after your move.',price:50,unit:'hour',minimum:2,image:'assets/service-packing.webp',active:true,sort_order:60}
];
let servicesCache=null,settingsCache={gst_rate:5,business_hours:'8:00 AM–8:00 PM'};
function money(n){return new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(Number(n||0))}
function escapeHtml(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
async function getSettings(){if(!RBMData?.configured())return settingsCache;try{const a=await RBMData.table.get('settings','id=eq.1&select=*');if(a?.[0])settingsCache=a[0]}catch(e){console.warn(e)}return settingsCache}
async function getServices({includeInactive=false}={}){if(servicesCache&&!includeInactive)return servicesCache; if(!RBMData?.configured())return defaults.filter(x=>includeInactive||x.active);try{const q=`select=id,name,category,description,price,unit,minimum,image,active,sort_order&order=sort_order.asc${includeInactive?'':'&active=eq.true'}`;const rows=await RBMData.table.get('services',q);if(!includeInactive)servicesCache=rows;return rows}catch(e){console.warn('Using static service fallback',e);return defaults.filter(x=>includeInactive||x.active)}}
async function getReviews(){if(!RBMData?.configured())return [];try{return await RBMData.table.get('reviews','select=id,author,rating,review_text,review_date,source,source_url,visible,sort_order&visible=eq.true&order=sort_order.asc,review_date.desc')}catch(e){console.warn(e);return []}}
async function getGoogleReviews(){try{const res=await fetch('/.netlify/functions/google-reviews',{headers:{Accept:'application/json'}});const text=await res.text();if(!text)return null;const data=JSON.parse(text);if(!res.ok)throw new Error(data.error||`Google reviews request failed (${res.status})`);return data}catch(e){console.warn('Google reviews fallback active',e);return null}}
function totals(items,gst=Number(settingsCache.gst_rate||5)){const subtotal=items.reduce((s,i)=>s+(Number(i.price)*Number(i.qty)),0),gstAmount=subtotal*gst/100;return{subtotal,gst:gstAmount,total:subtotal+gstAmount,gstRate:gst}}
async function renderReviews(){
  const el=document.getElementById('reviewGrid');if(!el)return;
  const summary=document.getElementById('googleReviewSummary'),countEl=document.getElementById('googleReviewCount'),ratingEl=document.getElementById('googleReviewRating'),statusEl=document.getElementById('googleReviewStatus');
  const google=await getGoogleReviews();
  if(google?.configured&&Array.isArray(google.reviews)){
    if(summary)summary.hidden=false;if(ratingEl)ratingEl.textContent=(Number(google.averageRating||0)||5).toFixed(1);if(countEl)countEl.textContent=String(Number(google.totalReviewCount||google.reviews.length));if(statusEl)statusEl.textContent='Live from Google';
    document.querySelectorAll('[data-google-reviews-link]').forEach(a=>{if(google.reviewsUrl)a.href=google.reviewsUrl});
    const withText=google.reviews.filter(r=>String(r.text||'').trim());
    const rows=(withText.length?withText:google.reviews).slice(0,20);
    if(rows.length){el.innerHTML=rows.map(r=>`<blockquote class="google-review-card"><div class="review-stars">${'★'.repeat(Math.max(1,Math.min(5,Number(r.rating)||5)))}</div>${r.text?`“${escapeHtml(r.text)}”`:''}<cite>${escapeHtml(r.author||'Google Customer')} · Google</cite></blockquote>`).join('');return}
  }
  const vis=await getReviews();
  if(summary)summary.hidden=false;if(ratingEl)ratingEl.textContent='5.0';if(countEl)countEl.textContent='10';if(statusEl)statusEl.textContent=google?.configured?'Google temporarily unavailable · showing approved reviews':'Google connection pending · showing approved reviews';
  if(!vis.length){el.innerHTML='<div class="notice">Google Reviews connection is being activated. Current rating: 5.0 from 10 Google reviews.</div>';return}
  el.innerHTML=vis.slice(0,20).map(r=>`<blockquote><div class="review-stars">${'★'.repeat(Math.max(1,Math.min(5,Number(r.rating)||5)))}</div>“${escapeHtml(r.review_text)}”<cite>${escapeHtml(r.author)} · ${escapeHtml(r.source||'Google')}</cite></blockquote>`).join('')
}
async function renderDynamicServices(){const grid=document.getElementById('dynamicServiceGrid');if(!grid)return;const rows=await getServices();grid.innerHTML=rows.map(s=>`<article class="service-card"><img src="${escapeHtml(s.image)}" alt="${escapeHtml(s.name)}"><div class="service-card-body"><span class="badge">${escapeHtml(s.category)}</span><h3>${escapeHtml(s.name)}</h3><p>${escapeHtml(s.description)}</p></div></article>`).join('')}
async function renderDynamicRates(){const grid=document.getElementById('dynamicRateGrid');if(!grid)return;const rows=await getServices();grid.innerHTML=rows.map((s,i)=>`<article class="rate-card ${s.id==='truck2'?'featured':''}"><h3>${escapeHtml(s.name)}</h3><div class="price">${money(s.price)} <span>/ ${escapeHtml(s.unit)}</span></div><p>${Number(s.minimum||1)}-hour minimum. ${escapeHtml(s.description)}</p></article>`).join('')}
window.RBM={defaults,money,escapeHtml,getServices,getReviews,getSettings,totals,renderReviews,renderDynamicServices,renderDynamicRates};
document.addEventListener('DOMContentLoaded',async()=>{await getSettings();await Promise.all([renderReviews(),renderDynamicServices(),renderDynamicRates()]);});
})();
