(function(){
'use strict';
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function init(){
  try{
    const r=await fetch('assets/data/official-menu-jan-2026.json',{cache:'no-store'});
    if(!r.ok)throw new Error('Menu showcase data unavailable.');
    const data=await r.json();
    document.querySelectorAll('[data-showcase]').forEach(root=>{
      const items=data.showcase?.[root.dataset.showcase]||[];
      root.innerHTML=items.map(item=>`<article class="menu-showcase-card"><img src="${esc(item.image)}" alt="${esc(item.name)}" loading="lazy"><h3>${esc(item.name)}</h3></article>`).join('');
    });
  }catch(error){console.error(error);}
}
init();
}());
