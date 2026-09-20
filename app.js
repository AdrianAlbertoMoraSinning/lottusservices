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

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // IMPORTANT: reduced-motion only affects decorative UI motion.
  // Product/showcase videos remain active because they are core content.
  const reducedUI = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const videos = [...document.querySelectorAll('video[autoplay], video.autoloop-video')];

  const configureVideo = (video) => {
    if (!video) return;
    video.autoplay = true;
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('autoplay', '');
    video.setAttribute('muted', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('preload', 'auto');
    video.controls = false;
  };

  const markPlaying = (video) => {
    video.classList.add('is-playing');
    video.classList.remove('autoplay-blocked');
    video.controls = false;
  };

  const markBlocked = (video) => {
    video.classList.add('autoplay-blocked');
    // Browser/OS policy fallback: expose native controls only when autoplay truly fails.
    video.controls = true;
  };

  const playVideo = async (video) => {
    if (!video) return;
    configureVideo(video);
    try {
      await video.play();
      markPlaying(video);
    } catch (_) {
      markBlocked(video);
    }
  };

  const visibleEnough = (video) => {
    const r = video.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    return r.bottom > -120 && r.top < vh + 160;
  };

  const kickVideos = () => {
    videos.forEach(video => {
      if (video.classList.contains('hero-loop') || visibleEnough(video)) playVideo(video);
    });
  };

  videos.forEach(video => {
    configureVideo(video);
    ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough'].forEach(evt => {
      video.addEventListener(evt, () => {
        if (video.classList.contains('hero-loop') || visibleEnough(video)) playVideo(video);
      }, { passive: true });
    });
    video.addEventListener('pause', () => {
      if (document.visibilityState === 'visible' && visibleEnough(video)) {
        setTimeout(() => playVideo(video), 80);
      }
    });
  });

  document.addEventListener('DOMContentLoaded', kickVideos);
  window.addEventListener('load', kickVideos);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') kickVideos();
  });

  if ('IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) playVideo(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '220px 0px 220px 0px' });
    videos.forEach(v => videoObserver.observe(v));
  }

  // User interaction also retries any browser-blocked video immediately.
  ['scroll', 'resize', 'touchstart', 'pointerdown', 'click', 'keydown'].forEach(evt => {
    window.addEventListener(evt, kickVideos, { passive: true });
  });

  // Retry after initial layout/network settles and keep visible videos alive.
  [100, 350, 900, 1800].forEach(ms => setTimeout(kickVideos, ms));
  setInterval(kickVideos, 2200);

  const reveals = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reducedUI) {
    reveals.forEach(el => el.classList.add('visible'));
  } else {
    const io = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
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
