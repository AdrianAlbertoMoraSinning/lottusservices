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
  const videos = [...document.querySelectorAll('video[autoplay], video.autoloop-video')];

  const configureVideo = video => {
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('muted', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('preload', 'auto');
  };

  const playVideo = video => {
    if (!video || reduced) return;
    configureVideo(video);
    const p = video.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  };

  const isInView = el => {
    const r = el.getBoundingClientRect();
    return r.top < (window.innerHeight || document.documentElement.clientHeight) * 1.1 && r.bottom > -120;
  };

  const kickVisibleVideos = () => {
    videos.forEach(video => {
      if (video.classList.contains('hero-loop') || isInView(video)) playVideo(video);
    });
  };

  videos.forEach(configureVideo);
  if (reduced) {
    videos.forEach(v => { v.pause(); v.removeAttribute('autoplay'); });
  } else {
    document.addEventListener('DOMContentLoaded', kickVisibleVideos);
    window.addEventListener('load', kickVisibleVideos);
    ['scroll','resize','touchstart','pointerdown','click','mousemove'].forEach(evt => {
      window.addEventListener(evt, kickVisibleVideos, { passive: true });
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') kickVisibleVideos();
    });
    if ('IntersectionObserver' in window) {
      const vObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) playVideo(entry.target); });
      }, { threshold: 0.1, rootMargin: '200px 0px' });
      videos.forEach(v => vObserver.observe(v));
    }
    setTimeout(kickVisibleVideos, 150);
    setTimeout(kickVisibleVideos, 800);
    setTimeout(kickVisibleVideos, 1800);
    setInterval(kickVisibleVideos, 2500);
  }

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
