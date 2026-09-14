'use strict';
const { loadGame } = require('./load-game');

const results = [];
function check(name, cond, detail) {
  results.push({ name, ok: !!cond, detail: detail || '' });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' - ' + detail : ''}`);
}

function setupGame() {
  const g = loadGame();
  g.players = [
    { name:'YOU', chips:1000, hand:[], isHuman:true },
    { name:'BOT-1', chips:1000, hand:[] },
    { name:'BOT-2', chips:1000, hand:[] },
    { name:'BOT-3', chips:1000, hand:[] },
  ];
  g.folded = [false, false, false, false];
  g.allIn = [false, false, false, false];
  g.acted = [false, false, false, false];
  g.roundBets = [0, 0, 0, 0];
  g.committed = [0, 0, 0, 0];
  g.pot = 0;
  g.dealerIdx = 0;
  g.actingIdx = 0;
  g.stage = 'flop';
  return g;
}

{
  const g = setupGame();
  g.currentBet = 0;
  g.roundBets = [0, 0, 0, 0];
  g.updateUI();
  check('opening action labels raise control as Bet',
    g._els['btn-bet'].textContent === 'Bet',
    g._els['btn-bet'].textContent);
  check('no-call state labels call control without zero amount',
    g._els['btn-call'].textContent === 'Call' && g._els['btn-call'].disabled === true && g._els['btn-check'].disabled === false,
    `call=${g._els['btn-call'].textContent} callDisabled=${g._els['btn-call'].disabled} checkDisabled=${g._els['btn-check'].disabled}`);
}

{
  const g = setupGame();
  g.currentBet = 40;
  g.lastFullRaise = 30;
  g.roundBets = [10, 40, 40, 40];
  g.updateUI();
  check('facing a bet labels call control with amount',
    g._els['btn-call'].textContent === 'Call 30' && g._els['btn-call'].disabled === false && g._els['btn-check'].disabled === true,
    `call=${g._els['btn-call'].textContent} callDisabled=${g._els['btn-call'].disabled} checkDisabled=${g._els['btn-check'].disabled}`);
  check('facing a bet labels betting control as Raise',
    g._els['btn-bet'].textContent === 'Raise' && g._els['btn-bet'].disabled === false,
    `bet=${g._els['btn-bet'].textContent} disabled=${g._els['btn-bet'].disabled}`);
}

const failed = results.filter(r => !r.ok);
console.log('\n---');
console.log(`Total ${results.length}  PASS ${results.length - failed.length}  FAIL ${failed.length}`);
if (failed.length) {
  for (const f of failed) console.log(' -', f.name, f.detail);
  process.exit(1);
}