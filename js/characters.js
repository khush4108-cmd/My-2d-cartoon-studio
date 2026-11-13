// Character designs: every name always gets the same look, and this file draws the character.
//
// A character is one of three KINDS, decided from the story text, not from the
// name alone:
//   human   - the original template. Unchanged, byte for byte.
//   animal  - rabbit, squirrel, bird, butterfly, duck, fox, bear, ...
//   object  - carrot, cake, ball, kite, star, ...
//
// The kind and the colours come from `hint`, which writer-free.js builds from
// the description in the story ("Coco the little white rabbit" -> a white
// rabbit). With no hint at all, look() returns exactly what it always did, so
// Mia and Leo are untouched.
window.Characters = (function () {
  const INK = '#2b1d3a';
  const SKIN = ['#ffd9b8', '#f5c08f', '#d99a6c', '#a86b45', '#7a4a2e'];
  const HAIR = ['#3b2314', '#1d1d2b', '#c4551d', '#f2c94c', '#8a3fd1', '#e0467c', '#2d9cdb'];
  const TOPS = ['#ff5d73', '#3ec1d3', '#ffb703', '#7bd36a', '#9b5de5', '#ff8fab'];
  const PANTS = ['#355c9a', '#4a4e69', '#2a9d8f', '#6d597a', '#bc6c25'];
  const EYES = ['#3a7bd5', '#2e8b57', '#6b4226', '#7a3fb0'];

  // ---------- colour words understood in a story ----------
  const COLOURS = {
    white: '#ffffff', cream: '#f7ead0', snow: '#ffffff', black: '#2b2b33', dark: '#3a3a44',
    brown: '#8a5a2b', tan: '#c8a16a', ginger: '#d9782b', orange: '#ff8c1a', yellow: '#ffd84a',
    golden: '#e8b33c', gold: '#e8b33c', blue: '#3d7bd6', sky: '#7cc4f2', navy: '#2b3f7a',
    red: '#e0483d', pink: '#ff9ec4', purple: '#9b5de5', violet: '#8a5cf0', green: '#6fbf5e',
    grey: '#9aa0a8', gray: '#9aa0a8', silver: '#c9ced6', spotted: '#e6d7b8', striped: '#e0a33c'
  };

  // ---------- animals ----------
  // ears:  long | round | pointy | floppy | none
  // tail:  puff | bushy | thin | stub | feather | none
  const SPECIES = {
    rabbit:    { ears: 'long',   tail: 'puff',    fur: '#ffffff', nose: '#ff8fa3', size: 0.95, upright: true,  legs: 4 },
    squirrel:  { ears: 'round',  tail: 'bushy',   fur: '#8a5a2b', nose: '#4a2c1a', size: 0.80, upright: true,  legs: 4 },
    cat:       { ears: 'pointy', tail: 'thin',    fur: '#9aa0a8', nose: '#ff8fa3', size: 0.80, upright: false, legs: 4 },
    dog:       { ears: 'floppy', tail: 'thin',    fur: '#c8a16a', nose: '#2b2b33', size: 0.90, upright: false, legs: 4 },
    fox:       { ears: 'pointy', tail: 'bushy',   fur: '#d9622b', nose: '#2b2b33', size: 0.88, upright: false, legs: 4 },
    wolf:      { ears: 'pointy', tail: 'bushy',   fur: '#7d8794', nose: '#2b2b33', size: 1.00, upright: false, legs: 4 },
    bear:      { ears: 'round',  tail: 'stub',    fur: '#7a4a2e', nose: '#2b2b33', size: 1.30, upright: true,  legs: 4 },
    mouse:     { ears: 'round',  tail: 'thin',    fur: '#b9b3c7', nose: '#ff8fa3', size: 0.50, upright: false, legs: 4 },
    pig:       { ears: 'pointy', tail: 'stub',    fur: '#ff9ec4', nose: '#e0608a', size: 1.00, upright: false, legs: 4 },
    frog:      { ears: 'none',   tail: 'none',    fur: '#6fbf5e', nose: '#3f8a35', size: 0.60, upright: true,  legs: 4 },
    deer:      { ears: 'pointy', tail: 'stub',    fur: '#c08a4a', nose: '#2b2b33', size: 1.25, upright: false, legs: 4, antlers: true },
    elephant:  { ears: 'huge',   tail: 'thin',    fur: '#9aa0a8', nose: '#6f757d', size: 1.50, upright: false, legs: 4, trunk: true },
    monkey:    { ears: 'round',  tail: 'thin',    fur: '#8a5a2b', nose: '#c8a16a', size: 0.85, upright: true,  legs: 4 },
    lion:      { ears: 'round',  tail: 'thin',    fur: '#e0a33c', nose: '#2b2b33', size: 1.30, upright: false, legs: 4, mane: true },
    tiger:     { ears: 'round',  tail: 'thin',    fur: '#e0762b', nose: '#2b2b33', size: 1.25, upright: false, legs: 4, stripes: true },
    sheep:     { ears: 'floppy', tail: 'stub',    fur: '#f2ede2', nose: '#4a4453', size: 0.95, upright: false, legs: 4, wool: true },
    duck:      { ears: 'none',   tail: 'feather', fur: '#f2c94c', nose: '#ff9d2e', size: 0.75, upright: true,  legs: 2, beak: true },
    bird:      { ears: 'none',   tail: 'feather', fur: '#3d7bd6', nose: '#ff9d2e', size: 0.34, upright: true,  legs: 2, beak: true, wings: true },
    owl:       { ears: 'none',   tail: 'feather', fur: '#a8763e', nose: '#ff9d2e', size: 0.65, upright: true,  legs: 2, beak: true, wings: true },
    penguin:   { ears: 'none',   tail: 'feather', fur: '#2b2b33', nose: '#ff9d2e', size: 0.70, upright: true,  legs: 2, beak: true, wings: true, belly: '#ffffff' },
    butterfly: { ears: 'none',   tail: 'none',    fur: '#ffd84a', nose: '#2b2b33', size: 0.30, flying: true, butterfly: true },
    bee:       { ears: 'none',   tail: 'none',    fur: '#ffd84a', nose: '#2b2b33', size: 0.22, flying: true, wings: true, stripes: true },
    dragon:    { ears: 'pointy', tail: 'thin',    fur: '#6fbf5e', nose: '#3f8a35', size: 1.35, upright: true,  legs: 4, wings: true, horn: true },
    unicorn:   { ears: 'pointy', tail: 'bushy',   fur: '#ffffff', nose: '#ff9ec4', size: 1.30, upright: false, legs: 4, horn: true, mane: true },
    horse:     { ears: 'pointy', tail: 'bushy',   fur: '#8a5a2b', nose: '#2b2b33', size: 1.35, upright: false, legs: 4, mane: true },
    turtle:    { ears: 'none',   tail: 'stub',    fur: '#6fbf5e', nose: '#3f8a35', size: 0.65, upright: false, legs: 4, shell: true },
    snail:     { ears: 'none',   tail: 'none',    fur: '#c8a16a', nose: '#8a5a2b', size: 0.45, upright: false, legs: 0, shell: true },
    fish:      { ears: 'none',   tail: 'feather', fur: '#ff8c1a', nose: '#2b2b33', size: 0.50, flying: true, fish: true }
  };
  // plurals and pet names fold onto the same design
  const ALIAS = {
    bunny: 'rabbit', hare: 'rabbit', kitties: 'cat', kitten: 'cat', kitty: 'cat', puppies: 'dog',
    puppy: 'dog', duckling: 'duck', birds: 'bird', butterflies: 'butterfly', rabbits: 'rabbit',
    squirrels: 'squirrel', bears: 'bear', foxes: 'fox', cats: 'cat', dogs: 'dog', frogs: 'frog',
    bees: 'bee', owls: 'owl', mice: 'mouse', lions: 'lion', tigers: 'tiger', horses: 'horse',
    dragons: 'dragon', unicorns: 'unicorn', turtles: 'turtle', fishes: 'fish', pigs: 'pig',
    sheep: 'sheep', deer: 'deer', elephants: 'elephant', monkeys: 'monkey', penguins: 'penguin',
    wolves: 'wolf', snails: 'snail'
  };

  // ---------- inanimate objects ----------
  const OBJECTS = {
    carrot:   { shape: 'carrot',   colour: '#ff8c1a', leaf: '#4fa83d', size: 0.85 },
    cake:     { shape: 'round',    colour: '#ff9ec4', leaf: '#ffffff', size: 0.70 },
    ball:     { shape: 'round',    colour: '#e0483d', leaf: '#ffffff', size: 0.55 },
    apple:    { shape: 'round',    colour: '#e0483d', leaf: '#4fa83d', size: 0.45 },
    orange:   { shape: 'round',    colour: '#ff8c1a', leaf: '#4fa83d', size: 0.45 },
    balloon:  { shape: 'balloon',  colour: '#ff5d73', leaf: '#c9ced6', size: 0.85 },
    kite:     { shape: 'kite',     colour: '#3ec1d3', leaf: '#ffd84a', size: 0.90 },
    star:     { shape: 'star',     colour: '#ffd84a', leaf: '#ffe98a', size: 0.60 },
    flower:   { shape: 'flower',   colour: '#ff8fab', leaf: '#4fa83d', size: 0.60 },
    cookie:   { shape: 'round',    colour: '#c8a16a', leaf: '#6b4226', size: 0.40 },
    egg:      { shape: 'egg',      colour: '#f7ead0', leaf: '#ffd84a', size: 0.45 },
    gift:     { shape: 'box',      colour: '#9b5de5', leaf: '#ffd84a', size: 0.70 },
    present:  { shape: 'box',      colour: '#9b5de5', leaf: '#ffd84a', size: 0.70 },
    box:      { shape: 'box',      colour: '#c8a16a', leaf: '#8a5a2b', size: 0.70 },
    book:     { shape: 'box',      colour: '#355c9a', leaf: '#f7ead0', size: 0.55 },
    boat:     { shape: 'boat',     colour: '#e0483d', leaf: '#f7ead0', size: 0.90 },
    rocket:   { shape: 'rocket',   colour: '#c9ced6', leaf: '#ff5d73', size: 1.20 },
    key:      { shape: 'round',    colour: '#e8b33c', leaf: '#c8a16a', size: 0.35 },
    ring:     { shape: 'round',    colour: '#e8b33c', leaf: '#ffffff', size: 0.30 },
    candy:    { shape: 'round',    colour: '#ff8fab', leaf: '#ffffff', size: 0.35 },
    cup:      { shape: 'box',      colour: '#3ec1d3', leaf: '#ffffff', size: 0.50 },
    hat:      { shape: 'box',      colour: '#9b5de5', leaf: '#ffd84a', size: 0.50 },
    sun:      { shape: 'star',     colour: '#ffd84a', leaf: '#ff8c1a', size: 0.90 },
    moon:     { shape: 'round',    colour: '#f7ead0', leaf: '#c9ced6', size: 0.80 },
    // A house the story describes ("a wooden house") is a thing on the stage,
    // not just a backdrop switch: plank walls, a pitched roof, a door and two
    // lit windows.
    house:    { shape: 'house',    colour: '#b07a3f', leaf: '#8a4b2a', size: 1.60 }
  };

  // ---------- believable scale ------------------------------------------
  // Every drawing has its own intrinsic height: a rabbit's ears reach far above
  // its head, a butterfly's wings span wider than its body is tall, a carrot is
  // tall and thin. Multiplying those by one `size` number made a "giant" carrot
  // 665px tall on a 720px screen - 92% of the frame, twice the height of the
  // characters standing next to it.
  //
  // So `size` now means PIXELS ON SCREEN. These heights were measured by drawing
  // every species and object at size 1.0 and reading the bounding box
  // (node /tmp/calibrate.js). A human is 354px tall for reference.
  const H_ANIMAL = { rabbit: 382, squirrel: 337, cat: 248, dog: 218, fox: 248, wolf: 248, bear: 251, mouse: 230, pig: 248, frog: 252, deer: 247, elephant: 219, monkey: 251, lion: 240, tiger: 228, sheep: 218, duck: 228, bird: 231, owl: 229, penguin: 229, butterfly: 204, bee: 204, dragon: 276, unicorn: 252, horse: 247, turtle: 229, snail: 137, fish: 210 };
  const H_OBJECT = { carrot: 337, cake: 193, ball: 193, apple: 193, orange: 193, balloon: 288,
    kite: 266, star: 240, flower: 201, cookie: 193, egg: 149, gift: 195, present: 195, box: 195,
    book: 195, boat: 211, rocket: 296, key: 193, ring: 193, candy: 193, cup: 195, hat: 195,
    sun: 240, moon: 193, house: 347 };
  // how tall a "normal" one of these should stand, in pixels
  const REF = { animal: 400, object: 200 };
  // and the band nothing may leave: big enough to act with, small enough that a
  // prop never dwarfs the cast or fills the frame
  const BAND = { animal: [85, 470], object: [45, 275] };
  const HUMAN_PX = 354;

  // A story adjective moves the size only PART of the way. "A little rabbit"
  // still has to be big enough to emote, and "a giant carrot" still has to be
  // shorter than the rabbit standing beside it.
  function sizeFor(kind, key, base, story) {
    const h = (kind === 'animal' ? H_ANIMAL : H_OBJECT)[key] || 240;
    const st = Math.max(0.5, Math.min(1.65, story || 1));
    const mod = 1 + (st - 1) * 0.55;
    const px = REF[kind] * (base || 1) * mod;
    const band = BAND[kind];
    return Math.max(band[0], Math.min(band[1], px)) / h;
  }

  // ---------- colour helpers ----------
  function rgb(hex) {
    const h = String(hex || '#888888').replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function hex(a) { return '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
  // amount > 0 lightens, < 0 darkens
  function shade(colour, amount) {
    const c = rgb(colour);
    return hex(c.map(v => (amount >= 0 ? v + (255 - v) * amount : v * (1 + amount))));
  }

  function hashOf(name) {
    let h = 2166136261;
    for (const c of String(name).toLowerCase()) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    return h;
  }

  function look(name, hint) {
    const h = hashOf(name);
    const pick = (n, k) => (h >>> k) % n;
    const human = { name, seed: h, skin: SKIN[pick(5, 0)], hair: HAIR[pick(7, 4)], style: pick(4, 8),
      top: TOPS[pick(6, 11)], pants: PANTS[pick(5, 15)], eye: EYES[pick(4, 18)],
      acc: pick(4, 21), emblem: pick(3, 24), shoe: TOPS[(pick(6, 27) + 3) % 6] };

    const hi = hint || {};
    const sp = String(hi.species || '').toLowerCase();
    const key = ALIAS[sp] || sp;
    const tint = COLOURS[String(hi.colour || '').toLowerCase()];

    // An OBJECT named in the story ("a giant magic Carrot") is never a person.
    if (hi.kind === 'object' || OBJECTS[key]) {
      const O = OBJECTS[key] || OBJECTS.ball;
      const base = tint || O.colour;
      return Object.assign({}, human, {
        kind: 'object', species: key, obj: O, px: 0,
        size: sizeFor('object', key, O.size, hi.size),
        sparkle: !!hi.magic, colour: base, accent: O.leaf, fur: base,
        top: base, hair: shade(base, -0.3), skin: shade(base, 0.25), pants: shade(base, -0.2),
        eye: EYES[pick(4, 18)]
      });
    }
    // An ANIMAL is never a person either, however human its name sounds.
    if (hi.kind === 'animal' || SPECIES[key]) {
      const S = SPECIES[key] || SPECIES.rabbit;
      const fur = tint || S.fur;
      return Object.assign({}, human, {
        kind: 'animal', species: key, sp: S,
        size: sizeFor('animal', key, S.size, hi.size),
        fur: fur, nose: S.nose, belly: S.belly || shade(fur, 0.45),
        top: fur, hair: shade(fur, -0.3), skin: fur, pants: shade(fur, -0.2),
        shoe: shade(fur, -0.35), eye: EYES[pick(4, 18)],
        stripes: !!S.stripes, wool: !!S.wool, shell: !!S.shell
      });
    }
    // No species in the story, so this is a person. Return the design exactly
    // as it has always been - no extra fields, no changed colours - so Mia and
    // Leo are byte for byte the characters they were before.
    return human;
  }

  // Acting.pose() never puts the clock on the pose object, and acting.js is not
  // ours to change - reading CLOCK silently gave NaN and drew nothing at all.
  // draw() therefore takes the time as an extra optional argument. Callers that
  // do not pass one still get motion, because P.sq and P.tilt are themselves
  // smooth functions of time.
  let CLOCK = 0;
  function phaseOf(P) { return (P && P.step) ? P.step * 0.35 : ((P ? P.sq || 0 : 0) * 40 + (P ? P.tilt || 0 : 0) * 22); }

  // =========================================================================
  // =========================================================================
  //  THIN BRIDGE - the layered artwork and the animation rig now live in
  //  js/art-paths.js (pure path data: add new designs here as data only) and
  //  js/art-rig.js (controllers, selectors, pose->joint math). This file keeps
  //  the public API, the palette/look() tables, H_* scale tables and the
  //  object renderer untouched.
  // =========================================================================
  const AR = window.ArtRig;
  const joints = (L, P, t) => AR.joints(L, P, t);
  const rig = (c, n, pal, J) => AR.rig(c, n, pal, J);
  const rigFor = L => AR.rigFor(L);

  function drawHuman(c, L, P, x, y, s, flip) {
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(0,0,0,' + (0.2 - Math.min(0.12, -P.dy / 900)) + ')';
    c.beginPath(); c.ellipse(0, 4, 70 * s * (1 + P.dy / 500), 14 * s, 0, 0, 7); c.fill();
    c.scale(flip ? -s : s, s);
    const D = rigFor(L), J = joints(L, P, CLOCK);
    rig(c, D.root, D.pal, J);
    c.restore();
  }

  function drawAnimal(c, L, P, x, y, s, flip) {
    const S = L.sp, sc = s * L.size;
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(0,0,0,' + (0.2 - Math.min(0.12, -P.dy / 900)) + ')';
    c.beginPath(); c.ellipse(0, 4, 70 * sc * (1 + P.dy / 500), 14 * sc, 0, 0, 7); c.fill();
    const lift = S.flying ? 250 : 0;
    c.scale(flip ? -sc : sc, sc); c.translate(0, P.dy - lift);
    c.lineJoin = 'round'; c.strokeStyle = INK;
    const D = rigFor(L), J = joints(L, P, CLOCK);
    J.dy = 0;                                       // dy already applied above
    rig(c, D.root, D.pal, J);
    c.restore();
  }
  const fillStroke = (c, f) => { c.fillStyle = f; c.fill(); c.lineWidth = 6; c.stroke(); };

  function drawObject(c, L, P, x, y, s, flip) {
    const O = L.obj, sc = s * L.size;
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(0,0,0,' + (0.2 - Math.min(0.12, -P.dy / 900)) + ')';
    c.beginPath(); c.ellipse(0, 4, 70 * sc * (1 + P.dy / 500), 14 * sc, 0, 0, 7); c.fill();
    c.scale(flip ? -sc : sc, sc);
    // objects bob and squash with the beat so they feel part of the scene
    const bob = Math.sin(CLOCK * 2.0 + (L.seed % 100) / 10) * 5;
    c.scale(1 + P.sq, 1 - P.sq); c.translate(P.dx, P.dy - 8 + bob);
    c.lineJoin = 'round'; c.strokeStyle = INK;
    const col = L.colour, acc = L.accent || '#4fa83d';

    if (O.shape === 'carrot') {
      // a giant carrot: orange tapered root with green leaves on top
      for (const k of [-1, 0, 1]) {
        c.save(); c.rotate(k * 0.42 + Math.sin(CLOCK * 1.6 + k) * 0.05);
        c.beginPath(); c.moveTo(0, -150);
        c.bezierCurveTo(-26, -232, -14, -296, 0, -320);
        c.bezierCurveTo(14, -296, 26, -232, 0, -150);
        c.closePath(); fillStroke(c, k === 0 ? '#5cbf46' : shade(acc, -0.12));
        c.restore();
      }
      c.beginPath(); c.moveTo(-58, -150);
      c.bezierCurveTo(-62, -70, -30, -12, 0, 0);
      c.bezierCurveTo(30, -12, 62, -70, 58, -150);
      c.closePath(); fillStroke(c, col);
      c.save(); c.clip();
      c.lineWidth = 5; c.strokeStyle = 'rgba(43,29,58,.30)';
      for (const k of [-2, -1, 0, 1, 2]) { c.beginPath(); c.moveTo(-46, -150 + k * 30); c.quadraticCurveTo(0, -138 + k * 30, 46, -150 + k * 30); c.stroke(); }
      c.restore(); c.strokeStyle = INK;
      c.fillStyle = 'rgba(255,255,255,.28)';
      c.beginPath(); c.ellipse(-26, -108, 12, 40, 0.12, 0, 7); c.fill();
      if (L.sparkle !== false) {                                 // "magic"
        c.fillStyle = '#fff3a8';
        for (const [sx, sy, sr] of [[-78, -196, 9], [74, -232, 7], [10, -300, 8], [88, -120, 6]]) {
          c.beginPath();
          for (let i = 0; i < 8; i++) { const rr = i % 2 ? sr * 0.38 : sr, a = i * Math.PI / 4 + CLOCK; c.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
          c.closePath(); c.fill();
        }
      }
      c.restore(); return;
    }
    if (O.shape === 'star') {
      c.beginPath();
      for (let i = 0; i < 10; i++) { const rr = i % 2 ? 42 : 104, a = i * Math.PI / 5 - Math.PI / 2; c.lineTo(Math.cos(a) * rr, -120 + Math.sin(a) * rr); }
      c.closePath(); fillStroke(c, col);
      c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.arc(-24, -146, 20, 0, 7); c.fill();
      c.restore(); return;
    }
    if (O.shape === 'box') {
      c.beginPath(); c.rect(-72, -136, 144, 128); fillStroke(c, col);
      c.fillStyle = acc; c.fillRect(-12, -136, 24, 128); c.fillRect(-72, -84, 144, 22);
      c.lineWidth = 6; c.strokeRect(-72, -136, 144, 128);
      c.beginPath(); c.ellipse(0, -146, 34, 20, 0, 0, 7); fillStroke(c, acc);
      c.restore(); return;
    }
    if (O.shape === 'kite') {
      c.beginPath(); c.moveTo(0, -250); c.lineTo(72, -150); c.lineTo(0, -50); c.lineTo(-72, -150); c.closePath(); fillStroke(c, col);
      c.lineWidth = 5; c.beginPath(); c.moveTo(0, -250); c.lineTo(0, -50); c.moveTo(-72, -150); c.lineTo(72, -150); c.stroke();
      c.beginPath(); c.moveTo(0, -50);
      for (let i = 0; i < 4; i++) c.quadraticCurveTo(Math.sin(CLOCK * 3 + i) * 26, -40 + i * 20, 0, -30 + i * 20);
      c.lineWidth = 5; c.strokeStyle = acc; c.stroke(); c.strokeStyle = INK;
      c.restore(); return;
    }
    if (O.shape === 'balloon') {
      c.beginPath(); c.ellipse(0, -190, 66, 82, 0, 0, 7); fillStroke(c, col);
      c.beginPath(); c.moveTo(-8, -112); c.lineTo(8, -112); c.lineTo(0, -98); c.closePath(); fillStroke(c, shade(col, -0.2));
      c.lineWidth = 4; c.beginPath(); c.moveTo(0, -100);
      c.quadraticCurveTo(Math.sin(CLOCK * 2) * 22, -50, 0, 0); c.strokeStyle = acc; c.stroke(); c.strokeStyle = INK;
      c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(-22, -214, 16, 26, -0.3, 0, 7); c.fill();
      c.restore(); return;
    }
    if (O.shape === 'flower') {
      c.lineWidth = 10; c.strokeStyle = acc; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -96); c.stroke(); c.strokeStyle = INK;
      c.beginPath(); c.ellipse(-26, -56, 26, 13, -0.5, 0, 7); fillStroke(c, acc);
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c.beginPath(); c.ellipse(Math.cos(a) * 34, -132 + Math.sin(a) * 34, 24, 24, 0, 0, 7); fillStroke(c, col); }
      c.beginPath(); c.arc(0, -132, 22, 0, 7); fillStroke(c, '#ffd84a');
      c.restore(); return;
    }
    if (O.shape === 'boat') {
      c.beginPath(); c.moveTo(-96, -70); c.lineTo(96, -70); c.lineTo(58, -8); c.lineTo(-58, -8); c.closePath(); fillStroke(c, col);
      c.lineWidth = 8; c.beginPath(); c.moveTo(0, -70); c.lineTo(0, -196); c.stroke();
      c.beginPath(); c.moveTo(0, -190); c.lineTo(78, -96); c.lineTo(0, -86); c.closePath(); fillStroke(c, acc);
      c.restore(); return;
    }
    if (O.shape === 'rocket') {
      c.beginPath(); c.moveTo(0, -280); c.bezierCurveTo(52, -210, 56, -110, 44, -46); c.lineTo(-44, -46); c.bezierCurveTo(-56, -110, -52, -210, 0, -280); c.closePath(); fillStroke(c, col);
      for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 42, -120); c.lineTo(sd * 96, -34); c.lineTo(sd * 40, -44); c.closePath(); fillStroke(c, acc); }
      c.beginPath(); c.arc(0, -176, 26, 0, 7); fillStroke(c, '#7cc4f2');
      c.beginPath(); c.moveTo(-26, -46); c.quadraticCurveTo(0, 26 + Math.sin(CLOCK * 9) * 12, 26, -46); c.closePath(); fillStroke(c, '#ff8c1a');
      c.restore(); return;
    }
    if (O.shape === 'house') {
      // walls: horizontal planks, the way a wooden cottage reads at a glance
      c.beginPath(); c.rect(-110, -170, 220, 170); fillStroke(c, col);
      c.save(); c.clip();
      c.lineWidth = 4; c.strokeStyle = 'rgba(60,32,10,.35)';
      for (let k = 1; k < 6; k++) { c.beginPath(); c.moveTo(-110, -170 + k * 28); c.lineTo(110, -170 + k * 28); c.stroke(); }
      c.restore(); c.strokeStyle = INK;
      // pitched roof with an overhang, plus a chimney
      c.beginPath(); c.rect(52, -268, 26, 52); fillStroke(c, shade(acc, -0.25));
      c.beginPath(); c.moveTo(-140, -162); c.lineTo(0, -292); c.lineTo(140, -162); c.closePath(); fillStroke(c, acc);
      c.lineWidth = 5; c.strokeStyle = 'rgba(43,29,58,.35)';
      c.beginPath(); c.moveTo(-96, -176); c.lineTo(0, -266); c.lineTo(96, -176); c.stroke(); c.strokeStyle = INK;
      // door with a round top and a knob
      c.beginPath(); c.moveTo(-32, 0); c.lineTo(-32, -74);
      c.quadraticCurveTo(-32, -104, 0, -104); c.quadraticCurveTo(32, -104, 32, -74); c.lineTo(32, 0);
      c.closePath(); fillStroke(c, shade(col, -0.38));
      c.fillStyle = '#ffd84a'; c.beginPath(); c.arc(18, -52, 6, 0, 7); c.fill(); c.strokeStyle = INK;
      // two windows with cross frames
      for (const wx of [-92, 44]) {
        c.beginPath(); c.rect(wx, -146, 48, 44); fillStroke(c, '#bfe6ff');
        c.lineWidth = 4; c.strokeStyle = '#ffffff';
        c.beginPath(); c.moveTo(wx + 24, -146); c.lineTo(wx + 24, -102); c.moveTo(wx, -124); c.lineTo(wx + 48, -124); c.stroke();
        c.strokeStyle = INK;
      }
      c.restore(); return;
    }
    if (O.shape === 'egg') {
      c.beginPath(); c.ellipse(0, -66, 52, 68, 0, 0, 7); fillStroke(c, col);
      c.fillStyle = acc; for (const [dx, dy] of [[-18, -86], [14, -60], [-6, -34]]) { c.beginPath(); c.arc(dx, dy, 9, 0, 7); c.fill(); }
      c.restore(); return;
    }
    // round by default: ball, apple, cake, cookie, key, ring, candy, moon
    const rr2 = O.shape === 'round' ? 78 : 70;
    c.beginPath(); c.arc(0, -rr2, rr2, 0, 7); fillStroke(c, col);
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-rr2 * 0.32, -rr2 * 1.3, rr2 * 0.22, rr2 * 0.34, -0.4, 0, 7); c.fill();
    if (acc) { c.beginPath(); c.moveTo(-6, -rr2 * 2 + 6); c.quadraticCurveTo(16, -rr2 * 2 - 22, 34, -rr2 * 2 - 6); c.lineWidth = 7; c.strokeStyle = acc; c.stroke(); c.strokeStyle = INK; }
    c.restore();
  }


  function draw(c, L, P, x, y, s, flip, t) {
    CLOCK = (typeof t === 'number' && isFinite(t)) ? t : phaseOf(P);
    if (L && L.kind === 'object') { drawObject(c, L, P, x, y, s, flip); return; }
    if (L && L.kind === 'animal') { drawAnimal(c, L, P, x, y, s, flip); return; }
    drawHuman(c, L, P, x, y, s, flip);
  }

  return { look, draw, drawHuman, drawAnimal, drawObject, SPECIES, ALIAS, OBJECTS, COLOURS, shade,
    H_ANIMAL, H_OBJECT, REF, BAND, HUMAN_PX, sizeFor };
})();

