const toggle=document.querySelector('.menu-toggle');
const links=document.querySelector('.nav-links');
toggle?.addEventListener('click',()=>links.classList.toggle('open'));
document.querySelectorAll('.nav-links a').forEach(a=>a.addEventListener('click',()=>links.classList.remove('open')));
const buttons=document.querySelectorAll('.filters button');
const items=document.querySelectorAll('.portfolio-grid figure');
buttons.forEach(btn=>btn.addEventListener('click',()=>{buttons.forEach(b=>b.classList.remove('active'));btn.classList.add('active');const f=btn.dataset.filter;items.forEach(it=>{it.style.display=(f==='all'||it.dataset.cat===f)?'block':'none';});}));
document.getElementById('quoteForm')?.addEventListener('submit',e=>{e.preventDefault();const d=new FormData(e.target);const body=`Name: ${d.get('name')}%0D%0APhone: ${d.get('phone')}%0D%0AEmail: ${d.get('email')}%0D%0AService: ${d.get('service')}%0D%0AMessage: ${d.get('message')}`;location.href=`mailto:jppaintig33@gmail.com?subject=Free estimate request - JP Painting&body=${body}`;});
document.getElementById('paymentForm')?.addEventListener('submit',e=>{e.preventDefault();const d=new FormData(e.target);const body=`Payment notice%0D%0AName: ${d.get('name')}%0D%0AInvoice: ${d.get('invoice')}%0D%0AAmount: ${d.get('amount')}%0D%0ANote: ${d.get('note')}`;location.href=`mailto:jppaintig33@gmail.com?subject=Payment information - JP Painting&body=${body}`;});
if('scrollRestoration' in history){history.scrollRestoration='manual'}
