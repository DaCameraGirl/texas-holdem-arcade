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

function snap(g) {
  return {
    stage: g.stage,
    acting: g.actingIdx,
    bet: g.currentBet,
    acted: g.acted.slice(),
    roundBets: g.roundBets.slice(),
    allIn: g.allIn.slice(),
    folded: g.folded.slice(),
    community: g.community.length,
  };
}

// --- multiway seats: dealer 0 → SB 1, BB 2, UTG 3, BTN 0 ---
{
  const g = loadGame();
  g.dealerIdx = 0;
  const b = g.preflopBlindSeats();
  check('4-handed blinds: SB left of button, UTG first', b.sb===1 && b.bb===2 && b.first===3, JSON.stringify(b));
}

{
  const g = loadGame();
  g.players = [
    { name:'YOU', chips:1000, hand:[], isHuman:true },
    { name:'BOT-1', chips:1000, hand:[] },
  ];
  g.dealerIdx = 0;
  const b = g.preflopBlindSeats();
  check('heads-up blinds: button is SB and first to act', b.sb===0 && b.bb===1 && b.first===0, JSON.stringify(b));
}

// 1) multiway limped pot reaches BB → BB can check → flop
{
  const g = loadGame();
  quietDeal(g, 0);
  check('limped: posting did not mark SB/BB acted', g.acted[1]===false && g.acted[2]===false,
    `acted=${g.acted.join(',')}`);
  check('limped: action starts UTG not BB', g.actingIdx===3 && g.stage==='preflop',
    `acting=${g.actingIdx} stage=${g.stage}`);
  drive(g, () => g.doCall(3));
  drive(g, () => g.doCall(0));
  drive(g, () => g.doCall(1));
  const atBB = snap(g);
  check('limped: action reaches BB with no raise', atBB.acting===2 && atBB.stage==='preflop' && atBB.bet===10 && atBB.acted[2]===false,
    JSON.stringify(atBB));
  check('limped: BB may check (toCall 0)', g.currentBet - g.roundBets[2] === 0, `toCall=${g.currentBet-g.roundBets[2]}`);
  drive(g, () => g.doCheck(2));
  check('limped: BB check advances to flop', g.stage==='flop' && g.community.length===3,
    `stage=${g.stage} board=${g.community.length}`);
}

// 2) multiway limped pot reaches BB → BB raises → action reopens
{
  const g = loadGame();
  quietDeal(g, 0);
  drive(g, () => g.doCall(3));
  drive(g, () => g.doCall(0));
  drive(g, () => g.doCall(1));
  check('raise-option: on BB before raise', g.actingIdx===2 && g.stage==='preflop', `acting=${g.actingIdx}`);
  drive(g, () => g.doRaise(2, 30));
  check('BB raise reopens: currentBet 30', g.currentBet===30, `bet=${g.currentBet}`);
  check('BB raise reopens: action back to UTG', g.actingIdx===3 && g.stage==='preflop',
    `acting=${g.actingIdx} stage=${g.stage}`);
  check('BB raise reopens: UTG/BTN/SB must act again', g.acted[3]===false && g.acted[0]===false && g.acted[1]===false && g.acted[2]===true,
    `acted=${g.acted.join(',')}`);
}

// 3) raise before BB → BB still must respond
{
  const g = loadGame();
  quietDeal(g, 0);
  drive(g, () => g.doRaise(3, 30));
  drive(g, () => g.doCall(0));
  drive(g, () => g.doCall(1));
  const atBB = snap(g);
  check('raise-before-BB: action still on BB', atBB.acting===2 && atBB.stage==='preflop', JSON.stringify(atBB));
  check('raise-before-BB: BB faces a call, not a free check', g.currentBet - g.roundBets[2] === 20,
    `toCall=${g.currentBet-g.roundBets[2]} bet=${g.currentBet} bb=${g.roundBets[2]}`);
  check('raise-before-BB: BB has not yet acted', g.acted[2]===false, `acted=${g.acted.join(',')}`);
  drive(g, () => g.doCall(2));
  check('raise-before-BB: BB call closes preflop to flop', g.stage==='flop' && g.community.length===3,
    `stage=${g.stage} board=${g.community.length}`);
}

