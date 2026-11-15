/* Home dashboard. */

(function (A) {
  'use strict';
  const { h, Store } = A;

  A.views.home = function () {
    const name = Store.get().player.name;
    return {
      title: 'Home',
      node: h('section', { class: 'page' },
        h('h1', null, `Welcome back, ${name}`),
        h('p', null, 'The arcade is warming up. Games are on their way.')),
    };
  };
})(window.Arcade);
