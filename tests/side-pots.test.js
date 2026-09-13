'use strict';
const { loadGame } = require('./load-game');

const results = [];
function check(name, cond, detail) {
  results.push({ name, ok: !!cond, detail: detail || '' });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

function card(r, s) {
  const val = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };
  return { r, s, v: val[r] };
}
function freshDeck() {
  const d = [];
  for (const s of ['♠','♥','♦','♣']) {
    for (const r of ['2','3','4','5','6','7','8','9','10','J','Q','K','A']) d.push(card(r, s));
  }
  return d;
}

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
  g.dealerIdx = 0;
  g.actingIdx = 0;
  g.stage = 'river';
  g.deck = freshDeck();
  return g;
}

function dryBoard() {
  // no straight/flush; kickers play
  return [card('9','♠'), card('8','♦'), card('4','♣'), card('3','♥'), card('2','♠')];
}

function chipsOf(g) {
  return g.players.map(p => p.chips);
}

function tableTotal(g) {
  return g.players.reduce((s, p) => s + p.chips, 0) + g.pot;
}

{
  const g = loadGame();
  const pots = g.buildPots([50, 100, 200, 0], [false, false, false, true]);
  check('3-way unequal builds main + two sides', pots.length === 3
    && pots[0].amount === 150 && pots[0].eligible.join() === '0,1,2'
    && pots[1].amount === 100 && pots[1].eligible.join() === '1,2'
    && pots[2].amount === 100 && pots[2].eligible.join() === '2',
    JSON.stringify(pots.map(p => ({amount:p.amount, eligible:p.eligible}))));
}

{
  const g = loadGame();
  const pots = g.buildPots([50, 100, 200, 400], [false, false, false, false]);
  check('4-way unequal builds 4 pots', pots.length === 4
    && pots[0].amount === 200 && pots[0].eligible.join() === '0,1,2,3'
    && pots[1].amount === 150 && pots[1].eligible.join() === '1,2,3'
    && pots[2].amount === 200 && pots[2].eligible.join() === '2,3'
    && pots[3].amount === 200 && pots[3].eligible.join() === '3',
    JSON.stringify(pots.map(p => ({amount:p.amount, eligible:p.eligible}))));
}

{
  const g = loadGame();
  const pots = g.buildPots([100, 100, 50, 0], [false, false, true, true]);
  check('folded contributor is in main pot but not eligible',
    pots[0].amount === 150 && pots[0].contributors.includes(2) && !pots[0].eligible.includes(2)
    && pots[1].amount === 100 && pots[1].eligible.join() === '0,1',
    JSON.stringify(pots.map(p => ({amount:p.amount, eligible:p.eligible, contributors:p.contributors}))));
}

{
  const g = loadGame();
  const p = g.splitPotAmount(10, [0, 1, 2], 0, 4);
  check('odd chips go left of button (idx 1 first)', p[0]===3 && p[1]===4 && p[2]===3, JSON.stringify(p));
}

{
  const g = loadGame();
  const p = g.splitPotAmount(5, [1, 3], 0, 4);
  check('2-way odd chip to nearest left of button among winners', p[1]===3 && p[3]===2, JSON.stringify(p));
}

// 3-player unequal all-in settlement
{
  const g = baseGame();
  g.players[0].hand = [card('A','♠'), card('A','♥')];
  g.players[1].hand = [card('K','♠'), card('K','♥')];
  g.players[2].hand = [card('Q','♠'), card('Q','♥')];
  g.players[3].hand = [card('7','♣'), card('6','♣')];
  g.folded = [false, false, false, true];
  g.allIn = [true, true, true, false];
  g.committed = [50, 100, 200, 0];
  g.pot = 350;
  g.community = dryBoard();
  const before = tableTotal(g);
  g.showdown();
  check('3-player unequal: AA wins main 150', g.players[0].chips === 150, chipsOf(g).join(','));
  check('3-player unequal: KK wins side 100', g.players[1].chips === 100, chipsOf(g).join(','));
  check('3-player unequal: QQ gets uncontested 100', g.players[2].chips === 100, chipsOf(g).join(','));
  check('3-player unequal: folded player wins nothing', g.players[3].chips === 0, chipsOf(g).join(','));
  check('3-player unequal: pot cleared and chips conserved', g.pot === 0 && tableTotal(g) === before,
    `pot=${g.pot} total=${tableTotal(g)} before=${before}`);
  check('3-player unequal: lastPots amounts 150/100/100',
    g.lastPots.map(p => p.amount).join() === '150,100,100',
    JSON.stringify(g.lastPots.map(p => ({amount:p.amount, winners:p.winners}))));
}

// 4-player all-in with multiple side pots
{
  const g = baseGame();
  g.players[0].hand = [card('A','♠'), card('A','♥')];
  g.players[1].hand = [card('K','♠'), card('K','♥')];
  g.players[2].hand = [card('Q','♠'), card('Q','♥')];
  g.players[3].hand = [card('J','♠'), card('J','♥')];
  g.committed = [50, 100, 200, 400];
  g.pot = 750;
  g.community = dryBoard();
  const before = tableTotal(g);
  g.showdown();
  check('4-player: main 200 to AA', g.players[0].chips === 200, chipsOf(g).join(','));
  check('4-player: side1 150 to KK', g.players[1].chips === 150, chipsOf(g).join(','));
  check('4-player: side2 200 to QQ', g.players[2].chips === 200, chipsOf(g).join(','));
  check('4-player: leftover 200 to JJ', g.players[3].chips === 200, chipsOf(g).join(','));
  check('4-player: chips conserved', g.pot === 0 && tableTotal(g) === before && tableTotal(g) === 750,
    `pot=${g.pot} total=${tableTotal(g)}`);
}

