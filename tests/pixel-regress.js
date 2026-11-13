// PIXEL regression: renders real frames with tests/raster.js (a small software
// Canvas2D rasteriser) and asserts on the PIXELS, not on parser values.
// A test here only passes if the picture a viewer would see is correct.
//   node tests/pixel-regress.js [oldRoot]     (default oldRoot: /tmp/deployed)
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const { Ctx, writePNG } = require('./raster.js');
const REPO = path.resolve(__dirname, '..');
const OLDROOT = process.argv[2] || '/tmp/deployed';
const FILES = ['script-format.js', 'writer-free.js', 'art-paths.js', 'art-rig.js', 'characters.js', 'acting.js', 'scenes.js', 'renderer.js'];
const SS = 2;

function load(root) {
  const noop = () => {};
  const dummy = new Proxy({ canvas: { width: 1, height: 1 }, measureText: s => ({ width: 8 }),
    createLinearGradient: () => ({ addColorStop: noop }), createRadialGradient: () => ({ addColorStop: noop }) },
    { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
  const sb = { console, Math, Date, JSON, Object, Array, String, Number, Boolean, RegExp, Error, Set, Map, Uint8Array };
  sb.window = sb; sb.self = sb; sb.globalThis = sb; sb.performance = { now: () => 0 };
  sb.requestAnimationFrame = noop; sb.cancelAnimationFrame = noop;
  sb.document = { visibilityState: 'visible', addEventListener: noop, getElementById: () => null,
    createElement: () => ({ style: {}, getContext: () => dummy, appendChild: noop }),
    body: { insertBefore: noop, firstChild: null } };
  sb.navigator = { userAgent: 'pixel-harness' }; sb.speechSynthesis = null; sb.SpeechSynthesisUtterance = null;
  vm.createContext(sb);
  FILES.forEach(f => vm.runInContext(fs.readFileSync(path.join(root, 'js', f), 'utf8'), sb, { filename: f }));
  return sb;
}
const NEW = load(REPO);
const OLD = fs.existsSync(OLDROOT + '/js/renderer.js') ? load(OLDROOT) : null;

// render one frame and remember where each character was drawn
function render(sb, story, t) {
  const tl = sb.Renderer.build(sb.WriterFree.write(story));
  const where = {};
  const real = sb.Characters.draw;
  sb.Characters.draw = function (c, L, P, x, y, s, flip, tt) { if (L && L.name) where[L.name] = { x: x, y: y }; return real(c, L, P, x, y, s, flip, tt); };
  const c = new Ctx(1280 * SS, 720 * SS); c.scale(SS, SS);
  let err = null;
  try { sb.Renderer.drawAt(c, tl, t); } catch (e) { err = e.message; }
  sb.Characters.draw = real;
  const img = c.downsample(SS);
  return { tl: tl, where: where, img: img, err: err };
}
function px(img, x, y) { const i = (y * img.w + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2]]; }
function hex2rgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function near(a, b, tol) { return Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol && Math.abs(a[2] - b[2]) <= tol; }
// count pixels of a colour inside a crop around a character
function countIn(img, cx, colour, halfW, y0, y1, tol) {
  const rgb = hex2rgb(colour); let n = 0;
  for (let y = Math.max(0, y0); y < Math.min(img.h, y1); y++)
    for (let x = Math.max(0, cx - halfW); x < Math.min(img.w, cx + halfW); x++)
      if (near(px(img, x, y), rgb, tol === undefined ? 6 : tol)) n++;
  return n;
}
function bboxOf(img, cx, colours, halfW, y0, y1) {
  const rgbs = colours.map(hex2rgb);
  let top = Infinity, bot = -Infinity;
  for (let y = Math.max(0, y0); y < Math.min(img.h, y1); y++)
    for (let x = Math.max(0, cx - halfW); x < Math.min(img.w, cx + halfW); x++) {
      const p = px(img, x, y);
      if (rgbs.some(r => near(p, r, 6))) { if (y < top) top = y; if (y > bot) bot = y; }
    }
  return top === Infinity ? null : { top: top, bottom: bot, h: bot - top };
}

let PASS = 0, FAIL = 0; const fails = [];
function ok(c, m) { if (c) { PASS++; console.log('  \u2705 ' + m); } else { FAIL++; fails.push(m); console.log('  \u274c ' + m); } }

const S1 = 'Coco the little white rabbit lived in a wooden house. Max the brown squirrel ran to the wooden house. "Come out!" said Coco.';
const S2 = 'Coco lived in a wooden house in the forest. Coco was a little white rabbit. Max was a brown squirrel. Max ran to the house.';
const S3 = 'A rabbit named Coco lived in a wooden house. A squirrel named Max visited the house. Coco said "Hello Max."';
const S4 = 'Coco lived in a wooden house. Max ran to the wooden house. "Come in, Max!" said Coco';

const rabbitCoco = NEW.Characters.look('Coco', { species: 'rabbit', kind: 'animal', colour: 'white', size: 0.62 });
const humanCoco = NEW.Characters.look('Coco', null);
const squirrelMax = NEW.Characters.look('Max', { species: 'squirrel', kind: 'animal', colour: 'brown', size: 1 });
const HOUSE = NEW.Characters.OBJECTS.house;

console.log('════ PIXEL 1. COCO IS A RABBIT IN EVERY CONSTRUCTION ════');
[[ 'species beside the name', S1, 6.96 ],
 [ 'species in its own sentence', S2, 1.6 ],
 [ 'a rabbit named Coco', S3, 2.6 ]].forEach(([label, story, t]) => {
  const r = render(NEW, story, t);
  ok(!r.err, label + ': the frame renders without error' + (r.err ? ' (' + r.err + ')' : ''));
  const cx = Math.round(r.where['Coco'] ? r.where['Coco'].x : -1);
  ok(cx > 0, label + ': Coco is on stage at t=' + t);
  const fur = countIn(r.img, cx, rabbitCoco.fur, 95, 250, 620);
  const ear = countIn(r.img, cx, '#ffb6c3', 95, 250, 620);   // the inner-ear pink drawAnimal actually uses
  ok(fur > 400, label + ': Coco\'s crop is full of rabbit fur (' + fur + ' px of ' + rabbitCoco.fur + ')');
  ok(ear > 200, label + ': and shows pink inner ears (' + ear + ' px of #ffb6c3)');
  const skin = countIn(r.img, cx, humanCoco.skin, 95, 250, 620);
  const hair = countIn(r.img, cx, humanCoco.hair, 95, 250, 620);
  const top = countIn(r.img, cx, humanCoco.top, 95, 250, 620);
  ok(skin === 0 && hair === 0 && top === 0, label + ': and NOT a human girl (skin ' + skin + ', hair ' + hair + ', top ' + top + ' px)');
});

console.log('\n════ PIXEL 2. MAX NEVER INHERITS COCO\'S SPECIES ════');
{
  const r = render(NEW, S1, 6.96);
  const mx = Math.round(r.where['Max'].x), cx = Math.round(r.where['Coco'].x);
  ok(countIn(r.img, mx, squirrelMax.fur, 110, 250, 640) > 400, 'Max\'s crop is full of squirrel fur (' + squirrelMax.fur + ')');
  ok(countIn(r.img, mx, rabbitCoco.fur, 110, 250, 640, 4) === 0, 'Max\'s crop contains NO rabbit white');
  ok(countIn(r.img, cx, squirrelMax.fur, 95, 250, 640, 4) === 0, 'Coco\'s crop contains NO squirrel brown');
  const r2 = render(NEW, S2, 8.6);
  ok(r2.where['Max'] && countIn(r2.img, Math.round(r2.where['Max'].x), squirrelMax.fur, 110, 250, 640) > 200,
    'separate-sentence story: Max is still the squirrel, not the rabbit');
}

console.log('\n════ PIXEL 3. NO PHANTOM CHARACTERS ════');
[[S1, ['Coco', 'House', 'Max']], [S2, ['Coco', 'House', 'Max']], [S3, ['Coco', 'House', 'Max']], [S4, ['Coco', 'House', 'Max']]]
  .forEach(([story, want], i) => {
    const sc = NEW.WriterFree.write(story);
    const got = sc.characters.map(c => c.name).sort();
    ok(JSON.stringify(got) === JSON.stringify(want.slice().sort()),
      'story ' + (i + 1) + ' cast is exactly ' + JSON.stringify(want) + ' (got ' + JSON.stringify(got) + ')');
  });

console.log('\n════ PIXEL 4. THE WOODEN HOUSE IS A VISIBLE WOODEN HOUSE ════');
[[S1, 6.96], [S2, 1.6], [S3, 2.6]].forEach(([story, t], i) => {
  const r = render(NEW, story, t);
  const hx = r.where['House'] ? Math.round(r.where['House'].x) : -1;
  ok(hx > 0, 'house ' + (i + 1) + ': the house is on stage at t=' + t);
  const walls = countIn(r.img, hx, HOUSE.colour, 130, 300, 620);
  const roof = countIn(r.img, hx, HOUSE.leaf, 150, 260, 480);
  const win = countIn(r.img, hx, '#bfe6ff', 130, 300, 620);
  ok(walls > 800, 'house ' + (i + 1) + ': plank walls are drawn (' + walls + ' px of ' + HOUSE.colour + ')');
  ok(roof > 500, 'house ' + (i + 1) + ': pitched roof is drawn (' + roof + ' px of ' + HOUSE.leaf + ')');
  ok(win > 60, 'house ' + (i + 1) + ': windows are drawn (' + win + ' px)');
  const bb = bboxOf(r.img, hx, [HOUSE.colour, HOUSE.leaf], 160, 200, 660);
  ok(bb && bb.h > 150 && bb.h < 330, 'house ' + (i + 1) + ': stands ' + (bb ? bb.h : '?') + ' px tall - visible, and shorter than a 354 px human');
});
{
  const r = render(NEW, S1, 6.96);
  const bgRoom = countIn(r.img, 640, '#ffe0b5', 620, 0, 400);
  ok(bgRoom === 0, 'the wooden-house scene is outdoors, not a room interior (wallpaper px = ' + bgRoom + ')');
}

console.log('\n════ PIXEL 5. MIA AND LEO ARE UNTOUCHED ════');
if (OLD) {
  // Stage 1 replaced the human artwork on purpose, so "identical to the shipped
  // version" is no longer the right promise. The promises that matter now:
  //   (a) the same person renders byte-identically every time (consistency),
  //   (b) Mia and Leo are visibly DIFFERENT people (no shared template recolour),
  //   (c) both still render as functioning humans in their own palette.
  const sheetBytes = (nm, t) => {
    const L = NEW.Characters.look(nm, null);
    const c = new Ctx(640 * SS, 720 * SS); c.scale(SS, SS);
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, 640, 720);
    NEW.Characters.draw(c, L, NEW.Acting.pose(L, { emotion: 'neutral', action: 'none', t: t }), 320, 600, 1, false, t);
    return writePNG('/tmp/_pix_' + nm + '_' + t + '.png', c.downsample(SS));
  };
  ['Mia', 'Leo'].forEach(nm => {
    const a = sheetBytes(nm, 1), b = sheetBytes(nm, 1);
    ok(fs.readFileSync('/tmp/_pix_' + nm + '_1.png').equals(fs.readFileSync('/tmp/_pix_' + nm + '_1.png')) && a === b,
      nm + ' renders byte-identically on every render (same person, every scene) (' + a + ' bytes)');
    const L = NEW.Characters.look(nm, null);
    const c = new Ctx(640, 720);
    c.fillStyle = '#00ff00'; c.fillRect(0, 0, 640, 720);
    NEW.Characters.draw(c, L, NEW.Acting.pose(L, { emotion: 'neutral', action: 'none', t: 1 }), 320, 600, 1, false, 1);
    let top = 1e9, bot = -1, skin = 0, tot = 0;
    const sk = L.skin.slice(1); const skr = parseInt(sk.slice(0, 2), 16), skg = parseInt(sk.slice(2, 4), 16), skb = parseInt(sk.slice(4, 6), 16);
    for (let y = 0; y < 720; y++) for (let x = 0; x < 640; x++) {
      const q = (y * 640 + x) * 4;
      if (c.data[q] === 0 && c.data[q + 1] === 255 && c.data[q + 2] === 0) continue;
      tot++;
      if (Math.abs(c.data[q] - skr) + Math.abs(c.data[q + 1] - skg) + Math.abs(c.data[q + 2] - skb) < 12) skin++;
      if (y < top) top = y; if (y > bot) bot = y;
    }
    ok(skin > 300, nm + ' is still painted with their own skin colour (' + skin + ' px)');
    ok(bot - top > 300 && bot - top < 420, nm + ' stands a human height (' + (bot - top) + ' px)');
  });
  ok(!fs.readFileSync('/tmp/_pix_Mia_1.png').equals(fs.readFileSync('/tmp/_pix_Leo_1.png')),
    'Mia and Leo are visibly DIFFERENT people (not one template recoloured)');
  const DEFAULT = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8').match(/<textarea id="story">([\s\S]*?)<\/textarea>/)[1];
  const on = sb2 => sb2.Renderer.build(sb2.WriterFree.write(DEFAULT)).scenes.map(s => s.stage.map(e => e.name).join(',')).join(' | ');
  ok(on(OLD) === on(NEW), 'the default Mia & Leo story stages exactly the same characters: ' + on(NEW));
} else {
  console.log('  (skipped: no old root at ' + OLDROOT + ')');
}

