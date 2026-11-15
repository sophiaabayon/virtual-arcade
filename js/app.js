/* Bootstrap: navigation icons, routes and first render. */

(function (A) {
  'use strict';
  const { pixelIcon, Router } = A;

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

  decorateNav();
  Router.on('/', 'home', (ctx) => A.views.home(ctx));
  Router.on('/library', 'library', (ctx) => A.views.library(ctx));
  Router.start();
})(window.Arcade);
