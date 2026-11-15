/* Game library: every game as a row, with search, category filter and sorting. */

(function (A) {
  'use strict';
  const { h, clear, Store, Games, Router, formatNumber } = A;

  const SORTS = {
    title: { label: 'Title, A to Z', compare: (a, b) => a.title.localeCompare(b.title) },
    plays: {
      label: 'Most played',
      compare: (a, b) => Store.stats(b.id).plays - Store.stats(a.id).plays || a.title.localeCompare(b.title),
    },
    recent: {
      label: 'Recently played',
      compare: (a, b) => Store.stats(b.id).lastPlayed - Store.stats(a.id).lastPlayed || a.title.localeCompare(b.title),
    },
  };

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
      query: '',
      sort: 'title',
      category: Games.categories.includes(ctx.query.cat) ? ctx.query.cat : 'All',
    };

    const list = h('ul', { class: 'cabinet-list' });
    const count = h('p', { class: 'result-count', 'aria-live': 'polite' });
    const emptyText = h('p', null);
    const empty = h('div', { class: 'empty-state', hidden: true },
      h('h2', null, 'No games found'),
      emptyText,
      h('button', { type: 'button', class: 'btn', onClick: resetFilters }, 'Clear filters'));
    const chipButtons = new Map();

    const search = h('input', {
      id: 'library-search',
      class: 'field__input',
      type: 'search',
      placeholder: 'Search by title or category',
      autocomplete: 'off',
      onInput: (event) => {
        state.query = event.target.value;
        render();
      },
    });

    const sortSelect = h('select', {
      id: 'library-sort',
      class: 'field__input',
      onChange: (event) => {
        state.sort = event.target.value;
        render();
      },
    }, Object.entries(SORTS).map(([value, sort]) => h('option', { value }, sort.label)));

    function matchesQuery(game) {
      const tokens = state.query.toLowerCase().split(/\s+/).filter(Boolean);
      if (!tokens.length) return true;
      const haystack = [game.title, game.tagline, game.category, game.players, game.session]
        .join(' ').toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    }

    function visibleGames() {
      return Games.list
        .filter((game) => state.category === 'All' || game.category === state.category)
        .filter(matchesQuery)
        .sort(SORTS[state.sort].compare);
    }

    function syncUrl() {
      const params = new URLSearchParams();
      if (state.category !== 'All') params.set('cat', state.category);
      const query = params.toString();
      Router.replace(`/library${query ? `?${query}` : ''}`);
    }

    function resetFilters() {
      state.query = '';
      state.sort = 'title';
      state.category = 'All';
      search.value = '';
      sortSelect.value = 'title';
      render();
      syncUrl();
    }

    function render() {
      const games = visibleGames();
      clear(list);
      games.forEach((game) => list.appendChild(gameRow(game)));
      list.hidden = games.length === 0;
      empty.hidden = games.length !== 0;
      emptyText.textContent = state.query.trim()
        ? `Nothing matches "${state.query.trim()}" in ${state.category === 'All' ? 'any category' : state.category}.`
        : `There are no games in ${state.category} yet.`;
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

    const node = h('section', { class: 'page' },
      h('div', { class: 'page-head' },
        h('h1', null, 'Game library'),
        h('p', null, 'Pick a cabinet. Every game keeps its own high score.')),
      h('div', { class: 'toolbar' },
        h('div', { class: 'field' },
          h('label', { for: 'library-search' }, 'Search games'), search),
        h('div', { class: 'field' },
          h('label', { for: 'library-sort' }, 'Sort by'), sortSelect)),
      h('div', { class: 'toolbar' },
        h('div', { class: 'chips', role: 'group', 'aria-label': 'Filter by category' },
          ['All', ...Games.categories].map(chip)),
        count),
      list,
      empty);

    render();
    return { title: 'Library', node };
  };
})(window.Arcade);
