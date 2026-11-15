/* Home dashboard: a featured game, your totals, recent plays and the scoreboard. */

(function (A) {
  'use strict';
  const { h, Store, Games, formatNumber, formatDuration, timeAgo } = A;

  const DAY_MS = 24 * 60 * 60 * 1000;

  function featuredGame() {
    const [latest] = Store.recent();
    const recent = latest && Games.get(latest.id);
    if (recent) return { game: recent, heading: 'Jump back in' };
    const index = Math.floor(Date.now() / DAY_MS) % Games.list.length;
    return { game: Games.list[index], heading: "Today's pick" };
  }

  function marquee() {
    const { game, heading } = featuredGame();
    const stats = Store.stats(game.id);
    return h('section', { class: 'marquee', style: `--accent: ${game.accent}`, 'aria-labelledby': 'marquee-title' },
      h('div', { class: 'marquee__body' },
        h('p', { class: 'marquee__kicker' }, heading),
        h('h2', { id: 'marquee-title', class: 'marquee__title' }, game.title),
        h('p', null, game.tagline),
        h('p', { class: 'marquee__best' },
          stats.plays
            ? `Your best: ${formatNumber(stats.best)} ${game.scoreLabel.toLowerCase()}`
            : 'You have not played this one yet.'),
        h('a', { class: 'btn btn--light', href: `#/game/${game.id}` }, `Play ${game.title}`)),
      h('div', { class: 'marquee__art' }, Games.icon(game)));
  }

  function statStrip() {
    const totals = Store.totals();
    const item = (label, value) => h('div', null, h('dt', null, label), h('dd', null, value));
    return h('dl', { class: 'stat-strip' },
      item('Games played', formatNumber(totals.plays)),
      item('Cabinets tried', `${totals.gamesTried} of ${Games.list.length}`),
      item('Time at the arcade', formatDuration(totals.timeMs)));
  }

  function miniRow(game, detail) {
    return h('li', { class: 'mini-row', style: `--accent: ${game.accent}` },
      h('span', { class: 'mini-row__tile' }, Games.icon(game)),
      h('span', { class: 'mini-row__text' },
        h('a', { class: 'mini-row__title', href: `#/game/${game.id}` }, game.title),
        h('span', { class: 'mini-row__meta' }, detail)));
  }

  function recentSection() {
    const items = Store.recent()
      .map((entry) => ({ entry, game: Games.get(entry.id) }))
      .filter((item) => item.game)
      .slice(0, 4);

    const body = items.length
      ? h('ul', { class: 'mini-list' }, items.map(({ entry, game }) => {
        const stats = Store.stats(game.id);
        return miniRow(game, `Scored ${formatNumber(stats.lastScore)}, played ${timeAgo(entry.ts)}`);
      }))
      : h('p', { class: 'muted' }, 'Games you play will show up here.');

    return h('section', { class: 'panel-section', 'aria-labelledby': 'recent-title' },
      h('h2', { id: 'recent-title' }, 'Recently played'), body);
  }

  function scoreboard() {
    const rows = Games.list.map((game) => {
      const stats = Store.stats(game.id);
      return h('tr', null,
        h('th', { scope: 'row' }, h('a', { href: `#/game/${game.id}` }, game.title)),
        h('td', null, stats.plays ? formatNumber(stats.best) : '-'),
        h('td', null, formatNumber(stats.plays)));
    });

    return h('section', { class: 'panel-section', 'aria-labelledby': 'scores-title' },
      h('h2', { id: 'scores-title' }, 'High scores'),
      h('table', { class: 'scoreboard' },
        h('thead', null, h('tr', null,
          h('th', { scope: 'col' }, 'Game'),
          h('th', { scope: 'col' }, 'Best'),
          h('th', { scope: 'col' }, 'Plays'))),
        h('tbody', null, rows)));
  }

  function categories() {
    return h('section', { class: 'panel-section', 'aria-labelledby': 'cats-title' },
      h('h2', { id: 'cats-title' }, 'Browse by category'),
      h('div', { class: 'chips' }, Games.categories.map((name) => {
        const total = Games.list.filter((game) => game.category === name).length;
        return h('a', { class: 'chip', href: `#/library?cat=${encodeURIComponent(name)}` },
          name, h('span', { class: 'chip__count' }, total));
      })));
  }

  A.views.home = function () {
    const { name } = Store.get().player;
    const node = h('div', { class: 'page' },
      h('div', { class: 'page-head' },
        h('h1', null, `Hi, ${name}`),
        h('p', null, 'Six games, one shelf of high scores. Pick something and beat your best.')),
      marquee(),
      statStrip(),
      h('div', { class: 'two-col' }, recentSection(), scoreboard()),
      categories());
    return { title: 'Home', node };
  };
})(window.Arcade);
