/* Rock Paper Scissors: win as many rounds as you can before the first loss. */

(function (A) {
  'use strict';
  const { h, pixelIcon, pick } = A;

  const CHOICES = [
    {
      id: 'rock', name: 'Rock', key: 'r', beats: 'scissors',
      rows: ['..aaaa..', '.awwwwa.', 'awwwwwwa', 'awwwwwwa', 'awwwwwwa', 'awwwwwwa', '.awwwwa.', '..aaaa..'],
    },
    {
      id: 'paper', name: 'Paper', key: 'p', beats: 'rock',
      rows: ['.aaaaaa.', '.awwwwa.', '.aaaaaa.', '.awwwwa.', '.aaaaaa.', '.awwwwa.', '.aaaaaa.', '........'],
    },
    {
      id: 'scissors', name: 'Scissors', key: 's', beats: 'paper',
      rows: ['aa....aa', '.aa..aa.', '..aaaa..', '...aa...', '..aaaa..', 'aaa..aaa', 'awa..awa', 'aaa..aaa'],
    },
  ];

  const REVEAL_MS = 650;
  const RESULT_MS = 900;
  const PALETTE = { a: 'var(--ink)', w: 'var(--accent)' };

  const byId = (id) => CHOICES.find((choice) => choice.id === id);

  /** 1 when `player` beats `cpu`, -1 when it loses, 0 for a tie. */
  function outcome(player, cpu) {
    if (player === cpu) return 0;
    return byId(player).beats === cpu ? 1 : -1;
  }

  const logic = { CHOICES, outcome };
  if (typeof module !== 'undefined' && module.exports) module.exports = logic;
  if (typeof A === 'undefined' || !A.Games) return;

  function mount(ctx) {
    let score = 0;
    let busy = false;
    let over = false;
    let history = [];
    const timers = [];

    const later = (fn, ms) => {
      const id = setTimeout(fn, ms);
      timers.push(id);
    };
    const clearTimers = () => timers.splice(0).forEach(clearTimeout);

    const youSlot = h('div', { class: 'rps__slot' }, '?');
    const cpuSlot = h('div', { class: 'rps__slot' }, '?');
    const result = h('p', { class: 'rps__result' });
    const trail = h('ol', { class: 'rps__trail', 'aria-label': 'Recent rounds' });

    const buttons = CHOICES.map((choice) => h('button', {
      type: 'button',
      class: 'rps__choice',
      onClick: () => play(choice.id),
    }, pixelIcon(choice.rows, PALETTE), h('span', null, choice.name)));

    ctx.stage.appendChild(h('div', { class: 'rps' },
      h('div', { class: 'rps__arena' },
        h('div', { class: 'rps__side' }, h('span', null, 'You'), youSlot),
        h('div', { class: 'rps__side' }, h('span', null, 'CPU'), cpuSlot)),
      result,
      h('div', { class: 'rps__choices' }, buttons),
      trail));

    function showPick(slot, choice) {
      slot.replaceChildren(pixelIcon(choice.rows, PALETTE));
      slot.classList.remove('is-shaking');
    }

    function resetSlots() {
      [youSlot, cpuSlot].forEach((slot) => {
        slot.textContent = '?';
        slot.classList.remove('is-shaking', 'is-win', 'is-lose');
      });
    }

    function renderTrail() {
      trail.replaceChildren(...history.slice(-8).map((item) => h('li', {
        class: `rps__dot is-${item}`,
        'aria-label': { win: 'Win', tie: 'Tie', lose: 'Loss' }[item],
      }, { win: 'W', tie: 'T', lose: 'L' }[item])));
    }

    function say(text) {
      result.textContent = text;
      ctx.setStatus(text);
    }

    function setBusy(value) {
      busy = value;
      buttons.forEach((button) => { button.disabled = value; });
    }

    function restart() {
      clearTimers();
      score = 0;
      over = false;
      history = [];
      ctx.setScore(0);
      resetSlots();
      renderTrail();
      setBusy(false);
      say('Pick rock, paper or scissors.');
    }

    function play(id) {
      if (busy || over) return;
      ctx.start();
      setBusy(true);
      resetSlots();
      youSlot.classList.add('is-shaking');
      cpuSlot.classList.add('is-shaking');
      ctx.sfx('click');
      say('Rock, paper, scissors...');

      const mine = byId(id);
      const theirs = pick(CHOICES);

      later(() => {
        showPick(youSlot, mine);
        showPick(cpuSlot, theirs);
        const verdict = outcome(mine.id, theirs.id);

        if (verdict === 0) {
          history.push('tie');
          ctx.extra('ties');
          ctx.sfx('move');
          say(`Both chose ${mine.name.toLowerCase()}. Go again.`);
          later(() => { setBusy(false); renderTrail(); }, RESULT_MS);
        } else if (verdict === 1) {
          score += 1;
          history.push('win');
          youSlot.classList.add('is-win');
          ctx.setScore(score);
          ctx.extra('wins');
          ctx.sfx('good');
          say(`${mine.name} beats ${theirs.name.toLowerCase()}. You win this round.`);
          later(() => { setBusy(false); renderTrail(); }, RESULT_MS);
        } else {
          over = true;
          history.push('lose');
          cpuSlot.classList.add('is-lose');
          ctx.extra('losses');
          ctx.sfx('lose');
          say(`${theirs.name} beats ${mine.name.toLowerCase()}.`);
          later(() => {
            renderTrail();
            ctx.gameOver(score, {
              headline: 'The CPU got you',
              detail: score === 1 ? 'You won 1 round before losing.' : `You won ${score} rounds before losing.`,
            });
          }, RESULT_MS);
        }
        renderTrail();
      }, REVEAL_MS);
    }

    ctx.listen(document, 'keydown', (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.key.toLowerCase();
      const choice = CHOICES.find((item, i) => item.key === key || String(i + 1) === key);
      if (choice) play(choice.id);
    });
    ctx.onDestroy(clearTimers);

    restart();
    return { restart, destroy: clearTimers };
  }

  A.Games.attach('rps', mount);
})(typeof window !== 'undefined' ? window.Arcade : undefined);
