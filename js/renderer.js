// RENDERER: draws any moment of the cartoon (background, actors, props, sound words, captions, camera moves).
window.Renderer = (function () {
  const W = 1280, H = 720, FEET = 596, FADE = 0.45, TITLE = 1.9, SIZE = 1.12;
  const SFX_WORD = { crash: 'CRASH!', boing: 'BOING!', whoosh: 'WHOOSH!', door: 'KNOCK KNOCK!', pop: 'POP!',
    slide: 'SLIDE!', slideWhistle: 'WHEEE!', bonk: 'BONK!', drum: 'BA-DUM!', ding: 'DING!', sparkle: 'TA-DA!',
    yawn: 'YAAAWN', splat: 'SPLAT!', swoosh: 'SWOOSH!', boo: 'BOOO!', tick: '...', heartbeat: 'THUMP', birds: 'TWEET!', engine: 'VROOM!' };
  let raf = 0;

  const durOf = b => Math.max(1.9, b.say.split(/\s+/).length * 0.36 + 1.0);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- timeline ----------
  function build(script) {
    const looks = {}, sigs = new Set();
    const sig = L => [L.skin, L.hair, L.top, L.pants, L.hairStyle, L.build, L.hat, L.glasses].join('|');
    const unique = (name, extra) => {                       // two characters in one cartoon never look identical
      let L = Characters.look(name, extra), k = 0;
      while (sigs.has(sig(L)) && k < 8) L = Characters.look(name + ' '.repeat(++k), extra);
      sigs.add(sig(L)); return L;
    };
    const tops = new Set();
    const distinctTop = L => {                              // and they never wear the same shirt colour
      let k = 0;
      while (tops.has(L.top) && k < 10) { L.top = Characters.look(L.name + ' #' + (++k)).top; }
      tops.add(L.top); return L;
    };
    (script.characters || []).forEach(c => { looks[c.name] = distinctTop(unique(c.name, c.look)); });
    let t = TITLE;
    const scenes = (script.scenes || []).map((sc, si) => {
      const names = [];
      sc.beats.forEach(b => { if (b.who !== 'Narrator' && !names.includes(b.who)) names.push(b.who); });
      names.forEach(n => { if (!looks[n]) looks[n] = distinctTop(unique(n)); });
      const beats = sc.beats.map(b => {
        const o = Object.assign({}, b, { start: t, dur: durOf(b) });
        t += o.dur;
        return o;
      });
      return { bg: sc.bg, names, beats, start: beats[0].start, end: t, index: si };
    });
    return { scenes, looks, total: t + 0.4, title: script.title || 'My Cartoon' };
  }

  function sceneAt(tl, t) {
    return tl.scenes.find(sc => t >= sc.start && t < sc.end) || tl.scenes[tl.scenes.length - 1];
  }
  function beatAt(s, t) {
    return s.beats.find(b => t >= b.start && t < b.start + b.dur) || s.beats[s.beats.length - 1];
  }

  // ---------- helpers ----------
  function rr(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function wrap(c, text, maxW, maxLines) {
    const out = []; let line = '';
    for (const w of String(text).split(' ')) {
      const test = line ? line + ' ' + w : w;
      if (c.measureText(test).width > maxW && line) { out.push(line); line = w; }
      else line = test;
    }
    if (line) out.push(line);
    return out.slice(0, maxLines || 3);
  }
  function starburst(c, x, y, r1, r2, n, col) {
    c.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? r1 : r2;
      c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    c.closePath(); c.fillStyle = col; c.fill();
    c.lineWidth = 8; c.strokeStyle = '#2b1d3a'; c.stroke();
  }

  // ---------- props ----------
  function prop(c, name, x, y, s, t) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.lineJoin = 'round'; c.strokeStyle = '#2b1d3a'; c.lineWidth = 5;
    switch (name) {
      case 'pie':
        c.beginPath(); c.ellipse(0, 0, 54, 18, 0, 0, 7); c.fillStyle = '#e8b06a'; c.fill(); c.stroke();
        c.beginPath(); c.moveTo(-52, -2); c.quadraticCurveTo(0, 44, 52, -2); c.fillStyle = '#d99a5c'; c.fill(); c.stroke();
        c.beginPath(); c.ellipse(0, -6, 44, 14, 0, 0, 7); c.fillStyle = '#fff4e2'; c.fill(); c.stroke();
        c.fillStyle = '#ff5d73'; c.beginPath(); c.arc(0, -12, 8, 0, 7); c.fill();
        break;
      case 'bomb':
        c.beginPath(); c.arc(0, 0, 42, 0, 7); c.fillStyle = '#2f3440'; c.fill(); c.stroke();
        c.beginPath(); c.arc(-14, -16, 11, 0, 7); c.fillStyle = 'rgba(255,255,255,.55)'; c.fill();
        c.lineWidth = 6; c.beginPath(); c.moveTo(18, -34); c.quadraticCurveTo(38, -62, 26, -78); c.strokeStyle = '#b07a3a'; c.stroke();
        c.fillStyle = '#ffd84a'; star(c, 26, -84, 5, 12, 6);
        break;
      case 'bone':
        c.beginPath(); c.moveTo(-40, 0); c.lineTo(40, 0); c.lineWidth = 18; c.strokeStyle = '#fff6e0'; c.stroke();
        c.lineWidth = 5; c.strokeStyle = '#2b1d3a';
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) { c.beginPath(); c.arc(sx * 44, sy * 9, 12, 0, 7); c.fillStyle = '#fff6e0'; c.fill(); c.stroke(); }
        break;
      case 'hammer':
        c.lineWidth = 16; c.strokeStyle = '#a0522d'; c.beginPath(); c.moveTo(-10, 34); c.lineTo(-10, -26); c.stroke();
        c.lineWidth = 5; c.strokeStyle = '#2b1d3a';
        c.beginPath(); c.rect(-42, -58, 64, 40); c.fillStyle = '#8d99ae'; c.fill(); c.stroke();
        c.fillStyle = '#c9d3e0'; c.fillRect(-38, -54, 56, 10);
        break;
      case 'piano':
        c.beginPath(); c.rect(-96, -40, 192, 90); c.fillStyle = '#5a3a24'; c.fill(); c.stroke();
        c.fillStyle = '#2b1d3a'; for (let i = 0; i < 12; i++) c.fillRect(-90 + i * 15, -34, 10, 26);
        c.fillStyle = '#fff'; for (let i = 0; i < 11; i++) c.fillRect(-84 + i * 15, -34, 8, 26);
        break;
      case 'cake':
        c.beginPath(); c.rect(-46, -30, 92, 50); c.fillStyle = '#ffb3c1'; c.fill(); c.stroke();
        c.beginPath(); c.rect(-46, -44, 92, 18); c.fillStyle = '#fff4e2'; c.fill(); c.stroke();
        c.fillStyle = '#e63946'; c.beginPath(); c.arc(0, -54, 7, 0, 7); c.fill();
        break;
      case 'banana':
        c.beginPath(); c.moveTo(-38, -6); c.quadraticCurveTo(0, 34, 40, -8);
        c.quadraticCurveTo(2, 12, -38, -6); c.fillStyle = '#ffd84a'; c.fill(); c.stroke();
        break;
      case 'flower':
        c.lineWidth = 6; c.beginPath(); c.moveTo(0, 40); c.lineTo(0, -8); c.strokeStyle = '#3fae4a'; c.stroke();
        c.strokeStyle = '#2b1d3a';
        for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c.beginPath(); c.ellipse(Math.cos(a) * 17, -18 + Math.sin(a) * 17, 13, 13, 0, 0, 7); c.fillStyle = '#ff6fa5'; c.fill(); c.stroke(); }
        c.beginPath(); c.arc(0, -18, 11, 0, 7); c.fillStyle = '#ffd84a'; c.fill(); c.stroke();
        break;
      case 'ball':
        c.beginPath(); c.arc(0, 0, 34, 0, 7); c.fillStyle = '#fff'; c.fill(); c.stroke();
        c.beginPath(); c.arc(0, 0, 34, -0.6, 1.2); c.lineWidth = 10; c.strokeStyle = '#2b1d3a'; c.stroke();
        c.lineWidth = 5;
        break;
      case 'bucket':
        c.beginPath(); c.moveTo(-40, -18); c.lineTo(40, -18); c.lineTo(30, 36); c.lineTo(-30, 36); c.closePath(); c.fillStyle = '#9aa5b1'; c.fill(); c.stroke();
        c.beginPath(); c.arc(0, -18, 40, Math.PI, 0); c.stroke();
        c.fillStyle = '#7bd3ea'; c.beginPath(); c.ellipse(0, -18, 36, 8, 0, 0, 7); c.fill();
        break;
      case 'fish':
        c.beginPath(); c.ellipse(0, 0, 40, 22, 0, 0, 7); c.fillStyle = '#8fd6ff'; c.fill(); c.stroke();
        c.beginPath(); c.moveTo(-38, 0); c.lineTo(-64, -20); c.lineTo(-64, 20); c.closePath(); c.fillStyle = '#8fd6ff'; c.fill(); c.stroke();
        c.fillStyle = '#2b1d3a'; c.beginPath(); c.arc(18, -6, 5, 0, 7); c.fill();
        break;
      case 'shoe':
        c.beginPath(); c.moveTo(-40, 20); c.lineTo(-40, -6); c.quadraticCurveTo(6, -14, 34, 6); c.lineTo(44, 20); c.closePath(); c.fillStyle = '#4a4e69'; c.fill(); c.stroke();
        break;
    }
    c.restore();
  }
  function star(c, x, y, r1, r2, n) {
    c.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? r1 : r2; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    c.closePath(); c.fillStyle = '#ffd84a'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#2b1d3a'; c.stroke();
  }

  // ---------- layout ----------
  function slots(s, t) {
    const names = s.names, n = names.length;
    const beat = beatAt(s, t), lt = t - s.start;
    const p = clamp(lt / 1.1, 0, 1), ease = 1 - Math.pow(1 - p, 3);
    return names.map((name, i) => {
      const baseX = n === 1 ? 640 : n === 2 ? [430, 870][i] : n === 3 ? [340, 650, 960][i] : 250 + i * 260;
      const speaker = beat.who === name;
      const forward = speaker ? (baseX < 640 ? 46 : -46) : 0;
      const from = baseX < W / 2 ? -190 : W + 190;
      const x = from + (baseX + forward - from) * ease;
      return { name, x, speaker, side: baseX < 640 ? -1 : 1, flip: n > 1 && baseX < 640 };
    });
  }
  const REACT = { angry: 'scared', scared: 'scared', surprised: 'surprised', sad: 'sad', excited: 'happy', love: 'happy', dizzy: 'confused' };

  // ---------- one frame ----------
  function drawAt(c, tl, t) {
    c.save();
    c.clearRect(0, 0, W, H);
    // ---- title card ----
    if (t < TITLE) { drawTitle(c, tl, t); c.restore(); return { scene: null, beat: null }; }

    const s = sceneAt(tl, t), lt = t - s.start, dLeft = s.end - t;
    const beat = beatAt(s, t), age = t - beat.start, bu = clamp(age / beat.dur, 0, 1);

    // ---- camera ----
    let z = 1, panX = 0, panY = 0, shake = 0;
    if (s.bg === 'jungle') { z = 1.03; panX = Math.sin(t * 0.35) * 14; }
    if (s.bg === 'street') { z = 1.02; panX = Math.sin(t * 0.5) * 10; }
    if (beat.action === 'run') z += 0.03 * Math.sin(bu * Math.PI);
    if (beat.action === 'jump') z += 0.05 * Math.sin(bu * Math.PI);
    if (/crash|bonk|splat|boo|drum/.test(beat.sfx || '') && age < 0.45) shake = (0.45 - age) / 0.45 * 14;
    z += 0.02 * bu;
    c.save();
    c.translate(W / 2 + panX + (shake ? Math.sin(t * 90) * shake : 0), H / 2 + panY + (shake ? Math.cos(t * 77) * shake : 0));
    c.scale(z, z); c.translate(-W / 2, -H / 2);

    Scenes.draw(c, s.bg, t);

    // ---- props & actors ----
    const list = slots(s, t);
    const laughBeat = beat.laugh || (beat.emotion === 'happy' && /\b(ha ?ha|hehe|laugh)/i.test(beat.say));
    list.forEach(o => {
      const L = tl.looks[o.name];
      const speaking = o.speaker;
      let emo = speaking ? beat.emotion : 'neutral';
      if (!speaking) {
        const react = REACT[beat.emotion];
        if (react && (beat.emotion === 'angry' || beat.emotion === 'scared' || beat.emotion === 'surprised' || laughBeat)) emo = react;
      }
      // Narrator line that names somebody ("Bruno crashes into a tree") -> that character acts it out
      const named = beat.who === 'Narrator' ? list.find(x => new RegExp('\\b' + x.name + '\\b', 'i').test(beat.say)) : null;
      let act = 'none';
      if (lt < 1.1) act = 'walk';
      else if (beat.who === 'Narrator') act = (named && named.name === o.name && beat.action !== 'none') ? beat.action : 'none';
      else if (speaking && beat.action !== 'none') act = beat.action;
      else if (beat.action === 'pounce' && !speaking) act = 'cower';
      else if (beat.action === 'run' && !speaking) act = 'none';
      const P = Acting.pose(L, { t, u: bu, emotion: emo, action: act, talking: speaking && act !== 'walk', laugh: laughBeat && speaking });
      // narration: nobody talks, everybody reacts to the narrator
      if (beat.who === 'Narrator') {
        const nPose = Acting.pose(L, { t, u: bu, emotion: REACT[beat.emotion] || beat.emotion, action: act, talking: false, laugh: laughBeat });
        nPose.lookX = named ? (named.x < o.x ? -1 : 1) : 0;          // look at whoever is being talked about
        Characters.draw(c, L, nPose, o.x, FEET, SIZE, o.flip);
        return;
      }
      Characters.draw(c, L, P, o.x, FEET, SIZE, o.flip);
      // prop in hand / thrown (also for narrator lines about someone)
      if (beat.prop && (speaking || (named && named.name === o.name))) {
        const startx = o.x + (o.side > 0 ? 50 : -50), starty = FEET - 235;
        if (beat.action === 'pounce' || beat.action === 'run') {
          const px = startx + (o.side > 0 ? 1 : -1) * 260 * bu, py = starty - Math.sin(bu * Math.PI) * 120 + 40 * bu;
          prop(c, beat.prop, px, py, 0.85, t);
        } else prop(c, beat.prop, startx, starty, 0.7 + 0.1 * Math.sin(t * 6), t);
      }
    });

    // falling piano gag: if a beat mentions piano/anvil in the text
    if (/\b(piano|anvil|safe)\b/i.test(beat.say) && age < 1.3) {
      const y = -160 + Math.min(1, age / 0.75) * 760;
      const target = list.find(x => x.name === beat.who) || list[list.length - 1];
      prop(c, 'piano', target ? target.x : 640, y, 1.1, t);
    }
    c.restore();

    // ---- comic sound word ----
    if (beat.sfx && age < 1.15 && SFX_WORD[beat.sfx] && SFX_WORD[beat.sfx] !== '...') {
      const k = 1 + 0.65 * Math.max(0, 1 - age * 4);
      const wob = Math.sin(age * 18) * 0.05;
      c.save();
      c.translate(W / 2 + 170 + Math.sin(age * 6) * 10, 180); c.rotate(-0.11 + wob); c.scale(k, k);
      c.font = '900 92px Impact, "Arial Black", sans-serif'; c.textAlign = 'center'; c.lineJoin = 'round'; c.miterLimit = 2;
      c.lineWidth = 16; c.strokeStyle = '#2b1d3a'; c.strokeText(SFX_WORD[beat.sfx], 0, 0);
      c.fillStyle = '#ffd84a'; c.fillText(SFX_WORD[beat.sfx], 0, 0);
      c.restore();
    }

    // ---- caption bar ----
    drawCaption(c, tl, beat);

    // ---- iris transition between scenes ----
    const inK = clamp(lt / 0.5, 0, 1), outK = clamp(dLeft / 0.5, 0, 1);
    if (inK < 1 || outK < 1) {
      const k = Math.min(inK, outK), r = Math.max(0, k) * 900;
      c.save(); c.beginPath(); c.rect(0, 0, W, H);
      c.moveTo(W / 2 + r, H / 2); c.arc(W / 2, H / 2, r, 0, Math.PI * 2, true);
      c.fillStyle = '#120e22'; c.fill('evenodd'); c.restore();
      if (outK >= 1 && inK < 1) { c.fillStyle = 'rgba(255,255,255,' + (1 - inK) * 0.9 + ')'; c.fillRect(0, 0, W, H); }
    }
    c.restore();
    return { scene: s, beat };
  }

  function drawCaption(c, tl, beat) {
    if (beat.who === 'Narrator' && !beat.say) return;
    c.save();
    c.font = 'bold 31px Trebuchet MS, Verdana, sans-serif';
    const lines = wrap(c, beat.say, W - 300, 3);
    const bh = 40 * lines.length + 30, by = H - bh - 14;
    c.fillStyle = 'rgba(28,24,60,.92)'; rr(c, 60, by, W - 120, bh, 20); c.fill();
    c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,.28)'; c.stroke();
    const tag = beat.who, col = tl.looks[tag] ? tl.looks[tag].top : '#ffd84a';
    c.font = 'bold 21px Trebuchet MS, Verdana, sans-serif';
    const tw = c.measureText(tag).width + 34;
    c.fillStyle = col; rr(c, 88, by - 17, tw, 34, 17); c.fill();
    c.lineWidth = 3; c.strokeStyle = '#2b1d3a'; c.stroke();
    c.fillStyle = '#2b1d3a'; c.textAlign = 'left'; c.fillText(tag, 105, by + 7);
    c.font = 'bold 31px Trebuchet MS, Verdana, sans-serif'; c.fillStyle = '#fff';
    lines.forEach((l, i) => c.fillText(l, 90, by + 40 + 38 * (i - 0.1)));
    c.restore();
  }

  function drawTitle(c, tl, t) {
    const k = clamp(t / 0.45, 0, 1), out = clamp((TITLE - t) / 0.35, 0, 1);
    c.save();
    const g = c.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 760);
    g.addColorStop(0, '#3b2d6b'); g.addColorStop(1, '#120e22');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) {
      const a = i * 2.4 + t, r = 120 + (i * 47) % 520;
      c.fillStyle = 'rgba(255,240,150,' + (0.25 + 0.5 * Math.abs(Math.sin(t * 2 + i))) + ')';
      c.beginPath(); c.arc(W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r * 0.6, 2 + (i % 3), 0, 7); c.fill();
    }
    c.translate(W / 2, H / 2);
    c.scale(1 + (1 - k) * 0.35, 1 + (1 - k) * 0.35); c.globalAlpha = k * out;
    c.rotate(-0.03);
    const words = wrap(c, String(tl.title).toUpperCase(), 900, 3);
    c.textAlign = 'center'; c.lineJoin = 'round';
    c.font = '900 72px Impact, "Arial Black", sans-serif';
    words.forEach((line, i) => {
      const y = (i - (words.length - 1) / 2) * 84;
      c.lineWidth = 20; c.strokeStyle = '#2b1d3a'; c.strokeText(line, 0, y);
      c.fillStyle = i % 2 ? '#ffd84a' : '#ff5d73'; c.fillText(line, 0, y);
      c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,.5)'; c.strokeText(line, 0, y);
    });
    c.font = 'bold 24px Trebuchet MS, Verdana, sans-serif';
    c.fillStyle = '#fff'; c.globalAlpha = k * out * clamp((t - 0.5) / 0.5, 0, 1);
    c.fillText('a cartoon made with My 2D Cartoon Studio', 0, (words.length * 84) / 2 + 30);
    c.restore();
  }

  // ---------- playback (with sound) ----------
  function play(script, canvas, opts) {
    stop();
    const o = opts || {};
    canvas.width = W; canvas.height = H;
    const c = canvas.getContext('2d');
    let tl;
    try { tl = build(script); } catch (e) { if (window.showError) showError('Script problem: ' + e.message); return; }
    if (o.sound && window.Sound) {
      Sound.init(); Sound.muted = false;
      if (o.music !== false) Sound.musicStart(o.mood || 'happy');
    }
    const t0 = performance.now();
    let spoken = null, lastSfx = null;
    (function loop(now) {
      const t = (now - t0) / 1000;
      if (t >= tl.total) {
        try { drawAt(c, tl, tl.total - 0.02); } catch (e) { }
        if (window.Sound && o.sound) Sound.fadeOut();
        if (o.onDone) o.onDone(tl);
        return;
      }
      try {
        const cur = drawAt(c, tl, t);
        if (o.sound && window.Sound && cur && cur.beat) {
          const b = cur.beat;
          if (spoken !== b) {                                    // start this line's cartoon voice
            spoken = b;
            const pitch = b.who === 'Narrator' ? 1.0 : 0.8 + ((String(b.who).charCodeAt(0) || 5) % 9) * 0.08;
            Sound.speak(b.say, { pitch: b.emotion === 'angry' ? pitch * 0.86 : b.emotion === 'sad' ? pitch * 0.92 : pitch,
              rate: 3.4, voice: b.who, maxDur: b.dur * 0.96 });
            if (b.sfx) { lastSfx = b; Sound.play(b.sfx); }
          }
        }
      } catch (e) {
        if (window.showError) showError('Drawing failed: ' + e.message);
        return;
      }
      raf = requestAnimationFrame(loop);
    })(t0);
    return tl;
  }
  function stop() { cancelAnimationFrame(raf); }

  // ---------- still frames (used by the video export) ----------
  function drawFrame(canvas, tl, t) {
    const c = canvas.getContext('2d');
    return drawAt(c, tl, t);
  }

  return { W, H, TITLE, build, drawAt, drawFrame, play, stop, sceneAt, beatAt };
})();
