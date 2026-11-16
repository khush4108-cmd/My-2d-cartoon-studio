// VALIDATE TEST — the Action Validation System's guarantees.
// Covers: registry truth (every "supported" action really animates), aliases,
// shipped stories free of false warnings, unsupported actions honestly
// reported, dialogue never mistaken for stage direction, purity (no mutation),
// Renderer.build()/pixel identity with validation on and off, ScriptFormat
// left intact, engine-drift detection, and the index.html/main.js wiring.
//   node tests/validate-test.js
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const { Ctx } = require('./raster.js');
const REPO = path.resolve(__dirname, '..');
const noop = () => {};
const dummy = new Proxy({ canvas: { width: 1, height: 1 }, measureText: () => ({ width: 8 }),
  createLinearGradient: () => ({ addColorStop: noop }), createRadialGradient: () => ({ addColorStop: noop }) },
  { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });

// `files` are loaded in index.html order; validate.js goes last, before main.js
function boot(files) {
  const sb = { console, Math, Date, JSON, Object, Array, String, Number, Boolean, RegExp, Error, Set, Map, Uint8Array, Proxy };
  sb.window = sb; sb.self = sb; sb.globalThis = sb; sb.performance = { now: () => 0 };
  sb.requestAnimationFrame = noop; sb.cancelAnimationFrame = noop;
  sb.document = { visibilityState: 'visible', addEventListener: noop, getElementById: () => null,
    createElement: () => ({ style: {}, getContext: () => dummy, appendChild: noop }), body: { insertBefore: noop, firstChild: null } };
  sb.navigator = { userAgent: 'validate-test' }; sb.speechSynthesis = null; sb.SpeechSynthesisUtterance = null;
  vm.createContext(sb);
  files.forEach(f => vm.runInContext(fs.readFileSync(path.join(REPO, 'js', f), 'utf8'), sb, { filename: f }));
  return sb;
}
const ENGINE = ['script-format.js', 'writer-free.js', 'art-paths.js', 'art-rig.js', 'characters.js', 'acting.js', 'scenes.js', 'blocking.js', 'renderer.js'];

let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) { pass++; } else { fail++; console.log('  ❌ ' + label); } };
const ids = r => (r.warnings || []).map(w => w.id).sort();
const kinds = r => (r.warnings || []).map(w => w.kind).sort();
const deepFreeze = o => { Object.getOwnPropertyNames(o).forEach(k => { const v = o[k]; if (v && typeof v === 'object') deepFreeze(v); }); return Object.freeze(o); };

const SB = boot(ENGINE.concat(['validate.js']));       // validation ON
const NO = boot(ENGINE);                               // validation never loaded
const V = SB.ActionValidate;
const story = f => fs.readFileSync(path.join(REPO, 'stories', f + '.txt'), 'utf8');
const parse = (text, box) => (box || SB).WriterFree.write(text);
const check = (text, box) => V.check(parse(text, box));
const INDEX_HTML = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');
const MAIN_JS = fs.readFileSync(path.join(REPO, 'js', 'main.js'), 'utf8');
const DEFAULT_STORY = /<textarea id="story">([\s\S]*?)<\/textarea>/.exec(INDEX_HTML)[1];

// one narration sentence, on a stage that already has somebody on it
const line = s => 'scene: park\nCoco the rabbit hopped into the park.\n' + s + '\n';

console.log('=== VALIDATE TEST ===\n');

console.log('════ 1. THE REGISTRY IS TRUE: it only claims what the engine performs ════');
const st = V.selfTest();
ok(st.ran === true, 'selfTest() really ran against js/acting.js');
ok(st.ok === true, 'selfTest(): no registered action is a lie (broken=' + st.broken.join(',') + ')');
ok(st.checked === V.SUPPORTED_ACTIONS.length - 1, 'selfTest() probed every registered action except "none" (' + st.checked + ')');
const POSES = ['walk', 'run', 'jump', 'wave', 'dance', 'fly', 'swim', 'sleep', 'sit', 'eat', 'cry',
  'pickup', 'carry', 'carrywalk', 'throw', 'climb', 'catch', 'give', 'reach'];
