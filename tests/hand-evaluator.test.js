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
function best(hole, board) { return loadGame().bestHand(hand(hole), hand(board)); }
function tie(ev) { return ev.tie.join(','); }
function chipsOf(g) { return g.players.map(p => p.chips); }
function tableTotal(g) { return g.players.reduce((s, p) => s + p.chips, 0) + g.pot; }
function sameWinners(a, b) { return a.slice().sort((x,y)=>x-y).join() === b.slice().sort((x,y)=>x-y).join(); }

function baseGame() {
  const g = loadGame();
  g.players = [
    { name:'YOU', chips:0, hand:[], isHuman:true },
    { name:'BOT-1', chips:0, hand:[] },
    { name:'BOT-2', chips:0, hand:[] },
    { name:'BOT-3', chips:0, hand:[] },
  ];
  g.folded = [false, false, false, false];
  g.allIn = [true, true, true, true];
  g.acted = [true, true, true, true];
  g.roundBets = [0, 0, 0, 0];
  g.committed = [0, 0, 0, 0];
  g.dealerIdx = 0;
  g.actingIdx = 0;
  g.stage = 'river';
  return g;
}

function setHands(g, hands) {
  for (let i = 0; i < hands.length; i++) g.players[i].hand = hand(hands[i]);
}

function settleShowdown({ board, hands, folded, committed, pot, dealerIdx = 0 }) {
  const g = baseGame();
  setHands(g, hands);
  g.community = hand(board);
  g.folded = folded || hands.map(() => false);
  g.allIn = hands.map((_, i) => !g.folded[i]);
  g.committed = committed || hands.map(() => pot / hands.length);
  g.pot = pot;
  g.dealerIdx = dealerIdx;
  const before = tableTotal(g);
  g.showdown();
  return { g, before };
}

// Best-five selection and category detection from seven cards.
{
  const ev = best([['A','S'], ['K','D']], [['Q','H'], ['J','C'], ['10','D'], ['3','S'], ['2','C']]);
  check('best 5 from 7 chooses Broadway straight', ev.rank === 4 && tie(ev) === '14', `${ev.name} ${tie(ev)}`);
}

{
  const wheel = best([['A','S'], ['2','D']], [['3','H'], ['4','C'], ['5','D'], ['K','S'], ['9','C']]);
  const sixHigh = best([['2','S'], ['3','D']], [['4','H'], ['5','C'], ['6','D'], ['K','S'], ['9','C']]);
  check('wheel straight is 5-high', wheel.rank === 4 && tie(wheel) === '5', `${wheel.name} ${tie(wheel)}`);
  check('A2345 wheel loses to 23456 straight', sixHigh.rank === 4 && tie(sixHigh) === '6' && sixHigh.tie[0] > wheel.tie[0], `wheel=${tie(wheel)} six=${tie(sixHigh)}`);
}

{
  const ev = best([['9','S'], ['9','D']], [['8','H'], ['7','C'], ['6','D'], ['5','S'], ['5','C']]);
  check('straight detection ignores duplicate ranks', ev.rank === 4 && tie(ev) === '9', `${ev.name} ${tie(ev)}`);
}

{
  const ev = best([['A','H'], ['2','H']], [['K','H'], ['J','H'], ['9','H'], ['4','H'], ['3','C']]);
  check('flush chooses highest five suited cards', ev.rank === 5 && tie(ev) === '14,13,11,9,4', `${ev.name} ${tie(ev)}`);
}

{
  const ev = best([['9','S'], ['8','S']], [['7','S'], ['6','S'], ['5','S'], ['A','H'], ['A','D']]);
  check('straight flush beats non-flush pair cards', ev.rank === 8 && tie(ev) === '9', `${ev.name} ${tie(ev)}`);
}

{
  const ev = best([['A','S'], ['K','S']], [['Q','S'], ['J','S'], ['10','S'], ['2','D'], ['3','C']]);
  check('royal/ace-high straight flush is recognized', ev.rank === 8 && ev.name === 'Royal Flush' && tie(ev) === '14', `${ev.name} ${tie(ev)}`);
}

