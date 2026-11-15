/* Game library: every game as a row, filtered by category. */

(function (A) {
  'use strict';
  const { h, clear, Store, Games, Router, formatNumber } = A;

  function gameRow(game) {
    const stats = Store.stats(game.id);
    return h('li', { class: 'cabinet', style: `--accent: ${game.accent}` },
      h('div', { class: 'cabinet__tile' }, Games.icon(game)),
      h('div', { class: 'cabinet__text' },
        h('h2', { class: 'cabinet__title' },
          h('a', { class: 'cabinet__link', href: `#/game/${game.id}` }, game.title)),
        h('p', { class: 'cabinet__tagline' }, game.tagline),
        h('div', { class: 'cabinet__tags' },
          h('span', { class: 'tag' }, game.category),
          h('span', { class: 'tag' }, game.players),
          h('span', { class: 'tag' }, game.session))),
      h('div', { class: 'cabinet__side' },
        h('div', { class: 'cabinet__best' },
          h('span', null, stats.plays ? `Best ${game.scoreLabel.toLowerCase()}` : 'Not played yet'),
          h('strong', null, stats.plays ? formatNumber(stats.best) : '-')),
        h('span', { class: 'btn btn--primary btn--small cabinet__play', 'aria-hidden': 'true' }, 'Play')));
  }

  A.views.library = function (ctx) {
    const state = {
      category: Games.categories.includes(ctx.query.cat) ? ctx.query.cat : 'All',
    };

    const list = h('ul', { class: 'cabinet-list' });
    const count = h('p', { class: 'result-count', 'aria-live': 'polite' });
    const chipButtons = new Map();

    function visibleGames() {
      return Games.list.filter((game) => state.category === 'All' || game.category === state.category);
    }

    function syncUrl() {
      const params = new URLSearchParams();
      if (state.category !== 'All') params.set('cat', state.category);
      const query = params.toString();
      Router.replace(`/library${query ? `?${query}` : ''}`);
    }

    function render() {
      const games = visibleGames();
      clear(list);
      games.forEach((game) => list.appendChild(gameRow(game)));
      count.textContent = games.length === 1 ? '1 game' : `${games.length} games`;
      chipButtons.forEach((button, name) => {
        button.setAttribute('aria-pressed', String(name === state.category));
      });
    }

    function chip(name) {
      const button = h('button', {
        type: 'button',
        class: 'chip',
        onClick: () => {
          state.category = name;
          render();
          syncUrl();
        },
      }, name);
      chipButtons.set(name, button);
      return button;
    }

    const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Filter by category' },
      ['All', ...Games.categories].map(chip));

    const node = h('section', { class: 'page' },
      h('div', { class: 'page-head' },
        h('h1', null, 'Game library'),
        h('p', null, 'Pick a cabinet. Every game keeps its own high score.')),
      h('div', { class: 'toolbar' }, chips, count),
      list);

    render();
    return { title: 'Library', node };
  };
})(window.Arcade);
