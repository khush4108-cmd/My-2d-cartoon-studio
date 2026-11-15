// BLOCKING TEST — the Scene Blocking Director's guarantees.
// Covers: 2/3/4/5 casts, entering, exiting, approaching, talking, watching,
// natural spacing bounds, stage clamps, and voice-timeline safety (durations
// must be byte-identical with the module present or absent).
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const REPO = '/home/user/My-2d-cartoon-studio';
const noop = () => {};
const dummy = new Proxy({ canvas: { width: 1, height: 1 }, measureText: () => ({ width: 8 }),
  createLinearGradient: () => ({ addColorStop: noop }), createRadialGradient: () => ({ addColorStop: noop }) },
  { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
function boot(withBlocking) {
  const sb = { console, Math, Date, JSON, Object, Array, String, Number, Boolean, RegExp, Error, Set, Map, Uint8Array, Proxy };
  sb.window = sb; sb.self = sb; sb.globalThis = sb; sb.performance = { now: () => 0 };
  sb.requestAnimationFrame = noop; sb.cancelAnimationFrame = noop;
  sb.document = { visibilityState: 'visible', addEventListener: noop, getElementById: () => null,
    createElement: () => ({ style: {}, getContext: () => dummy, appendChild: noop }), body: { insertBefore: noop, firstChild: null } };
  sb.navigator = { userAgent: 'blocking-test' }; sb.speechSynthesis = null; sb.SpeechSynthesisUtterance = null;
  vm.createContext(sb);
  const files = ['script-format.js', 'writer-free.js', 'art-paths.js', 'art-rig.js', 'characters.js', 'acting.js', 'scenes.js'];
  if (withBlocking) files.push('blocking.js');
  files.push('renderer.js');
  files.forEach(f => vm.runInContext(fs.readFileSync(path.join(REPO, 'js', f), 'utf8'), sb, { filename: f }));
  return sb;
}
let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) { pass++; } else { fail++; console.log('  ❌ ' + label); } };

const W = 1280;
const halfW = (tl, nm) => {
  const L = tl.looks[nm];
  if (!L) return 125;
  if (L.kind === 'object') return Math.max(45, Math.round(125 * (L.size || 1)));
  if (L.kind === 'animal') { const big = !!(L.sp && L.sp.legs === 4 && (L.size || 1) >= 1.2); return Math.max(45, Math.round(115 * (L.size || 1) * (big ? 1.8 : 1))); }
  return 125;
};
const sb = boot(true);
const build = story => sb.Renderer.build(sb.WriterFree.write(story));

function lastMentions(sc) {
  const last = {};
  sc.beats.forEach((b, i) => {
    (b.who && b.who !== 'Narrator' ? [b.who] : []).concat(b.mentioned || []).forEach(n => { last[n] = i; });
  });
  return last;
}
function checkSpacing(tl, label, minCast) {
  let worst = Infinity, worstPair = '', castSeen = 0;
  tl.scenes.forEach(sc => {
    castSeen = Math.max(castSeen, sc.stage.length);
    const last = lastMentions(sc);
    sc.beats.forEach((b, bi) => {
      if (!b.restX) return;
      const ns = Object.keys(b.restX).filter(n => !(tl.looks[n] && tl.looks[n].kind === 'object') && (last[n] === undefined || bi <= last[n]));
      ns.sort((p, q) => b.restX[p] - b.restX[q]);
      for (let i = 1; i < ns.length; i++) {
        const gap = b.restX[ns[i]] - b.restX[ns[i - 1]];
        const need = sb.Blocking.need(tl, ns[i - 1], ns[i]);
        if (gap - need < worst) { worst = gap - need; worstPair = label + ' ' + ns[i - 1] + '-' + ns[i]; }
      }
      ns.forEach(n => {
        const m = Math.min(90, Math.max(0, halfW(tl, n) - 125));
        ok(b.restX[n] >= 70 + m - 2 && b.restX[n] <= W - 70 - m + 2, label + ': ' + n + ' on stage (x=' + Math.round(b.restX[n]) + ')');
      });
    });
  });
  ok(worst >= -3, label + ': every pair keeps natural spacing (worst ' + Math.round(worst) + 'px vs need, ' + worstPair + ')');
  ok(castSeen >= minCast, label + ': cast of ' + castSeen + ' exercised');
}

console.log('=== BLOCKING TEST ===');
// 1 · two characters talking
checkSpacing(build([
  'scene: park',
  'Mia the girl met Leo the boy under the big tree.',
  'Mia: Hello Leo! I found a yellow flower!',
  'Leo: Wow! The flower is beautiful!',
].join('\n')), 'duo-talk', 2);

