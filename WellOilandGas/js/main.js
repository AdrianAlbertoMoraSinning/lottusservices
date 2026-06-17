const toggle=document.querySelector('.menu-toggle');
const links=document.querySelector('.nav-links');
toggle?.addEventListener('click',()=>links.classList.toggle('open'));
document.querySelectorAll('.nav-links a').forEach(a=>a.addEventListener('click',()=>links.classList.remove('open')));
const year=document.getElementById('year');
if(year){year.textContent=new Date().getFullYear();}
if('scrollRestoration' in history){history.scrollRestoration='manual'}
window.addEventListener('pageshow',()=>window.scrollTo(0,0));
const form=document.getElementById('projectForm');
form?.addEventListener('submit',(e)=>{
  e.preventDefault();
  const data=new FormData(form);
  const msg=`Hello Carlos, I would like to discuss a project.%0A%0AName / Company: ${encodeURIComponent(data.get('name')||'')}%0AEmail: ${encodeURIComponent(data.get('email')||'')}%0ALocation: ${encodeURIComponent(data.get('location')||'')}%0AService: ${encodeURIComponent(data.get('service')||'')}%0AMessage: ${encodeURIComponent(data.get('message')||'')}`;
  window.open(`https://wa.me/14388662398?text=${msg}`,'_blank','noopener');
});