{
  const ev = best([['Q','S'], ['Q','H']], [['Q','D'], ['Q','C'], ['A','S'], ['K','D'], ['2','C']]);
  check('quads keep highest kicker', ev.rank === 7 && tie(ev) === '12,14', `${ev.name} ${tie(ev)}`);
}

{
  const ev = best([['A','S'], ['A','H']], [['A','D'], ['K','C'], ['K','D'], ['Q','S'], ['Q','C']]);
  check('full house chooses highest trips plus highest remaining pair', ev.rank === 6 && tie(ev) === '14,13', `${ev.name} ${tie(ev)}`);
}

{
  const ev = best([['A','S'], ['A','H']], [['A','D'], ['K','C'], ['K','D'], ['K','H'], ['Q','C']]);
  check('two possible full houses choose higher trips first', ev.rank === 6 && tie(ev) === '14,13', `${ev.name} ${tie(ev)}`);
}

{
  const a = best([['A','H'], ['9','H']], [['K','H'], ['J','H'], ['7','H'], ['4','H'], ['2','C']]);
  const b = best([['A','S'], ['8','S']], [['K','S'], ['J','S'], ['7','S'], ['4','S'], ['2','C']]);
  check('flush tie-breakers compare all five cards', a.rank === 5 && b.rank === 5 && tie(a) === '14,13,11,9,7' && tie(b) === '14,13,11,8,7' && a.tie[3] > b.tie[3], `a=${tie(a)} b=${tie(b)}`);
}

{
  const broadway = best([['A','S'], ['K','D']], [['Q','H'], ['J','C'], ['10','D'], ['2','S'], ['3','C']]);
  const kingHigh = best([['K','S'], ['Q','D']], [['J','H'], ['10','C'], ['9','D'], ['2','S'], ['3','C']]);
  check('straight tie uses highest card', broadway.rank === 4 && kingHigh.rank === 4 && broadway.tie[0] > kingHigh.tie[0], `broadway=${tie(broadway)} king=${tie(kingHigh)}`);
}

{
  const a = best([['9','S'], ['9','H']], [['9','D'], ['A','C'], ['K','D'], ['5','S'], ['2','C']]);
  const b = best([['9','C'], ['9','D']], [['9','H'], ['A','D'], ['Q','S'], ['5','C'], ['2','D']]);
  check('three-of-a-kind kicker ordering', a.rank === 3 && b.rank === 3 && tie(a) === '9,14,13' && tie(b) === '9,14,12' && a.tie[2] > b.tie[2], `a=${tie(a)} b=${tie(b)}`);
}

{
  const highPair = best([['K','S'], ['K','H']], [['Q','D'], ['Q','C'], ['A','S'], ['5','D'], ['2','C']]);
  const lowPair = best([['J','S'], ['J','H']], [['10','D'], ['10','C'], ['A','S'], ['5','D'], ['2','C']]);
  const highSecond = best([['K','S'], ['K','H']], [['J','D'], ['J','C'], ['A','S'], ['5','D'], ['2','C']]);
  const lowSecond = best([['K','D'], ['K','C']], [['10','S'], ['10','H'], ['A','D'], ['5','S'], ['2','D']]);
  const highKicker = best([['K','S'], ['K','H']], [['Q','D'], ['Q','C'], ['A','S'], ['5','D'], ['2','C']]);
  const lowKicker = best([['K','D'], ['K','C']], [['Q','S'], ['Q','H'], ['J','D'], ['5','S'], ['2','D']]);
  check('two-pair comparison uses highest pair', highPair.tie[0] > lowPair.tie[0], `high=${tie(highPair)} low=${tie(lowPair)}`);
  check('two-pair comparison uses second pair', highSecond.tie[0] === lowSecond.tie[0] && highSecond.tie[1] > lowSecond.tie[1], `high=${tie(highSecond)} low=${tie(lowSecond)}`);
  check('two-pair comparison uses kicker', highKicker.tie[0] === lowKicker.tie[0] && highKicker.tie[1] === lowKicker.tie[1] && highKicker.tie[2] > lowKicker.tie[2], `high=${tie(highKicker)} low=${tie(lowKicker)}`);
}

