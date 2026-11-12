// Draws any moment of the cartoon: background, characters, captions, sound words and scene fades.
window.Renderer = (function () {
  const W = 1280, H = 720, FEET = 600, SCALE = 1.0, FADE = 0.5;
  const SFX = { crash: 'CRASH!', boing: 'BOING!', whoosh: 'WHOOSH!', door: 'KNOCK KNOCK!', pop: 'POP!' };
  let raf = 0;

  const dur = b => Math.max(2.2, b.say.split(/\s+/).length * 0.38 + 0.9);

  function build(script) {
    const looks = {}; script.characters.forEach(c => looks[c.name] = Characters.look(c.name));
    let t = 0;
    const scenes = script.scenes.map(sc => {
      const names = [...new Set(sc.beats.map(b => b.who).filter(w => w !== 'Narrator'))];
      const beats = sc.beats.map(b => { const o = Object.assign({}, b, { start: t, dur: dur(b) }); t += o.dur; return o; });
      return { bg: sc.bg, names, beats, start: beats[0].start, end: t };
    });
    return { scenes, looks, total: t };
  }

  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function wrap(c, text, maxW) {
    const out = []; let line = '';
    for (const w of text.split(' ')) { if (c.measureText(line + w).width > maxW && line) { out.push(line.trim()); line = ''; } line += w + ' '; }
    out.push(line.trim()); return out.slice(0, 3);
  }

  function drawAt(c, tl, t) {
    const s = tl.scenes.find(sc => t >= sc.start && t < sc.end) || tl.scenes[tl.scenes.length - 1];
    const beat = s.beats.find(b => t >= b.start && t < b.start + b.dur) || s.beats[s.beats.length - 1];
    const lt = t - s.start, age = t - beat.start, z = 1 + 0.035 * Math.min(1, age / beat.dur);
    c.save(); c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2);
    Scenes.draw(c, s.bg, t);
    const laugh = beat.emotion === 'happy' && /\b(ha ?ha|hehe|laugh)/i.test(beat.say);
    const n = s.names.length, p = Math.min(1, lt / 1.3), ease = 1 - Math.pow(1 - p, 3);
    s.names.forEach((name, i) => {
      const slot = W * (i + 1) / (n + 1), from = slot < W / 2 || (n === 1) ? -170 : W + 170;
      const x = from + (slot - from) * ease, walking = p < 1, speaker = beat.who === name;
      const action = walking ? 'walk' : (speaker || beat.action === 'run' ? beat.action : 'none');
      const P = Acting.pose(tl.looks[name], { t, emotion: walking ? 'happy' : beat.emotion, action, talking: speaker && !walking, laugh: laugh && !walking });
      Characters.draw(c, tl.looks[name], P, x, FEET, SCALE, slot > W / 2 && n > 1);
      c.fillStyle = '#2b1d3a'; c.font = 'bold 22px Trebuchet MS, Verdana, sans-serif'; c.textAlign = 'center';
    });
    c.restore();
    if (beat.sfx && age < 1.1) {                                   // comic sound word
      const k = 1 + 0.5 * Math.max(0, 1 - age * 5);
      c.save(); c.translate(W / 2 + 120, 190); c.rotate(-0.1); c.scale(k, k);
      c.font = '900 96px Impact, "Arial Black", sans-serif'; c.textAlign = 'center'; c.lineJoin = 'round';
      c.lineWidth = 14; c.strokeStyle = '#2b1d3a'; c.strokeText(SFX[beat.sfx], 0, 0);
      c.fillStyle = '#ffd84a'; c.fillText(SFX[beat.sfx], 0, 0); c.restore();
    }
    c.font = 'bold 32px Trebuchet MS, Verdana, sans-serif';          // caption
    const lines = wrap(c, beat.say, W - 260), bh = 34 * lines.length + 34, by = H - bh - 16;
    c.fillStyle = 'rgba(34,32,74,.92)'; rr(c, 70, by, W - 140, bh, 22); c.fill();
    const tag = beat.who, col = tl.looks[tag] ? tl.looks[tag].top : '#ffc93c';
    c.font = 'bold 22px Trebuchet MS, Verdana, sans-serif'; const tw = c.measureText(tag).width + 30;
    c.fillStyle = col; rr(c, 100, by - 18, tw, 36, 18); c.fill(); c.fillStyle = '#2b1d3a'; c.textAlign = 'left'; c.fillText(tag, 115, by + 8);
    c.font = 'bold 32px Trebuchet MS, Verdana, sans-serif'; c.fillStyle = '#fff';
    lines.forEach((l, i) => c.fillText(l, 100, by + 36 + 34 * (i + 0.6)));
    const edge = Math.min(lt / FADE, (s.end - t) / FADE);            // fade between scenes
    if (edge < 1) { c.fillStyle = 'rgba(0,0,0,' + (1 - Math.max(0, edge)) + ')'; c.fillRect(0, 0, W, H); }
  }

  function play(script, canvas, onDone) {
    stop(); canvas.width = W; canvas.height = H;
    const c = canvas.getContext('2d'), tl = build(script), t0 = performance.now();
    (function loop(now) {
      const t = (now - t0) / 1000;
      if (t >= tl.total) { drawAt(c, tl, tl.total - 0.01); if (onDone) onDone(); return; }
      try { drawAt(c, tl, t); } catch (e) { if (window.showError) showError('Drawing failed: ' + e.message); return; }
      raf = requestAnimationFrame(loop);
    })(t0);
  }
  function stop() { cancelAnimationFrame(raf); }
  return { W, H, build, drawAt, play, stop };
})();
