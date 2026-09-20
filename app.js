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


  const steelIntro = document.getElementById('steelIntro');
  const replayIntroButtons = document.querySelectorAll('[data-replay-intro]');

  if (steelIntro && document.body.classList.contains('home-page')) {
    const enterSoundBtn = document.getElementById('steelEnterSound');
    const skipIntroBtn = document.getElementById('steelSkipIntro');
    const reducedIntroMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let introOpening = false;
    let introVisible = false;
    let autoOpenTimer = null;
    let hideTimer = null;

    const setSeen = () => {
      try { sessionStorage.setItem('lottusSteelIntroSeen', '1'); } catch (_) {}
    };

    const clearSeen = () => {
      try { sessionStorage.removeItem('lottusSteelIntroSeen'); } catch (_) {}
    };

    const noiseBufferFor = (ctx) => {
      if (window.__lottusSteelNoiseBuffer) return window.__lottusSteelNoiseBuffer;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      window.__lottusSteelNoiseBuffer = buffer;
      return buffer;
    };

    const playMetalDoorFx = async () => {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = window.__lottusSteelCtx || (window.__lottusSteelCtx = new Ctx());
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;
      const buffer = noiseBufferFor(ctx);

      const burst = (time, duration, { low = 2600, high = 180, gain = 0.05 } = {}) => {
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = high;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = low;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, time);
        g.gain.linearRampToValueAtTime(gain, time + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(ctx.destination);
        src.start(time);
        src.stop(time + duration + 0.04);
      };

      const tone = (time, freq, duration, gain = 0.025, type = 'triangle') => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);
        osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.65), time + duration);
        g.gain.setValueAtTime(0.0001, time);
        g.gain.linearRampToValueAtTime(gain, time + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + duration + 0.03);
      };

      burst(now, 0.2, { low: 3400, high: 480, gain: 0.06 });
      tone(now, 184, 0.14, 0.024, 'triangle');
      tone(now + 0.025, 92, 0.28, 0.02, 'sine');
      burst(now + 0.08, 0.82, { low: 1400, high: 120, gain: 0.028 });
      tone(now + 0.1, 130, 0.62, 0.014, 'sawtooth');
      burst(now + 0.74, 0.17, { low: 2800, high: 640, gain: 0.05 });
      tone(now + 0.73, 252, 0.14, 0.022, 'triangle');
    };

    const finishIntro = () => {
      introVisible = false;
      setSeen();
      steelIntro.classList.add('is-hidden', 'is-finished');
      steelIntro.classList.remove('is-active');
      steelIntro.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('intro-active');
      introOpening = false;
      kickVideos();
    };

    const openSteelIntro = async (withSound = false) => {
      if (introOpening || !introVisible) return;
      introOpening = true;
      steelIntro.classList.add('opening');
      if (withSound) {
        try { await playMetalDoorFx(); } catch (_) {}
      }
      window.clearTimeout(autoOpenTimer);
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(finishIntro, reducedIntroMotion ? 900 : 1800);
    };

    const showSteelIntro = (force = false) => {
      const seen = !force && (() => { try { return sessionStorage.getItem('lottusSteelIntroSeen') === '1'; } catch (_) { return false; } })();
      if (seen) {
        steelIntro.classList.add('is-hidden');
        steelIntro.setAttribute('aria-hidden', 'true');
        return;
      }
      introVisible = true;
      introOpening = false;
      steelIntro.classList.remove('is-hidden', 'is-finished', 'opening');
      steelIntro.setAttribute('aria-hidden', 'false');
      document.body.classList.add('intro-active');
      requestAnimationFrame(() => steelIntro.classList.add('is-active'));
      window.clearTimeout(autoOpenTimer);
      autoOpenTimer = window.setTimeout(() => openSteelIntro(false), reducedIntroMotion ? 850 : 1700);
    };

    if (enterSoundBtn) enterSoundBtn.addEventListener('click', () => openSteelIntro(true));
    if (skipIntroBtn) skipIntroBtn.addEventListener('click', () => openSteelIntro(false));
    replayIntroButtons.forEach(btn => btn.addEventListener('click', () => {
      clearSeen();
      showSteelIntro(true);
    }));

    window.addEventListener('keydown', (event) => {
      if (!introVisible) return;
      if (event.key === 'Escape') openSteelIntro(false);
      if (event.key === 'Enter') openSteelIntro(true);
    });

    showSteelIntro(false);
  }

})();
