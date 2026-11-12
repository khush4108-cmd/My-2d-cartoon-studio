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
    }
    if (o.laugh) {
      const l = Math.abs(Math.sin(t * 14));
      P.mouth = 'laugh'; P.eyes = 'happy'; P.open = l; P.brow = 'up'; P.dy -= l * 8; P.tilt = Math.sin(t * 14) * 0.06; P.armL = P.armR = 0.5;
    }
    return P;
  }
};
