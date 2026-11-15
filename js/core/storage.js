/* Persistent state in localStorage: player, settings, stats, favorites and
   recently played games. Everything lives under one versioned key. */

(function (A) {
  'use strict';

  const KEY = 'arcade.v1';
  const MAX_NAME = 16;
  const MAX_RECENT = 8;
  const AVATAR_COUNT = 6;
  const THEMES = ['system', 'light', 'dark'];
  const STAT_FIELDS = ['plays', 'best', 'lastScore', 'totalScore', 'timeMs', 'lastPlayed'];

  const defaults = () => ({
    version: 1,
    player: { name: 'Player One', avatar: 0, joined: Date.now() },
    settings: { sound: true, volume: 0.6, theme: 'system', seenIntro: {} },
    stats: {},
    favorites: [],
    recent: [],
  });

  const emptyStats = () => ({
    plays: 0, best: 0, lastScore: 0, totalScore: 0, timeMs: 0, lastPlayed: 0, extra: {},
  });

  const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
  const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);

  /** Rebuild a clean state from whatever was stored, ignoring bad fields. */
  function sanitize(input) {
    const out = defaults();
    if (!isObj(input)) return out;

    const player = isObj(input.player) ? input.player : {};
    if (typeof player.name === 'string' && player.name.trim()) {
      out.player.name = player.name.trim().slice(0, MAX_NAME);
    }
    if (Number.isInteger(player.avatar) && player.avatar >= 0 && player.avatar < AVATAR_COUNT) {
      out.player.avatar = player.avatar;
    }
    if (isNum(player.joined)) out.player.joined = player.joined;

    const settings = isObj(input.settings) ? input.settings : {};
    if (typeof settings.sound === 'boolean') out.settings.sound = settings.sound;
    if (isNum(settings.volume)) out.settings.volume = Math.min(1, Math.max(0, settings.volume));
    if (THEMES.includes(settings.theme)) out.settings.theme = settings.theme;
    if (isObj(settings.seenIntro)) {
      for (const [id, seen] of Object.entries(settings.seenIntro)) {
        if (seen === true) out.settings.seenIntro[id] = true;
      }
    }

    if (isObj(input.stats)) {
      for (const [id, raw] of Object.entries(input.stats)) {
        if (!isObj(raw)) continue;
        const entry = emptyStats();
        STAT_FIELDS.forEach((field) => { if (isNum(raw[field])) entry[field] = raw[field]; });
        if (isObj(raw.extra)) {
          for (const [name, value] of Object.entries(raw.extra)) {
            if (isNum(value)) entry.extra[name] = value;
          }
        }
        out.stats[id] = entry;
      }
    }

    if (Array.isArray(input.favorites)) {
      out.favorites = [...new Set(input.favorites.filter((id) => typeof id === 'string'))];
    }
    if (Array.isArray(input.recent)) {
      out.recent = input.recent
        .filter((item) => isObj(item) && typeof item.id === 'string' && isNum(item.ts))
        .slice(0, MAX_RECENT)
        .map((item) => ({ id: item.id, ts: item.ts }));
    }
    return out;
  }

  let fallbackJson = null; // used when localStorage is blocked (private mode)

  function read() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (err) { raw = fallbackJson; }
    if (!raw) return defaults();
    try { return sanitize(JSON.parse(raw)); } catch (err) { return defaults(); }
  }

  let state = read();
  const listeners = new Set();

  function commit() {
    const json = JSON.stringify(state);
    try { localStorage.setItem(KEY, json); } catch (err) { fallbackJson = json; }
    listeners.forEach((fn) => fn(state));
  }

  function statsFor(id) {
    if (!state.stats[id]) state.stats[id] = emptyStats();
    return state.stats[id];
  }

  const Store = {
    KEY,
    AVATAR_COUNT,

    get: () => state,

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    /* Player and settings */
    setPlayerName(name) {
      const clean = String(name || '').trim().slice(0, MAX_NAME);
      if (!clean) return false;
      state.player.name = clean;
      commit();
      return true;
    },

    setAvatar(index) {
      if (!Number.isInteger(index) || index < 0 || index >= AVATAR_COUNT) return;
      state.player.avatar = index;
      commit();
    },

    setSetting(key, value) {
      if (!(key in state.settings) || key === 'seenIntro') return;
      if (key === 'theme' && !THEMES.includes(value)) return;
      if (key === 'volume') value = Math.min(1, Math.max(0, Number(value) || 0));
      if (key === 'sound') value = Boolean(value);
      state.settings[key] = value;
      commit();
    },

    hasSeenIntro: (id) => state.settings.seenIntro[id] === true,

    markIntroSeen(id) {
      if (state.settings.seenIntro[id]) return;
      state.settings.seenIntro[id] = true;
      commit();
    },

    /* Favorites */
    isFavorite: (id) => state.favorites.includes(id),

    toggleFavorite(id) {
      const index = state.favorites.indexOf(id);
      if (index === -1) state.favorites.push(id);
      else state.favorites.splice(index, 1);
      commit();
      return index === -1;
    },

    /* Stats and runs */
    stats(id) {
      return state.stats[id] || emptyStats();
    },

    /** A run starts: count the play and move the game to the top of "recent". */
    beginRun(id) {
      const entry = statsFor(id);
      const now = Date.now();
      entry.plays += 1;
      entry.lastPlayed = now;
      state.recent = [{ id, ts: now }, ...state.recent.filter((item) => item.id !== id)].slice(0, MAX_RECENT);
      commit();
    },

    /** A run ends (or is abandoned): store the score and time spent. */
    finishRun(id, score, durationMs) {
      const entry = statsFor(id);
      const value = Math.max(0, Math.round(score) || 0);
      const previousBest = entry.best;
      entry.lastScore = value;
      entry.totalScore += value;
      entry.timeMs += Math.max(0, Math.round(durationMs) || 0);
      const isBest = value > previousBest;
      if (isBest) entry.best = value;
      commit();
      return { isBest, previousBest };
    },

    addExtra(id, key, amount) {
      const entry = statsFor(id);
      entry.extra[key] = (entry.extra[key] || 0) + (amount === undefined ? 1 : amount);
      commit();
    },

    maxExtra(id, key, value) {
      const entry = statsFor(id);
      if (value > (entry.extra[key] || 0)) {
        entry.extra[key] = value;
        commit();
      }
    },

    recent: () => state.recent.slice(),

    totals() {
      const entries = Object.values(state.stats);
      return {
        plays: entries.reduce((sum, s) => sum + s.plays, 0),
        timeMs: entries.reduce((sum, s) => sum + s.timeMs, 0),
        gamesTried: entries.filter((s) => s.plays > 0).length,
      };
    },

    reset() {
      const keepTheme = state.settings.theme;
      state = defaults();
      state.settings.theme = keepTheme;
      commit();
    },
  };

  // Keep several open tabs in sync.
  window.addEventListener('storage', (event) => {
    if (event.key !== KEY) return;
    state = read();
    listeners.forEach((fn) => fn(state));
  });

  A.Store = Store;
})(window.Arcade);
