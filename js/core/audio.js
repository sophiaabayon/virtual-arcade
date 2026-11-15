/* Sound effects made with the Web Audio API, so there are no audio files to
   load. Short square and triangle blips in the spirit of an old cabinet. */

(function (A) {
  'use strict';

  const SOUNDS = {
    click: [{ f: 660, t: 0, d: 0.05, type: 'square', g: 0.5 }],
    move: [{ f: 180, t: 0, d: 0.04, type: 'square', g: 0.4 }],
    flip: [{ f: 420, t: 0, d: 0.06, type: 'triangle', g: 0.9 }],
    hit: [
      { f: 300, t: 0, d: 0.04, type: 'square', g: 0.6 },
      { f: 140, t: 0.03, d: 0.08, type: 'triangle', g: 0.9 },
    ],
    merge: [
      { f: 330, t: 0, d: 0.06, type: 'triangle', g: 0.9 },
      { f: 495, t: 0.05, d: 0.08, type: 'triangle', g: 0.9 },
    ],
    good: [
      { f: 523, t: 0, d: 0.08, type: 'square', g: 0.5 },
      { f: 784, t: 0.08, d: 0.12, type: 'square', g: 0.5 },
    ],
    bad: [
      { f: 200, t: 0, d: 0.14, type: 'sawtooth', g: 0.45 },
      { f: 140, t: 0.1, d: 0.2, type: 'sawtooth', g: 0.45 },
    ],
    win: [
      { f: 523, t: 0, d: 0.1, type: 'square', g: 0.5 },
      { f: 659, t: 0.1, d: 0.1, type: 'square', g: 0.5 },
      { f: 784, t: 0.2, d: 0.1, type: 'square', g: 0.5 },
      { f: 1047, t: 0.3, d: 0.22, type: 'square', g: 0.5 },
    ],
    lose: [
      { f: 392, t: 0, d: 0.16, type: 'triangle', g: 1 },
      { f: 330, t: 0.16, d: 0.16, type: 'triangle', g: 1 },
      { f: 262, t: 0.32, d: 0.3, type: 'triangle', g: 1 },
    ],
  };

  let context = null;

  function audioContext() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return context;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    return context;
  }

  function play(name) {
    const { sound, volume } = A.Store.get().settings;
    const notes = SOUNDS[name];
    if (!sound || volume <= 0 || !notes) return;
    const ac = audioContext();
    if (!ac) return;

    const now = ac.currentTime;
    notes.forEach((note) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const start = now + note.t;
      const end = start + note.d;
      osc.type = note.type;
      osc.frequency.setValueAtTime(note.f, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.18 * volume * note.g, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain).connect(ac.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    });
  }

  A.Sfx = {
    play,
    isOn: () => A.Store.get().settings.sound,
    toggle() {
      const next = !A.Store.get().settings.sound;
      A.Store.setSetting('sound', next);
      if (next) play('click');
      return next;
    },
    setVolume(value) {
      A.Store.setSetting('volume', value);
    },
  };
})(window.Arcade);
