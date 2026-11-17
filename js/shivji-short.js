// A hand-drawn, real-time 2D devotional cartoon. No copyrighted audio is bundled.
(function () {
  'use strict';

  const canvas = document.getElementById('shivCanvas');
  const c = canvas.getContext('2d');
  const W = 540, H = 960, DURATION = 60;
  const $ = id => document.getElementById(id);
  const playButton = $('playButton');
  const restartButton = $('restartButton');
  const downloadButton = $('downloadButton');
  const status = $('exportStatus');
  const progress = $('progressBar');
  const currentTime = $('currentTime');
  const sceneName = $('sceneName');
  const playIcon = $('playIcon');
  const playLabel = $('playLabel');

  const COLORS = {
    ink: '#071326', blue: '#70bde9', blueDark: '#3d82b9', hair: '#17243a',
    saffron: '#f1a13d', gold: '#ffd36b', snow: '#d9eff9', cyan: '#65dcff',
    tiger: '#df8b28', cream: '#fff6df', red: '#d45745'
  };

  const scenes = [
    { start: 0, end: 12, name: 'Kailash ki subah' },
    { start: 12, end: 26, name: 'Shiv dhyan' },
    { start: 26, end: 42, name: 'Divya Tandav' },
    { start: 42, end: 54, name: 'Mandir aur aashirwad' },
    { start: 54, end: 60, name: 'Har Har Mahadev' }
  ];

  let t = 0;
  let playing = false;
  let startedAt = 0;
  let offset = 0;
  let raf = 0;
  let exporting = false;
  let recorder = null;

  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const ease = p => p * p * (3 - 2 * p);
  const wave = (time, speed = 1, phase = 0) => Math.sin(time * speed + phase);

  function roundedRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function circle(ctx, x, y, r, color) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (color) { ctx.fillStyle = color; ctx.fill(); }
  }

  function line(ctx, pts, color, width, close) {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    if (close) ctx.closePath();
    if (color) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); }
  }

  function glow(ctx, x, y, r, color, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color.replace('ALPHA', String(alpha)));
    g.addColorStop(.45, color.replace('ALPHA', String(alpha * .42)));
    g.addColorStop(1, color.replace('ALPHA', '0'));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function drawText(ctx, title, subtitle, y, alpha = 1) {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,.75)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 3;
    ctx.font = '700 35px Hind, Noto Sans Devanagari, Arial, sans-serif';
    ctx.fillStyle = '#fff8e8'; ctx.fillText(title, W / 2, y);
    if (subtitle) {
      ctx.font = '600 12px Manrope, Arial, sans-serif';
      ctx.fillStyle = '#9de9ff'; ctx.letterSpacing = '3px'; ctx.fillText(subtitle, W / 2, y + 25);
    }
    ctx.restore();
  }

  const stars = Array.from({ length: 95 }, (_, i) => ({
    x: (i * 97 + 31) % W, y: (i * 53 + 17) % 590,
    r: .55 + (i % 4) * .38, phase: i * .73
  }));
  const sparks = Array.from({ length: 46 }, (_, i) => ({
    x: (i * 83 + 23) % W, y: (i * 119 + 41) % H,
    s: 1 + (i % 4) * .65, phase: i * .91, speed: 8 + (i % 7) * 3
  }));
  const petals = Array.from({ length: 22 }, (_, i) => ({
    x: (i * 113 + 19) % W, y: (i * 71 + 7) % H, phase: i * .62, speed: 19 + i % 6 * 4
  }));

  function skyGradient(top, bottom) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }

  function drawStars(time, alpha = 1) {
    c.save(); c.globalAlpha *= alpha;
    stars.forEach(s => {
      const a = .35 + .65 * Math.abs(wave(time, 1.8, s.phase));
      circle(c, s.x, s.y, s.r * (1 + a * .5), `rgba(222,248,255,${a})`);
    });
    c.restore();
  }

  function drawCloud(x, y, scale, time, alpha = .8) {
    c.save(); c.globalAlpha *= alpha; c.translate(x, y); c.scale(scale, scale);
    const g = c.createLinearGradient(0, -30, 0, 35);
    g.addColorStop(0, '#f0fbff'); g.addColorStop(1, '#8dafc7'); c.fillStyle = g;
    [[0, 3, 33], [33, -10, 42], [72, 3, 31], [34, 11, 39]].forEach(p => circle(c, p[0], p[1] + wave(time, .7, p[0]) * 1.3, p[2]));
    c.restore();
  }

  function drawMountain(baseY, peakX, peakY, width, color, snow, shift = 0) {
    c.save(); c.translate(shift, 0);
    c.beginPath(); c.moveTo(peakX - width, baseY); c.lineTo(peakX, peakY); c.lineTo(peakX + width, baseY); c.closePath();
    c.fillStyle = color; c.fill();
    if (snow) {
      c.beginPath(); c.moveTo(peakX, peakY); c.lineTo(peakX - width * .29, lerp(peakY, baseY, .35));
      c.lineTo(peakX - width * .12, lerp(peakY, baseY, .30)); c.lineTo(peakX, lerp(peakY, baseY, .43));
      c.lineTo(peakX + width * .13, lerp(peakY, baseY, .29)); c.lineTo(peakX + width * .31, lerp(peakY, baseY, .38)); c.closePath();
      c.fillStyle = snow; c.fill();
    }
    c.restore();
  }

  function drawMountains(time, dawn) {
    const drift = wave(time, .07) * 5;
    drawMountain(675, 75, 405, 260, dawn ? '#507799' : '#172d52', dawn ? '#bfd8e8' : '#7a9fbe', drift * .25);
    drawMountain(665, 465, 370, 280, dawn ? '#426b90' : '#132647', dawn ? '#cce4ef' : '#6288a9', drift * -.25);
    drawMountain(700, 275, 295, 330, dawn ? '#345d83' : '#0f203c', dawn ? '#e3f2f7' : '#86a9c0', drift * .55);
    const haze = c.createLinearGradient(0, 520, 0, 760);
    haze.addColorStop(0, dawn ? 'rgba(207,241,255,.1)' : 'rgba(83,158,209,.08)');
    haze.addColorStop(1, dawn ? '#173552' : '#07162c'); c.fillStyle = haze; c.fillRect(0, 520, W, 280);
  }

  function drawSparks(time, color = '#9beaff', upward = true) {
    c.save(); c.globalCompositeOperation = 'screen';
    sparks.forEach((p, i) => {
      const yy = upward ? (p.y - time * p.speed + H * 4) % H : (p.y + time * p.speed) % H;
      const xx = p.x + wave(time, .9, p.phase) * 16;
      const a = .2 + .6 * Math.abs(wave(time, 2, p.phase));
      c.fillStyle = color; c.globalAlpha = a;
      circle(c, xx, yy, p.s);
      c.strokeStyle = color; c.lineWidth = .65; c.beginPath(); c.moveTo(xx, yy + 9); c.lineTo(xx, yy - 5); c.stroke();
    });
    c.restore();
  }

  function drawAura(x, y, r, time, strong) {
    c.save(); c.globalCompositeOperation = 'screen';
    glow(c, x, y, r * 1.25, 'rgba(79,211,255,ALPHA)', strong ? .48 : .25);
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.arc(x, y, r + i * 14 + wave(time, 1.4, i) * 4, 0, Math.PI * 2);
      c.strokeStyle = i === 1 ? 'rgba(255,182,72,.48)' : 'rgba(96,224,255,.5)';
      c.lineWidth = 2.2 - i * .45; c.setLineDash([7 + i * 2, 12 + i * 3]); c.lineDashOffset = -time * (10 + i * 5); c.stroke();
    }
    c.setLineDash([]); c.restore();
  }

  function drawLimb(ctx, x1, y1, x2, y2, width, color) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = COLORS.ink; ctx.lineWidth = width + 6; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  function drawDamru(ctx, x, y, scale, angle, time) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle + wave(time, 7) * .06); ctx.scale(scale, scale);
    ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 5; ctx.fillStyle = '#b65b32';
    ctx.beginPath(); ctx.moveTo(-25, -22); ctx.quadraticCurveTo(-8, 0, -25, 22); ctx.lineTo(25, 22); ctx.quadraticCurveTo(8, 0, 25, -22); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ead4a9';
    for (const yy of [-22, 22]) { ctx.beginPath(); ctx.ellipse(0, yy, 26, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-22, -17); ctx.lineTo(22, 17); ctx.moveTo(22, -17); ctx.lineTo(-22, 17); ctx.stroke();
    ctx.strokeStyle = '#e8cf9d'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(33, wave(time, 8) * 8); ctx.stroke(); circle(ctx, 36, wave(time, 8) * 8, 4, COLORS.gold);
    ctx.restore();
  }

  function drawTrident(ctx, x, y, scale, time, glowIt) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    if (glowIt) glow(ctx, 0, -165, 90, 'rgba(255,187,76,ALPHA)', .22 + .08 * wave(time, 2));
    ctx.strokeStyle = '#3a2730'; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(0, -180); ctx.stroke();
    ctx.strokeStyle = '#d5973d'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(0, -180); ctx.stroke();
    ctx.fillStyle = COLORS.gold; ctx.strokeStyle = '#3a2730'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(0, -245); ctx.lineTo(-10, -210); ctx.lineTo(0, -175); ctx.lineTo(10, -210); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 7, -183); ctx.bezierCurveTo(s * 47, -191, s * 55, -221, s * 42, -251);
      ctx.bezierCurveTo(s * 73, -221, s * 68, -172, s * 17, -160); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  function drawTigerCloth(ctx, standing) {
    ctx.fillStyle = COLORS.tiger; ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 5;
    if (standing) {
      ctx.beginPath(); ctx.moveTo(-55, -205); ctx.lineTo(58, -205); ctx.lineTo(45, -102); ctx.lineTo(10, -74); ctx.lineTo(-14, -105); ctx.lineTo(-49, -78); ctx.closePath();
    } else {
      ctx.beginPath(); ctx.moveTo(-73, -133); ctx.quadraticCurveTo(0, -155, 73, -133); ctx.lineTo(61, -79); ctx.quadraticCurveTo(0, -59, -61, -79); ctx.closePath();
    }
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#3c261b'; ctx.lineWidth = 6;
    [[-38,-185,-23,-148],[0,-198,-7,-154],[37,-183,23,-143]].forEach(p => {
      const yOff = standing ? 0 : 70; ctx.beginPath(); ctx.moveTo(p[0], p[1] + yOff); ctx.lineTo(p[2], p[3] + yOff); ctx.stroke();
    });
  }

  function drawNecklace(ctx, y, time) {
    ctx.strokeStyle = '#5b2f23'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, y, 49, .18, Math.PI - .18); ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = .22 + i * (Math.PI - .44) / 11;
      circle(ctx, Math.cos(a) * 49, y + Math.sin(a) * 49, 4 + .35 * wave(time, 2, i), '#6c3828');
    }
  }

  function drawShivaFace(ctx, y, scale, time, opts) {
    const closed = opts.closed;
    ctx.save(); ctx.translate(0, y); ctx.scale(scale, scale);
    const sway = wave(time, 1.1) * (opts.dynamic ? 5 : 1.4);

    // Flowing hair behind the head.
    ctx.strokeStyle = COLORS.ink; ctx.lineCap = 'round';
    for (let i = 0; i < (opts.dynamic ? 8 : 5); i++) {
      const side = opts.dynamic ? 1 : (i % 2 ? -1 : 1);
      ctx.lineWidth = 14 - i * .6; ctx.beginPath(); ctx.moveTo(side * (32 + i * 3), -28 + i * 7);
      ctx.bezierCurveTo(side * (72 + i * 8), -15 + sway, side * (88 + i * 12), 22 + wave(time, 1.8, i) * 8, side * (105 + i * 9), 45 + i * 5); ctx.stroke();
    }

    // Ears and face.
    ctx.fillStyle = COLORS.blue; ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 5;
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(side * 54, 0, 12, 18, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(0, -8, 55, 70, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // Hair cap and bun.
    ctx.fillStyle = COLORS.hair;
    ctx.beginPath(); ctx.arc(0, -36, 53, Math.PI, Math.PI * 2); ctx.lineTo(50, -20); ctx.bezierCurveTo(28, -46, 7, -45, -9, -29); ctx.bezierCurveTo(-25, -44, -39, -39, -51, -20); ctx.closePath(); ctx.fill(); ctx.stroke();
    circle(ctx, 0, -86, 30, COLORS.hair); circle(ctx, 0, -108, 19, COLORS.hair);
    ctx.strokeStyle = '#835b3b'; ctx.lineWidth = 3;
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.arc(0, -90 + k * 7, 24 - Math.abs(k) * 2, .1, Math.PI - .1); ctx.stroke(); }

    // Crescent moon.
    ctx.fillStyle = '#fff4c9'; circle(ctx, -20, -111, 14); circle(ctx, -14, -116, 12, COLORS.hair);

    // Animated Ganga stream.
    ctx.strokeStyle = '#bff5ff'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.globalAlpha = .92;
    ctx.beginPath(); ctx.moveTo(10, -122); ctx.bezierCurveTo(24 + wave(time, 2) * 3, -99, 13, -81, 28 + wave(time, 2, 2) * 3, -61); ctx.stroke(); ctx.globalAlpha = 1;

    // Vibhuti and third eye.
    ctx.strokeStyle = '#f7f2e6'; ctx.lineWidth = 4;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-18, -35 + k * 7); ctx.quadraticCurveTo(0, -38 + k * 7, 18, -35 + k * 7); ctx.stroke(); }
    ctx.fillStyle = '#a83d3b'; ctx.beginPath(); ctx.ellipse(0, -28, 3, 7, 0, 0, Math.PI * 2); ctx.fill();

    // Eyes blink/open in the blessing scenes.
    const blink = !closed && ((time * .42) % 1 > .92);
    ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      if (closed || blink) { ctx.beginPath(); ctx.arc(side * 20, -6, 11, .12, Math.PI - .12); ctx.stroke(); }
      else {
        ctx.fillStyle = '#f6fbff'; ctx.beginPath(); ctx.ellipse(side * 20, -6, 12, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        circle(ctx, side * 20, -5, 4.5, '#204c72'); circle(ctx, side * 20, -5, 2, COLORS.ink);
      }
      ctx.beginPath(); ctx.moveTo(side * 8, -19); ctx.quadraticCurveTo(side * 20, -24, side * 33, -18); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(-15, 28); ctx.quadraticCurveTo(0, 38, 15, 28); ctx.stroke();

    // Earrings.
    ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 5;
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(side * 57, 17, 10, -.4, Math.PI + .4); ctx.stroke(); }
    ctx.restore();
  }

  function drawSnake(ctx, y, time) {
    ctx.save(); ctx.strokeStyle = '#86a85a'; ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, y, 45, .1, Math.PI - .15); ctx.stroke();
    ctx.fillStyle = '#91b965'; ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 3;
    ctx.save(); ctx.translate(47, y + 8 + wave(time, 1.7) * 2); ctx.rotate(-.25 + wave(time, 1.2) * .08);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(15, -15, 28, 0); ctx.quadraticCurveTo(14, 18, 0, 0); ctx.fill(); ctx.stroke();
    circle(ctx, 18, -2, 1.8, '#12120d'); ctx.restore(); ctx.restore();
  }

  function drawSeatedShiva(ctx, x, baseY, scale, time, closeUp, blessingAmount = 0) {
    const raise = ease(clamp(blessingAmount));
    const breathe = 1 + wave(time, 1.65) * .018;
    const bodyBob = wave(time, 1.65) * 2.2;
    ctx.save(); ctx.translate(x, baseY + bodyBob); ctx.scale(scale, scale);
    drawAura(0, -225, closeUp ? 182 : 150, time, closeUp);

    // Tiger skin beneath the seated pose ripples gently in the mountain wind.
    ctx.fillStyle = '#d7892e'; ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(0, -24, 126 + wave(time, 1.3) * 2, 31, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#3a2318'; ctx.lineWidth = 5;
    for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * 24, -45); ctx.lineTo(i * 18 + wave(time, 1.6, i) * 2, -18); ctx.stroke(); }

    // Crossed legs subtly shift with each breath.
    drawLimb(ctx, -36, -88, 74, -36, 31, COLORS.blue);
    drawLimb(ctx, 37, -88, -73, -36, 31, COLORS.blue);
    ctx.fillStyle = COLORS.blue; ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 5;
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(side * 79, -34 + Math.abs(wave(time, 1.65)) * 1.5, 34, 16, side * .08, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }

    ctx.save(); ctx.scale(1, breathe); ctx.rotate(wave(time, .85) * .008);
    const bodyGrad = ctx.createLinearGradient(-60, -280, 60, -100); bodyGrad.addColorStop(0, '#83caf0'); bodyGrad.addColorStop(1, '#4f99cb');
    ctx.fillStyle = bodyGrad; ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-43, -235); ctx.quadraticCurveTo(-67, -201, -62, -130); ctx.quadraticCurveTo(0, -108, 62, -130); ctx.quadraticCurveTo(67, -201, 43, -235); ctx.closePath(); ctx.fill(); ctx.stroke();
    drawTigerCloth(ctx, false);

    // Left hand remains in mudra while the right hand rises into a blessing.
    const handBob = wave(time, 1.65) * 2;
    drawLimb(ctx, -48, -212, -72, -156, 21, COLORS.blue);
    drawLimb(ctx, -72, -156, -91, -92 + handBob, 20, COLORS.blue);
    const elbowX = lerp(72, 82, raise), elbowY = lerp(-156, -205, raise);
    const handX = lerp(91, 91, raise), handY = lerp(-92 + handBob, -261, raise);
    drawLimb(ctx, 48, -212, elbowX, elbowY, 21, COLORS.blue);
    drawLimb(ctx, elbowX, elbowY, handX, handY, 20, COLORS.blue);
    ctx.fillStyle = COLORS.blue; ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 4;
    circle(ctx, -91, -92 + handBob, 14, COLORS.blue); ctx.stroke();
    circle(ctx, handX, handY, 15, COLORS.blue); ctx.stroke();
    ctx.strokeStyle = '#2d668f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-91, -92 + handBob, 8, .2, Math.PI * 1.7); ctx.stroke();
    ctx.beginPath(); ctx.arc(handX, handY, 8, .2, Math.PI * 1.7); ctx.stroke();
    if (raise > .55) {
      ctx.save(); ctx.globalAlpha = (raise - .55) * 1.7; ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 2;
      for (let i = 0; i < 7; i++) { const a = i * Math.PI / 3.5; ctx.beginPath(); ctx.moveTo(handX + Math.cos(a) * 22, handY + Math.sin(a) * 22); ctx.lineTo(handX + Math.cos(a) * (31 + wave(time, 3, i) * 3), handY + Math.sin(a) * (31 + wave(time, 3, i) * 3)); ctx.stroke(); }
      ctx.restore();
    }
    drawNecklace(ctx, -220, time); drawSnake(ctx, -236, time);
    const eyesClosed = raise < .38 && (!closeUp || time % 8 < 5.8);
    drawShivaFace(ctx, -294, 1, time, { closed: eyesClosed, dynamic: raise > .45 });
    ctx.restore(); ctx.restore();
  }

  function drawStandingShiva(ctx, x, baseY, scale, time, blessing) {
    const tempo = blessing ? 1.7 : 3.7;
    const beat = Math.sin(time * tempo);
    const kick = Math.sin(time * tempo * .5);
    const bounce = blessing ? Math.abs(beat) * 2 : Math.abs(beat) * 13;
    ctx.save(); ctx.translate(x, baseY - bounce); ctx.scale(scale, scale);
    ctx.rotate(blessing ? beat * .018 : beat * .065);
    drawAura(0, -265, 190 + Math.abs(beat) * 7, time, true);

    // A real alternating foot cycle makes the Tandav feel frame-by-frame animated.
    if (blessing) {
      const step = wave(time, 1.7) * 3;
      drawLimb(ctx, -21, -113, -26 - step, -10, 27, COLORS.blue);
      drawLimb(ctx, 21, -113, 30 + step, -10, 27, COLORS.blue);
      ctx.fillStyle = COLORS.blue; ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 5;
      for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(side * 31 + side * step, -3, 28, 12, side * .04, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    } else {
      const liftLeft = Math.max(0, -kick) * 76, liftRight = Math.max(0, kick) * 76;
      const leftX = -25 - liftLeft * .58, rightX = 25 + liftRight * .58;
      drawLimb(ctx, -20, -118, leftX, -7 - liftLeft, 28, COLORS.blue);
      drawLimb(ctx, 20, -118, rightX, -7 - liftRight, 28, COLORS.blue);
      ctx.fillStyle = COLORS.blue; ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(leftX - 3, -2 - liftLeft, 29, 12, liftLeft ? .2 : 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(rightX + 3, -2 - liftRight, 29, 12, liftRight ? -.2 : 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // Dust and divine energy burst beneath every landing foot.
      ctx.save(); ctx.globalAlpha = .35 + .35 * Math.abs(kick); ctx.strokeStyle = COLORS.cyan; ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) { const a = Math.PI + i * Math.PI / 7; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(Math.cos(a) * (48 + i * 3), -3 + Math.sin(a) * 18); ctx.stroke(); }
      ctx.restore();
    }

    const bodyGrad = ctx.createLinearGradient(-70, -390, 70, -135); bodyGrad.addColorStop(0, '#82caf0'); bodyGrad.addColorStop(1, '#4c93c8');
    ctx.fillStyle = bodyGrad; ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-48, -344); ctx.quadraticCurveTo(-75, -292, -60, -202); ctx.lineTo(-52, -191); ctx.quadraticCurveTo(0, -173, 52, -191); ctx.lineTo(60, -202); ctx.quadraticCurveTo(75, -292, 48, -344); ctx.closePath(); ctx.fill(); ctx.stroke();
    drawTigerCloth(ctx, true); drawNecklace(ctx, -324, time); drawSnake(ctx, -343, time);

    // Two-segment arms swing through wide arcs; the damru visibly shakes on every beat.
    const leftElbowX = blessing ? -82 : -74 - beat * 20;
    const leftElbowY = blessing ? -292 : -272 + kick * 25;
    const leftHandX = blessing ? -111 + wave(time, 1.7) * 5 : -120 - beat * 31;
    const leftHandY = blessing ? -254 + wave(time, 1.7) * 8 : -215 + kick * 55;
    const rightElbowX = blessing ? 79 : 76 + beat * 19;
    const rightElbowY = blessing ? -352 : -338 - kick * 23;
    const rightHandX = blessing ? 110 : 124 + beat * 28;
    const rightHandY = blessing ? -395 + wave(time, 1.7) * 5 : -392 - kick * 46;
    drawLimb(ctx, -47, -318, leftElbowX, leftElbowY, 22, COLORS.blue);
    drawLimb(ctx, leftElbowX, leftElbowY, leftHandX, leftHandY, 21, COLORS.blue);
    drawLimb(ctx, 47, -318, rightElbowX, rightElbowY, 22, COLORS.blue);
    drawLimb(ctx, rightElbowX, rightElbowY, rightHandX, rightHandY, 21, COLORS.blue);
    ctx.fillStyle = COLORS.blue; ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 4;
    circle(ctx, leftHandX, leftHandY, 16, COLORS.blue); ctx.stroke();
    circle(ctx, rightHandX, rightHandY, 16, COLORS.blue); ctx.stroke();
    ctx.strokeStyle = '#2d668f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(leftHandX, leftHandY, 8, .2, 2.8); ctx.stroke();
    drawDamru(ctx, rightHandX + 4, rightHandY - 16, .64, -.25 + beat * .25, time * (blessing ? 1 : 1.8));

    drawShivaFace(ctx, -419, 1, time, { closed: !blessing && Math.sin(time * 1.2) < -.65, dynamic: !blessing });
    ctx.restore();
  }

  function drawCaptionPill(text, y, alpha) {
    c.save(); c.globalAlpha *= alpha; c.font = '700 18px Hind, Noto Sans Devanagari, sans-serif';
    const w = Math.min(450, c.measureText(text).width + 42);
    roundedRect(c, (W - w) / 2, y - 27, w, 43, 22);
    c.fillStyle = 'rgba(2,12,29,.76)'; c.fill(); c.strokeStyle = 'rgba(125,226,255,.28)'; c.lineWidth = 1; c.stroke();
    c.textAlign = 'center'; c.fillStyle = '#fff6df'; c.fillText(text, W / 2, y + 2); c.restore();
  }

  function sceneOne(local) {
    const camera = 1 + local * .0038;
    c.save(); c.translate(W / 2, H * .56); c.scale(camera, camera); c.translate(-W / 2, -H * .56);
    skyGradient('#123762', '#e3a45b');
    glow(c, 407, 292, 185, 'rgba(255,207,106,ALPHA)', .5);
    circle(c, 407, 292, 43 + wave(local, 1.2) * 1.5, '#ffe2a1');
    drawMountains(local, true);
    drawCloud(-105 + (local * 16) % 720, 270, .72, local, .52);
    drawCloud(510 - (local * 11) % 760, 410, .54, local, .42);
    // Birds flap across the sunrise instead of sitting in a still background.
    c.strokeStyle = 'rgba(8,34,57,.75)'; c.lineWidth = 3;
    for (let i = 0; i < 4; i++) { const bx = -80 + (local * (25 + i * 3) + i * 120) % 760, by = 225 + i * 27; c.beginPath(); c.moveTo(bx - 12, by); c.quadraticCurveTo(bx - 6, by - 8 - wave(local, 6, i) * 5, bx, by); c.quadraticCurveTo(bx + 6, by - 8 - wave(local, 6, i) * 5, bx + 12, by); c.stroke(); }
    drawSparks(local, '#d8f8ff');
    c.fillStyle = '#0b2036'; c.beginPath(); c.moveTo(0, 820); c.lineTo(117, 704); c.lineTo(220, 733); c.lineTo(340, 681); c.lineTo(540, 777); c.lineTo(540, 960); c.lineTo(0, 960); c.fill();
    const raise = clamp((local - 5.1) / 3.2);
    drawSeatedShiva(c, 270, 804, .78, local, false, raise);
    drawTrident(c, 424 + wave(local, .9) * 2, 790, .72, local, true);
    c.restore();
    const titleAlpha = clamp(local / 1.6) * clamp((12 - local) / 1.2);
    drawText(c, 'कैलाश की शांति', 'A DIVINE BEGINNING', 120, titleAlpha);
    drawCaptionPill('जहाँ मौन में भी शक्ति है', 885, clamp((local - 2) / 1.2));
  }

  function sceneTwo(local) {
    skyGradient('#06172f', '#133b5d'); drawStars(local, .85);
    glow(c, 270, 480, 350, 'rgba(50,177,236,ALPHA)', .24 + .06 * wave(local, 1.6));
    drawMountains(local + 4, false);
    for (let i = 0; i < 4; i++) drawCloud(-80 + i * 180 + local * (i % 2 ? -7 : 9) + wave(local, .25, i) * 25, 655 + i % 2 * 65, .72, local + i, .18);
    drawSparks(local, '#9beaff');
    // Rippling mantra rings travel outwards continuously from the heart.
    c.save(); c.globalCompositeOperation = 'screen';
    for (let i = 0; i < 4; i++) { const cycle = (local * 45 + i * 105) % 390; c.beginPath(); c.arc(270, 520, 45 + cycle, 0, Math.PI * 2); c.strokeStyle = `rgba(111,227,255,${.32 * (1 - cycle / 390)})`; c.lineWidth = 3; c.stroke(); }
    c.restore();
    const zoom = 1 + ease(clamp(local / 14)) * .14;
    const handCycle = local < 3 ? 0 : .5 + .5 * wave(local - 3, .72);
    c.save(); c.translate(W / 2, 700); c.scale(zoom, zoom); c.translate(-W / 2, -700);
    drawSeatedShiva(c, 270 + wave(local, .55) * 5, 800, 1.08, local + 10, true, handCycle); c.restore();
    drawTrident(c, 463 + wave(local, 1.1) * 3, 800, .75, local, false);
    drawText(c, 'ॐ नमः शिवाय', 'BREATHE | BELIEVE | BECOME', 115, clamp(local / 1.1));
    drawCaptionPill('मन स्थिर | आत्मा निर्भय', 890, clamp((local - 2) / 1.2));
  }

  function sceneThree(local) {
    const g = c.createRadialGradient(270, 440, 20, 270, 440, 600);
    g.addColorStop(0, '#164a70'); g.addColorStop(.48, '#071b3d'); g.addColorStop(1, '#030817'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    drawStars(local + 7, 1);
    // The whole camera reacts to the Tandav beat.
    const hit = Math.abs(wave(local, 3.7));
    c.save(); c.translate(wave(local, 7.4) * 3.5, -hit * 5);
    c.save(); c.translate(270, 450); c.rotate(local * .16); c.translate(-270, -450);
    for (let i = 0; i < 6; i++) {
      c.beginPath(); c.arc(270, 445, 145 + i * 29 + wave(local, 1.8, i) * 9, i * .8, i * .8 + Math.PI * 1.3);
      c.strokeStyle = i % 2 ? 'rgba(255,169,66,.4)' : 'rgba(70,210,255,.48)'; c.lineWidth = 5 - i * .48; c.stroke();
    }
    c.restore();
    // Fast energy ribbons travel behind the dancer.
    c.save(); c.globalCompositeOperation = 'screen'; c.lineCap = 'round';
    for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-40, 340 + i * 82); c.bezierCurveTo(140, 245 + i * 85 + wave(local, 2.4, i) * 45, 365, 480 + i * 20 + wave(local, 2.1, i + 2) * 60, 590, 290 + i * 94); c.strokeStyle = i % 2 ? 'rgba(255,165,57,.33)' : 'rgba(57,211,255,.4)'; c.lineWidth = 4 + hit * 3; c.stroke(); }
    c.restore();
    drawSparks(local * 1.9, '#ffb957');
    c.fillStyle = '#081a31'; c.beginPath(); c.moveTo(0, 930); c.lineTo(150, 825); c.lineTo(270, 795); c.lineTo(385, 845); c.lineTo(540, 900); c.lineTo(540, 960); c.lineTo(0, 960); c.fill();
    drawStandingShiva(c, 270, 862, .9 + hit * .012, local + 26, false);
    drawTrident(c, 92 + wave(local, 3.7) * 4, 854, .74, local, true);
    c.restore();
    drawText(c, 'डमरू की गूँज', 'RHYTHM OF THE COSMOS', 112, clamp(local / 1));
    drawCaptionPill('शक्ति | सृजन | परिवर्तन', 896, clamp((local - 1.5) / 1));
  }

  function drawTemple(time) {
    // Distant temple and its illuminated doorway.
    c.fillStyle = '#101d31'; c.beginPath(); c.moveTo(45, 785); c.lineTo(45, 430); c.lineTo(140, 350); c.lineTo(235, 430); c.lineTo(235, 785); c.closePath(); c.fill();
    c.fillStyle = '#243954'; c.fillRect(63, 455, 155, 330);
    c.fillStyle = '#172941'; c.beginPath(); c.moveTo(37, 460); c.lineTo(140, 366); c.lineTo(244, 460); c.closePath(); c.fill();
    c.fillStyle = '#d18a3c'; roundedRect(c, 103, 610, 74, 175, 34); c.fill();
    glow(c, 140, 700, 115, 'rgba(255,155,57,ALPHA)', .36);
    c.strokeStyle = '#a9c6d9'; c.lineWidth = 2;
    for (let x = 77; x < 215; x += 34) { c.beginPath(); c.moveTo(x, 485); c.lineTo(x, 570); c.stroke(); }
    // Bell swings.
    c.save(); c.translate(140, 470); c.rotate(wave(time, 2.2) * .12); c.strokeStyle = COLORS.gold; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 35); c.stroke();
    c.fillStyle = '#d99a3d'; c.beginPath(); c.moveTo(-16, 35); c.quadraticCurveTo(0, 11, 16, 35); c.lineTo(20, 42); c.lineTo(-20, 42); c.closePath(); c.fill(); circle(c, 0, 46, 4, COLORS.gold); c.restore();
  }

  function drawDiyas(time) {
    for (let i = 0; i < 9; i++) {
      const x = 28 + i * 61, y = 885 + (i % 2) * 20;
      c.fillStyle = '#9b512d'; c.beginPath(); c.ellipse(x, y, 20, 7, 0, 0, Math.PI * 2); c.fill();
      const flick = 9 + Math.abs(wave(time, 7, i)) * 7;
      glow(c, x, y - 17, 38, 'rgba(255,160,54,ALPHA)', .25);
      const flame = c.createLinearGradient(x, y - flick * 2, x, y); flame.addColorStop(0, '#fff5b0'); flame.addColorStop(.6, '#ffba42'); flame.addColorStop(1, '#ef622f');
      c.fillStyle = flame; c.beginPath(); c.moveTo(x, y - 4); c.quadraticCurveTo(x - 8, y - 13, x + wave(time, 9, i) * 3, y - flick * 2); c.quadraticCurveTo(x + 9, y - 13, x, y - 4); c.fill();
    }
  }

  function drawNandi(ctx, x, y, scale, time) {
    const trot = wave(time, 3.2), bob = Math.abs(trot) * 5;
    ctx.save(); ctx.translate(x, y - bob); ctx.scale(scale, scale);
    // Wagging tail.
    ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-70, -74); ctx.quadraticCurveTo(-105, -105 + wave(time, 5) * 22, -88, -132); ctx.stroke();
    ctx.strokeStyle = '#e6eef0'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-70, -74); ctx.quadraticCurveTo(-105, -105 + wave(time, 5) * 22, -88, -132); ctx.stroke();
    // Body and moving legs.
    ctx.fillStyle = '#e9f1ee'; ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(-10, -76, 77, 48, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    for (const side of [-1, 1]) {
      const step = side * trot * 8; drawLimb(ctx, side * 39 - 10, -55, side * 39 - 10 + step, -5, 15, '#dce8e7');
      ctx.beginPath(); ctx.ellipse(side * 39 - 7 + step, -2, 18, 8, 0, 0, Math.PI * 2); ctx.fillStyle = '#dce8e7'; ctx.fill(); ctx.stroke();
    }
    // Nodding head, ears, horns and blinking eyes.
    ctx.save(); ctx.translate(62, -101); ctx.rotate(wave(time, 1.8) * .08);
    ctx.fillStyle = '#eef5f1'; ctx.beginPath(); ctx.ellipse(0, 0, 38, 42, -.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(side * 20, -31); ctx.quadraticCurveTo(side * 39, -58, side * 48, -36); ctx.quadraticCurveTo(side * 34, -37, side * 25, -20); ctx.fillStyle = COLORS.gold; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(side * 34, -9, 21, 9, side * .25, 0, Math.PI * 2); ctx.fillStyle = '#cadbda'; ctx.fill(); ctx.stroke();
    }
    const blink = (time * .45) % 1 > .9; ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 4;
    for (const side of [-1, 1]) { if (blink) { ctx.beginPath(); ctx.moveTo(side * 7, -4); ctx.lineTo(side * 20, -4); ctx.stroke(); } else circle(ctx, side * 14, -4, 3.5, COLORS.ink); }
    ctx.fillStyle = '#c8a1a1'; ctx.beginPath(); ctx.ellipse(0, 23, 18, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = COLORS.red; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-10, -22); ctx.lineTo(10, -22); ctx.stroke(); circle(ctx, 0, -22, 3, COLORS.red);
    ctx.restore();
    // Golden bell swings beneath the neck.
    ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(43, -70, 22, .2, Math.PI - .2); ctx.stroke();
    ctx.save(); ctx.translate(43, -48); ctx.rotate(wave(time, 4) * .18); ctx.fillStyle = COLORS.gold; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.lineTo(10, 13); ctx.lineTo(-10, 13); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.restore();
  }

  function drawTransition(p, index) {
    const flash = Math.sin(clamp(p) * Math.PI);
    c.save(); c.globalCompositeOperation = 'screen';
    glow(c, W / 2, H / 2, 130 + flash * 510, index % 2 ? 'rgba(255,170,60,ALPHA)' : 'rgba(70,215,255,ALPHA)', flash * .38);
    c.translate(W / 2, H / 2); c.rotate(p * Math.PI * 1.5);
    for (let i = 0; i < 7; i++) {
      c.beginPath(); c.arc(0, 0, 70 + i * 45 + flash * 85, i * .45, i * .45 + Math.PI * (1.1 + flash * .5));
      c.strokeStyle = i % 2 ? `rgba(255,194,91,${flash * .65})` : `rgba(105,231,255,${flash * .72})`;
      c.lineWidth = 9 - i * .8; c.stroke();
    }
    c.restore();
  }

  function sceneFour(local) {
    const pan = ease(clamp(local / 12));
    c.save(); c.translate((.5 - pan) * 16, 0); c.scale(1 + pan * .025, 1 + pan * .025);
    skyGradient('#06152d', '#7b503b'); drawStars(local + 30, .8);
    circle(c, 438, 130, 46, '#f4edc9'); circle(c, 418, 113, 43, '#07162e');
    drawMountains(local, false); drawTemple(local); drawSparks(local * 1.2, '#ffce72');
    c.fillStyle = '#0b1829'; c.fillRect(0, 785, W, 175); drawDiyas(local);
    drawNandi(c, 112, 855, .72, local + 42);
    drawStandingShiva(c, 374, 846, .72, local + 42, true);
    drawTrident(c, 490 + wave(local, 1.4) * 2, 842, .67, local, false);
    petals.forEach((p, i) => {
      const y = (p.y + local * p.speed) % 790; const x = p.x + wave(local, 1.1, p.phase) * 21;
      c.save(); c.translate(x, y); c.rotate(local * 1.5 + p.phase); c.fillStyle = i % 2 ? '#ffb865' : '#f6e4ba'; c.beginPath(); c.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2); c.fill(); c.restore();
    });
    c.restore();
    drawText(c, 'हर मन में महादेव', 'FAITH LIGHTS THE WAY', 115, clamp(local / 1));
    drawCaptionPill('भय से परे | विश्वास के साथ', 914, clamp((local - 1.5) / 1));
  }

  function sceneFive(local) {
    const pulse = .24 + .08 * wave(local, 2.2);
    skyGradient('#041025', '#102e53'); drawStars(local + 49, .95);
    glow(c, 270, 400, 390, 'rgba(58,194,255,ALPHA)', pulse);
    c.save(); c.globalAlpha = .28; drawMountains(local, false); c.restore();
    c.save(); c.translate(270, 475); c.rotate(local * .12);
    for (let i = 0; i < 16; i++) { c.rotate(Math.PI / 8); const ray = 120 + wave(local, 2.3, i) * 22; const grad = c.createLinearGradient(ray, 0, ray + 150, 0); grad.addColorStop(0, 'rgba(88,220,255,.18)'); grad.addColorStop(1, 'rgba(255,191,83,0)'); c.fillStyle = grad; c.fillRect(ray, -3, 160, 6); }
    c.restore();
    drawSparks(local * 1.4, '#ffd06e');
    const rise = 22 * (1 - ease(clamp(local / 2))), endZoom = 1 + ease(clamp(local / 6)) * .08;
    c.save(); c.translate(270, 700); c.scale(endZoom, endZoom); c.translate(-270, -700 + rise); drawStandingShiva(c, 270, 842, .87, local + 54, true); c.restore();
    const titleA = clamp(local / 1.2) * clamp((6 - local) / .55);
    c.save(); c.globalAlpha = titleA;
    c.textAlign = 'center'; c.shadowColor = '#55d9ff'; c.shadowBlur = 26;
    c.fillStyle = '#fff5dd'; c.font = '700 42px Hind, Noto Sans Devanagari, sans-serif'; c.fillText('हर हर महादेव', 270, 124);
    c.shadowBlur = 9; c.fillStyle = '#8ee9ff'; c.font = '700 17px Manrope, sans-serif'; c.fillText('ॐ  नमः  शिवाय', 270, 160);
    c.restore();
    c.save(); c.globalAlpha = clamp((local - 2.4) / .8) * clamp((6 - local) / .5); c.textAlign = 'center'; c.fillStyle = 'rgba(255,244,217,.88)'; c.font = '600 13px Manrope, sans-serif'; c.fillText('LIKE  •  SHARE  •  महादेव', 270, 913); c.restore();
  }

  const renderers = [sceneOne, sceneTwo, sceneThree, sceneFour, sceneFive];

  function drawFrame(time) {
    const pixelScale = canvas.width / W;
    c.setTransform(pixelScale, 0, 0, canvas.height / H, 0, 0); c.clearRect(0, 0, W, H);
    c.fillStyle = '#020713'; c.fillRect(0, 0, W, H);
    const index = Math.max(0, scenes.findIndex(s => time >= s.start && time < s.end));
    const scene = scenes[index] || scenes[scenes.length - 1];
    renderers[index](Math.max(0, time - scene.start));

    // A fast energy portal hides the cut, avoiding a slideshow-like dissolve.
    if (index < scenes.length - 1) {
      const fade = clamp((time - (scene.end - 1.15)) / 1.15);
      if (fade > 0) {
        c.save(); c.globalAlpha = ease(clamp((fade - .28) / .72)); renderers[index + 1](Math.max(0, time - scenes[index + 1].start)); c.restore();
        drawTransition(fade, index);
      }
    }

    // Film vignette and subtle grain.
    const vignette = c.createRadialGradient(W / 2, H / 2, 280, W / 2, H / 2, 630);
    vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(0,3,12,.54)'); c.fillStyle = vignette; c.fillRect(0, 0, W, H);
    c.save(); c.globalAlpha = .035; c.fillStyle = '#fff';
    for (let i = 0; i < 80; i++) c.fillRect((i * 89 + Math.floor(time * 19) * 17) % W, (i * 131 + Math.floor(time * 23) * 11) % H, 1, 1);
    c.restore();

    updateUI(time, scene);
  }

  function updateUI(time, scene) {
    const safe = clamp(time, 0, DURATION);
    progress.style.width = (safe / DURATION * 100) + '%';
    currentTime.textContent = '00:' + String(Math.floor(safe)).padStart(2, '0');
    sceneName.textContent = scene.name;
  }

  function tick(now) {
    if (!playing) return;
    t = offset + (now - startedAt) / 1000;
    if (t >= DURATION) {
      t = DURATION - .001; playing = false; offset = 0; drawFrame(t); updatePlayButton();
      if (!exporting) status.textContent = 'Animation complete — restart or download it.';
      return;
    }
    drawFrame(t); raf = requestAnimationFrame(tick);
  }

  function play() {
    if (playing) { pause(); return; }
    if (t >= DURATION - .05) { t = 0; offset = 0; }
    playing = true; offset = t; startedAt = performance.now(); updatePlayButton(); raf = requestAnimationFrame(tick);
  }

  function pause() {
    if (!playing || exporting) return;
    t = offset + (performance.now() - startedAt) / 1000;
    playing = false; offset = t; cancelAnimationFrame(raf); updatePlayButton();
  }

  function restart(autoPlay) {
    cancelAnimationFrame(raf); playing = false; t = 0; offset = 0; drawFrame(0); updatePlayButton();
    if (autoPlay) play();
  }

  function updatePlayButton() {
    playIcon.textContent = playing ? 'Ⅱ' : '▶';
    playLabel.textContent = playing ? 'Pause animation' : 'Play animation';
  }

  function supportedMime() {
    if (!window.MediaRecorder) return '';
    return ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type)) || '';
  }

  async function downloadVideo() {
    if (exporting) return;
    const mime = supportedMime();
    if (!canvas.captureStream || !mime) {
      status.textContent = 'Is browser mein video export support nahi hai. Chrome/Edge mein kholiye.';
      return;
    }
    exporting = true; downloadButton.disabled = true; restartButton.disabled = true; playButton.disabled = true;
    status.textContent = 'Recording 00:60 — preview ko khula rakhein…';
    restart(false);
    const stream = canvas.captureStream(30); const chunks = [];
    try {
      recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
      recorder.ondataavailable = event => { if (event.data && event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mime });
        const url = URL.createObjectURL(blob); const a = document.createElement('a');
        a.href = url; a.download = 'shivji-2d-cartoon-short.webm'; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        exporting = false; downloadButton.disabled = false; restartButton.disabled = false; playButton.disabled = false;
        status.textContent = 'Video downloaded! Ab YouTube Shorts mein licensed song add karein.';
      };
      recorder.start(1000); restart(true);
      const exportTimer = setInterval(() => {
        if (!exporting) { clearInterval(exportTimer); return; }
        status.textContent = 'Recording ' + String(Math.min(60, Math.floor(t))).padStart(2, '0') + ':60 — preview ko khula rakhein…';
        if (!playing && t >= DURATION - .05) { clearInterval(exportTimer); recorder.stop(); }
      }, 500);
    } catch (error) {
      exporting = false; downloadButton.disabled = false; restartButton.disabled = false; playButton.disabled = false;
      status.textContent = 'Export problem: ' + error.message;
    }
  }

  // The renderer is also exposed so the exact same animation can be rendered to MP4 offline.
  window.ShivjiShort = { drawFrame, duration: DURATION, width: W, height: H };

  playButton.addEventListener('click', play);
  restartButton.addEventListener('click', () => restart(true));
  downloadButton.addEventListener('click', downloadVideo);
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing && !exporting) pause(); });

  drawFrame(0); updatePlayButton();
  setTimeout(play, 450);
})();
