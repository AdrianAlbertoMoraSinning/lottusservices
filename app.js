(() => {
  const menuBtn = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => {
      const open = menuBtn.getAttribute('aria-expanded') === 'true';
      menuBtn.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('open', !open);
      document.body.classList.toggle('menu-open', !open);
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      menuBtn.setAttribute('aria-expanded', 'false');
      nav.classList.remove('open');
      document.body.classList.remove('menu-open');
    }));
  }

  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('video[autoplay]').forEach(v => {
    if (reduced) { v.pause(); v.removeAttribute('autoplay'); }
  });

  const reveals = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reduced) {
    reveals.forEach(el => el.classList.add('visible'));
  } else {
    const io = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); io.unobserve(entry.target); }
    }), { threshold: .12, rootMargin: '0px 0px -40px' });
    reveals.forEach(el => io.observe(el));
  }

  const tabs = document.querySelectorAll('[data-tab-target]');
  tabs.forEach(tab => tab.addEventListener('click', () => {
    const group = tab.closest('[data-tabs]');
    if (!group) return;
    group.querySelectorAll('[data-tab-target]').forEach(x => x.classList.remove('active'));
    group.querySelectorAll('[data-tab-panel]').forEach(x => x.hidden = true);
    tab.classList.add('active');
    const panel = group.querySelector(`[data-tab-panel="${tab.dataset.tabTarget}"]`);
    if (panel) panel.hidden = false;
  }));
})();
