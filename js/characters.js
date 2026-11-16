// Character designs: every name always gets the same look, and this file draws the character.
// Style: thick ink outline + flat cel colours (classic 2D cartoon look).
window.Characters = (function () {
  const INK = '#2b1d3a';
  const SKIN = ['#ffd9b8', '#f7c79a', '#e0a678', '#c98a5c', '#a86b45', '#7a4a2e', '#5c3620'];
  const HAIR = ['#3b2314', '#1d1d2b', '#c4551d', '#f2c94c', '#8a3fd1', '#e0467c', '#2d9cdb', '#e9e4dc'];
  const TOPS = ['#ff5d73', '#3ec1d3', '#ffb703', '#7bd36a', '#9b5de5', '#ff8fab', '#f4f1de', '#2ec4b6'];
  const PANTS = ['#355c9a', '#4a4e69', '#2a9d8f', '#6d597a', '#bc6c25', '#22313f'];
  const EYES = ['#3a7bd5', '#2e8b57', '#6b4226', '#7a3fb0', '#c1121f'];
  const BUILDS = ['adult', 'adult', 'adult', 'adult', 'kid', 'tall', 'chubby', 'buff'];

  // small deterministic random generator (mulberry32) - so the same name always looks the same,
  // but different names look genuinely different
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function look(name, extra) {
    let h = 2166136261;
    for (const ch of String(name).toLowerCase()) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    const r = rng(h), at = arr => arr[Math.floor(r() * arr.length)];
    const L = {
      name, seed: h,
      skin: at(SKIN), hair: at(HAIR), eye: at(EYES),
      top: at(TOPS), pants: at(PANTS), shoe: at(TOPS),
      hairStyle: Math.floor(r() * 6),
      build: at(BUILDS),
      hat: r() < 0.18 ? 1 + Math.floor(r() * 3) : 0,          // cap / beanie / hairband
      glasses: r() < 0.16,
      beard: r() < 0.14,
      cape: false,
      freckles: r() < 0.3
    };
    if (extra && typeof extra === 'object') Object.assign(L, extra);
    return L;
  }

  const fillStroke = (c, f, w) => { c.fillStyle = f; c.fill(); c.lineWidth = w || 6; c.stroke(); };
  function limb(c, x1, y1, x2, y2, w, col) {
    c.lineCap = 'round';
    c.strokeStyle = INK; c.lineWidth = w + 9; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.strokeStyle = INK;
  }

  // ---------- body proportions per build ----------
  function headScale(L) {
    return { kid: 1.16, adult: 1, tall: 0.94, chubby: 1.08, buff: 0.98 }[L.build] || 1;
  }
  function bodyW(L) {
    return { kid: 0.95, adult: 1, tall: 0.92, chubby: 1.32, buff: 1.22 }[L.build] || 1;
  }
  function heightOf(L) {
    return { kid: 0.88, adult: 1, tall: 1.1, chubby: 0.98, buff: 1.05 }[L.build] || 1;
  }

  function hairBack(c, L) {
    const s = L.hairStyle;
    if (s === 1) { c.beginPath(); c.ellipse(0, -196, 118, 118, 0, 0, 7); fillStroke(c, L.hair); }
    if (s === 2) for (const sd of [-1, 1]) {
      c.beginPath(); c.moveTo(sd * 92, -238); c.bezierCurveTo(sd * 186, -226, sd * 178, -104, sd * 132, -88);
      c.bezierCurveTo(sd * 112, -140, sd * 98, -190, sd * 92, -238); fillStroke(c, L.hair);
    }
    if (s === 4) { c.beginPath(); c.ellipse(0, -300, 76, 62, 0, 0, 7); fillStroke(c, L.hair); }        // afro
    if (s === 5) { c.beginPath(); c.ellipse(0, -318, 38, 34, 0, 0, 7); fillStroke(c, L.hair); }        // bun
  }
  function hairFront(c, L) {
    const s = L.hairStyle;
    if (s === 3) return;                                       // bald-ish
    c.beginPath(); c.moveTo(-99, -210);
    c.bezierCurveTo(-112, -302, -58, -322, 0, -320); c.bezierCurveTo(58, -322, 112, -302, 99, -210);
    c.bezierCurveTo(92, -246, 74, -268, 46, -254);
    c.bezierCurveTo(30, -246, 22, -272, 2, -268);            // side parting
    c.bezierCurveTo(-16, -264, -22, -240, -42, -246);
    c.bezierCurveTo(-66, -252, -84, -246, -99, -210); fillStroke(c, L.hair);
    if (s === 0) {                                             // spiky hair: one zig-zag mass
      c.beginPath(); c.moveTo(-104, -268);
      const spikes = 7;
      for (let i = 0; i < spikes; i++) {
        const x0 = -104 + (208 / spikes) * i, x1 = x0 + 208 / spikes / 2, x2 = x0 + 208 / spikes;
        const h = 44 + Math.abs(3 - i) * -6 + (i % 2) * 8;
        c.lineTo(x1, -300 - h); c.lineTo(x2, -272 - (i % 3) * 4);
      }
      c.lineTo(104, -240); c.lineTo(-104, -240); c.closePath(); fillStroke(c, L.hair);
    }
    if (s === 3) for (const x of [-70, -30, 20, 62]) {          // three hairs
      c.beginPath(); c.moveTo(x, -290); c.quadraticCurveTo(x + 8, -330, x + 26, -338); c.lineWidth = 7; c.strokeStyle = L.hair; c.stroke(); c.strokeStyle = INK;
    }
    if (s === 2) for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * 99, -240, 15, 12, 0, 0, 7); fillStroke(c, L.hair, 5); }  // tie
  }
  function hat(c, L) {
    if (L.hat === 1) {
      c.beginPath(); c.moveTo(-104, -282); c.quadraticCurveTo(0, -352, 104, -282); c.closePath(); fillStroke(c, L.top);
      c.beginPath(); c.moveTo(-112, -278); c.lineTo(20, -278); c.quadraticCurveTo(30, -252, 10, -252); c.lineTo(-118, -252); fillStroke(c, L.top);
    } else if (L.hat === 2) {
      c.beginPath(); c.moveTo(-80, -292); c.lineTo(-60, -350); c.lineTo(-22, -312); c.lineTo(0, -368);
      c.lineTo(24, -312); c.lineTo(62, -350); c.lineTo(80, -292); c.closePath(); fillStroke(c, '#ffd84a');
    } else if (L.hat === 3) {
      c.beginPath(); c.moveTo(-98, -288); c.quadraticCurveTo(-70, -360, 0, -364);
      c.quadraticCurveTo(70, -360, 98, -288); c.closePath(); fillStroke(c, '#7bd36a');
      c.beginPath(); c.rect(-100, -296, 200, 22); fillStroke(c, '#5cb85c', 5);
      c.beginPath(); c.arc(0, -366, 16, 0, 7); fillStroke(c, '#fff', 5);
    } else if (L.hat === 4) {
      c.beginPath(); c.moveTo(-104, -272); c.lineTo(104, -272); c.lineTo(104, -252); c.lineTo(-104, -252); fillStroke(c, '#ff6fa5');
    }
  }
  function glasses(c, L) {
    c.lineWidth = 6;
    for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * 35, -208, 32, 33, 0, 0, 7); c.stroke(); }
    c.beginPath(); c.moveTo(-6, -210); c.lineTo(6, -210); c.stroke();
  }
  function facialHair(c, L) {
    if (!L.beard) return;
    c.beginPath(); c.moveTo(-92, -196);
    c.bezierCurveTo(-98, -120, -46, -104, 0, -104); c.bezierCurveTo(46, -104, 98, -120, 92, -196);
    c.bezierCurveTo(70, -166, 40, -158, 0, -160); c.bezierCurveTo(-40, -158, -70, -166, -92, -196);
    fillStroke(c, L.hair);
    c.beginPath(); c.moveTo(-34, -168); c.quadraticCurveTo(0, -180, 34, -168); c.quadraticCurveTo(0, -158, -34, -168);
    fillStroke(c, L.hair, 5);
  }

  function eyes(c, L, P) {
    for (const sd of [-1, 1]) {
      const ex = sd * 35, ey = -208;
      if (P.eyes === 'happy' || P.blink > 0.85) {
        c.lineWidth = 7; c.beginPath();
        if (P.eyes === 'happy') c.arc(ex, ey + 8, 17, Math.PI * 1.1, Math.PI * 1.9);
        else { c.moveTo(ex - 17, ey + 4); c.quadraticCurveTo(ex, ey + 14, ex + 17, ey + 4); }
        c.stroke();
      } else if (P.eyes === 'closed') {
        c.lineWidth = 7; c.beginPath(); c.moveTo(ex - 17, ey); c.quadraticCurveTo(ex, ey + 12, ex + 17, ey); c.stroke();
      } else {
        const rx = 21 * P.eyeScale, ry = 27 * P.eyeScale * (1 - P.blink * 0.9);
        c.beginPath(); c.ellipse(ex, ey, rx, Math.max(2, ry), 0, 0, 7); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 5; c.stroke();
        const px = ex + P.lookX * 7, py = ey + P.lookY * 6 + 2;
        c.beginPath(); c.ellipse(px, py, 12, Math.max(3, Math.min(15, ry - 3)), 0, 0, 7); c.fillStyle = L.eye; c.fill();
        c.beginPath(); c.arc(px, py, 6, 0, 7); c.fillStyle = INK; c.fill();
        c.beginPath(); c.arc(px - 4, py - 6, 4, 0, 7); c.fillStyle = '#fff'; c.fill();
      }
    }
    if (L.glasses) glasses(c, L);
    const B = { flat: [-250, -250], up: [-266, -270], angry: [-236, -260], sad: [-264, -240] };
    c.lineWidth = 8; c.lineCap = 'round'; c.strokeStyle = INK;
    for (const sd of [-1, 1]) {
      const k = P.brow === 'confused' ? (sd < 0 ? 'up' : 'angry') : P.brow, b = B[k] || B.flat;
      c.beginPath(); c.moveTo(sd * 14, b[0]); c.quadraticCurveTo(sd * 34, Math.min(b[0], b[1]) - 6, sd * 54, b[1]); c.stroke();
    }
    if (P.sweat) {                                        // anime sweat drop
      c.fillStyle = '#8fd6ff'; c.strokeStyle = INK; c.lineWidth = 4;
      c.beginPath(); c.moveTo(96, -268); c.quadraticCurveTo(118, -240, 96, -230); c.quadraticCurveTo(74, -240, 96, -268); fillStroke(c, '#8fd6ff', 4);
    }
    if (P.angryMark) {                                    // anger vein
      c.strokeStyle = '#e63946'; c.lineWidth = 6;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(84, -292, 16, i * 2.1, i * 2.1 + 1.1); c.stroke(); }
      c.strokeStyle = INK;
    }
  }

  function mouth(c, P) {
    const m = P.mouth, o = P.open; c.lineWidth = 6; c.lineCap = 'round'; c.strokeStyle = INK;
    if (m === 'laugh' || m === 'open' || m === 'shout') {
      const h = (m === 'laugh' ? 30 : m === 'shout' ? 26 : 8) + o * 20, w = m === 'laugh' ? 38 : m === 'shout' ? 28 : 25;
      c.beginPath(); c.moveTo(-w, -166); c.quadraticCurveTo(0, -174, w, -166);
      c.bezierCurveTo(w - 4, -166 + h * 1.35, -w + 4, -166 + h * 1.35, -w, -166);
      fillStroke(c, '#7a1f2e');
      c.save(); c.clip();
      c.fillStyle = '#fff'; c.fillRect(-w, -170, w * 2, m === 'laugh' || m === 'shout' ? 12 : 8);
      if (m !== 'shout') { c.fillStyle = '#ff7a8a'; c.beginPath(); c.ellipse(0, -166 + h * 1.15, w * 0.6, h * 0.4 + 3, 0, 0, 7); c.fill(); }
      c.restore();
      c.beginPath(); c.moveTo(-w, -166); c.quadraticCurveTo(0, -174, w, -166);
      c.bezierCurveTo(w - 4, -166 + h * 1.35, -w + 4, -166 + h * 1.35, -w, -166); c.stroke();
    } else if (m === 'o') {
      c.beginPath(); c.ellipse(0, -158, 11 + o * 4, 13 + o * 6, 0, 0, 7); fillStroke(c, '#7a1f2e');
    } else if (m === 'grin') {
      c.beginPath(); c.moveTo(-32, -168); c.quadraticCurveTo(0, -132, 32, -168); c.quadraticCurveTo(0, -158, -32, -168);
      fillStroke(c, '#7a1f2e', 5); c.beginPath(); c.moveTo(-32, -168); c.quadraticCurveTo(0, -132, 32, -168); c.stroke();
    } else if (m === 'frown') {
      c.beginPath(); c.moveTo(-22, -146); c.quadraticCurveTo(0, -172, 22, -146); c.stroke();
    } else if (m === 'wobble') {
      c.beginPath(); c.moveTo(-24, -156); c.quadraticCurveTo(-8, -170, 2, -154); c.quadraticCurveTo(12, -138, 24, -152); c.stroke();
    } else if (m === 'flat') {
      c.beginPath(); c.moveTo(-16, -158); c.lineTo(16, -158); c.stroke();
    } else {
      c.beginPath(); c.moveTo(-28, -170); c.quadraticCurveTo(0, -140, 28, -170); c.stroke();
    }
  }

  function head(c, L, P) {
    const hs = headScale(L);
    c.save(); c.scale(hs, hs);
    hairBack(c, L);
    for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * 96, -204, 14, 20, 0, 0, 7); fillStroke(c, L.skin); }  // ears
    c.beginPath(); c.moveTo(0, -302); c.bezierCurveTo(74, -302, 104, -256, 98, -206);
    c.bezierCurveTo(92, -160, 54, -126, 0, -126); c.bezierCurveTo(-54, -126, -92, -160, -98, -206);
    c.bezierCurveTo(-104, -256, -74, -302, 0, -302); fillStroke(c, L.skin);
    if (L.freckles) {
      c.fillStyle = 'rgba(190,110,70,.55)';
      for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(sd * (58 + i * 9), -178 + i * 7, 2.6, 0, 7); c.fill(); }
    }
    c.fillStyle = 'rgba(255,90,110,.32)';
    for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * 62, -166, 19, 11, 0, 0, 7); c.fill(); }
    c.strokeStyle = INK;
    eyes(c, L, P); facialHair(c, L); mouth(c, P); hairFront(c, L); hat(c, L);
    if (P.cry) for (const sd of [-1, 1]) {                        // tears
      c.fillStyle = '#8fd6ff'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(sd * 35, -190); c.quadraticCurveTo(sd * 46, -150, sd * 35, -132);
      c.quadraticCurveTo(sd * 22, -150, sd * 35, -190); fillStroke(c, '#8fd6ff', 4);
    }
    c.restore();
  }

  function torso(c, L, P) {
    const bw = bodyW(L);
    c.fillStyle = L.skin; c.fillRect(-16, -152, 32, 26);                     // neck
    c.beginPath(); c.moveTo(-46 * bw, -142); c.quadraticCurveTo(0, -128, 46 * bw, -142);
    c.bezierCurveTo(64 * bw, -108, 60 * bw, -74, 52 * bw, -46);
    c.quadraticCurveTo(0, -32, -52 * bw, -46);
    c.bezierCurveTo(-60 * bw, -74, -64 * bw, -108, -46 * bw, -142); c.closePath();
    c.fillStyle = L.top; c.fill();
    c.save(); c.clip();
    c.fillStyle = 'rgba(255,255,255,.9)';
    c.fillRect(-80, -130, 160, 9);
    if (L.build === 'buff') { c.fillRect(-80, -62, 160, 10); }
    c.restore();
    c.lineWidth = 6; c.stroke();
    // chest emblem
    c.fillStyle = '#fff';
    c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 8 : 17, a = i * Math.PI / 5 - Math.PI / 2; c.lineTo(Math.cos(a) * r, -98 + Math.sin(a) * r); }
    c.closePath(); c.fill();
  }

  function draw(c, L, P, x, y, s, flip) {
    const hgt = heightOf(L);
    const sc = (s || 1) * hgt;
    const sq = P.sq || 0;
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(0,0,0,' + Math.max(0.06, 0.22 - Math.min(0.14, -P.dy / 900)) + ')';   // shadow
    c.beginPath(); c.ellipse(0, 4, 70 * sc * (1 + P.dy / 600), 14 * sc, 0, 0, 7); c.fill();
    c.scale(flip ? -sc : sc, sc); c.scale(1 + sq, 1 - sq);
    c.translate(P.dx || 0, P.dy || 0);
    c.lineJoin = 'round'; c.strokeStyle = INK; c.lineCap = 'round';

    if (L.cape) {                                              // cape flutters behind
      const sway = Math.sin((P.t || 0) * 4 + L.seed % 10) * 14;
      c.beginPath(); c.moveTo(-62, -146); c.lineTo(62, -146);
      c.quadraticCurveTo(80 + sway, -50, 44 + sway, 26); c.quadraticCurveTo(0, 6, -44 + sway, 26);
      c.quadraticCurveTo(-80 + sway, -50, -62, -146); fillStroke(c, '#e63946');
    }
    for (const sd of [-1, 1]) {                                // legs and shoes
      const ph = (P.step || 0) + (sd < 0 ? 0 : Math.PI);
      const fx = sd * 26 + Math.sin(ph) * (P.stepAmp || 0) * 32;
      const fy = -Math.max(0, Math.cos(ph)) * (P.stepAmp || 0) * 18 - (P.tuck || 0) * 36;
      limb(c, sd * 24, -70, fx, fy - 18, 25, L.pants);
      c.beginPath(); c.ellipse(fx + 12, fy - 10, 34, 16, 0, 0, 7); fillStroke(c, L.shoe);   // shoe
      c.beginPath(); c.ellipse(fx + 12, fy - 4, 34, 7, 0, 0, 7); fillStroke(c, '#2b1d3a', 3);  // sole
      c.beginPath(); c.ellipse(fx + 14, fy - 16, 14, 5, 0, 0, 7); fillStroke(c, 'rgba(255,255,255,.55)', 2); // shine
    }
    const arms = [-1, 1].map(sd => {                           // arms go behind the body
      const a = sd < 0 ? (P.armL || 0) : (P.armR || 0), sx = sd * 46, sy = -134;
      return { sd, sx, sy, hx: sx + sd * Math.sin(a) * 82, hy: sy + Math.cos(a) * 82 };
    });
    for (const A of arms) { limb(c, A.sx, A.sy, A.hx, A.hy, 21, L.top); }
    torso(c, L, P);
    c.save(); c.translate((P.headX || 0) + (P.lean || 0) * 26, -135 + (P.headY || 0)); c.rotate(P.tilt || 0); c.translate(0, 135);
    head(c, L, P);
    c.restore();
    for (const A of arms) {                                    // hands on top
      c.beginPath(); c.arc(A.hx, A.hy, 14, 0, 7); fillStroke(c, L.skin);
    }
    c.restore();
  }

  return { look, draw };
})();
