'use strict';
const { loadGame } = require('./load-game');

const results = [];
function check(name, cond, detail) {
  results.push({ name, ok: !!cond, detail: detail || '' });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

function quietDeal(g, dealerIdx) {
  if (dealerIdx !== undefined) g.dealerIdx = dealerIdx;
  g.startHand();
  g._timers.splice(0);
}

function nextHand(g) {
  g.advanceButton();
  g.startHand();
  g._timers.splice(0);
}

function settleUnplayed(g) {
  for (let i = 0; i < g.players.length; i++) {
    g.players[i].chips += g.committed[i] || 0;
  }
  g.pot = 0;
  g.committed = g.players.map(() => 0);
  g.stage = 'showdown';
}

function chipsOf(g) { return g.players.map(p => p.chips); }
function tableTotal(g) {
  return g.players.reduce((s, p) => s + p.chips, 0) + g.pot;
}
function handsOf(g) {
  return g.players.map(p => (p.hand || []).length);
}

function four(chips) {
  const g = loadGame();
  const c = chips || [1000, 1000, 1000, 1000];
  g.players = [
    { name:'YOU', chips:c[0], hand:[], isHuman:true },
    { name:'BOT-1', chips:c[1], hand:[] },
    { name:'BOT-2', chips:c[2], hand:[] },
    { name:'BOT-3', chips:c[3], hand:[] },
  ];
  return g;
}

// --- 4-player button/SB/BB rotation over 3 hands ---
{
  const g = four();
  quietDeal(g, 0);
  let b = g.preflopBlindSeats();
  check('hand1: BTN 0, SB 1, BB 2, UTG 3', b.sb===1 && b.bb===2 && b.first===3 && g.dealerIdx===0,
    JSON.stringify({ dealer:g.dealerIdx, ...b, acting:g.actingIdx }));
  check('hand1: SB/BB posted 5/10', g.roundBets[1]===5 && g.roundBets[2]===10 && g.pot===15,
    `bets=${g.roundBets.join(',')} pot=${g.pot}`);
  const t1 = tableTotal(g);
  check('hand1: chips conserved at 4000', t1===4000, `total=${t1}`);

  settleUnplayed(g);
  nextHand(g);
  b = g.preflopBlindSeats();
  check('hand2: button advanced to 1', g.dealerIdx===1 && b.sb===2 && b.bb===3 && b.first===0,
    JSON.stringify({ dealer:g.dealerIdx, ...b }));
  check('hand2: chips conserved', tableTotal(g)===4000, `total=${tableTotal(g)} chips=${chipsOf(g)}`);

  settleUnplayed(g);
  nextHand(g);
  b = g.preflopBlindSeats();
  check('hand3: button advanced to 2', g.dealerIdx===2 && b.sb===3 && b.bb===0 && b.first===1,
    JSON.stringify({ dealer:g.dealerIdx, ...b }));
  check('hand3: chips conserved', tableTotal(g)===4000, `total=${tableTotal(g)}`);
}

// --- one busted seat skipped ---
{
  const g = four([1000, 1000, 0, 1000]);
  quietDeal(g, 0);
  const b = g.preflopBlindSeats();
  check('skip busted 2: SB 1, BB 3, first 0 (3-handed)', b.sb===1 && b.bb===3 && b.first===0,
    JSON.stringify(b));
  check('busted seat 2 got no cards', g.players[2].hand.length===0, `hands=${handsOf(g)}`);
  check('busted seat 2 is folded / not acting', g.folded[2]===true && g.actingIdx!==2,
    `folded=${g.folded.join(',')} acting=${g.actingIdx}`);
  check('live players received 2 cards', handsOf(g).join()==='2,2,0,2', `hands=${handsOf(g)}`);
}

{
  const g = four([1000, 0, 1000, 1000]);
  quietDeal(g, 0);
  const b = g.preflopBlindSeats();
  check('skip busted 1: SB 2, BB 3, first 0', b.sb===2 && b.bb===3 && b.first===0, JSON.stringify(b));
  check('busted SB seat never posted', g.roundBets[1]===0 && g.players[1].chips===0,
    `bets=${g.roundBets.join(',')} chips=${chipsOf(g)}`);
}

// --- 3-handed → heads-up after a bust ---
{
  const g = four([1000, 1000, 1000, 0]);
  quietDeal(g, 0);
  let b = g.preflopBlindSeats();
  check('3-handed start: BTN 0 SB 1 BB 2, button acts first', b.sb===1 && b.bb===2 && b.first===0 && g.actingIdx===0,
    JSON.stringify({ dealer:g.dealerIdx, ...b, acting:g.actingIdx }));

  settleUnplayed(g);
  g.players[2].chips = 0;
  nextHand(g);
  b = g.preflopBlindSeats();
  check('3→HU: button moves to old SB (1)', g.dealerIdx===1, `dealer=${g.dealerIdx}`);
  check('3→HU: button posts SB, other posts BB', b.sb===1 && b.bb===0 && b.first===1,
    JSON.stringify(b));
  check('3→HU: button/SB acts first preflop', g.actingIdx===1 && g.stage==='preflop',
    `acting=${g.actingIdx} stage=${g.stage}`);
  check('3→HU: busted 2 still has no cards', g.players[2].hand.length===0 && g.folded[2]===true,
    `hands=${handsOf(g)} folded2=${g.folded[2]}`);
  check('3→HU: chips conserved (2000)', tableTotal(g)===2000, `total=${tableTotal(g)} chips=${chipsOf(g)}`);

  // postflop first actor should be BB (seat 0)
  g.doCall(1);
  g.advanceAction();
  g._timers.splice(0);
  g.doCheck(0);
  g.advanceAction();
  check('3→HU: BB check goes to flop', g.stage==='flop', `stage=${g.stage}`);
  g.flushUntil(() => g.stage==='flop' && g.actingIdx===0, 20);
  check('3→HU: BB acts first postflop', g.stage==='flop' && g.actingIdx===0,
    `stage=${g.stage} acting=${g.actingIdx}`);
}

// --- heads-up button/SB alternation ---
{
  const g = four([1000, 1000, 0, 0]);
  quietDeal(g, 0);
  let b = g.preflopBlindSeats();
  check('HU hand1: BTN/SB 0, BB 1, first 0', b.sb===0 && b.bb===1 && b.first===0 && g.actingIdx===0,
    JSON.stringify({ dealer:g.dealerIdx, ...b, acting:g.actingIdx, bets:g.roundBets }));
  check('HU hand1: button posted 5, BB posted 10', g.roundBets[0]===5 && g.roundBets[1]===10,
    `bets=${g.roundBets.join(',')}`);

  settleUnplayed(g);
  nextHand(g);
  b = g.preflopBlindSeats();
  check('HU hand2: button/SB alternates to 1', g.dealerIdx===1 && b.sb===1 && b.bb===0 && b.first===1 && g.actingIdx===1,
    JSON.stringify({ dealer:g.dealerIdx, ...b, acting:g.actingIdx }));

  settleUnplayed(g);
  nextHand(g);
  b = g.preflopBlindSeats();
  check('HU hand3: button/SB back to 0', g.dealerIdx===0 && b.sb===0 && b.bb===1 && b.first===0,
    JSON.stringify({ dealer:g.dealerIdx, ...b }));
}

// --- busted player never receives cards/action ---
{
  const g = four([1000, 1000, 1000, 0]);
  quietDeal(g, 0);
  check('busted never dealt', g.players[3].hand.length===0, `hands=${handsOf(g)}`);
  check('busted never first to act', g.actingIdx!==3, `acting=${g.actingIdx}`);
  const seen = new Set();
  let hops = 0;
  while (g.stage==='preflop' && hops < 8) {
    seen.add(g.actingIdx);
    if (g.folded[g.actingIdx] || g.allIn[g.actingIdx]) break;
    const toCall = g.currentBet - g.roundBets[g.actingIdx];
    if (toCall>0) g.doCall(g.actingIdx);
    else g.doCheck(g.actingIdx);
    g.advanceAction();
    g._timers.splice(0);
    hops++;
  }
  check('busted never took a turn this street', !seen.has(3), `seen=${[...seen]} hops=${hops} stage=${g.stage}`);
}

// player who busts at showdown stays busted on Next Hand
{
  const g = four([200, 200, 200, 50]);
  quietDeal(g, 0);
  g.players[3].chips = 0; // busted at settlement
  g.stage = 'showdown';
  g.pot = 0;
  const preserved = chipsOf(g).slice();
  nextHand(g);
  check('bust-at-showdown remains 0 chips', g.players[3].chips===0, `chips=${chipsOf(g)}`);
  check('bust-at-showdown no cards next hand', g.players[3].hand.length===0 && g.folded[3]===true,
    `hands=${handsOf(g)} folded=${g.folded[3]}`);
  check('other stacks preserved except new blinds', g.players[0].chips<=preserved[0] && g.players[1].chips<=preserved[1],
    `before=${preserved} after=${chipsOf(g)}`);
}

// --- Next Hand preserves stacks, clears hand-local state ---
{
  const g = four([800, 900, 1100, 1200]);
  quietDeal(g, 0);
  g.community = [{r:'A',s:'♠',v:14},{r:'K',s:'♠',v:13},{r:'Q',s:'♠',v:12}];
  g.currentBet = 80;
  g.lastFullRaise = 40;
  g.roundBets = [80, 80, 80, 80];
  g.committed = [80, 80, 80, 80];
  g.acted = [true, true, true, true];
  g.pot = 320;
  g.stage = 'showdown';
  g.players[0].hand = [{r:'2',s:'♥',v:2},{r:'3',s:'♥',v:3}];
  // restore chips as if already settled (pot 0, stacks kept)
  g.pot = 0;
  g.players[0].chips = 800;
  g.players[1].chips = 900;
  g.players[2].chips = 1100;
  g.players[3].chips = 1200;
  const before = chipsOf(g);
  nextHand(g);
  check('Next Hand: board cleared', g.community.length===0, `board=${g.community.length}`);
  check('Next Hand: street is preflop', g.stage==='preflop', `stage=${g.stage}`);
  check('Next Hand: currentBet/lastFullRaise reset', g.currentBet===10 && g.lastFullRaise===10,
    `bet=${g.currentBet} last=${g.lastFullRaise}`);
  check('Next Hand: acted reset for live players', g.acted[0]===false && g.acted[1]===false && g.acted[2]===false && g.acted[3]===false,
    `acted=${g.acted.join(',')}`);
  check('Next Hand: committed is only new blinds', g.committed.reduce((s,n)=>s+n,0)===15 && g.pot===15,
    `committed=${g.committed.join(',')} pot=${g.pot}`);
  check('Next Hand: hole cards are a fresh deal', g.players.every(p => p.hand.length===2),
    `hands=${handsOf(g)}`);
  check('Next Hand: stacks preserved aside from new blinds',
    g.dealerIdx===1 && g.players[0].chips===before[0] && g.players[1].chips===before[1]
      && g.players[2].chips===before[2]-5 && g.players[3].chips===before[3]-10,
    `before=${before} after=${chipsOf(g)} dealer=${g.dealerIdx}`);
  check('Next Hand: table still 4000', tableTotal(g)===4000, `total=${tableTotal(g)}`);
}

// --- total chips conserved across several simulated hands ---
{
  const g = four();
  quietDeal(g, 0);
  let ok = tableTotal(g)===4000;
  for (let h=0; h<5; h++) {
    settleUnplayed(g);
    nextHand(g);
    if (tableTotal(g)!==4000) ok = false;
  }
  check('6 consecutive deals conserve 4000 chips', ok && tableTotal(g)===4000,
    `total=${tableTotal(g)} chips=${chipsOf(g)} pot=${g.pot} dealer=${g.dealerIdx}`);
}

{
  const g = four([500, 0, 1500, 2000]);
  quietDeal(g, 3);
  check('4→3 skip: dealer 3, SB 0, BB 2 (skip busted 1)', g.dealerIdx===3 && g.preflopBlindSeats().sb===0 && g.preflopBlindSeats().bb===2,
    JSON.stringify({ dealer:g.dealerIdx, ...g.preflopBlindSeats() }));
  check('4→3 skip: first left of BB is 3 (button)', g.preflopBlindSeats().first===3, JSON.stringify(g.preflopBlindSeats()));
  check('4→3 skip: busted 1 has no cards', g.players[1].hand.length===0, `hands=${handsOf(g)}`);
  check('4→3 skip: conserved 4000', tableTotal(g)===4000, `total=${tableTotal(g)}`);
}

const failed = results.filter(r => !r.ok);
console.log('\n---');
console.log(`Total ${results.length}  PASS ${results.length - failed.length}  FAIL ${failed.length}`);
if (failed.length) {
  for (const f of failed) console.log(' -', f.name, f.detail);
  process.exit(1);
}
