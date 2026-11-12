// Character designs: every name always gets the same look, and this file draws the character.
window.Characters = (function () {
  const INK = '#2b1d3a';
  const SKIN = ['#ffd9b8', '#f5c08f', '#d99a6c', '#a86b45', '#7a4a2e'];
  const HAIR = ['#3b2314', '#1d1d2b', '#c4551d', '#f2c94c', '#8a3fd1', '#e0467c', '#2d9cdb'];
  const TOPS = ['#ff5d73', '#3ec1d3', '#ffb703', '#7bd36a', '#9b5de5', '#ff8fab'];
  const PANTS = ['#355c9a', '#4a4e69', '#2a9d8f', '#6d597a', '#bc6c25'];
  const EYES = ['#3a7bd5', '#2e8b57', '#6b4226', '#7a3fb0'];

  function look(name) {
    let h = 2166136261;
    for (const c of name.toLowerCase()) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    const pick = (n, k) => (h >>> k) % n;
    return { name, seed: h, skin: SKIN[pick(5, 0)], hair: HAIR[pick(7, 4)], style: pick(4, 8),
      top: TOPS[pick(6, 11)], pants: PANTS[pick(5, 15)], eye: EYES[pick(4, 18)],
      acc: pick(4, 21), emblem: pick(3, 24), shoe: TOPS[(pick(6, 27) + 3) % 6] };
  }

  function limb(c, x1, y1, x2, y2, w, col) {
    c.lineCap = 'round';
    c.strokeStyle = INK; c.lineWidth = w + 8; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.strokeStyle = INK;
  }
  const fillStroke = (c, f) => { c.fillStyle = f; c.fill(); c.lineWidth = 6; c.stroke(); };

  function hairBack(c, L) {
    if (L.style === 1) { c.beginPath(); c.ellipse(0, -195, 114, 108, 0, 0, 7); fillStroke(c, L.hair); }
    if (L.style === 2) for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(s * 100, -240); c.bezierCurveTo(s * 170, -230, s * 160, -120, s * 125, -110);
      c.bezierCurveTo(s * 110, -150, s * 100, -190, s * 100, -240); fillStroke(c, L.hair);
    }
  }
  function hairFront(c, L) {
    c.beginPath(); c.moveTo(-100, -208);
    c.bezierCurveTo(-112, -300, -60, -318, 0, -316); c.bezierCurveTo(60, -318, 112, -300, 100, -208);
    c.bezierCurveTo(88, -240, 70, -262, 40, -250); c.bezierCurveTo(20, -240, 0, -262, -20, -248);
    c.bezierCurveTo(-45, -236, -75, -250, -100, -208); fillStroke(c, L.hair);
    if (L.style === 0) for (let i = -3; i <= 3; i++) {
      c.beginPath(); c.moveTo(i * 28 - 20, -300); c.lineTo(i * 28, -356 + Math.abs(i) * 9); c.lineTo(i * 28 + 20, -300); fillStroke(c, L.hair);
    }
    if (L.style === 3) for (const [x, y, r] of [[-52, -318, 38], [0, -338, 46], [52, -318, 38]]) {
      c.beginPath(); c.arc(x, y, r, 0, 7); fillStroke(c, L.hair);
    }
  }
  function eyes(c, L, P) {
    for (const s of [-1, 1]) {
      const ex = s * 35, ey = -208;
      if (P.eyes === 'happy' || P.blink > 0.85) {
        c.lineWidth = 7; c.beginPath();
        if (P.eyes === 'happy') c.arc(ex, ey + 8, 17, Math.PI * 1.1, Math.PI * 1.9);
        else { c.moveTo(ex - 17, ey + 4); c.quadraticCurveTo(ex, ey + 14, ex + 17, ey + 4); }
        c.stroke();
      } else {
        const rx = 21 * P.eyeScale, ry = 27 * P.eyeScale * (1 - P.blink * 0.9);
        c.beginPath(); c.ellipse(ex, ey, rx, ry, 0, 0, 7); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 5; c.stroke();
        const px = ex + P.lookX * 7, py = ey + P.lookY * 6 + 2;
        c.beginPath(); c.ellipse(px, py, 12, Math.min(15, ry - 3), 0, 0, 7); c.fillStyle = L.eye; c.fill();
        c.beginPath(); c.arc(px, py, 6, 0, 7); c.fillStyle = INK; c.fill();
        c.beginPath(); c.arc(px - 4, py - 6, 4, 0, 7); c.fillStyle = '#fff'; c.fill();
      }
    }
    const B = { flat: [-250, -250], up: [-264, -268], angry: [-236, -258], sad: [-262, -240] };
    c.lineWidth = 8; c.lineCap = 'round';
    for (const s of [-1, 1]) {
      const k = P.brow === 'confused' ? (s < 0 ? 'up' : 'angry') : P.brow, b = B[k];
      c.beginPath(); c.moveTo(s * 14, b[0]); c.quadraticCurveTo(s * 34, Math.min(b[0], b[1]) - 6, s * 54, b[1]); c.stroke();
    }
  }
  function mouth(c, P) {
    const m = P.mouth, o = P.open; c.lineWidth = 6; c.lineCap = 'round';
    if (m === 'laugh' || m === 'open') {
      const h = m === 'laugh' ? 30 + o * 18 : 6 + o * 26, w = m === 'laugh' ? 36 : 25;
      c.beginPath(); c.moveTo(-w, -166); c.quadraticCurveTo(0, -172, w, -166);
      c.bezierCurveTo(w - 4, -166 + h * 1.35, -w + 4, -166 + h * 1.35, -w, -166);
      fillStroke(c, '#7a1f2e');
      c.save(); c.clip(); c.fillStyle = '#fff'; c.fillRect(-w, -168, w * 2, m === 'laugh' ? 11 : 7);
      c.fillStyle = '#ff7a8a'; c.beginPath(); c.ellipse(0, -166 + h * 1.15, w * .6, h * .4 + 3, 0, 0, 7); c.fill(); c.restore();
      c.beginPath(); c.moveTo(-w, -166); c.quadraticCurveTo(0, -172, w, -166);
      c.bezierCurveTo(w - 4, -166 + h * 1.35, -w + 4, -166 + h * 1.35, -w, -166); c.stroke();
    } else if (m === 'o') {
      c.beginPath(); c.ellipse(0, -156, 11 + o * 4, 14 + o * 6, 0, 0, 7); fillStroke(c, '#7a1f2e');
    } else {
      c.beginPath();
      if (m === 'smile') { c.moveTo(-28, -168); c.quadraticCurveTo(0, -140, 28, -168); }
      else if (m === 'frown') { c.moveTo(-22, -150); c.quadraticCurveTo(0, -170, 22, -150); }
      else { c.moveTo(-16, -158); c.lineTo(16, -158); }
      c.stroke();
    }
  }
  function accessory(c, L) {
    c.lineWidth = 6;
    if (L.acc === 1) {
      c.lineWidth = 5; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 35, -208, 30, 31, 0, 0, 7); c.stroke(); }
      c.beginPath(); c.moveTo(-5, -210); c.lineTo(5, -210); c.stroke();
    } else if (L.acc === 2) {
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(-72, -300); c.lineTo(-72 + s * 40, -326); c.lineTo(-72 + s * 40, -274); c.closePath(); fillStroke(c, '#ff6fa5'); }
      c.beginPath(); c.arc(-72, -300, 11, 0, 7); fillStroke(c, '#ff3d86');
    } else if (L.acc === 3) {
      c.beginPath(); c.moveTo(-104, -252); c.bezierCurveTo(-110, -345, 110, -345, 104, -252); c.quadraticCurveTo(0, -240, -104, -252); fillStroke(c, L.top);
      c.beginPath(); c.moveTo(30, -262); c.quadraticCurveTo(150, -270, 150, -244); c.quadraticCurveTo(80, -238, 30, -250); fillStroke(c, L.top);
    }
  }
  function torso(c, L) {
    c.fillStyle = L.skin; c.fillRect(-16, -152, 32, 28);
    c.beginPath(); c.moveTo(-46, -140); c.quadraticCurveTo(0, -126, 46, -140);
    c.bezierCurveTo(62, -110, 58, -80, 50, -56); c.quadraticCurveTo(0, -44, -50, -56);
    c.bezierCurveTo(-58, -80, -62, -110, -46, -140); c.closePath();
    c.fillStyle = L.top; c.fill();
    c.save(); c.clip();
    c.fillStyle = 'rgba(255,255,255,.85)';
    if (L.emblem === 2) { c.fillRect(-70, -115, 140, 14); c.fillRect(-70, -88, 140, 14); }
    c.restore();
    c.lineWidth = 6; c.stroke();
    c.fillStyle = '#fff';
    if (L.emblem === 0) { c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 8 : 18, a = i * Math.PI / 5 - Math.PI / 2; c.lineTo(Math.cos(a) * r, -100 + Math.sin(a) * r); } c.closePath(); c.fill(); }
    if (L.emblem === 1) { c.beginPath(); c.moveTo(0, -84); c.bezierCurveTo(-30, -108, -14, -124, 0, -108); c.bezierCurveTo(14, -124, 30, -108, 0, -84); c.fill(); }
  }

  function draw(c, L, P, x, y, s, flip) {
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(0,0,0,' + (0.2 - Math.min(0.12, -P.dy / 900)) + ')';
    c.beginPath(); c.ellipse(0, 4, 70 * s * (1 + P.dy / 500), 14 * s, 0, 0, 7); c.fill();
    c.scale(flip ? -s : s, s); c.scale(1 + P.sq, 1 - P.sq); c.translate(P.dx, P.dy);
    c.lineJoin = 'round'; c.strokeStyle = INK;
    for (const sd of [-1, 1]) {                                  // legs and shoes
      const ph = P.step + (sd < 0 ? 0 : Math.PI);
      const fx = sd * 24 + Math.sin(ph) * P.stepAmp * 30, fy = -Math.max(0, Math.cos(ph)) * P.stepAmp * 16 - P.tuck * 34;
      limb(c, sd * 22, -62, fx, fy - 14, 26, L.pants);
      c.beginPath(); c.ellipse(fx + 8, fy - 8, 32, 16, 0, 0, 7); fillStroke(c, L.shoe);
    }
    torso(c, L);
    c.save(); c.translate(0, -135); c.rotate(P.tilt); c.translate(0, 135);
    hairBack(c, L);
    for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * 94, -205, 14, 20, 0, 0, 7); fillStroke(c, L.skin); }
    c.beginPath(); c.moveTo(0, -300); c.bezierCurveTo(72, -300, 102, -255, 97, -205);
    c.bezierCurveTo(92, -160, 52, -126, 0, -126); c.bezierCurveTo(-52, -126, -92, -160, -97, -205);
    c.bezierCurveTo(-102, -255, -72, -300, 0, -300); fillStroke(c, L.skin);
    c.fillStyle = 'rgba(255,90,110,.35)';
    for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * 60, -168, 18, 11, 0, 0, 7); c.fill(); }
    c.strokeStyle = INK; eyes(c, L, P); mouth(c, P); hairFront(c, L); accessory(c, L);
    c.restore();
    for (const sd of [-1, 1]) {                                  // arms and hands
      const a = sd < 0 ? P.armL : P.armR, sx = sd * 50, sy = -132;
      const hx = sx + sd * Math.sin(a) * 78, hy = sy + Math.cos(a) * 78;
      limb(c, sx, sy, hx, hy, 22, L.top);
      c.beginPath(); c.arc(hx, hy, 15, 0, 7); fillStroke(c, L.skin);
    }
    c.restore();
  }
  return { look, draw };
})();