{
  const a = best([['8','S'], ['8','H']], [['A','D'], ['K','C'], ['Q','S'], ['5','D'], ['2','C']]);
  const b = best([['8','D'], ['8','C']], [['A','C'], ['K','D'], ['J','S'], ['5','C'], ['2','D']]);
  check('one-pair kicker ordering', a.rank === 1 && b.rank === 1 && tie(a) === '8,14,13,12' && tie(b) === '8,14,13,11' && a.tie[3] > b.tie[3], `a=${tie(a)} b=${tie(b)}`);
}

{
  const a = best([['A','S'], ['Q','H']], [['10','D'], ['8','C'], ['6','S'], ['4','D'], ['2','C']]);
  const b = best([['A','D'], ['J','H']], [['10','C'], ['8','S'], ['6','D'], ['4','C'], ['2','D']]);
  check('high-card ordering compares all kickers', a.rank === 0 && b.rank === 0 && tie(a) === '14,12,10,8,6' && tie(b) === '14,11,10,8,6' && a.tie[1] > b.tie[1], `a=${tie(a)} b=${tie(b)}`);
}

{
  const ev = best([['K','S'], ['Q','D']], [['A','C'], ['J','H'], ['10','S'], ['9','D'], ['8','C']]);
  check('seven cards with multiple straights choose highest straight', ev.rank === 4 && tie(ev) === '14', `${ev.name} ${tie(ev)}`);
}

// Showdown behavior: board-playing hands, true ties, folded eligibility, and side pots.
{
  const { g, before } = settleShowdown({
    board: [['2','S'], ['3','D'], ['4','H'], ['5','C'], ['6','S']],
    hands: [
      [['A','H'], ['K','D']],
      [['Q','C'], ['J','D']],
      [['9','C'], ['8','D']],
      [['7','H'], ['2','D']],
    ],
    committed: [25, 25, 0, 0],
    pot: 50,
  });
  check('board straight shared by both players splits', g.players[0].chips === 25 && g.players[1].chips === 25 && sameWinners(g.lastPots[0].winners, [0,1]), `chips=${chipsOf(g)} winners=${g.lastPots[0].winners}`);
  check('board-playing split conserves chips', g.pot === 0 && tableTotal(g) === before, `total=${tableTotal(g)} before=${before}`);
}

{
  const { g } = settleShowdown({
    board: [['A','H'], ['K','H'], ['Q','H'], ['9','H'], ['2','C']],
    hands: [
      [['J','H'], ['4','C']],
      [['8','H'], ['3','C']],
      [['5','S'], ['4','D']],
      [['7','C'], ['6','D']],
    ],
    committed: [50, 50, 0, 0],
    pot: 100,
  });
  check('board flush plus higher suited hole card wins', g.players[0].chips === 100 && g.players[1].chips === 0 && sameWinners(g.lastPots[0].winners, [0]), `chips=${chipsOf(g)} winners=${g.lastPots[0].winners}`);
}

{
  const { g } = settleShowdown({
    board: [['A','C'], ['A','D'], ['K','S'], ['K','H'], ['Q','C']],
    hands: [
      [['3','S'], ['2','D']],
      [['5','C'], ['4','D']],
      [['9','S'], ['8','D']],
      [['7','C'], ['6','D']],
    ],
    committed: [40, 40, 0, 0],
    pot: 80,
  });
  check('identical best five despite different hole cards splits exactly', g.players[0].chips === 40 && g.players[1].chips === 40 && sameWinners(g.lastPots[0].winners, [0,1]), `chips=${chipsOf(g)} winners=${g.lastPots[0].winners}`);
}

