// Ready-made acting: turns "excited + jump" into a pose for any moment in time.
window.Acting = (function () {
  const EMOTIONS = ['neutral', 'happy', 'excited', 'sad', 'scared', 'angry', 'confused', 'surprised', 'smug', 'sleepy', 'dizzy', 'love', 'determined'];
  const ACTIONS = ['none', 'walk', 'run', 'jump', 'wave', 'point', 'shrug', 'dance', 'spin', 'sneak', 'panic', 'fall', 'clap', 'think', 'cower', 'pounce'];

  function base(L, t) {
    const ph = (L.seed % 100) / 10;
    const P = {
      t, u: 0, dx: 0, dy: 0, sq: Math.sin(t * 2.2 + ph) * 0.012, rot: 0,
      tilt: Math.sin(t * 1.3 + ph) * 0.03, lean: 0, headX: 0, headY: 0,
      step: 0, stepAmp: 0, tuck: 0, armL: 0.18, armR: 0.18,
      blink: 0, eyes: 'open', eyeScale: 1, lookX: 0, lookY: 0,
      brow: 'flat', mouth: 'smile', open: 0,
      sweat: false, angryMark: false, cry: false, stars: false, blush: false
    };
    const b = (t * 0.45 + ph) % 1;                       // natural blink every ~2s
    P.blink = b < 0.07 ? Math.sin((b / 0.07) * Math.PI) : 0;
    return P;
  }

  const bounce = (t, ph) => Math.abs(Math.sin(t * 6 + ph));

  function emotion(P, e, L, t) {
    const ph = (L.seed % 100) / 10, bo = bounce(t, ph);
    switch (e) {
      case 'happy': P.brow = 'up'; P.mouth = 'smile'; break;
      case 'excited':
        P.brow = 'up'; P.mouth = 'laugh'; P.open = 0.5 + bo * 0.5; P.dy = -bo * 14;
        P.armL = P.armR = 1.9; P.blush = true; break;
      case 'sad':
        P.brow = 'sad'; P.mouth = 'frown'; P.tilt = 0.09; P.lookY = 1; P.armL = P.armR = 0.05;
        P.eyeScale = 0.95; P.cry = true; break;
      case 'angry':
        P.brow = 'angry'; P.mouth = 'frown'; P.dx = Math.sin(t * 34) * 2.5; P.armL = P.armR = 0.4;
        P.angryMark = true; P.sq = Math.sin(t * 20) * 0.02; break;
      case 'scared':
        P.brow = 'up'; P.eyeScale = 1.18; P.mouth = 'o'; P.open = 0.8; P.dx = Math.sin(t * 42) * 3;
        P.lookX = Math.sin(t * 2); P.armL = P.armR = 1.6; P.sweat = true; break;
      case 'confused':
        P.brow = 'confused'; P.mouth = 'wobble'; P.tilt = 0.12; P.lookX = 1; P.headY = -4; break;
      case 'surprised':
        P.brow = 'up'; P.eyeScale = 1.3; P.mouth = 'o'; P.open = 1; P.dy = -8;
        P.armL = P.armR = 1.9; P.sq = -0.05; break;
      case 'smug':
        P.brow = 'up'; P.mouth = 'grin'; P.tilt = -0.05; P.eyes = 'half'; P.armL = 0.1; P.armR = 0.7; break;
      case 'sleepy':
        P.eyes = 'closed'; P.mouth = 'flat'; P.tilt = 0.14; P.headY = 5; P.dy = Math.sin(t * 1.6) * 3; break;
      case 'dizzy':
        P.brow = 'up'; P.mouth = 'wobble'; P.stars = true; P.tilt = Math.sin(t * 3) * 0.12;
        P.dx = Math.sin(t * 2.2) * 5; break;
      case 'love':
        P.brow = 'up'; P.mouth = 'grin'; P.blush = true; P.eyeScale = 1.1; P.dy = -bo * 6; break;
      case 'determined':
        P.brow = 'angry'; P.mouth = 'grin'; P.lean = 0.1; P.armL = 0.6; P.armR = 0.6; break;
    }
  }

  function action(P, a, t, u) {
    switch (a) {
      case 'walk':
        P.step = t * 8; P.stepAmp = 1; P.armL = 0.18 + Math.sin(P.step) * 0.5; P.armR = 0.18 - Math.sin(P.step) * 0.5;
        P.dy -= Math.abs(Math.sin(P.step)) * 6; break;
      case 'run':
        P.step = t * 14; P.stepAmp = 1.7; P.tilt += 0.08; P.lean = 0.16;
        P.armL = 1.2 + Math.sin(P.step) * 0.7; P.armR = 1.2 - Math.sin(P.step) * 0.7;
        P.dy -= Math.abs(Math.sin(P.step)) * 13; P.sq = Math.sin(P.step) * 0.03; break;
      case 'jump': {
        const j = Math.abs(Math.sin(t * 4.2));
        P.dy -= j * 130; P.tuck = j * 0.8;
        P.sq = j < 0.1 ? 0.14 : (j > 0.85 ? -0.09 : 0);
        P.armL = P.armR = 2.4 - j * 0.5; break;
      }
      case 'wave': P.armR = 2.5 + Math.sin(t * 11) * 0.35; P.headY = -2; break;
      case 'point': P.armR = 1.62 + Math.sin(t * 3) * 0.05; P.lean = 0.05; break;
      case 'shrug': P.armL = 0.95; P.armR = 0.95; P.brow = 'up'; P.mouth = 'flat'; P.headY = -3; break;
      case 'dance': {
        const d = Math.sin(t * 7);
        P.dx = d * 16; P.tilt = d * 0.12; P.sq = -Math.abs(d) * 0.04;
        P.armL = 1.6 + Math.sin(t * 7) * 1.2; P.armR = 1.6 - Math.sin(t * 7) * 1.2;
        P.step = t * 9; P.stepAmp = 0.6; P.dy -= Math.abs(d) * 14; break;
      }
      case 'spin': P.rot = Math.min(1, u * 1.6) * Math.PI * 2; P.armL = 1.5; P.armR = 1.5; P.dy -= Math.abs(Math.sin(t * 6)) * 10; break;
      case 'sneak':
        P.dy += 16; P.sq = 0.06; P.lean = 0.12; P.step = t * 5; P.stepAmp = 0.45;
        P.armL = 1.1; P.armR = 1.1; P.eyes = 'half'; P.brow = 'flat'; P.lookX = 1; break;
      case 'panic':
        P.step = t * 20; P.stepAmp = 0.7; P.dy -= Math.abs(Math.sin(P.step)) * 8;
        P.armL = P.armR = 2.7; P.brow = 'up'; P.eyeScale = 1.25; P.mouth = 'o'; P.sweat = true; break;
      case 'fall': {
        const k = Math.min(1, u * 2.4);
        P.rot = -k * 1.45; P.dy += k * 6; P.armL = 2.2 * (1 - k) + 1.4 * k; P.armR = 2.2 * (1 - k) + 1.4 * k;
        P.eyes = k > 0.5 ? 'closed' : 'open'; P.mouth = k > 0.5 ? 'wobble' : 'o'; P.stars = k > 0.9; break;
      }
      case 'clap':
        P.armL = P.armR = 1.25 + Math.abs(Math.sin(t * 9)) * 0.35; P.brow = 'up'; P.mouth = 'smile'; break;
      case 'think': P.armR = 2.55; P.armL = 0.1; P.eyes = 'half'; P.lookY = -1; P.mouth = 'flat'; P.tilt = -0.06; break;
      case 'cower':
        P.dy += 52; P.sq = 0.14; P.armL = P.armR = 2.3; P.eyeScale = 1.2; P.mouth = 'wobble';
        P.tilt = 0.1; P.brow = 'sad'; P.sweat = true; break;
      case 'pounce': {
        const k = Math.min(1, u * 1.8);
        P.lean = 0.3 + k * 0.3; P.dx += -90 * k; P.armL = P.armR = 1.55; P.step = t * 18; P.stepAmp = 0.8;
        P.brow = 'angry'; P.mouth = 'shout'; break;
      }
    }
  }

  return {
    EMOTIONS, ACTIONS,
    /** o = { t, u, emotion, action, talking, laugh, flip } */
    pose(L, o) {
      const P = base(L, o.t || 0);
      P.u = o.u == null ? 0.5 : o.u;
      emotion(P, o.emotion || 'neutral', L, o.t || 0);
      if (o.action && o.action !== 'none') action(P, o.action, o.t || 0, P.u);
      if (o.talking) {
        P.open = 0.25 + 0.75 * Math.abs(Math.sin(o.t * 13 + (L.seed % 7)));   // lip flap
        if (P.mouth !== 'laugh' && P.mouth !== 'shout') P.mouth = 'open';
        P.tilt += Math.sin(o.t * 3) * 0.04;
      }
      if (o.laugh) {
        const l = Math.abs(Math.sin(o.t * 14));
        P.mouth = 'laugh'; P.eyes = 'happy'; P.open = l; P.brow = 'up';
        P.dy -= l * 10; P.tilt = Math.sin(o.t * 14) * 0.07; P.armL = P.armR = 0.6;
      }
      if (o.limp) { P.rot = -1.45; P.eyes = 'closed'; P.mouth = 'flat'; P.armL = 0.02; P.armR = 0.02; }
      return P;
    }
  };
})();
