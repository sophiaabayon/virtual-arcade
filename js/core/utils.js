/* Shared helpers: DOM builder, pixel-art renderer, formatting and toasts. */

window.Arcade = window.Arcade || {};

(function (A) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  function append(parent, child) {
    if (child == null || child === false) return;
    if (Array.isArray(child)) {
      child.forEach((c) => append(parent, c));
      return;
    }
    parent.append(child.nodeType ? child : document.createTextNode(String(child)));
  }

  /**
   * Tiny element factory: h('button', { class: 'btn', onClick: fn }, 'Label').
   * Text is always inserted as text nodes, never parsed as HTML.
   */
  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        if (value == null || value === false) continue;
        if (key === 'class') el.className = value;
        else if (key === 'dataset') Object.assign(el.dataset, value);
        else if (key.startsWith('on') && typeof value === 'function') {
          el.addEventListener(key.slice(2).toLowerCase(), value);
        } else el.setAttribute(key, value === true ? '' : value);
      }
    }
    append(el, children);
    return el;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  /**
   * Draw pixel art from rows of characters. Each character maps to a CSS
   * colour in `palette` (CSS variables are fine); '.' and unknown characters
   * stay transparent.
   */
  function pixelIcon(rows, palette, className) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${rows[0].length} ${rows.length}`);
    svg.setAttribute('shape-rendering', 'crispEdges');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    if (className) svg.setAttribute('class', className);
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const fill = palette[row[x]];
        if (!fill) continue;
        const rect = document.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', 1);
        rect.setAttribute('height', 1);
        rect.style.fill = fill;
        svg.appendChild(rect);
      }
    });
    return svg;
  }

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  const formatNumber = (n) => Number(n || 0).toLocaleString('en-US');

  function formatDuration(ms) {
    const total = Math.round((ms || 0) / 1000);
    if (total < 60) return `${total}s`;
    const minutes = Math.floor(total / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `${hours} h ${minutes % 60} min`;
  }

  function timeAgo(timestamp) {
    if (!timestamp) return 'never';
    const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
    if (seconds < 45) return 'just now';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} h ago`;
    const days = Math.round(hours / 24);
    return days === 1 ? 'yesterday' : `${days} days ago`;
  }

  function toast(message) {
    let region = document.getElementById('toast-region');
    if (!region) {
      region = h('div', { id: 'toast-region', class: 'toast-region', 'aria-live': 'polite' });
      document.body.appendChild(region);
    }
    const item = h('div', { class: 'toast' }, message);
    region.appendChild(item);
    setTimeout(() => item.remove(), 2600);
  }

  Object.assign(A, {
    h, clear, pixelIcon, clamp, randInt, pick, shuffle,
    formatNumber, formatDuration, timeAgo, toast,
  });
})(window.Arcade);
