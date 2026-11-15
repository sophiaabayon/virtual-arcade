/* Bootstrap: navigation icons, routes and first render. */

(function (A) {
  'use strict';
  const { pixelIcon, Router, Store, Sfx } = A;

  const NAV_ICONS = {
    home: [
      '...a...',
      '..aaa..',
      '.aaaaa.',
      'aaaaaaa',
      '.aa.aa.',
      '.aa.aa.',
      '.aaaaa.',
    ],
    library: [
      'aaa.aaa',
      'aaa.aaa',
      'aaa.aaa',
      '.......',
      'aaa.aaa',
      'aaa.aaa',
      'aaa.aaa',
    ],
    favorites: [
      '.aa.aa.',
      'aaaaaaa',
      'aaaaaaa',
      'aaaaaaa',
      '.aaaaa.',
      '..aaa..',
      '...a...',
    ],
    profile: [
      '..aaa..',
      '.aaaaa.',
      '.aaaaa.',
      '..aaa..',
      '.......',
      'aaaaaaa',
      'aaaaaaa',
    ],
  };

  function decorateNav() {
    document.querySelectorAll('.nav a[data-route]').forEach((link) => {
      const rows = NAV_ICONS[link.dataset.route];
      if (!rows || link.querySelector('svg')) return;
      const label = document.createElement('span');
      label.textContent = link.textContent;
      link.textContent = '';
      link.append(pixelIcon(rows, { a: 'currentColor' }), label);
    });
  }

  const SOUND_ICONS = {
    on: [
      '...a....',
      '..aa.a..',
      'aaaa..a.',
      'aaaa..a.',
      'aaaa..a.',
      '..aa.a..',
      '...a....',
      '........',
    ],
    off: [
      '...a....',
      '..aa.a.a',
      'aaaa..a.',
      'aaaa.a.a',
      'aaaa....',
      '..aa....',
      '...a....',
      '........',
    ],
  };

  function setupSoundToggle() {
    const button = document.getElementById('sound-toggle');
    if (!button) return;

    function refresh() {
      const on = Sfx.isOn();
      button.setAttribute('aria-pressed', String(on));
      button.title = on ? 'Sound effects on' : 'Sound effects off';
      button.replaceChildren(pixelIcon(SOUND_ICONS[on ? 'on' : 'off'], { a: 'currentColor' }));
    }

    button.addEventListener('click', () => Sfx.toggle());
    Store.subscribe(refresh);
    refresh();
  }

  decorateNav();
  setupSoundToggle();
  Router.on('/', 'home', (ctx) => A.views.home(ctx));
  Router.on('/library', 'library', (ctx) => A.views.library(ctx));
  Router.on('/game/:id', 'game', (ctx) => A.views.game(ctx));
  Router.start();
})(window.Arcade);
