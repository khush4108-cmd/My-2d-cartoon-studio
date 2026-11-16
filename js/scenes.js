// Backgrounds: park, jungle, room, night, beach, street, school.
// Drawn fresh every frame so clouds, waves, fireflies and leaves move (classic cel-animation backgrounds).
window.Scenes = (function () {
  const W = 1280, H = 720;
  const grad = (c, a, b, y0 = 0, y1 = H) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; };
  const circle = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); };
  const rect = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  function cloud(c, x, y, s) { for (const [dx, dy, r] of [[0, 0, 40], [45, -15, 50], [95, 0, 38], [45, 10, 45]]) circle(c, x + dx * s, y + dy * s, r * s, 'rgba(255,255,255,.95)'); }
  function hill(c, y, amp, col, ph) { c.fillStyle = col; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 40) c.lineTo(x, y + Math.sin(x / 190 + ph) * amp); c.lineTo(W, H); c.fill(); }
  function tree(c, x, y, s, col) {
    c.fillStyle = '#8b5a2b'; c.fillRect(x - 14 * s, y - 110 * s, 28 * s, 110 * s);
    for (const [dx, dy, r] of [[0, -150, 70], [-50, -115, 50], [50, -115, 50]]) circle(c, x + dx * s, y + dy * s, r * s, col);
  }
  function clouds(c, t) { for (let i = 0; i < 4; i++) cloud(c, ((t * (8 + i * 3) + i * 380) % 1600) - 200, 90 + i * 55, 0.8 + i * 0.12); }
  function sun(c, t, x, y, col) {
    c.save(); c.translate(x, y); c.rotate(t * 0.2);
    c.fillStyle = col + '55'; for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.fillRect(-9, 62, 18, 40); }
    c.restore(); circle(c, x, y, 55, col);
  }
  function leaf(c, x, y, s, ang, col) {
    c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
    c.fillStyle = col; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(46, -46, 130, 0); c.quadraticCurveTo(46, 46, 0, 0); c.fill();
    c.strokeStyle = 'rgba(20,60,30,.45)'; c.lineWidth = 3; c.beginPath(); c.moveTo(6, 0); c.lineTo(122, 0); c.stroke();
    c.restore(); c.strokeStyle = '#2b1d3a';
  }
  function vine(c, x, y, len, t, col) {
    c.strokeStyle = col; c.lineWidth = 8; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, y);
    for (let i = 0; i < len; i += 20) c.lineTo(x + Math.sin(i / 40 + t * 1.4) * 14, y + i);
    c.stroke(); c.strokeStyle = '#2b1d3a';
  }

  const draw = {
    park(c, t) {
      grad(c, '#6fd0ff', '#e2f7ff', 0, 520); c.fillRect(0, 0, W, H); sun(c, t, 1100, 110, '#ffd84a'); clouds(c, t);
      hill(c, 430, 22, '#8fd98a', 0); tree(c, 180, 540, 1.1, '#3fae4a'); tree(c, 1090, 530, 1, '#49b852');
      hill(c, 520, 14, '#66c35c', 2); rect(c, '#5cb85c', 0, 580, W, H - 580);
      const cols = ['#ff5d73', '#ffd84a', '#fff', '#ff9bd2'];
      for (let i = 0; i < 18; i++) {
        const x = (i * 97) % W, y = 660 + (i * 37) % 50;
        for (let k = 0; k < 5; k++) circle(c, x + Math.cos(k * 1.26) * 7, y + Math.sin(k * 1.26) * 7, 5, cols[i % 4]);
        circle(c, x, y, 4, '#f6a800');
      }
    },

    // Jungle: sunset sky, giant leaves, mushrooms and a big branch (Tom & Jerry jungle vibe)
    jungle(c, t) {
      grad(c, '#ffb347', '#ffe6a7', 0, 300); grad(c, '#ffcf7a', '#7fbf6a', 260, 620);
      c.fillRect(0, 0, W, H);
      circle(c, 300, 250, 90, 'rgba(255,246,190,.85)'); circle(c, 300, 250, 70, 'rgba(255,255,220,.9)');
      c.fillStyle = '#6ba85a'; // far jungle mass
      for (let i = 0; i < 9; i++) {
        const x = i * 165 - 40, h = 200 + (i * 61) % 130;
        c.beginPath(); c.ellipse(x + 80, 600 - h, 140, 110, 0, 0, 7); c.fill();
      }
      for (let i = 0; i < 26; i++) {                       // big background leaves
        const x = (i * 211) % (W + 200) - 100, y = 130 + (i * 97) % 300;
        leaf(c, x, y, 0.55 + (i % 3) * 0.22, Math.sin(i * 1.7 + t * 0.35) * 0.5, i % 2 ? '#3f8f4a' : '#57a95c');
      }
      rect(c, '#4f8f45', 0, 600, W, H - 600);
      c.fillStyle = '#6fae57'; c.beginPath(); c.ellipse(640, 700, 780, 120, 0, 0, 7); c.fill();
      // giant mushrooms
      for (const [mx, my, ms] of [[250, 640, 1], [1030, 660, 1.25], [820, 620, 0.7]]) {
        c.fillStyle = '#e8dcb0'; c.fillRect(mx - 20 * ms, my - 60 * ms, 40 * ms, 60 * ms);
        c.fillStyle = '#8fbf6a'; c.beginPath(); c.ellipse(mx, my - 60 * ms, 90 * ms, 46 * ms, 0, Math.PI, 0); c.fill();
        c.strokeStyle = '#3f7a45'; c.lineWidth = 5; c.stroke(); c.strokeStyle = '#2b1d3a';
      }
      // the big branch
      c.strokeStyle = '#5a3520'; c.lineWidth = 46; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-30, 330); c.quadraticCurveTo(520, 250, 1310, 380); c.stroke();
      c.strokeStyle = '#7a4a2e'; c.lineWidth = 30;
      c.beginPath(); c.moveTo(-30, 330); c.quadraticCurveTo(520, 250, 1310, 380); c.stroke();
      c.strokeStyle = '#2b1d3a';
      // vines
      for (const [vx, vy, vl] of [[180, 270, 260], [980, 300, 200], [1180, 340, 300]]) vine(c, vx, vy, vl, t, '#4a8f4a');
      if (Math.sin(t * 3) > 0.92) {                        // a monkey peeking
        circle(c, 1120, 200, 26, '#8a5a3b'); circle(c, 1100, 186, 10, '#8a5a3b'); circle(c, 1140, 186, 10, '#8a5a3b');
        circle(c, 1113, 200, 4, '#2b1d3a'); circle(c, 1127, 200, 4, '#2b1d3a');
      }
      for (let i = 0; i < 20; i++) {                       // butterflies / sparks
        const x = (i * 137 + Math.sin(t + i) * 40) % W, y = 260 + (i * 61) % 260 + Math.cos(t * 1.4 + i) * 16;
        circle(c, x, y, 3, 'rgba(255,240,140,' + (0.4 + 0.6 * Math.abs(Math.sin(t * 3 + i))) + ')');
      }
    },

    room(c, t) {
      rect(c, '#ffe0b5', 0, 0, W, 580);
      c.fillStyle = 'rgba(255,170,120,.18)'; for (let x = 0; x < W; x += 80) c.fillRect(x, 0, 40, 580);
      rect(c, '#8fd6ff', 880, 110, 260, 240); rect(c, '#fff', 1005, 110, 10, 240); rect(c, '#fff', 880, 225, 260, 10);
      cloud(c, 920 + (t * 6) % 80, 170, 0.5);
      c.strokeStyle = '#a0522d'; c.lineWidth = 12; c.strokeRect(880, 110, 260, 240);
      c.fillStyle = '#ff8fab'; c.beginPath(); c.moveTo(850, 100); c.quadraticCurveTo(900, 220, 860, 380); c.lineTo(830, 380); c.lineTo(830, 100); c.fill();
      c.beginPath(); c.moveTo(1170, 100); c.quadraticCurveTo(1120, 220, 1160, 380); c.lineTo(1190, 380); c.lineTo(1190, 100); c.fill();
      rect(c, '#fff', 180, 120, 150, 110); rect(c, '#7bd3ea', 192, 132, 126, 86); circle(c, 255, 175, 24, '#ffd84a');
      rect(c, '#c68642', 0, 580, W, H - 580); c.strokeStyle = 'rgba(80,40,10,.3)'; c.lineWidth = 3;
      for (let y = 620; y < H; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      c.fillStyle = '#6a4fc9'; c.beginPath(); c.ellipse(640, 670, 420, 46, 0, 0, 7); c.fill();
      rect(c, '#8b5a2b', 90, 470, 14, 110);
      c.fillStyle = '#ffe27a'; c.beginPath(); c.moveTo(60, 470); c.lineTo(134, 470); c.lineTo(112, 410); c.lineTo(82, 410); c.fill();
      c.strokeStyle = '#2b1d3a';
    },

    night(c, t) {
      grad(c, '#0b1030', '#2e2f7a', 0, 560); c.fillRect(0, 0, W, H);
      for (let i = 0; i < 70; i++) circle(c, (i * 173) % W, (i * 71) % 380, 1.5 + (i % 3) * 0.6 + Math.sin(t * 3 + i) * 0.7, '#fff');
      circle(c, 1030, 140, 70, '#f7f3d0'); circle(c, 1010, 120, 12, '#e6e0b4'); circle(c, 1060, 165, 9, '#e6e0b4'); circle(c, 1050, 110, 7, '#e6e0b4');
      hill(c, 450, 24, '#1c3b4a', 1); tree(c, 220, 540, 1.1, '#1b5a45'); tree(c, 1120, 535, 1, '#17503d');
      hill(c, 530, 12, '#1f4d3a', 3); rect(c, '#1b4533', 0, 585, W, H - 585);
      for (let i = 0; i < 14; i++) circle(c, (i * 131 + Math.sin(t + i) * 30) % W, 520 + (i * 53) % 170 + Math.cos(t * 1.3 + i) * 12, 4, 'rgba(255,240,120,' + (0.5 + 0.5 * Math.sin(t * 4 + i)) + ')');
    },

    beach(c, t) {
      grad(c, '#7fdcff', '#f4fcff', 0, 400); c.fillRect(0, 0, W, 400); sun(c, t, 1040, 120, '#ffd84a'); clouds(c, t);
      rect(c, '#2fa8d8', 0, 380, W, 170);
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 6;
      for (let r = 0; r < 4; r++) { c.beginPath(); for (let x = 0; x <= W; x += 20) c.lineTo(x, 410 + r * 36 + Math.sin(x / 60 + t * 2 + r) * 8); c.stroke(); }
      rect(c, '#f6d99b', 0, 540, W, H - 540);
      c.strokeStyle = '#8b5a2b'; c.lineWidth = 22; c.beginPath(); c.moveTo(150, 600); c.quadraticCurveTo(190, 450, 140, 320); c.stroke();
      c.fillStyle = '#34b35a';
      for (let k = 0; k < 6; k++) {
        c.beginPath(); c.moveTo(140, 320);
        c.quadraticCurveTo(140 + Math.cos(k) * 120, 250 + Math.sin(k * 2) * 40 + Math.sin(t * 2 + k) * 6, 140 + Math.cos(k) * 190, 330 + k * 8);
        c.quadraticCurveTo(140 + Math.cos(k) * 100, 310, 140, 320); c.fill();
      }
      circle(c, 700, 690, 18, '#ffb3c1'); circle(c, 940, 665, 14, '#ffd6a5');
      c.strokeStyle = '#2b1d3a';
    },

    street(c, t) {
      grad(c, '#9fd8ff', '#e9f7ff', 0, 500); c.fillRect(0, 0, W, H); clouds(c, t);
      const cols = ['#ff8fab', '#ffd166', '#7bd3ea', '#b8e986', '#c3a6ff', '#ffadad'];
      for (let i = 0; i < 8; i++) {
        const x = i * 170 - 30, h = 260 + (i * 67) % 150; rect(c, cols[i % 6], x, 560 - h, 160, h);
        c.strokeStyle = '#2b1d3a'; c.lineWidth = 4; c.strokeRect(x, 560 - h, 160, h);
        for (let wy = 580 - h; wy < 520; wy += 62) for (let wx = x + 22; wx < x + 130; wx += 52) rect(c, (wx + wy) % 3 ? '#fff6c4' : '#9ad7ee', wx, wy, 30, 38);
      }
      rect(c, '#c9c9d3', 0, 555, W, 40); rect(c, '#4a4a58', 0, 595, W, H - 595);
      c.fillStyle = '#ffd84a'; for (let x = (-t * 60) % 160; x < W; x += 160) c.fillRect(x, 660, 90, 12);
    },

    school(c, t) {
      rect(c, '#bfe6d6', 0, 0, W, 580); rect(c, '#8b5a2b', 190, 100, 580, 280); rect(c, '#2f5d50', 205, 115, 550, 250);
      c.strokeStyle = '#e8f5ee'; c.lineWidth = 5;
      c.beginPath(); c.moveTo(250, 180); c.quadraticCurveTo(320, 140, 380, 190); c.lineTo(520, 190); c.moveTo(250, 260); c.lineTo(600, 260); c.stroke();
      rect(c, '#8fd6ff', 900, 120, 260, 220); rect(c, '#fff', 1025, 120, 10, 220);
      c.strokeStyle = '#fff'; c.lineWidth = 12; c.strokeRect(900, 120, 260, 220);
      circle(c, 840, 90, 34, '#fff');
      c.strokeStyle = '#2b1d3a'; c.lineWidth = 5;
      c.beginPath(); c.arc(840, 90, 34, 0, 7); c.moveTo(840, 90); c.lineTo(840, 68); c.moveTo(840, 90); c.lineTo(856, 98); c.stroke();
      rect(c, '#d9b384', 0, 580, W, H - 580);
      c.strokeStyle = 'rgba(80,40,10,.25)'; c.lineWidth = 3; for (let y = 620; y < H; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      rect(c, '#b5651d', 1000, 520, 200, 20); rect(c, '#8b5a2b', 1020, 540, 14, 70); rect(c, '#8b5a2b', 1166, 540, 14, 70);
      c.strokeStyle = '#2b1d3a';
    }
  };

  return { W, H, KEYS: Object.keys(draw), draw: (c, bg, t) => (draw[bg] || draw.park)(c, t) };
})();
