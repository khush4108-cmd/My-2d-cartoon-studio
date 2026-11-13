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
    moon:     { shape: 'round',    colour: '#f7ead0', leaf: '#c9ced6', size: 0.80 }
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
  const H_ANIMAL = { rabbit: 379, squirrel: 270, cat: 211, dog: 204, fox: 211, wolf: 211, bear: 270,
    mouse: 204, pig: 211, frog: 270, deer: 223, elephant: 204, monkey: 270, lion: 215, tiger: 204,
    sheep: 204, duck: 270, bird: 270, owl: 270, penguin: 270, butterfly: 228, bee: 207, dragon: 309,
    unicorn: 237, horse: 215, turtle: 204, snail: 204, fish: 217 };
  const H_OBJECT = { carrot: 337, cake: 193, ball: 193, apple: 193, orange: 193, balloon: 288,
    kite: 266, star: 240, flower: 201, cookie: 193, egg: 149, gift: 195, present: 195, box: 195,
    book: 195, boat: 211, rocket: 296, key: 193, ring: 193, candy: 193, cup: 195, hat: 195,
    sun: 240, moon: 193 };
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

  // hint = { kind, species, colour } straight from the story text. Without it,
  // the result is exactly the original human design.
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

  function limb(c, x1, y1, x2, y2, w, col) {
    c.lineCap = 'round';
    c.strokeStyle = INK; c.lineWidth = w + 8; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.strokeStyle = INK;
  }
  const fillStroke = (c, f) => { c.fillStyle = f; c.fill(); c.lineWidth = 6; c.stroke(); };

  function hairBack(c, L) {
    if (L.style === 1) { c.beginPath(); c.ellipse(0, -195, 114, 108, 0, 0, 7); fillStroke(c, L.hair); }
    if (L.style === 2) for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(s * 100, -240); c.bezierCurveTo(s * 170, -230, s * 160, -120, s * 125, -110);
      c.bezierCurveTo(s * 110, -150, s * 100, -190, s * 100, -240); fillStroke(c, L.hair);
    }
  }
  function hairFront(c, L) {
    c.beginPath(); c.moveTo(-100, -208);
    c.bezierCurveTo(-112, -300, -60, -318, 0, -316); c.bezierCurveTo(60, -318, 112, -300, 100, -208);
    c.bezierCurveTo(88, -240, 70, -262, 40, -250); c.bezierCurveTo(20, -240, 0, -262, -20, -248);
    c.bezierCurveTo(-45, -236, -75, -250, -100, -208); fillStroke(c, L.hair);
    if (L.style === 0) for (let i = -3; i <= 3; i++) {
      c.beginPath(); c.moveTo(i * 28 - 20, -300); c.lineTo(i * 28, -356 + Math.abs(i) * 9); c.lineTo(i * 28 + 20, -300); fillStroke(c, L.hair);
    }
    if (L.style === 3) for (const [x, y, r] of [[-52, -318, 38], [0, -338, 46], [52, -318, 38]]) {
      c.beginPath(); c.arc(x, y, r, 0, 7); fillStroke(c, L.hair);
    }
  }
  function eyes(c, L, P) {
    for (const s of [-1, 1]) {
      const ex = s * 35, ey = -208;
      if (P.eyes === 'happy' || P.blink > 0.85) {
        c.lineWidth = 7; c.beginPath();
        if (P.eyes === 'happy') c.arc(ex, ey + 8, 17, Math.PI * 1.1, Math.PI * 1.9);
        else { c.moveTo(ex - 17, ey + 4); c.quadraticCurveTo(ex, ey + 14, ex + 17, ey + 4); }
        c.stroke();
      } else {
        const rx = 21 * P.eyeScale, ry = 27 * P.eyeScale * (1 - P.blink * 0.9);
        c.beginPath(); c.ellipse(ex, ey, rx, ry, 0, 0, 7); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 5; c.stroke();
        const px = ex + P.lookX * 7, py = ey + P.lookY * 6 + 2;
        c.beginPath(); c.ellipse(px, py, 12, Math.min(15, ry - 3), 0, 0, 7); c.fillStyle = L.eye; c.fill();
        c.beginPath(); c.arc(px, py, 6, 0, 7); c.fillStyle = INK; c.fill();
        c.beginPath(); c.arc(px - 4, py - 6, 4, 0, 7); c.fillStyle = '#fff'; c.fill();
      }
    }
    const B = { flat: [-250, -250], up: [-264, -268], angry: [-236, -258], sad: [-262, -240] };
    c.lineWidth = 8; c.lineCap = 'round';
    for (const s of [-1, 1]) {
      const k = P.brow === 'confused' ? (s < 0 ? 'up' : 'angry') : P.brow, b = B[k];
      c.beginPath(); c.moveTo(s * 14, b[0]); c.quadraticCurveTo(s * 34, Math.min(b[0], b[1]) - 6, s * 54, b[1]); c.stroke();
    }
  }
  function mouth(c, P) {
    const m = P.mouth, o = P.open; c.lineWidth = 6; c.lineCap = 'round';
    if (m === 'laugh' || m === 'open') {
      const h = m === 'laugh' ? 30 + o * 18 : 6 + o * 26, w = m === 'laugh' ? 36 : 25;
      c.beginPath(); c.moveTo(-w, -166); c.quadraticCurveTo(0, -172, w, -166);
      c.bezierCurveTo(w - 4, -166 + h * 1.35, -w + 4, -166 + h * 1.35, -w, -166);
      fillStroke(c, '#7a1f2e');
      c.save(); c.clip(); c.fillStyle = '#fff'; c.fillRect(-w, -168, w * 2, m === 'laugh' ? 11 : 7);
      c.fillStyle = '#ff7a8a'; c.beginPath(); c.ellipse(0, -166 + h * 1.15, w * .6, h * .4 + 3, 0, 0, 7); c.fill(); c.restore();
      c.beginPath(); c.moveTo(-w, -166); c.quadraticCurveTo(0, -172, w, -166);
      c.bezierCurveTo(w - 4, -166 + h * 1.35, -w + 4, -166 + h * 1.35, -w, -166); c.stroke();
    } else if (m === 'o') {
      c.beginPath(); c.ellipse(0, -156, 11 + o * 4, 14 + o * 6, 0, 0, 7); fillStroke(c, '#7a1f2e');
    } else {
      c.beginPath();
      if (m === 'smile') { c.moveTo(-28, -168); c.quadraticCurveTo(0, -140, 28, -168); }
      else if (m === 'frown') { c.moveTo(-22, -150); c.quadraticCurveTo(0, -170, 22, -150); }
      else { c.moveTo(-16, -158); c.lineTo(16, -158); }
      c.stroke();
    }
  }
  function accessory(c, L) {
    c.lineWidth = 6;
    if (L.acc === 1) {
      c.lineWidth = 5; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 35, -208, 30, 31, 0, 0, 7); c.stroke(); }
      c.beginPath(); c.moveTo(-5, -210); c.lineTo(5, -210); c.stroke();
    } else if (L.acc === 2) {
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(-72, -300); c.lineTo(-72 + s * 40, -326); c.lineTo(-72 + s * 40, -274); c.closePath(); fillStroke(c, '#ff6fa5'); }
      c.beginPath(); c.arc(-72, -300, 11, 0, 7); fillStroke(c, '#ff3d86');
    } else if (L.acc === 3) {
      c.beginPath(); c.moveTo(-104, -252); c.bezierCurveTo(-110, -345, 110, -345, 104, -252); c.quadraticCurveTo(0, -240, -104, -252); fillStroke(c, L.top);
      c.beginPath(); c.moveTo(30, -262); c.quadraticCurveTo(150, -270, 150, -244); c.quadraticCurveTo(80, -238, 30, -250); fillStroke(c, L.top);
    }
  }
  function torso(c, L) {
    c.fillStyle = L.skin; c.fillRect(-16, -152, 32, 28);
    c.beginPath(); c.moveTo(-46, -140); c.quadraticCurveTo(0, -126, 46, -140);
    c.bezierCurveTo(62, -110, 58, -80, 50, -56); c.quadraticCurveTo(0, -44, -50, -56);
    c.bezierCurveTo(-58, -80, -62, -110, -46, -140); c.closePath();
    c.fillStyle = L.top; c.fill();
    c.save(); c.clip();
    c.fillStyle = 'rgba(255,255,255,.85)';
    if (L.emblem === 2) { c.fillRect(-70, -115, 140, 14); c.fillRect(-70, -88, 140, 14); }
    c.restore();
    c.lineWidth = 6; c.stroke();
    c.fillStyle = '#fff';
    if (L.emblem === 0) { c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 8 : 18, a = i * Math.PI / 5 - Math.PI / 2; c.lineTo(Math.cos(a) * r, -100 + Math.sin(a) * r); } c.closePath(); c.fill(); }
    if (L.emblem === 1) { c.beginPath(); c.moveTo(0, -84); c.bezierCurveTo(-30, -108, -14, -124, 0, -108); c.bezierCurveTo(14, -124, 30, -108, 0, -84); c.fill(); }
  }

  // ---------- the human template: unchanged ----------
  function drawHuman(c, L, P, x, y, s, flip) {
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(0,0,0,' + (0.2 - Math.min(0.12, -P.dy / 900)) + ')';
    c.beginPath(); c.ellipse(0, 4, 70 * s * (1 + P.dy / 500), 14 * s, 0, 0, 7); c.fill();
    c.scale(flip ? -s : s, s); c.scale(1 + P.sq, 1 - P.sq); c.translate(P.dx, P.dy);
    c.lineJoin = 'round'; c.strokeStyle = INK;
    for (const sd of [-1, 1]) {                                  // legs and shoes
      const ph = P.step + (sd < 0 ? 0 : Math.PI);
      const fx = sd * 24 + Math.sin(ph) * P.stepAmp * 30, fy = -Math.max(0, Math.cos(ph)) * P.stepAmp * 16 - P.tuck * 34;
      limb(c, sd * 22, -62, fx, fy - 14, 26, L.pants);
      c.beginPath(); c.ellipse(fx + 8, fy - 8, 32, 16, 0, 0, 7); fillStroke(c, L.shoe);
    }
    torso(c, L);
    c.save(); c.translate(0, -135); c.rotate(P.tilt); c.translate(0, 135);
    hairBack(c, L);
    for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * 94, -205, 14, 20, 0, 0, 7); fillStroke(c, L.skin); }
    c.beginPath(); c.moveTo(0, -300); c.bezierCurveTo(72, -300, 102, -255, 97, -205);
    c.bezierCurveTo(92, -160, 52, -126, 0, -126); c.bezierCurveTo(-52, -126, -92, -160, -97, -205);
    c.bezierCurveTo(-102, -255, -72, -300, 0, -300); fillStroke(c, L.skin);
    c.fillStyle = 'rgba(255,90,110,.35)';
    for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * 60, -168, 18, 11, 0, 0, 7); c.fill(); }
    c.strokeStyle = INK; eyes(c, L, P); mouth(c, P); hairFront(c, L); accessory(c, L);
    c.restore();
    for (const sd of [-1, 1]) {                                  // arms and hands
      const a = sd < 0 ? P.armL : P.armR, sx = sd * 50, sy = -132;
      const hx = sx + sd * Math.sin(a) * 78, hy = sy + Math.cos(a) * 78;
      limb(c, sx, sy, hx, hy, 22, L.top);
      c.beginPath(); c.arc(hx, hy, 15, 0, 7); fillStroke(c, L.skin);
    }
    c.restore();
  }

  // ---------- animals ----------
  // Drawn in side profile facing +x, so `flip` turns them to face each other.
  // Every pose value the human template honours is honoured here too, so the
  // existing acting, emotions, walking, running, jumping and lip-sync all keep
  // working without a change to acting.js.
  function animalEyes(c, L, P, hx, hy, r) {
    for (const s of [0.42]) {                                   // profile: one eye visible
      const ex = hx + r * s, ey = hy - r * 0.12;
      if (P.eyes === 'happy' || P.blink > 0.85) {
        c.lineWidth = 6; c.beginPath();
        if (P.eyes === 'happy') c.arc(ex, ey + 5, r * 0.34, Math.PI * 1.1, Math.PI * 1.9);
        else { c.moveTo(ex - r * 0.34, ey + 2); c.quadraticCurveTo(ex, ey + r * 0.26, ex + r * 0.34, ey + 2); }
        c.stroke();
      } else {
        const rx = r * 0.30 * P.eyeScale, ry = r * 0.36 * P.eyeScale * (1 - P.blink * 0.9);
        c.beginPath(); c.ellipse(ex, ey, rx, ry, 0, 0, 7); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 4; c.stroke();
        const px = ex + P.lookX * r * 0.10, py = ey + P.lookY * r * 0.09;
        c.beginPath(); c.ellipse(px, py, rx * 0.58, Math.min(ry * 0.62, ry - 2), 0, 0, 7); c.fillStyle = L.eye; c.fill();
        c.beginPath(); c.arc(px, py, rx * 0.28, 0, 7); c.fillStyle = INK; c.fill();
        c.beginPath(); c.arc(px - 2, py - 3, 2.6, 0, 7); c.fillStyle = '#fff'; c.fill();
      }
      if (!L.sp.beak) {                                          // brow, on furred animals only
        const up = P.brow === 'up' ? -r * 0.16 : P.brow === 'angry' ? r * 0.06 : P.brow === 'sad' ? r * 0.12 : 0;
        c.lineWidth = 5; c.lineCap = 'round'; c.beginPath();
        c.moveTo(ex - r * 0.30, ey - r * 0.42 + up);
        c.quadraticCurveTo(ex, ey - r * 0.52 + up, ex + r * 0.30, ey - r * 0.40 + up);
        c.stroke();
      }
    }
  }
  function animalMouth(c, L, P, hx, hy, r) {
    const mx = hx + r * 0.72, my = hy + r * 0.34;
    c.lineWidth = 5; c.lineCap = 'round';
    if (L.sp.beak) {                                             // beak instead of a muzzle
      c.beginPath(); c.moveTo(hx + r * 0.55, hy + r * 0.05);
      c.lineTo(hx + r * 1.25, hy + r * 0.22 + P.open * r * 0.12);
      c.lineTo(hx + r * 0.55, hy + r * 0.42 + P.open * r * 0.22);
      c.closePath(); fillStroke(c, L.nose);
      return;
    }
    const open = (P.mouth === 'laugh' || P.mouth === 'open' || P.mouth === 'o') ? (0.25 + 0.75 * P.open) : 0;
    if (open > 0) {
      c.beginPath(); c.ellipse(mx, my, r * 0.26, r * (0.12 + open * 0.26), 0, 0, 7); fillStroke(c, '#7a1f2e');
    } else if (P.mouth === 'frown') {
      c.beginPath(); c.moveTo(mx - r * 0.20, my + r * 0.10); c.quadraticCurveTo(mx, my - r * 0.08, mx + r * 0.20, my + r * 0.10); c.stroke();
    } else {
      c.beginPath(); c.moveTo(mx - r * 0.20, my - r * 0.04); c.quadraticCurveTo(mx, my + r * 0.14, mx + r * 0.20, my - r * 0.04); c.stroke();
    }
    c.beginPath(); c.ellipse(mx + r * 0.16, my - r * 0.20, r * 0.11, r * 0.08, 0, 0, 7); fillStroke(c, L.nose);
    if (L.sp.whiskers !== false) {                             // whiskers
      c.lineWidth = 3;
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(mx + r * 0.2, my - r * 0.1); c.lineTo(mx + r * 0.72, my - r * 0.1 + s * r * 0.14); c.stroke(); }
    }
  }
  function animalEars(c, L, P, hx, hy, r) {
    const kind = L.sp.ears, fur = L.fur, inner = shade(L.nose, 0.35);
    const perk = P.brow === 'up' || P.emotion === 'surprised' ? -r * 0.10 : 0;
    if (kind === 'none') return;
    if (kind === 'long') {                                       // rabbit
      for (const s of [-1, 1]) {
        const bx = hx - r * 0.10 + s * r * 0.30, tilt = s * 0.16 + P.tilt;
        c.save(); c.translate(bx, hy - r * 0.72); c.rotate(tilt);
        c.beginPath(); c.ellipse(0, -r * 0.95 + perk, r * 0.24, r * 1.05, 0, 0, 7); fillStroke(c, fur);
        c.beginPath(); c.ellipse(0, -r * 0.92 + perk, r * 0.12, r * 0.78, 0, 0, 7); fillStroke(c, inner);
        c.restore();
      }
      return;
    }
    if (kind === 'huge') {                                       // elephant
      for (const s of [-1, 1]) { c.beginPath(); c.ellipse(hx - s * r * 0.55, hy + r * 0.05, r * 0.62, r * 0.78, s * 0.2, 0, 7); fillStroke(c, shade(fur, s < 0 ? -0.12 : 0.06)); }
      return;
    }
    for (const s of [-1, 1]) {
      const bx = hx - r * 0.05 + s * r * 0.42, by = hy - r * 0.66 + perk;
      c.beginPath();
      if (kind === 'pointy') { c.moveTo(bx - r * 0.24, by + r * 0.22); c.lineTo(bx + s * r * 0.06, by - r * 0.46); c.lineTo(bx + r * 0.26, by + r * 0.20); }
      else if (kind === 'floppy') { c.ellipse(bx + s * r * 0.10, by + r * 0.34, r * 0.20, r * 0.46, s * 0.24, 0, 7); }
      else { c.arc(bx, by, r * 0.24, 0, 7); }
      c.closePath(); fillStroke(c, fur);
    }
  }
  function animalTail(c, L, P, bx, by, r) {
    const kind = L.sp.tail, fur = L.fur;
    if (kind === 'none') return;
    const wag = Math.sin(P.step * 0.9) * 0.18 * (P.stepAmp ? 1 : 0.35);
    c.save(); c.translate(bx - r * 0.85, by); c.rotate(wag);
    c.beginPath();
    if (kind === 'puff') { c.arc(0, -r * 0.05, r * 0.30, 0, 7); fillStroke(c, shade(fur, 0.2)); }
    else if (kind === 'bushy') {
      c.moveTo(0, r * 0.10);
      c.bezierCurveTo(-r * 0.85, -r * 0.10, -r * 0.95, -r * 1.30, -r * 0.20, -r * 1.25);
      c.bezierCurveTo(-r * 0.35, -r * 0.70, -r * 0.18, -r * 0.35, 0, r * 0.10);
      c.closePath(); fillStroke(c, fur);
      c.beginPath(); c.ellipse(-r * 0.30, -r * 1.05, r * 0.16, r * 0.20, -0.4, 0, 7); fillStroke(c, shade(fur, 0.35));
    } else if (kind === 'feather') {
      c.moveTo(0, 0); c.lineTo(-r * 0.55, -r * 0.35); c.lineTo(-r * 0.48, r * 0.05); c.lineTo(-r * 0.60, r * 0.28); c.lineTo(0, r * 0.22);
      c.closePath(); fillStroke(c, shade(fur, -0.12));
    } else if (kind === 'stub') { c.arc(0, 0, r * 0.16, 0, 7); fillStroke(c, shade(fur, -0.1)); }
    else {                                                       // thin
      c.moveTo(0, 0);
      c.bezierCurveTo(-r * 0.55, -r * 0.10, -r * 0.70, -r * 0.70, -r * 0.40, -r * 0.95);
      c.lineWidth = r * 0.14; c.strokeStyle = INK; c.stroke();
      c.lineWidth = r * 0.08; c.strokeStyle = fur; c.stroke(); c.strokeStyle = INK;
    }
    c.restore();
  }
  function wings(c, L, P, bx, by, r) {
    const flap = Math.sin(CLOCK * 7 + (P.step || 0) * 2.2) * 0.55 + (P.dy < -4 ? 0.35 : 0);
    if (L.sp.butterfly) {
      for (const s of [-1, 1]) {
        c.save(); c.translate(bx, by - r * 0.35); c.rotate(s * (0.25 + flap * 0.5));
        c.beginPath(); c.ellipse(s * r * 0.62, -r * 0.42, r * 0.62, r * 0.46, s * 0.5, 0, 7); fillStroke(c, L.fur);
        c.beginPath(); c.ellipse(s * r * 0.52, r * 0.18, r * 0.44, r * 0.32, s * 0.4, 0, 7); fillStroke(c, shade(L.fur, -0.18));
        c.beginPath(); c.arc(s * r * 0.66, -r * 0.44, r * 0.13, 0, 7); fillStroke(c, shade(L.fur, 0.5));
        c.restore();
      }
      return;
    }
    for (const s of [-1, 1]) {
      c.save(); c.translate(bx - s * r * 0.05, by - r * 0.15); c.rotate(s * (0.15 + flap * 0.45));
      c.beginPath(); c.moveTo(0, 0);
      c.bezierCurveTo(-s * r * 0.30, -r * 0.55, -s * r * 0.95, -r * 0.42, -s * r * 0.80, r * 0.18);
      c.bezierCurveTo(-s * r * 0.45, r * 0.05, -s * r * 0.20, r * 0.10, 0, 0);
      c.closePath(); fillStroke(c, s < 0 ? shade(L.fur, -0.18) : L.fur);
      c.restore();
    }
  }

  function drawAnimal(c, L, P, x, y, s, flip) {
    const S = L.sp, r = 100;                                     // head radius reference
    const sc = s * L.size;
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(0,0,0,' + (0.2 - Math.min(0.12, -P.dy / 900)) + ')';
    c.beginPath(); c.ellipse(0, 4, 70 * sc * (1 + P.dy / 500), 14 * sc, 0, 0, 7); c.fill();
    const lift = S.flying ? 250 : 0;
    c.scale(flip ? -sc : sc, sc); c.scale(1 + P.sq, 1 - P.sq); c.translate(P.dx, P.dy - lift);
    c.lineJoin = 'round'; c.strokeStyle = INK;
    const fur = L.fur, dark = shade(fur, -0.22);
    const bx = 0, by = -95;                                      // body centre
    const hx = S.upright ? 34 : 78, hy = S.upright ? -205 : -150; // head centre
    const hr = S.upright ? 62 : 52;

    if (S.flying && S.fish) {                                    // a fish swims rather than flies
      c.save(); c.translate(0, -120);
      c.beginPath(); c.ellipse(0, 0, 92, 48, 0, 0, 7); fillStroke(c, fur);
      c.beginPath(); c.moveTo(-88, 0); c.lineTo(-140, -40); c.lineTo(-132, 0); c.lineTo(-140, 40); c.closePath(); fillStroke(c, dark);
      c.beginPath(); c.moveTo(0, -44); c.quadraticCurveTo(24, -84, 52, -46); c.closePath(); fillStroke(c, dark);
      animalEyes(c, L, P, 40, -8, 40);
      c.restore(); c.restore(); return;
    }

    animalTail(c, L, P, bx, by, hr);

    if (S.flying) wings(c, L, P, bx, by, hr);

    // legs, driven by the same walk/run cycle the human uses
    const legs = S.legs === 0 ? 0 : (S.legs || 4);
    for (let i = 0; i < legs; i++) {
      const back = i < legs / 2;
      const ph = P.step + (back ? Math.PI : 0) + (i % 2 ? Math.PI : 0);
      const lx = (back ? -46 : 40) + (S.upright ? -6 : 0);
      const fx = lx + Math.sin(ph) * P.stepAmp * 26;
      const fy = -Math.max(0, Math.cos(ph)) * P.stepAmp * 14 - P.tuck * 30;
      limb(c, lx, by + 34, fx, fy - 8, S.upright ? 22 : 18, fur);
      c.beginPath(); c.ellipse(fx + 6, fy - 4, 20, 11, 0, 0, 7); fillStroke(c, dark);
    }
    if (S.legs === 2) {                                          // webbed feet for duck/bird
      for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * 16 + 8, -4, 22, 10, 0, 0, 7); fillStroke(c, L.nose); }
    }

    // body
    c.beginPath();
    if (S.shell) {
      c.ellipse(bx, by + 10, 86, 58, 0, 0, 7); fillStroke(c, shade(fur, -0.1));
      c.beginPath(); c.ellipse(bx, by - 6, 82, 56, 0, Math.PI, 0); fillStroke(c, L.sp.shell === true ? '#8a5a2b' : fur);
      c.lineWidth = 5;
      for (const k of [-1, 0, 1]) { c.beginPath(); c.moveTo(bx + k * 34, by - 58); c.lineTo(bx + k * 40, by - 6); c.stroke(); }
    } else {
      c.ellipse(bx, by, S.upright ? 66 : 82, S.upright ? 84 : 58, 0, 0, 7); fillStroke(c, fur);
      c.beginPath(); c.ellipse(bx + (S.upright ? 4 : 6), by + (S.upright ? 22 : 14), S.upright ? 42 : 56, S.upright ? 52 : 34, 0, 0, 7);
      fillStroke(c, L.belly);
    }
    if (L.stripes) {
      c.save(); c.beginPath(); c.ellipse(bx, by, S.upright ? 66 : 82, S.upright ? 84 : 58, 0, 0, 7); c.clip();
      c.lineWidth = 9; c.strokeStyle = 'rgba(43,29,58,.55)';
      for (const k of [-2, -1, 0, 1, 2]) { c.beginPath(); c.moveTo(bx + k * 26 - 10, by - 90); c.lineTo(bx + k * 26 + 10, by + 90); c.stroke(); }
      c.restore(); c.strokeStyle = INK;
    }
    if (L.wool) {
      for (const k of [-1, 0, 1]) { c.beginPath(); c.arc(bx + k * 44, by - 44, 30, 0, 7); fillStroke(c, shade(fur, 0.2)); }
    }
    if (S.mane) {
      c.beginPath(); c.arc(hx - 4, hy + 4, hr * 1.28, 0, 7); fillStroke(c, shade(fur, -0.28));
    }

    // front limbs / arms follow the pose the same way human arms do
    if (!S.flying && S.legs !== 0) {
      for (const sd of [-1, 1]) {
        const a = sd < 0 ? P.armL : P.armR;
        const sx2 = bx + (S.upright ? 44 : 30), sy2 = by + (S.upright ? -34 : -6);
        const ex = sx2 + Math.sin(a) * 46, ey = sy2 + Math.cos(a) * 46;
        limb(c, sx2, sy2, ex, ey, 16, fur);
        c.beginPath(); c.arc(ex, ey, 11, 0, 7); fillStroke(c, dark);
      }
    }

    // head
    c.save(); c.translate(hx, hy); c.rotate(P.tilt); c.translate(-hx, -hy);
    animalEars(c, L, P, hx, hy, hr);
    c.beginPath(); c.ellipse(hx, hy, hr, hr * 0.94, 0, 0, 7); fillStroke(c, fur);
    if (S.horn) { c.beginPath(); c.moveTo(hx + hr * 0.1, hy - hr * 0.86); c.lineTo(hx + hr * 0.22, hy - hr * 1.62); c.lineTo(hx + hr * 0.42, hy - hr * 0.80); c.closePath(); fillStroke(c, '#f2e2b8'); }
    if (S.trunk) {
      c.beginPath(); c.moveTo(hx + hr * 0.5, hy + hr * 0.1);
      c.bezierCurveTo(hx + hr * 1.1, hy + hr * 0.5, hx + hr * 0.7, hy + hr * 1.3, hx + hr * 0.2, hy + hr * 1.1);
      c.lineWidth = hr * 0.42; c.strokeStyle = INK; c.stroke();
      c.lineWidth = hr * 0.30; c.strokeStyle = fur; c.stroke(); c.strokeStyle = INK;
    }
    if (S.antlers) {
      c.lineWidth = 8; c.lineCap = 'round';
      for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(hx + sd * hr * 0.3, hy - hr * 0.7); c.lineTo(hx + sd * hr * 0.62, hy - hr * 1.35); c.moveTo(hx + sd * hr * 0.45, hy - hr * 1.0); c.lineTo(hx + sd * hr * 0.16, hy - hr * 1.28); c.stroke(); }
    }
    animalEyes(c, L, P, hx, hy, hr);
    animalMouth(c, L, P, hx, hy, hr);
    if (S.butterfly) {                                           // antennae
      c.lineWidth = 4;
      for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(hx + hr * 0.5, hy - hr * 0.5); c.quadraticCurveTo(hx + hr * 0.9, hy - hr * 1.2, hx + hr * (0.7 + sd * 0.3), hy - hr * 1.3); c.stroke(); c.beginPath(); c.arc(hx + hr * (0.7 + sd * 0.3), hy - hr * 1.3, 5, 0, 7); fillStroke(c, INK); }
    }
    c.restore();
    c.restore();
  }

  // ---------- inanimate objects ----------
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