const LOOK = { name: 'Probe', kind: 'human', seed: 7 };
const differs = (a, b) => Object.keys(a).some(k => (typeof a[k] === 'number' && typeof b[k] === 'number') ? Math.abs(a[k] - b[k]) > 1e-9 : a[k] !== b[k]);
POSES.forEach(a => {
  const idle = SB.Acting.pose(LOOK, { t: 0.37, emotion: 'neutral', action: 'none' });
  const p = SB.Acting.pose(LOOK, { t: 0.37, emotion: 'neutral', action: a });
  ok(differs(p, idle), 'js/acting.js really animates "' + a + '" (pose differs from standing)');
});
ok(differs(SB.Acting.pose(LOOK, { t: 0.37, emotion: 'neutral', action: 'none', laugh: true }),
  SB.Acting.pose(LOOK, { t: 0.37, emotion: 'neutral', action: 'none' })), 'the "laugh" alias really animates (renderer.js:488 → o.laugh)');
ok(V.SUPPORTED_ACTIONS.length === POSES.length + 2, 'registry size = 19 poses + "none" + "laugh" = ' + V.SUPPORTED_ACTIONS.length);
ok(POSES.every(a => V.isSupported(a)) && V.isSupported('none') && V.isSupported('laugh'), 'every real action name is registered as supported');
['fall', 'getup', 'search', 'hug', 'kick', 'somersault', 'teleport', '', undefined, null].forEach(n =>
  ok(V.isSupported(n) === false, '"' + n + '" is NOT claimed as supported'));
ok(V.SUPPORTED.climb.evidence.indexOf('renderer.js') >= 0, 'registry entries carry engine evidence, not opinions');
ok(V.EMOTIONS.join(',') === SB.ScriptFormat.EMOTIONS.join(','), 'the emotion registry equals ScriptFormat.EMOTIONS');

console.log('\n════ 2. ALIASES: story words the parser already animates ════');
[['hopped', 'jump'], ['leapt', 'jump'], ['bounced', 'jump'], ['strolled', 'walk'], ['wandered', 'walk'],
['tiptoed', 'walk'], ['dashed', 'run'], ['fled', 'run'], ['chased', 'run'], ['twirled', 'dance'],
['soared', 'fly'], ['fluttered', 'fly'], ['swam', 'swim'], ['napped', 'sleep'], ['yawned', 'sleep'],
['crouched', 'sit'], ['hid', 'sit'], ['munched', 'eat'], ['nibbled', 'eat'], ['wept', 'cry'],
['sobbed', 'cry'], ['clambered', 'climb'], ['scrambled', 'climb'], ['stretched up', 'reach'],
['giggled', 'laugh'], ['chuckled', 'laugh'], ['held', 'carry'], ['carried', 'carry'], ['gave', 'give'],
['shared', 'give'], ['passed', 'give'], ['picked up', 'pickup'], ['lifted', 'pickup'], ['grabbed', 'pickup'],
['threw', 'throw'], ['tossed', 'throw'], ['dropped', 'throw'], ['caught', 'catch'], ['waved', 'wave']
].forEach(([w, a]) => ok(V.aliasFor(w) === a, 'alias "' + w + '" → supported action "' + a + '"'));
ok(V.aliasFor('walk') === 'walk' && V.aliasFor('laugh') === 'laugh', 'a bare action name is its own alias');
ok(V.aliasFor('somersault') === null && V.aliasFor('hug') === null, 'words the engine cannot do have no alias');
ok(check('scene: park\nCoco the rabbit hopped to the meadow.\nMax the squirrel dashed after her and giggled.\nThey twirled and clambered up the tree.\n').warnings.length === 0,
  'a story told entirely in aliases produces ZERO warnings');

