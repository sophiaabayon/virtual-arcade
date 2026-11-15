/* Snake: steer, eat, grow. Drawn on a canvas, driven by a self-scheduling timer. */

(function (A) {
  'use strict';
  const { h } = A;

  const SIZE = 20;
  const START_DELAY = 150;
  const MIN_DELAY = 70;
  const SPEED_STEP = 3;

  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  const KEYMAP = {
    ArrowUp: 'up', w: 'up', W: 'up',
    ArrowDown: 'down', s: 'down', S: 'down',
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right', d: 'right', D: 'right',
  };

  const PAD = [
    ['up', 'Up', 'pad-up'],
    ['left', 'Left', 'pad-left'],
    ['right', 'Right', 'pad-right'],
    ['down', 'Down', 'pad-down'],
  ];

  function mount(ctx) {
    const canvas = h('canvas', { class: 'snake__canvas', role: 'img', 'aria-label': 'Snake board' });
    const g = canvas.getContext('2d');
    let cell = 0;
    let state = null;
    let timer = null;

    /* Touch controls: a D-pad with pause in the middle. */
    const pad = h('div', { class: 'snake__pad', role: 'group', 'aria-label': 'Direction pad' },
      PAD.map(([dir, label, cls]) => h('button', {
        type: 'button',
        class: `btn snake__pad-btn snake__${cls}`,
        'aria-label': label,
        onClick: () => turn(dir),
      }, { up: '\u25B2', down: '\u25BC', left: '\u25C0', right: '\u25B6' }[dir]),
      ),
      h('button', {
        type: 'button',
        class: 'btn btn--small snake__pad-btn snake__pad-pause',
        'aria-label': 'Pause or resume',
        onClick: () => (state.phase === 'ready' ? turn('right') : togglePause()),
      }, 'II'));

    ctx.stage.appendChild(h('div', { class: 'snake' }, canvas, pad));

    /* State */
    function fresh() {
      const mid = Math.floor(SIZE / 2);
      return {
        snake: [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }],
        dir: DIRS.right,
        queue: [],
        apple: null,
        score: 0,
        delay: START_DELAY,
        phase: 'ready', // ready, running, paused, over
      };
    }

    function placeApple() {
      const taken = new Set(state.snake.map((c) => `${c.x},${c.y}`));
      const free = [];
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) if (!taken.has(`${x},${y}`)) free.push({ x, y });
      }
      return free.length ? A.pick(free) : null;
    }

    function restart() {
      clearTimeout(timer);
      state = fresh();
      state.apple = placeApple();
      ctx.setScore(0);
      draw();
    }

    /* Game flow */
    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(tick, state.delay);
    }

    function begin() {
      state.phase = 'running';
      ctx.start();
      ctx.setScore(0);
      ctx.setStatus('');
      schedule();
    }

    function togglePause() {
      if (state.phase === 'running') {
        state.phase = 'paused';
        clearTimeout(timer);
        ctx.setStatus('Paused. Press Space or tap the pause button to resume.');
        draw();
      } else if (state.phase === 'paused') {
        state.phase = 'running';
        ctx.setStatus('');
        schedule();
        draw();
      }
    }

    function turn(name) {
      if (state.phase === 'over' || state.phase === 'paused') return;
      const next = DIRS[name];
      const last = state.queue.length ? state.queue[state.queue.length - 1] : state.dir;
      const reverse = next.x === -last.x && next.y === -last.y;
      const same = next.x === last.x && next.y === last.y;
      if (state.phase === 'ready') begin();
      if (reverse || same) return;
      if (state.queue.length < 2) state.queue.push(next);
    }

    function finish(headline) {
      state.phase = 'over';
      clearTimeout(timer);
      draw();
      ctx.sfx(headline === 'Board cleared' ? 'win' : 'lose');
      ctx.gameOver(state.score, { headline, detail: `Final length ${state.snake.length}` });
    }

    function tick() {
      if (state.phase !== 'running') return;
      if (state.queue.length) state.dir = state.queue.shift();

      const head = state.snake[0];
      const next = { x: head.x + state.dir.x, y: head.y + state.dir.y };
      const eating = state.apple && next.x === state.apple.x && next.y === state.apple.y;
      const body = eating ? state.snake : state.snake.slice(0, -1);
      const hitWall = next.x < 0 || next.y < 0 || next.x >= SIZE || next.y >= SIZE;

      if (hitWall || body.some((c) => c.x === next.x && c.y === next.y)) {
        finish('Crashed');
        return;
      }

      state.snake.unshift(next);
      if (eating) {
        state.score += 1;
        state.delay = Math.max(MIN_DELAY, state.delay - SPEED_STEP);
        ctx.setScore(state.score);
        ctx.extra('apples');
        ctx.sfx('good');
        state.apple = placeApple();
        if (!state.apple) {
          finish('Board cleared');
          return;
        }
      } else {
        state.snake.pop();
      }
      draw();
      schedule();
    }

    /* Drawing */
    function palette() {
      const style = getComputedStyle(canvas);
      const read = (name) => style.getPropertyValue(name).trim();
      return {
        panel: read('--panel'),
        panel2: read('--panel-2'),
        ink: read('--ink'),
        accent: read('--accent'),
        font: read('--font-display') || 'monospace',
      };
    }

    function drawBanner(colors, lines) {
      g.fillStyle = colors.panel;
      g.globalAlpha = 0.86;
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.globalAlpha = 1;
      g.fillStyle = colors.ink;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `700 ${Math.round(cell * 0.85)}px ${colors.font}`;
      lines.forEach((line, i) => {
        g.fillText(line, canvas.width / 2, canvas.height / 2 + (i - (lines.length - 1) / 2) * cell * 1.3);
      });
    }

    function drawEyes(colors, head) {
      const cx = (head.x + 0.5) * cell;
      const cy = (head.y + 0.5) * cell;
      const { x: dx, y: dy } = state.dir;
      const eye = Math.max(2, cell * 0.16);
      g.fillStyle = colors.panel;
      [-1, 1].forEach((side) => {
        const ex = cx + dx * cell * 0.18 + -dy * side * cell * 0.2;
        const ey = cy + dy * cell * 0.18 + dx * side * cell * 0.2;
        g.fillRect(ex - eye / 2, ey - eye / 2, eye, eye);
      });
    }

    function draw() {
      if (!cell || !state) return;
      const colors = palette();
      const line = Math.max(1, cell * 0.07);

      g.fillStyle = colors.panel;
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.fillStyle = colors.panel2;
      g.globalAlpha = 0.45;
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          if ((x + y) % 2 === 0) g.fillRect(x * cell, y * cell, cell, cell);
        }
      }
      g.globalAlpha = 1;

      if (state.apple) {
        const inset = cell * 0.14;
        g.fillStyle = '#e5483a';
        g.fillRect(state.apple.x * cell + inset, state.apple.y * cell + inset, cell - inset * 2, cell - inset * 2);
        g.fillStyle = '#ffffff';
        g.fillRect(state.apple.x * cell + cell * 0.3, state.apple.y * cell + cell * 0.3, cell * 0.16, cell * 0.16);
      }

      for (let i = state.snake.length - 1; i >= 0; i--) {
        const part = state.snake[i];
        const inset = cell * 0.05;
        g.fillStyle = i === 0 ? colors.ink : colors.accent;
        g.fillRect(part.x * cell + inset, part.y * cell + inset, cell - inset * 2, cell - inset * 2);
        g.strokeStyle = colors.ink;
        g.lineWidth = line;
        g.strokeRect(part.x * cell + inset, part.y * cell + inset, cell - inset * 2, cell - inset * 2);
      }
      drawEyes(colors, state.snake[0]);

      if (state.phase === 'ready') drawBanner(colors, ['Press an arrow key', 'or swipe to start']);
      if (state.phase === 'paused') drawBanner(colors, ['Paused']);
    }

    function resize() {
      const width = Math.floor(canvas.clientWidth);
      if (!width) return;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * ratio);
      canvas.height = canvas.width;
      cell = canvas.width / SIZE;
      draw();
    }

    /* Input */
    ctx.listen(document, 'keydown', (event) => {
      if (state.phase === 'over' || event.ctrlKey || event.metaKey || event.altKey) return;
      const name = KEYMAP[event.key];
      if (name) {
        event.preventDefault();
        turn(name);
      } else if (event.code === 'Space') {
        event.preventDefault();
        togglePause();
      }
    });

    let touchStart = null;
    ctx.listen(canvas, 'pointerdown', (event) => {
      touchStart = { x: event.clientX, y: event.clientY };
    });
    ctx.listen(canvas, 'pointerup', (event) => {
      if (!touchStart) return;
      const dx = event.clientX - touchStart.x;
      const dy = event.clientY - touchStart.y;
      touchStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) {
        // A tap starts the game or resumes it.
        if (state.phase === 'ready') turn('right');
        else if (state.phase === 'paused') togglePause();
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 'right' : 'left');
      else turn(dy > 0 ? 'down' : 'up');
    });

    ctx.listen(document, 'visibilitychange', () => {
      if (document.hidden && state.phase === 'running') togglePause();
    });

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    ctx.onDestroy(() => {
      observer.disconnect();
      clearTimeout(timer);
    });

    restart();
    resize();

    return { restart, destroy() { clearTimeout(timer); } };
  }

  A.Games.attach('snake', mount);
})(window.Arcade);
