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
  const playVideo = video => {
    if (!video) return;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.preload = 'auto';
    if (reduced) { video.pause(); return; }
    const promise = video.play();
    if (promise && typeof promise.catch === 'function') promise.catch(() => {});
  };
  const pauseVideo = video => { if (video && !video.paused) video.pause(); };

  document.querySelectorAll('video[autoplay], video.autoloop-video').forEach(v => {
    if (reduced) { v.pause(); v.removeAttribute('autoplay'); }
    else { v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto'; }
  });

  const reveals = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reduced) {
    reveals.forEach(el => el.classList.add('visible'));
    if (!reduced) document.querySelectorAll('video[autoplay], video.autoloop-video').forEach(playVideo);
  } else {
    const io = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); io.unobserve(entry.target); }
    }), { threshold: .12, rootMargin: '0px 0px -40px' });
    reveals.forEach(el => io.observe(el));

    const vio = new IntersectionObserver(entries => entries.forEach(entry => {
      const video = entry.target;
      if (entry.isIntersecting) playVideo(video);
      else pauseVideo(video);
    }), { threshold: 0.35, rootMargin: '120px 0px 120px 0px' });
    document.querySelectorAll('video[autoplay], video.autoloop-video').forEach(vio.observe.bind(vio));
  }

  const heroVideo = document.querySelector('.hero-loop');
  if (heroVideo && !reduced) {
    const startHero = () => playVideo(heroVideo);
    window.addEventListener('load', startHero, { once: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') playVideo(heroVideo);
    });
    heroVideo.addEventListener('canplay', startHero, { once: true });
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