// 2 · three characters: two talk, one watches
checkSpacing(build([
  'scene: park',
  'Mia the girl, Leo the boy and Coco the white rabbit stood in the park.',
  'Mia: Leo, tell us your wonderful plan!',
  'Leo: We will build a big sand castle!',
  'Coco listened carefully and smiled.',
].join('\n')), 'trio-watch', 3);

// 3 · four characters: approaches + mid-scene exit
const four = build([
  'scene: park',
  'Aarav the boy and Coco the white rabbit walked into the sunny park.',
  'Leo the lion and Mia the girl joined them under the big tree.',
  'Aarav: Hello friends! I have wonderful news!',
  'Coco: Wow! Tell us quickly!',
  'Mia walked toward Aarav to hear it closely.',
  'Leo: Please tell us all about it!',
  'Leo walked toward Aarav too.',
  'Mia: Let us celebrate together!',
  'Leo waved and walked home.',
  'Aarav: Goodbye Leo! See you tomorrow!',
  'Coco: He left in a hurry!',
].join('\n'));
checkSpacing(four, 'four-approach-exit', 4);
// exit: Leo leaves mid-scene and crosses in front (z-order last)
const st = four.scenes[0].stage;
ok(st[st.length - 1].name === 'Leo', 'exiting character draws in front while walking off');
ok(st.find(e => e.name === 'Leo').exit < four.scenes[0].end - 0.01, 'mid-scene exit registered');
// approach: movers stop at a natural distance from their target
four.scenes[0].beats.forEach(b => {
  (b.movers || []).forEach(m => {
    const tgt = b.dir && b.dir[m] && b.dir[m].move;
    if (tgt && b.restX[tgt] !== undefined) {
      const d = Math.abs(b.restX[m] - b.restX[tgt]);
      ok(d >= sb.Blocking.need(four, m, tgt) - 3 && d <= sb.Blocking.need(four, m, tgt) + 140, 'approach stops at natural distance (' + m + '->' + tgt + ' d=' + Math.round(d) + ')');
    }
  });
});

// 4 · five characters party
checkSpacing(build([
  'scene: park',
  'Aarav the boy, Mia the girl, Coco the white rabbit, Max the brown squirrel and Chickie the tiny chick met in the park.',
  'Aarav: Welcome friends! What a lovely morning!',
  'Mia: Let us play together all day!',
  'Coco: I will bring the red apples!',
  'Max: I will bring the sweet nuts!',
  'Chickie: I am happy too!'
].join('\n')), 'five-party', 5);

// 5 · entering: a newcomer arrives mid-scene with room to stand
const ent = build([
  'scene: park',
  'Mia the girl sat in the sunny garden.',
  'Mia: What a quiet afternoon.',
  'Leo the boy walked into the garden.',
  'Leo: Hello Mia! May I stay here?',
  'Mia: Of course! Stand beside me.',
].join('\n'));
checkSpacing(ent, 'entering', 2);

// 6 · voice-timeline safety: durations identical with and without the module
const BUNTY = fs.readFileSync(path.join(REPO, 'stories', 'bunty.txt'), 'utf8');
const dWith = boot(true).Renderer.build(boot(true).WriterFree.write(BUNTY));
const sbNo = boot(false);
const dWithout = sbNo.Renderer.build(sbNo.WriterFree.write(BUNTY));
const flat = tl => tl.scenes.flatMap(s => s.beats.map(b => b.start.toFixed(3) + ':' + b.dur.toFixed(3))).join('|');
ok(flat(dWith) === flat(dWithout), 'voice timing untouched by blocking (Bunty timeline identical)');
ok(dWith.total === dWithout.total, 'total runtime identical');

// 7 · existing stories keep working (apple carry, trio, bunty casts)
['stories/coco-and-max.txt', 'stories/aarav-coco-leo.txt', 'stories/bunty.txt'].forEach(f => {
  const tl = build(fs.readFileSync(path.join(REPO, f), 'utf8'));
  ok(tl.scenes.length >= 2 && tl.total > 20, f + ' still builds (' + tl.total.toFixed(0) + 's)');
});
const apple = build(fs.readFileSync(path.join(REPO, 'stories', 'coco-and-max.txt'), 'utf8'));
const heldBeat = apple.scenes[0].beats.find(b => b.grab);
ok(!!heldBeat, 'apple pick-up beat present');

console.log('\n──────────────────────────────');
console.log(fail ? 'BLOCKING FAIL ' + pass + '/' + (pass + fail) : 'BLOCKING TEST PASS ' + pass + '/' + (pass + fail) + ' all green');
process.exit(fail ? 1 : 0);
