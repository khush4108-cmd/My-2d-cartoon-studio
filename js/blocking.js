// Scene Blocking Director: keeps every character in their own space.
// Runs once per timeline (called by Renderer.build) and re-spaces each beat:
//   * even composition slots for whoever is on stage (balanced picture)
//   * hard minimum gaps from real body widths (a lion needs lion-sized space)
//   * story intent wins: characters the script moves keep their approach spot
//   * a composition spring pulls everyone else back so crowding never builds
//   * carried props ride in a paw (skipped); props on the ground act as walls
//   * characters who leave mid-scene draw IN FRONT while they walk off
window.Blocking = (function () {
  const W = 1280;
  const halfW = L => {
    if (!L) return 88;
    if (L.kind === 'object') return Math.max(45, Math.round(125 * (L.size || 1)));
    if (L.kind === 'animal') {
      // measured: rabbit(0.79)->88, squirrel(0.95)->95, lion(1.96)->277, bear(1.87)->149.
      // small animals track 115*size closely; big four-legged animals get a mane/body
      // factor of 1.3 (>= the widest measured, the lion at 1.23) so they never overlap.
      const big = !!(L.sp && L.sp.legs === 4 && (L.size || 1) >= 1.2);
      return Math.max(45, Math.round(115 * (L.size || 1) * (big ? 1.3 : 1)));
    }
    return 88;                                                     // measured human halfW ~76 + arm/motion margin
  };
  const need = (tl, a, b) => {
    const La = tl.looks[a], Lb = tl.looks[b];
    const ha = halfW(La), hb = halfW(Lb), base = ha + hb;         // bodies just touching
    // props are set pieces: a character may stand close beside / behind them
    if ((La && La.kind === 'object') || (Lb && Lb.kind === 'object')) return base * 0.55;
    // characters: never below base (that would overlap); big pairs get a tighter breath
    return base + (base > 350 ? 26 : 30);
  };
  const mg = (tl, nm) => Math.min(90, Math.max(0, halfW(tl.looks[nm]) - 125));

  function apply(tl) {
    if (!tl || !tl.scenes) return tl;
    let holdMap = {};
    tl.scenes.forEach(sc => {
      if (!sc.stage || !sc.beats || !sc.beats.length) return;
      const order = sc.stage.map(e => e.name);
      const held = {};
      // which prop rides in whose paw during each beat (the renderer glues it
      // to the hand while held, so its restX must not steer anybody else).
      // A MAP, because two props can be held at once ("Bruno ate nuts" while
      // "Leo found the apple"). Carries across scenes like the renderer's.
      const lastX = {};                     // where each body ended up last beat
      sc.beats.forEach(b => {
        if (b.grab) holdMap[b.grab.obj] = b.grab.actor;
        b._heldMap = Object.assign({}, holdMap);
        b._held = b.grab ? b.grab.obj : (Object.keys(holdMap)[0] || null);
        b._holder = b._held ? holdMap[b._held] : null;
        if (b.throw) delete holdMap[b.throw.obj];
      });
      // A prop grabbed "from the tree" lives at the canopy trunk for the whole
      // scene, so the walker's target, the gap solver and the drawn anchor all
      // agree on where that tree is.
      sc.beats.forEach((b, bi) => {
        if (!(b.grab && b.grab.fromUp)) return;
        const obj = b.grab.obj, act = b.grab.actor;
        let ax0 = 640;
        for (const b2 of sc.beats) { if (b2.restX && b2.restX[act] !== undefined) { ax0 = b2.restX[act]; break; } }
        const trs = (typeof Scenes !== 'undefined' && Scenes.trees && Scenes.trees[sc.bg]) || [];
        let ax = ax0;
        if (trs.length) {
          let best = trs[0], bd = Infinity;
          trs.forEach(tr => { const d2 = Math.abs(ax0 - tr[0]); if (d2 < bd) { bd = d2; best = tr; } });
          ax = best[0] + 52 * (ax0 >= best[0] ? 1 : -1);
        }
        let threwAt = -1;
        sc.beats.forEach((b3, i3) => { if (threwAt < 0 && b3.throw && b3.throw.obj === obj) threwAt = i3; });
        sc.beats.forEach((b3, i3) => {
          if (threwAt >= 0 && i3 > threwAt) return;             // after the hand-over it lives in the catcher's paw
          if (b3.restX && b3.restX[obj] !== undefined) b3.restX[obj] = ax;
        });
      });
      // story-driven exits: a character whose last mention is well before the
      // scene end walks off during that last beat instead of lingering
      const EXITV = /walked home|went home|walked away|ran away|ran off|left the|walked off|hurried away|flew away|goodbye/i;
      const lastM = {};
      sc.beats.forEach((b, i) => {
        if (!EXITV.test(String(b.say || ''))) return;
        (b.who && b.who !== 'Narrator' ? [b.who] : []).concat(b.mentioned || []).forEach(nm => {
          if (lastM[nm] === undefined) lastM[nm] = i;
        });
      });
      sc.stage.forEach(e => {
        const li = lastM[e.name];
        if (li !== undefined && li < sc.beats.length - 2) {
          e.exit = Math.min(e.exit, sc.beats[li].start + sc.beats[li].dur);
        }
      });
      // exiting characters cross IN FRONT of the group while walking off
      sc.stage.filter(e => e.exit < sc.end - 0.01).forEach(e => {
        const k = sc.stage.indexOf(e);
        if (k >= 0 && k < sc.stage.length - 1) { sc.stage.splice(k, 1); sc.stage.push(e); }
      });
      sc.beats.forEach((b, bi) => {
        Object.keys(b.restX || {}).forEach(nm => {
          if (lastM[nm] !== undefined && bi > lastM[nm]) delete b.restX[nm];
        });
      });
      const airUntil = {};                       // prop -> pick beat (canopy-hung till then)
      sc.beats.forEach((b, bi) => { if (b.grab && b.grab.fromUp && airUntil[b.grab.obj] === undefined) airUntil[b.grab.obj] = bi; });
      sc.beats.forEach((b, bi) => {
        if (b.grab) held[b.grab.obj] = true;
        if (b.throw) held[b.throw.obj] = false;
        if (!b.restX) return;
        const air = n => airUntil[n] !== undefined && bi < airUntil[n];   // hanging, not standing
        const onStage = Object.keys(b.restX).filter(n => order.indexOf(n) >= 0);
        const walls = onStage.filter(n => tl.looks[n] && tl.looks[n].kind === 'object' && !held[n] && !air(n));
        // A prop being picked up THIS beat is already in the picker's hand by the
        // end of it: it must not act as a wall that shoves its own picker away.
        const picking = (b.grab && tl.looks[b.grab.obj] && tl.looks[b.grab.obj].kind === 'object') ? b.grab.obj : null;
        const bodies = onStage.filter(n => walls.indexOf(n) < 0 && n !== picking && !air(n) &&
          !(held[n] && tl.looks[n] && tl.looks[n].kind === 'object'));
        const all = bodies.concat(walls);
        if (all.length < 2) return;
        const x = Object.assign({}, b.restX);
        const x0 = Object.assign({}, b.restX);                     // engine staging, to stay close to
        const movers = b.movers || [];
        // order so the spring stabilises the arrangement instead of fighting it
        const homeOrder = bodies.slice().sort((p, q) => x[p] - x[q]);
        let minSpan = 0;
        for (let i = 1; i < homeOrder.length; i++) minSpan += need(tl, homeOrder[i - 1], homeOrder[i]);
        const edge = (all.length >= 5 || minSpan > W - 240) ? 58 : 110;   // crowded stages use more width
        const L = edge, R = W - edge, n = homeOrder.length;
        const home = {};
        homeOrder.forEach((nm, j) => { home[nm] = L + (R - L) * (j + .5) / n; });
        // Full stage band: a body's centre stays within [70+mg, W-70-mg]. Small
        // characters are then never cropped; a genuinely huge animal (lion/bear)
        // may crop slightly at the frame edge, which reads as normal framing and
        // buys the group the widest possible span so nobody overlaps.
        const loBnd = nm => 70 + mg(tl, nm);
        const hiBnd = nm => W - 70 - mg(tl, nm);
        const clampNm = nm => {                                   // keep the character on stage
          x[nm] = Math.max(loBnd(nm), Math.min(hiBnd(nm), x[nm]));
        };
        const relax = passes => {
          for (let p = 0; p < passes; p++) {
            const line = all.slice().sort((a, b2) => x[a] - x[b2]);
            for (let i = 1; i < line.length; i++) {
              const a = line[i - 1], c = line[i];
              const gap = x[c] - x[a], lack = need(tl, a, c) - gap;
              if (lack <= 0) continue;
              const aw = walls.indexOf(a) >= 0, cw = walls.indexOf(c) >= 0;
              const am = movers.indexOf(a) >= 0, cm = movers.indexOf(c) >= 0;
              if (aw && cw) continue;                            // two props: leave them
              if (aw) { if (!cm) x[c] += lack; }                 // prop wall: mover yields
              else if (cw) { if (!am) x[a] -= lack; }
              else if (am && cm) { x[a] -= lack / 2; x[c] += lack / 2; }
              else if (am) x[c] += lack;                          // bystander makes room
              else if (cm) x[a] -= lack;
              else { x[a] -= lack / 2; x[c] += lack / 2; }
            }
            bodies.forEach(clampNm);
          }
        };
        relax(4);
        bodies.forEach(nm => {                                   // composition spring
          if (movers.indexOf(nm) < 0) x[nm] = x[nm] * .45 + home[nm] * .55;
        });
        relax(6);
        // Unified wall-aware optimal packing. Props (walls) are fixed anchors;
        // the bodies between two anchors are laid out as a chain that meets
        // every need() gap, then centred in the free span. With no props this
        // is exactly the old single-group packing, so behaviour is unchanged.
        {
          const line = all.slice().sort((a, b2) => x[a] - x[b2]);   // bodies + walls, left to right
          let k = 0;
          while (k < line.length) {
            if (walls.indexOf(line[k]) >= 0) { k++; continue; }      // wall: fixed, skip
            const runStart = k, run = [];
            while (k < line.length && walls.indexOf(line[k]) < 0) { run.push(line[k]); k++; }
            const leftWall  = runStart > 0 && walls.indexOf(line[runStart - 1]) >= 0 ? line[runStart - 1] : null;
            const rightWall = k < line.length && walls.indexOf(line[k]) >= 0 ? line[k] : null;
            // Lay this run out. Prefer the ideal need() gaps in engine order;
            // if the span is too small, fall back to (a) biggest bodies at the
            // ends (shortest possible chain) and then (b) touch gaps (no breath
            // margin) so characters get close but NEVER overlap. Only the truly
            // impossible case squeezes below touch.
            const gapNeed  = (p, q) => need(tl, p, q);
            const gapTouch = (p, q) => halfW(tl.looks[p]) + halfW(tl.looks[q]);
            const tryPlace = (order, gapFn, relaxHuge) => {
              const lo0 = nm => (relaxHuge && halfW(tl.looks[nm]) > 160) ? 70 : loBnd(nm);
              const hi0 = nm => (relaxHuge && halfW(tl.looks[nm]) > 160) ? W - 70 : hiBnd(nm);
              let lo = lo0(order[0]);
              if (leftWall)  lo = Math.max(lo, x[leftWall] + need(tl, leftWall, order[0]));
              let hi = hi0(order[order.length - 1]);
              if (rightWall) hi = Math.min(hi, x[rightWall] - need(tl, order[order.length - 1], rightWall));
              const xs = [lo];
              for (let q = 1; q < order.length; q++) xs.push(xs[q - 1] + gapFn(order[q - 1], order[q]));
              return { order: order, xs: xs, lo: lo, hi: hi, fits: xs[xs.length - 1] <= hi };
            };
            const biggestEnds = arr => {                           // two widest bodies frame the group
              if (arr.length < 3) return arr.slice();
              const byW = arr.slice().sort((p, q) => halfW(tl.looks[q]) - halfW(tl.looks[p]));
              const big1 = byW[0], big2 = byW[1];
              const mid = arr.filter(n => n !== big1 && n !== big2); // keep engine order in the middle
              const left = arr.indexOf(big1) <= arr.indexOf(big2) ? big1 : big2;
              const right = left === big1 ? big2 : big1;
              return [left].concat(mid, [right]);
            };
            let P = tryPlace(run, gapNeed);
            if (!P.fits) {
              const ro = biggestEnds(run);
              const P2 = tryPlace(ro, gapNeed);
              if (P2.fits) P = P2;
              else {
                const P3 = tryPlace(ro, gapTouch);
                if (P3.fits) P = P3;
                else {
                  const P4 = tryPlace(run, gapTouch);
                  // last resort: an overcrowded stage lets a giant animal crop
                  // fully at the frame edge rather than overlap the small cast
                  P = P4.fits ? P4 : tryPlace(ro, gapTouch, true);
                }
              }
            }
            const xs = P.xs, lo = P.lo, hi = P.hi;
            const over = xs[xs.length - 1] - hi;
            if (over > 0) {                                          // still too small: slide left, then squeeze evenly
              const slide = Math.min(over, xs[0] - lo);
              for (let q = 0; q < xs.length; q++) xs[q] -= slide;
              let left = xs[xs.length - 1] - hi;
              if (left > 0 && xs.length > 1) {
                // NEVER compress into an overlapping clump. Every gap keeps a
                // hard floor of "the two bodies just touching + 8px of breath".
                // If even that cannot fit on the stage, the cast is scaled down
                // a little (still legible) instead of being pushed together.
                const floorGap = (a, b2) => halfW(tl.looks[a]) + halfW(tl.looks[b2]) + 8;
                const pack = () => {
                  let acc = lo + halfW(tl.looks[P.order[0]]);
                  xs[0] = acc;
                  for (let q = 1; q < xs.length; q++) { acc += floorGap(P.order[q - 1], P.order[q]); xs[q] = acc; }
                  return xs[xs.length - 1] + halfW(tl.looks[P.order[xs.length - 1]]);
                };
                let end = pack();
                if (end > hi) {
                  const f = Math.max(0.62, (hi - lo) / (end - lo));
                  P.order.forEach(nm => { const Lk = tl.looks[nm]; if (Lk) Lk.size = (Lk.size || 1) * f; });
                  end = pack();
                }
                left = end - hi;
              }
            } else {
              let shift = (hi - xs[xs.length - 1]) / 2;            // centre the chain in the free span
              // a mover's story intent beats pretty centring: keep the walker
              // where the engine aimed them whenever the chain still fits
              for (let q = 0; q < P.order.length; q++) {
                const nm = P.order[q];
                if ((b.movers || []).indexOf(nm) < 0 || x0[nm] === undefined) continue;
                const want = x0[nm] - xs[q];
                const minW = lo - xs[0], maxW = hi - xs[xs.length - 1];
                if (want >= minW && want <= maxW) { shift = want; break; }
              }
              for (let q = 0; q < xs.length; q++) xs[q] += shift;
            }
            P.order.forEach((nm, q) => { x[nm] = xs[q]; });
          }
          bodies.forEach(clampNm);
        }
        // least movement: pull each resting body back toward its engine position
        // whenever that provably keeps every required gap and the on-screen clamp
        const feas = (nm, nx) => {
          if (nx < loBnd(nm) || nx > hiBnd(nm)) return false;
          for (let i = 0; i < all.length; i++) {
            const o = all[i];
            if (o !== nm && Math.abs(nx - x[o]) < need(tl, nm, o) - 0.5) return false;
          }
          return true;
        };
        for (let r = 0; r < 5; r++) {
          bodies.forEach(nm => {
            if ((b.movers || []).indexOf(nm) >= 0) return;         // movers keep their intent
            const ox = x0[nm];
            if (ox === undefined || Math.abs(ox - x[nm]) < 1) return;
            const d = ox - x[nm];
            const nx = Math.abs(d) > 60 ? x[nm] + (d > 0 ? 60 : -60) : ox;
            if (feas(nm, nx)) x[nm] = nx;
          });
        }
          // A beat nobody moves in must not shuffle the cast: everybody keeps
          // exactly where the previous beat left them (clamped on stage), so a
          // reaching or listening character never drifts between captions.
          if ((b.movers || []).length === 0 && bodies.every(nm => lastX[nm] !== undefined)) {
            bodies.forEach(nm => { x[nm] = Math.max(loBnd(nm), Math.min(hiBnd(nm), lastX[nm])); });
          }
          // FINAL GUARANTEE: bodies never overlap, no matter what the composer
          // or the pull-back did. Gap rules: character pairs keep the full
          // need(); a small prop (nut, apple) may sit within reach - that is
          // staging, not a collision; a LARGE prop (giant apple, house) is a
          // set piece and keeps full body space.
          {
            const isObjNm = nm => !!(tl.looks[nm] && tl.looks[nm].kind === 'object');
            const bigObj = nm => isObjNm(nm) && halfW(tl.looks[nm]) >= 100;
            const heldNow = nm => !!(b._heldMap && b._heldMap[nm]);
            const minGap = (a, b2) => {
              if (heldNow(a) || heldNow(b2)) return 0;   // rides in a paw: drawn at the holder's hand
              if (air(a) || air(b2)) return 0;           // hangs in the canopy: no body space
              if (isObjNm(a) && isObjNm(b2)) return 0;   // two set pieces: leave them
              if (isObjNm(a) || isObjNm(b2)) {
                const base = halfW(tl.looks[a]) + halfW(tl.looks[b2]);
                return (bigObj(a) || bigObj(b2)) ? base : base * 0.55;
              }
              let g = need(tl, a, b2);
              // a GIANT prop in hand reaches past its holder: keep the others back
              Object.keys(b._heldMap || {}).forEach(hp => {
                if (bigObj(hp) && (a === b._heldMap[hp] || b2 === b._heldMap[hp])) g += halfW(tl.looks[hp]) * 0.8;
              });
              return g;
            };
            const charsOnly = bodies.filter(nm => !isObjNm(nm));
            for (let pass = 0; pass < 3; pass++) {
              const seq = all.slice().sort((a, b2) => x[a] - x[b2]);
              for (let i = 1; i < seq.length; i++) {          // push rightwards
                const g = minGap(seq[i - 1], seq[i]);
                if (x[seq[i]] - x[seq[i - 1]] < g) {
                  if (isObjNm(seq[i]) && !isObjNm(seq[i - 1])) x[seq[i - 1]] = x[seq[i]] - g;
                  else if (isObjNm(seq[i - 1]) && !isObjNm(seq[i])) x[seq[i]] = x[seq[i - 1]] + g;
                  else if (!isObjNm(seq[i - 1]) && !isObjNm(seq[i])) x[seq[i]] = x[seq[i - 1]] + g;
                }
              }
              const seq2 = all.slice().sort((a, b2) => x[a] - x[b2]);
              for (let i = seq2.length - 2; i >= 0; i--) {    // and leftwards
                const g = minGap(seq2[i], seq2[i + 1]);
                if (x[seq2[i + 1]] - x[seq2[i]] < g) {
                  if (isObjNm(seq2[i]) && !isObjNm(seq2[i + 1])) x[seq2[i + 1]] = x[seq2[i]] + g;
                  else if (isObjNm(seq2[i + 1]) && !isObjNm(seq2[i])) x[seq2[i]] = x[seq2[i + 1]] - g;
                  else if (!isObjNm(seq2[i]) && !isObjNm(seq2[i + 1])) x[seq2[i]] = x[seq2[i + 1]] - g;
                }
              }
            }
            if (charsOnly.length) {
              const seq3 = charsOnly.slice().sort((a, b2) => x[a] - x[b2]);
              const lastN = seq3[seq3.length - 1];
              const overR = x[lastN] - hiBnd(lastN);
              if (overR > 0) seq3.forEach(nm => { x[nm] -= overR; });
              const underL = loBnd(seq3[0]) - x[seq3[0]];
              if (underL > 0) {
                seq3.forEach(nm => { x[nm] += underL; });
                const overR2 = x[lastN] - hiBnd(lastN);
                if (overR2 > 0) {                          // truly cannot fit: shrink, never overlap
                  const f = Math.max(0.62, (hiBnd(lastN) - loBnd(seq3[0])) / Math.max(1, x[lastN] - x[seq3[0]]));
                  seq3.forEach(nm => { const Lk = tl.looks[nm]; if (Lk) Lk.size = (Lk.size || 1) * f; });
                  let acc = loBnd(seq3[0]); x[seq3[0]] = acc;
                  for (let i = 1; i < seq3.length; i++) { acc += need(tl, seq3[i - 1], seq3[i]); x[seq3[i]] = acc; }
                }
              }
            }
          }
          bodies.forEach(nm => { b.restX[nm] = x[nm]; lastX[nm] = x[nm]; });
      });
    });
    return tl;
  }
  return { apply: apply, need: need };
})();
