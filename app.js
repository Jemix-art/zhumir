(() => {
  'use strict';
  const scene = document.querySelector('#scene');
  const bouquet = document.querySelector('#bouquet');
  const replay = document.querySelector('#replay');
  const breeze = document.querySelector('#breeze');
  const status = document.querySelector('#status');
  const loading = document.querySelector('#loading');
  const opener = document.querySelector('#opener');
  const sound = document.querySelector('#sound');
  const music = document.querySelector('#music');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let timers = [], generation = 0, ready = false, muted = false;

  // The track is composed on the same timeline as the CSS, so it restarts with the bouquet.
  function playMusic() {
    music.currentTime = 0;
    if (!muted) music.play().catch(() => {});
  }

  function arm(task) {
    task.started = performance.now();
    task.id = setTimeout(() => {
      timers = timers.filter(t => t !== task);
      task.fn();
    }, task.remaining);
  }
  // Freeze the sequence when the tab is hidden, so no part of the gift is missed.
  function later(fn, delay) {
    const task = { fn, remaining: delay, started: 0, id: 0 };
    timers.push(task);
    if (!document.hidden) arm(task);
  }
  function stop() {
    generation++;
    timers.forEach(t => clearTimeout(t.id));
    timers = [];
  }
  function loadImage(img) {
    if (img.complete) return img.naturalWidth ? Promise.resolve() : Promise.reject(new Error(img.src));
    return new Promise((resolve, reject) => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', reject, { once: true });
    });
  }
  function complete() {
    bouquet.classList.remove('is-preparing', 'is-assembling');
    scene.classList.add('is-started', 'is-living');
    replay.hidden = false;
    breeze.hidden = motion.matches;
    status.textContent = 'El ramo de rosas azules está completo.';
  }
  function assemble() {
    stop();
    const current = generation;
    replay.hidden = true;
    breeze.hidden = true;
    breeze.setAttribute('aria-pressed', 'false');
    breeze.textContent = 'Pausar la brisa';
    scene.classList.remove('is-started', 'is-living', 'is-breeze-paused');
    bouquet.classList.remove('is-assembling');
    bouquet.classList.add('is-preparing');
    music.pause();
    sound.hidden = false;
    if (motion.matches) { complete(); playMusic(); return; }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (current !== generation) return;
      bouquet.classList.remove('is-preparing');
      bouquet.classList.add('is-assembling');
      scene.classList.add('is-started');
      playMusic();
      status.textContent = 'Los tallos crecen, las rosas azules florecen y el papel envuelve el ramo.';
      later(complete, 10200);
    }));
  }

  bouquet.classList.add('is-preparing');
  const loadingNotice = setTimeout(() => { if (!ready) loading.hidden = false; }, 600);
  Promise.allSettled([...document.images].map(loadImage).concat(document.fonts.ready)).then(results => {
    clearTimeout(loadingNotice);
    loading.hidden = true;
    if (results.some(r => r.status === 'rejected')) {
      bouquet.classList.remove('is-preparing');
      scene.classList.add('is-started');
      status.className = 'status-error';
      status.textContent = 'Falta una imagen. Conserva la carpeta assets junto a index.html y vuelve a abrir la página.';
      return;
    }
    ready = true;
    opener.hidden = false;
  });
  opener.addEventListener('click', () => {
    opener.hidden = true;
    assemble();
  });
  sound.addEventListener('click', () => {
    muted = !muted;
    music.muted = muted;
    sound.setAttribute('aria-pressed', String(muted));
    sound.textContent = muted ? 'Activar sonido' : 'Silenciar';
    if (!muted && music.paused && !music.ended && scene.classList.contains('is-started') && !document.hidden) music.play().catch(() => {});
  });
  replay.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: motion.matches ? 'instant' : 'smooth' }); assemble(); });
  breeze.addEventListener('click', () => {
    const paused = scene.classList.toggle('is-breeze-paused');
    breeze.setAttribute('aria-pressed', String(paused));
    breeze.textContent = paused ? 'Con brisa' : 'Sin brisa';
  });
  function visibilityChanged() {
    scene.classList.toggle('is-suspended', document.hidden);
    if (document.hidden) {
      music.pause();
      timers.forEach(t => {
        clearTimeout(t.id);
        if (t.id) t.remaining = Math.max(0, t.remaining - (performance.now() - t.started));
        t.id = 0;
      });
    } else {
      timers.filter(t => !t.id).forEach(arm);
      if (!muted && music.currentTime > 0 && !music.ended) music.play().catch(() => {});
    }
  }
  document.addEventListener('visibilitychange', visibilityChanged);
  visibilityChanged();
  motion.addEventListener('change', () => { if (ready && opener.hidden) assemble(); });
})();
