/* Tic-Tac-Toe against the CPU. Wins and draws build a run; one loss ends it. */

(function (A) {
  'use strict';

  const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  const LEVELS = [
    { name: 'Easy', skill: 0.25, multiplier: 1 },
    { name: 'Normal', skill: 0.65, multiplier: 2 },
    { name: 'Hard', skill: 0.95, multiplier: 3 },
  ];

  /* Pure game logic (also used by the tests) */
  function winnerOf(board) {
    for (const line of LINES) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) return { mark: board[a], line };
    }
    return board.every(Boolean) ? { mark: 'draw', line: null } : null;
  }

  function minimax(board, turn, me, depth) {
    const result = winnerOf(board);
    if (result) {
      if (result.mark === 'draw') return 0;
      return result.mark === me ? 10 - depth : depth - 10;
    }
    const other = me === 'X' ? 'O' : 'X';
    const maximizing = turn === me;
    let best = maximizing ? -Infinity : Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i]) continue;
      board[i] = turn;
      const score = minimax(board, maximizing ? other : me, me, depth + 1);
      board[i] = null;
      best = maximizing ? Math.max(best, score) : Math.min(best, score);
    }
    return best;
  }

  /** Every move that keeps `me` on the best achievable path. */
  function bestMoves(board, me) {
    const other = me === 'X' ? 'O' : 'X';
    let bestScore = -Infinity;
    let moves = [];
    for (let i = 0; i < 9; i++) {
      if (board[i]) continue;
      board[i] = me;
      const score = minimax(board, other, me, 1);
      board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        moves = [i];
      } else if (score === bestScore) moves.push(i);
    }
    return moves;
  }

  /** Play perfectly with probability `skill`, otherwise pick any open square. */
  function cpuMove(board, me, skill, rng = Math.random) {
    const open = board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    const pool = rng() < skill ? bestMoves(board, me) : open;
    return pool[Math.floor(rng() * pool.length)];
  }

  const logic = { LINES, winnerOf, bestMoves, cpuMove };
  if (typeof module !== 'undefined' && module.exports) module.exports = logic;
  if (typeof A === 'undefined' || !A.Games) return;

  /* UI */
  const { h } = A;

  function mount(ctx) {
    let board;
    let round;
    let level = 1;
    let score;
    let playerMark;
    let turn;
    let phase; // playing, roundover, over
    let winLine = null;
    let cpuTimer = null;

    const info = h('p', { class: 'ttt__info' });
    const cells = Array.from({ length: 9 }, (_, i) => h('button', {
      type: 'button',
      class: 'ttt__cell',
      onClick: () => playerMove(i),
    }));
    const boardEl = h('div', { class: 'ttt__board', role: 'group', 'aria-label': 'Tic-Tac-Toe board' }, cells);
    const nextBtn = h('button', { type: 'button', class: 'btn btn--primary', onClick: () => nextRound() }, 'Next round');
    const levelButtons = LEVELS.map((item, index) => h('button', {
      type: 'button',
      class: 'chip',
      onClick: () => {
        level = index;
        ctx.sfx('click');
        renderLevels();
      },
    }, item.name));
    const levelBar = h('div', { class: 'chips', role: 'group', 'aria-label': 'Difficulty' }, levelButtons);

    ctx.stage.appendChild(h('div', { class: 'ttt' }, levelBar, info, boardEl, nextBtn));

    function renderLevels() {
      levelButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === level)));
    }

    function render() {
      cells.forEach((cell, i) => {
        const mark = board[i];
        const row = Math.floor(i / 3) + 1;
        const col = (i % 3) + 1;
        cell.textContent = mark || '';
        cell.disabled = Boolean(mark) || phase !== 'playing' || turn !== playerMark;
        cell.classList.toggle('is-win', Boolean(winLine && winLine.includes(i)));
        cell.setAttribute('aria-label', `Row ${row}, column ${col}, ${mark || 'empty'}`);
      });
      nextBtn.hidden = phase !== 'roundover';
      renderLevels();
    }

    function setInfo(text) {
      info.textContent = text;
      ctx.setStatus(text);
    }

    function newRound() {
      clearTimeout(cpuTimer);
      board = Array(9).fill(null);
      winLine = null;
      phase = 'playing';
      turn = 'X';
      playerMark = round % 2 === 1 ? 'X' : 'O';
      setInfo(`Round ${round}. You are ${playerMark}${playerMark === 'X' ? ' and you start.' : ' and the CPU starts.'}`);
      render();
      if (turn !== playerMark) scheduleCpu();
    }

    function nextRound() {
      if (phase !== 'roundover') return;
      round += 1;
      ctx.sfx('click');
      newRound();
    }

    function restart() {
      clearTimeout(cpuTimer);
      score = 0;
      round = 1;
      ctx.setScore(0);
      newRound();
    }

    function scheduleCpu() {
      clearTimeout(cpuTimer);
      cpuTimer = setTimeout(() => {
        if (phase !== 'playing') return;
        place(cpuMove(board, turn, LEVELS[level].skill));
      }, 450);
    }

    function playerMove(index) {
      if (phase !== 'playing' || turn !== playerMark || board[index]) return;
      ctx.start();
      place(index);
    }

    function place(index) {
      board[index] = turn;
      ctx.sfx('move');
      const result = winnerOf(board);
      if (result) {
        endRound(result);
        return;
      }
      turn = turn === 'X' ? 'O' : 'X';
      render();
      if (turn !== playerMark) scheduleCpu();
    }

    function endRound(result) {
      winLine = result.line;
      render();
      const { multiplier } = LEVELS[level];

      if (result.mark === playerMark) {
        const points = 3 * multiplier;
        score += points;
        ctx.setScore(score);
        ctx.extra('wins');
        ctx.sfx('good');
        phase = 'roundover';
        setInfo(`You win the round and earn ${points} points.`);
      } else if (result.mark === 'draw') {
        const points = multiplier;
        score += points;
        ctx.setScore(score);
        ctx.extra('draws');
        ctx.sfx('click');
        phase = 'roundover';
        setInfo(`A draw earns ${points} ${points === 1 ? 'point' : 'points'}.`);
      } else {
        phase = 'over';
        ctx.extra('losses');
        ctx.sfx('lose');
        setInfo('The CPU wins this round.');
        ctx.gameOver(score, { headline: 'The CPU won', detail: `You lasted ${round} ${round === 1 ? 'round' : 'rounds'}.` });
        return;
      }
      render();
      nextBtn.focus({ preventScroll: true });
    }

    ctx.listen(document, 'keydown', (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (/^[1-9]$/.test(event.key)) {
        playerMove(Number(event.key) - 1);
      } else if (event.key === 'Enter' && phase === 'roundover' && !(event.target instanceof HTMLButtonElement)) {
        nextRound();
      }
    });
    ctx.onDestroy(() => clearTimeout(cpuTimer));

    restart();
    return { restart, destroy() { clearTimeout(cpuTimer); } };
  }

  A.Games.attach('tictactoe', mount);
})(typeof window !== 'undefined' ? window.Arcade : undefined);
