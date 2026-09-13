(function(){
'use strict';
const dialog=document.getElementById('menuCardDialog');
if(!dialog)return;
const title=document.getElementById('menuCardTitle');
const image=document.getElementById('menuCardImage');
const pdf=document.getElementById('menuCardPdf');
const pending=document.getElementById('menuCardPending');
const actions=document.getElementById('menuCardActions');
const cards={
  main:{title:'Menu',image:'assets/menu-cards/main-menu.jpg',pdf:'assets/menu-cards/main-menu.pdf',alt:'Sumaq on 17th food menu'},
  drinks:{title:'Cocktails & Drinks',image:'assets/menu-cards/drinks-menu.jpg',pdf:'assets/menu-cards/drinks-menu.pdf',alt:'Sumaq on 17th drinks menu'},
  desserts:{title:'Desserts',pending:true}
};
function close(){dialog.close()}
function openCard(key){
  const card=cards[key];if(!card)return;
  title.textContent=card.title;
  if(card.pending){
    image.classList.add('hidden');image.removeAttribute('src');image.alt='';
    pending.classList.remove('hidden');pdf.classList.add('hidden');
  }else{
    pending.classList.add('hidden');image.classList.remove('hidden');
    image.src=card.image;image.alt=card.alt;pdf.href=card.pdf;pdf.classList.remove('hidden');
  }
  if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
}
document.querySelectorAll('[data-menu-card]').forEach(btn=>btn.addEventListener('click',()=>openCard(btn.dataset.menuCard)));
document.getElementById('menuCardClose').addEventListener('click',close);
document.getElementById('menuCardDone').addEventListener('click',close);
dialog.addEventListener('click',event=>{if(event.target===dialog)close()});
dialog.addEventListener('cancel',event=>{event.preventDefault();close()});
}());
