// Character designs: every name always gets the same look, and this file draws the character.
// Species aware: person, monkey, bear, cat, mouse, dog, rabbit, lion (thick ink outline + flat cel colours).
window.Characters = (function () {
  const INK = '#2b1d3a';
  const SKIN = ['#ffd9b8', '#f7c79a', '#e0a678', '#c98a5c', '#a86b45', '#7a4a2e', '#5c3620'];
  const HAIR = ['#3b2314', '#1d1d2b', '#c4551d', '#f2c94c', '#8a3fd1', '#e0467c', '#2d9cdb', '#e9e4dc'];
  const TOPS = ['#ff5d73', '#3ec1d3', '#ffb703', '#7bd36a', '#9b5de5', '#ff8fab', '#f4f1de', '#2ec4b6'];
  const PANTS = ['#355c9a', '#4a4e69', '#2a9d8f', '#6d597a', '#bc6c25', '#22313f'];
  const EYES = ['#3a7bd5', '#2e8b57', '#6b4226', '#7a3fb0', '#c1121f'];
  const BUILDS = ['adult', 'adult', 'adult', 'adult', 'kid', 'tall', 'chubby', 'buff'];
  const FURS = ['#a9714a', '#8a5a3b', '#c98f5f', '#d8b08a', '#6b4423', '#e3c9a6', '#9aa0a6', '#5f6b7a'];
  const SPECIES = ['person', 'monkey', 'bear', 'cat', 'mouse', 'dog', 'rabbit', 'lion'];

  // ---- colour helper: mix a hex colour towards white/black ----
  function shade(hex, amt) {                      // amt > 0 lighter, < 0 darker
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const mix = v => Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt));
    return '#' + [mix(r), mix(g), mix(b)].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
  }

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
      species: 'person',
      skin: at(SKIN), fur: at(FURS), hair: at(HAIR), eye: at(EYES),
      top: at(TOPS), pants: at(PANTS), shoe: at(TOPS),
      hairStyle: Math.floor(r() * 6),
      build: at(BUILDS),
      hat: r() < 0.18 ? 1 + Math.floor(r() * 3) : 0,
      glasses: r() < 0.16,
      beard: r() < 0.14,
      cape: false,
      freckles: r() < 0.3
    };
    if (extra && typeof extra === 'object') Object.assign(L, extra);
    if (L.species === 'bear') { L.build = 'chubby'; L.fur = L.fur || '#8a5a3b'; }
    if (L.species === 'lion') { L.build = 'buff'; }
    if (L.species === 'mouse') { L.build = 'kid'; }
    if (L.species && L.species !== 'person') {                 // animals: fur, no human hair/beard/hats
      L.skin = L.fur;
      L.face = shade(L.fur, 0.45);
      L.hairStyle = 3;
      L.beard = false;
      if (L.hat === 2) L.hat = 0;
    }
    return L;
  }

  const fillStroke = (c, f, w) => { c.fillStyle = f; c.fill(); c.lineWidth = w || 6; c.stroke(); };
  function limb(c, x1, y1, x2, y2, w, col) {
    c.lineCap = 'round';
    c.strokeStyle = INK; c.lineWidth = w + 9; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.strokeStyle = INK;
  }

  const headScale = L => ({ kid: 1.16, adult: 1, tall: 0.94, chubby: 1.08, buff: 0.98 }[L.build] || 1);
  const bodyW = L => ({ kid: 0.95, adult: 1, tall: 0.92, chubby: 1.32, buff: 1.22 }[L.build] || 1);
  const heightOf = L => ({ kid: 0.88, adult: 1, tall: 1.1, chubby: 0.98, buff: 1.05 }[L.build] || 1);

  // ======================================================= human hair / hats
  function hairBack(c, L) {
    const s = L.hairStyle;
    if (s === 1) { c.beginPath(); c.ellipse(0, -222, 106, 90, 0, 0, 7); fillStroke(c, L.hair); }
    if (s === 2) for (const sd of [-1, 1]) {
      c.beginPath(); c.moveTo(sd * 92, -238); c.bezierCurveTo(sd * 186, -226, sd * 178, -104, sd * 132, -88);
      c.bezierCurveTo(sd * 112, -140, sd * 98, -190, sd * 92, -238); fillStroke(c, L.hair);
    }
    if (s === 4) { c.beginPath(); c.ellipse(0, -300, 74, 58, 0, 0, 7); fillStroke(c, L.hair); }
    if (s === 5) { c.beginPath(); c.ellipse(0, -312, 36, 32, 0, 0, 7); fillStroke(c, L.hair); }
  }
  function hairFront(c, L) {
    const s = L.hairStyle;
    if (s === 3) return;
    c.beginPath(); c.moveTo(-99, -210);
    c.bezierCurveTo(-112, -302, -58, -322, 0, -320); c.bezierCurveTo(58, -322, 112, -302, 99, -210);
    c.bezierCurveTo(92, -246, 74, -268, 46, -254);
    c.bezierCurveTo(30, -246, 22, -272, 2, -268);
    c.bezierCurveTo(-16, -264, -22, -240, -42, -246);
    c.bezierCurveTo(-66, -252, -84, -246, -99, -210); fillStroke(c, L.hair);
    if (s === 0) {
      c.beginPath(); c.moveTo(-104, -268);
      const spikes = 7;
      for (let i = 0; i < spikes; i++) {
        const x0 = -104 + (208 / spikes) * i, x1 = x0 + 208 / spikes / 2, x2 = x0 + 208 / spikes;
        const hh = 44 + Math.abs(3 - i) * -6 + (i % 2) * 8;
        c.lineTo(x1, -300 - hh); c.lineTo(x2, -272 - (i % 3) * 4);
      }
      c.lineTo(104, -240); c.lineTo(-104, -240); c.closePath(); fillStroke(c, L.hair);
    }
    if (s === 2) for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * 99, -240, 15, 12, 0, 0, 7); fillStroke(c, L.hair, 5); }
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
    c.beginPath(); c.moveTo(-88, -172);
    c.bezierCurveTo(-92, -128, -44, -112, 0, -112); c.bezierCurveTo(44, -112, 92, -128, 88, -172);
    c.bezierCurveTo(66, -150, 36, -146, 0, -146); c.bezierCurveTo(-36, -146, -66, -150, -88, -172);
    fillStroke(c, L.hair);
  }

  // ======================================================= species: ears, muzzle, tail
  function earsBack(c, L) {
    const sp = L.species, fur = L.skin;
    if (sp === 'cat') {
      for (const sd of [-1, 1]) {
        c.beginPath(); c.moveTo(sd * 34, -278); c.lineTo(sd * 92, -356); c.lineTo(sd * 100, -262); c.closePath(); fillStroke(c, fur);
        c.beginPath(); c.moveTo(sd * 54, -286); c.lineTo(sd * 88, -332); c.lineTo(sd * 90, -278); c.closePath(); c.fillStyle = '#ffb3c1'; c.fill();
      }
    } else if (sp === 'bear') {
      for (const sd of [-1, 1]) {
        c.beginPath(); c.arc(sd * 66, -288, 30, 0, 7); fillStroke(c, fur);
        c.beginPath(); c.arc(sd * 66, -288, 16, 0, 7); fillStroke(c, '#7a4a2e', 4);
      }
    } else if (sp === 'mouse') {
      for (const sd of [-1, 1]) {
        c.beginPath(); c.arc(sd * 74, -284, 42, 0, 7); fillStroke(c, fur);
        c.beginPath(); c.arc(sd * 74, -284, 26, 0, 7); fillStroke(c, '#ffb3c1', 4);
      }
    } else if (sp === 'rabbit') {
      for (const sd of [-1, 1]) {
        c.save(); c.translate(sd * 40, -300); c.rotate(sd * 0.22);
        c.beginPath(); c.ellipse(0, -62, 24, 70, 0, 0, 7); fillStroke(c, fur);
        c.beginPath(); c.ellipse(0, -62, 12, 54, 0, 0, 7); fillStroke(c, '#ffb3c1', 4);
        c.restore();
      }
    } else if (sp === 'dog') {
      for (const sd of [-1, 1]) {
        c.beginPath(); c.ellipse(sd * 92, -222, 26, 56, sd * 0.2, 0, 7); fillStroke(c, shade(fur, -0.18));
      }
    } else if (sp === 'lion') {
      c.beginPath();
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2, rr = i % 2 ? 128 : 160;
        c.lineTo(Math.cos(a) * rr, -206 + Math.sin(a) * rr * 0.98);
      }
      c.closePath(); fillStroke(c, '#c47a2b');
      c.beginPath(); c.arc(0, -206, 122, 0, 7); fillStroke(c, '#e0a44a');
      for (const sd of [-1, 1]) { c.beginPath(); c.arc(sd * 52, -288, 24, 0, 7); fillStroke(c, fur); }
    } else if (sp === 'monkey') {
      for (const sd of [-1, 1]) {
        c.beginPath(); c.arc(sd * 102, -200, 26, 0, 7); fillStroke(c, fur);
        c.beginPath(); c.arc(sd * 102, -200, 14, 0, 7); fillStroke(c, L.face || shade(fur, 0.45), 4);
      }
    }
  }

  function muzzle(c, L, P) {
    const sp = L.species, face = L.face || shade(L.skin, 0.45);
    if (sp === 'person') {                                     // little nose + smile lines
      c.beginPath(); c.moveTo(-9, -192); c.quadraticCurveTo(0, -184, 9, -192); c.lineWidth = 5; c.stroke();
      return;
    }
    if (sp === 'monkey') {                                     // wide heart shaped face mask
      c.beginPath(); c.ellipse(0, -186, 64, 60, 0, 0, 7); fillStroke(c, face, 5);
      c.beginPath(); c.ellipse(0, -168, 42, 34, 0, 0, 7); fillStroke(c, shade(L.skin, 0.7), 4);
    } else if (sp === 'mouse') {
      c.beginPath(); c.ellipse(0, -178, 46, 40, 0, 0, 7); fillStroke(c, face, 5);
    } else if (sp === 'rabbit') {
      c.beginPath(); c.ellipse(0, -176, 48, 38, 0, 0, 7); fillStroke(c, face, 5);
    } else {
      c.beginPath(); c.ellipse(0, -172, sp === 'bear' ? 62 : 54, sp === 'bear' ? 48 : 38, 0, 0, 7); fillStroke(c, face, 5);
    }
    // nose
    if (sp === 'cat') {
      c.beginPath(); c.moveTo(-13, -196); c.lineTo(13, -196); c.lineTo(0, -184); c.closePath(); fillStroke(c, '#e08fa0', 4);
    } else if (sp === 'lion') {
      c.beginPath(); c.moveTo(-16, -196); c.lineTo(16, -196); c.lineTo(0, -180); c.closePath(); fillStroke(c, '#5c3620', 4);
    } else {
      c.beginPath(); c.ellipse(0, -192, 15, 12, 0, 0, 7); fillStroke(c, sp === 'mouse' ? '#e08fa0' : '#3b2314', 4);
      c.beginPath(); c.ellipse(-4, -196, 5, 4, 0, 0, 7); c.fillStyle = 'rgba(255,255,255,.6)'; c.fill();
    }
    // whiskers
    if (sp === 'cat' || sp === 'mouse' || sp === 'lion' || sp === 'rabbit') {
      c.lineWidth = 3.5;
      for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) {
        c.beginPath(); c.moveTo(sd * 30, -178 + k * 8); c.lineTo(sd * (72 + k * 6), -186 + k * 14); c.stroke();
      }
    }
  }

  function tail(c, L, P) {
    const sp = L.species;
    if (sp === 'person' || sp === 'bear' || sp === 'rabbit') {
      if (sp === 'bear') { c.beginPath(); c.arc(-56, -76, 20, 0, 7); fillStroke(c, shade(L.skin, -0.12)); }
      if (sp === 'rabbit') { c.beginPath(); c.arc(58, -84, 22, 0, 7); fillStroke(c, '#fffaf0'); }
      return;
    }
    const t = P.t || 0, sw = Math.sin(t * 3 + (L.seed % 9)) * 0.35, up = (P.step || 0) > 0 ? Math.sin(P.step) * 0.2 : 0;
    c.save(); c.translate(-46, -70);
    if (sp === 'monkey') {
      c.beginPath(); c.moveTo(0, 0);
      c.bezierCurveTo(-60, 30 + sw * 20, -96, -40, -40, -74 + sw * 10);
      c.bezierCurveTo(-20, -86, -6, -66, -22, -54);
      c.lineWidth = 16; c.strokeStyle = INK; c.stroke(); c.lineWidth = 9; c.strokeStyle = L.skin; c.stroke();
    } else if (sp === 'cat') {
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-70, 10 + sw * 20, -40, -90 - up * 40);
      c.lineWidth = 15; c.strokeStyle = INK; c.stroke(); c.lineWidth = 9; c.strokeStyle = L.skin; c.stroke();
    } else if (sp === 'mouse') {
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-90, 40 + sw * 20, -140, -20 + sw * 30);
      c.lineWidth = 8; c.strokeStyle = '#e08fa0'; c.stroke();
    } else if (sp === 'dog') {
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-56, -10, -78, -84 - up * 50 - sw * 20);
      c.lineWidth = 18; c.strokeStyle = INK; c.stroke(); c.lineWidth = 11; c.strokeStyle = L.skin; c.stroke();
    } else if (sp === 'lion') {
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-56, 20, -46, -80 - up * 40);
      c.lineWidth = 14; c.strokeStyle = INK; c.stroke(); c.lineWidth = 9; c.strokeStyle = L.skin; c.stroke();
      c.beginPath(); c.arc(-48, -92 - up * 40, 16, 0, 7); fillStroke(c, '#7a4a2e');
    }
    c.strokeStyle = INK; c.restore();
  }

  // ======================================================= face
  function eyes(c, L, P) {
    for (const sd of [-1, 1]) {
      const ex = sd * 35, ey = -216;
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
    const B = { flat: [-258, -258], up: [-274, -278], angry: [-244, -268], sad: [-272, -248] };
    c.lineWidth = 8; c.lineCap = 'round'; c.strokeStyle = INK;
    for (const sd of [-1, 1]) {
      const k = P.brow === 'confused' ? (sd < 0 ? 'up' : 'angry') : P.brow, b = B[k] || B.flat;
      c.beginPath(); c.moveTo(sd * 14, b[0]); c.quadraticCurveTo(sd * 34, Math.min(b[0], b[1]) - 6, sd * 54, b[1]); c.stroke();
    }
    if (P.sweat) {
      c.fillStyle = '#8fd6ff'; c.strokeStyle = INK; c.lineWidth = 4;
      c.beginPath(); c.moveTo(96, -276); c.quadraticCurveTo(118, -248, 96, -238); c.quadraticCurveTo(74, -248, 96, -276); fillStroke(c, '#8fd6ff', 4);
    }
    if (P.angryMark) {
      c.strokeStyle = '#e63946'; c.lineWidth = 6;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(86, -300, 16, i * 2.1, i * 2.1 + 1.1); c.stroke(); }
      c.strokeStyle = INK;
    }
  }

  function mouth(c, P) {
    const m = P.mouth, o = P.open; c.lineWidth = 6; c.lineCap = 'round'; c.strokeStyle = INK;
    if (m === 'laugh' || m === 'open' || m === 'shout') {
      const h = (m === 'laugh' ? 30 : m === 'shout' ? 26 : 8) + o * 20, w = m === 'laugh' ? 38 : m === 'shout' ? 28 : 25;
      c.beginPath(); c.moveTo(-w, -172); c.quadraticCurveTo(0, -180, w, -172);
      c.bezierCurveTo(w - 4, -172 + h * 1.35, -w + 4, -172 + h * 1.35, -w, -172);
      fillStroke(c, '#7a1f2e');
      c.save(); c.clip();
      c.fillStyle = '#fff'; c.fillRect(-w, -176, w * 2, m === 'laugh' || m === 'shout' ? 12 : 8);
      if (m !== 'shout') { c.fillStyle = '#ff7a8a'; c.beginPath(); c.ellipse(0, -172 + h * 1.15, w * 0.6, h * 0.4 + 3, 0, 0, 7); c.fill(); }
      c.restore();
      c.beginPath(); c.moveTo(-w, -172); c.quadraticCurveTo(0, -180, w, -172);
      c.bezierCurveTo(w - 4, -172 + h * 1.35, -w + 4, -172 + h * 1.35, -w, -172); c.stroke();
    } else if (m === 'o') {
      c.beginPath(); c.ellipse(0, -164, 11 + o * 4, 13 + o * 6, 0, 0, 7); fillStroke(c, '#7a1f2e');
    } else if (m === 'grin') {
      c.beginPath(); c.moveTo(-32, -170); c.quadraticCurveTo(0, -138, 32, -170); c.quadraticCurveTo(0, -160, -32, -170);
      fillStroke(c, '#7a1f2e', 5); c.beginPath(); c.moveTo(-32, -170); c.quadraticCurveTo(0, -138, 32, -170); c.stroke();
    } else if (m === 'frown') {
      c.beginPath(); c.moveTo(-22, -152); c.quadraticCurveTo(0, -176, 22, -152); c.stroke();
    } else if (m === 'wobble') {
      c.beginPath(); c.moveTo(-24, -160); c.quadraticCurveTo(-8, -172, 2, -158); c.quadraticCurveTo(12, -144, 24, -156); c.stroke();
    } else if (m === 'flat') {
      c.beginPath(); c.moveTo(-16, -162); c.lineTo(16, -162); c.stroke();
    } else {
      c.beginPath(); c.moveTo(-28, -174); c.quadraticCurveTo(0, -146, 28, -174); c.stroke();
    }
  }

  function head(c, L, P) {
    const hs = headScale(L);
    c.save(); c.scale(hs, hs);
    if (L.species === 'person') { hairBack(c, L); for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * 96, -204, 14, 20, 0, 0, 7); fillStroke(c, L.skin); } }
    else earsBack(c, L);
    c.beginPath(); c.moveTo(0, -302); c.bezierCurveTo(74, -302, 104, -256, 98, -206);
    c.bezierCurveTo(92, -160, 54, -126, 0, -126); c.bezierCurveTo(-54, -126, -92, -160, -98, -206);
    c.bezierCurveTo(-104, -256, -74, -302, 0, -302); fillStroke(c, L.skin);
    if (L.species !== 'person') {                             // belly-coloured face patch
      c.beginPath(); c.ellipse(0, -192, 70, 68, 0, 0, 7); c.fillStyle = L.face || shade(L.skin, 0.45); c.fill();
    }
    if (L.freckles) {
      c.fillStyle = 'rgba(190,110,70,.5)';
      for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(sd * (58 + i * 9), -186 + i * 7, 2.6, 0, 7); c.fill(); }
    }
    c.fillStyle = 'rgba(255,90,110,.28)';
    for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * 66, -176, 19, 10, 0, 0, 7); c.fill(); }
    c.strokeStyle = INK;
    eyes(c, L, P); facialHair(c, L); muzzle(c, L, P); mouth(c, P);
    if (L.species === 'person') { hairFront(c, L); hat(c, L); }
    if (P.cry) for (const sd of [-1, 1]) {
      c.fillStyle = '#8fd6ff'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(sd * 35, -198); c.quadraticCurveTo(sd * 46, -158, sd * 35, -140);
      c.quadraticCurveTo(sd * 22, -158, sd * 35, -198); fillStroke(c, '#8fd6ff', 4);
    }
    c.restore();
  }

  function torso(c, L, P) {
    const bw = bodyW(L);
    c.fillStyle = L.skin; c.fillRect(-16, -152, 32, 26);
    c.beginPath(); c.moveTo(-46 * bw, -142); c.quadraticCurveTo(0, -128, 46 * bw, -142);
    c.bezierCurveTo(64 * bw, -108, 60 * bw, -74, 52 * bw, -46);
    c.quadraticCurveTo(0, -32, -52 * bw, -46);
    c.bezierCurveTo(-60 * bw, -74, -64 * bw, -108, -46 * bw, -142); c.closePath();
    c.fillStyle = L.top; c.fill();
    c.save(); c.clip();
    c.fillStyle = 'rgba(255,255,255,.9)'; c.fillRect(-80, -130, 160, 9);
    if (L.build === 'buff') c.fillRect(-80, -62, 160, 10);
    c.restore();
    c.lineWidth = 6; c.stroke();
    c.fillStyle = '#fff';
    c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 8 : 17, a = i * Math.PI / 5 - Math.PI / 2; c.lineTo(Math.cos(a) * r, -98 + Math.sin(a) * r); }
    c.closePath(); c.fill();
  }

  function draw(c, L, P, x, y, s, flip) {
    const sc = (s || 1) * heightOf(L);
    const sq = P.sq || 0;
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(0,0,0,' + Math.max(0.06, 0.22 - Math.min(0.14, -P.dy / 900)) + ')';
    c.beginPath(); c.ellipse(0, 4, 70 * sc * (1 + P.dy / 600), 14 * sc, 0, 0, 7); c.fill();
    c.scale(flip ? -sc : sc, sc); c.scale(1 + sq, 1 - sq);
    c.translate(P.dx || 0, P.dy || 0);
    c.lineJoin = 'round'; c.strokeStyle = INK; c.lineCap = 'round';

    if (L.cape) {
      const sway = Math.sin((P.t || 0) * 4 + L.seed % 10) * 14;
      c.beginPath(); c.moveTo(-62, -146); c.lineTo(62, -146);
      c.quadraticCurveTo(80 + sway, -50, 44 + sway, 26); c.quadraticCurveTo(0, 6, -44 + sway, 26);
      c.quadraticCurveTo(-80 + sway, -50, -62, -146); fillStroke(c, '#e63946');
    }
    tail(c, L, P);
    for (const sd of [-1, 1]) {
      const ph = (P.step || 0) + (sd < 0 ? 0 : Math.PI);
      const fx = sd * 26 + Math.sin(ph) * (P.stepAmp || 0) * 32;
      const fy = -Math.max(0, Math.cos(ph)) * (P.stepAmp || 0) * 18 - (P.tuck || 0) * 36;
      limb(c, sd * 24, -70, fx, fy - 18, 25, L.pants);
      c.beginPath(); c.ellipse(fx + 12, fy - 10, 34, 16, 0, 0, 7); fillStroke(c, L.shoe);
      c.beginPath(); c.ellipse(fx + 12, fy - 4, 34, 7, 0, 0, 7); fillStroke(c, INK, 3);
      c.beginPath(); c.ellipse(fx + 14, fy - 16, 14, 5, 0, 0, 7); fillStroke(c, 'rgba(255,255,255,.55)', 2);
    }
    const arms = [-1, 1].map(sd => {
      const a = sd < 0 ? (P.armL || 0) : (P.armR || 0), sx = sd * 46, sy = -134;
      return { sd, sx, sy, hx: sx + sd * Math.sin(a) * 82, hy: sy + Math.cos(a) * 82 };
    });
    for (const A of arms) limb(c, A.sx, A.sy, A.hx, A.hy, 21, L.top);
    torso(c, L, P);
    c.save(); c.translate((P.headX || 0) + (P.lean || 0) * 26, -135 + (P.headY || 0)); c.rotate(P.tilt || 0); c.translate(0, 135);
    head(c, L, P);
    c.restore();
    for (const A of arms) { c.beginPath(); c.arc(A.hx, A.hy, 14, 0, 7); fillStroke(c, L.skin); }
    c.restore();
  }

  return { look, draw, SPECIES, shade };
})();
