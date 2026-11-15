/* Hash router. Routes look like '/game/:id'; a view factory returns
   { title, node, mounted?, destroy? } and the router handles the rest. */

(function (A) {
  'use strict';

  const routes = [];
  let current = null;
  let currentName = null;
  let currentQuery = {};

  function compile(pattern) {
    const keys = [];
    const source = pattern.replace(/:([a-z]+)/gi, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    });
    return { regex: new RegExp(`^${source}$`), keys };
  }

  function on(pattern, name, factory) {
    routes.push({ ...compile(pattern), name, factory });
  }

  function parse(hash) {
    const raw = hash.replace(/^#/, '') || '/';
    const [path, queryString = ''] = raw.split('?');
    return { path: path || '/', query: Object.fromEntries(new URLSearchParams(queryString)) };
  }

  function match(path) {
    for (const route of routes) {
      const found = route.regex.exec(path);
      if (!found) continue;
      const params = {};
      route.keys.forEach((key, i) => { params[key] = decodeURIComponent(found[i + 1]); });
      return { route, params };
    }
    return null;
  }

  function notFound() {
    const { h } = A;
    return {
      title: 'Page not found',
      node: h('section', { class: 'empty-state' },
        h('h1', null, 'Page not found'),
        h('p', null, 'That address does not lead anywhere in the arcade.'),
        h('a', { class: 'btn btn--primary', href: '#/' }, 'Back to home')),
    };
  }

  /** Mark the matching navigation link as the current page. */
  function syncNav() {
    let key = currentName;
    if (key === 'library' && currentQuery.fav) key = 'favorites';
    if (key === 'game') key = 'library';
    document.querySelectorAll('.nav a[data-route]').forEach((link) => {
      if (link.dataset.route === key) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function resolve() {
    const { path, query } = parse(window.location.hash);
    const hit = match(path);
    const container = document.getElementById('view');

    if (current && typeof current.destroy === 'function') current.destroy();
    A.clear(container);

    const view = hit
      ? hit.route.factory({ path, query, params: hit.params })
      : notFound();

    document.title = view.title ? `${view.title} - Pixel Parlor` : 'Pixel Parlor';
    container.appendChild(view.node);
    current = view;
    currentName = hit ? hit.route.name : 'notfound';
    currentQuery = query;
    syncNav();
    if (typeof view.mounted === 'function') view.mounted();

    window.scrollTo(0, 0);
    container.focus({ preventScroll: true });
  }

  /** Change the address without re-rendering the page (used by filters). */
  function replace(path) {
    window.history.replaceState(null, '', `#${path}`);
    currentQuery = parse(window.location.hash).query;
    syncNav();
  }

  function start() {
    window.addEventListener('hashchange', resolve);
    resolve();
  }

  A.Router = { on, start, replace, go: (path) => { window.location.hash = path; } };
  A.views = A.views || {};
})(window.Arcade);
