#!/usr/bin/env node
/**
 * render-video.js  —  builds a real MP4 from the studio's own canvas animation.
 *
 *   node render-video.js --story ../episodes/chiku-vs-bantu.txt --out ../episodes/chiku-vs-bantu.mp4
 *
 * Pipeline:  story text -> WriterFree script -> Renderer timeline
 *            -> every frame drawn with @napi-rs/canvas -> ffmpeg (video + generated audio)
 *
 * Audio (built here with numpy, no sound files needed):
 *   * cartoon mumble voice for every line (same pitch rule as in the browser)
 *   * comedy SFX for crashes, boings, splats, whooshes...
 *   * an original 8-bit style jungle chase tune
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execFileSync } = require('child_process');
const { createCanvas } = require('@napi-rs/canvas');

const ROOT = path.resolve(__dirname, '..');
const FPS = +(process.env.FPS || 30);
const W = 1280, H = 720;

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

// ---------------------------------------------------------------- studio files
global.window = global;
global.performance = { now: () => Date.now() };
global.document = { createElement: () => createCanvas(W, H) };
const JS = ['script-format', 'acting', 'characters', 'scenes', 'sound', 'writer-free', 'renderer'];
for (const f of JS) {
  const code = fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8');
  new Function('window', 'document', code)(global, global.document);
}

// ---------------------------------------------------------------- audio engine
const SR = 44100;
const buf = {};

function toB64(floatArr) {
  const i16 = new Int16Array(floatArr.length);
  for (let i = 0; i < floatArr.length; i++) {
    const v = floatArr[i];
    i16[i] = v > 32767 ? 32767 : v < -32768 ? -32768 : v;
  }
  return Buffer.from(i16.buffer, i16.byteOffset, i16.byteLength).toString('base64');
}
function toMono(chunks) {
  let n = 0;
  for (const c of chunks) n = Math.max(n, c.start + c.data.length);
  const out = new Int16Array(n);
  for (const c of chunks) for (let i = 0; i < c.data.length; i++) {
    const v = out[c.start + i] + c.data[i];
    out[c.start + i] = v > 32767 ? 32767 : v < -32768 ? -32768 : v;
  }
  return out;
}
async function mixdown(tracks, outWav) {   // tracks: [{kind, chunks}]
  const src = `
import json, struct, sys, base64
import numpy as np
tracks = json.load(open('tracks.json'))
SR = 44100
def pcm(c):
    return np.frombuffer(base64.b64decode(c['data']), dtype='<i2').astype(np.float64)
n = 0
for t in tracks:
    for c in t['chunks']:
        c['start'] = c.get('start') or 0
        c['n'] = len(base64.b64decode(c['data'])) // 2
        n = max(n, c['start'] + c['n'])
mix = np.zeros(n, dtype=np.float64)
for t in tracks:
    kind = t['kind']
    if kind == 'music': continue
    for c in t['chunks']:
        d = pcm(c)
        s0 = c['start']
        mix[s0:s0 + len(d)] += d
mus = np.zeros(n, dtype=np.float64)
for t in tracks:
    if t['kind'] != 'music': continue
    for c in t['chunks']:
        d = pcm(c)
        s0 = c['start']
        mus[s0:s0 + len(d)] += d
if n == 0: n = SR
mix = mix / 32768.0
mus = mus / 32768.0
# gentle fade in/out of the whole mix
fade = min(len(mix), int(0.25 * SR))
if fade > 1:
    mix[:fade] *= np.linspace(0, 1, fade)
    mix[-fade:] *= np.linspace(1, 0, fade)
peak = max(1e-6, np.max(np.abs(mix)))
mix = mix / peak * 0.92
mus = mus / max(1e-6, np.max(np.abs(mus))) * 0.13
stereo = np.stack([mix + mus, mix + mus], axis=1)
pcm = np.clip(stereo, -1, 1)
pcm = (pcm * 32767).astype('<i2').tobytes()
import wave
w = wave.open(sys.argv[1], 'wb')
w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes(pcm)
w.close()
print('audio seconds', n / SR)
`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'toonmix-'));
  const small = tracks.map(t => ({ kind: t.kind, chunks: t.chunks.map(c => ({ start: c.start || 0, data: toB64(c.data) })) }));
  fs.writeFileSync(path.join(dir, 'tracks.json'), JSON.stringify(small));
  fs.writeFileSync(path.join(dir, 'mix.py'), src);
  const out = execFileSync('python3', [path.join(dir, 'mix.py'), outWav], {
    cwd: dir, env: Object.assign({}, process.env, { PYTHONPATH: '/tmp/pylibs' }), encoding: 'utf8'
  });
  console.log('  ' + out.trim());
}

// --- tiny synth helpers (all sounds are generated, nothing is downloaded)
function pack(env, freqFn, dur, type, vol) {
  const n = Math.floor(dur * SR), out = new Float32Array(n);
  let ph = 0;
  const st = Math.max(1, Math.floor(SR / 4000));              // anti-alias: step size
  for (let i = 0; i < n; i += st) {
    const t = i / SR, f = freqFn(t / dur);
    ph += 2 * Math.PI * f * (st / SR);
    const wave = type === 'square' ? (Math.sin(ph) >= 0 ? 1 : -1)
      : type === 'saw' ? 2 * ((ph / (2 * Math.PI)) % 1) - 1
      : type === 'tri' ? 2 * Math.abs(2 * ((ph / (2 * Math.PI)) % 1) - 1) - 1
      : Math.sin(ph);
    const e = env(t / dur);
    const v = wave * e * vol * 32767;
    for (let k = 0; k < st && i + k < n; k++) out[i + k] = v;
  }
  return out;
}
function noiseBurst(dur, vol, filter) {
  const n = Math.floor(dur * SR), raw = new Float32Array(n);
  let prev = 0, lp = 0;
  for (let i = 0; i < n; i++) {
    const x = Math.random() * 2 - 1;
    const t = i / n;
    const k = filter(t);                                     // 0..1 cutoff
    lp += (x - lp) * (0.02 + k * 0.6);
    const e = Math.min(1, t * 40) * Math.pow(1 - t, 1.4);
    raw[i] = lp * e * vol * 32767;
  }
  return raw;
}
const E = {
  pluck: t => Math.min(1, t * 60) * Math.pow(1 - t, 1.6),
  hit: t => Math.pow(1 - t, 2),
  gate: t => (t < 0.9 ? Math.min(1, t * 80) * Math.min(1, (0.9 - t) * 60) : 0)
};

const SFX = {
  crash: v => add(noiseBurst(0.45, 0.5 * v, t => 1 - t), pack(E.hit, p => 320 - 220 * p, 0.3, 'square', 0.28 * v)),
  boing: v => pack(E.gate, p => 220 + 520 * Math.sin(Math.PI * Math.min(1, p * 1.4)) - 120 * p, 0.6, 'tri', 0.4 * v),
  whoosh: v => noiseBurst(0.5, 0.45 * v, t => t),
  slideWhistle: v => add(pack(E.gate, p => 1150 - 900 * p, 0.5, 'sine', 0.3 * v),
                         shift(pack(E.gate, p => 1100 - 860 * p, 0.45, 'sine', 0.26 * v), 0.55)),
  bonk: v => add(pack(E.hit, p => 640 - 400 * p, 0.16, 'sine', 0.45 * v), noiseBurst(0.08, 0.2 * v, () => 0.9)),
  drum: v => add(pack(E.hit, p => 165 - 110 * p, 0.32, 'sine', 0.5 * v),
                 pack(E.hit, p => 160 - 105 * p, 0.22, 'sine', 0.3 * v)),
  splat: v => noiseBurst(0.28, 0.55 * v, t => 1 - t * 0.8),
  ding: v => add(pack(E.pluck, () => 1318, 0.5, 'sine', 0.3 * v), pack(E.pluck, () => 1760, 0.45, 'sine', 0.18 * v)),
  sparkle: v => [1046, 1318, 1568, 2093].reduce((acc, f, i) => add(acc, shift(pack(E.pluck, () => f, 0.2, 'tri', 0.18 * v), i * 0.06)), []),
  pop: v => pack(E.hit, p => 240 + 700 * p, 0.12, 'sine', 0.35 * v),
  heartbeat: v => add(pack(E.hit, p => 90 - 30 * p, 0.15, 'sine', 0.4 * v), shift(pack(E.hit, p => 80 - 25 * p, 0.17, 'sine', 0.3 * v), 0.2)),
  swoosh: v => noiseBurst(0.35, 0.4 * v, t => t * 1.4),
  boo: v => add(pack(E.gate, p => 260 - 130 * p, 0.3, 'saw', 0.3 * v), shift(pack(E.gate, p => 250 - 120 * p, 0.3, 'saw', 0.28 * v), 0.35)),
  tick: v => pack(E.hit, () => 1800, 0.03, 'square', 0.12 * v),
  birds: v => [1400, 1800, 2100, 1650].reduce((acc, f, i) => add(acc, shift(pack(E.pluck, p => f * (1 + p * 0.5), 0.09, 'sine', 0.12 * v), i * 0.11)), []),
  engine: v => add(pack(E.gate, () => 58, 0.5, 'saw', 0.25 * v), noiseBurst(0.4, 0.12 * v, () => 0.3)),
  door: v => add(noiseBurst(0.16, 0.4 * v, () => 0.2), pack(E.hit, p => 120 - 60 * p, 0.22, 'sine', 0.3 * v))
};

// round-robin frame buffer helpers -------------------------------------------
function add(a, b) { return a.map((v, i) => v + (b[i] || 0)); }
function shift(a, sec) {
  const s = Math.floor(sec * SR), out = new Float32Array(a.length + s);
  out.set(a, s); return out;
}
function mute(len) { return new Float32Array(Math.max(1, Math.floor(len * SR))); }

// cartoon mumble voice ------------------------------------------------------
function muffle(arr, cutoff) {
  const a = 1 - Math.exp(-2 * Math.PI * cutoff / SR);
  let lp = 0;
  for (let i = 0; i < arr.length; i++) { lp += (arr[i] - lp) * a; arr[i] = lp; }
  return arr;
}
function speak(text, when, pitch, dur, vol) {
  const vowels = 'oa iueeooahoh'.split(' ');
  const syl = ['bo', 'ba', 'da', 'doo', 'ga', 'goo', 'ka', 'la', 'loo', 'ma', 'mee', 'na', 'nee', 'pa', 'poo', 'ra', 'see', 'ta', 'too', 'wa', 'wee', 'ya', 'zo', 'bop', 'dip', 'yip', 'wop', 'zip'];
  let seed = 0; for (const ch of String(text)) seed = (seed * 31 + ch.charCodeAt(0)) % 997;
  const words = String(text).split(/\s+/).filter(Boolean);
  const perWord = Math.min(1 / 3.4, dur / Math.max(1, words.length));
  const out = new Float32Array(Math.floor((dur + 0.25) * SR));
  let n = 0;
  words.forEach((w, wi) => {
    const clean = w.replace(/[^a-zA-Z0-9!?']/g, '');
    if (!clean) return;
    const sy = Math.max(1, Math.min(3, Math.ceil(clean.replace(/[^a-z]/gi, '').length / 2.4)));
    for (let s = 0; s < sy; s++) {
      const start = (wi * perWord + (s * perWord * 0.55) / sy) * SR;
      const f = (95 + ((seed * 7 + n * 37) % 95)) * pitch;
      const len = Math.max(0.05, perWord / sy * 1.15);
      const tone = pack(E.pluck, p => f * (1 + 0.06 * Math.sin(p * 22)), len, n % 3 ? 'saw' : 'square', 0.55 * vol);
      for (let i = 0; i < tone.length; i++) {
        const idx = Math.floor(start) + i;
        if (idx < out.length) out[idx] += tone[i];
      }
      n++;
    }
  });
  muffle(out, 1500 + (seed % 700));
  for (let i = 0; i < out.length; i++) out[i] *= 0.3;
  return { start: Math.floor(when * SR) || 0, data: out };
}

// original 8-bit jungle-chase loop ------------------------------------------
function music(total, mood) {
  const scale = mood === 'night' ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  const bpm = mood === 'night' ? 88 : 142, root = mood === 'night' ? 62 : 67;
  const midi = m => 440 * Math.pow(2, (m - 69) / 12);
  const spb = 60 / bpm / 2;
  const out = new Float32Array(Math.floor((total + 1) * SR));
  const mel = [0, 2, 4, 2, 5, 4, 2, 0, 4, 5, 6, 5, 4, 2, 1, 0];
  const put = (arr, at) => {
    const s = Math.floor(at * SR);
    for (let i = 0; i < arr.length && s + i < out.length; i++) out[s + i] += arr[i];
  };
  let s = 0;
  for (let step = 0; s < total; step++) {
    const t = step * spb;
    const deg = mel[(step + 3) % 16];
    if (step % 2 === 0 || step % 3 === 0) {
      const f = midi(root + scale[deg % 7] + Math.floor(deg / 7) * 12 + (step % 8 === 4 ? 12 : 0));
      put(pack(E.pluck, () => f, spb * 1.7, 'square', 0.085), t);
    }
    if (step % 4 === 0) put(pack(E.pluck, () => midi(root - 24 + scale[step % 2 ? 4 : 0]), spb * 3.2, 'tri', 0.2), t);
    if (mood !== 'night') {
      if (step % 4 === 0) put(pack(E.hit, p => 150 - 100 * p, 0.2, 'sine', 0.25), t);
      if (step % 4 === 2) put(noiseBurst(0.07, 0.07, () => 0.95), t);
    }
    s = t + spb;
  }
  return { start: 0, data: out };
}

// ---------------------------------------------------------------- main render
(async () => {
  const storyFile = arg('story', path.join(ROOT, 'episodes', 'chiku-vs-bantu.txt'));
  const outFile = path.resolve(arg('out', path.join(ROOT, 'episodes', 'chiku-vs-bantu.mp4')));
  const story = fs.readFileSync(storyFile, 'utf8');

  const script = WriterFree.write(story);
  const tl = Renderer.build(script);
  console.log('title:', script.title, '| cast:', script.characters.map(c => c.name + ' (' + (c.species || c.look.build) + ')').join(', '));
  console.log('duration:', tl.total.toFixed(1) + 's', '| frames:', Math.ceil(tl.total * FPS));

  // ---- audio tracks
  const voice = [], sfx = [];
  const seen = new Set();
  let mood = 'jungle';
  script.scenes.forEach(sc => {
    if (sc.bg === 'night') mood = 'night';
    sc.beats.forEach(b => {
      if (seen.has(b)) return;
      seen.add(b);
      const pitch = b.who === 'Narrator' ? 1.0 : 0.8 + ((String(b.who).charCodeAt(0) || 5) % 9) * 0.08;
      const p2 = b.emotion === 'angry' ? pitch * 0.86 : b.emotion === 'sad' ? pitch * 0.92 : pitch;
      voice.push(speak(b.say, b.start + 0.04, p2, Math.max(0.4, b.dur * 0.94), 1));
      if (b.sfx && SFX[b.sfx]) sfx.push({ start: Math.floor((b.start + 0.02) * SR), data: SFX[b.sfx](1) });
    });
  });
  const mus = Object.assign({ start: 0 }, music(tl.total, mood));
  voice.forEach(v => { if (v.start == null) v.start = 0; });
  sfx.forEach(v => { if (v.start == null) v.start = 0; });
  const tmpWav = path.join(os.tmpdir(), 'toon-' + Date.now() + '.wav');
  await mixdown([{ kind: 'voice', chunks: voice }, { kind: 'sfx', chunks: sfx }, { kind: 'music', chunks: [mus] }], tmpWav);

  // ---- ffmpeg
  let ffmpeg = null;
  try { ffmpeg = require('ffmpeg-static'); } catch (e) { ffmpeg = null; }
  if (!ffmpeg) {
    try { ffmpeg = require('child_process').execFileSync('python3', ['-c', 'import sys;sys.path.insert(0,"/tmp/pylibs");import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8' }).trim(); } catch (e) { ffmpeg = 'ffmpeg'; }
  }
  const args = ['-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', W + 'x' + H, '-r', String(FPS), '-i', '-',
    '-i', tmpWav, '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', outFile];
  console.log('encoding with:', ffmpeg);
  const ff = spawn(ffmpeg, args, { stdio: ['pipe', 'inherit', 'inherit'] });

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const frames = Math.ceil(tl.total * FPS);
  let i = 0, t0 = Date.now();
  await new Promise((resolve, reject) => {
    ff.on('error', reject);
    ff.on('close', code => code === 0 ? resolve() : reject(new Error('ffmpeg exit ' + code)));
    (function next() {
      if (i >= frames) { ff.stdin.end(); return; }
      const t = i / FPS;
      try { Renderer.drawFrame(canvas, tl, t); } catch (e) { return reject(e); }
      const raw = Buffer.from(ctx.getImageData(0, 0, W, H).data.buffer);
      const ok = ff.stdin.write(raw);
      i++;
      if (i % 90 === 0) console.log('  frames', i + '/' + frames, '|', ((i / ((Date.now() - t0) / 1000)).toFixed(0)) + ' fps');
      if (ok) setImmediate(next); else ff.stdin.once('drain', next);
    })();
  });

  const kb = (fs.statSync(outFile).size / 1048576).toFixed(1);
  console.log('DONE ->', outFile, kb + ' MB');
})().catch(e => { console.error('RENDER FAILED:', e); process.exit(1); });