{
  const { g } = settleShowdown({
    board: [['Q','S'], ['Q','H'], ['Q','D'], ['Q','C'], ['2','S']],
    hands: [
      [['A','D'], ['3','C']],
      [['K','D'], ['4','C']],
      [['J','D'], ['5','C']],
      [['10','D'], ['6','C']],
    ],
    committed: [30, 30, 0, 0],
    pot: 60,
  });
  check('quads on board use kicker to decide winner', g.players[0].chips === 60 && g.players[1].chips === 0 && sameWinners(g.lastPots[0].winners, [0]), `chips=${chipsOf(g)} winners=${g.lastPots[0].winners}`);
}

{
  const { g } = settleShowdown({
    board: [['9','S'], ['8','D'], ['4','C'], ['3','H'], ['2','S']],
    hands: [
      [['K','S'], ['K','H']],
      [['Q','S'], ['Q','H']],
      [['A','S'], ['A','H']],
      [['7','C'], ['6','C']],
    ],
    folded: [false, false, true, true],
    committed: [100, 100, 50, 0],
    pot: 250,
  });
  check('folded players remain ineligible even with best hand', g.players[0].chips === 250 && g.players[2].chips === 0 && sameWinners(g.lastPots[0].winners, [0]), `chips=${chipsOf(g)} winners=${g.lastPots[0].winners}`);
}

{
  const { g, before } = settleShowdown({
    board: [['9','S'], ['8','D'], ['4','C'], ['3','H'], ['2','S']],
    hands: [
      [['A','S'], ['A','H']],
      [['K','S'], ['K','H']],
      [['Q','S'], ['Q','H']],
      [['7','C'], ['6','C']],
    ],
    folded: [false, false, false, true],
    committed: [50, 100, 200, 0],
    pot: 350,
  });
  check('side pots use evaluator per eligible group', g.players[0].chips === 150 && g.players[1].chips === 100 && g.players[2].chips === 100,
    `chips=${chipsOf(g)} pots=${JSON.stringify(g.lastPots.map(p => ({amount:p.amount, winners:p.winners})))}`);
  check('side pot with different main and side winners conserves chips', g.pot === 0 && tableTotal(g) === before, `total=${tableTotal(g)} before=${before}`);
}

// Hand-ranking category order.
{
  const samples = [
    best([['A','S'], ['K','S']], [['Q','S'], ['J','S'], ['10','S'], ['2','D'], ['3','C']]),
    best([['Q','S'], ['Q','H']], [['Q','D'], ['Q','C'], ['A','S'], ['K','D'], ['2','C']]),
    best([['A','S'], ['A','H']], [['A','D'], ['K','C'], ['K','D'], ['Q','S'], ['2','C']]),
    best([['A','H'], ['2','H']], [['K','H'], ['J','H'], ['9','H'], ['4','H'], ['3','C']]),
    best([['A','S'], ['K','D']], [['Q','H'], ['J','C'], ['10','D'], ['3','S'], ['2','C']]),
    best([['9','S'], ['9','H']], [['9','D'], ['A','C'], ['K','D'], ['5','S'], ['2','C']]),
    best([['K','S'], ['K','H']], [['Q','D'], ['Q','C'], ['A','S'], ['5','D'], ['2','C']]),
    best([['8','S'], ['8','H']], [['A','D'], ['K','C'], ['Q','S'], ['5','D'], ['2','C']]),
    best([['A','S'], ['Q','H']], [['10','D'], ['8','C'], ['6','S'], ['4','D'], ['2','C']]),
  ];
  check('hand ranking order is SF > quads > full house > flush > straight > trips > two pair > pair > high card',
    samples.map(ev => ev.rank).join() === '8,7,6,5,4,3,2,1,0',
    samples.map(ev => `${ev.name}:${ev.rank}`).join(' | '));
}

const failed = results.filter(r => !r.ok);
console.log('\n---');
console.log(`Total ${results.length}  PASS ${results.length - failed.length}  FAIL ${failed.length}`);
if (failed.length) {
  for (const f of failed) console.log(' -', f.name, f.detail);
  process.exit(1);
}