// folded player who already contributed — even with the best hole cards, cannot win
{
  const g = baseGame();
  g.players[0].hand = [card('K','♠'), card('K','♥')];
  g.players[1].hand = [card('Q','♠'), card('Q','♥')];
  g.players[2].hand = [card('A','♠'), card('A','♥')]; // folded nuts
  g.players[3].hand = [card('2','♣'), card('3','♣')];
  g.folded = [false, false, true, true];
  g.allIn = [true, true, false, false];
  g.committed = [100, 100, 50, 0];
  g.pot = 250;
  g.community = dryBoard();
  const before = tableTotal(g);
  g.showdown();
  check('folded contributor never wins', g.players[2].chips === 0, chipsOf(g).join(','));
  check('folded-contributor pot goes to live winner (KK)', g.players[0].chips === 250 && g.players[1].chips === 0,
    chipsOf(g).join(','));
  check('folded-contributor chips conserved', g.pot === 0 && tableTotal(g) === before, `total=${tableTotal(g)}`);
}

// tie in a side pot (and main)
{
  const g = baseGame();
  g.players[0].hand = [card('7','♠'), card('2','♥')]; // worst
  g.players[1].hand = [card('A','♥'), card('K','♥')];
  g.players[2].hand = [card('A','♣'), card('K','♣')]; // same play as BOT-1
  g.players[3].hand = [card('4','♦'), card('5','♦')];
  g.folded = [false, false, false, true];
  g.committed = [50, 200, 200, 0];
  g.pot = 450;
  g.community = [card('Q','♠'), card('Q','♦'), card('Q','♣'), card('Q','♥'), card('9','♠')];
  const before = tableTotal(g);
  g.showdown();
  check('side-pot tie: short stack does not win', g.players[0].chips === 0, chipsOf(g).join(','));
  check('side-pot tie: AK / AK split main+side equally', g.players[1].chips === 225 && g.players[2].chips === 225,
    chipsOf(g).join(','));
  check('side-pot tie: chips conserved', g.pot === 0 && tableTotal(g) === before, `total=${tableTotal(g)}`);
}

// odd chip on a tied pot, left of button
{
  const g = baseGame();
  g.dealerIdx = 0;
  g.players[0].hand = [card('7','♠'), card('2','♥')];
  g.players[1].hand = [card('A','♥'), card('K','♥')];
  g.players[2].hand = [card('A','♣'), card('K','♣')];
  g.players[3].hand = [card('4','♦'), card('5','♦')];
  g.folded = [false, false, false, true];
  g.committed = [11, 26, 26, 0];
  g.pot = 63;
  g.community = [card('Q','♠'), card('Q','♦'), card('Q','♣'), card('Q','♥'), card('9','♠')];
  g.showdown();
  // main 33 split B,C → 16 each + odd chip to idx 1 (left of button 0)
  // side 30 split 15 each
  check('odd chip on tied main goes to left of button (BOT-1)', g.players[1].chips === 32 && g.players[2].chips === 31,
    chipsOf(g).join(','));
  check('odd-chip split conserves 63', g.pot === 0 && tableTotal(g) === 63, `total=${tableTotal(g)} pot=${g.pot}`);
}

// automatic board runout still completes with unequal all-ins
{
  const g = loadGame();
  g.players = [
    { name:'YOU', chips:0, hand:[card('A','♠'), card('A','♥')], isHuman:true },
    { name:'BOT-1', chips:0, hand:[card('K','♠'), card('K','♥')] },
    { name:'BOT-2', chips:0, hand:[card('Q','♠'), card('Q','♥')] },
    { name:'BOT-3', chips:1000, hand:[card('2','♣'), card('3','♣')] },
  ];
  g.folded = [false, false, false, true];
  g.allIn = [true, true, true, false];
  g.acted = [true, true, true, true];
  g.roundBets = [50, 100, 200, 0];
  g.committed = [50, 100, 200, 0];
  g.currentBet = 200;
  g.stage = 'preflop';
  g.actingIdx = 2;
  g.dealerIdx = 0;
  g.pot = 350;
  g.community = [];
  g.deck = freshDeck();
  const before = tableTotal(g);
  const start = Date.now();
  g.advanceAction();
  const hops = g.flushUntil(() => g.stage === 'showdown', 20);
  check('unequal all-in runout does not stall', g.stage === 'showdown' && Date.now() - start < 500,
    `stage=${g.stage} hops=${hops} ms=${Date.now()-start}`);
  check('unequal all-in runout deals 5 board cards', g.community.length === 5, `board=${g.community.length}`);
  check('unequal all-in runout conserves chips', g.pot === 0 && tableTotal(g) === before,
    `pot=${g.pot} total=${tableTotal(g)} chips=${chipsOf(g).join(',')}`);
}

const failed = results.filter(r => !r.ok);
console.log('\n---');
console.log(`Total ${results.length}  PASS ${results.length - failed.length}  FAIL ${failed.length}`);
if (failed.length) {
  for (const f of failed) console.log(' -', f.name, f.detail);
  process.exit(1);
}
