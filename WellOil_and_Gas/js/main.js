const toggle=document.querySelector('.menu-toggle');
const links=document.querySelector('.nav-links');
toggle?.addEventListener('click',()=>links.classList.toggle('open'));
document.querySelectorAll('.nav-links a').forEach(a=>a.addEventListener('click',()=>links.classList.remove('open')));
document.getElementById('year').textContent=new Date().getFullYear();
if('scrollRestoration' in history){history.scrollRestoration='manual';}
window.addEventListener('pageshow',()=>{if(location.hash==='') window.scrollTo(0,0);});
