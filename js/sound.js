// SOUND: every sound is generated here in the browser (Web Audio) - no sound files needed.
// Includes music, and a "Bloopers" cartoon voice track.
window.Sound = (function () {
  let ctx = null, master = null, sfxBus = null, musicBus = null, voiceBus = null, noiseBuf = null, muted = false, mediaDest = null;

  function init() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.95; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.5; musicBus.connect(master);
      voiceBus = ctx.createGain(); voiceBus.gain.value = 0.85; voiceBus.connect(master);
      try { mediaDest = ctx.createMediaStreamDestination(); master.connect(mediaDest); } catch (e) { mediaDest = null; }
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  const midi = m => 440 * Math.pow(2, (m - 69) / 12);
  function env(g, t0, a, d, peak) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }
  function tone(type, f0, f1, t0, dur, peak, dest) {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    env(g, t0, Math.min(0.02, dur * 0.2), dur, peak);
    o.connect(g); g.connect(dest || sfxBus); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noise(t0, dur, peak, type, f0, f1, q) {
    if (!ctx) return;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type || 'bandpass';
    f.frequency.setValueAtTime(f0 || 900, t0);
    if (f1) f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur);
    f.Q.value = q || 1.2;
    const g = ctx.createGain(); env(g, t0, 0.01, dur, peak);
    src.connect(f); f.connect(g); g.connect(sfxBus); src.start(t0); src.stop(t0 + dur + 0.05);
  }
  const BOING = () => {
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(760, t + 0.12); o.frequency.exponentialRampToValueAtTime(150, t + 0.6);
    lfo.frequency.value = 22; lg.gain.value = 60; lfo.connect(lg); lg.connect(o.frequency);
    env(g, t, 0.01, 0.62, 0.3); o.connect(g); g.connect(sfxBus);
    o.start(t); lfo.start(t); o.stop(t + 0.7); lfo.stop(t + 0.7);
  };
  const SLIDE = (t0) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(1100, t0); o.frequency.exponentialRampToValueAtTime(180, t0 + 0.5);
    env(g, t0, 0.01, 0.5, 0.14); o.connect(g); g.connect(sfxBus); o.start(t0); o.stop(t0 + 0.56);
  };

  const SFX = {
    crash: t => { noise(t, 0.5, 0.75, 'bandpass', 2400, 200, 0.7); for (let i = 0; i < 4; i++) tone('square', 400 + i * 210, 90, t + i * 0.03, 0.35, 0.12); },
    boing: () => BOING(),
    whoosh: t => noise(t, 0.6, 0.5, 'bandpass', 300, 2600, 3.5),
    door: t => { noise(t, 0.16, 0.55, 'lowpass', 380, 120, 1); tone('sine', 120, 60, t, 0.22, 0.3); noise(t + 0.24, 0.14, 0.4, 'lowpass', 300, 110, 1); },
    pop: t => { tone('sine', 240, 900, t, 0.09, 0.4); noise(t, 0.05, 0.2, 'highpass', 2200, 0, 1); },
    slide: t => SLIDE(t),
    slideWhistle: t => { SLIDE(t); SLIDE(t + 0.55); },
    bonk: t => { tone('sine', 620, 180, t, 0.16, 0.45); tone('triangle', 300, 90, t + 0.01, 0.22, 0.25); },
    drum: t => { tone('sine', 170, 55, t, 0.3, 0.55); noise(t, 0.08, 0.25, 'lowpass', 900, 200, 1); tone('sine', 160, 50, t + 0.11, 0.2, 0.3); },
    ding: t => { tone('sine', 1318, 1318, t, 0.5, 0.35); tone('sine', 1760, 1760, t + 0.02, 0.5, 0.2); },
    sparkle: t => { [1046, 1318, 1568, 2093].forEach((f, i) => tone('triangle', f, f, t + i * 0.06, 0.18, 0.16)); },
    yawn: t => { tone('sawtooth', 320, 120, t, 0.9, 0.14); noise(t, 0.9, 0.08, 'lowpass', 900, 300, 1); },
    splat: t => { noise(t, 0.28, 0.6, 'lowpass', 1400, 220, 0.9); tone('sine', 220, 70, t, 0.2, 0.3); },
    swoosh: t => noise(t, 0.35, 0.45, 'bandpass', 900, 3200, 2.5),
    boo: t => { [0, 0.35].forEach(d => tone('sawtooth', 260, 130, t + d, 0.3, 0.2)); },
    tick: t => tone('square', 1800, 1200, t, 0.03, 0.1),
    heartbeat: t => { tone('sine', 90, 60, t, 0.14, 0.4); tone('sine', 80, 55, t + 0.2, 0.16, 0.3); },
    birds: t => { [1400, 1800, 2100, 1650].forEach((f, i) => tone('sine', f, f * 1.5, t + i * 0.11, 0.09, 0.09)); },
    engine: t => { tone('sawtooth', 60, 55, t, 0.5, 0.2); noise(t, 0.4, 0.15, 'lowpass', 400, 200, 1); }
  };

  function play(name, when) {
    if (!ctx || !SFX[name] || muted) return;
    try { SFX[name](Math.max(ctx.currentTime + 0.01, when || ctx.currentTime)); } catch (e) { /* ignore */ }
  }

  // ---- 8-bit style background score, scheduled with a lookahead ----
  const MOODS = {
    happy:    { scale: [0, 2, 4, 5, 7, 9, 11], bpm: 132, root: 67, wave: 'square', drums: true, bass: 'cute' },
    adventure:{ scale: [0, 2, 3, 5, 7, 8, 10], bpm: 150, root: 64, wave: 'square', drums: true, bass: 'march' },
    sneaky:   { scale: [0, 1, 3, 5, 6, 8, 10], bpm: 108, root: 60, wave: 'triangle', drums: false, bass: 'walk' },
    sad:      { scale: [0, 2, 3, 5, 7, 8, 10], bpm: 84, root: 62, wave: 'triangle', drums: false, bass: 'slow' },
    wild:     { scale: [0, 2, 4, 6, 7, 9, 11], bpm: 168, root: 65, wave: 'square', drums: true, bass: 'march' }
  };
  const music = { playing: false, mood: 'happy', step: 0, next: 0, timer: 0 };

  function note(t, f, dur, peak, wave) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = wave || 'square'; o.frequency.value = f;
    env(g, t, 0.012, dur, peak); o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + 0.06);
    const o2 = ctx.createOscillator(), g2 = ctx.createGain();               // soft octave for warmth
    o2.type = 'triangle'; o2.frequency.value = f * 2;
    env(g2, t, 0.01, dur * 0.7, peak * 0.22); o2.connect(g2); g2.connect(musicBus); o2.start(t); o2.stop(t + dur + 0.06);
  }

  function schedule() {
    if (!ctx || !music.playing) return;
    const M = MOODS[music.mood] || MOODS.happy, spb = 60 / M.bpm / 2;   // eighth notes
    while (music.next < ctx.currentTime + 0.35) {
      const t = music.next, s = music.step;
      const sc = M.scale;
      // melody: deterministic pseudo-melody from the step number
      const deg = [0, 2, 4, 2, 5, 4, 2, 0, 4, 5, 6, 5, 4, 2, 1, 0][(s + (M.root % 5)) % 16];
      const oct = (s % 8 === 4 || s % 16 === 11) ? 12 : 0;
      if (s % 2 === 0 || (M.drums && s % 3 === 0)) {
        note(t, midi(M.root + sc[deg % 7] + Math.floor(deg / 7) * 12 + oct), spb * 1.7, 0.13, M.wave);
      }
      if (M.bass !== 'none' && s % 4 === 0) {
        const b = M.bass === 'march' ? sc[s % 2 ? 4 : 0] : M.bass === 'walk' ? sc[(s / 2) % 7] : sc[0];
        note(t, midi(M.root - 24 + b), spb * 3.4, 0.17, 'triangle');
      }
      if (M.drums) {
        if (s % 4 === 0) { const g = ctx.createGain(); const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.18); env(g, t, 0.005, 0.2, 0.3); o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.25); }
        if (s % 4 === 2) { const src = ctx.createBufferSource(); src.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 5000; const g = ctx.createGain(); env(g, t, 0.002, 0.07, 0.09); src.connect(f); f.connect(g); g.connect(musicBus); src.start(t); src.stop(t + 0.1); }
      }
      music.next += spb; music.step = (s + 1) % 64;
    }
  }

  function musicSet(mood) { if (mood && MOODS[mood]) music.mood = mood; }
  function musicStart(mood) {
    if (!ctx) return;
    musicSet(mood);
    if (music.playing) return;
    music.playing = true; music.step = 0; music.next = ctx.currentTime + 0.06;
    music.timer = setInterval(schedule, 90); schedule();
  }
  function musicStop() { music.playing = false; clearInterval(music.timer); }
  function fadeOut() {
    if (!ctx) return;
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.12);
    setTimeout(() => { musicStop(); if (ctx) musicBus.gain.value = 0.5; }, 600);
  }

  // ---- Bloopers cartoon voice: gibberish syllables shaped like the real line ----
  const VOWELS = ['o', 'a', 'i', 'u', 'e', 'oo', 'ee', 'ah', 'oh'];
  const SYL = ['bo', 'ba', 'da', 'doo', 'ga', 'goo', 'ka', 'la', 'loo', 'ma', 'mee', 'na', 'nee', 'pa', 'poo', 'ra', 'see', 'ta', 'too', 'wa', 'wee', 'ya', 'zo', 'bop', 'dip', 'yip', 'wop', 'zip'];
  function wordsOf(text) { return String(text).split(/\s+/).filter(w => w.replace(/[^a-z0-9]/gi, '').length); }
  function syllable(w, i, seed) {
    if (/[!?]$/.test(w)) return i % 2 ? 'yip' : 'hah';
    const s = /^[aeiou]/i.test(w) ? '' : w[0].toLowerCase();
    const v = (w.match(/[aeiouy]/i) || ['a'])[0].toLowerCase();
    let pick = VOWELS.indexOf(v) >= 0 ? v : 'a';
    if (seed % 3 === 0) pick = VOWELS[(seed + i) % VOWELS.length];
    return (SYL[(seed + i * 5) % SYL.length][0] || s || 'b') + pick;
  }

  /**
   * speak(text, opts) - cartoon mumble for a line.
   * opts: { when, pitch (0.6..1.8), rate (words per second), voice (name hash), emotion, gain, onEnd }
   */
  function speak(text, opts) {
    if (!ctx || muted) return 0;
    const o = Object.assign({}, opts || {});
    const t = Math.max(ctx.currentTime + 0.02, o.when || ctx.currentTime);
    const words = wordsOf(text).length || 1;
    const rate = o.rate || 3.0;                                // words per second
    const durPerWord = 1 / rate;
    const pitch = o.pitch || 1;
    let seed = 0; for (const ch of String(o.voice || 'narrator')) seed = (seed * 31 + ch.charCodeAt(0)) % 997;
    let word = 0;
    const total = Math.min(durPerWord * words, (o.maxDur || 99));
    let n = 0;
    for (const raw of String(text).split(/\s+/)) {
      const w = raw.replace(/[^a-zA-Z0-9'!?-]/g, '');
      if (!w) continue;
      const t0 = t + word * durPerWord;
      if (t0 > t + total) break;
      const syls = Math.max(1, Math.min(3, Math.ceil(w.replace(/[^a-z]/gi, '').length / 2.4)));
      for (let s = 0; s < syls; s++) {
        const st = t0 + s * durPerWord * 0.55 / syls;
        const f = (95 + ((seed * 7 + n * 37) % 95)) * pitch;
        const isVowel = /^[aeiou]/i.test(syllable(w, s, seed));
        const osc = ctx.createOscillator(), g = ctx.createGain(), filt = ctx.createBiquadFilter();
        osc.type = o.voice === 'narrator' ? 'triangle' : (pitch > 1.15 ? 'sawtooth' : 'square');
        osc.frequency.setValueAtTime(f * (isVowel ? 1 : 0.9), st);
        osc.frequency.linearRampToValueAtTime(f * (1.06 + ((n * 13) % 7) / 40), st + durPerWord * 0.3);
        filt.type = 'lowpass'; filt.frequency.value = 900 + ((seed + n * 53) % 1100);
        filt.Q.value = 5;
        const loud = (0.13 + ((n * 17) % 5) / 100) * (o.gain || 1);
        env(g, st, 0.012, Math.min(0.16, durPerWord * 0.8), loud);
        osc.connect(filt); filt.connect(g); g.connect(voiceBus);
        osc.start(st); osc.stop(st + durPerWord + 0.08);
        n++;
      }
      word += 1 + (w.length > 7 ? 0.35 : 0);
    }
    return t + total;
  }

  function muted$set(v) { muted = !!v; if (master) master.gain.value = muted ? 0 : 0.95; }
  const isMuted = () => muted;

  return { init, play, SFX: Object.keys(SFX), speak, musicStart, musicStop, fadeOut, musicSet,
    now: () => (ctx ? ctx.currentTime : 0),
    get stream() { init(); return mediaDest ? mediaDest.stream : null; },
    set muted(v) { muted$set(v); }, get muted() { return isMuted(); },
    get ready() { return !!ctx; },
    // one-shot "hey, this is a cartoon" sting
    sting() {
      if (!init()) return;
      const t = ctx.currentTime + 0.02;
      [523, 659, 784, 1046].forEach((f, i) => tone('square', f, f, t + i * 0.09, 0.12, 0.22));
      SFX.sparkle(t + 0.42);
    }
  };
})();
