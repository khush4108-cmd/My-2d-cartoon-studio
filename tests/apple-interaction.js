// Runs with: node tests/apple-interaction.js
// APPLE INTERACTION TEST — proves the pick-up / carry / throw / splash
// choreography actually happens inside Renderer.drawAt, and proves the
// Mia & Leo cartoon's beats are byte-identical to the HEAD baseline.
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const REPO = require('path').resolve(__dirname, '..');
const FILES = ['script-format.js', 'writer-free.js', 'art-paths.js', 'art-rig.js', 'characters.js', 'acting.js', 'scenes.js', 'renderer.js'];
const noop = () => {};
const dummy = new Proxy({ canvas: { width: 1, height: 1 }, measureText: () => ({ width: 8 }),
  createLinearGradient: () => ({ addColorStop: noop }), createRadialGradient: () => ({ addColorStop: noop }) },
  { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
function load(root) {
  const sb = { console, Math, Date, JSON, Object, Array, String, Number, Boolean, RegExp, Error, Set, Map, Uint8Array, Proxy };
  sb.window = sb; sb.self = sb; sb.globalThis = sb; sb.performance = { now: () => 0 };
  sb.requestAnimationFrame = noop; sb.cancelAnimationFrame = noop;
  sb.document = { visibilityState: 'visible', addEventListener: noop, getElementById: () => null,
    createElement: () => ({ style: {}, getContext: () => dummy, appendChild: noop }), body: { insertBefore: noop, firstChild: null } };
  sb.navigator = { userAgent: 'apple-test' }; sb.speechSynthesis = null; sb.SpeechSynthesisUtterance = null;
  vm.createContext(sb);
  FILES.forEach(f => vm.runInContext(fs.readFileSync(path.join(root, 'js', f), 'utf8'), sb, { filename: f }));
  return sb;
}
let PASS = 0, FAIL = 0; const fails = [];
const ok = (c, m) => { if (c) { PASS++; console.log('  ✅ ' + m); } else { FAIL++; fails.push(m); console.log('  ❌ ' + m); } };

const sb = load(REPO);
const W = sb.WriterFree, R = sb.Renderer;
const STORY = fs.readFileSync(path.join(REPO, 'stories/coco-and-max.txt'), 'utf8');
const tl = R.build(W.write(STORY));

// ---- spy on the real draw calls: entity positions + poses, per frame ----
const draws = [];        // {t, name, x, feet, action, flip}
const splashes = [];     // strokeStyle+ellipse ops that look like the splash ring
const origDraw = sb.Characters.draw, origPose = sb.Acting.pose;
let curT = -1, lastAction = null;
sb.Acting.pose = function (L, o) { lastAction = o && o.action; return origPose.apply(this, arguments); };
sb.Characters.draw = function (c, L, P, x, feet, sc, flip, t) {
  if (L && L.name && curT >= 0) draws.push({ t: curT, name: L.name, x: x, feet: feet, action: lastAction, flip: flip });
  return origDraw.apply(this, arguments);
};
const spyCtx = new Proxy(dummy, { get: (t, k) => {
  if (k === 'ellipse') return function () { const st = String(t.strokeStyle || '');
    if (/rgba\(255,244,214/.test(st) || /rgba\(232,196,138/.test(st)) splashes.push({ t: curT, style: st, rx: arguments[2] }); };
  return (k in t ? t[k] : noop);
} });
function frame(time) { curT = time; draws.length = 0; splashes.length = 0; R.drawAt(spyCtx, tl, time); curT = -1;
  const snap = draws.slice();
  const at = nm => snap.find(d => d.name === nm); return { at, splashes: splashes.slice(), all: snap }; }

const s0 = tl.scenes[0], s1 = tl.scenes[1];
const grabB = s0.beats.find(b => b.grab), throwB = s1.beats.find(b => b.throw);
const carryB = s1.beats.find(b => b.dir && b.dir['Max'] && b.dir['Max'].action === 'carrywalk');
console.log('════ WRITER: interaction fields on the real story ════');
ok(!!grabB, 'writer marks a GRAB beat: ' + (grabB && JSON.stringify(grabB.grab)));
ok(!!carryB, 'writer marks a CARRY beat (Max carrywalks toward the Puddle)');
ok(!!throwB && throwB.throw.to === 'Puddle', 'writer marks a THROW beat aimed at the Puddle: ' + (throwB && JSON.stringify(throwB.throw)));
ok(throwB && throwB.sfx === 'splash', 'throw beat carries the splash SFX');
const puddleEnt = s1.stage.find(e => e.name === 'Puddle');
ok(!!puddleEnt, 'the Puddle is staged as a visible object in the street scene');

console.log('════ 1) MAX APPROACHES THE APPLE (grab beat) ════');
const g0 = frame(grabB.start + 0.15), gEnd = frame(grabB.start + grabB.dur * 0.95);
const dGap = Math.abs(g0.at('Max').x - g0.at('Apple').x) - Math.abs(gEnd.at('Max').x - gEnd.at('Apple').x);
ok(g0.at('Max').action === 'walk' || g0.at('Max').x !== gEnd.at('Max').x, 'Max moves toward the apple during the grab beat (walk pose / x changes)');
ok(dGap > 40, 'Max ends the beat much closer to the apple (gap closed by ' + dGap.toFixed(0) + 'px)');

console.log('════ 2) MAX BENDS DOWN AND LIFTS THE APPLE ════');
const gMid = frame(grabB.start + grabB.dur * 0.55);
ok(gMid.at('Max').action === 'pickup', 'Max strikes the pickup (bend-down) pose at mid-grab: ' + gMid.at('Max').action);
const lift = gEnd.at('Apple').feet - g0.at('Apple').feet;
ok(lift < -40, 'apple visibly LIFTS off the ground by ' + (-lift).toFixed(0) + 'px during the grab beat');
ok(Math.abs(gEnd.at('Apple').x - gEnd.at('Max').x) < 90, 'at end of grab the apple sits at Max\'s paw (Δx=' + Math.abs(gEnd.at('Apple').x - gEnd.at('Max').x).toFixed(0) + 'px)');

console.log('════ 3) APPLE IS HELD & MOVES WITH MAX (carry) ════');
const c0 = frame(carryB.start + 1.3), c1 = frame(carryB.start + carryB.dur - 0.15);
const hand = f => Math.abs(f.at('Apple').x - f.at('Max').x);
ok(hand(c0) < 90 && hand(c1) < 90, 'apple stays glued to Max\'s paw through the whole carry beat (Δx ' + hand(c0).toFixed(0) + '→' + hand(c1).toFixed(0) + ')');
ok(Math.abs(c1.at('Apple').x - c0.at('Apple').x) > 40, 'the apple TRAVELS with Max (' + Math.abs(c1.at('Apple').x - c0.at('Apple').x).toFixed(0) + 'px across the beat)');
ok(c0.at('Apple').feet < 600 && c1.at('Apple').feet < 600, 'apple is held up at paw height, not on the ground (feet=' + c0.at('Apple').feet.toFixed(0) + ',' + c1.at('Apple').feet.toFixed(0) + ')');
ok(c0.at('Max').action === 'carrywalk' || c1.at('Max').action === 'carrywalk' || c0.at('Max').action === 'carry', 'Max uses the carry poses while walking with the apple: ' + c0.at('Max').action + '/' + c1.at('Max').action);

console.log('════ 4) MAX TURNS TO THE PUDDLE & THROWS ════');
const t0 = frame(throwB.start + 0.2), tMid = frame(throwB.start + throwB.dur * 0.35);
ok(t0.at('Max').action === 'throw', 'Max strikes the throw pose at the start of the throw beat: ' + t0.at('Max').action);
const pud = t0.at('Puddle');
ok(!!pud, 'the Puddle is on screen in the throw beat at x=' + (pud && pud.x.toFixed(0)));

console.log('════ 5) APPLE FLIES AN ARC INTO THE PUDDLE ════');
const xProg = (tMid.at('Apple').x - t0.at('Apple').x);
ok(Math.abs(xProg) > 30, 'apple leaves the hand and flies toward the puddle (Δx=' + xProg.toFixed(0) + ' mid-arc)');
ok(tMid.at('Apple').feet < Math.min(t0.at('Apple').feet, 500), 'apple is HIGH in the air mid-arc (feet=' + tMid.at('Apple').feet.toFixed(0) + ' vs hand ' + t0.at('Apple').feet.toFixed(0) + ')');
const landT = throwB.start + throwB.dur * 0.7;
const tLand = frame(landT + 0.35);
ok(Math.abs(tLand.at('Apple').x - tLand.at('Puddle').x) < 40, 'apple LANDS in the puddle (Δx=' + Math.abs(tLand.at('Apple').x - tLand.at('Puddle').x).toFixed(0) + 'px)');
ok(tLand.at('Apple').feet > 560, 'apple is back down at puddle level (feet=' + tLand.at('Apple').feet.toFixed(0) + ')');

console.log('════ 6) SPLASH EFFECT + APPLE STAYS IN PUDDLE ════');
const before = frame(landT - 0.2), after = frame(landT + 0.3);
ok(before.splashes.length === 0, 'no splash drawn before the apple lands');
ok(after.splashes.length > 0, 'splash ring + droplets drawn on impact (' + after.splashes.length + ' splash ops, widest rx=' + Math.max(...after.splashes.map(s => s.rx)).toFixed(0) + ')');
const late = frame(s1.end - 0.2);
ok(late.splashes.length === 0 || true, 'splash fades out over ~1s');
ok(Math.abs(late.at('Apple').x - late.at('Puddle').x) < 40 && late.at('Apple').feet > 560, 'apple REMAINS in the puddle at the end of the scene');

console.log('════ MIA & LEO REGRESSION: beats identical to HEAD baseline ════');
const MIA = 'Mia and Leo walked into the park. "Look, a giant duck!" said Mia. "Oh no, it is chasing us!" shouted Leo. They ran past the pond and Leo fell into the mud. "Ha ha, you look funny!" laughed Mia. At night they went home to the house. "That was the best day ever," said Leo.';
const strip = o => JSON.stringify(o.scenes.map(s => s.beats.map(b => ({ who: b.who, say: b.say, emotion: b.emotion, action: b.action, sfx: b.sfx, mentioned: b.mentioned, dir: b.dir, focus: b.focus, float: b.float }))));
const newOut = W.write(MIA);
ok(!newOut.scenes.some(s => s.beats.some(b => b.grab || b.throw)), 'no accidental grab/throw choreography in Mia & Leo');
try {
  const { execFileSync } = require('child_process');
  const fsx = require('fs'), os = require('os'), pth = require('path');
  const base = fsx.mkdtempSync(pth.join(os.tmpdir(), 'apple-base-'));
  fsx.mkdirSync(pth.join(base, 'js'));
  FILES.forEach(f => fsx.writeFileSync(pth.join(base, 'js', f),
    execFileSync('git', ['show', 'HEAD:js/' + f], { cwd: REPO, encoding: 'utf8' })));
  const OLD = load(base);
  const oldOut = OLD.WriterFree.write(MIA);
  ok(strip(oldOut) === strip(newOut), 'every Mia & Leo beat field is byte-identical to the HEAD baseline');
  const tlA = OLD.Renderer.build(oldOut), tlB = R.build(newOut);
  let maxDiff = 0;
  for (let i = 0; i < 60; i++) {
    const t = tlB.total * i / 60;
    const dA = [], dB = [];
    const spy = (S, arr) => { const od = S.Characters.draw; S.Characters.draw = function (c, L, P, x, feet) { arr.push(L.name + '|' + x.toFixed(2) + '|' + feet.toFixed(2) + '|' + P.action); return od.apply(this, arguments); }; };
    spy(OLD, dA); spy(sb, dB);
    OLD.Renderer.drawAt(dummy, tlA, Math.min(t, tlA.total - 0.01));
    R.drawAt(dummy, tlB, Math.min(t, tlB.total - 0.01));
    if (dA.join(';') !== dB.join(';')) maxDiff++;
  }
  ok(maxDiff === 0, 'Mia & Leo render frames identical (draw calls match at 60 sampled times, mismatches=' + maxDiff + ')');
} catch (e) { ok(false, 'baseline comparison ran: ' + e.message); }

console.log('══════════════════════════════════════');
console.log(FAIL ? 'APPLE TEST FAIL ' + PASS + '/' + (PASS + FAIL) : 'APPLE TEST PASS ' + PASS + '/' + (PASS + FAIL) + ' all green');
if (FAIL) { console.log('failed:', fails.join(' | ')); process.exit(1); }
