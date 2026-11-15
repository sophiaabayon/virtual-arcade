/* Memory Match: eight pairs, pixel glyphs, a clock and a score that rewards speed. */

(function (A) {
  'use strict';
  const { h, shuffle, pixelIcon } = A;

  const SYMBOLS = [
    { name: 'Heart', color: '#ff6b4a', rows: ['.aa.aa.', 'aaaaaaa', 'aaaaaaa', 'aaaaaaa', '.aaaaa.', '..aaa..', '...a...'] },
    { name: 'Star', color: '#6c9cff', rows: ['...a...', '...a...', 'aaaaaaa', '.aaaaa.', '..aaa..', '.aa.aa.', '.a...a.'] },
    { name: 'Diamond', color: '#f4b942', rows: ['...a...', '..aaa..', '.aaaaa.', 'aaaaaaa', '.aaaaa.', '..aaa..', '...a...'] },
    { name: 'Bolt', color: '#5fd38d', rows: ['...aaa.', '..aaa..', '.aaa...', '.aaaaa.', '...aa..', '..aa...', '.a.....'] },
    { name: 'Ghost', color: '#ee8fc0', rows: ['.aaaaa.', 'aaaaaaa', 'awaaawa', 'aaaaaaa', 'aaaaaaa', 'aaaaaaa', 'a.a.a.a'] },
    { name: 'Moon', color: '#4fc6d6', rows: ['...aaa.', '..aa...', '.aa....', '.aa....', '.aa....', '..aa...', '...aaa.'] },
    { name: 'Coin', color: '#ff9a3c', rows: ['..aaa..', '.a...a.', 'a..a..a', 'a.aaa.a', 'a..a..a', '.a...a.', '..aaa..'] },
    { name: 'Crown', color: '#a98bff', rows: ['.......', 'a.a.a.a', 'aaaaaaa', 'aaaaaaa', 'aaaaaaa', '.aaaaa.', '.......'] },
  ];

  const PAIRS = SYMBOLS.length;
  const MISS_PENALTY = 10;
  const PAIR_POINTS = 100;
  const BONUS_WINDOW_SECONDS = 90;
  const BONUS_PER_SECOND = 5;

  function mount(ctx) {
    let cards;
    let first;
    let locked;
    let moves;
    let misses;
    let pairs;
    let startedAt;
    let clock = null;
    let flipTimer = null;
    let over;

    const movesEl = h('strong', null, '0');
    const timeEl = h('strong', null, '0s');
    const pairsEl = h('strong', null, `0 of ${PAIRS}`);
    const grid = h('div', { class: 'mem__grid', role: 'group', 'aria-label': 'Memory cards' });
    const hud = h('div', { class: 'mem__hud' },
      h('div', null, h('span', null, 'Moves'), movesEl),
      h('div', null, h('span', null, 'Time'), timeEl),
      h('div', null, h('span', null, 'Pairs'), pairsEl));

    ctx.stage.appendChild(h('div', { class: 'mem' }, hud, grid));

    const elapsed = () => (startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0);
    const liveScore = () => Math.max(0, pairs * PAIR_POINTS - misses * MISS_PENALTY);

    function label(card, index) {
      const state = card.matched ? 'matched' : card.flipped ? card.symbol.name : 'face down';
      return `Card ${index + 1}, ${state}`;
    }

    function cardEl(card, index) {
      const glyph = pixelIcon(card.symbol.rows, { a: '#1b1f3b', w: '#ffffff' });
      const button = h('button', {
        type: 'button',
        class: 'mem__card',
        style: `--card-color: ${card.symbol.color}`,
        onClick: () => flip(index),
      },
      h('span', { class: 'mem__inner' },
        h('span', { class: 'mem__face mem__back' }),
        h('span', { class: 'mem__face mem__front' }, glyph)));
      card.el = button;
      button.setAttribute('aria-label', label(card, index));
      return button;
    }

    function paint(card, index) {
      card.el.classList.toggle('is-flipped', card.flipped || card.matched);
      card.el.classList.toggle('is-matched', card.matched);
      card.el.setAttribute('aria-label', label(card, index));
    }

    function renderHud() {
      movesEl.textContent = String(moves);
      timeEl.textContent = `${elapsed()}s`;
      pairsEl.textContent = `${pairs} of ${PAIRS}`;
    }

    function stopClock() {
      clearInterval(clock);
      clock = null;
    }

    function restart() {
      stopClock();
      clearTimeout(flipTimer);
      const deck = shuffle([...SYMBOLS, ...SYMBOLS]);
      cards = deck.map((symbol) => ({ symbol, flipped: false, matched: false, el: null }));
      first = null;
      locked = false;
      over = false;
      moves = 0;
      misses = 0;
      pairs = 0;
      startedAt = 0;
      ctx.setScore(0);
      grid.replaceChildren(...cards.map(cardEl));
      renderHud();
      ctx.setStatus('Flip a card to begin.');
    }

    function flip(index) {
      const card = cards[index];
      if (over || locked || card.flipped || card.matched) return;

      if (!startedAt) {
        startedAt = Date.now();
        ctx.start();
        clock = setInterval(renderHud, 500);
        ctx.setStatus('');
      }

      card.flipped = true;
      paint(card, index);
      ctx.sfx('flip');

      if (first === null) {
        first = index;
        return;
      }

      const other = cards[first];
      const otherIndex = first;
      first = null;
      moves += 1;

      if (other.symbol === card.symbol) {
        card.matched = true;
        other.matched = true;
        pairs += 1;
        paint(card, index);
        paint(other, otherIndex);
        ctx.extra('pairs');
        ctx.sfx('good');
        ctx.setScore(liveScore());
        renderHud();
        if (pairs === PAIRS) finish();
        return;
      }

      misses += 1;
      locked = true;
      ctx.setScore(liveScore());
      renderHud();
      flipTimer = setTimeout(() => {
        ctx.sfx('bad');
        card.flipped = false;
        other.flipped = false;
        paint(card, index);
        paint(other, otherIndex);
        locked = false;
      }, 800);
    }

    function finish() {
      over = true;
      stopClock();
      const seconds = elapsed();
      const bonus = Math.max(0, BONUS_WINDOW_SECONDS - seconds) * BONUS_PER_SECOND;
      const total = liveScore() + bonus;
      ctx.sfx('win');
      ctx.gameOver(total, {
        headline: 'Board cleared',
        detail: `${moves} moves in ${seconds}s, including a ${bonus} point time bonus.`,
      });
    }

    ctx.onDestroy(() => {
      stopClock();
      clearTimeout(flipTimer);
    });

    restart();
    return { restart, destroy() { stopClock(); clearTimeout(flipTimer); } };
  }

  A.Games.attach('memory', mount);
})(window.Arcade);
