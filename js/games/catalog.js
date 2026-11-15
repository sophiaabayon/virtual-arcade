/* Game catalog: the metadata the dashboard, library and game page share.
   Each game file attaches its playable code with Arcade.Games.attach(). */

(function (A) {
  'use strict';

  const ICON_PALETTE = { k: '#1b1f3b', w: '#ffffff', y: '#ffd23f', r: '#e5483a' };

  const list = [
    {
      id: 'snake',
      title: 'Snake',
      category: 'Arcade',
      tagline: 'Eat, grow and do not bite yourself.',
      accent: '#5fd38d',
      players: '1 player',
      session: '2 to 5 min',
      scoreLabel: 'Apples',
      icon: [
        '.kkkkk..',
        '.k......',
        '.k......',
        '.kkkkk..',
        '.....k..',
        '.....k..',
        'wkkkkk.r',
        '........',
      ],
      instructions: [
        'Steer the snake onto the apples to grow and score.',
        'The snake speeds up with every apple.',
        'The run ends when you hit a wall or your own tail.',
      ],
      controls: [
        ['Arrow keys or WASD', 'Steer'],
        ['Space', 'Pause or resume'],
        ['Swipe or D-pad', 'Steer on touch screens'],
      ],
      summary: (x) => `${x.apples || 0} apples eaten`,
    },
    {
      id: 'tictactoe',
      title: 'Tic-Tac-Toe',
      category: 'Strategy',
      tagline: 'Outsmart the CPU and keep your run alive.',
      accent: '#7aa2ff',
      players: 'Versus CPU',
      session: '1 min per round',
      scoreLabel: 'Points',
      icon: [
        'wwk..k..',
        'wwk..k..',
        'kkkkkkkk',
        '..kyyk..',
        '..kyyk..',
        'kkkkkkkk',
        '..k..kww',
        '..k..kww',
      ],
      instructions: [
        'Get three marks in a row before the CPU does.',
        'X always moves first, and you and the CPU swap who starts each round.',
        'A win earns 3 points and a draw earns 1, multiplied by the difficulty level. One loss ends the run.',
      ],
      controls: [
        ['Click or tap', 'Place your mark'],
        ['1 to 9', 'Pick a square in reading order, top left is 1'],
        ['Enter', 'Start the next round'],
      ],
      summary: (x) => `${x.wins || 0} wins, ${x.draws || 0} draws, ${x.losses || 0} losses`,
    },
    {
      id: 'memory',
      title: 'Memory Match',
      category: 'Puzzle',
      tagline: 'Flip the cards, find the pairs, beat the clock.',
      accent: '#f58fc0',
      players: '1 player',
      session: '1 to 2 min',
      scoreLabel: 'Score',
      icon: [
        'kkk..www',
        'kwk..wkw',
        'kkk..www',
        '........',
        'www..kkk',
        'wkw..kwk',
        'www..kkk',
        '........',
      ],
      instructions: [
        'Flip two cards at a time and find all eight matching pairs.',
        'Every pair is worth 100 points and every miss costs 10.',
        'Finish quickly for a time bonus.',
      ],
      controls: [
        ['Click or tap', 'Flip a card'],
        ['Tab and Enter', 'Move between cards and flip one with the keyboard'],
      ],
      summary: (x) => `${x.pairs || 0} pairs found`,
    },
    {
      id: 'rps',
      title: 'Rock Paper Scissors',
      category: 'Strategy',
      tagline: 'Read the CPU and win as many rounds as you can.',
      accent: '#ffb347',
      players: 'Versus CPU',
      session: 'Quick rounds',
      scoreLabel: 'Wins',
      icon: [
        '.k.k.k..',
        'kwkwkwk.',
        'kwwwwwwk',
        'kwwwwwwk',
        'kwwwwwwk',
        '.kwwwwk.',
        '..kwwk..',
        '..kkkk..',
      ],
      instructions: [
        'Pick rock, paper or scissors. Rock beats scissors, scissors beat paper and paper beats rock.',
        'Every win adds a point and ties are replayed.',
        'One loss ends the run.',
      ],
      controls: [
        ['R, P or S', 'Pick rock, paper or scissors'],
        ['1, 2 or 3', 'Pick by position'],
        ['Click or tap', 'Pick with the buttons'],
      ],
      summary: (x) => `${x.wins || 0} wins, ${x.ties || 0} ties, ${x.losses || 0} losses`,
    },
    {
      id: 'whackamole',
      title: 'Whack-a-Mole',
      category: 'Reflex',
      tagline: 'Thirty seconds, nine holes, one mallet.',
      accent: '#ff7b5c',
      players: '1 player',
      session: '30 seconds',
      scoreLabel: 'Points',
      icon: [
        '..kkkk..',
        '.kkkkkk.',
        '.kwkkwk.',
        '.kkrrkk.',
        '.kkkkkk.',
        'yyyyyyyy',
        'yyyyyyyy',
        '........',
      ],
      instructions: [
        'Moles pop out of the holes for a moment. Hit them before they hide.',
        'A gold mole is worth 3 points but leaves quickly.',
        'You have 30 seconds, and the moles get faster as time runs out.',
      ],
      controls: [
        ['Click or tap', 'Whack a mole'],
        ['1 to 9', 'Hit a hole by position, top left is 1'],
        ['Space', 'Pause or resume'],
      ],
      summary: (x) => `${x.whacks || 0} moles whacked`,
    },
    {
      id: '2048',
      title: '2048',
      category: 'Puzzle',
      tagline: 'Slide, merge and chase the 2048 tile.',
      accent: '#54d0e0',
      players: '1 player',
      session: '5 to 15 min',
      scoreLabel: 'Score',
      icon: [
        'www.kkk.',
        'www.kkk.',
        'www.kkk.',
        '........',
        'kkk.yyy.',
        'kkk.yyy.',
        'kkk.yyy.',
        '........',
      ],
      instructions: [
        'Slide the tiles. When two tiles with the same number touch, they merge into one.',
        'Reach the 2048 tile to win, then keep going for a higher score.',
        'The run ends when the board is full and no moves are left.',
      ],
      controls: [
        ['Arrow keys or WASD', 'Slide the tiles'],
        ['Swipe', 'Slide the tiles on touch screens'],
      ],
      summary: (x) => `Best tile ${x.bestTile || 0}`,
    },
  ];

  A.Games = {
    list,
    categories: ['Arcade', 'Puzzle', 'Strategy', 'Reflex'],

    get: (id) => list.find((game) => game.id === id) || null,

    /** A game file hands over its mount(ctx) function, which returns { restart, destroy }. */
    attach(id, mount) {
      const game = A.Games.get(id);
      if (game) game.mount = mount;
    },

    icon: (game, className) => A.pixelIcon(game.icon, ICON_PALETTE, className),
  };
})(window.Arcade);
