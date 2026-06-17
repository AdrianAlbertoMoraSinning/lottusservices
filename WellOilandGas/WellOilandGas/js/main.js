const toggle = document.querySelector('.menu-toggle');
const links = document.querySelector('.nav-links');

toggle?.addEventListener('click', () => links.classList.toggle('open'));
document.querySelectorAll('.nav-links a').forEach(a =>
  a.addEventListener('click', () => links.classList.remove('open'))
);

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.addEventListener('pageshow', () => {
  if (!location.hash) window.scrollTo(0, 0);
});

const inquiryForm = document.getElementById('projectInquiry');
inquiryForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(inquiryForm);
  const name = data.get('name') || '';
  const email = data.get('email') || '';
  const locationText = data.get('location') || '';
  const service = data.get('service') || '';
  const message = data.get('message') || '';

  const whatsappMessage = [
    'Hello Carlos, I would like to request technical support.',
    '',
    `Name / Company: ${name}`,
    `Email: ${email}`,
    `Project location: ${locationText}`,
    `Service: ${service}`,
    `Project details: ${message}`
  ].join('\n');

  const url = `https://wa.me/14388662398?text=${encodeURIComponent(whatsappMessage)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
});
