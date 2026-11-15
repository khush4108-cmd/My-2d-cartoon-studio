// ACTION VALIDATION — the Studio says out loud what it can and cannot animate.
//
// This module is ADDITIVE and REPORT-ONLY. It reads a parsed script and
// returns a report; it never edits the script, never touches Renderer.build(),
// scene timing, character positions, or a single rendered pixel. If it is not
// loaded, or if it throws, the Studio behaves exactly as it did before.
//
// The registry below is not a wish list — every entry is evidence-backed:
//   * pose actions : js/acting.js, the `switch (o.action)` cases in Acting.pose()
//   * 'none'       : js/acting.js, the idle pose Acting.pose() always returns
//   * 'laugh'      : js/renderer.js:488 translates it to `action='none'` plus
//                    the laugh flag, which js/acting.js animates (o.laugh block)
//   * aliases      : js/writer-free.js ACTIONS table + its grab/throw/carry
//                    verb tests — story words the parser already translates
//   * unsupported  : doing-words with NO pose, NO interaction handling and NO
//                    renderer path (several are listed by the parser itself in
//                    EXTRA_DO, js/writer-free.js:220: hug|kiss|push|pull|open|
//                    close|drink|cook|plant|clean|paint|read|write|search)
// selfTest() re-proves the pose half at runtime: it asks the REAL Acting module
// for each registered action and compares it with the idle pose, so a registry
// entry the engine cannot actually perform is reported as drift, never believed.
window.ActionValidate = (function () {
  'use strict';
  const VERSION = 1;

  // ---------------- 1. what the engine genuinely performs ------------------
  // name -> where the motion actually lives (file + mechanism).
  const POSE_EVIDENCE = {
    walk:      'js/acting.js case "walk" (step cycle + opposite arm swing)',
    run:       'js/acting.js case "run" (faster cycle, forward tilt, bigger bounce)',
    jump:      'js/acting.js case "jump" (110px lift, tuck, squash)',
    wave:      'js/acting.js case "wave" (right arm raised, oscillating)',
    dance:     'js/acting.js case "dance" (bounce + arms up + laughing mouth)',
    fly:       'js/acting.js case "fly" (airborne hover + flapping arms)',
    swim:      'js/acting.js case "swim" (low float + alternating arm strokes)',
    sleep:     'js/acting.js case "sleep" (lying tilt, closed eyes)',
    sit:       'js/acting.js case "sit" (hip drop + tucked legs)',
    eat:       'js/acting.js case "eat" (chewing mouth + hand to mouth)',
    cry:       'js/acting.js case "cry" (sad brow, frown, tears-down gaze)',
    pickup:    'js/acting.js case "pickup" (crouch + reach down); driven by renderer.js IX grab phase',
    carry:     'js/acting.js case "carry" (both arms forward); renderer.js IX carry phase glues the prop to the hand',
    carrywalk: 'js/acting.js case "carrywalk" (walk cycle with arms full)',
    throw:     'js/acting.js case "throw" (arm whip); renderer.js IX flies the prop on a real parabola',
    climb:     'js/acting.js case "climb" + renderer.js tree-climb block (walks to a real trunk from Scenes.trees and lifts 150px)',
    catch:     'js/acting.js case "catch" (arms up, hop, eyes on the object)',
    give:      'js/acting.js case "give" (arm extended to the receiver)',
    reach:     'js/acting.js case "reach" (one arm fully up, tiptoe, chin up); used for fruit in the canopy'
  };
  const SUPPORTED = {};
  Object.keys(POSE_EVIDENCE).forEach(function (name) {
    SUPPORTED[name] = { kind: 'pose', evidence: POSE_EVIDENCE[name] };
  });
  SUPPORTED.none = { kind: 'idle', evidence: 'js/acting.js default pose (breathing, blinking, standing) — the honest "nothing to animate" state' };
  SUPPORTED.laugh = { kind: 'alias', evidence: 'js/renderer.js:488 → action="none" + laugh flag → js/acting.js o.laugh block (laughing mouth, happy eyes, bounce)' };
  const SUPPORTED_ACTIONS = Object.keys(SUPPORTED);

  // Emotions the face can actually show (js/acting.js emotion branches;
  // identical to ScriptFormat.EMOTIONS, checked by tests/validate-test.js).
  const EMOTIONS = ['neutral', 'happy', 'excited', 'sad', 'angry', 'scared', 'confused', 'surprised'];

  // Story words -> the supported action the parser already turns them into.
  // Mirrors js/writer-free.js ACTIONS and its interaction verb tests, so the
  // validator recognises real coverage instead of reporting it as missing.
  const ALIASES = [
    [/\b(jump|jumps|jumped|jumping|bounce|bounces|bounced|bouncing|hop|hops|hopped|hopping|leap|leaps|leapt|leaping)\b/i, 'jump'],
    [/\b(run|runs|ran|running|race|races|raced|racing|dash|dashes|dashed|dashing|sprint|sprints|sprinted|sprinting|chase|chases|chased|chasing|rush|rushes|rushed|rushing|hurri|hurried|hurrying|fled)\b/i, 'run'],
    [/\b(walk|walks|walked|walking|stroll|strolls|strolled|strolling|march|marches|marched|marching|wander|wanders|wandered|wandering|crawl|crawls|crawled|crawling|creep|creeps|crept|creeping|tiptoe|tiptoes|tiptoed|went|goes|going|headed|left|approach|approaches|approached|approaching)\b/i, 'walk'],
    [/\b(wave|waves|waved|waving)\b/i, 'wave'],
    [/\b(dance|dances|danced|dancing|twirl|twirls|twirled|twirling|spin|spins|spinning|spun)\b/i, 'dance'],
    [/\b(fly|flies|flew|flied|flying|soar|soars|soared|soaring|flutter|flutters|fluttered|fluttering)\b/i, 'fly'],
    [/\b(swim|swims|swam|swimming|dive|dives|dived|diving|dove)\b/i, 'swim'],
    [/\b(sleep|sleeps|sleeping|slept|nap|naps|napped|napping|doze|dozes|dozed|dozing|yawn|yawns|yawned|yawning|rest|rests|rested|resting)\b/i, 'sleep'],
    [/\b(sit|sits|sitting|sat|crouch|crouches|crouched|crouching|hide|hides|hiding|hid|huddle|huddles|huddled)\b/i, 'sit'],
    [/\b(eat|eats|eating|ate|munch|munches|munched|munching|nibble|nibbles|nibbled|nibbling|bite|bites|biting|bit|taste|tastes|tasted)\b/i, 'eat'],
    [/\b(cry|cries|cried|crying|weep|weeps|weeping|wept|sob|sobs|sobbed|sobbing|tears)\b/i, 'cry'],
    [/\b(climb|climbs|climbed|climbing|clamber|clambers|clambered|clambering|scramble|scrambles|scrambled|scrambling)\b/i, 'climb'],
    [/\b(reach|reaches|reached|reaching|stretch|stretches|stretched|stretching)\b/i, 'reach'],
    [/\b(give|gives|gave|hand|hands|handed|handing|share|shares|shared|sharing|pass|passes|passed|passing|offer|offers|offered|offering)\b/i, 'give'],
    [/\b(hold|holds|holding|held|keep|keeps|keeping|kept|cling|clings|clinging|clung|carry|carries|carried|carrying)\b/i, 'carry'],
    [/\b(laugh|laughs|laughed|laughing|giggle|giggles|giggled|giggling|chuckle|chuckles|chuckled|chuckling|ha ha|haha)\b/i, 'laugh'],
    // object-interaction verbs: these animate the PROP as well as the body
    [/\b(pick|picks|picked|picking|lift|lifts|lifted|lifting|grab|grabs|grabbed|grabbing|scoop|scoops|scooped|scooping|took|take|takes|found|discover|discovers|discovered|discovering)\b/i, 'pickup'],
    [/\b(throw|throws|threw|throwing|toss|tosses|tossed|tossing|fling|flings|flung|hurl|hurls|hurled|drop|drops|dropped|dropping)\b/i, 'throw'],
    [/\b(catch|catches|caught|catching)\b/i, 'catch']
  ];

  // ------------- 2. what the engine genuinely does NOT perform -------------
  // Each family was checked against js/acting.js (no case), js/renderer.js (no
  // interaction or movement path) and js/writer-free.js (no choreography).
  // `test` finds the ask; `notIf` suppresses idioms and body-part phrases that
  // are NOT a stage action, so honest reporting never becomes noise.
  const UNSUPPORTED = [
    { id: 'fall', label: 'falling down',
      test: /\b(fall|falls|fell|fallen|falling|trip|trips|tripped|tripping|tumbl(?:e|es|ed|ing)|toppl(?:e|es|ed|ing)|slip|slips|slipped|slipping)\b/i,
      notIf: /\b(night|day|evening|darkness|shadow|silence|rain|snow|curtain|leaves|leaf|temperature)\s+(fell|falls|fall)\b/i,
      why: 'js/acting.js has no "fall" case and js/renderer.js only flies PROPS on a throw parabola — a body never leaves its feet except in "jump".',
      instead: 'the character keeps whatever pose the line already has (usually standing or walking), while any crash/splash sound effect still plays' },
    { id: 'getup', label: 'getting back up',
      test: /\b((?:get|gets|got|getting|stand|stands|standing|stood|rise|rises|rising|rose|sprang|spring|springs)\s+(?:up|to\s+(?:his|her|their|its)\s+feet)|back\s+on\s+(?:his|her|their|its)\s+feet|(?:picked|helped|lifted|pulled)\s+(?:himself|herself|itself|him|her|them)\s+up)\b/i,
      why: 'there is no "get up" pose in js/acting.js — the engine has no floor-to-standing transition at all.',
      instead: 'the character stays in the standing/idle pose for that line' },
    { id: 'search', label: 'searching / looking around',
      test: /\b(look(?:s|ed|ing)?\s+(?:around|about|everywhere|for\b|high and low|up and down)|search(?:es|ed|ing)?|hunt(?:s|ed|ing)?\s+for|seek(?:s|ing)?|check(?:s|ed|ing)?\s+(?:behind|under|inside|everywhere|around)|peer(?:s|ed|ing)?\s+(?:into|behind|around|through)|explor(?:e|es|ed|ing))\b/i,
      why: 'js/acting.js has no searching pose; the rig can only turn the head towards a NAMED target (renderer.js gaze block), and "look around" has no target.',
      instead: 'the character stands still and faces the camera; head turns only happen when the line names somebody to look at' },
    { id: 'hug', label: 'hugging / kissing',
      test: /\b(hug(?:s|ged|ging)?|embrac(?:e|es|ed|ing)|cuddl(?:e|es|ed|ing)|kiss(?:es|ed|ing)?|snuggl(?:e|es|ed|ing))\b/i,
      why: 'no embrace pose exists and js/blocking.js deliberately keeps characters apart — two bodies never meet.',
      instead: 'both characters keep their standing pose, facing each other' },
    { id: 'push', label: 'pushing / shoving',
      test: /\b(push(?:es|ed|ing)?|shov(?:e|es|ed|ing))\b/i,
      why: 'the interaction engine (renderer.js IX) handles grab / carry / throw / catch only — there is no contact force between two characters.',
      instead: 'the character stands; nothing moves' },
    { id: 'pull', label: 'pulling / dragging',
      test: /\b(pull(?:s|ed|ing)?|drag(?:s|ged|ging)?|tow(?:s|ed|ing)?|tug(?:s|ged|ging)?)\b/i,
      why: 'renderer.js IX can lift a prop into a hand, but nothing can be dragged along the ground or pulled towards a character.',
      instead: 'the character stands; the object stays where it is' },
    { id: 'open', label: 'opening / closing something',
      test: /\b(open(?:s|ed|ing)?|clos(?:e|es|ed|ing)|shut(?:s)?|unlock(?:s|ed|ing)?)\s+(?:the|a|an|his|her|their|its|this|that|it)\b/i,
      notIf: /\b(open(?:s|ed|ing)?|clos(?:e|es|ed|ing))\s+(?:his|her|their|its|the)\s+(eyes?|mouth|arms?|hands?|wings?)\b/i,
      why: 'doors, boxes and books are drawn closed by js/scenes.js and js/characters.js; no object has an open/closed state.',
      instead: 'a knock sound effect may play (js/audio.js "door"), but nothing visibly opens' },
    { id: 'wear', label: 'wearing / changing clothes',
      test: /\b(wear(?:s|ing)?|wore|worn|put(?:s|ting)?\s+on|dress(?:es|ed|ing)?\s+(?:up|in)|chang(?:e|es|ed|ing)\s+(?:his|her|their|into))\b/i,
      why: 'looks are fixed per character (js/characters.js look()); there is no wardrobe layer to add or remove.',
      instead: 'the character keeps the outfit it was created with' },
    { id: 'kick', label: 'kicking',
      test: /\b(kick(?:s|ed|ing)?)\b/i,
      why: 'js/acting.js has no leg-strike pose; legs only run the walk/run/jump cycles.',
      instead: 'the character stands; the object does not move' },
    { id: 'roll', label: 'rolling',
      test: /\b(roll(?:s|ed|ing)?)\b/i,
      why: 'no rolling pose for bodies and no rolling path for props — a released prop flies a parabola and then stays where it landed.',
      instead: 'the character or object stays put' },
    { id: 'dig', label: 'digging / burying',
      test: /\b(dig(?:s|ging)?|dug|bur(?:y|ies|ied|ying))\b/i,
      why: 'the ground is a flat painted strip (js/scenes.js); nothing can be dug into or buried in it.',
      instead: 'the character stands on the ground unchanged' },
    { id: 'drink', label: 'drinking',
      test: /\b(drink(?:s|ing)?|drank|sip(?:s|ped|ping)?|gulp(?:s|ed|ing)?)\b/i,
      why: 'js/acting.js has an "eat" pose (chewing) but no drinking pose and no cup/glass object.',
      instead: 'the character keeps its standing pose' },
    { id: 'chore', label: 'cooking / cleaning / painting / planting / reading / writing',
      test: /\b(cook(?:s|ed|ing)?|clean(?:s|ed|ing)|paint(?:s|ed|ing)|plant(?:s|ed|ing)|wash(?:es|ed|ing)|sweep(?:s|ing)|swept|read(?:s|ing)?|wrote|write|writes|writing)\b/i,
      why: 'the parser lists these as doing-words (js/writer-free.js:220 EXTRA_DO) but no pose or prop interaction exists for any of them.',
      instead: 'the character stands; any object mentioned is simply placed on stage' },
    { id: 'perform', label: 'singing / clapping / playing',
      test: /\b(play(?:s|ed|ing)?|sing(?:s|ing)?|sang|sung|clap(?:s|ped|ping)?|hum(?:s|med|ming)|whistl(?:e|es|ed|ing))\b/i,
      why: 'only "dance" and "wave" exist as performance poses (js/acting.js); there is no clap, sing or play-with-a-toy motion.',
      instead: 'the character stands (or dances, if the line also says dance)' }
  ];
  const UNSUPPORTED_IDS = UNSUPPORTED.map(function (u) { return u.id; });

  // ------------------- 3. runtime proof of the registry --------------------
  // Ask the REAL Acting module for every registered pose and compare it with
  // the idle pose. Anything identical is drift: the registry claims support the
  // engine does not have, and that must be reported, never hidden.
  const PROBE_LOOK = { name: 'ValidateProbe', kind: 'human', seed: 7 };
  const PROBE_TIMES = [0.37, 1.13, 2.71];
  function poseDiffers(a, b) {
    const keys = {};
    Object.keys(a).forEach(function (k) { keys[k] = 1; });
    Object.keys(b).forEach(function (k) { keys[k] = 1; });
    return Object.keys(keys).some(function (k) {
      const x = a[k], y = b[k];
      if (typeof x === 'number' && typeof y === 'number') return Math.abs(x - y) > 1e-9;
      return x !== y;
    });
  }
  let _self = null;
  function selfTest() {
    if (_self) return _self;
    const out = { ran: false, ok: true, broken: [], checked: 0, note: '' };
    if (!window.Acting || typeof window.Acting.pose !== 'function') {
      out.note = 'js/acting.js is not loaded, so the pose registry could not be re-proved.';
      _self = out; return out;
    }
    out.ran = true;
    SUPPORTED_ACTIONS.forEach(function (name) {
      if (name === 'none') return;                    // 'none' IS the baseline
      const probe = name === 'laugh' ? { laugh: true } : { action: name };
      let distinct = false;
      for (let i = 0; i < PROBE_TIMES.length; i++) {
        const t = PROBE_TIMES[i];
        const idle = window.Acting.pose(PROBE_LOOK, { t: t, emotion: 'neutral', action: 'none' });
        const p = window.Acting.pose(PROBE_LOOK, Object.assign({ t: t, emotion: 'neutral' }, probe));
        if (poseDiffers(p, idle)) { distinct = true; break; }
      }
      out.checked++;
      if (!distinct) { out.ok = false; out.broken.push(name); }
    });
    if (!out.ok) out.note = 'Registered as supported but the engine performs it no differently from standing: ' + out.broken.join(', ');
    _self = out;
    return out;
  }

  // --------------------------- 4. small helpers ----------------------------
  function isSupported(name) { return Object.prototype.hasOwnProperty.call(SUPPORTED, String(name === undefined || name === null ? '' : name)); }
  // Which supported action does a story word already animate as? null = none.
  function aliasFor(word) {
    const w = String(word === undefined || word === null ? '' : word);
    if (!w) return null;
    if (isSupported(w)) return w;                     // the action name itself
    for (let i = 0; i < ALIASES.length; i++) if (ALIASES[i][0].test(w)) return ALIASES[i][1];
    return null;
  }
  // Which unsupported family does a piece of narration ask for? [] = none.
  function scanText(text) {
    const src = String(text || '');
    const hits = [];
    if (!src) return hits;
    UNSUPPORTED.forEach(function (u) {
      if (u.notIf && u.notIf.test(src)) return;       // idiom / body part: not an action
      const m = u.test.exec(src);
      if (m) hits.push({ id: u.id, label: u.label, match: m[0], why: u.why, instead: u.instead });
    });
    return hits;
  }
  const quote = s => '\u201c' + String(s) + '\u201d';

  // ----------------------------- 5. the check ------------------------------
  // Reads a parsed script. Returns a report. Mutates NOTHING.
  function check(script) {
    const report = { version: VERSION, ok: true, warnings: [], supported: {}, unsupportedAsked: [],
                     scenes: 0, beats: 0, actionsChecked: 0, engine: selfTest() };
    const push = function (w) { report.warnings.push(w); report.ok = false; };

    // a) registry drift: the engine itself must still perform what we claim
    report.engine.broken.forEach(function (name) {
      push({ kind: 'engine-drift', id: name, where: 'engine', message: 'The registry says ' + quote(name) + ' is supported, but Acting.pose() renders it exactly like standing. It will be reported as unsupported until the engine really performs it.', evidence: SUPPORTED[name] ? SUPPORTED[name].evidence : '' });
    });

    if (!script || !Array.isArray(script.scenes) || !script.scenes.length) {
      push({ kind: 'no-script', id: 'script', where: 'script', message: 'There is no script to check yet.' });
      return report;
    }

    const seen = {};                                  // one warning per scene+id
    script.scenes.forEach(function (sc, si) {
      report.scenes++;
      const beats = Array.isArray(sc.beats) ? sc.beats : [];
      beats.forEach(function (b, bi) {
        report.beats++;
        const where = 'Scene ' + (si + 1) + ', line ' + (bi + 1);

        // b) every action name the parser put in the script must be a real one
        const names = [];
        if (b.action !== undefined && b.action !== null && b.action !== '') names.push({ action: b.action, who: null });
        Object.keys(b.dir || {}).forEach(function (n) {
          const d = b.dir[n];
          if (d && d.action !== undefined && d.action !== null && d.action !== '') names.push({ action: d.action, who: n });
        });
        names.forEach(function (e) {
          report.actionsChecked++;
          if (isSupported(e.action)) {
            report.supported[e.action] = (report.supported[e.action] || 0) + 1;
          } else {
            const key = 'unknown:' + e.action;
            if (seen[key]) return;
            seen[key] = 1;
            push({ kind: 'unknown-action', id: e.action, where: where + (e.who ? ' · ' + e.who : ''),
              message: 'The action ' + quote(e.action) + ' is not in this Studio’s action registry, so nothing will animate for it — the character falls back to the standing pose. (js/acting.js has no such case.)',
              action: e.action, who: e.who, text: b.say });
          }
        });

        // c) emotions must be ones the face can actually show
        if (b.emotion && EMOTIONS.indexOf(b.emotion) < 0) {
          const ekey = 'emotion:' + b.emotion;
          if (!seen[ekey]) {
            seen[ekey] = 1;
            push({ kind: 'unknown-emotion', id: b.emotion, where: where + (b.who ? ' · ' + b.who : ''),
              message: 'The emotion ' + quote(b.emotion) + ' has no face in js/acting.js, so it will be played neutral.', emotion: b.emotion, text: b.say });
          }
        }

        // d) unsupported stage business — NARRATION only. A character SAYING
        //    "I fell down" is dialogue about the past; the engine is not being
        //    asked to animate it, so it must not be reported.
        if (b.who === 'Narrator') {
          const hits = scanText(b.say);
          hits.forEach(function (h) {
            const key = si + ':' + h.id;
            if (seen[key]) return;                    // one warning per scene+family
            seen[key] = 1;
            const cast = Object.keys(b.dir || {});
            const doing = cast.length
              ? cast.map(function (n) { return n + ' → ' + ((b.dir[n] && b.dir[n].action) || 'none'); }).join(', ')
              : 'nobody is directed in this line';
            report.unsupportedAsked.push(h.id);
            push({ kind: 'unsupported-action', id: h.id, label: h.label, where: where, match: h.match,
              message: '“' + h.match + '” (' + h.label + ') is not animated yet — ' + h.why + ' What you will see instead: ' + h.instead + '. This line still plays: ' + doing + '.',
              why: h.why, instead: h.instead, cast: cast, text: b.say, scene: si + 1, line: bi + 1 });
          });
        }
      });
    });

    report.supportedActions = Object.keys(report.supported).sort();
    return report;
  }

  // ------------------------- 6. the panel for #result ----------------------
  // Builds HTML from EXISTING classes (.scene / .beat / .who / .tag) so the
  // Studio's look is unchanged. Returns '' when there is nothing to say.
  function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function panelHTML(report) {
    if (!report) return '';
    const w = report.warnings || [];
    let html = '<div class="scene" id="actioncheck"><h2>Action check</h2>';
    if (!w.length) {
      html += '<div class="beat">Every action in this story is genuinely animated by this Studio' +
        (report.supportedActions && report.supportedActions.length
          ? ': ' + esc(report.supportedActions.filter(function (a) { return a !== 'none'; }).join(', ') || 'standing poses only') + '.'
          : '.') + '</div></div>';
      return html;
    }
    html += '<div class="beat"><b>' + w.length + ' thing' + (w.length === 1 ? '' : 's') +
      ' in this story cannot be animated yet.</b> Your cartoon still plays in full — these are reported honestly instead of being quietly replaced by a standing pose.</div>';
    w.forEach(function (x) {
      html += '<div class="beat"><span class="who">' + esc(x.where) + '</span>' +
        '<span class="tag">' + esc(x.id) + '</span><br>' + esc(x.message) +
        (x.text ? '<br><span class="ai">' + esc(String(x.text).slice(0, 120)) + '</span>' : '') + '</div>';
    });
    html += '</div>';
    return html;
  }

  return {
    VERSION: VERSION,
    SUPPORTED: SUPPORTED,
    SUPPORTED_ACTIONS: SUPPORTED_ACTIONS,
    EMOTIONS: EMOTIONS,
    UNSUPPORTED: UNSUPPORTED,
    UNSUPPORTED_IDS: UNSUPPORTED_IDS,
    isSupported: isSupported,
    aliasFor: aliasFor,
    scanText: scanText,
    selfTest: selfTest,
    check: check,
    panelHTML: panelHTML
  };
})();