console.log('\n════ 3. SHIPPED STORIES: no false unsupported-action warnings ════');
[['coco-and-max', story('coco-and-max')], ['aarav-coco-leo', story('aarav-coco-leo')]].forEach(([n, txt]) => {
  const r = check(txt);
  ok(r.warnings.length === 0, n + ': zero warnings (got ' + JSON.stringify(ids(r)) + ')');
  ok(r.ok === true, n + ': report.ok is true');
  ok(r.actionsChecked > 0 && r.beats > 0, n + ': the check really inspected beats (' + r.beats + ' beats, ' + r.actionsChecked + ' actions)');
});
const bunty = check(story('bunty'));
ok(bunty.warnings.length === 2, 'bunty: exactly 2 warnings, both true gaps (got ' + JSON.stringify(ids(bunty)) + ')');
ok(ids(bunty).join(',') === 'hug,search', 'bunty: the two real gaps are "search" (looked around / checked behind) and "hug"');
ok(kinds(bunty).every(k => k === 'unsupported-action'), 'bunty: no unknown-action and no engine-drift warnings');
const bSearch = bunty.warnings.filter(w => w.id === 'search')[0];
const bHug = bunty.warnings.filter(w => w.id === 'hug')[0];
ok(bSearch.scene === 2 && /looked around/i.test(bSearch.text), 'bunty "search" points at scene 2: "Bunty gently looked around the garden…"');
ok(bHug.scene === 3 && /hugged/i.test(bHug.text), 'bunty "hug" points at scene 3: "Mimi lovingly hugged her little baby…"');
ok(bSearch.cast.indexOf('Bunty') >= 0 && parse(story('bunty')).scenes[1].beats[0].dir.Bunty.action === 'none',
  'bunty "search" is a TRUE gap: the parser directed Bunty as "none" (nothing animates)');
ok(bunty.warnings.every(w => /not animated yet/.test(w.message)), 'every warning says plainly that it is not animated yet');
const mia = check(DEFAULT_STORY);
ok(mia.warnings.length === 1 && mia.warnings[0].id === 'fall', 'the default Mia & Leo story: exactly one true gap — "Leo fell into the mud" (fall)');
ok(mia.warnings[0].scene === 1 && mia.warnings[0].line === 4, 'that warning names scene 1, line 4');
ok(/run/.test(mia.warnings[0].message), 'the fall warning also says what WILL play (Leo keeps running)');
[['coco-and-max', story('coco-and-max')], ['aarav-coco-leo', story('aarav-coco-leo')], ['bunty', story('bunty')], ['default', DEFAULT_STORY]].forEach(([n, txt]) => {
  const r = check(txt);
  ok(r.supportedActions.every(a => V.isSupported(a)), n + ': every action found in the script is in the registry (' + r.supportedActions.join(',') + ')');
  ok(r.warnings.filter(w => w.kind === 'unknown-emotion').length === 0, n + ': every emotion is one the face can show');
});