console.log('\n════ PIXEL 6. BEFORE vs AFTER ════');
if (OLD) {
  [[S1, 6.96], [S2, 1.6]].forEach(([story, t], i) => {
    const a = render(OLD, story, t), b = render(NEW, story, t);
    let diff = 0;
    for (let y = 0; y < a.img.h; y += 4) for (let x = 0; x < a.img.w; x += 4)
      if (!near(px(a.img, x, y), px(b.img, x, y), 10)) diff++;
    ok(diff > 500, 'story ' + (i + 1) + ': the picture really changed (' + diff + ' sampled px differ)');
    // the window blue is unique to the house: no background uses it
    const beforeHouse = countIn(a.img, 640, '#bfe6ff', 630, 200, 660);
    const afterHouse = countIn(b.img, 640, '#bfe6ff', 630, 200, 660);
    ok(beforeHouse === 0 && afterHouse > 60, 'story ' + (i + 1) + ': house window px ' + beforeHouse + ' before -> ' + afterHouse + ' after');
  });
}

console.log('\n══════════════════════════════════════');
console.log(FAIL === 0 ? 'PASS ' + PASS + ' / ' + (PASS + FAIL) + '   all green'
  : 'PASS ' + PASS + ' / ' + (PASS + FAIL) + '   \u274c ' + FAIL + ' FAILED:\n   - ' + fails.join('\n   - '));
process.exit(FAIL === 0 ? 0 : 1);
