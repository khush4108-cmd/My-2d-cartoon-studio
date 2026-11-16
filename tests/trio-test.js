// TRIO TEST — the Human + Rabbit + Lion story (Aarav, Coco, Leo) through the
// shipped Studio pipeline: cast, staging, quadruped size, overlap, movement.
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const { Ctx, writePNG } = require('/tmp/raster.js');
const REPO = path.resolve(__dirname, '..');
const FILES = ['script-format.js', 'writer-free.js', 'art-paths.js', 'art-rig.js', 'characters.js', 'acting.js', 'scenes.js', 'renderer.js'];
const noop = () => {};
const dummy = new Proxy({ canvas: { width: 1, height: 1 }, measureText: () => ({ width: 8 }),
  createLinearGradient: () => ({ addColorStop: noop }), createRadialGradient: () => ({ addColorStop: noop }) },
  { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
const sb = { console, Math, Date, JSON, Object, Array, String, Number, Boolean, RegExp, Error, Set, Map, Uint8Array, Proxy };
sb.window = sb; sb.self = sb; sb.globalThis = sb; sb.performance = { now: () => 0 };
sb.requestAnimationFrame = noop; sb.cancelAnimationFrame = noop;
sb.document = { visibilityState: 'visible', addEventListener: noop, getElementById: () => null,
  createElement: () => ({ style: {}, getContext: () => dummy, appendChild: noop }), body: { insertBefore: noop, firstChild: null } };
sb.navigator = { userAgent: 'trio-test' }; sb.speechSynthesis = null; sb.SpeechSynthesisUtterance = null;
vm.createContext(sb);
FILES.forEach(f => vm.runInContext(fs.readFileSync(path.join(REPO, 'js', f), 'utf8'), sb, { filename: f }));
const R = sb.Renderer, W = sb.WriterFree;
const STORY = fs.readFileSync(path.join(REPO, 'stories/aarav-coco-leo.txt'), 'utf8');
const tl = R.build(W.write(STORY));
let PASS = 0, FAIL = 0; const fails = [];
const ok = (c, m) => { if (c) { PASS++; console.log('  ✅ ' + m); } else { FAIL++; fails.push(m); console.log('  ❌ ' + m); } };

function bboxOf(hint) {
  const L = sb.Characters.look('X', hint); const P = sb.Acting.pose(L, { emotion: 'neutral', action: 'none', t: 1 });
  const c = new Ctx(900, 760); c.fillStyle = '#00ff00'; c.fillRect(0, 0, 900, 760);
  sb.Characters.draw(c, L, P, 450, 700, 1, false, 1);
  let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
  for (let y = 0; y < 760; y++) for (let x = 0; x < 900; x++) { const i = (y * 900 + x) * 4;
    if (!(c.data[i + 1] > 200 && c.data[i] < 100 && c.data[i + 2] < 100)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  return { w: x1 - x0, h: y1 - y0 };
}
const halfCache = {};
function halfW(nm) {                      // measured drawn half-width: ground truth
  if (halfCache[nm] !== undefined) return halfCache[nm];
  const L = tl.looks[nm];
  if (!L) return 70;
  const hint = L.kind === 'human' ? { kind: 'human', species: 'boy', size: L.size || 1 }
    : L.kind === 'object' ? { kind: 'object', species: L.obj && L.obj.shape === 'puddle' ? 'puddle' : (L.species || 'apple'), size: L.size || 1 }
    : { kind: 'animal', species: L.species, colour: L.colour, size: L.size || 1 };
  const bb = bboxOf(hint);
  halfCache[nm] = Math.round(bb.w / 2);
  return halfCache[nm];
}

console.log('════ CAST (no phantom characters) ════');
console.log('  cast: ' + tl.scenes.map(s => '[' + s.names.join(', ') + ']').join(' '));
const allNames = new Set(); tl.scenes.forEach(s => s.names.forEach(n => allNames.add(n)));
ok(allNames.size === 4 && ['Aarav', 'Coco', 'Leo', 'Apple'].every(n => allNames.has(n)),
  'exactly Aarav, Coco, Leo (+ Apple prop) on the cast list — no "Rabbit"/"Lion"/"Boy" phantoms');
ok(tl.looks.Leo.kind === 'animal' && tl.looks.Leo.species === 'lion', 'Leo is the lion design');
ok(tl.looks.Aarav.kind !== 'animal' && tl.looks.Aarav.kind !== 'object' && !tl.looks.Aarav.sp, 'Aarav uses the human template (no animal species)');
ok(tl.looks.Coco.species === 'rabbit', 'Coco is the rabbit');

console.log('════ LION SIZE (design-true, not doubled) ════');
const bL = bboxOf(tl.looks.Leo && { kind: 'animal', species: 'lion', size: tl.looks.Leo.size || 1 });
const bH = bboxOf({ kind: 'human', species: 'boy', size: 1 });
const bR = bboxOf({ kind: 'animal', species: 'rabbit', colour: 'white', size: tl.looks.Coco.size || 1 });
console.log('  lion ' + bL.w + 'x' + bL.h + '  human ' + bH.w + 'x' + bH.h + '  rabbit ' + bR.w + 'x' + bR.h);
ok(bL.h > bH.h && bL.h < bH.h * 1.35, 'lion stands ' + bL.h + 'px vs human ' + bH.h + 'px — big but not gigantic');
ok(bL.w > bH.w * 2.5, 'lion is four-legged: ' + bL.w + 'px long (blocking now reserves that width)');

console.log('════ PER-SCENE CAST + NO OVERLAP ════');
// the picked-up apple rides in Aarav's hand for the rest of the story, so it
// stays on stage with him in every later scene
const expect = [['Aarav', 'Coco', 'Leo'], ['Aarav', 'Coco', 'Leo', 'Apple'], ['Aarav', 'Coco', 'Leo', 'Apple'], ['Aarav', 'Coco', 'Leo', 'Apple']];
const draws = []; let curT = -1, lastAction = null;
const od = sb.Characters.draw, op = sb.Acting.pose;
sb.Acting.pose = function (L, o) { lastAction = o && o.action; return op.apply(this, arguments); };
sb.Characters.draw = function (c, L, P, x, feet) { if (curT >= 0 && L && L.name) draws.push({ n: L.name, x: x, feet: feet, a: lastAction }); return od.apply(this, arguments); };
function frame(t) { curT = t; draws.length = 0; R.drawAt(dummy, tl, t); curT = -1; return draws.slice(); }
let overlapBad = 0, overlapWorst = 1e9;
const grabStart = (tl.scenes[1].beats.find(b => b.grab) || { start: 1e9 }).start;
tl.scenes.forEach((s, si) => {
  const times = [];
  s.beats.forEach(b => {                       // sample each beat AFTER its walk-on
    let enter = b.start;                       // anybody arriving mid-beat needs
    s.stage.forEach(e => { if (e.enter > b.start - 0.01 && e.enter <= b.start + b.dur) enter = Math.max(enter, e.enter); });
    const a = Math.max(b.start, enter) + 1.3, z = b.start + b.dur - 0.25;   // 1.1s to settle
    for (let k = 0; k < 4 && a < z; k++) times.push(a + (z - a) * k / 3);
  });
  times.forEach(t => {
    const d = frame(Math.min(t, tl.total - 0.01));
    for (let i = 0; i < d.length; i++) for (let j = i + 1; j < d.length; j++) {
      const pair = d[i].n + '+' + d[j].n;
      if (t > grabStart && (pair === 'Aarav+Apple' || pair === 'Apple+Aarav')) continue;  // held in his hand
      const need = halfW(d[i].n) + halfW(d[j].n), gap = Math.abs(d[i].x - d[j].x);
      if (gap < need - 34) { overlapBad++; overlapWorst = Math.min(overlapWorst, gap - need); console.log('   OV scene' + (si + 1) + ' t=' + t.toFixed(1) + ' ' + pair + ' gap=' + gap.toFixed(0) + ' need=' + need); }
    }
  });
  const mid = s.start + (s.end - s.start) * 0.55;
  const on = frame(Math.min(mid, tl.total - 0.01)).map(q => q.n);
  const want = expect[si];
  ok(want.every(n => on.includes(n)) && on.every(n => want.includes(n)),
    'scene ' + (si + 1) + ' (' + s.bg + ') shows exactly ' + want.join(' + ') + ' at mid-scene');
});
ok(overlapBad === 0, 'no two bodies ever overlap across 32 sampled frames (worst slack ' + (overlapWorst === 1e9 ? 'n/a' : overlapWorst.toFixed(0) + 'px') + ')');

console.log('════ MOVEMENT & ACTIONS follow the story ════');
const s0 = tl.scenes[0], s1 = tl.scenes[1];
ok(s0.beats.some(b => b.movers && b.movers.includes('Aarav')), 'Aarav walks on in the park beat');
const walkBeat = tl.scenes[1].beats.find(b => /walked down the street/.test(b.say));
ok(walkBeat && walkBeat.movers && walkBeat.movers.length >= 2, 'the "walked down the street" beat moves the whole group: ' + (walkBeat && JSON.stringify(walkBeat.movers)));
const grabB = s1.beats.find(b => b.grab);
ok(grabB && grabB.grab.actor === 'Aarav' && grabB.grab.obj === 'Apple', 'Aarav picks the apple up (human holder): ' + (grabB && JSON.stringify(grabB.grab)));
if (grabB) {
  const g0 = frame(grabB.start + 0.2), g1 = frame(grabB.start + grabB.dur * 0.95);
  const a0 = g0.find(q => q.n === 'Apple'), a1 = g1.find(q => q.n === 'Apple');
  ok(a1 && a0 && a1.feet !== undefined && g1.find(q => q.n === 'Aarav') && Math.abs(a1.x - g1.find(q => q.n === 'Aarav').x) < 100, 'apple ends in Aarav\'s hand');
}
const laughBeat = tl.scenes[2].beats.find(b => /laugh happily/.test(b.say));
ok(!!laughBeat, 'the laugh beat is staged in the room scene');

console.log('════ SCREENSHOTS ════');
const pick = [0, 1, 2, 3].map(si => {
  const s = tl.scenes[si];
  const spoken = s.beats.filter(b => b.who && b.who !== 'Narrator');
  const b = spoken[Math.min(1, spoken.length - 1)] || s.beats[0];
  return Math.min(b.start + b.dur * 0.55, s.end - 0.2);
});
['trio-scene-1-park.png', 'trio-scene-2-street.png', 'trio-scene-3-room.png', 'trio-scene-4-night.png'].forEach((nm, i) => {
  const c = new Ctx(1280, 720); R.drawAt(c, tl, pick[i]);
  writePNG(path.join(REPO, 'previews/frames', nm), c);
  console.log('  ' + nm + '  t=' + pick[i].toFixed(2) + 's');
});
console.log('══════════════════════════════════════');
console.log(FAIL ? 'TRIO TEST FAIL ' + PASS + '/' + (PASS + FAIL) : 'TRIO TEST PASS ' + PASS + '/' + (PASS + FAIL) + ' all green');
if (FAIL) { console.log('failed: ' + fails.join(' | ')); process.exit(1); }
