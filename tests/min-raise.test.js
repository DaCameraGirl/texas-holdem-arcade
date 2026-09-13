'use strict';
const { loadGame } = require('./load-game');

const results = [];
function check(name, cond, detail) {
  results.push({ name, ok: !!cond, detail: detail || '' });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

function quietDeal(g, dealerIdx) {
  g.dealerIdx = dealerIdx;
  g.startHand();
  g._timers.splice(0);
}

function drive(g, fn) {
  fn();
  g.advanceAction();
  g._timers.splice(0);
}

// 4-handed: dealer 0 → SB 1, BB 2, UTG 3, BTN 0

// open to 20 preflop → min next is 30 (raise of BB 10)
{
  const g = loadGame();
  quietDeal(g, 0);
  check('preflop lastFullRaise starts at BB 10', g.lastFullRaise===10 && g.minRaiseTo()===20,
    `last=${g.lastFullRaise} minTo=${g.minRaiseTo()}`);
  drive(g, () => g.doRaise(3, 20));
  check('preflop open to 20: currentBet 20, min next 30', g.currentBet===20 && g.lastFullRaise===10 && g.minRaiseTo()===30,
    `bet=${g.currentBet} last=${g.lastFullRaise} minTo=${g.minRaiseTo()}`);
}

// postflop open to 20 → min next is 40 (bet size is the raise increment)
{
  const g = loadGame();
  g.stage = 'flop';
  g.currentBet = 0;
  g.lastFullRaise = 10;
  g.roundBets = [0,0,0,0];
  g.acted = [false,false,false,false];
  g.folded = [false,false,false,false];
  g.allIn = [false,false,false,false];
  g.committed = [0,0,0,0];
  g.pot = 0;
  g.actingIdx = 1;
  g.doRaise(1, 20);
  check('flop open to 20: lastFullRaise 20, min next 40', g.currentBet===20 && g.lastFullRaise===20 && g.minRaiseTo()===40,
    `bet=${g.currentBet} last=${g.lastFullRaise} minTo=${g.minRaiseTo()}`);
}

// full raise reopens action
{
  const g = loadGame();
  quietDeal(g, 0);
  drive(g, () => g.doRaise(3, 40)); // +30 over BB
  check('UTG raise 40 is a full raise', g.currentBet===40 && g.lastFullRaise===30, `bet=${g.currentBet} last=${g.lastFullRaise}`);
  drive(g, () => g.doCall(0));
  check('BTN called and is marked acted', g.acted[0]===true, `acted=${g.acted.join(',')}`);
  drive(g, () => g.doRaise(1, 70)); // +30, full
  check('full reraise reopens prior actors', g.acted[0]===false && g.acted[3]===false && g.acted[1]===true,
    `acted=${g.acted.join(',')}`);
  check('after full reraise, BTN may raise again', g.playerCanRaise(0)===true, `canRaise0=${g.playerCanRaise(0)}`);
  check('min raise after 40→70 is 100', g.minRaiseTo()===100 && g.lastFullRaise===30,
    `minTo=${g.minRaiseTo()} last=${g.lastFullRaise}`);
}

// short all-in raise does not reopen prior actor
{
  const g = loadGame();
  quietDeal(g, 0);
  drive(g, () => g.doRaise(3, 40));
  drive(g, () => g.doCall(0));
  g.players[1].chips = 50; // posted 5, all-in for 55 (< full +30)
  drive(g, () => g.doRaise(1, 55));
  check('short raise to 55 does not change lastFullRaise', g.currentBet===55 && g.lastFullRaise===30,
    `bet=${g.currentBet} last=${g.lastFullRaise}`);
  check('short raise does not reopen BTN', g.acted[0]===true && g.playerCanRaise(0)===false,
    `acted0=${g.acted[0]} canRaise0=${g.playerCanRaise(0)}`);
  check('unacted BB may still raise', g.actingIdx===2 && g.playerCanRaise(2)===true && g.stage==='preflop',
    `acting=${g.actingIdx} canRaiseBB=${g.playerCanRaise(2)}`);
}

// short all-in still requires later unacted players to respond, then prior actor may only call
{
  const g = loadGame();
  quietDeal(g, 0);
  drive(g, () => g.doRaise(3, 40));
  drive(g, () => g.doCall(0));
  g.players[1].chips = 15; // SB can only add 10+15=25 wait SB has 5 in, chips leftover ~995. Force short.
  // After posting SB has chips 995, roundBets 5. Set chips to 50 so all-in total = 55
  g.players[1].chips = 50;
  drive(g, () => g.doRaise(1, 55));
  check('BB still to act after short SB all-in', g.actingIdx===2 && !g.acted[2], `acting=${g.actingIdx} acted=${g.acted.join(',')}`);
  drive(g, () => g.doCall(2));
  check('UTG must call the extra and cannot raise', g.actingIdx===3 && g.playerCanRaise(3)===false && (g.currentBet-g.roundBets[3])===15,
    `acting=${g.actingIdx} canRaise=${g.playerCanRaise(3)} toCall=${g.currentBet-g.roundBets[3]}`);
  drive(g, () => g.doCall(3));
  check('BTN must call extra, cannot raise', g.actingIdx===0 && g.playerCanRaise(0)===false && (g.currentBet-g.roundBets[0])===15,
    `acting=${g.actingIdx} canRaise=${g.playerCanRaise(0)} toCall=${g.currentBet-g.roundBets[0]}`);
  drive(g, () => g.doCall(0));
  check('after calls, street completes (flop)', g.stage==='flop', `stage=${g.stage}`);
}

// multiple short all-ins
{
  const g = loadGame();
  quietDeal(g, 0);
  drive(g, () => g.doRaise(3, 40));
  g.players[0].chips = 10; // BTN has 10 behind after... roundBets 0, wait BTN posted 0, chips 1000. Set to 10 so all-in 10? currentBet 40, BTN needs 40 to call. chips 10 → all-in call 10, not a raise.
  // BTN all-in for 48: roundBets 0, chips 48
  g.players[0].chips = 48;
  drive(g, () => g.doRaise(0, 48));
  check('BTN short all-in 48 does not reopen UTG', g.currentBet===48 && g.lastFullRaise===30 && g.acted[3]===true && g.playerCanRaise(3)===false,
    `bet=${g.currentBet} last=${g.lastFullRaise} acted3=${g.acted[3]}`);
  g.players[1].chips = 7; // SB posted 5, 7 behind → all-in 12, but current is 48 so that's a short CALL not raise
  // SB all-in above current: need chips so 5+50=55
  g.players[1].chips = 50;
  drive(g, () => g.doRaise(1, 55));
  check('second short all-in 55 still not a full raise', g.currentBet===55 && g.lastFullRaise===30 && g.playerCanRaise(3)===false,
    `bet=${g.currentBet} last=${g.lastFullRaise}`);
  check('BB has not acted and may raise to 85', g.actingIdx===2 && g.playerCanRaise(2)===true && g.minRaiseTo()===85,
    `acting=${g.actingIdx} minTo=${g.minRaiseTo()}`);
}

// short-stack all-in below minimum raise (UTG shoves 16 vs BB 10)
{
  const g = loadGame();
  g.players[3].chips = 16;
  quietDeal(g, 0);
  drive(g, () => g.doRaise(3, 16));
  check('UTG shove 16 is short: lastFullRaise stays 10', g.currentBet===16 && g.lastFullRaise===10 && g.allIn[3]===true,
    `bet=${g.currentBet} last=${g.lastFullRaise} allIn=${g.allIn[3]}`);
  check('BTN has not acted and may raise', g.actingIdx===0 && g.playerCanRaise(0)===true && g.minRaiseTo()===26,
    `acting=${g.actingIdx} minTo=${g.minRaiseTo()}`);
  check('short shove did not reopen anyone (nobody had acted)', g.acted[0]===false && g.acted[1]===false && g.acted[2]===false,
    `acted=${g.acted.join(',')}`);
}

// heads-up: full raise reopens, short all-in does not
{
  const g = loadGame();
  g.players = [
    { name:'YOU', chips:1000, hand:[], isHuman:true },
    { name:'BOT-1', chips:1000, hand:[] },
  ];
  quietDeal(g, 0);
  drive(g, () => g.doCall(0)); // SB complete
  drive(g, () => g.doRaise(1, 30)); // BB +20
  check('HU: BB raise to 30 reopens button', g.actingIdx===0 && g.playerCanRaise(0)===true && g.lastFullRaise===20 && g.minRaiseTo()===50,
    `acting=${g.actingIdx} last=${g.lastFullRaise} minTo=${g.minRaiseTo()}`);
}

{
  const g = loadGame();
  g.players = [
    { name:'YOU', chips:1000, hand:[], isHuman:true },
    { name:'BOT-1', chips:15, hand:[] },
  ];
  quietDeal(g, 0);
  // HU button SB 5, BB posted min(10,15)=10, BB chips 5 left
  drive(g, () => g.doRaise(0, 30));
  check('HU: button raise 30 is full', g.currentBet===30 && g.lastFullRaise===20, `bet=${g.currentBet} last=${g.lastFullRaise}`);
  // BB has 5 behind (posted 10), all-in total 15 < 30+20 min, short
  drive(g, () => g.doRaise(1, 15));
  check('HU: BB short all-in 15 vs 30 is a call not a raise', g.currentBet===30 && g.lastFullRaise===20 && g.allIn[1]===true,
    `bet=${g.currentBet} last=${g.lastFullRaise} allInBB=${g.allIn[1]}`);
}

{
  const g = loadGame();
  g.players = [
    { name:'YOU', chips:1000, hand:[], isHuman:true },
    { name:'BOT-1', chips:40, hand:[] },
  ];
  quietDeal(g, 0);
  drive(g, () => g.doRaise(0, 30));
  // BB posted 10, 30 chips left → all-in 40. Increment 10 < lastFullRaise 20 → short, does not reopen
  drive(g, () => g.doRaise(1, 40));
  check('HU: BB short all-in 40 does not reopen button', g.currentBet===40 && g.lastFullRaise===20 && g.playerCanRaise(0)===false && g.acted[0]===true,
    `bet=${g.currentBet} last=${g.lastFullRaise} canRaise0=${g.playerCanRaise(0)} acted0=${g.acted[0]}`);
  check('HU: button still must call/fold the extra', g.actingIdx===0 && (g.currentBet-g.roundBets[0])===10 && g.stage==='preflop',
    `acting=${g.actingIdx} toCall=${g.currentBet-g.roundBets[0]} stage=${g.stage}`);
  g.doCall(0);
  g.advanceAction();
  g.flushUntil(() => g.stage==='flop' || g.stage==='showdown', 20);
  check('HU: call after short all-in does not stall', g.stage==='flop' || g.stage==='showdown', `stage=${g.stage}`);
}

// illegal undersize raise with chips behind is bumped to min
{
  const g = loadGame();
  quietDeal(g, 0);
  g.doRaise(3, 15); // min is 20
  check('undersize raise with chips behind bumps to 20', g.currentBet===20 && g.lastFullRaise===10 && g.roundBets[3]===20,
    `bet=${g.currentBet} last=${g.lastFullRaise} utg=${g.roundBets[3]}`);
}

const failed = results.filter(r => !r.ok);
console.log('\n---');
console.log(`Total ${results.length}  PASS ${results.length - failed.length}  FAIL ${failed.length}`);
if (failed.length) {
  for (const f of failed) console.log(' -', f.name, f.detail);
  process.exit(1);
}