console.log('\n════ 4. UNSUPPORTED ACTIONS ARE REPORTED, NEVER FAKED ════');
const GAP = 'scene: park\n' + [
  'Coco the rabbit ran into the park.',                      // supported → no warning
  'Coco fell down hard on the grass.',                       // fall
  'Then Coco got up and walked home.',                       // getup (+ supported walk)
  'Coco looked around the garden and checked behind the bushes.',   // search
  'Coco hugged Max the squirrel.',                           // hug
  'Max kicked the ball.',                                    // kick
  'Coco pushed the box.',                                    // push
  'Max pulled the rope.',                                    // pull
  'Coco opened the door.',                                   // open
  'Max wore a red hat.',                                     // wear
  'The apple rolled away.',                                  // roll
  'Coco dug a hole in the ground.',                          // dig
  'Max drank water from the pond.',                          // drink
  'Coco cooked dinner and cleaned the kitchen.',             // chore
  'They sang and clapped and played together.'               // perform
].join('\n') + '\n';
const g = check(GAP);
V.UNSUPPORTED_IDS.forEach(id => ok(ids(g).indexOf(id) >= 0, 'the unsupported action "' + id + '" is reported (warning present)'));
ok(g.warnings.every(w => V.UNSUPPORTED_IDS.indexOf(w.id) >= 0), 'no warning is raised for a supported action (walk/run only animate, never warn)');
ok(g.warnings.every(w => w.kind === 'unsupported-action'), 'all of them are honest "unsupported-action" reports');
ok(g.warnings.every(w => w.scene >= 1 && w.line >= 1), 'every warning names its scene and line');
ok(g.warnings.filter(w => w.id === 'fall')[0].line === 2, 'the fall warning names line 2 (the falling line, not the running one)');
ok(g.warnings.filter(w => w.id === 'getup')[0].line === 3, 'the get-up warning names line 3');
ok(g.warnings.filter(w => w.id === 'fall')[0].why.indexOf('js/acting.js') >= 0, 'each warning carries the engine evidence for the gap');
ok(V.UNSUPPORTED_IDS.length === 14, 'the unsupported registry has 14 families (' + V.UNSUPPORTED_IDS.join(',') + ')');

console.log('\n════ 5. NO FALSE POSITIVES: idioms, near-misses and supported work ════');
[['Night fell over the park.', 'the idiom "Night fell" is weather, not a body falling'],
['The leaves fell from the trees.', '"leaves fell" is not a character falling'],
['At night Coco stood under the moon and the stars.', '"stood" (no "up") is the supported idle pose'],
['Max picked up the giant red apple and held it in his paws.', '"picked up" is the supported pickup, never a get-up'],
['Aarav picked it up and took it home.', '"picked it up" / "took" are supported prop handling'],
['Mimi the big blue bird flew down joyfully and landed beside her baby.', '"landed" after a supported fly-in'],
['Max threw the apple into the mud puddle! Splash!', 'throw + splash are supported'],
['Max dropped the apple into the puddle.', '"dropped" is the supported throw machinery'],
['Coco smiled warmly and waved goodbye.', 'smile/wave are covered by emotion + wave pose'],
['They sat inside the warm house to rest.', 'sit/rest are supported'],
['The clean white rabbit hopped to the sunny meadow.', '"clean" as an adjective is not a chore'],
['Coco opened her eyes and looked at the moon.', '"opened her eyes" is a face, not a door'],
['They ran across the open field.', '"open field" is scenery, not opening something'],
['Leo padded along the grass near the playground.', '"playground" is a place, not "play"'],
['Coco climbed the big tree and reached for the apple.', 'climb + reach are supported'],
['All three friends laugh happily.', 'laugh is supported through the renderer alias'],
['A red apple lay under the tree by the busy street.', 'an object at rest needs no action'],
['They walked inside the warm house. Knock knock!', 'walk is supported; a knock is a sound effect'],
['Coco hid behind the bush and huddled down.', 'hide/huddle are animated as the sit/crouch pose'],
['Leo crawled through the tall grass.', 'crawl is animated as a walk cycle']
].forEach(([s, why]) => {
  ok(V.scanText(s).length === 0, 'no unsupported-action hit: ' + why);
  ok(check(line(s)).warnings.length === 0, 'no warning in a full story: ' + why);
});
ok(V.scanText('Leo fell into the mud.')[0].id === 'fall', 'sanity: a real fall IS still detected (the guards are not blanket muting)');
ok(V.scanText('Coco got up slowly.')[0].id === 'getup', 'sanity: a real get-up IS still detected');
ok(V.scanText('Coco picked herself up and stood up.')[0].id === 'getup', 'sanity: the reflexive "picked herself up" IS detected');

