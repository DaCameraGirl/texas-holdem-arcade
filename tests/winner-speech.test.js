'use strict';
const { loadGame } = require('./load-game');

const results = [];
function check(name, cond, detail) {
  results.push({ name, ok: !!cond, detail: detail || '' });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' - ' + detail : ''}`);
}

const VAL = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };
function card(r, s) { return { r, s, v: VAL[r] }; }
function hand(cards) { return cards.map(([r, s]) => card(r, s)); }
function lastSpoken(g) { return g._spoken[g._spoken.length - 1]; }
function winnerText(g) { return g._els['winner-banner'].innerHTML; }

function setupGame() {
  const g = loadGame();
  g.players = [
    { name:'YOU', chips:0, hand:[], isHuman:true },
    { name:'BOT-1', chips:0, hand:[] },
    { name:'BOT-2', chips:0, hand:[] },
    { name:'BOT-3', chips:0, hand:[] },
  ];
  g.folded = [false, false, true, true];
  g.allIn = [true, true, false, false];
  g.acted = [true, true, true, true];
  g.roundBets = [0, 0, 0, 0];
  g.committed = [50, 50, 0, 0];
  g.pot = 100;
  g.community = [];
  g.dealerIdx = 0;
  g.actingIdx = 0;
  g.stage = 'river';
  g.SFX.on = true;
  return g;
}

function settleStraightWinner(winnerIdx) {
  const g = setupGame();
  g.community = hand([['Q','H'], ['J','C'], ['10','D'], ['5','S'], ['4','C']]);
  g.players[0].hand = hand(winnerIdx === 0 ? [['A','S'], ['K','D']] : [['2','S'], ['7','D']]);
  g.players[1].hand = hand(winnerIdx === 1 ? [['A','S'], ['K','D']] : [['2','S'], ['7','D']]);
  g.showdown();
  return g;
}

function settleFoldOutWinner(winnerIdx) {
  const g = setupGame();
  g.community = [];
  g.players[0].hand = hand([['A','S'], ['K','D']]);
  g.players[1].hand = hand([['2','S'], ['7','D']]);
  g.folded = winnerIdx === 0 ? [false, true, true, true] : [true, false, true, true];
  g.allIn = [false, false, false, false];
  g.settlePots('Everyone else folded');
  return g;
}

{
  const g = setupGame();
  check('human winner announcement says You win with article',
    g.formatWinnerAnnouncement([0], 'Straight') === 'You win with a straight.',
    g.formatWinnerAnnouncement([0], 'Straight'));
  check('bot winner announcement uses singular wins',
    g.formatWinnerAnnouncement([1], 'Straight') === 'Bot 1 wins with a straight.',
    g.formatWinnerAnnouncement([1], 'Straight'));
  check('human fold-out announcement omits hand clause',
    g.formatWinnerAnnouncement([0], 'Everyone else folded') === 'You win.',
    g.formatWinnerAnnouncement([0], 'Everyone else folded'));
  check('bot fold-out announcement omits hand clause',
    g.formatWinnerAnnouncement([1], 'Everyone else folded') === 'Bot 1 wins.',
    g.formatWinnerAnnouncement([1], 'Everyone else folded'));
}

{
  const g = setupGame();
  g.showWinnerBanner([0], 'Straight');
  check('visual winner text shares human grammar formatter',
    winnerText(g).startsWith('You win with a straight.'),
    winnerText(g));
  g.showWinnerBanner([1], 'Everyone else folded');
  check('visual winner text shares bot fold-out grammar formatter',
    winnerText(g).startsWith('Bot 1 wins.'),
    winnerText(g));
}

{
  const g = setupGame();
  g.SFX.win([0], 'Straight');
  check('SFX human winner speech is grammatical',
    lastSpoken(g) === 'You win with a straight.',
    JSON.stringify(g._spoken));
  g.SFX.win([1], 'Straight');
  check('SFX bot winner speech is grammatical',
    lastSpoken(g) === 'Bot 1 wins with a straight.',
    JSON.stringify(g._spoken));
}

{
  const human = settleStraightWinner(0);
  check('showdown human winner speaks grammatical straight result',
    lastSpoken(human) === 'You win with a straight.',
    JSON.stringify(human._spoken));
  check('showdown human winner banner is grammatical',
    winnerText(human).startsWith('You win with a straight.'),
    winnerText(human));

  const bot = settleStraightWinner(1);
  check('showdown bot winner speaks grammatical straight result',
    lastSpoken(bot) === 'Bot 1 wins with a straight.',
    JSON.stringify(bot._spoken));
  check('showdown bot winner banner is grammatical',
    winnerText(bot).startsWith('Bot 1 wins with a straight.'),
    winnerText(bot));
}

{
  const human = settleFoldOutWinner(0);
  check('fold-out human winner speaks grammatical result',
    lastSpoken(human) === 'You win.',
    JSON.stringify(human._spoken));
  check('fold-out human winner banner is grammatical',
    winnerText(human).startsWith('You win.'),
    winnerText(human));

  const bot = settleFoldOutWinner(1);
  check('fold-out bot winner speaks grammatical result',
    lastSpoken(bot) === 'Bot 1 wins.',
    JSON.stringify(bot._spoken));
  check('fold-out bot winner banner is grammatical',
    winnerText(bot).startsWith('Bot 1 wins.'),
    winnerText(bot));
}

const failed = results.filter(r => !r.ok);
console.log('\n---');
console.log(`Total ${results.length}  PASS ${results.length - failed.length}  FAIL ${failed.length}`);
if (failed.length) {
  for (const f of failed) console.log(' -', f.name, f.detail);
  process.exit(1);
}