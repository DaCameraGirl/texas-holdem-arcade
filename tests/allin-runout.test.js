'use strict';
const { loadGame } = require('./load-game');

const results = [];
function check(name, cond, detail) {
  results.push({ name, ok: !!cond, detail: detail || '' });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

function card(r, s, v) { return { r, s, v }; }
function freshDeck() {
  const d = [];
  const suits = ['♠','♥','♦','♣'];
  const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  const val = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };
  for (const s of suits) for (const r of ranks) d.push(card(r, s, val[r]));
  return d;
}

function setupAllInHeadsUp() {
  const g = loadGame();
  g.players = [
    { name:'YOU', chips:0, hand:[card('A','♠',14), card('K','♠',13)], isHuman:true },
    { name:'BOT-1', chips:0, hand:[card('2','♥',2), card('3','♥',3)] },
    { name:'BOT-2', chips:1000, hand:[card('4','♦',4), card('5','♦',5)] },
    { name:'BOT-3', chips:1000, hand:[card('6','♣',6), card('7','♣',7)] },
  ];
  g.folded = [false, false, true, true];
  g.allIn = [true, true, false, false];
  g.acted = [true, true, true, true];
  g.roundBets = [1000, 1000, 0, 0];
  g.currentBet = 1000;
  g.stage = 'preflop';
  g.actingIdx = 1;
  g.dealerIdx = 0;
  g.pot = 2000;
  g.community = [];
  g.deck = freshDeck();
  return g;
}

// 1) advanceAction must return immediately when everyone remaining is all-in
{
  const g = setupAllInHeadsUp();
  const start = Date.now();
  let hung = false;
  const killer = setTimeout(() => { hung = true; }, 200);
  g.advanceAction();
  clearTimeout(killer);
  check('advanceAction returns when remaining players are all-in', !hung && Date.now() - start < 200, `ms=${Date.now()-start} stage=${g.stage}`);
  check('all-in preflop schedules board runout', g.stage === 'preflop' && g._timers.length >= 1, `stage=${g.stage} timers=${g._timers.length}`);
}

// 2) flushing runout timers deals flop/turn/river and showdown without hanging
{
  const g = setupAllInHeadsUp();
  g.advanceAction();
  const hops = g.flushUntil(() => g.stage === 'showdown', 20);
  check('all-in runout reaches showdown', g.stage === 'showdown', `stage=${g.stage} hops=${hops} board=${g.community.length}`);
  check('all-in runout puts 5 community cards out', g.community.length === 5, `board=${g.community.length}`);
  check('showdown awards a remaining player', Array.isArray(g.showdownWinners) && g.showdownWinners.length >= 1, JSON.stringify(g.showdownWinners));
  const chips = g.players.reduce((s, p) => s + p.chips, 0);
  check('winner received the pot chips', g.players[0].chips + g.players[1].chips >= 2000, `you=${g.players[0].chips} bot1=${g.players[1].chips} sum=${chips} pot=${g.pot}`);
}

// 3) live players still take a turn (no false runout)
{
  const g = loadGame();
  g.players = [
    { name:'YOU', chips:990, hand:[card('A','♠',14), card('K','♥',13)], isHuman:true },
    { name:'BOT-1', chips:990, hand:[card('Q','♠',12), card('J','♥',11)] },
    { name:'BOT-2', chips:990, hand:[card('9','♦',9), card('8','♦',8)] },
    { name:'BOT-3', chips:990, hand:[card('2','♣',2), card('3','♣',3)] },
  ];
  g.folded = [false, false, false, false];
  g.allIn = [false, false, false, false];
  g.acted = [true, false, false, false];
  g.roundBets = [10, 0, 0, 0];
  g.currentBet = 10;
  g.stage = 'preflop';
  g.actingIdx = 0;
  g.dealerIdx = 3;
  g.pot = 40;
  g.community = [];
  g.deck = freshDeck();
  g.advanceAction();
  check('next actor is a player who can still act', g.actingIdx === 1 && g.stage === 'preflop', `actingIdx=${g.actingIdx} stage=${g.stage}`);
}

// 4) human all-in cannot still press action buttons
{
  const g = setupAllInHeadsUp();
  g.actingIdx = 0;
  check('humanCanAct is false when human is all-in', g.humanCanAct() === false, String(g.humanCanAct()));
}

const failed = results.filter(r => !r.ok);
console.log('\n---');
console.log(`Total ${results.length}  PASS ${results.length - failed.length}  FAIL ${failed.length}`);
if (failed.length) {
  for (const f of failed) console.log(' -', f.name, f.detail);
  process.exit(1);
}
