// Sound for the cartoon: synthesized effects, spoken lines and scene ambience.
// Everything here is GENERATED - there are no audio files to upload and no extra
// libraries, so the project still has zero dependencies.
//
// IMPORTANT FOR iPad / iOS SAFARI:
//   The AudioContext is created inside unlock(), and unlock() must be called
//   directly from a button click. If a context is created at page load instead,
//   iOS keeps it "suspended" forever and you hear nothing, with no error message.
//
// This module is OPTIONAL. If it fails or is missing, the picture still plays.
window.CartoonAudio = (function () {
  const MIX = { sfx: 0.55, sfxDucked: 0.35, ambience: 0.16, speech: 0.9 };
  const AC = window.AudioContext || window.webkitAudioContext || null;
  const TTS = window.speechSynthesis || null;
  const Utt = window.SpeechSynthesisUtterance || null;

  let ctx = null, master = null, sfxBus = null, ambBus = null;
  let noiseBuf = null, silentBuf = null, chosenVoice = null, voicePicked = false;
  let volume = 0.9, muted = false, primed = false, lastError = '';
  let liveSources = [], speechTimers = [];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const keep = s => { if (s) liveSources.push(s); return s; };

  // A small deterministic random generator, so the same scene always gets the
  // same bird calls / clock ticks. Seeded from the scene number.
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }

  // ---------- buffers ----------
  function makeNoise() {
    const len = Math.floor(ctx.sampleRate * 2);
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function makeSilent() {
    const b = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * 0.02)), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = 0;
    return b;
  }

  // ---------- the five sound effects ----------
  // Each one takes `when` (a time on the audio clock) and `g` (a loudness scale).
  function envelope(node, when, peak, attack, total) {
    node.gain.setValueAtTime(0.0001, when);
    node.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + attack);
    node.gain.exponentialRampToValueAtTime(0.0001, when + total);
  }
  function noiseSource(when, dur) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    s.start(when); s.stop(when + dur);
    return keep(s);
  }
  const RECIPES = {
    whoosh(when, g) {                                  // air rushing past
      const s = noiseSource(when, 0.6);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.1;
      bp.frequency.setValueAtTime(320, when);
      bp.frequency.exponentialRampToValueAtTime(3200, when + 0.34);
      const gn = ctx.createGain(); envelope(gn, when, 0.95 * g, 0.16, 0.55);
      s.connect(bp); bp.connect(gn); gn.connect(sfxBus);
    },
    crash(when, g) {                                   // thud plus a burst of noise
      const thud = ctx.createOscillator(); thud.type = 'sine';
      thud.frequency.setValueAtTime(120, when);
      thud.frequency.exponentialRampToValueAtTime(38, when + 0.4);
      const tg = ctx.createGain(); envelope(tg, when, 0.9 * g, 0.012, 0.75);
      thud.connect(tg); tg.connect(sfxBus); thud.start(when); thud.stop(when + 0.8); keep(thud);
      const s = noiseSource(when, 0.7);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2600, when);
      lp.frequency.exponentialRampToValueAtTime(420, when + 0.5);
      const ng = ctx.createGain(); envelope(ng, when, 0.75 * g, 0.008, 0.62);
      s.connect(lp); lp.connect(ng); ng.connect(sfxBus);
    },
    boing(when, g) {                                   // springy jump
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(720, when);
      o.frequency.exponentialRampToValueAtTime(150, when + 0.34);
      const wob = ctx.createOscillator(); wob.frequency.value = 22;
      const wobG = ctx.createGain(); wobG.gain.value = 55;
      wob.connect(wobG); wobG.connect(o.frequency);
      const gn = ctx.createGain(); envelope(gn, when, 0.8 * g, 0.01, 0.5);
      o.connect(gn); gn.connect(sfxBus);
      o.start(when); o.stop(when + 0.55); wob.start(when); wob.stop(when + 0.55);
      keep(o); keep(wob);
    },
    door(when, g) {                                    // two wooden knocks
      for (let k = 0; k < 2; k++) {
        const at = when + k * 0.18;
        const s = noiseSource(at, 0.14);
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 480; bp.Q.value = 3.2;
        const gn = ctx.createGain(); envelope(gn, at, 0.9 * g, 0.004, 0.13);
        s.connect(bp); bp.connect(gn); gn.connect(sfxBus);
      }
    },
    pop(when, g) {                                     // tiny surprise blip
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(620, when);
      o.frequency.exponentialRampToValueAtTime(190, when + 0.07);
      const gn = ctx.createGain(); envelope(gn, when, 0.7 * g, 0.006, 0.11);
      o.connect(gn); gn.connect(sfxBus); o.start(when); o.stop(when + 0.14); keep(o);
    }
  };

  // ---------- ambience beds, one per background ----------
  function bed(when, dur, type, freq, q, level, lfoRate, lfoDepth) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    const fade = Math.min(1.2, dur / 3);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(level, when + fade);
    if (dur > fade * 2.2) {
      g.gain.setValueAtTime(level, when + dur - fade);
      g.gain.linearRampToValueAtTime(0.0001, when + dur);
    } else {
      g.gain.linearRampToValueAtTime(0.0001, when + dur);
    }
    s.connect(f); f.connect(g); g.connect(ambBus);
    s.start(when); s.stop(when + dur + 0.05); keep(s);
    if (lfoRate) {                                   // slow swell, so the bed breathes
      const lfo = ctx.createOscillator(); lfo.frequency.value = lfoRate;
      const lg = ctx.createGain(); lg.gain.value = lfoDepth * level;
      lfo.connect(lg); lg.connect(g.gain);
      lfo.start(when); lfo.stop(when + dur + 0.05); keep(lfo);
    }
  }
  function chirp(when, g) {                            // bird
    const o = ctx.createOscillator(); o.type = 'sine';
    const f0 = 2100 + g.r() * 1500;
    o.frequency.setValueAtTime(f0, when);
    o.frequency.exponentialRampToValueAtTime(f0 * (1.25 + g.r() * 0.5), when + 0.05);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.85, when + 0.1);
    const gn = ctx.createGain(); envelope(gn, when, 0.16, 0.012, 0.13);
    o.connect(gn); gn.connect(ambBus); o.start(when); o.stop(when + 0.15); keep(o);
  }
  function tick(when) {                                // clock
    const s = noiseSource(when, 0.05);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
    const gn = ctx.createGain(); envelope(gn, when, 0.1, 0.003, 0.045);
    s.connect(hp); hp.connect(gn); gn.connect(ambBus);
  }
  function horn(when) {                                // traffic
    [340, 432].forEach((hz, i) => {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = hz;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
      const gn = ctx.createGain(); envelope(gn, when, i ? 0.05 : 0.07, 0.05, 0.5);
      o.connect(lp); lp.connect(gn); gn.connect(ambBus); o.start(when); o.stop(when + 0.55); keep(o);
    });
  }
  function bell(when) {                                // school
    [880, 1320].forEach((hz, i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz;
      const gn = ctx.createGain(); envelope(gn, when, i ? 0.045 : 0.08, 0.01, 1.3);
      o.connect(gn); gn.connect(ambBus); o.start(when); o.stop(when + 1.4); keep(o);
    });
  }
  const BEDS = {
    park:   { bed: ['lowpass', 420, 0.7, 0.5, 0.07, 0.35], event: chirp, gap: [1.3, 2.9] },
    beach:  { bed: ['lowpass', 720, 0.7, 0.62, 0.11, 0.45], event: null, gap: [0, 0] },
    street: { bed: ['lowpass', 260, 0.7, 0.5, 0.2, 0.16], event: horn, gap: [4.5, 9.0] },
    night:  { bed: ['bandpass', 4200, 9, 0.3, 6.5, 0.3], event: null, gap: [0, 0] },
    room:   { bed: ['lowpass', 200, 0.7, 0.24, 0.05, 0.1], event: tick, gap: [1.0, 1.0] },
    school: { bed: ['lowpass', 300, 0.7, 0.3, 0.06, 0.12], event: bell, gap: [6.0, 11.0] }
  };
  function scheduleScene(bg, when, dur, seed) {
    const spec = BEDS[bg] || BEDS.park;
    const b = spec.bed;
    bed(when, dur, b[0], b[1], b[2], b[3], b[4], b[5]);
    if (!spec.event || dur < 2.5) return;
    const r = rng(seed + 7919);
    const lo = spec.gap[0], hi = Math.max(spec.gap[0] + 0.1, spec.gap[1]);
    let t = when + 1.4, count = 0;
    while (t < when + dur - 0.6 && count < 80) {
      spec.event(t, { r });
      t += lo + r() * (hi - lo);
      count++;
    }
  }

  // ---------- spoken lines ----------
  function pickVoice() {
    if (voicePicked) return chosenVoice;
    voicePicked = true;
    try {
      const list = (TTS && TTS.getVoices) ? TTS.getVoices() : [];
      chosenVoice = list.filter(v => /^en/i.test(v.lang))[0] || list[0] || null;
    } catch (e) { chosenVoice = null; }
    return chosenVoice;
  }
  function seedOf(name) {
    let seed = 0;
    try { if (window.Characters && Characters.look) seed = Characters.look(String(name)).seed >>> 0; } catch (e) { seed = 0; }
    if (!seed) {                                 // same FNV-1a idea as Characters.look()
      seed = 2166136261;
      for (const ch of String(name).toLowerCase()) { seed ^= ch.charCodeAt(0); seed = Math.imul(seed, 16777619) >>> 0; }
    }
    return seed;
  }
  // Voices are handed out by CAST POSITION, not by name hash alone. A name hash
  // can collide (two characters getting the same pitch), and in a two-character
  // story that is very noticeable. Cast position cannot collide.
  let cast = {};
  function buildCast(script) {
    cast = {};
    const list = (script && script.characters) || [];
    list.forEach(function (c, i) {
      const seed = seedOf(c.name);
      cast[c.name] = { pitch: 0.86 + (i % 6) * 0.07, rateBase: 0.95 + ((seed >>> 8) % 4) * 0.05 };
    });
  }
  function voiceFor(name) {
    if (name === 'Narrator') return { pitch: 1.0, rateBase: 0.94 };
    if (cast[name]) return cast[name];
    const seed = seedOf(name);                   // fallback for names not in the cast list
    return { pitch: 0.86 + (seed % 7) * 0.06, rateBase: 0.95 + ((seed >>> 8) % 4) * 0.05 };
  }
  function speak(beat) {
    if (muted || !TTS || !Utt) return;
    try {
      const words = String(beat.say || '').trim().split(/\s+/).filter(Boolean).length;
      const needWpm = beat.dur > 0 ? (words / beat.dur) * 60 : 150;
      const v = voiceFor(beat.who);
      const u = new Utt(String(beat.say || ''));
      // Aim for a natural pace (about 165 words per minute at rate 1). Only speed
      // up when a line would overrun its caption window, and never drag below 0.92,
      // because your beat windows are generous and slow speech sounds monotone.
      u.rate = clamp(clamp(needWpm / 165, 0.92, 1.25) * v.rateBase, 0.85, 1.3);
      u.pitch = v.pitch;
      u.volume = clamp(MIX.speech * volume, 0, 1);
      const voice = pickVoice(); if (voice) u.voice = voice;
      try { TTS.cancel(); } catch (e) { /* nothing queued, that is fine */ }
      // iOS dislikes cancel() and speak() in the same tick, so wait one moment.
      speechTimers.push(setTimeout(function () {
        try { TTS.speak(u); } catch (e) { lastError = 'speech failed: ' + e.message; }
      }, 20));
    } catch (e) { lastError = 'speech failed: ' + e.message; }
  }

  // ---------- lifecycle ----------
  function onVis() {
    try {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' &&
          ctx && ctx.state === 'suspended') { const p = ctx.resume(); if (p && p.catch) p.catch(function () {}); }
    } catch (e) { /* ignore */ }
  }

  function unlock() {
    if (!AC) { lastError = 'This browser has no Web Audio support.'; return false; }
    try {
      if (!ctx) {
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = muted ? 0 : volume; master.connect(ctx.destination);
        sfxBus = ctx.createGain(); sfxBus.gain.value = MIX.sfx; sfxBus.connect(master);
        ambBus = ctx.createGain(); ambBus.gain.value = MIX.ambience; ambBus.connect(master);
        noiseBuf = makeNoise(); silentBuf = makeSilent();
        if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('visibilitychange', onVis);
      }
      if (ctx.state === 'suspended') { const p = ctx.resume(); if (p && p.catch) p.catch(function () {}); }
      const s = ctx.createBufferSource(); s.buffer = silentBuf; s.connect(ctx.destination); s.start(0);
      if (TTS && Utt && !primed) {                   // prime the voice inside the same click
        const u = new Utt(' '); u.volume = 0;
        try { TTS.speak(u); } catch (e) { /* ignore */ }
        primed = true;
      }
      return true;
    } catch (e) { lastError = 'Audio could not start: ' + e.message; return false; }
  }

  function stop() {
    speechTimers.forEach(function (id) { clearTimeout(id); });
    speechTimers = [];
    try { if (TTS) TTS.cancel(); } catch (e) { /* ignore */ }
    liveSources.forEach(function (s) { try { s.stop(0); } catch (e) { /* already finished */ } });
    liveSources = [];
  }

  function applyMaster() {
    if (!ctx || !master) return;
    const target = muted ? 0 : volume, t = ctx.currentTime;
    try {
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(target, t + 0.08);
    } catch (e) { try { master.gain.value = target; } catch (e2) { /* ignore */ } }
  }

  function speechAt(tl, t, span) {                    // is somebody talking right now?
    return tl.scenes.some(function (sc) {
      return sc.beats.some(function (b) { return b.start < t + span && t < b.start + b.dur; });
    });
  }

  // Build the schedule once, up front. All effect and ambience times come from a
  // single base on the AUDIO clock, so they cannot drift apart from each other.
  function start(script, t0Perf) {
    stop();
    if (!ctx) return false;
    if (ctx.state === 'suspended') { const p = ctx.resume(); if (p && p.catch) p.catch(function () {}); }
    let tl = null;
    try { tl = (window.Renderer && Renderer.build) ? Renderer.build(script) : null; } catch (e) { tl = null; }
    if (!tl || !tl.scenes || !tl.scenes.length) { lastError = 'no timeline to schedule'; return false; }
    buildCast(script);                           // give every character its own voice

    const base = ctx.currentTime + 0.05;               // tiny lead-in so attacks are not clipped
    let sfxCount = 0;
    tl.scenes.forEach(function (sc) {
      sc.beats.forEach(function (b) {
        if (!b.sfx || !RECIPES[b.sfx]) return;
        const when = base + b.start;
        const duck = speechAt(tl, b.start, 1.1) ? MIX.sfxDucked / MIX.sfx : 1;
        RECIPES[b.sfx](when, duck);
        sfxCount++;
      });
    });
    tl.scenes.forEach(function (sc, i) {
      scheduleScene(sc.bg, base + sc.start, Math.max(1.2, sc.end - sc.start), i * 1013);
    });

    if (TTS && Utt) {                                  // speech follows the PICTURE clock
      const beats = [];                                // so mouths and voices line up
      tl.scenes.forEach(function (sc) { sc.beats.forEach(function (b) { beats.push(b); }); });
      beats.forEach(function (b) {
        const delay = Math.max(0, (t0Perf + b.start * 1000) - performance.now());
        speechTimers.push(setTimeout(function () { speak(b); }, delay));
      });
    }
    // `base` is the time on the AUDIO clock that corresponds to picture time 0.
    // A recorder can drive its video frames from (ctx.currentTime - base) so the
    // picture and the sound share one clock instead of two that slowly disagree.
    return { sfx: sfxCount, scenes: tl.scenes.length, total: tl.total, base: base };
  }

  function setVolume(v) { volume = clamp(Number(v) || 0, 0, 1); applyMaster(); return volume; }
  function setMuted(m) {
    muted = !!m; applyMaster();
    if (muted) { try { if (TTS) TTS.cancel(); } catch (e) { /* ignore */ } }
    return muted;
  }
  function state() {
    return {
      webAudio: !!AC, speech: !!(TTS && Utt), unlocked: !!ctx,
      ctxState: ctx ? ctx.state : 'none', muted: muted, volume: volume,
      error: lastError, activeSources: liveSources.length
    };
  }
  function supported() { return { webAudio: !!AC, speech: !!(TTS && Utt) }; }

  // --- Hooks used only by export-test.html -------------------------------
  // These are inert during normal playback: nothing calls them unless the
  // test page does, so the cartoon's sound behaviour is unchanged.
  let tapDest = null;
  function context() { return ctx; }
  // Fan the master bus out to a MediaStream so a recording can capture it.
  // Note: speechSynthesis does NOT travel through Web Audio, so spoken voices
  // cannot be captured this way - only the effects and the ambience can.
  function tap() {
    if (!ctx || !master || !ctx.createMediaStreamDestination) return null;
    if (!tapDest) { try { tapDest = ctx.createMediaStreamDestination(); master.connect(tapDest); } catch (e) { tapDest = null; } }
    return tapDest;
  }
  function effects() { return Object.keys(RECIPES); }
  function beds() { return Object.keys(BEDS); }
  function preview(name) {                                // play one effect now
    if (!ctx || !RECIPES[name]) return false;
    if (ctx.state === 'suspended') { const p = ctx.resume(); if (p && p.catch) p.catch(function () {}); }
    try { RECIPES[name](ctx.currentTime + 0.02, 1); } catch (e) { lastError = 'preview failed: ' + e.message; return false; }
    return true;
  }
  function previewBed(bg, seconds) {                      // play one ambience bed
    if (!ctx) return false;
    const dur = Math.max(1.5, Number(seconds) || 4);
    try { scheduleScene(BEDS[bg] ? bg : 'park', ctx.currentTime + 0.02, dur, 13); }
    catch (e) { lastError = 'previewBed failed: ' + e.message; return false; }
    return true;
  }
  function say(text) {                                    // speak one test line
    if (!TTS || !Utt) return false;
    speak({ say: String(text || ''), who: 'Narrator', dur: 3 });
    return true;
  }

  return { unlock, start, stop, setVolume, setMuted, state, supported,
           context, tap, effects, beds, preview, previewBed, say };
})();