console.log('\n════ 6. DIALOGUE IS NOT STAGE DIRECTION ════');
ok(check('scene: park\nChickie the baby chick cried under the bush.\nChickie: We were near the big tree. Then the wind blew, and I fell down.\n').warnings.length === 0,
  'a character SAYING "I fell down" raises no warning (nothing was asked of the engine)');
ok(check('scene: park\nChickie the baby chick fell down under the bush.\n').warnings.map(w => w.id).indexOf('fall') >= 0,
  'the same words in NARRATION do raise the fall warning');
ok(check(story('bunty')).warnings.map(w => w.id).indexOf('fall') < 0,
  'the shipped Bunty film does not warn about "I fell down" — it is dialogue in scene 2');

console.log('\n════ 7. PURITY: validation never mutates the script ════');
const before = parse(story('bunty'));
const snap = JSON.stringify(before);
const keysBefore = Object.keys(before).join(',');
const rep1 = V.check(before);
ok(JSON.stringify(before) === snap, 'check() left the script byte-identical (JSON equal before/after)');
ok(Object.keys(before).join(',') === keysBefore, 'check() added no field to the script');
ok(before.warnings === undefined, 'check() did NOT write warnings onto the script (report-only)');
const frozen = deepFreeze(parse(GAP));
let threw = null;
try { V.check(frozen); } catch (e) { threw = e.message; }
ok(threw === null, 'check() survives a deep-frozen script (it performs no writes at all): ' + threw);
ok(JSON.stringify(V.check(parse(GAP))) === JSON.stringify(V.check(parse(GAP))), 'check() is deterministic across runs');
ok(rep1.scenes === 4 && rep1.beats === 23, 'the report counts what it inspected (bunty: 4 scenes / 23 beats)');
ok(rep1.version === V.VERSION, 'the report carries the validator version');

console.log('\n════ 8. RENDERER OUTPUT IS IDENTICAL WITH AND WITHOUT VALIDATION ════');
const buildJSON = (box, txt) => JSON.stringify(box.Renderer.build(parse(txt, box)));
ok(buildJSON(SB, story('bunty')) === buildJSON(NO, story('bunty')),
  'Renderer.build() timeline is byte-identical with validate.js loaded or absent (bunty)');
ok(buildJSON(SB, GAP) === buildJSON(NO, GAP), '…and for a story full of unsupported actions');
const scr = parse(story('bunty'));
V.check(scr);
const tlAfter = SB.Renderer.build(scr);
const tlBefore = SB.Renderer.build(parse(story('bunty')));
ok(JSON.stringify(tlAfter) === JSON.stringify(tlBefore), 'running check() before build() changes nothing in the timeline');
ok(tlAfter.total === tlBefore.total, 'scene timing is untouched (' + tlAfter.total.toFixed(1) + 's)');
function render(box, tl, t) {
  const c = new Ctx(1280 * 2, 720 * 2); c.scale(2, 2);
  box.Renderer.drawAt(c, tl, t);
  return c.downsample(2);
}
let mismatch = 0, sampled = 0;
for (let i = 0; i < 8; i++) {
  const t = (tlBefore.total / 8) * i + 0.4;
  const a = render(SB, tlAfter, t), b = render(NO, SB.Renderer.build(parse(story('bunty'), NO)), t);
  sampled++;
  if (a.w !== b.w || a.h !== b.h) { mismatch++; continue; }
  for (let p = 0; p < a.data.length; p++) if (a.data[p] !== b.data[p]) { mismatch++; break; }
}
ok(mismatch === 0, 'rendered pixels are identical at ' + sampled + ' sampled times (mismatching frames = ' + mismatch + ')');

