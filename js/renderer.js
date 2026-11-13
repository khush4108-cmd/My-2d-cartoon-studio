// Draws any moment of the cartoon: background, characters, captions, sound words and scene fades.
window.Renderer = (function () {
  const W = 1280, H = 720, FEET = 600, SCALE = 1.0, FADE = 0.5;
  const SFX = { crash: 'CRASH!', boing: 'BOING!', whoosh: 'WHOOSH!', door: 'KNOCK KNOCK!', pop: 'POP!' };
  let raf = 0;

  const dur = b => Math.max(2.2, b.say.split(/\s+/).length * 0.38 + 0.9);

  function build(script) {
    // `c.hint` carries what the story said this character IS - "Coco the little
    // white rabbit" arrives with {kind:'animal', species:'rabbit', colour:'white',
    // size:0.62}. With no hint, Characters.look returns the same human design it
    // has always returned, so Mia and Leo are drawn exactly as before.
    const looks = {}, prop = {};
    script.characters.forEach(c => { looks[c.name] = Characters.look(c.name, c.hint); prop[c.name] = !!c.prop; });
    let t = 0;
    const scenes = script.scenes.map(sc => {
      // A character appears in a scene if they SPEAK in it or are MENTIONED in
      // it. Only speakers used to count, so a story told in plain prose with no
      // quotation marks produced an empty stage with nothing but a background.
      const names = [];
      sc.beats.forEach(b => {
        [b.who].concat(b.mentioned || []).forEach(w => {
          if (w && w !== 'Narrator' && !names.includes(w)) names.push(w);
        });
      });
      let lastSpeaker = null;
      const beats = sc.beats.map(b => {
        const o = Object.assign({}, b, { start: t, dur: dur(b), prevSpeaker: lastSpeaker });
        t += o.dur;
        if (b.who && b.who !== 'Narrator') lastSpeaker = b.who;
        return o;
      });
      const sceneStart = beats[0].start, sceneEnd = t;
      // Each character gets their own ENTRANCE and EXIT, timed to the moment the
      // story brings them in. The whole cast used to be standing on stage from
      // the first frame, so the butterfly and the bird were waiting around long
      // before the story mentioned them. A slot is fixed for the whole scene so
      // nobody shuffles sideways when somebody else walks in.
      const speaks = {};
      const stage = names.map((name, i) => {
        let first = null, last = null;
        beats.forEach(b => {
          if (b.who !== name && (b.mentioned || []).indexOf(name) < 0) return;
          if (first === null) first = b.start;
          last = b.start + b.dur;
          if (b.who === name) speaks[name] = true;
        });
        if (first === null) first = sceneStart;
        if (last === null) last = sceneEnd;
        return { name: name, slot: i, enter: Math.max(sceneStart - 0.6, first - 0.55),
          // A named character stays for the whole scene: Max must not walk off
          // just because one sentence does not mention him. Only a PROP the
          // story brought in - a passing butterfly, a carrot - leaves once the
          // story has moved on to something else.
          exit: (speaks[name] || !prop[name]) ? sceneEnd : Math.min(sceneEnd, last + 1.1) };
      });
      // ---- blocking: where everybody stands, beat by beat ------------------
      // A character who runs over to somebody has to STAY there. Recomputing
      // the position from the current beat alone made Max snap back to his mark
      // the moment his line finished, so each beat inherits the last one's
      // positions and only the characters the story actually moves will move.
      const onStageAt = (b, e) => {
        const st = stage.find(x => x.name === e);
        return !!st && b.start >= st.enter - 0.001 && b.start <= st.exit + 0.001;
      };
      // how much room each one takes up, measured from its own design, so a
      // squirrel does not end up standing inside the rabbit it ran over to
      const halfW = nm => {
        const L = looks[nm];
        if (!L) return 70;
        if (L.kind === 'object') return Math.max(45, Math.round(125 * L.size));
        if (L.kind === 'animal') return Math.max(45, Math.round(115 * L.size));
        return 125;                                            // the human template, measured
      };
      const room = (a, b) => Math.min(240, halfW(a) + halfW(b));
      const rest = {};
      names.forEach((nm, i) => { rest[nm] = W * (i + 1) / (names.length + 1); });
      let prevHere = [];
      beats.forEach(b => {
        const here = names.filter(nm => onStageAt(b, nm));
        const next = {};
        here.forEach(nm => { next[nm] = rest[nm]; });
        const movers = [];
        here.forEach(nm => {
          const d = b.dir && b.dir[nm];
          if (!d) return;
          let tgt = d.move;
          if (!tgt && (d.action === 'run' || d.action === 'walk') && here.length > 1) {
            tgt = (b.prevSpeaker && b.prevSpeaker !== nm && next[b.prevSpeaker] !== undefined) ? b.prevSpeaker : null;
            if (!tgt) {
              const others = here.filter(o => o !== nm)
                .sort((p, q) => Math.abs(next[p] - next[nm]) - Math.abs(next[q] - next[nm]));
              tgt = others[0] || null;
            }
          }
          if (tgt && tgt !== nm && next[tgt] !== undefined) movers.push([nm, tgt]);
        });
        // ONLY a character the story actually moved may be relocated - plus one
        // who is arriving this beat and needs somewhere clear to arrive. Everyone
        // else keeps the mark they were given.
        // The old resolver split every collision between the two bodies, so one
        // run shoved the whole cast sideways; because each beat inherited the
        // last, the damage compounded (Coco drifted 213 -> 182 -> 175 -> 172 and
        // the carrot 427 -> 325 -> 345 across a scene in which neither of them
        // ever moved).
        const placed = {};
        const blocked = (nm, x) => here.some(o => o !== nm && Math.abs(x - next[o]) < room(nm, o));
        const freeSpot = (nm, want) => {
          if (!blocked(nm, want)) return want;
          for (let step = 40; step <= 600; step += 40) {       // nearest clear spot, same side first
            for (const cand of [want + step, want - step]) {
              if (cand < 70 || cand > W - 70) continue;
              if (!blocked(nm, cand)) return cand;
            }
          }
          return want;                                          // nowhere to go: hold the mark
        };
        movers.forEach(pair => {
          const nm = pair[0], tgt = pair[1];
          const side = next[nm] < next[tgt] ? -1 : 1;           // keep approaching from the same side
          next[nm] = freeSpot(nm, next[tgt] + side * room(nm, tgt));
          placed[nm] = true;
        });
        here.filter(nm => prevHere.indexOf(nm) < 0 && !placed[nm]).forEach(nm => {
          if (blocked(nm, next[nm])) next[nm] = freeSpot(nm, next[nm]);
          placed[nm] = true;                                    // an arrival holds its new spot too
        });
        here.forEach(nm => { next[nm] = Math.max(70, Math.min(W - 70, next[nm])); });   // stay on stage
        b.restX = next; b.movers = movers.map(m => m[0]);
        here.forEach(nm => { if (placed[nm]) rest[nm] = next[nm]; });
        prevHere = here;
      });
      return { bg: sc.bg, names, stage, beats, start: sceneStart, end: sceneEnd };
    });
    return { scenes, looks, total: t };
  }

  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function wrap(c, text, maxW) {
    const out = []; let line = '';
    for (const w of text.split(' ')) { if (c.measureText(line + w).width > maxW && line) { out.push(line.trim()); line = ''; } line += w + ' '; }
    out.push(line.trim()); return out.slice(0, 3);
  }

  // A character who is on stage but not part of this line still has to DO
  // something believable: watch whoever is speaking, and react in their own way
  // rather than copying the speaker's expression.
  function bystander(name, beat, visibleNames, isActor, rank) {
    if (!isActor) return { action: 'none', emotion: 'neutral', look: null, listen: false, move: null };
    const speaker = beat.who !== 'Narrator' && visibleNames.indexOf(beat.who) >= 0 ? beat.who : null;
    const look = beat.focus && beat.focus !== name ? beat.focus : speaker;
    if (!look) return { action: 'none', emotion: 'neutral', look: null, listen: false, move: null };
    let h = 0;
    for (const ch of String(name)) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
    const pick = (h + (rank < 0 ? 0 : rank)) % 3;            // same spread as writer-free uses
    const opts = beat.emotion === 'scared' || beat.emotion === 'surprised' || beat.emotion === 'excited'
      ? ['surprised', 'neutral', 'confused']
      : (beat.emotion === 'sad' ? ['sad', 'neutral', 'confused'] : ['neutral', 'confused', 'happy']);
    let feel = opts[pick];
    // never hand a bystander the speaker's own expression: that is what made
    // the whole cast react identically before
    if (speaker && feel === beat.emotion) for (const alt of opts) if (alt !== beat.emotion) { feel = alt; break; }
    return { action: 'none', emotion: speaker ? feel : 'surprised', look: look, listen: !!speaker, move: null };
  }

  function drawAt(c, tl, t) {
    const s = tl.scenes.find(sc => t >= sc.start && t < sc.end) || tl.scenes[tl.scenes.length - 1];
    const beat = s.beats.find(b => t >= b.start && t < b.start + b.dur) || s.beats[s.beats.length - 1];
    const lt = t - s.start, age = t - beat.start, z = 1 + 0.035 * Math.min(1, age / beat.dur);
    const legacy = !s.stage;                                  // a timeline built before staging existed

    // ---- who is on stage right now, and where are they standing? ----
    const entries = legacy
      ? s.names.map((name, i) => ({ name: name, slot: i, enter: s.start, exit: s.end }))
      : s.stage.filter(e => t >= e.enter && t <= e.exit);
    const n = s.names.length, vis = entries.map(e => e.name);
    const bi = s.beats.indexOf(beat), prev = bi > 0 ? s.beats[bi - 1] : null;
    const pos = {};
    entries.forEach(e => {
      const mark = W * (e.slot + 1) / (n + 1), side = mark < W / 2 || n === 1 ? -170 : W + 170;
      const at = b2 => (b2 && b2.restX && b2.restX[e.name] !== undefined) ? b2.restX[e.name] : mark;
      const here = at(beat), before = at(prev) !== mark || legacy ? at(prev) : mark;
      const from = legacy ? mark : (prev ? before : mark);
      const p = legacy ? Math.min(1, lt / 1.3) : Math.max(0, Math.min(1, (t - e.enter) / 1.1));
      const ease = 1 - Math.pow(1 - p, 3);
      const isMover = !legacy && beat.movers && beat.movers.indexOf(e.name) >= 0;
      let x, moving = p < 1;
      if (p < 1) x = side + (from - side) * ease;               // walking on
      else if (isMover) {
        const k = Math.max(0, Math.min(1, age / Math.max(0.6, beat.dur * 0.7)));
        x = from + (here - from) * k;                           // covering the ground this beat
        if (k < 1) moving = true;
      } else x = here;
      if (!legacy && e.exit < s.end) {                          // walk back off when the story moves on
        const q = Math.max(0, Math.min(1, (e.exit - t) / 0.9));
        if (q < 1) { x = here + (side - here) * (1 - q); moving = true; }
      }
      pos[e.name] = { x: x, slot: mark, side: side, moving: moving };
    });
    entries.forEach(e => {
      const d = beat.dir && beat.dir[e.name];
      if (d && d.move && pos[d.move] !== undefined) pos[e.name].towards = d.move;
      else if (!legacy && beat.movers && beat.movers.indexOf(e.name) >= 0) {
        const cand = beat.prevSpeaker && beat.prevSpeaker !== e.name && pos[beat.prevSpeaker] !== undefined
          ? beat.prevSpeaker : vis.filter(v => v !== e.name && pos[v])[0];
        if (cand) pos[e.name].towards = cand;
      }
    });

    // ---- camera: a gentle push towards whatever the shot is about ----
    const focusName = beat.focus && pos[beat.focus] !== undefined ? beat.focus
      : (beat.who !== 'Narrator' && pos[beat.who] !== undefined ? beat.who : null);
    let camX = 0;
    if (focusName && vis.length > 1) camX = Math.max(-60, Math.min(60, (W / 2 - pos[focusName].x) * 0.09));
    c.save(); c.translate(W / 2 + camX, H / 2); c.scale(z, z); c.translate(-W / 2 - camX, -H / 2);
    Scenes.draw(c, s.bg, t);

    entries.forEach(e => {
      const name = e.name, me = pos[name], speaker = beat.who === name;
      const L = tl.looks[name];
      const isProp = !!(L && L.kind === 'object');
      const d = beat.dir && beat.dir[name] ? beat.dir[name]
        : (beat.dir ? bystander(name, beat, vis, !isProp, vis.filter(v => v !== beat.who).indexOf(name)) : null);
      // what this ONE character is doing - never the whole cast at once
      let action, emotion, lookX = 0, lookY = 0, listen = false, laugh = false;
      if (!d) {                                                // the original shared behaviour
        action = me.moving ? 'walk' : (speaker || beat.action === 'run' ? beat.action : 'none');
        emotion = me.moving ? 'happy' : beat.emotion;
        laugh = emotion === 'happy' && /\b(ha ?ha|hehe|laugh)/i.test(beat.say);
      } else {
        // a butterfly does not walk on: it flies in
        action = me.moving ? (L && L.sp && L.sp.flying ? 'fly' : 'walk') : d.action;
        emotion = me.moving ? 'happy' : (d.emotion || 'neutral');
        listen = !!d.listen;
        if (action === 'laugh') { action = 'none'; laugh = true; }
        else if (speaker && emotion === 'happy' && /\b(ha ?ha|hehe|laugh)/i.test(beat.say)) laugh = true;
      }
      // ---- gaze: turn the head and eyes towards whoever or whatever it is ----
      let lookName = d ? d.look : (speaker ? null : (beat.who !== 'Narrator' && beat.who !== name && pos[beat.who] !== undefined ? beat.who : null));
      if (!lookName && beat.focus && beat.focus !== name && pos[beat.focus] !== undefined) lookName = beat.focus;
      if (!lookName && me.towards) lookName = me.towards;
      let flip = me.x > W / 2 && vis.length > 1;
      if (lookName && pos[lookName] !== undefined && lookName !== name) {
        const dx = pos[lookName].x - me.x;
        lookX = Math.max(-1, Math.min(1, dx / 260));
        flip = dx < 0;
        const up = beat.float && lookName === beat.focus || (tl.looks[lookName] && tl.looks[lookName].sp && tl.looks[lookName].sp.flying);
        if (up) lookY = -0.85;                                  // following it into the air
      }
      let feet = FEET;
      if (beat.float && name === beat.focus) {                  // the carrot lifts off the ground
        feet = FEET - Math.min(1, age / 1.1) * 120 - Math.sin(t * 1.7) * 12;
      }
      const P = Acting.pose(L, { t: t, emotion: emotion, action: action, talking: speaker && !me.moving,
        laugh: laugh && !me.moving, look: lookX, lookY: lookY, listen: listen });
      // the clock is passed through so animals and objects can keep moving:
      // Acting.pose() deliberately does not put `t` on the pose object.
      Characters.draw(c, L, P, me.x, feet, SCALE, flip, t);
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
