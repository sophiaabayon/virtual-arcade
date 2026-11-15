/* Game page. It owns everything around a game (score bar, instructions,
   restart, end-of-run overlay, run bookkeeping) and hands each game a small
   context object to mount into. */

(function (A) {
  'use strict';
  const { h, clear, Store, Games, Sfx, formatNumber } = A;

  function missingGame() {
    return {
      title: 'Game not found',
      node: h('section', { class: 'empty-state' },
        h('h1', null, 'Game not found'),
        h('p', null, 'There is no game with that name on the shelf.'),
        h('a', { class: 'btn btn--primary', href: '#/library' }, 'Open the library')),
    };
  }

  function helpPanels(game, open) {
    const instructions = h('details', { class: 'help', open },
      h('summary', null, 'How to play'),
      h('ul', { class: 'help__list' }, game.instructions.map((line) => h('li', null, line))));

    const controls = h('details', { class: 'help', open },
      h('summary', null, 'Controls'),
      h('dl', { class: 'help__controls' }, game.controls.map(([keys, action]) =>
        h('div', null, h('dt', null, keys), h('dd', null, action)))));

    return [instructions, controls];
  }

  A.views.game = function (route) {
    const game = Games.get(route.params.id);
    if (!game) return missingGame();

    const cleanups = [];
    const run = { active: false, score: 0, startedAt: 0 };
    let instance = null;

    /* Layout */
    const scoreValue = h('strong', null, '0');
    const status = h('p', { class: 'status', 'aria-live': 'polite' });
    const stage = h('div', { class: 'stage', tabindex: '-1' });
    const overlayTitle = h('h2', { id: 'overlay-title' });
    const overlayScore = h('strong', { class: 'overlay__score' });
    const overlayLabel = h('span', null, game.scoreLabel);
    const overlayDetail = h('p', { class: 'overlay__detail' });
    const playAgain = h('button', { type: 'button', class: 'btn btn--primary', onClick: () => restart() }, 'Play again');
    const overlay = h('div', { class: 'overlay', role: 'dialog', 'aria-labelledby': 'overlay-title', hidden: true },
      overlayTitle,
      h('p', { class: 'overlay__result' }, overlayLabel, overlayScore),
      overlayDetail,
      h('div', { class: 'overlay__actions' },
        playAgain,
        h('a', { class: 'btn btn--light', href: '#/library' }, 'Back to library')));

    const wide = window.matchMedia('(min-width: 900px)').matches;
    const showHelp = wide || !Store.hasSeenIntro(game.id);

    const node = h('section', { class: 'game-page', style: `--accent: ${game.accent}` },
      h('a', { class: 'back-link', href: '#/library' }, 'Back to library'),
      h('header', { class: 'game-head' },
        h('span', { class: 'game-head__tile' }, Games.icon(game)),
        h('div', { class: 'game-head__text' },
          h('h1', null, game.title),
          h('p', null, game.tagline))),
      h('div', { class: 'game-layout' },
        h('div', { class: 'game-main' },
          h('div', { class: 'scorebar' },
            h('div', { class: 'scorebar__item' }, h('span', null, game.scoreLabel), scoreValue),
            h('div', { class: 'scorebar__actions' },
              h('button', { type: 'button', class: 'btn btn--small', onClick: () => restart() }, 'Restart'))),
          h('div', { class: 'screen' }, stage, overlay),
          status),
        h('aside', { class: 'game-side', 'aria-label': 'Instructions' }, helpPanels(game, showHelp))));

    /* Run bookkeeping */
    function setScore(value) {
      run.score = value;
      scoreValue.textContent = formatNumber(value);
    }

    function startRun() {
      if (run.active) return;
      run.active = true;
      run.score = 0;
      run.startedAt = Date.now();
      Store.beginRun(game.id);
    }

    /** Close the current run and save it. Safe to call when nothing is running. */
    function finishRun() {
      if (!run.active) return null;
      run.active = false;
      return Store.finishRun(game.id, run.score, Date.now() - run.startedAt);
    }

    function showOverlay(headline, score, detail) {
      overlayTitle.textContent = headline;
      overlayScore.textContent = formatNumber(score);
      overlayDetail.textContent = detail || '';
      overlayDetail.hidden = !detail;
      overlay.hidden = false;
      stage.inert = true;
      playAgain.focus();
    }

    function hideOverlay() {
      overlay.hidden = true;
      stage.inert = false;
    }

    function restart() {
      finishRun();
      hideOverlay();
      setScore(0);
      status.textContent = '';
      if (instance) instance.restart();
      stage.focus({ preventScroll: true });
    }

    /* What a game receives */
    const api = {
      stage,
      start: startRun,
      setScore,
      setStatus: (text) => { status.textContent = text; },
      sfx: (name) => Sfx.play(name),
      extra: (key, amount) => Store.addExtra(game.id, key, amount),
      extraMax: (key, value) => Store.maxExtra(game.id, key, value),
      toast: (message) => A.toast(message),

      gameOver(score, info = {}) {
        startRun();
        setScore(score);
        finishRun();
        showOverlay(info.headline || 'Game over', score, info.detail);
      },

      /** Add an event listener that is removed when the page closes. */
      listen(target, type, handler, options) {
        target.addEventListener(type, handler, options);
        cleanups.push(() => target.removeEventListener(type, handler, options));
      },

      onDestroy(fn) { cleanups.push(fn); },
    };

    api.listen(window, 'pagehide', finishRun);

    return {
      title: game.title,
      node,
      mounted() {
        if (!game.mount) {
          stage.appendChild(h('p', { class: 'muted' }, 'This game could not be loaded.'));
          return;
        }
        try {
          instance = game.mount(api);
        } catch (error) {
          console.error(error);
          clear(stage);
          stage.appendChild(h('p', { class: 'muted' }, 'Something went wrong starting this game. Reload the page to try again.'));
        }
        if (showHelp && !wide) Store.markIntroSeen(game.id);
      },
      destroy() {
        finishRun();
        if (instance && typeof instance.destroy === 'function') instance.destroy();
        cleanups.splice(0).forEach((fn) => fn());
      },
    };
  };
})(window.Arcade);
