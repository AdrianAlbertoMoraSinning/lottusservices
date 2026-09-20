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

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const videos = [...document.querySelectorAll('video.autoloop-video, video[autoplay]')];

  const configureVideo = (video) => {
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.setAttribute('muted', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('preload', 'metadata');
    if (reducedMotion) {
      video.autoplay = false;
      video.removeAttribute('autoplay');
      video.pause();
    }
  };

  const ensureVideoButton = (video) => {
    if (!video.parentElement || video.parentElement.querySelector(':scope > .video-toggle')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'video-toggle';
    button.setAttribute('aria-label', 'Pause animation');
    button.innerHTML = '<span aria-hidden="true">Ⅱ</span><b>Pause</b>';
    button.addEventListener('click', async () => {
      if (video.paused) {
        video.dataset.userPaused = 'false';
        try { await video.play(); } catch (_) {}
        button.setAttribute('aria-label', 'Pause animation');
        button.innerHTML = '<span aria-hidden="true">Ⅱ</span><b>Pause</b>';
      } else {
        video.dataset.userPaused = 'true';
        video.pause();
        button.setAttribute('aria-label', 'Play animation');
        button.innerHTML = '<span aria-hidden="true">▶</span><b>Play</b>';
      }
    });
    video.parentElement.appendChild(button);
    if (reducedMotion) {
      button.setAttribute('aria-label', 'Play animation');
      button.innerHTML = '<span aria-hidden="true">▶</span><b>Play</b>';
    }
  };

  videos.forEach(video => {
    configureVideo(video);
    ensureVideoButton(video);
  });

  const playVisibleVideo = async (video) => {
    if (reducedMotion || video.dataset.userPaused === 'true') return;
    try { await video.play(); } catch (_) {}
  };

  const kickVideos = () => {
    if (reducedMotion) return;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    videos.forEach(video => {
      const r = video.getBoundingClientRect();
      if (r.bottom > -120 && r.top < vh + 160) playVisibleVideo(video);
    });
  };

  if ('IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting) playVisibleVideo(video);
        else if (!video.paused) video.pause();
      });
    }, { threshold: 0.18, rootMargin: '160px 0px 160px 0px' });
    videos.forEach(v => videoObserver.observe(v));
  } else if (!reducedMotion) {
    videos.forEach(playVisibleVideo);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') videos.forEach(v => v.pause());
  });

  const reveals = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reducedMotion) {
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
    group.querySelectorAll('[data-tab-target]').forEach(x => {
      x.classList.remove('active');
      x.setAttribute('aria-selected', 'false');
    });
    group.querySelectorAll('[data-tab-panel]').forEach(x => x.hidden = true);
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    const panel = group.querySelector(`[data-tab-panel="${tab.dataset.tabTarget}"]`);
    if (panel) panel.hidden = false;
  }));

  document.querySelectorAll('[data-live-preview]').forEach(preview => {
    const button = preview.querySelector('[data-load-preview]');
    const iframe = preview.querySelector('iframe[data-src]');
    const placeholder = preview.querySelector('.live-preview-placeholder');
    if (!button || !iframe) return;
    button.addEventListener('click', () => {
      if (!iframe.src || iframe.src.endsWith('about:blank')) iframe.src = iframe.dataset.src;
      preview.classList.add('is-loaded');
      if (placeholder) placeholder.hidden = true;
      button.setAttribute('aria-expanded', 'true');
    });
  });

  const Ctx = window.AudioContext || window.webkitAudioContext;
  const INTRO_HOLD_MS = 3600;
  const INTRO_OPEN_MS = 2760;

  const buildSteelIntroMarkup = () => `
    <div class="steel-intro" id="steelIntro" aria-hidden="true">
      <div class="steel-intro__ambient steel-intro__ambient--left" aria-hidden="true"></div>
      <div class="steel-intro__ambient steel-intro__ambient--right" aria-hidden="true"></div>
      <div class="steel-intro__backlight" aria-hidden="true"></div>
      <div class="steel-intro__frame steel-intro__frame--top" aria-hidden="true"></div>
      <div class="steel-intro__frame steel-intro__frame--bottom" aria-hidden="true"></div>
      <div class="steel-door steel-door--left" aria-hidden="true"><span class="steel-door__edge"></span></div>
      <div class="steel-door steel-door--right" aria-hidden="true"><span class="steel-door__edge"></span></div>
      <div class="steel-shutters" aria-hidden="true"><span></span><span></span></div>
      <div class="steel-intro__xmark" aria-hidden="true"><span></span><span></span></div>
      <div class="steel-intro__content" aria-label="Lottus access sequence">
        <div class="steel-intro__crest" aria-hidden="true"><img src="images/lottus-logo-transparent.png" alt="" /></div>
        <div class="steel-intro__loading" aria-hidden="true"><span></span></div>
      </div>
      <div class="steel-intro__scanline" aria-hidden="true"></div>
      <div class="steel-intro__seam" aria-hidden="true"></div>
    </div>`;

  const ensureSteelIntro = () => {
    let intro = document.getElementById('steelIntro');
    if (!intro) {
      document.body.insertAdjacentHTML('afterbegin', buildSteelIntroMarkup());
      intro = document.getElementById('steelIntro');
    }
    return intro;
  };

  const getAudioContext = async () => {
    if (!Ctx) return null;
    const ctx = window.__lottusSteelCtx || (window.__lottusSteelCtx = new Ctx());
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch (_) {}
    }
    return ctx;
  };

  const noiseBufferFor = (ctx) => {
    if (window.__lottusSteelNoiseBuffer) return window.__lottusSteelNoiseBuffer;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2.2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    window.__lottusSteelNoiseBuffer = buffer;
    return buffer;
  };

  const withAudio = async (fn) => {
    const ctx = await getAudioContext();
    if (!ctx) return false;
    try {
      fn(ctx, ctx.currentTime);
      window.__lottusSteelAudioUnlocked = true;
      return true;
    } catch (_) {
      return false;
    }
  };

  const playSteelAccessFx = async (mode = 'full') => withAudio((ctx, now) => {
    const buffer = noiseBufferFor(ctx);
    const burst = (time, duration, { low = 2200, high = 160, gain = 0.05 } = {}) => {
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
      g.gain.linearRampToValueAtTime(gain, time + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(ctx.destination);
      src.start(time);
      src.stop(time + duration + 0.06);
    };
    const tone = (time, freq, duration, gain = 0.024, type = 'triangle') => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.62), time + duration);
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(gain, time + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + duration + 0.05);
    };
    if (mode === 'click') {
      burst(now, 0.12, { low: 2800, high: 420, gain: 0.028 });
      tone(now, 310, 0.10, 0.016, 'triangle');
      tone(now + 0.012, 168, 0.18, 0.011, 'sine');
      burst(now + 0.16, 0.78, { low: 1200, high: 120, gain: 0.013 });
      tone(now + 0.16, 98, 1.05, 0.0075, 'sine');
      tone(now + 0.28, 144, 0.9, 0.0045, 'triangle');
      return;
    }
    burst(now, 0.2, { low: 3600, high: 520, gain: 0.07 });
    tone(now, 196, 0.18, 0.026, 'triangle');
    tone(now + 0.02, 96, 0.35, 0.022, 'sine');
    burst(now + 0.1, 1.18, { low: 1500, high: 110, gain: 0.032 });
    tone(now + 0.12, 136, 0.82, 0.015, 'sawtooth');
    burst(now + 0.98, 0.24, { low: 3000, high: 700, gain: 0.06 });
    tone(now + 0.98, 262, 0.18, 0.022, 'triangle');
  });

  const clickSoundSelector = 'a[href], button, [role="button"], [data-tab-target], .menu-toggle';
  document.addEventListener('click', (event) => {
    const target = event.target.closest(clickSoundSelector);
    if (!target) return;
    if (target.closest('#steelIntro')) return;
    playSteelAccessFx('click');
  }, true);

  ['pointerdown', 'touchstart', 'keydown'].forEach(evt => {
    window.addEventListener(evt, () => {
      if (!window.__lottusSteelAudioUnlocked) playSteelAccessFx('click');
    }, { once: true, passive: true });
  });

  const steelIntro = ensureSteelIntro();
  const reducedIntroMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let introOpening = false;
  let introVisible = false;
  let autoOpenTimer = null;
  let hideTimer = null;
  let introCompleteAction = null;

  const clearIntroTimers = () => {
    window.clearTimeout(autoOpenTimer);
    window.clearTimeout(hideTimer);
  };

  const finishIntro = () => {
    introVisible = false;
    steelIntro.classList.add('is-hidden', 'is-finished');
    steelIntro.classList.remove('is-active');
    steelIntro.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('intro-active');
    introOpening = false;
    kickVideos();
    if (typeof introCompleteAction === 'function') {
      const action = introCompleteAction;
      introCompleteAction = null;
      action();
    }
  };

  const openSteelIntro = async () => {
    if (introOpening || !introVisible) return;
    introOpening = true;
    steelIntro.classList.add('opening');
    playSteelAccessFx('full');
    clearIntroTimers();
    hideTimer = window.setTimeout(finishIntro, reducedIntroMotion ? 1800 : INTRO_OPEN_MS);
  };

  const showSteelIntro = ({ afterComplete = null, immediateSound = true } = {}) => {
    introCompleteAction = afterComplete;
    introVisible = true;
    introOpening = false;
    steelIntro.classList.remove('is-hidden', 'is-finished', 'opening');
    steelIntro.setAttribute('aria-hidden', 'false');
    document.body.classList.add('intro-active');
    requestAnimationFrame(() => steelIntro.classList.add('is-active'));
    clearIntroTimers();
    if (immediateSound) window.setTimeout(() => playSteelAccessFx('full'), 180);
    autoOpenTimer = window.setTimeout(openSteelIntro, reducedIntroMotion ? 2200 : INTRO_HOLD_MS);
  };

  const unlockAndAccentIntro = () => {
    if (!introVisible || window.__lottusSteelAudioUnlocked) return;
    playSteelAccessFx('full');
  };
  ['pointerdown', 'touchstart', 'keydown'].forEach(evt => window.addEventListener(evt, unlockAndAccentIntro, { passive: true }));

  window.addEventListener('keydown', (event) => {
    if (!introVisible) return;
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') openSteelIntro();
  });


  if (document.body.classList.contains('home-page')) {
    showSteelIntro({ immediateSound: true });
  }

})();
