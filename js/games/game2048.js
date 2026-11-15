/* 2048: slide and merge tiles. The board logic is plain functions so it can be tested. */

(function (A) {
  'use strict';

  const N = 4;
  const WIN_TILE = 2048;

  /** Board position of the j-th cell on line i when sliding toward `dir`. */
  function cellAt(dir, i, j) {
    switch (dir) {
      case 'left': return [i, j];
      case 'right': return [i, N - 1 - j];
      case 'up': return [j, i];
      default: return [N - 1 - j, i];
    }
  }

  /** Slide one line toward index 0 and merge equal neighbours once. */
  function slideLine(line) {
    const tiles = line.filter(Boolean);
    const out = [];
    const mergedAt = [];
    let gained = 0;
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i] === tiles[i + 1]) {
        out.push(tiles[i] * 2);
        mergedAt.push(out.length - 1);
        gained += tiles[i] * 2;
        i += 1;
      } else {
        out.push(tiles[i]);
      }
    }
    while (out.length < line.length) out.push(0);
    return { line: out, gained, mergedAt };
  }

  function move(grid, dir) {
    const next = grid.map((row) => row.slice());
    const merged = [];
    let gained = 0;
    for (let i = 0; i < N; i++) {
      const line = [];
      for (let j = 0; j < N; j++) {
        const [r, c] = cellAt(dir, i, j);
        line.push(grid[r][c]);
      }
      const result = slideLine(line);
      result.line.forEach((value, j) => {
        const [r, c] = cellAt(dir, i, j);
        next[r][c] = value;
      });
      gained += result.gained;
      result.mergedAt.forEach((j) => merged.push(cellAt(dir, i, j)));
    }
    const moved = next.some((row, r) => row.some((value, c) => value !== grid[r][c]));
    return { grid: next, gained, moved, merged };
  }

  function emptyCells(grid) {
    const cells = [];
    grid.forEach((row, r) => row.forEach((value, c) => { if (!value) cells.push([r, c]); }));
    return cells;
  }

  /** Put a 2 (90%) or a 4 (10%) in a random empty cell. */
  function addTile(grid, rng = Math.random) {
    const cells = emptyCells(grid);
    if (!cells.length) return { grid, pos: null };
    const [r, c] = cells[Math.floor(rng() * cells.length)];
    const next = grid.map((row) => row.slice());
    next[r][c] = rng() < 0.9 ? 2 : 4;
    return { grid: next, pos: [r, c] };
  }

  function canMove(grid) {
    if (emptyCells(grid).length) return true;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (c + 1 < N && grid[r][c] === grid[r][c + 1]) return true;
        if (r + 1 < N && grid[r][c] === grid[r + 1][c]) return true;
      }
    }
    return false;
  }

  const maxTile = (grid) => Math.max(...grid.flat());
  const emptyGrid = () => Array.from({ length: N }, () => Array(N).fill(0));

  const logic = { N, slideLine, move, addTile, canMove, maxTile, emptyGrid };
  if (typeof module !== 'undefined' && module.exports) module.exports = logic;
  if (typeof A === 'undefined' || !A.Games) return;

  /* UI */
  const { h } = A;

  const KEYMAP = {
    ArrowUp: 'up', w: 'up', W: 'up',
    ArrowDown: 'down', s: 'down', S: 'down',
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right', d: 'right', D: 'right',
  };

  function mount(ctx) {
    let grid;
    let score;
    let over;
    let reachedWin;
    let fresh = null;
    let mergedCells = [];

    const cells = Array.from({ length: N * N }, () => h('div', { class: 'g2048__cell' }));
    const board = h('div', { class: 'g2048__board', role: 'img' }, cells);
    ctx.stage.appendChild(h('div', { class: 'g2048' }, board));

    function render() {
      cells.forEach((cell, index) => {
        const r = Math.floor(index / N);
        const c = index % N;
        const value = grid[r][c];
        cell.textContent = value || '';
        cell.className = 'g2048__cell';
        if (value) cell.classList.add(value > 2048 ? 'v-big' : `v-${value}`);
        if (fresh && fresh[0] === r && fresh[1] === c) cell.classList.add('is-new');
        else if (mergedCells.some(([mr, mc]) => mr === r && mc === c)) cell.classList.add('is-merged');
      });
      const rows = grid.map((row, r) => `row ${r + 1}: ${row.map((v) => v || 'empty').join(', ')}`);
      board.setAttribute('aria-label', `2048 board. ${rows.join('. ')}`);
    }

    function restart() {
      score = 0;
      over = false;
      reachedWin = false;
      mergedCells = [];
      fresh = null;
      grid = addTile(addTile(emptyGrid()).grid).grid;
      ctx.setScore(0);
      ctx.setStatus('Slide the tiles with the arrow keys or a swipe.');
      render();
    }

    function slide(dir) {
      if (over) return;
      const result = move(grid, dir);
      if (!result.moved) return;

      ctx.start();
      const added = addTile(result.grid);
      grid = added.grid;
      fresh = added.pos;
      mergedCells = result.merged;
      score += result.gained;
      ctx.setScore(score);
      ctx.sfx(result.gained ? 'merge' : 'move');
      ctx.setStatus('');
      render();

      const best = maxTile(grid);
      ctx.extraMax('bestTile', best);

      if (best >= WIN_TILE && !reachedWin) {
        reachedWin = true;
        ctx.sfx('win');
        ctx.toast('You made 2048! Keep going for a higher score.');
      }

      if (!canMove(grid)) {
        over = true;
        ctx.sfx('lose');
        ctx.gameOver(score, { headline: 'No moves left', detail: `Your best tile was ${best}.` });
      }
    }

    ctx.listen(document, 'keydown', (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const dir = KEYMAP[event.key];
      if (!dir || over) return;
      event.preventDefault();
      slide(dir);
    });

    let touchStart = null;
    ctx.listen(board, 'pointerdown', (event) => {
      touchStart = { x: event.clientX, y: event.clientY };
    });
    ctx.listen(board, 'pointerup', (event) => {
      if (!touchStart) return;
      const dx = event.clientX - touchStart.x;
      const dy = event.clientY - touchStart.y;
      touchStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
      if (Math.abs(dx) > Math.abs(dy)) slide(dx > 0 ? 'right' : 'left');
      else slide(dy > 0 ? 'down' : 'up');
    });

    restart();
    return { restart, destroy() {} };
  }

  A.Games.attach('2048', mount);
})(typeof window !== 'undefined' ? window.Arcade : undefined);