console.log('\n════ 9. ScriptFormat.validate() IS LEFT INTACT ════');
['coco-and-max', 'aarav-coco-leo', 'bunty'].forEach(n => {
  ok(SB.ScriptFormat.validate(parse(story(n))).length === 0, 'ScriptFormat still finds no problem in ' + n);
});
// a hand-made bad script: ScriptFormat's own contract, independent of the parser
const BAD = { title: 'bad', characters: [], scenes: [{ bg: 'castle', beats: [{ who: 'Narrator', say: 'x', emotion: 'neutral', action: 'none' }] }] };
const NO_SCENES = { title: 'empty', characters: [], scenes: [] };
ok(SB.ScriptFormat.validate(BAD).join('|') === NO.ScriptFormat.validate(BAD).join('|'),
  'ScriptFormat still reports an unknown background identically with validate.js loaded');
ok(SB.ScriptFormat.validate(BAD).length === 1 && /unknown background: castle/.test(SB.ScriptFormat.validate(BAD)[0]),
  '…and it really is an error (' + SB.ScriptFormat.validate(BAD).join(' ') + ')');
ok(SB.ScriptFormat.validate(NO_SCENES).join('|') === NO.ScriptFormat.validate(NO_SCENES).join('|') && /no scenes/.test(SB.ScriptFormat.validate(NO_SCENES)[0]),
  'the "no scenes" error is unchanged too');
ok(V.check(BAD).warnings.length === 0, 'the validator does not duplicate ScriptFormat: an unknown BACKGROUND is ScriptFormat’s job, not an action warning');
ok(V.check(BAD) && V.check(NO_SCENES).warnings.length === 1, 'a script with no scenes is reported safely by the validator (no crash)');
ok(SB.ScriptFormat.EMOTIONS.join(',') === NO.ScriptFormat.EMOTIONS.join(','), 'ScriptFormat.EMOTIONS untouched');
ok(SB.ScriptFormat.BACKGROUNDS.join(',') === NO.ScriptFormat.BACKGROUNDS.join(','), 'ScriptFormat.BACKGROUNDS untouched');
ok(Object.keys(SB.ScriptFormat).join(',') === Object.keys(NO.ScriptFormat).join(','), 'validate.js added nothing to ScriptFormat');
ok(SB.ScriptFormat.validate.toString() === NO.ScriptFormat.validate.toString(), 'ScriptFormat.validate() source is unchanged');

console.log('\n════ 10. ENGINE DRIFT IS REPORTED, NOT HIDDEN ════');
const DRIFT = boot(ENGINE);                     // patch the engine, THEN load validate.js
DRIFT.Acting.pose = (function (real) {
  return function (L, o) { return o.action === 'climb' ? real(L, Object.assign({}, o, { action: 'none' })) : real(L, o); };
})(DRIFT.Acting.pose);
vm.runInContext(fs.readFileSync(path.join(REPO, 'js', 'validate.js'), 'utf8'), DRIFT, { filename: 'validate.js' });
const dr = DRIFT.ActionValidate.selfTest();
ok(dr.ok === false && dr.broken.indexOf('climb') >= 0, 'selfTest() notices when the engine stops performing a registered action');
const drRep = DRIFT.ActionValidate.check(parse('scene: park\nTinku the boy climbed the big tree.\n', DRIFT));
ok(drRep.warnings.some(w => w.kind === 'engine-drift' && w.id === 'climb'), 'check() reports the drift as a warning instead of pretending "climb" works');
ok(V.check(parse(story('coco-and-max'))).warnings.filter(w => w.kind === 'engine-drift').length === 0, 'the healthy engine reports no drift');