// 4) heads-up SB/button calls → BB retains check/raise option
{
  const g = loadGame();
  g.players = [
    { name:'YOU', chips:1000, hand:[], isHuman:true },
    { name:'BOT-1', chips:1000, hand:[] },
  ];
  quietDeal(g, 0);
  check('HU: button posted SB and acts first', g.actingIdx===0 && g.roundBets[0]===5 && g.roundBets[1]===10,
    `acting=${g.actingIdx} bets=${g.roundBets.join(',')}`);
  check('HU: neither blind is pre-marked acted', g.acted[0]===false && g.acted[1]===false, `acted=${g.acted.join(',')}`);
  drive(g, () => g.doCall(0));
  check('HU: after SB complete, action is on BB', g.actingIdx===1 && g.stage==='preflop' && g.currentBet===10,
    `acting=${g.actingIdx} stage=${g.stage} bet=${g.currentBet}`);
  check('HU: BB may check', g.currentBet - g.roundBets[1] === 0, `toCall=${g.currentBet-g.roundBets[1]}`);
  const g2 = loadGame();
  g2.players = [
    { name:'YOU', chips:1000, hand:[], isHuman:true },
    { name:'BOT-1', chips:1000, hand:[] },
  ];
  quietDeal(g2, 0);
  drive(g2, () => g2.doCall(0));
  drive(g2, () => g2.doRaise(1, 30));
  check('HU: BB raise reopens to the button', g2.actingIdx===0 && g2.stage==='preflop' && g2.currentBet===30 && g2.acted[0]===false,
    `acting=${g2.actingIdx} bet=${g2.currentBet} acted=${g2.acted.join(',')}`);
  drive(g, () => g.doCheck(1));
  check('HU: BB check goes to flop', g.stage==='flop' && g.community.length===3,
    `stage=${g.stage} board=${g.community.length}`);
}

// 5) BB all-in from posting does not stall
{
  const g = loadGame();
  g.players = [
    { name:'YOU', chips:1000, hand:[], isHuman:true },
    { name:'BOT-1', chips:1000, hand:[] },
    { name:'BOT-2', chips:10, hand:[] },
    { name:'BOT-3', chips:1000, hand:[] },
  ];
  const start = Date.now();
  quietDeal(g, 0);
  check('short BB: posting 10 puts BB all-in', g.allIn[2]===true && g.roundBets[2]===10, `allIn=${g.allIn.join(',')} bets=${g.roundBets.join(',')}`);
  check('short BB: action starts UTG not the all-in BB', g.actingIdx===3, `acting=${g.actingIdx}`);
  drive(g, () => g.doCall(3));
  drive(g, () => g.doCall(0));
  drive(g, () => g.doCall(1));
  check('short BB: limped round completes to flop without stall', g.stage==='flop' && Date.now()-start < 500 && g.community.length===3,
    `stage=${g.stage} ms=${Date.now()-start} board=${g.community.length}`);
}

{
  const g = loadGame();
  g.players = [
    { name:'YOU', chips:1000, hand:[], isHuman:true },
    { name:'BOT-1', chips:1000, hand:[] },
    { name:'BOT-2', chips:7, hand:[] },
    { name:'BOT-3', chips:1000, hand:[] },
  ];
  const start = Date.now();
  quietDeal(g, 0);
  check('partial BB all-in: posted 7 and is all-in', g.allIn[2]===true && g.roundBets[2]===7, `bets=${g.roundBets.join(',')}`);
  drive(g, () => g.doCall(3));
  drive(g, () => g.doCall(0));
  drive(g, () => g.doCall(1));
  check('partial BB all-in: round does not stall, reaches flop', g.stage==='flop' && Date.now()-start < 500,
    `stage=${g.stage} ms=${Date.now()-start} acting=${g.actingIdx}`);
}

const failed = results.filter(r => !r.ok);
console.log('\n---');
console.log(`Total ${results.length}  PASS ${results.length - failed.length}  FAIL ${failed.length}`);
if (failed.length) {
  for (const f of failed) console.log(' -', f.name, f.detail);
  process.exit(1);
}
