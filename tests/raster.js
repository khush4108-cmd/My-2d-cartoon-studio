// A real software rasteriser for the subset of Canvas2D this product uses, so
// frames can be rendered OUTSIDE a browser and looked at as PNGs.
// Implements: paths (moveTo/lineTo/quadratic/bezier/arc/arcTo/ellipse/rect/
// closePath), fill (nonzero winding), stroke (round joins), fillRect/strokeRect,
// clip, save/restore, translate/rotate/scale, linear gradients, bitmap text.
'use strict';
const zlib = require('zlib');

// ---------------------------------------------------------------- colour ----
const NAMED = { white: [255,255,255,1], black: [0,0,0,1], red: [255,0,0,1], none: [0,0,0,0] };
function parseColor(s) {
  if (Array.isArray(s)) return s;
  if (s && s.__grad) return s;
  s = String(s).trim();
  if (s[0] === '#') {
    if (s.length === 4) return [parseInt(s[1]+s[1],16), parseInt(s[2]+s[2],16), parseInt(s[3]+s[3],16), 1];
    if (s.length >= 7) return [parseInt(s.slice(1,3),16), parseInt(s.slice(3,5),16), parseInt(s.slice(5,7),16),
      s.length === 9 ? parseInt(s.slice(7,9),16)/255 : 1];
  }
  const m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (m) { const p = m[1].split(',').map(parseFloat); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
  const n = NAMED[s.toLowerCase()]; if (n) return n;
  return [255, 0, 255, 1];           // magenta = a colour we failed to parse: makes bugs visible
}

// ------------------------------------------------------------- 5x7 font ----
// Bitmap font so captions are readable in the evidence frames. Each glyph is
// 7 rows of 5 pixels; lowercase is drawn as uppercase.
const G = rows => {
  if (rows.length !== 7) throw new Error('glyph must have 7 rows, got ' + rows.length);
  rows.forEach(r => { if (r.length !== 5) throw new Error('glyph row must be 5 wide: ' + JSON.stringify(r)); });
  return rows.join('');
};
const FONT = {
  'A': G(['.###.','#...#','#...#','#####','#...#','#...#','#...#']),
  'B': G(['####.','#...#','#...#','####.','#...#','#...#','####.']),
  'C': G(['.###.','#...#','#....','#....','#....','#...#','.###.']),
  'D': G(['####.','#...#','#...#','#...#','#...#','#...#','####.']),
  'E': G(['#####','#....','#....','###..','#....','#....','#####']),
  'F': G(['#####','#....','#....','###..','#....','#....','#....']),
  'G': G(['.###.','#...#','#....','#.###','#...#','#...#','.###.']),
  'H': G(['#...#','#...#','#...#','#####','#...#','#...#','#...#']),
  'I': G(['#####','..#..','..#..','..#..','..#..','..#..','#####']),
  'J': G(['..###','...#.','...#.','...#.','...#.','#..#.','.#.#.']),
  'K': G(['#...#','#..#.','#.#..','##...','#.#..','#..#.','#...#']),
  'L': G(['#....','#....','#....','#....','#....','#....','#####']),
  'M': G(['#...#','##.##','#.#.#','#.#.#','#...#','#...#','#...#']),
  'N': G(['#...#','##..#','#.#.#','#.#.#','#..##','#...#','#...#']),
  'O': G(['.###.','#...#','#...#','#...#','#...#','#...#','.###.']),
  'P': G(['####.','#...#','#...#','####.','#....','#....','#....']),
  'Q': G(['.###.','#...#','#...#','#...#','#.#.#','#..#.','.##.#']),
  'R': G(['####.','#...#','#...#','####.','#.#..','#..#.','#...#']),
  'S': G(['.####','#....','#....','.###.','....#','....#','####.']),
  'T': G(['#####','..#..','..#..','..#..','..#..','..#..','..#..']),
  'U': G(['#...#','#...#','#...#','#...#','#...#','#...#','.###.']),
  'V': G(['#...#','#...#','#...#','#...#','#...#','.#.#.','..#..']),
  'W': G(['#...#','#...#','#...#','#.#.#','#.#.#','##.##','#...#']),
  'X': G(['#...#','#...#','.#.#.','..#..','.#.#.','#...#','#...#']),
  'Y': G(['#...#','#...#','.#.#.','..#..','..#..','..#..','..#..']),
  'Z': G(['#####','....#','...#.','..#..','.#...','#....','#####']),
  '0': G(['.###.','#...#','#..##','#.#.#','##..#','#...#','.###.']),
  '1': G(['..#..','.##..','..#..','..#..','..#..','..#..','.###.']),
  '2': G(['.###.','#...#','....#','...#.','..#..','.#...','#####']),
  '3': G(['####.','....#','....#','.###.','....#','....#','####.']),
  '4': G(['#..##','#..##','#..##','#####','...##','...##','...##']),
  '5': G(['#####','#....','####.','','....#','#...#','.###.'].map(r => r || '....#')),
  '6': G(['.###.','#....','#....','####.','#...#','#...#','.###.']),
  '7': G(['#####','....#','...#.','..#..','.#...','.#...','.#...']),
  '8': G(['.###.','#...#','#...#','.###.','#...#','#...#','.###.']),
  '9': G(['.###.','#...#','#...#','.####','....#','....#','.###.']),
  ' ': G(['.....','.....','.....','.....','.....','.....','.....']),
  '.': G(['.....','.....','.....','.....','.....','.##..','.##..']),
  ',': G(['.....','.....','.....','.....','.##..','.##..','.#...']),
  '!': G(['..#..','..#..','..#..','..#..','..#..','.....','..#..']),
  '?': G(['.###.','#...#','....#','...#.','..#..','.....','..#..']),
  '-': G(['.....','.....','.....','.###.','.....','.....','.....']),
  ':': G(['.....','.##..','.##..','.....','.##..','.##..','.....']),
  '"': G(['.#.#.','.#.#.','.....','.....','.....','.....','.....']),
  "'": G(['..#..','..#..','.....','.....','.....','.....','.....']),
  '(': G(['...#.','..#..','.#...','.#...','.#...','..#..','...#.']),
  ')': G(['.#...','..#..','...#.','...#.','...#.','..#..','.#...']),
};
FONT['\u2019'] = FONT["'"]; FONT['\u2018'] = FONT["'"];
FONT['\u201c'] = FONT['"']; FONT['\u201d'] = FONT['"'];
FONT['\u2026'] = FONT['.'];

function glyph(ch) {
  const u = ch.toUpperCase();
  const g = FONT[u] || FONT[ch];
  if (!g) return null;
  const rows = [];
  for (let r = 0; r < 7; r++) rows.push(g.slice(r * 5, r * 5 + 5));
  return rows;
}

// ------------------------------------------------------------ the context --
class Grad {
  constructor(ctx, x0, y0, x1, y1) {
    this.__grad = true; this.stops = [];
    const m = ctx._ctm;
    const T = (x, y) => ({ x: m.a*x + m.c*y + m.e, y: m.b*x + m.d*y + m.f });
    this.p0 = T(x0, y0); this.p1 = T(x1, y1);
    const dx = this.p1.x - this.p0.x, dy = this.p1.y - this.p0.y;
    this.len2 = dx*dx + dy*dy || 1; this.dx = dx; this.dy = dy;
  }
  addColorStop(o, c) { this.stops.push([o, parseColor(c)]); }
  at(x, y) {
    let t = ((x - this.p0.x) * this.dx + (y - this.p0.y) * this.dy) / this.len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const s = this.stops; if (!s.length) return [0,0,0,1];
    if (t <= s[0][0]) return s[0][1];
    if (t >= s[s.length-1][0]) return s[s.length-1][1];
    for (let i = 1; i < s.length; i++) {
      if (t <= s[i][0]) {
        const a = s[i-1], b = s[i], k = (t - a[0]) / ((b[0] - a[0]) || 1);
        return [a[1][0]+(b[1][0]-a[1][0])*k, a[1][1]+(b[1][1]-a[1][1])*k,
                a[1][2]+(b[1][2]-a[1][2])*k, a[1][3]+(b[1][3]-a[1][3])*k];
      }
    }
    return s[s.length-1][1];
  }
}

class Ctx {
  constructor(w, h) {
    this.canvas = { width: w, height: h };
    this.W = w; this.H = h;
    this.data = new Uint8ClampedArray(w * h * 4);
    for (let i = 3; i < this.data.length; i += 4) this.data[i] = 255;   // opaque black, like a real canvas
    this._ctm = { a:1, b:0, c:0, d:1, e:0, f:0 };
    this._stack = [];
    this._path = [];
    this._clip = null;
    this.fillStyle = '#000'; this.strokeStyle = '#000';
    this.lineWidth = 1; this.lineCap = 'butt'; this.lineJoin = 'miter';
    this.font = '10px sans-serif'; this.textAlign = 'start'; this.globalAlpha = 1;
  }
  // ---- transforms
  _mul(n) { const m = this._ctm;
    this._ctm = { a: m.a*n.a + m.c*n.b, b: m.b*n.a + m.d*n.b,
                  c: m.a*n.c + m.c*n.d, d: m.b*n.c + m.d*n.d,
                  e: m.a*n.e + m.c*n.f + m.e, f: m.b*n.e + m.d*n.f + m.f }; }
  save() { this._stack.push({ ctm: Object.assign({}, this._ctm), fill: this.fillStyle, stroke: this.strokeStyle,
    lw: this.lineWidth, cap: this.lineCap, join: this.lineJoin, font: this.font, align: this.textAlign,
    clip: this._clip, alpha: this.globalAlpha }); }
  restore() { const s = this._stack.pop(); if (!s) return;
    this._ctm = s.ctm; this.fillStyle = s.fill; this.strokeStyle = s.stroke; this.lineWidth = s.lw;
    this.lineCap = s.cap; this.lineJoin = s.join; this.font = s.font; this.textAlign = s.align;
    this._clip = s.clip; this.globalAlpha = s.alpha; }
  translate(x, y) { this._mul({ a:1, b:0, c:0, d:1, e:x, f:y }); }
  scale(x, y) { this._mul({ a:x, b:0, c:0, d:y, e:0, f:0 }); }
  rotate(r) { const c = Math.cos(r), s = Math.sin(r); this._mul({ a:c, b:s, c:-s, d:c, e:0, f:0 }); }
  setTransform(a,b,c,d,e,f) { this._ctm = {a,b,c,d,e,f}; }
  transform(a,b,c,d,e,f) { this._mul({a,b,c,d,e,f}); }
  _T(x, y) { const m = this._ctm; return [m.a*x + m.c*y + m.e, m.b*x + m.d*y + m.f]; }

  // ---- path building (user space, curves flattened here)
  beginPath() { this._path = []; }
  _last() { const s = this._path[this._path.length-1]; return s && s.pts.length ? s.pts[s.pts.length-1] : null; }
  _push(x, y) { let s = this._path[this._path.length-1];
    if (!s) { s = { pts: [], closed: false }; this._path.push(s); } s.pts.push([x, y]); }
  moveTo(x, y) { this._path.push({ pts: [[x, y]], closed: false }); }
  lineTo(x, y) { if (!this._path.length) this.moveTo(x, y); else this._push(x, y); }
  closePath() { const s = this._path[this._path.length-1]; if (s && s.pts.length) { s.closed = true;
    const p = s.pts[0]; if (p[0] !== s.pts[s.pts.length-1][0] || p[1] !== s.pts[s.pts.length-1][1]) s.pts.push([p[0], p[1]]); } }
  quadraticCurveTo(cx, cy, x, y) { const p = this._last() || [cx, cy]; const N = 20;
    for (let i = 1; i <= N; i++) { const t = i/N, u = 1-t;
      this._push(u*u*p[0] + 2*u*t*cx + t*t*x, u*u*p[1] + 2*u*t*cy + t*t*y); } }
  bezierCurveTo(c1x, c1y, c2x, c2y, x, y) { const p = this._last() || [c1x, c1y]; const N = 26;
    for (let i = 1; i <= N; i++) { const t = i/N, u = 1-t;
      this._push(u*u*u*p[0] + 3*u*u*t*c1x + 3*u*t*t*c2x + t*t*t*x,
                 u*u*u*p[1] + 3*u*u*t*c1y + 3*u*t*t*c2y + t*t*t*y); } }
  arc(x, y, r, a0, a1, ccw) {
    let span = a1 - a0;
    if (ccw) { while (span > 0) span -= 2*Math.PI; } else { while (span < 0) span += 2*Math.PI; }
    if (Math.abs(span) > 2*Math.PI) span = ccw ? -2*Math.PI : 2*Math.PI;
    const N = Math.max(10, Math.ceil(Math.abs(span) * r * 0.6));
    const sx = x + r*Math.cos(a0), sy = y + r*Math.sin(a0);
    const lp = this._last();
    if (lp && (Math.abs(lp[0]-sx) > 1e-6 || Math.abs(lp[1]-sy) > 1e-6)) this._push(sx, sy);
    if (!lp) this.moveTo(sx, sy);
    for (let i = 1; i <= N; i++) { const a = a0 + span*i/N; this._push(x + r*Math.cos(a), y + r*Math.sin(a)); }
    if (Math.abs(Math.abs(span) - 2*Math.PI) < 1e-6) this.closePath();
  }
  ellipse(x, y, rx, ry, rot, a0, a1, ccw) {
    let span = a1 - a0;
    if (ccw) { while (span > 0) span -= 2*Math.PI; } else { while (span < 0) span += 2*Math.PI; }
    if (Math.abs(span) > 2*Math.PI) span = ccw ? -2*Math.PI : 2*Math.PI;
    const N = Math.max(12, Math.ceil(Math.abs(span) * Math.max(rx, ry) * 0.5));
    const cr = Math.cos(rot || 0), sr = Math.sin(rot || 0);
    const pt = a => { const px = rx*Math.cos(a), py = ry*Math.sin(a);
      return [x + px*cr - py*sr, y + px*sr + py*cr]; };
    const s0 = pt(a0), lp = this._last();
    if (lp && (Math.abs(lp[0]-s0[0]) > 1e-6 || Math.abs(lp[1]-s0[1]) > 1e-6)) this._push(s0[0], s0[1]);
    if (!lp) this.moveTo(s0[0], s0[1]);
    for (let i = 1; i <= N; i++) { const p = pt(a0 + span*i/N); this._push(p[0], p[1]); }
    if (Math.abs(Math.abs(span) - 2*Math.PI) < 1e-6) this.closePath();
  }
  arcTo(x1, y1, x2, y2, r) {
    const p0 = this._last(); if (!p0) { this.moveTo(x1, y1); return; }
    const d1x = p0[0]-x1, d1y = p0[1]-y1, d2x = x2-x1, d2y = y2-y1;
    const l1 = Math.hypot(d1x, d1y) || 1, l2 = Math.hypot(d2x, d2y) || 1;
    const cosA = Math.max(-1, Math.min(1, (d1x*d2x + d1y*d2y) / (l1*l2)));
    const ang = Math.acos(cosA), tan = Math.tan(ang/2);
    const t = tan > 1e-4 ? Math.min(r/tan, l1/2, l2/2) : 0;
    const T1 = [x1 + d1x/l1*t, y1 + d1y/l1*t], T2 = [x1 + d2x/l2*t, y1 + d2y/l2*t];
    this.lineTo(T1[0], T1[1]); this.quadraticCurveTo(x1, y1, T2[0], T2[1]);
  }
  rect(x, y, w, h) { this.moveTo(x, y); this.lineTo(x+w, y); this.lineTo(x+w, y+h); this.lineTo(x, y+h); this.closePath(); }

  // ---- device-space polygons
  _polys() { return this._path.map(s => s.pts.map(p => this._T(p[0], p[1]))).filter(p => p.length >= 3); }
  _blend(x, y, col, a) {
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return;
    if (this._clip && !this._clip[y*this.W + x]) return;
    a *= this.globalAlpha;
    if (a <= 0) return;
    const i = (y*this.W + x) * 4, d = this.data;
    if (a >= 1) { d[i] = col[0]; d[i+1] = col[1]; d[i+2] = col[2]; d[i+3] = 255; }
    else { d[i] = col[0]*a + d[i]*(1-a); d[i+1] = col[1]*a + d[i+1]*(1-a);
           d[i+2] = col[2]*a + d[i+2]*(1-a); d[i+3] = 255; }
  }
  _fillPolys(polys, style) {
    const grad = style && style.__grad ? style : null;
    const col = grad ? null : parseColor(style);
    if (!grad && col[3] <= 0) return;
    let minY = Infinity, maxY = -Infinity;
    polys.forEach(p => p.forEach(q => { if (q[1] < minY) minY = q[1]; if (q[1] > maxY) maxY = q[1]; }));
    minY = Math.max(0, Math.floor(minY)); maxY = Math.min(this.H - 1, Math.ceil(maxY));
    for (let y = minY; y <= maxY; y++) {
      const sy = y + 0.5, xs = [];
      for (const p of polys) for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        const yi = p[i][1], yj = p[j][1];
        if ((yi <= sy && yj > sy) || (yj <= sy && yi > sy)) {
          const t = (sy - yj) / (yi - yj);
          xs.push([p[j][0] + (p[i][0] - p[j][0]) * t, yi > yj ? 1 : -1]);
        }
      }
      if (!xs.length) continue;
      xs.sort((a, b) => a[0] - b[0]);
      let wind = 0;
      for (let k = 0; k < xs.length; k++) {
        wind += xs[k][1];
        if (wind === 0) continue;                 // the span after this crossing is OUTSIDE
        const x0 = xs[k][0], x1 = k + 1 < xs.length ? xs[k+1][0] : this.W;
        const a = Math.max(0, Math.ceil(x0 - 0.5)), bb = Math.min(this.W - 1, Math.floor(x1 - 0.5));
        for (let x = a; x <= bb; x++) {
          const cc = grad ? grad.at(x + 0.5, sy) : col;
          this._blend(x, y, cc, cc[3]);
        }
      }
    }
  }
  fill() { this._fillPolys(this._polys(), this.fillStyle); }
  stroke() {
    const col = parseColor(this.strokeStyle); if (col[3] <= 0) return;
    const m = this._ctm, sc = Math.hypot(m.a, m.b) || 1;
    const w = Math.max(0.35, this.lineWidth * sc) / 2;
    const polys = [];
    this._path.forEach(s => {
      const pts = s.pts.map(p => this._T(p[0], p[1]));
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i-1], [x1, y1] = pts[i];
        const dx = x1-x0, dy = y1-y0, L = Math.hypot(dx, dy); if (L < 1e-9) continue;
        const nx = -dy/L*w, ny = dx/L*w;
        polys.push([[x0+nx, y0+ny], [x1+nx, y1+ny], [x1-nx, y1-ny], [x0-nx, y0-ny]]);
      }
      // round joins and caps
      const joints = this.lineCap === 'round' || this.lineJoin === 'round' ? pts : pts.slice(1, -1);
      joints.forEach(p => { const N = 10, poly = [];
        for (let k = 0; k <= N; k++) { const a = k/N*2*Math.PI; poly.push([p[0] + Math.cos(a)*w, p[1] + Math.sin(a)*w]); }
        polys.push(poly); });
    });
    // fill each stroke polygon on its own: a union fill lets opposite windings
    // cancel where segments overlap, which shows up as dotted outlines
    for (const poly of polys) this._fillPolys([poly], col);
  }
  fillRect(x, y, w, h) { const q = [this._T(x,y), this._T(x+w,y), this._T(x+w,y+h), this._T(x,y+h)];
    this._fillPolys([q], this.fillStyle); }
  strokeRect(x, y, w, h) { this.beginPath(); this.rect(x, y, w, h); this.stroke(); }
  clearRect(x, y, w, h) { const q = [this._T(x,y), this._T(x+w,y), this._T(x+w,y+h), this._T(x,y+h)];
    const save = this.fillStyle; this.fillStyle = 'rgba(0,0,0,0)';
    let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
    q.forEach(p => { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); });
    for (let yy = Math.max(0, minY|0); yy <= Math.min(this.H-1, maxY|0); yy++)
      for (let xx = Math.max(0, minX|0); xx <= Math.min(this.W-1, maxX|0); xx++) {
        const i = (yy*this.W+xx)*4; this.data[i]=this.data[i+1]=this.data[i+2]=0; this.data[i+3]=0; }
    this.fillStyle = save; }
  clip() {
    const mask = this._maskOf(this._polys());
    if (!this._clip) { this._clip = mask; return; }
    const prev = this._clip, out = new Uint8Array(this.W * this.H);
    for (let i = 0; i < out.length; i++) out[i] = prev[i] && mask[i] ? 1 : 0;
    this._clip = out;
  }
  _maskOf(polys) {
    const mask = new Uint8Array(this.W * this.H);
    let minY = Infinity, maxY = -Infinity;
    polys.forEach(p => p.forEach(q => { if (q[1] < minY) minY = q[1]; if (q[1] > maxY) maxY = q[1]; }));
    minY = Math.max(0, minY|0); maxY = Math.min(this.H-1, Math.ceil(maxY));
    for (let y = minY; y <= maxY; y++) {
      const sy = y + 0.5, xs = [];
      for (const p of polys) for (let i = 0, j = p.length-1; i < p.length; j = i++) {
        const yi = p[i][1], yj = p[j][1];
        if ((yi <= sy && yj > sy) || (yj <= sy && yi > sy)) xs.push([p[j][0] + (p[i][0]-p[j][0])*((sy-yj)/(yi-yj)), yi > yj ? 1 : -1]);
      }
      if (!xs.length) continue;
      xs.sort((a,b) => a[0]-b[0]);
      let wind = 0;
      for (let k = 0; k < xs.length; k++) {
        wind += xs[k][1];
        if (wind === 0) continue;                 // outside
        const x0 = xs[k][0], x1 = k+1 < xs.length ? xs[k+1][0] : this.W;
        for (let x = Math.max(0, Math.ceil(x0-0.5)); x <= Math.min(this.W-1, Math.floor(x1-0.5)); x++) mask[y*this.W+x] = 1;
      }
    }
    return mask;
  }
  createLinearGradient(x0, y0, x1, y1) { return new Grad(this, x0, y0, x1, y1); }
  createRadialGradient(x0, y0, r0, x1, y1, r1) { return new Grad(this, x0, y0, x1, y1); }  // approximated
  _fontSize() { const m = /(\d+(?:\.\d+)?)px/.exec(this.font || ''); return m ? parseFloat(m[1]) : 10; }
  measureText(s) { return { width: String(s).length * this._fontSize() * 0.55 }; }
  fillText(s, x, y) { this._text(s, x, y, this.fillStyle); }
  strokeText(s, x, y) { this._text(s, x, y, this.strokeStyle); }
  _text(s, x, y, style) {
    s = String(s); const size = this._fontSize();
    const cw = size * 0.55, chh = size * 0.72;
    let sx = x;
    if (this.textAlign === 'center') sx = x - s.length * cw / 2;
    else if (this.textAlign === 'right' || this.textAlign === 'end') sx = x - s.length * cw;
    const polys = [];
    for (let i = 0; i < s.length; i++) {
      const g = glyph(s[i]); if (!g) continue;
      const px = cw / 5, py = chh / 7;
      for (let r = 0; r < 7; r++) for (let cIdx = 0; cIdx < 5; cIdx++) {
        if (g[r][cIdx] !== '#') continue;
        const X = sx + i*cw + cIdx*px, Y = y - chh + r*py;
        polys.push([this._T(X, Y), this._T(X+px, Y), this._T(X+px, Y+py), this._T(X, Y+py)]);
      }
    }
    if (polys.length) this._fillPolys(polys, style);
  }
  // ---- output
  downsample(ss) {
    if (ss <= 1) return { w: this.W, h: this.H, data: this.data };
    const w = this.W / ss, h = this.H / ss, out = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0;
      for (let j = 0; j < ss; j++) for (let i = 0; i < ss; i++) {
        const k = ((y*ss+j) * this.W + (x*ss+i)) * 4;
        r += this.data[k]; g += this.data[k+1]; b += this.data[k+2];
      }
      const n = ss*ss, o = (y*w+x)*4;
      out[o] = r/n; out[o+1] = g/n; out[o+2] = b/n; out[o+3] = 255;
    }
    return { w, h, data: out };
  }
}

// ------------------------------------------------------------------ PNG ----
const CRC = (() => { const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t; })();
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function writePNG(file, img) {
  // accepts either a Ctx (W/H) or a downsampled image ({w,h,data})
  const w = img.w === undefined ? img.W : img.w;
  const h = img.h === undefined ? img.H : img.h;
  const data = img.data;
  if (!w || !h || !data) throw new Error('writePNG: bad image ' + JSON.stringify([w, h, !!data]));
  const raw = Buffer.alloc((w*4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y*(w*4+1)] = 0;
    Buffer.from(data.buffer, data.byteOffset + y*w*4, w*4).copy(raw, y*(w*4+1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
  require('fs').writeFileSync(file, png);
  return png.length;
}
module.exports = { Ctx, writePNG, parseColor };
