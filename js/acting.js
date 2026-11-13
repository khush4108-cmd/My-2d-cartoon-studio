// Ready-made acting: turns "excited + jump" into a pose for any moment in time.
window.Acting = {
  pose(L, o) {
    const t = o.t, ph = (L.seed % 100) / 10, e = o.emotion;
    const P = { dx: 0, dy: 0, sq: Math.sin(t * 2.2 + ph) * 0.012, tilt: Math.sin(t * 1.3 + ph) * 0.03,
      step: 0, stepAmp: 0, tuck: 0, armL: 0.18, armR: 0.18, blink: 0, eyes: 'open', eyeScale: 1,
      lookX: 0, lookY: 0, brow: 'flat', mouth: 'smile', open: 0 };
    const b = (t * 0.45 + ph) % 1;
    P.blink = b < 0.07 ? Math.sin(b / 0.07 * Math.PI) : 0;
    const bounce = Math.abs(Math.sin(t * 6 + ph));
    if (e === 'happy') { P.brow = 'up'; }
    else if (e === 'excited') { P.brow = 'up'; P.dy = -bounce * 12; P.armL = P.armR = 0.9; }
    else if (e === 'sad') { P.brow = 'sad'; P.mouth = 'frown'; P.tilt = 0.08; P.lookY = 1; P.armL = P.armR = 0.05; }
    else if (e === 'angry') { P.brow = 'angry'; P.mouth = 'frown'; P.dx = Math.sin(t * 30) * 2; P.armL = P.armR = 0.45; }
    else if (e === 'scared') { P.brow = 'up'; P.eyeScale = 1.15; P.mouth = 'o'; P.dx = Math.sin(t * 40) * 3; P.lookX = Math.sin(t * 2); P.armL = P.armR = 0.7; }
    else if (e === 'confused') { P.brow = 'confused'; P.mouth = 'flat'; P.tilt = 0.1; P.lookX = 1; }
    else if (e === 'surprised') { P.brow = 'up'; P.eyeScale = 1.25; P.mouth = 'o'; P.open = 1; P.dy = -6; P.armL = P.armR = 0.7; }
    if (o.talking) { P.open = 0.25 + 0.75 * Math.abs(Math.sin(t * 13 + ph)); if (P.mouth !== 'laugh') P.mouth = 'open'; P.tilt += Math.sin(t * 3) * 0.04; }
    switch (o.action) {
      case 'walk': P.step = t * 8; P.stepAmp = 1; P.armL = 0.18 + Math.sin(P.step) * 0.5; P.armR = 0.18 - Math.sin(P.step) * 0.5; P.dy -= Math.abs(Math.sin(P.step)) * 6; break;
      case 'run': P.step = t * 13; P.stepAmp = 1.6; P.tilt += 0.06; P.armL = 0.9 + Math.sin(P.step) * 0.7; P.armR = 0.9 - Math.sin(P.step) * 0.7; P.dy -= Math.abs(Math.sin(P.step)) * 12; break;
      case 'jump': { const j = Math.abs(Math.sin(t * 4.5)); P.dy -= j * 110; P.tuck = j; P.sq = j < 0.08 ? 0.12 : (j > 0.9 ? -0.05 : 0); P.armL = P.armR = 2.2; break; }
      case 'wave': P.armR = 2.3 + Math.sin(t * 10) * 0.35; break;
      // ---- added for story-based acting. A caller that never passes one of
      // ---- these names gets exactly the pose the five cases above produced.
      case 'dance': P.step = t * 6; P.stepAmp = 0.5; P.dy -= Math.abs(Math.sin(t * 6 + ph)) * 14;
        P.armL = 2.0 + Math.sin(P.step) * 0.4; P.armR = 2.0 - Math.sin(P.step) * 0.4;
        P.tilt += Math.sin(t * 3) * 0.09; P.mouth = 'laugh'; break;
      case 'fly': P.dy -= 30 + Math.sin(t * 3 + ph) * 12; P.step = t * 9; P.stepAmp = 0.3;
        P.armL = P.armR = 1.9 + Math.sin(t * 9) * 0.5; P.tilt += Math.sin(t * 2) * 0.05; break;
      case 'swim': P.dy -= 18 + Math.sin(t * 2.4 + ph) * 8; P.step = t * 5; P.stepAmp = 0.7;
        P.armL = 1.6 + Math.sin(P.step) * 0.9; P.armR = 1.6 - Math.sin(P.step) * 0.9;
        P.tilt += 0.1; P.sq = 0.04; break;
      case 'sleep': P.dy = 24; P.tilt = 0.22; P.blink = 1; P.eyes = 'closed'; P.brow = 'sad';
        P.mouth = 'flat'; P.armL = P.armR = 0.05; P.sq = 0.03; break;
      case 'sit': P.dy = 38; P.tuck = 0.9; P.armL = P.armR = 0.12; P.sq = 0.02; break;
      case 'eat': P.mouth = 'open'; P.open = 0.3 + 0.5 * Math.abs(Math.sin(t * 5 + ph));
        P.armR = 1.5; P.tilt += Math.sin(t * 5) * 0.03; break;
      case 'cry': P.brow = 'sad'; P.mouth = 'frown'; P.lookY = 1; P.dy += 6; P.tilt = 0.1;
        P.armL = P.armR = 0.3; P.eyeScale = 0.9; break;
    }
    // ---- where this character is looking, and whether they are listening ----
    // Optional. A caller that passes neither gets the pose computed above,
    // unchanged: `look` defaults to undefined and every branch below is skipped.
    if (typeof o.look === 'number' && o.look !== 0) {
      P.lookX = Math.max(-1, Math.min(1, o.look));
      P.tilt += o.look * 0.1;                                  // the head turns with the eyes
    }
    if (typeof o.lookY === 'number' && o.lookY !== 0) {
      P.lookY = Math.max(-1, Math.min(1, o.lookY));
      if (o.lookY < -0.3) P.tilt -= 0.09;                      // chin up, watching it rise
    }
    if (o.listen) {
      P.tilt += 0.08;                                          // leaning in to hear
      if (P.brow === 'flat') P.brow = 'up';
      if (P.armL > 0.5 && o.action !== 'wave') P.armL = 0.22;  // arms down: not performing
      if (P.armR > 0.5 && o.action !== 'wave') P.armR = 0.22;
      if (P.stepAmp > 0 && !o.action) { P.step = 0; P.stepAmp = 0; }
    }

    if (o.laugh) {
      const l = Math.abs(Math.sin(t * 14));
      P.mouth = 'laugh'; P.eyes = 'happy'; P.open = l; P.brow = 'up'; P.dy -= l * 8; P.tilt = Math.sin(t * 14) * 0.06; P.armL = P.armR = 0.5;
    }
    return P;
  }
};
