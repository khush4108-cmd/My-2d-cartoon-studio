// ============================================================================
//  ArtRig - the ANIMATION RIG: renders ArtPaths artwork and turns the pose
//  object that acting.js already produces into joint angles, blinks, visemes
//  and gaze. Nothing here parses story text; renderer.js / acting.js /
//  writer-free.js / audio.js / scenes.js never change.
// ============================================================================
window.ArtRig = (function () {
  const AP = window.ArtPaths;
  const INK = '#2b1d3a';

  // local shade() so art-rig never depends on load order
  function rgb(hex) {
    const h = String(hex || '#888888').replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function hex(a) { return '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
  function shade(colour, amount) {
    const c = rgb(colour);
    return hex(c.map(v => (amount >= 0 ? v + (255 - v) * amount : v * (1 + amount))));
  }

  // ------------------------------ path tracer ------------------------------
  const ARGC = { M: 2, L: 2, C: 6, Q: 4, Z: 0, E: 4 };
  function trace(c, d) {
    let i = 0; c.beginPath();
    while (i < d.length) {
      const op = d[i], n = ARGC[op] || 0;
      if (op === 'M') c.moveTo(d[i + 1], d[i + 2]);
      else if (op === 'L') c.lineTo(d[i + 1], d[i + 2]);
      else if (op === 'C') c.bezierCurveTo(d[i + 1], d[i + 2], d[i + 3], d[i + 4], d[i + 5], d[i + 6]);
      else if (op === 'Q') c.quadraticCurveTo(d[i + 1], d[i + 2], d[i + 3], d[i + 4]);
      else if (op === 'E') c.ellipse(d[i + 1], d[i + 2], d[i + 3], d[i + 4], 0, 0, 7);
      else if (op === 'Z') c.closePath();
      i += 1 + n;
    }
  }
  function colOf(pal, f) { return f === '@ink' ? INK : (pal[f] !== undefined ? pal[f] : f); }
  function paint(c, s, pal) {
    trace(c, s.d);
    if (s.f && s.f !== '@ink') { c.fillStyle = colOf(pal, s.f); c.fill(); }
    if (s.f === '@ink' || !s.noink) {
      c.strokeStyle = s.f === '@ink' ? INK : colOf(pal, s.line || '@ink');
      c.lineWidth = s.lw || 6; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke();
    }
  }
  // ---------------------------- controller table ---------------------------
  const CTRL = {
    root:    { ox: J => J.dx, oy: J => J.dy, rot: J => J.tilt, sx: J => 1 + J.sq, sy: J => 1 - J.sq },
    chest:   { rot: J => J.chest },
    head:    { rot: J => J.head },
    headRoll:{ rot: J => J.headRoll },
    hipN6:   { rot: J => J.hipF * 0.6 }, hipF6: { rot: J => J.hipN * 0.6 },
    hipN:    { rot: J => J.hipN }, hipF: { rot: J => J.hipF },
    kneeN:   { rot: J => J.kneeN }, kneeF: { rot: J => J.kneeF },
    liftN:   { oy: J => J.liftN }, liftF: { oy: J => J.liftF },
    shoL:    { rot: J => J.shoL }, shoR: { rot: J => J.shoR },
    shoLn:   { rot: J => -J.shoR }, elbLn: { rot: J => -J.elbR },
    elbL:    { rot: J => J.elbL }, elbR: { rot: J => J.elbR },
    earL:    { rot: J => J.earL }, earR: { rot: J => J.earR },
    earLtip: { rot: J => J.earLtip }, earRtip: { rot: J => J.earRtip },
    earLag:  { rot: J => J.earLag },
    tailLag: { rot: J => J.tailLag },
    tail1:   { rot: J => J.tail1 }, tail2: { rot: J => J.tail2 }, tail3: { rot: J => J.tail3 },
    wag:     { rot: J => J.wag }, wagB: { rot: J => J.wag * 1.6 },
    wing:    { rot: J => J.wing }, wingL: { rot: J => -J.wingBug }, wingR: { rot: J => J.wingBug },
    tailSway:{ rot: J => J.tailSway }, fin: { rot: J => J.fin },
    jaw:     { rot: J => J.jaw * 0.45 }, jawB: { rot: J => J.jaw * 0.4 },
    eyeH:    { ox: J => J.lookX * 5, oy: J => J.lookY * 4, sy: J => 1 - J.blink * 0.85 },
    eyeQ:    { ox: J => J.lookX * 4, oy: J => J.lookY * 3, sy: J => 1 - J.blink * 0.85 },
    eyeB:    { ox: J => J.lookX * 3, oy: J => J.lookY * 3, sy: J => 1 - J.blink * 0.85 },
    eyeF:    { sy: J => 1 - J.blink * 0.85 },
    pony:    { rot: J => J.pony }, ponyR: { rot: J => -J.pony }
  };
  function rig(c, n, pal, J) {
    if (n.hide && J.on[n.hide]) return;
    c.save();
    if (n.px || n.py) c.translate(n.px, n.py);
    const ct = typeof n.ctrl === 'object' && n.ctrl ? n.ctrl : (n.ctrl ? CTRL[n.ctrl] : null);
    if (ct) {
      if (ct.ox) c.translate(ct.ox(J), ct.oy ? ct.oy(J) : 0); else if (ct.oy) c.translate(0, ct.oy(J));
      if (ct.rot) c.rotate(ct.rot(J));
      const sx = ct.sx ? ct.sx(J) : 1, sy = ct.sy ? ct.sy(J) : 1;
      if (sx !== 1 || sy !== 1) c.scale(sx, sy);
    }
    if (n.rot) c.rotate(typeof n.rot === 'function' ? n.rot(J) : n.rot);
    if (n.oy) c.translate(0, typeof n.oy === 'function' ? n.oy(J) : n.oy);
    if (n.ox2) c.translate(typeof n.ox2 === 'function' ? n.ox2(J) : n.ox2, 0);
    const sc = n.sc || 1;
    if (sc !== 1) c.scale(sc, sc);
    for (const k of (n.pre || [])) rig(c, k, pal, J);
    for (const s of (n.shapes || [])) if (!s.on || J.on[s.on]) paint(c, s, pal);
    for (const k of (n.kids || [])) rig(c, k, pal, J);
    c.restore();
  }
  const N = (ctrl, shapes, extra) => Object.assign({ ctrl: ctrl, shapes: shapes || [] }, extra || {});
  const S = (d, f, o) => Object.assign({ d: d, f: f }, o || {});

  // ------------------------- pose -> joints + selectors --------------------
  function joints(L, P, t) {
    t = t || 0;
    const J = {
      dx: P.dx || 0, dy: P.dy || 0, sq: P.sq || 0, tilt: P.tilt || 0,
      head: (P.tilt || 0) * 0.6 + (P.lookX || 0) * 0.10 + (P.lookY || 0) * 0.06,
      headRoll: (P.tilt || 0) * 0.5 + (P.lookX || 0) * 0.04,
      chest: (P.tilt || 0) * 0.25,
      blink: P.blink || 0, eyes: P.eyes || 'open', lookX: P.lookX || 0, lookY: P.lookY || 0,
      brow: P.brow || 'flat', mouth: P.mouth || 'smile', open: P.open || 0,
      shoL: P.armL === undefined ? 0.18 : P.armL, shoR: P.armR === undefined ? 0.18 : P.armR,
      t: t
    };
    const ph = P.step || 0, amp = P.stepAmp || 0, tuck = P.tuck || 0;
    J.hipN = Math.sin(ph) * 0.45 * amp;            J.hipF = Math.sin(ph + Math.PI) * 0.45 * amp;
    J.kneeN = (0.22 + 0.55 * Math.max(0, -Math.cos(ph))) * amp + tuck * 1.25;
    J.kneeF = (0.22 + 0.55 * Math.max(0, -Math.cos(ph + Math.PI))) * amp + tuck * 1.25;
    J.liftN = -Math.max(0, Math.cos(ph)) * amp * 16 - tuck * 34;
    J.liftF = -Math.max(0, Math.cos(ph + Math.PI)) * amp * 16 - tuck * 34;
    J.qhip = [0, Math.PI, Math.PI * 0.5, Math.PI * 1.5].map(o => Math.sin(ph + o) * 0.40 * amp);
    J.qknee = J.qhip.map(a => 0.2 + 0.4 * Math.max(0, -Math.sin(a)));
    J.qlift = [0, Math.PI, Math.PI * 0.5, Math.PI * 1.5].map(o => -Math.max(0, Math.cos(ph + o)) * amp * 14 - tuck * 30);
    J.elbL = 0.30 + Math.min(1.2, J.shoL) * 0.50;  J.elbR = 0.30 + Math.min(1.2, J.shoR) * 0.50;
    J.jaw = (J.mouth === 'laugh' || J.mouth === 'open' || J.mouth === 'o') ? (0.25 + 0.75 * J.open) : 0;
    // secondary motion: ears / tails lag the body's vertical acceleration
    J.lag = Math.max(-0.6, Math.min(0.6, (P.dy || 0) * 0.0045 + (P.sq || 0) * 1.1));
    J.idle = Math.sin(t * 2.0) * 0.035;
    J.pony = J.idle * 2;
    J.earL = -0.10 + J.lag * 0.9 + J.idle;  J.earR = 0.10 + J.lag * 0.9 - J.idle;
    J.earLtip = 0.30 - J.lag * 0.7;         J.earRtip = 0.26 - J.lag * 0.7;
    J.earLag = J.lag * 0.5 + J.idle;
    J.tailLag = J.lag * 0.5 + J.idle * 1.4;
    J.tail1 = 0.05 + J.lag * 0.6 + Math.sin(t * 3.1) * 0.05;
    J.tail2 = 0.12 + Math.sin(t * 3.1 + 0.9) * 0.07 - J.lag * 0.4;
    J.tail3 = 0.10 + Math.sin(t * 3.1 + 1.8) * 0.08 - J.lag * 0.3;
    J.wag = Math.sin(t * 3.0) * 0.10 * (amp ? 1 : 0.4) + J.lag * 0.4;
    J.wing = Math.sin(t * 7) * 0.5 + ((P.dy || 0) < -4 ? 0.3 : 0);
    J.wingBug = 0.55 + Math.sin(t * 6) * 0.30;
    J.wingBee = 0.3 + Math.abs(Math.sin(t * 26)) * 0.7;
    J.tailSway = Math.sin(t * 2.6) * 0.10 + J.lag * 0.3;
    J.fin = Math.sin(t * 5) * 0.25;
    // ---- selectors: which state-shapes are live this frame ----
    const eyesOpen = J.eyes !== 'happy' && J.blink <= 0.85;
    J.on = {
      eyesOpen: eyesOpen, eyesClosed: !eyesOpen,
      jawOpen: J.jaw > 0.25, jawClosed: J.jaw <= 0.25, teeth: J.jaw > 0.55,
      browUp: J.brow === 'up', browSad: J.brow === 'sad',
      browAngry: J.brow === 'angry', browFlat: J.brow === 'flat' || J.brow === 'confused',
      mSmile: J.mouth === 'smile', mFrown: J.mouth === 'frown',
      mLine: J.mouth !== 'smile' && J.mouth !== 'frown',
      acc1: (L.acc | 0) === 1, acc2: (L.acc | 0) === 2, acc3: (L.acc | 0) === 3,
      emb0: (L.emblem | 0) === 0, emb1: (L.emblem | 0) === 1, emb2: (L.emblem | 0) === 2,
      noTail: L.sp && L.sp.tail === 'none'
    };
    return J;
  }

  // ------------------------------- assemblers ------------------------------
  function eyeSet(A, ctrl, r) {
    return N(ctrl, [
      S(A.eyeWhite, '#ffffff', { lw: r > 30 ? 5 : 4, on: 'eyesOpen' }),
      S(A.eyeIris, 'eye', { noink: true, on: 'eyesOpen' }),
      S(A.eyePupil, '@ink', { noink: true, on: 'eyesOpen' }),
      S(A.eyeGlint, '#ffffff', { noink: true, on: 'eyesOpen' }),
      S(A.eyeHappy, '@ink', { lw: 5, on: 'eyesClosed' })
    ], { px: arguments[3], py: arguments[4] });
  }
  function browNode(A, px, py) {
    return N(null, [
      S(A.browUp, '@ink', { lw: 5, on: 'browUp' }), S(A.browSad, '@ink', { lw: 5, on: 'browSad' }),
      S(A.browAngry, '@ink', { lw: 5, on: 'browAngry' }), S(A.browFlat, '@ink', { lw: 5, on: 'browFlat' })
    ], { px: px, py: py });
  }

  function rabbitTree() {
    const A = AP.rabbit;
    const ear = (px, cr, crTip) => N(cr, [S(A.earOuter, 'fur'), S(A.earInner, 'inner', { noink: true })],
      { px: px, py: -62, kids: [N(crTip, [], { px: 5, py: -86 })] });
    return {
      root: N('root', [], { kids: [
        N('hipF6', [S(A.footFar, 'fur2')], { px: -4, py: -12 }),
        N('shoR', [S(A.armUpper, 'fur2')], { px: 10, py: -176, kids: [N('elbR', [S(A.hand, 'fur2')], { px: 2, py: 34 })] }),
        N('tailLag', [S(A.tail1, 'fur'), S(A.tail2, 'fur', { noink: true }), S(A.tail3, 'fur', { noink: true })], { px: -58, py: -122, hide: 'noTail' }),
        N('hipN6', [S(A.footNear, 'fur'), S(A.toes, 'fur2', { noink: true })], { px: 4, py: -14 }),
        N(null, [S(A.thigh, 'fur')], { px: -6, py: -70 }),
        N('chest', [S(A.torso, 'fur'), S(A.belly, 'fur2', { noink: true })], { px: 0, py: -104, kids: [
          N('shoL', [S(A.armUpper, 'fur')], { px: 24, py: -74, kids: [
            N('elbL', [S(A.hand, 'fur'), S(A.thumb, 'fur', { noink: true })], { px: 2, py: 34 })] }),
          N('head', [], { px: 24, py: -92, pre: [ear(-8, 'earL', 'earLtip'), ear(20, 'earR', 'earRtip')], kids: [
            N(null, [S(A.skull, 'fur'), S(A.muzzle, 'fur'), S(A.blush, 'blush', { noink: true })]),
            browNode(A, 34, -52),
            eyeSet(A, 'eyeF', 62, 34, -38),
            N(null, [S(A.nose, 'nose')], { px: 63, py: -24 }),
            N('jaw', [S(A.mouthShut, '@ink', { lw: 5, on: 'jawClosed' }),
                      S(A.mouthOpen, 'mouth', { on: 'jawOpen' }),
                      S(A.tongue, 'tongue', { noink: true, on: 'jawOpen' })], { px: 55, py: -10 }),
            N(null, [S(A.whisk1, '@ink', { lw: 3 }), S(A.whisk2, '@ink', { lw: 3 }), S(A.whisk3, '@ink', { lw: 3 })], { px: 58, py: -18 })
          ] })
        ] })
      ] })
    };
  }

  function squirrelTree() {
    const A = AP.squirrel;
    const ear = px => N('earLag', [S(A.earOuter, 'fur'), S(A.earInner, 'inner', { noink: true }), S(A.earTuft, 'fur2', { noink: true })], { px: px, py: -58 });
    return {
      root: N('root', [], { pre: [
        N('tail1', [S(A.tail1, 'fur')], { px: -44, py: -118, sc: 1.15, hide: 'noTail', kids: [
          N('tail2', [S(A.tail2, 'fur')], { px: 8, py: -92, kids: [
            N('tail3', [S(A.tail3, 'fur2')], { px: 4, py: -44 })] })] })
      ], kids: [
        N('hipF6', [S(A.footFar, 'fur2')], { px: -2, py: -10 }),
        N('shoR', [S(A.armUpper, 'fur2')], { px: 8, py: -158, kids: [N('elbR', [S(A.hand, 'fur2')], { px: 2, py: 30 })] }),
        N('hipN6', [S(A.footNear, 'fur'), S(A.toes, 'fur2', { noink: true })], { px: 4, py: -11 }),
        N(null, [S(A.thigh, 'fur')], { px: -4, py: -60 }),
        N('chest', [S(A.torso, 'fur'), S(A.belly, 'belly', { noink: true })], { px: 0, py: -92, kids: [
          N('shoL', [S(A.armUpper, 'fur')], { px: 21, py: -64, kids: [N('elbL', [S(A.hand, 'fur')], { px: 2, py: 30 })] }),
          N('head', [], { px: 22, py: -100, pre: [ear(-6), ear(18)], kids: [
            N(null, [S(A.skull, 'fur'), S(A.cheek, 'fur', { noink: true }), S(A.muzzle, 'fur'), S(A.blush, 'blush', { noink: true })]),
            browNode(A, 28, -45),
            eyeSet(A, 'eyeF', 54, 28, -33),
            N(null, [S(A.nose, 'nose')], { px: 53, py: -21 }),
            N('jaw', [S(A.mouthShut, '@ink', { lw: 4, on: 'jawClosed' }),
                      S(A.mouthOpen, 'mouth', { on: 'jawOpen' }),
                      S(A.tongue, 'tongue', { noink: true, on: 'jawOpen' })], { px: 47, py: -8 }),
            N(null, [S(A.whisk1, '@ink', { lw: 3 }), S(A.whisk2, '@ink', { lw: 3 }), S(A.whisk3, '@ink', { lw: 3 })], { px: 50, py: -15 })
          ] })
        ] })
      ] })
    };
  }

  function humanTree(L) {
    const A = AP.human;
    const dedicated = L.name === 'Mia' ? AP.mia : L.name === 'Leo' ? AP.leo : null;
    const st = dedicated ? -1 : (L.style | 0) % 4;
    const back = dedicated ? (dedicated.back || []) : (st === 1 ? A.hair1back : st === 2 ? A.hair2tails : st === 3 ? A.hair3back : []);
    const front = dedicated ? dedicated.front : (st === 0 ? A.hair0front : st === 1 ? A.hair1front : st === 2 ? A.hair2front : A.hair3front);
    const leg = (px, hip, knee, lift) => N(hip, [S(A.thigh, dedicated === AP.leo ? 'skin' : 'pants')], { px: px, py: -98, kids: [
      N(knee, [S(A.shin, dedicated === AP.leo ? 'skin' : 'pants'),
        ...(dedicated === AP.leo ? [S(AP.leo.sock[0], 'shoe', { noink: true })] : [])], { px: 0, py: 54, kids: [
        N(null, [S(A.shoe, 'shoe')], { px: 0, py: 29, ctrl: lift })] })] });
    const arm = (px, sho, elb, behind) => N(sho, [S(A.upperArm, behind ? 'topDark' : 'top')], { px: px, py: -222, kids: [
      N(elb, [S(A.foreArm, behind ? 'topDark' : 'top')], { px: 0, py: 40, kids: [
        N(null, [S(A.handBall, 'skin')], { px: 0, py: 34 })] })] });
    const torsoShapes = [
      S(dedicated === AP.leo ? AP.leo.shorts[0] : A.pants, 'pants'),
      S(A.shirt, 'top'), S(A.collar, 'skin', { noink: true }),
      S(A.embStar, 'white', { noink: true, on: 'emb0' }),
      S(A.embHeart, 'white', { noink: true, on: 'emb1' }),
      S(A.embStripe, 'white', { noink: true, on: 'emb2' })
    ];
    if (dedicated === AP.mia) torsoShapes.push(S(AP.mia.skirt[0], 'topDark'));
    return {
      root: N('root', [], { kids: [
        leg(-20, 'hipF', 'kneeF', 'liftF'), leg(20, 'hipN', 'kneeN', 'liftN'),
        arm(-48, 'shoLn', 'elbLn', true),
        N('chest', torsoShapes, { px: 0, py: -140 }),
        arm(48, 'shoL', 'elbL', false),
        N('headRoll', [], { px: 0, py: -238,
          pre: back.map((d, i) => N(!dedicated && st === 2 ? (i ? 'ponyR' : 'pony') : null, [S(d, 'hair')], { px: !dedicated && st === 2 ? (i ? 58 : -58) : 0, py: !dedicated && st === 2 ? -62 : 0 })),
          kids: [
            N(null, [S(A.neck, 'skin', { noink: true }), S(A.earL, 'skin'), S(A.earR, 'skin'), S(A.skull, 'skin'),
                     S(A.blushL, 'blush', { noink: true }), S(A.blushR, 'blush', { noink: true })]),
            eyeSet(A, 'eyeH', 46, -24, -62), eyeSet(A, 'eyeH', 46, 24, -62),
            browNode(A, -24, -86), browNode(A, 24, -86),
            N(null, [S(A.noseTiny, '@ink', { lw: 4 })], { px: 0, py: -44 }),
            N('jaw', [S(A.mSmile, '@ink', { lw: 5, on: 'mSmile' }), S(A.mFrown, '@ink', { lw: 5, on: 'mFrown' }),
                      S(A.mLine, '@ink', { lw: 5, on: 'mLine' }),
                      S(A.mOpen, 'mouth', { on: 'jawOpen' }), S(A.mTongue, 'tongue', { noink: true, on: 'jawOpen' }),
                      S(A.mTeeth, 'white', { noink: true, on: 'teeth' })], { px: 0, py: -24 }),
            N(null, front.map(d => S(d, 'hair'))),
            ...(dedicated === AP.mia ? [N(null, [S(AP.mia.back[1], '#ff7a8a')])] : []),
            N(null, [S(A.glasses, '@ink', { noink: true, lw: 4, on: 'acc1' }),
                     S(A.glasses2, '@ink', { noink: true, lw: 4, on: 'acc1' }),
                     S(A.bridge, '@ink', { lw: 4, on: 'acc1' }),
                     S(A.bow, '#ff7a8a', { on: 'acc2' }),
                     S(A.capDome, 'top', { on: 'acc3' }), S(A.capBrim, 'top', { on: 'acc3' })])
          ] })
      ] })
    };
  }

  function quadTree(L, upright) {
    const A = AP.quad, S0 = L.sp || {};
    const kind = S0.ears || 'round';
    const earShapes = (A.ears[kind] || A.ears.round).map((d, i) => S(d, i === 0 ? 'fur' : 'inner', i === 0 ? null : { noink: true }));
    const ear = (px, py, sc) => N('earLag', earShapes, { px: px, py: py, sc: sc });
    const ears = kind === 'huge' ? [ear(-30, -22, 1.15), ear(26, -24, 1.05)]
                                 : [ear(-16, -50, 1), ear(16, -52, 0.9)];
    const tailKind = S0.tail || 'thin';
    const tailShapes = (A.tails[tailKind] || A.tails.thin).map((d, i) => S(d, i === 0 ? (tailKind === 'puff' || tailKind === 'stub' ? 'fur2' : 'fur') : 'fur2', i === 1 ? { noink: true } : (tailKind === 'thin' ? { lw: 5 } : null)));
    const TX = upright ? -34 : -88, TY = upright ? -64 : -108;
    const qleg = (px, i) => N(null, [S(A.legUpper, 'fur')], { px: px, py: -89, ctrl: null, kids: [
      N(null, [S(A.legLower, 'fur')], { px: 0, py: 42, rot: J => J.qknee[i], kids: [
        N(null, [S(A.paw, 'fur2')], { px: 0, py: 34, oy: J => J.qlift[i] })] })] });
    const legCtrl = i => ({ rot: J => J.qhip[i] });
    const headKids = [
      N(null, [S(A.skull, 'fur'),
        ...(S0.trunk ? [] : [S(A.muzzle, 'fur'), S(A.chin, 'fur2', { noink: true })])]),
      browNode(A, 20, -40),
      eyeSet(A, 'eyeQ', 48, 20, -28),
      N(null, [S(A.nose, 'nose')], { px: 56, py: -18, hide: S0.trunk ? 'always' : undefined }),
      N('jawB', [S(A.mouthShut, '@ink', { lw: 4, on: 'jawClosed' }), S(A.mouthOpen, 'mouth', { on: 'jawOpen' })], { px: 46, py: -6 }),
      ...(S0.trunk ? [N('earLag', [S(A.trunk, 'fur')], { px: 52, py: -6 })] : []),
      ...((S0.whiskers !== false && !S0.trunk) ? [N(null, [S(A.whisk1, '@ink', { lw: 3 }), S(A.whisk2, '@ink', { lw: 3 })], { px: 50, py: -12 })] : [])
    ];
    const headPre = ears.slice();
    if (S0.mane) headPre.push(N(null, [S(A.mane, 'mane')], { px: 0, py: -22 }));
    if (S0.horn) headPre.push(N(null, [S(A.horn, '#f2e2b8')], { px: 6, py: -52 }));
    if (S0.antlers) headPre.push(N(null, [S(A.antlers, '@ink', { lw: 7 })], { px: 0, py: -50 }));
    const bodyShapes = [
      S(upright ? A.bodyUp : A.bodySide, 'fur'),
      S(upright ? A.bellyUp : A.bellySide, 'belly', { noink: true }),
      S(A.stripe1, 'dark', { noink: true, on: undefined, when: undefined, _c: !!L.stripes }),
      S(A.stripe2, 'dark', { noink: true, _c: !!L.stripes }),
      S(A.wool1, 'fur2', { _c: !!L.wool }), S(A.wool2, 'fur2', { _c: !!L.wool }), S(A.wool3, 'fur2', { _c: !!L.wool }),
      S(A.shellTop, 'dark', { _c: !!S0.shell }), S(A.shellRim, 'fur', { _c: !!S0.shell })
    ].filter(s => s._c === undefined || s._c);
    bodyShapes.forEach(s => { delete s._c; });
    return {
      root: N('root', [], { pre: [N(tailKind === 'bushy' ? 'wagB' : 'wag', tailShapes, { px: TX, py: TY, hide: 'noTail' })], kids: [
        Object.assign(qleg(upright ? -22 : -52, 0), legCtrl(0)),
        Object.assign(qleg(upright ? 22 : -28, 1), legCtrl(1)),
        Object.assign(qleg(upright ? -20 : 30, 2), legCtrl(2)),
        Object.assign(qleg(upright ? 20 : 52, 3), legCtrl(3)),
        N('chest', bodyShapes, { px: 0, py: upright ? -60 : -95, kids: upright ? [
          N('shoL', [S(A.armUpper, 'fur')], { px: 30, py: -70, kids: [N('elbL', [S(A.armHand, 'fur2')], { px: 2, py: 32 })] }),
          N('head', [], { px: 6, py: -102, pre: headPre, kids: headKids })
        ] : [N('head', [], { px: 64, py: -46, pre: headPre, kids: headKids })] })
      ] })
    };
  }

  function birdTree() {
    const A = AP.bird;
    return {
      root: N('root', [], { kids: [
        N('tailSway', [S(A.tail, 'fur2')], { px: -40, py: -104 }),
        N(null, [S(A.legL, 'nose', { lw: 5 }), S(A.footL, 'nose')], { px: -12, py: -38 }),
        N(null, [S(A.legL, 'nose', { lw: 5 }), S(A.footL, 'nose')], { px: 14, py: -38 }),
        N(null, [S(A.body, 'fur'), S(A.belly, 'belly', { noink: true })], { px: 0, py: -96, kids: [
          N('wing', [S(A.wing, 'fur2')], { px: -6, py: -40 }),
          N('head', [], { px: 10, py: -62, kids: [
            N(null, [S(A.skull, 'fur'), S(A.beakUp, 'nose'), S(A.beakDn, 'nose', { lw: 4 })]),
            browNode(A, 16, -34),
            eyeSet(A, 'eyeB', 42, 16, -24)
          ] })
        ] })
      ] })
    };
  }
  function fishTree() {
    const A = AP.fish;
    return { root: N('root', [], { kids: [
      N('fin', [S(A.tail, 'fur2')], { px: -70, py: -120 }),
      N(null, [S(A.body, 'fur'), S(A.dorsal, 'fur2'), S(A.fin, 'fur2')], { px: 0, py: -120, kids: [
        eyeSet(A, 'eyeF', 40, 44, -10),
        N('jawB', [S(A.mouth, '@ink', { lw: 4 })], { px: 74, py: 6 })
      ] })
    ] }) };
  }
  function bugTree(butterfly) {
    const A = AP.bug;
    const wing = s => N(s < 0 ? 'wingL' : 'wingR', butterfly ?
      [S(mirror(A.wingBig, s), 'fur'), S(mirror(A.wingSmall, s), 'fur2'), S(mirror(A.wingSpot, s), '#ffffff', { noink: true })] :
      [S(mirror(A.wingBee, s), '#ffffff', { lw: 4 })], { px: 0, py: -128 });
    return { root: N('root', [], { kids: [
      N(null, [], { pre: [wing(-1), wing(1)] }),
      N(null, butterfly ?
        [S(A.bodyButterfly, 'fur2'), S(A.ant1, '@ink', { lw: 4 }), S(A.ant2, '@ink', { lw: 4 }),
         S(mirr(A.antTip, -1), '@ink', { noink: true }), S(mirr(A.antTip, 1), '@ink', { noink: true })] :
        [S(A.bodyBee, 'fur'), S(A.beeStripe1, 'fur2', { noink: true }), S(A.beeStripe2, 'fur2', { noink: true }),
         S(A.beeHead, 'fur'), S(A.beeEye1, '#ffffff', { noink: true }), S(A.beeEye2, '#ffffff', { noink: true })],
        { px: 0, py: -124 })
    ] }) };
    function mirror(d, s) { return s < 0 ? mirr(d, s) : d; }
  }
  function mirr(d, s) {
    if (s > 0) return d;
    const n = { M: 2, L: 2, C: 6, Q: 4, Z: 0, E: 4 };
    const out = []; let i = 0;
    while (i < d.length) { const op = d[i], k = n[op] || 0; out.push(op);
      for (let j = 1; j <= k; j++) out.push(j % 2 === 1 ? -d[i + j] : d[i + j]);
      i += 1 + k; }
    return out;
  }
  function snailTree() {
    const A = AP.snail;
    return { root: N('root', [], { kids: [
      N(null, [S(A.shell, 'fur'), S(A.spiral, '@ink', { lw: 5 })], { px: -14, py: -64 }),
      N(null, [S(A.body, 'fur2'), S(A.stalk1, '@ink', { lw: 5 }), S(A.stalk2, '@ink', { lw: 5 }),
               S(A.eye1, 'fur2'), S(A.eye2, 'fur2')])
    ] }) };
  }

  // ------------------------------ palettes ---------------------------------
  function palette(L) {
    const S0 = L.sp || {};
    if (L.species === 'rabbit') return { fur: L.fur, fur2: shade(L.fur, -0.06), inner: '#ffb6c3', nose: L.nose, blush: shade(L.nose, 0.55), eye: L.eye, mouth: '#7a2740', tongue: '#ff8fa3' };
    if (L.species === 'squirrel') return { fur: L.fur, fur2: shade(L.fur, -0.10), inner: shade(L.nose, 0.45), nose: L.nose, belly: L.belly, blush: shade(L.nose, 0.5), eye: L.eye, mouth: '#5a1f30', tongue: '#ff8fa3' };
    if (L.kind !== 'animal') return { skin: L.skin, hair: L.hair, top: L.top, topDark: shade(L.top, -0.18), pants: L.pants, shoe: L.shoe, eye: L.eye, blush: '#ff9aa8', mouth: '#7a1f2e', tongue: '#ff7a8a', white: '#ffffff' };
    if (S0.fish) return { fur: L.fur, fur2: shade(L.fur, -0.2), eye: L.eye };
    if (S0.butterfly || (S0.wings && S0.stripes && !S0.beak)) return { fur: L.fur, fur2: shade(L.fur, -0.22), eye: L.eye };
    if (S0.legs === 0) return { fur: L.fur, fur2: shade(L.fur, -0.25), eye: L.eye };
    if (S0.beak) return { fur: L.fur, fur2: shade(L.fur, -0.16), belly: S0.belly || shade(L.fur, 0.5), nose: L.nose, eye: L.eye, mouth: '#5a1f30' };
    return { fur: L.fur, fur2: shade(L.fur, -0.14), belly: L.belly, inner: shade(L.nose, 0.4), nose: L.nose, eye: L.eye, mouth: '#5a1f30', dark: shade(L.fur, -0.28), mane: shade(L.fur, -0.32) };
  }

  // ------------------------------ dispatch ---------------------------------
  const CACHE = {};
  function rigFor(L) {
    const S0 = L.sp || {};
    const key = (L.kind || 'human') + ':' + (L.species || '') + ':' + (L.name || '') + ':' +
      (L.style === undefined ? '' : L.style) + ':' + (L.seed || 0) + ':' + (L.fur || '') + (L.top || '') + ':' +
      (S0.ears || '') + (S0.tail || '') + (S0.upright ? 'u' : '') + (S0.mane ? 'm' : '') +
      (S0.horn ? 'h' : '') + (S0.antlers ? 'a' : '') + (S0.trunk ? 't' : '') + (S0.shell ? 's' : '') +
      (S0.wool ? 'w' : '') + (S0.stripes ? 'g' : '') + (S0.beak ? 'b' : '') + (S0.wings ? 'f' : '') +
      (S0.flying ? 'y' : '') + (S0.fish ? 'i' : '') + (S0.butterfly ? 'B' : '') + (S0.legs || 0);
    if (CACHE[key]) return CACHE[key];
    let tree;
    if (L.kind === 'animal') {
      if (L.species === 'rabbit') tree = rabbitTree();
      else if (L.species === 'squirrel') tree = squirrelTree();
      else if (S0.fish) tree = fishTree();
      else if (S0.butterfly || (S0.wings && S0.stripes && !S0.beak)) tree = bugTree(!!S0.butterfly);
      else if (S0.legs === 0) tree = snailTree();
      else if (S0.beak) tree = birdTree();
      else tree = quadTree(L, !!S0.upright);
    } else tree = humanTree(L);
    const D = { root: tree.root, pal: palette(L) };
    CACHE[key] = D;
    return D;
  }

  return { trace: trace, paint: paint, rig: rig, joints: joints, rigFor: rigFor, ARGC: ARGC, shade: shade };
})();
