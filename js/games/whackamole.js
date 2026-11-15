/* Whack-a-Mole: thirty seconds, nine holes. One tick loop drives timing, so
   pausing simply stops the clock. */

(function (A) {
  'use strict';
  const { h, pixelIcon, randInt } = A;

  const HOLES = 9;
  const ROUND_SECONDS = 30;
  const TICK_MS = 50;
  const GOLD_CHANCE = 0.12;
  const HIT_FLASH = 0.25;

  const MOLE_ROWS = [
    '..oooo..',
    '.obbbbo.',
    'obwbbwbo',
    'obbbbbbo',
    'obbrrbbo',
    'obbbbbbo',
    '.obbbbo.',
    '..oooo..',
  ];
  const FUR = { o: '#1b1f3b', b: '#9a6b45', w: '#ffffff', r: '#e5483a' };
  const GOLD = { o: '#1b1f3b', b: '#ffd23f', w: '#ffffff', r: '#e5483a' };

  const lerp = (from, to, t) => from + (to - from) * t;

  function mount(ctx) {
    let phase; // ready, running, paused, over
    let timeLeft;
    let score;
    let hits;
    let taps;
    let spawnIn;
    let holes;
    let lastTick = 0;
    let loop = null;

    const timeEl = h('strong', null, `${ROUND_SECONDS}s`);
    const accuracyEl = h('strong', null, '-');
    const meter = h('div', { class: 'mole__meter-fill' });
    const coverTitle = h('p', { class: 'mole__cover-title' });
    const coverButton = h('button', { type: 'button', class: 'btn btn--primary', onClick: () => primary() }, 'Start');
    const cover = h('div', { class: 'mole__cover' }, coverTitle, coverButton);

    const holeEls = Array.from({ length: HOLES }, (_, i) => {
      const button = h('button', {
        type: 'button',
        class: 'mole__hole',
        'aria-label': `Hole ${i + 1}`,
        onPointerdown: () => whack(i),
        onClick: (event) => { if (event.detail === 0) whack(i); },
      },
      h('span', { class: 'mole__mole' }, pixelIcon(MOLE_ROWS, FUR)),
      h('span', { class: 'mole__dirt' }));
      return button;
    });
    const golden = holeEls.map(() => pixelIcon(MOLE_ROWS, GOLD));
    const normal = holeEls.map((el) => el.querySelector('svg'));

    ctx.stage.appendChild(h('div', { class: 'mole' },
      h('div', { class: 'mole__hud' },
        h('div', null, h('span', null, 'Time left'), timeEl),
        h('div', null, h('span', null, 'Accuracy'), accuracyEl)),
      h('div', { class: 'mole__meter', 'aria-hidden': 'true' }, meter),
      h('div', { class: 'mole__field' },
        h('div', { class: 'mole__grid', role: 'group', 'aria-label': 'Mole holes' }, holeEls),
        cover)));

    const progress = () => 1 - timeLeft / ROUND_SECONDS;

    function showCover(title, buttonLabel) {
      coverTitle.textContent = title;
      coverButton.textContent = buttonLabel;
      cover.hidden = false;
    }

    function render() {
      timeEl.textContent = `${Math.max(0, Math.ceil(timeLeft))}s`;
      meter.style.width = `${Math.max(0, (timeLeft / ROUND_SECONDS) * 100)}%`;
      accuracyEl.textContent = taps ? `${Math.round((hits / taps) * 100)}%` : '-';
      holes.forEach((hole, i) => {
        const el = holeEls[i];
        el.classList.toggle('is-up', hole.state === 'up');
        el.classList.toggle('is-hit', hole.state === 'hit');
        el.classList.toggle('is-gold', hole.gold && hole.state !== 'empty');
        const svg = el.querySelector('.mole__mole svg');
        const wanted = hole.gold ? golden[i] : normal[i];
        if (svg !== wanted) el.querySelector('.mole__mole').replaceChildren(wanted);
      });
    }

    function resetState() {
      phase = 'ready';
      timeLeft = ROUND_SECONDS;
      score = 0;
      hits = 0;
      taps = 0;
      spawnIn = 0.6;
      holes = Array.from({ length: HOLES }, () => ({ state: 'empty', ttl: 0, gold: false }));
    }

    function stopLoop() {
      clearInterval(loop);
      loop = null;
    }

    function startLoop() {
      stopLoop();
      lastTick = performance.now();
      loop = setInterval(tick, TICK_MS);
    }

    function restart() {
      stopLoop();
      resetState();
      ctx.setScore(0);
      showCover('Hit the moles before they hide.', 'Start');
      ctx.setStatus('');
      render();
    }

    function primary() {
      if (phase === 'ready') {
        begin();
      } else if (phase === 'paused') {
        phase = 'running';
        cover.hidden = true;
        ctx.setStatus('');
        startLoop();
      }
    }

    function begin() {
      resetState();
      phase = 'running';
      ctx.start();
      ctx.setScore(0);
      cover.hidden = true;
      render();
      startLoop();
    }

    function pause() {
      if (phase !== 'running') return;
      phase = 'paused';
      stopLoop();
      showCover('Paused', 'Resume');
      ctx.setStatus('Paused. Press Space to resume.');
      coverButton.focus({ preventScroll: true });
    }

    function spawn() {
      const free = holes.map((hole, i) => (hole.state === 'empty' ? i : -1)).filter((i) => i >= 0);
      if (!free.length) return;
      const index = free[randInt(0, free.length - 1)];
      const gold = Math.random() < GOLD_CHANCE;
      const base = lerp(1.0, 0.55, progress());
      holes[index] = { state: 'up', ttl: gold ? base * 0.7 : base, gold };
    }

    function tick() {
      const now = performance.now();
      const dt = Math.min(0.25, (now - lastTick) / 1000);
      lastTick = now;
      if (phase !== 'running') return;

      timeLeft -= dt;
      holes.forEach((hole) => {
        if (hole.state === 'empty') return;
        hole.ttl -= dt;
        if (hole.ttl <= 0) hole.state = 'empty';
      });

      const upCount = holes.filter((hole) => hole.state === 'up').length;
      const maxUp = progress() > 0.5 ? 2 : 1;
      spawnIn -= dt;
      if (spawnIn <= 0) {
        if (upCount < maxUp) spawn();
        spawnIn = lerp(0.75, 0.38, progress()) * (0.8 + Math.random() * 0.4);
      }

      render();
      if (timeLeft <= 0) finish();
    }

    function whack(index) {
      if (phase !== 'running') return;
      taps += 1;
      const hole = holes[index];
      if (hole.state === 'up') {
        const points = hole.gold ? 3 : 1;
        hole.state = 'hit';
        hole.ttl = HIT_FLASH;
        score += points;
        hits += 1;
        ctx.setScore(score);
        ctx.extra('whacks');
        ctx.sfx(hole.gold ? 'win' : 'hit');
      }
      render();
    }

    function finish() {
      phase = 'over';
      stopLoop();
      timeLeft = 0;
      holes.forEach((hole) => { hole.state = 'empty'; });
      render();
      const accuracy = taps ? Math.round((hits / taps) * 100) : 0;
      ctx.sfx('lose');
      ctx.gameOver(score, {
        headline: "Time's up",
        detail: `${hits} ${hits === 1 ? 'mole' : 'moles'} whacked with ${accuracy}% accuracy.`,
      });
    }

    ctx.listen(document, 'keydown', (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (/^[1-9]$/.test(event.key)) {
        whack(Number(event.key) - 1);
      } else if (event.code === 'Space' && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        if (phase === 'running') pause();
        else primary();
      }
    });
    ctx.listen(document, 'visibilitychange', () => { if (document.hidden) pause(); });
    ctx.onDestroy(stopLoop);

    restart();
    return { restart, destroy: stopLoop };
  }

  A.Games.attach('whackamole', mount);
})(window.Arcade);
