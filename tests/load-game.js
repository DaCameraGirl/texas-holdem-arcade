'use strict';
const fs = require('fs');
const path = require('path');

function fakeEl() {
  return {
    textContent: '',
    innerHTML: '',
    className: '',
    disabled: false,
    value: '20',
    min: 0,
    max: 500,
    style: { display: '' },
    dataset: {},
    classList: { add() {}, toggle() {}, remove() {} },
    onclick: null,
    oninput: null,
  };
}

class FakeAudioContext {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.sampleRate = 44100;
    this.destination = {};
  }
  resume() {}
  createOscillator() {
    return {
      connect() { return { connect() {} }; },
      frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      start() {}, stop() {}, type: 'square',
    };
  }
  createGain() {
    return {
      connect() { return { connect() {} }; },
      gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
    };
  }
  createBuffer() { return { getChannelData() { return new Float32Array(1); } }; }
  createBufferSource() {
    return { connect() { return { connect() {} }; }, start() {}, stop() {}, buffer: null };
  }
  createBiquadFilter() {
    return { connect() { return { connect() {} }; }, type: '', frequency: { value: 0 } };
  }
}

function loadGame() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('no script in index.html');

  const els = {};
  const getEl = (id) => (els[id] ||= fakeEl());
  const ctx = {
    clearRect() {}, fill() {}, stroke() {}, beginPath() {}, moveTo() {},
    arcTo() {}, closePath() {}, save() {}, restore() {}, fillText() {},
    arc() {}, translate() {},
    fillStyle: '', strokeStyle: '', lineWidth: 0, font: '', textAlign: '',
    shadowColor: '', shadowBlur: 0,
  };
  getEl('table').getContext = () => ctx;
  getEl('table').width = 960;
  getEl('table').height = 540;

  const timers = [];
  let rafId = 1;
  const rafs = new Map();

  const document = {
    getElementById: getEl,
    addEventListener() {},
  };
  const localStorage = { getItem() { return '0'; }, setItem() {} };
  const performance = { now: () => Date.now() };
  const requestAnimationFrame = (fn) => { const id = rafId++; rafs.set(id, fn); return id; };
  const cancelAnimationFrame = (id) => { rafs.delete(id); };
  const setTimeoutFn = (fn) => { const id = { fn }; timers.push(id); return id; };
  const clearTimeoutFn = (id) => { const i = timers.indexOf(id); if (i >= 0) timers.splice(i, 1); };
  const speechSynthesis = { getVoices() { return []; }, cancel() {}, speak() {}, onvoiceschanged: null };
  function SpeechSynthesisUtterance(t) { this.text = t; }
  const windowObj = {
    AudioContext: FakeAudioContext,
    webkitAudioContext: FakeAudioContext,
    VOICE: null,
  };

  const factory = new Function(
    'document', 'window', 'localStorage', 'performance',
    'requestAnimationFrame', 'cancelAnimationFrame',
    'setTimeout', 'clearTimeout',
    'speechSynthesis', 'SpeechSynthesisUtterance', 'AudioContext',
    match[1] + `
      return {
        get players(){ return players; }, set players(v){ players = v; },
        get folded(){ return folded; }, set folded(v){ folded = v; },
        get allIn(){ return allIn; }, set allIn(v){ allIn = v; },
        get acted(){ return acted; }, set acted(v){ acted = v; },
        get roundBets(){ return roundBets; }, set roundBets(v){ roundBets = v; },
        get committed(){ return committed; }, set committed(v){ committed = v; },
        get lastPots(){ return lastPots; },
        get stage(){ return stage; }, set stage(v){ stage = v; },
        get actingIdx(){ return actingIdx; }, set actingIdx(v){ actingIdx = v; },
        get dealerIdx(){ return dealerIdx; }, set dealerIdx(v){ dealerIdx = v; },
        get currentBet(){ return currentBet; }, set currentBet(v){ currentBet = v; },
        get lastFullRaise(){ return lastFullRaise; }, set lastFullRaise(v){ lastFullRaise = v; },
        get pot(){ return pot; }, set pot(v){ pot = v; },
        get community(){ return community; }, set community(v){ community = v; },
        get deck(){ return deck; }, set deck(v){ deck = v; },
        get showdownWinners(){ return showdownWinners; },
        advanceAction, startHand, initGame, doFold, doCall, doRaise, doCheck,
        bettingDone, nextStage, startBettingRound, botDecision, botTurnIfNeeded,
        awardPot, showdown, bestHand, evalHand, activePlayers, playersWhoCanAct,
        postBlind, humanCanAct, handleTurnTimeout, nextActive, runOutBoard,
        buildPots, splitPotAmount, settlePots, preflopBlindSeats,
        minRaiseTo, playerCanRaise, liveSeats, nextLiveSeat, advanceButton,
      };
    `
  );

  const api = factory(
    document, windowObj, localStorage, performance,
    requestAnimationFrame, cancelAnimationFrame,
    setTimeoutFn, clearTimeoutFn,
    speechSynthesis, SpeechSynthesisUtterance, FakeAudioContext
  );
  api._timers = timers;
  api._els = els;
  api.flushTimers = () => {
    const batch = timers.splice(0, timers.length);
    for (const t of batch) t.fn();
  };
  api.flushUntil = (pred, max = 40) => {
    for (let i = 0; i < max; i++) {
      if (pred()) return i;
      if (!timers.length) return i;
      api.flushTimers();
    }
    return max;
  };
  return api;
}

module.exports = { loadGame };