console.log('\n════ 11. INTEGRATION WIRING (index.html + main.js) ════');
ok(/<script src="js\/validate\.js\?v=19"><\/script>/.test(INDEX_HTML), 'index.html loads js/validate.js');
const at = s => INDEX_HTML.indexOf(s);
ok(at('js/acting.js') < at('js/validate.js'), 'validate.js loads AFTER js/acting.js (it re-proves the poses against Acting)');
ok(at('js/renderer.js') < at('js/validate.js'), 'validate.js loads AFTER js/renderer.js');
ok(at('js/validate.js') < at('js/main.js'), 'validate.js loads BEFORE js/main.js (the conductor uses it)');
ok(MAIN_JS.indexOf('ScriptFormat.validate(script)') >= 0, 'main.js still calls the original ScriptFormat.validate(script)');
ok(MAIN_JS.indexOf('ActionValidate.check(script)') >= 0 && MAIN_JS.indexOf('ActionValidate.panelHTML') >= 0, 'main.js runs the action check and renders its panel');
ok(/if \(!box \|\| !window\.ActionValidate\) return;/.test(MAIN_JS), 'validate.js stays OPTIONAL: main.js skips it when it did not load');
const fnBody = /function showActionReport\(script\) \{[\s\S]*?\n  \}/.exec(MAIN_JS)[0];
ok(fnBody.indexOf('try {') >= 0 && fnBody.indexOf('catch') >= 0, 'the action check is wrapped in try/catch');
ok(fnBody.indexOf('fail(') < 0 && fnBody.indexOf('return false') < 0, 'a warning can never block playback (no fail() on that path)');
const NEED_BLOCK = /const NEED = \{[^;]*\};/.exec(MAIN_JS)[0];
ok(NEED_BLOCK.indexOf('ActionValidate') < 0, 'ActionValidate is not in the NEED list, so a missing file cannot stop the Studio');
ok(NEED_BLOCK.indexOf('Renderer') >= 0 && NEED_BLOCK.indexOf('WriterFree') >= 0, 'the NEED list itself is unchanged (still the 8 required modules)');
ok(MAIN_JS.indexOf('showScript(script);') < MAIN_JS.indexOf('showActionReport(script);'), 'the report is appended AFTER the script panel (#result keeps its existing content)');
const panel = V.panelHTML(g);
ok(/class="scene"/.test(panel) && /class="beat"/.test(panel) && /class="who"/.test(panel) && /class="tag"/.test(panel),
  'the panel reuses the existing CSS classes (.scene/.beat/.who/.tag)');
ok(!/class="(?!scene|beat|who|tag|ai)/.test(panel), 'the panel invents no new CSS class (no stylesheet change needed)');
ok(V.panelHTML(check(story('coco-and-max'))).indexOf('genuinely animated') >= 0, 'a fully supported story gets one positive line instead of silence');
ok(V.panelHTML(null) === '', 'panelHTML(null) is harmless');
const VALIDATE_JS = fs.readFileSync(path.join(REPO, 'js', 'validate.js'), 'utf8');
ok(VALIDATE_JS.indexOf('stickmen') < 0 && VALIDATE_JS.toLowerCase().indexOf('stickmen') < 0, 'validate.js does not touch the experimental stickman module');
ok(MAIN_JS.indexOf('stickmen') < 0 && INDEX_HTML.indexOf('stickmen') < 0, 'neither main.js nor index.html integrates js/stickmen.js');
const CODE_ONLY = VALIDATE_JS.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');   // comments stripped
ok(CODE_ONLY.indexOf('Renderer') < 0 && CODE_ONLY.indexOf('drawAt') < 0, 'validate.js never calls the renderer (it cannot change a pixel)');
ok(CODE_ONLY.indexOf('Blocking') < 0 && CODE_ONLY.indexOf('Characters') < 0, 'validate.js never calls blocking or character drawing either');
ok(/window\.Acting\.pose/.test(CODE_ONLY), 'validate.js DOES call Acting.pose — read-only, to re-prove its own registry');

console.log('\n══════════════════════════════════════');
if (fail) { console.log('VALIDATE TEST FAIL ' + pass + '/' + (pass + fail) + ' — ' + fail + ' failed'); process.exit(1); }
console.log('VALIDATE TEST PASS ' + pass + '/' + (pass + fail) + ' all green');
