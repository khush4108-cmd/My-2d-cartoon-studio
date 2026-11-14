// The reliable free writer: turns your story into a script using simple rules. No downloads, no AI.
window.WriterFree = (function () {
  const PLACES = {
    night:  /\b(night|moon|stars|midnight|dark)\b/i,
    beach:  /\b(beach|sea|ocean|sand)\b/i,
    school: /\b(school|class|teacher)\b/i,
    room:   /\b(room|house|home|kitchen|bedroom)\b/i,
    street: /\b(street|city|road|shop|market)\b/i,
    park:   /\b(park|garden|forest|woods|playground|pond)\b/i
  };
  const STOP = new Set('The A An And But Then When One Once After Before They She He It His Her Their Suddenly Later Soon What Why How Who Where Oh Wow Hello Hi Yes No Narrator Scene That This There Here Let Look Now So If I We You Not At In On Ha Help'.split(' '));

  // Ordinary English words, matched case-insensitively. This list is what makes
  // it safe to accept short, lowercase and ALL-CAPS names: without it, words
  // like "into", "past", "caught" and "duck" would be promoted to characters.
  const COMMON = new Set((
    'a about above across after again against all almost along also always am among an and another answer any ' +
    'anything are around as ask asked asking at away back baby bad be bear beautiful became because become been before ' +
    'began begin behind being below beside best better between big bird birds bit blue boat body book both bottle ' +
    'bowl box boy boys branch break bright bring brought brown build built bus busy but buy by call called calling ' +
    'came can cannot cap car careful carried carry cat catch caught cave chair chase chased cheese child children ' +
    'chocolate chose clean close closed cloud clouds coat cold colour come comes coming cook cookie corner could ' +
    'count cover cow cried cup cut cute dad dance dark day days deep did die different dig dinner dirty do does ' +
    'dog doing done door down draw dream dress drink drive drop dropped duck ducks during each early eat ate eaten ' +
    'egg empty end ended enough even evening ever every everyone everything exactly excited eye eyes face fall fell ' +
    'family famous far farm fast fat feather feel felt few field fight fill finally find finds fine finger fire first ' +
    'fish five fix fixed flower flies flight float floor flower flowers fly fog follow followed food foot for forest ' +
    'forget forgot four fox foxes free friend friends friendly from front fruit full fun funny fur game garden gate ' +
    'gave get gift girl girls give gives giving glad glass go goes going gone good goose got grab grass gray great ' +
    'green grew ground group grow guard guess had hair half hall hamster hand hands happy hard has hat have he head ' +
    'hear heard heavy held help helpful her here high hill him himself his hit hold hole holiday home honey hop ' +
    'hope hopped horse hot hour hours house how however hug huge hungry hunt hurry hurt i ice idea if in inside ' +
    'instead into is island it its jam jar job join joined joke joy jump jumped just keep kept key kick kind king ' +
    'kiss kitchen kite kitten knew knock knocked know known lace ladder lake lamb lamp land large last late laugh ' +
    'laughed lazy leaf learn least leave left leg legs lemon less let letter lick lid lie light like liked line ' +
    'lion list listen little live lived long look looked looking lose lost loud love loved low lunch made magic ' +
    'make man many map market marshmallow may maybe me meadow mean meet melon met middle might mile milk mind mine ' +
    'minute mirror miss missed mitt moment mommy money monkey month moon morning most mother mouse mouth move moved much ' +
    'mud music must my nail name near neat neck need never new next nice night nine no noodle nose not nothing now ' +
    'number nut oak of off often oh okay old on once one only open or orange order other our out outside over own ' +
    'pack page paint pair pan pancake pants paper park part party past path peanut pear pen pencil people pet pick ' +
    'picnic picture pie pig pillow pin pine pink place plain plan plane plant plate play played playground please ' +
    'pocket point pond pool poor pop post pot potato present pretty pull pushed put puppy queen quick quiet quite ' +
    'rabbit race radio rain rainbow ran reach read ready red rest rice ride right ring river road rock roll roof ' +
    'room rope round row rub run running sad safe said sail salt same sand sandwich sang sat save saw say says ' +
    'school scissors sea search seat second secret see seem seen seven shadow shake shall shape share shark sharp ' +
    'she sheep shell shine ship shirt shoe shoes shop short should shout shouted show shower side sign silly since ' +
    'sing sister sit six size skate skip sky sleep sleepy slow small smell smile smiled smoke snail snake sneeze ' +
    'snow so sock soft some someone something song soon sorry sound soup space spade speak spot spring square ' +
    'squirrel stable stairs stand star start started stay steady step stick still stone stop stopped store storm ' +
    'story straight strange street strong stuck stone such sugar summer sun sunny supper sure surprise surprised ' +
    'swam swamp sweet swim swing table tail take tall taste taught tea teach teacher team tell tent than thank ' +
    'that the their them then there these thick thin thing things think third thirsty this those though thought ' +
    'three threw throw thunder ticket tidy tie tiger tight time tiny tired to today toe together told tomato ' +
    'tomorrow tone tongue tonight too took tooth top tornado toss touch toward towel town toy toys train tree trees ' +
    'trick tried truck true try tub tug tunnel turn turned turtle twelve twenty two ugly umbrella under until up ' +
    'upon us use used very visit voice wait wake walk walked wall want warm was wash watch water wave waved way we ' +
    'wear weather week well went were wet whale what wheel when where whether which while whisper whispered white ' +
    'who whole whom whose why wide wife wig wild will win wind window window wing wings winter wise wish with ' +
    'within without woke wolf woman wonder wood wooden wool word words work world worm worried worth would write ' +
    'brick cottage named ' +
    'wrong yard yawn year yellow yes yesterday yet yogurt you young your zoo ' +
    // common verbs in the past tense, so "found a carrot" cannot cast "Found"
    'found picked grabbed dropped held brought thought forgot began watched nodded skipped ' +
    'danced helped worked cooked baked cleaned climbed slid flew wore drank slept threw woke ' +
    'smiled bounced talked listened waited wanted needed liked loved wished tried finished ' +
    'arrived left returned escaped disappeared appeared happened finished seemed sounded ' +
    // everyday nouns and animals that recur in children's stories
    'ball balls balloon basket bag bags blanket boot boots bridge bucket cake cracker doll ' +
    'drum flute glove gloves hill hills leaves log logs marble marbles nest nets notebook ' +
    'puzzle ribbon rocket spoon stream streams tool tools wagon whistle afternoon noon ' +
    'bunny butterfly caterpillar chick chicken deer dolphin donkey duckling elephant frog ' +
    'goat hedgehog kitty owl panda parrot penguin pig pony seal spider swan turkey zebra ' +
    'cliff creek desert jungle mountain mountains ocean shore valley volcano waterfall ' +
    'balloon feather feathers stone stones twig twigs pebble pebbles ' +
    // emphasis, filler and onomatopoeia. "Ha ha" repeats, so without these a
    // laugh would be promoted to a member of the cast.
    'ha haha hehe hee ho oh ah ow ay yay boo grr whoa yikes phew gosh gee uh ' +
    'la la na na pooh psst shh whee yippee ouch hmmph ' +
    'wow really actually maybe alas oops hey um well hmm wowzers indeed certainly sure ' +
    'chasing running walking jumping singing dancing ' +
    'giant huge enormous tiny little big small long short tall wide narrow round square ' +
    // Every creature and object the renderer knows how to draw, plus the colour
    // words that can describe them. A lowercase one of these is an ordinary word
    // and never a character: "a giant magic carrot" must not put a person named
    // Carrot on the stage. (Missing just `carrot` here is what caused that bug.)
    'bee dragon unicorn hare kitties puppies butterflies rabbits squirrels bears cats dogs frogs bees owls mice ' +
    'lions tigers horses dragons unicorns turtles fishes pigs elephants monkeys penguins wolves snails carrot ' +
    'apple candy cream black tan ginger golden gold navy purple violet grey silver spotted striped'
  ).trim().split(/\s+/));

  // Words that are never a character name, however strong the evidence looks.
  const NEVER = new Set('i you he she it they we them him her his its their our my me us a an the and or but of to in on at is are was were be been being am do does did not no there here'.split(/\s+/));

  const SPEECH = new Set('said asked shouted laughed replied cried whispered yelled giggled called answered muttered told added screamed gasped sang'.split(' '));
  // Verbs that only ever introduce speech. "Mia said" is an attribution tag,
  // but "Max laughed." is a complete action sentence in its own right, so the
  // manner verbs are deliberately absent from this list.
  const PURE_SPEECH = 'said|asked|replied|whispered|called|answered|muttered|told|added';
  const ANY_SPEECH = PURE_SPEECH + '|shouted|laughed|cried|yelled|giggled|screamed|gasped';
  const ARTICLES = new Set('the a an'.split(' '));

  function emotionOf(t) {
    if (/\b(help|run|monster|scary|ghost|oh no|chasing)\b/i.test(t)) return 'scared';
    if (/\b(ha ?ha|funny|joke|laugh|lol)\b/i.test(t)) return 'happy';
    if (/\b(sad|cry|sorry|miss)\b/i.test(t)) return 'sad';
    if (/\b(angry|mad|grr|stop it)\b/i.test(t)) return 'angry';
    if (/\b(wow|amazing|whoa|giant|incredible)\b/i.test(t)) return 'surprised';
    if (/\?\s*$/.test(t)) return 'confused';
    if (/!/.test(t)) return 'excited';
    return 'neutral';
  }
  function sfxOf(t) {
    if (/\b(door|knock)\b/i.test(t)) return 'door';
    if (/\b(splash\w*)\b/i.test(t)) return 'splash';   // before crash: "mud" appears in splashes
    if (/\b(fell|fall|crash|bang|mud)\b/i.test(t)) return 'crash';
    if (/\b(jump|bounce)\b/i.test(t)) return 'boing';
    if (/\b(ran|run|chase|chasing)\b/i.test(t)) return 'whoosh';
    if (/\b(magic|surprise)\b/i.test(t)) return 'pop';
    return null;
  }
  function actionOf(t) {
    if (/\b(jump|bounce)\b/i.test(t)) return 'jump';
    if (/\b(ran|run|chase|chasing)\b/i.test(t)) return 'run';
    if (/\b(hello|hi|wave)\b/i.test(t)) return 'wave';
    return 'none';
  }
  // Split a story into sentences - but never in the middle of a quotation.
  // The old one-line split cut
  //     "Wow! This is amazing!" said Coco.
  // into three pieces: "Wow! , This is amazing!" and said Coco.
  // The first two had no closing quote, so they were read as narration; the tag
  // then had no quote left to attach to and Coco never became the speaker.
  // Nobody listened to her and nobody reacted.
  function splitSentences(text) {
    const src = String(text).replace(/\s+/g, ' ');
    const out = [];
    let open = false, start = 0;
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (ch === '\u201c') { open = true; continue; }
      if (ch === '\u201d') open = false;
      else if (ch === '"') { open = !open; if (open) continue; }
      if (open) continue;                                      // inside a quote: never a boundary
      if (!(/[.!?]/.test(ch) || ch === '\u201d' || ch === '"')) continue;
      let k = i + 1;
      while (k < src.length && /["\u201d]/.test(src[k])) k++;   // swallow the closing quote(s)
      if (k >= src.length || !/\s/.test(src[k])) continue;      // no space after: not a split
      out.push(src.slice(start, k).trim());
      start = k;
      while (start < src.length && /\s/.test(src[start])) start++;
      i = start - 1;
    }
    const tail = src.slice(start).trim();
    if (tail) out.push(tail);
    return out.length ? out : (src.trim() ? [src.trim()] : []);
  }

  // A stable per-name choice, so two bystanders sharing a shot do not both land
  // on the same reaction just because their names happen to be the same length.
  function pickOf(n) {
    let h = 0;
    for (const ch of String(n)) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
    return h % 3;
  }

  function placeOf(t) {
    for (const k in PLACES) if (PLACES[k].test(t)) return k;
    return null;
  }

  // ---------- what KIND of thing is this? ---------------------------------
  // The species, object and colour vocabularies live in characters.js, because
  // that is the file that has to draw them. Reading them from there means the
  // parser can never recognise a creature the renderer cannot draw. If
  // characters.js has not loaded, every lookup misses and the story falls back
  // to the original all-human behaviour rather than breaking.
  const MODIFIERS = new Set(('little tiny small big giant huge enormous baby young old cute fluffy furry ' +
    'fat thin tall short happy sad sleepy hungry angry brave shy clever silly funny pretty beautiful ' +
    'handsome magic magical shiny sparkling soft new best friendly scary funny silly sleepy').split(/\s+/));

  function vocab() {
    const C = (typeof window !== 'undefined' && window.Characters) ? window.Characters : null;
    return {
      species: (C && C.SPECIES) || {}, alias: (C && C.ALIAS) || {},
      objects: (C && C.OBJECTS) || {}, colours: (C && C.COLOURS) || {}
    };
  }
  function speciesOf(w) {
    const V = vocab();
    if (V.species[w]) return V.alias[w] || w;
    return V.alias[w] && V.species[V.alias[w]] ? V.alias[w] : null;
  }
  function objectOf(w) { const V = vocab(); return V.objects[w] ? w : null; }
  function isCreatureWord(w) { return !!(speciesOf(w) || objectOf(w)); }
  function isColour(w) { return !!vocab().colours[w]; }
  function title(w) { return String(w).charAt(0).toUpperCase() + String(w).slice(1); }

  // Adjectives that describe how BIG something is, and words that mean magic.
  const SIZES = { giant: 1.55, huge: 1.55, enormous: 1.65, big: 1.28, large: 1.28, tall: 1.18,
    little: 0.62, tiny: 0.50, small: 0.68, baby: 0.50, short: 0.80 };
  const MAGIC = new Set(['magic', 'magical', 'shiny', 'sparkling', 'glowing', 'enchanted']);

  // Read the description around a word. "Coco the little white rabbit" says
  // Coco is a rabbit, that she is white and that she is little. Scanning stops
  // at the first word that is not an article, an adjective or a colour, so
  // "Mia and Leo walked home" tells us nothing at all and Mia stays human.
  function describeFrom(toks, k, claimed) {
    const d = { species: null, kind: null, colour: null, size: 1, magic: false };
    const note = w => {                                          // collect adjectives as we pass them
      if (isColour(w) && !d.colour) d.colour = w;
      if (SIZES[w] && d.size === 1) d.size = SIZES[w];
      if (MAGIC.has(w)) d.magic = true;
      return ARTICLES.has(w) || MODIFIERS.has(w) || isColour(w);
    };
    const take = (w, at) => {
      d.species = speciesOf(w) || objectOf(w);
      d.kind = speciesOf(w) ? 'animal' : 'object';
      d.at = at;                                                 // the token this came from
    };
    for (let j = k + 1; j < Math.min(toks.length, k + 8); j++) { // "Coco the little white rabbit"
      if (toks[j].initial) break;                                // never reach FORWARD across a
      if (claimed && claimed.has(j)) break;                      // sentence boundary either: "said
                                                                 // Mia. The duck..." is not Mia
      const w = toks[j].lower;
      if (speciesOf(w) || objectOf(w)) { take(w, j); break; }
      if (!note(w)) break;
    }
    if (!d.species && !toks[k].initial) {                          // "the little white rabbit Coco"
      for (let j = k - 1; j >= Math.max(0, k - 6); j--) {          // never reach back across a
        if (toks[j + 1] && toks[j + 1].initial) break;             // sentence boundary

        if (claimed && claimed.has(j)) break;                    // ...in BOTH directions: it is a wall
        const w = toks[j].lower;
        if (!d.species && (speciesOf(w) || objectOf(w))) { take(w, j); continue; }
        if (!note(w)) break;
      }
    }
    if (!d.species && !(claimed && claimed.has(k))) {            // the name itself: "Bird", "Carrot"
      const self = toks[k].lower;
      if (speciesOf(self) || objectOf(self)) take(self, k);
    }
    if (!d.species) return {};
    return d;
  }

  // A species stated in its own sentence is still a species. The parser used to
  // understand only "Coco the little white rabbit", so these two shapes left
  // Coco a human girl - and worse, describeFrom's backward scan then handed
  // the rabbit to whoever was named NEXT, so "Coco was a little white rabbit.
  // Max was a brown squirrel." drew MAX as the rabbit.
  const ISVERB = new Set(['is', 'was', 'were', 'are', 'became', 'becomes']);
  const CALLED = new Set(['named', 'called']);
  function statedSpecies(toks) {
    const hints = {}, claim = new Set(), names = [];
    const walk = (from, dir) => {                       // article/modifiers -> species
      const d = { species: null, kind: null, colour: null, size: 1, magic: false, at: -1, idx: [] };
      for (let j = from; j >= 0 && j < toks.length; j += dir) {
        if (toks[j].inQuote) break;
        const w = toks[j].lower;
        if (speciesOf(w) || objectOf(w)) {
          d.species = speciesOf(w) || objectOf(w); d.kind = speciesOf(w) ? 'animal' : 'object';
          d.at = j; d.idx.push(j); break;
        }
        if (isColour(w)) { if (!d.colour) d.colour = w; d.idx.push(j); continue; }
        if (SIZES[w]) { if (d.size === 1) d.size = SIZES[w]; d.idx.push(j); continue; }
        if (MAGIC.has(w)) { d.magic = true; d.idx.push(j); continue; }
        if (MODIFIERS.has(w) || ARTICLES.has(w)) { d.idx.push(j); continue; }
        break;
      }
      return d;
    };
    for (let k = 0; k < toks.length; k++) {
      const t = toks[k];
      if (t.inQuote) continue;
      const nameish = (t.caps || t.allcaps) && !STOP.has(t.w) && !speciesOf(t.lower) && !objectOf(t.lower);
      // shape 1: "<Name> was a little white rabbit."
      if (nameish && k + 1 < toks.length && ISVERB.has(toks[k + 1].lower)) {
        const d = walk(k + 2, 1);
        if (d.species) {
          const nm = canon(t.w);
          if (!hints[nm]) hints[nm] = d;
          d.idx.forEach(i => claim.add(i)); claim.add(k + 1);
          if (names.indexOf(nm) < 0) names.push(nm);
          continue;
        }
      }
      // shape 2: "A rabbit named Coco ..."
      if (speciesOf(t.lower)) {
        let j = k - 1, article = false;
        while (j >= 0) { const w = toks[j].lower;
          if (ARTICLES.has(w)) { article = true; break; }
          if (isColour(w) || SIZES[w] || MAGIC.has(w) || MODIFIERS.has(w)) { j--; continue; }
          break; }
        const nx = toks[k + 1], n2 = toks[k + 2];
        if (article && nx && CALLED.has(nx.lower) && n2 && (n2.caps || n2.allcaps) && !STOP.has(n2.w)) {
          const d = walk(k, -1);
          const nm = canon(n2.w);
          if (d.species && !hints[nm]) hints[nm] = d;
          d.idx.forEach(i => claim.add(i)); claim.add(k); claim.add(k + 1);
          if (names.indexOf(nm) < 0) names.push(nm);
        }
      }
    }
    return { hints: hints, claim: claim, names: names };
  }

  // "a wooden house" is a THING the story can put on stage; bare "the house" is
  // scenery. Without this distinction the word house could only ever switch
  // the backdrop, so a story about a wooden house never showed one.
  const MATERIALS = new Set(['wooden', 'wood', 'brick', 'stone', 'log', 'logs', 'mud', 'muddy', 'sandy', 'snowy']);
  function describedPlace(toks, k) {
    const w0 = toks[k].lower;
    if (w0 !== 'house' && w0 !== 'home') return false;
    for (let j = k - 1, hops = 0; j >= 0 && hops < 4; j--, hops++) {
      const w = toks[j].lower;
      if (MATERIALS.has(w) || isColour(w) || MODIFIERS.has(w) || SIZES[w]) return true;
      return false;
    }
    return false;
  }
  const HOUSE_RE = /\b(?:a|an|the)\s+(?:[a-zA-Z]+\s+){0,3}(?:house|home)\b/gi;
  function stripDescribedHouse(txt) {
    return txt.replace(HOUSE_RE, m => {
      const mid = m.toLowerCase().split(/\s+/).slice(1, -1);
      const described = mid.some(w => MATERIALS.has(w) || isColour(w) || MODIFIERS.has(w) || SIZES[w]);
      return described ? ' ' : m;                    // a shown house is not a room
    });
  }

  // A creature or object introduced in NARRATION - "a giant magic carrot",
  // "a small blue bird" - belongs on the stage even though nobody named it.
  // Deliberately narration only: what a character SAYS may refer to something
  // offstage, and this is also what keeps the duck in
  // `"Look, a giant duck!" said Mia` from appearing in the Mia & Leo cartoon.
  // Things that belong to the BACKGROUND, drawn by Scenes, never walked onto
  // the stage as a character: "The sun came up over the hills."
  const SCENERY = new Set(('sun moon star cloud tree hill mountain river sea ocean house home forest ' +
    'flower grass rock stone cave pond lake rain snow wind fire').split(/\s+/));

  function findEntities(toks, known, claimed) {
    const out = [], seen = new Set();
    for (let k = 0; k < toks.length; k++) {
      const t = toks[k];
      if (t.inQuote) continue;
      if (claimed && claimed.has(k)) continue;   // "Coco the rabbit" - that rabbit IS Coco
      { const cl = toks[k].lower; let ownedTok = false;   // and a bare title-line "Rabbit" is
        if (claimed) claimed.forEach(q => { if (toks[q].lower === cl) ownedTok = true; });   // the same rabbit, not a new one
        if (ownedTok) continue; }
      const sp = speciesOf(t.lower), ob = objectOf(t.lower);
      if (!sp && !ob) continue;
      if (SCENERY.has(t.lower) && !describedPlace(toks, k)) continue;
      // Only the words BEFORE this one describe it: "a tiny yellow butterfly".
      // Looking forwards would run straight into the next creature and give
      // "a giant magic carrot, a tiny yellow butterfly" a carrot that is yellow
      // and the size of a butterfly.
      let j = k - 1, article = false, hops = 0;
      const h = { kind: sp ? 'animal' : 'object', species: sp || ob, colour: null, size: 1, magic: false, at: k };
      while (j >= 0 && hops++ < 4) {                             // and only "a/an/the" makes it a thing
        const w = toks[j].lower;
        if (ARTICLES.has(w)) { article = true; break; }
        if (isColour(w)) { if (!h.colour) h.colour = w; j--; continue; }
        if (MAGIC.has(w)) { h.magic = true; j--; continue; }
        if (SIZES[w]) { if (h.size === 1) h.size = SIZES[w]; j--; continue; }
        if (MODIFIERS.has(w) || MATERIALS.has(w)) { j--; continue; }   // "a WOODEN house"
        break;
      }
      if (!article) continue;
      const name = title(h.species);
      if (known.has(name.toLowerCase()) || seen.has(name)) continue;
      seen.add(name);
      out.push({ name, hint: h });
    }
    return out;
  }

  // ---------- who is actually in this story? -------------------------------
  // Split the text into words, remembering for each one how it is capitalised,
  // whether it opens a sentence, and whether it sits inside "quotes".
  function tokens(text) {
    const out = [], re = /[A-Za-z][A-Za-z']*/g;
    // Quote state has to be SCANNED, not regexed. A straight " serves as both
    // the opening and the closing quote, so a pattern like /["“][^”]*$/ reads a
    // closing quote as an opening one and marks the words AFTER the quote as
    // being inside it. That is how `"Look at this carrot!" said Coco` credited
    // "carrot" with the verb "said" and put a carrot on stage as a human girl.
    const inQ = new Uint8Array(text.length);
    let open = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '\u201c') open = true;
      else if (ch === '\u201d') open = false;
      else if (ch === '"') open = !open;
      inQ[i] = open ? 1 : 0;
    }
    let m;
    while ((m = re.exec(text)) !== null) {
      const before = text.slice(0, m.index).replace(/\s+$/, '');
      const after = text.slice(m.index + m[0].length).replace(/^\s+/, '');
      out.push({
        w: m[0], lower: m[0].toLowerCase(), at: m.index,
        caps: /^[A-Z][a-z]/.test(m[0]),
        allcaps: m[0].length > 1 && /^[A-Z]+$/.test(m[0]),
        initial: before === '' || /[.!?:"\u201d]$/.test(before),
        inQuote: !!inQ[m.index],
        commaBefore: /,$/.test(before),
        bangAfter: /^[!?]/.test(after)
      });
    }
    return out;
  }

  // Decide once per story which words are characters. Every candidate has to
  // earn its place, because the cost of a false positive is a stranger standing
  // on the stage for the whole cartoon:
  //
  //   byVerb       "said Coco" / "Coco said" - the strongest signal there is.
  //                A verb AFTER the word only counts if the word does not open
  //                its sentence or turns up again, so "Birds sang" is safe.
  //   byAppositive "Coco the rabbit" - the classic children's-story naming
  //                pattern. Never applied to an ordinary word, which is what
  //                keeps "into the park" and "past the pond" out of the cast.
  //   byVocative   "Look, Coco!" - addressed by name inside a quote.
  //   repeated     the word simply turns up more than once and is not an
  //                ordinary English word.
  //
  // Lowercase words are accepted only on one of the three strong signals, or by
  // repetition when they are not an ordinary word. ALL-CAPS and Capitalised
  // words may also qualify by repetition.
  function detectCast(text) {
    const toks = tokens(text);
    const count = {};
    toks.forEach(t => { count[t.lower] = (count[t.lower] || 0) + 1; });
    const surface = {}, order = [];
    toks.forEach((t, k) => {
      const L = t.lower;
      if (NEVER.has(L)) return;
      const prevT = k > 0 ? toks[k - 1] : null;
      const nextT = k + 1 < toks.length ? toks[k + 1] : null;
      const next2 = k + 2 < toks.length ? toks[k + 2] : null;
      const ordinary = STOP.has(t.w) || COMMON.has(L);
      const capitalised = t.caps || t.allcaps;

      // A species or object word names a CREATURE, not a person. A lowercase
      // one ("found a carrot", "a small blue bird") never joins the cast: it is
      // collected as an entity below and drawn as what it actually is. A
      // capitalised one may be somebody's name, but it still gets the animal or
      // object design - never a human girl or boy.
      if (isCreatureWord(L) && !capitalised) return;

      // A speaking verb only counts as evidence when it is on the same side of
      // the quotation marks as the word. Otherwise the "said" in
      // `"Wow!" said Max` would be read as evidence about "Wow".
      const sameSide = o => !!o && o.inQuote === t.inQuote;
      const byVerb = (sameSide(prevT) && SPEECH.has(prevT.lower)) ||
        (sameSide(nextT) && SPEECH.has(nextT.lower) && (!t.initial || count[L] >= 2));
      const nextL = nextT ? nextT.lower : '';
      // "Coco the rabbit". Capitalisation is required here: without it the same
      // shape matches ordinary verb phrases such as "found a carrot",
      // "caught a fish" and "into the park", which would all join the cast.
      const byAppositive = capitalised && !ordinary && ARTICLES.has(nextL) && !!next2 && !NEVER.has(next2.lower);
      const byVocative = t.inQuote && capitalised && (t.commaBefore || t.bangAfter);
      const strong = byVerb || byAppositive || byVocative;
      const repeated = count[L] >= 2;

      if (ordinary) {
        // an ordinary word may still be somebody's name - "Then Will said…", or
        // "They met Blue the dog" - but only beside a speaking verb or an
        // article, only capitalised, and never while opening a sentence. Those
        // three conditions together are what keep "Look, a giant duck!",
        // "Garden was beautiful." and "Night fell." from joining the cast.
        if (!((byVerb || byAppositive) && capitalised && !t.initial)) return;
      } else {
        if (!strong && !repeated) return;                    // must recur or be pointed at
      }

      if (!(L in surface)) { order.push(L); surface[L] = t.w; }
      else if (!/^[A-Z][a-z]/.test(surface[L]) && t.caps) surface[L] = t.w;   // prefer "Coco" to "COCO"/"coco"
    });
    return order.map(L => (/^[A-Z]/.test(surface[L]) ? surface[L]
      : surface[L].charAt(0).toUpperCase() + surface[L].slice(1)));
  }

  let CAST = [], CAST_SET = new Set(), HINTS = {}, ENTITIES = [], PROPS = new Set();
  function canon(w) {                                   // map any spelling to the cast form
    const s = String(w || '').trim();
    const hit = CAST.find(c => c.toLowerCase() === s.toLowerCase());
    return hit || s;
  }
  // Which creatures/objects are actually in this sentence? This is what keeps
  // the carrot, the butterfly and the bird on stage only where they belong.
  function entitiesIn(t) {
    if (!ENTITIES.length) return [];
    const lows = tokens(t).map(k => k.lower), out = [];
    ENTITIES.forEach(e => {
      if (lows.indexOf(e.hint.species) >= 0 && out.indexOf(e.name) < 0) out.push(e.name);
    });
    return out;
  }

  function namesIn(t) {
    const out = [];
    tokens(String(t || '')).forEach(tk => {
      if (!CAST_SET.has(tk.lower)) return;
      const nm = canon(tk.w);
      if (nm && !out.includes(nm)) out.push(nm);
    });
    return out;
  }
  // ---------- who does what: per-character direction -----------------------
  // A beat used to carry ONE emotion and ONE action and the renderer gave them
  // to everybody on stage, so "Max the brown squirrel ran over" made the
  // rabbit, the butterfly, the bird AND THE CARROT all run, and Coco's
  // "Look at this carrot!" made all five of them throw their arms up together.
  // direct() works out who actually performs the action, who is only watching,
  // and who everybody should be looking at.
  //
  // The beat's own `emotion`/`action` fields are left exactly as they were:
  // they still describe the LINE, and audio.js and the script view read them.
  // `dir` is purely additive.
  const ACTIONS = [
    [/\b(jumps?|jumped|jumping|bounces?|bounced|bouncing|hops?|hopped|hopping|leaps?|leapt|leaping)\b/i, 'jump'],
    [/\b(runs?|ran|running|race[ds]?|racing|dash(?:es|ed|ing)|sprint(?:s|ed|ing)|chas(?:e|es|ed|ing)|rush(?:es|ed|ing)|hurri(?:es|ed|ying)|fled)\b/i, 'run'],
    [/\b(walks?|walked|walking|stroll(?:s|ed|ing)|march(?:es|ed|ing)|wander(?:s|ed|ing)|crawl(?:s|ed|ing)|crept|creeps?|creeping|tiptoe[ds]?|went|goes|going|headed|left)\b/i, 'walk'],
    [/\b(waves?|waved|waving)\b/i, 'wave'],
    [/\b(danc(?:e|es|ed|ing)|twirl(?:s|ed|ing)|spin(?:s|ning)|spun)\b/i, 'dance'],
    [/\b(fli(?:es|ed)|fly|flew|flies|flying|soar(?:s|ed|ing)|flutter(?:s|ed|ing))\b/i, 'fly'],
    [/\b(swims?|swam|swimming|div(?:e|es|ed|ing)|dove)\b/i, 'swim'],
    [/\b(sleeps?|sleeping|slept|naps?|napped|napping|doz(?:e|es|ed|ing)|yawn(?:s|ed|ing)|rest(?:s|ed|ing))\b/i, 'sleep'],
    [/\b(sits?|sitting|sat|crouch(?:es|ed|ing)|hid(?:e|es|ing)|hid|huddle[ds]?)\b/i, 'sit'],
    [/\b(eats?|eating|ate|munch(?:es|ed|ing)|nibbl(?:e|es|ed|ing)|bit(?:e|es|ing)|bit|taste[ds]?)\b/i, 'eat'],
    [/\b(cri(?:es|ed)|crying|cry|weep(?:s|ing)?|wept|sob(?:s|bed|bing)|tears)\b/i, 'cry'],
    [/\b(laugh(?:s|ed|ing)?|giggl(?:e|es|ed|ing)|chuckl(?:e|es|ed|ing)|ha ?ha)\b/i, 'laugh']
  ];
  // "Coco looked at Max", "Max watched her", "they stared at the carrot"
  const LOOK = /\b(look(?:s|ed|ing)?|watch(?:es|ed|ing)?|see(?:s|ing)?|saw|star(?:e|es|ed|ing)|glanc(?:e|es|ed|ing)|turn(?:s|ed|ing)?|peek(?:s|ed|ing)?|notic(?:e|es|ed|ing)|spotted|listen(?:s|ed|ing)?)\b/i;
  const GLOW = /\b(glow(?:s|ed|ing)?|shin(?:e|es|ing)|shone|sparkl(?:e|es|ed|ing)|twinkl(?:e|es|ed|ing)|lit up|flash(?:es|ed|ing)|magic|magical)\b/i;
  const RISE = /\b(float(?:s|ed|ing)?|ris(?:e|es|ing)|rose|levitat(?:e|es|ed|ing)|hover(?:s|ed|ing)|lift(?:s|ed|ing)|drift(?:s|ed|ing))\b/i;
  // "Both friends jumped", "they all ran", "together they sang"
  const TOGETHER = /\b(both|together|everyone|everybody|they all|all of them|all them|the two)\b/i;
  // a plural subject standing in for names already established: "They ran home."
  const PLURAL = /\b(they|them|their|both|all|everyone|everybody|friends)\b/i;
  // "Max watched her" - the object is a pronoun, so the target has to be
  // whoever was last on stage
  const PRONOUN = /\b(him|her|them|it|his|hers|their|there)\b/i;
  const MIRROR = { excited: 'surprised', scared: 'surprised', angry: 'surprised', surprised: 'surprised',
    happy: 'happy', sad: 'sad', confused: 'confused', neutral: 'neutral' };

  // how many tokens start before a character offset
  function ordOf(toks, charAt) {
    let n = 0;
    for (let i = 0; i < toks.length; i++) { if (toks[i].at < charAt) n = i + 1; else break; }
    return n;
  }

  // `recent` is who was already on stage, so that "Both friends jumped" and
  // "Max watched her" know who they mean even though no name is in the sentence.
  function direct(src, say, who, present, recent) {
    const text = String(src || say || '');
    const toks = tokens(text);
    const plural = TOGETHER.test(text) || PLURAL.test(text);

    // the participants: named in this sentence, plus whoever is already on
    // stage when the sentence speaks about "they" or "both"
    const cast = (present || []).slice();
    if (plural) (recent || []).forEach(n => { if (cast.indexOf(n) < 0) cast.push(n); });
    const dir = {};
    cast.forEach(n => { dir[n] = { action: 'none', emotion: null, look: null, listen: false, move: null }; });
    const beatDir = { focus: null, float: false };
    if (!cast.length) return { dir, beatDir };

    const ord = {};
    toks.forEach((t, i) => {
      const hit = cast.find(n => n.toLowerCase() === t.lower);
      if (hit && ord[hit] === undefined) ord[hit] = i;
    });
    const named = k => cast.filter(n => ord[n] !== undefined && (k === null || ord[n] < k));
    const before = k => named(k).sort((a, b) => ord[a] - ord[b]);
    const after = k => cast.filter(n => ord[n] !== undefined && ord[n] > k).sort((a, b) => ord[a] - ord[b]);

    // ---- 1. the action, and WHOSE it is ---------------------------------
    let action = 'none', vAt = -1, vOrd = -1;
    ACTIONS.forEach(([re, a]) => {
      const m = re.exec(text);
      if (!m) return;
      if (vAt < 0 || m.index < vAt) { vAt = m.index; vOrd = ordOf(toks, m.index); action = a; }
    });
    let owners = [];
    if (vAt >= 0) {
      const lead = before(vOrd);
      if (TOGETHER.test(text) || (lead.length === 0 && plural)) {
        owners = cast.slice();                       // "both friends jumped", "they ran home"
      } else if (lead.length >= 2 && /\band\b|,/.test(text.slice(0, vAt))) {
        owners = lead;                               // "Mia and Leo walked" - the two of them
      } else if (lead.length) {
        owners = [lead[lead.length - 1]];            // "Coco ran" - Coco alone, never Max
      } else if (who !== 'Narrator' && cast.indexOf(who) >= 0) {
        owners = [who];
      } else {
        owners = after(vOrd).slice(0, 1);
      }
      owners = owners.filter(n => !(HINTS[n] && HINTS[n].kind === 'object'));   // props do not act
    }

    // ---- 2. who is looking at whom --------------------------------------
    let lookSubj = null, lookTgt = null;
    const lm = LOOK.exec(text);
    if (lm) {
      const k = ordOf(toks, lm.index);
      const lead = before(k), trail = after(k);
      lookSubj = lead.length ? lead[lead.length - 1]
        : (who !== 'Narrator' && cast.indexOf(who) >= 0 ? who : null);
      if (trail.length) lookTgt = trail[0];
      else {
        // "Max watched her." - the pronoun points at whoever else is on stage
        const rest = text.slice(lm.index + lm[0].length);
        if (PRONOUN.test(rest.split(/[.!?]/)[0])) {
          const pool = (recent || []).concat(cast).filter(n => n !== lookSubj);
          lookTgt = pool.length ? pool[pool.length - 1] : null;
        }
      }
      if (lookTgt === lookSubj) lookTgt = null;
    }

    // ---- 3. a glowing or floating prop is the focus of the whole shot ----
    const things = cast.filter(n => HINTS[n] && HINTS[n].kind === 'object');
    if (things.length && (GLOW.test(text) || RISE.test(text))) {
      beatDir.focus = things.find(n => ord[n] !== undefined) || things[0];
      beatDir.float = RISE.test(text);
    }

    const lineEmotion = emotionOf(String(say || text));

    const ORDER = Object.keys(dir);
    cast.forEach(n => {
      const d = dir[n];
      if (HINTS[n] && HINTS[n].kind === 'object') { d.emotion = 'neutral'; return; }   // props never act
      // rank = where this character sits among the ones who are NOT the speaker.
      // Two bystanders in the same shot can hash to the same reaction, so the
      // rank is mixed in to guarantee neighbours never match.
      const rank = ORDER.filter(x => x !== who).indexOf(n);
      const speaks = n === who;
      if (owners.indexOf(n) >= 0) d.action = action;
      // covering the ground towards somebody reads as an entrance, not a treadmill
      if (d.action === 'run' || d.action === 'walk') {
        const tgt = (lookTgt && lookTgt !== n) ? lookTgt : (beatDir.focus && beatDir.focus !== n ? beatDir.focus : null);
        if (tgt) d.move = tgt;
      }
      // WHERE THEY LOOK is decided separately from HOW THEY FEEL, because a
      // speaker looks at things too: Coco says "Look at this carrot!" while
      // turning her head towards it.
      if (lookSubj === n && lookTgt) d.look = lookTgt;
      else if (beatDir.focus && beatDir.focus !== n) d.look = beatDir.focus;
      else if (who !== 'Narrator' && who !== n) { d.look = who; d.listen = true; }

      if (speaks || owners.indexOf(n) >= 0) d.emotion = lineEmotion;
      else if (d.look && d.look !== who) d.emotion = /[!?]/.test(text) ? 'surprised' : 'confused';
      else if (d.listen) {
        // an INDIVIDUAL reaction, not a chorus: the same line does not make
        // every bystander feel the same thing
        const pick = (pickOf(n) + (rank < 0 ? 0 : rank)) % 3;
        const opts = [MIRROR[lineEmotion] || 'neutral', 'neutral', 'confused'];
        let feel = opts[pick];
        // never hand a bystander the speaker's own expression: that is what made
        // the whole cast react identically before
        if (feel === lineEmotion) for (const alt of opts) if (alt !== lineEmotion) { feel = alt; break; }
        d.emotion = feel;
      } else d.emotion = 'neutral';
      if (!d.emotion) d.emotion = lineEmotion;
    });
    return { dir, beatDir };
  }

  // `recent` is who was already on stage, so "Both friends jumped" and
  // "Max watched her" know who they are talking about.
  let ON_STAGE = [];
  function beat(who, say, mentioned, src) {
    const m = (mentioned || []).slice();
    const d = direct(src || say, say, who, m, ON_STAGE);
    const b = { who, say, emotion: emotionOf(say), action: actionOf(say), sfx: sfxOf(say), mentioned: m,
      dir: d.dir, focus: d.beatDir.focus, float: d.beatDir.float };
    // ---- object interaction: who grabs / throws what, so the renderer can
    // ---- actually move the prop instead of leaving it on the ground.
    const src2 = src || say;
    const V = vocab();
    const isObj = nm => { const e = ENTITIES.find(q => q.name === nm); return !!(e && e.hint && V.objects[e.hint.species]); };
    const objs = m.filter(isObj);
    const actor = m.find(nm => !isObj(nm)) || (who !== 'Narrator' ? who : null);
    if (objs.length && actor) {
      if (/\b(pick|picked|lift|lifted|grab|grabbed|scoop|scooped)\b/i.test(src2)) {
        b.grab = { obj: objs[0], actor: actor };
        b.dir = Object.assign({}, b.dir);
        b.dir[actor] = Object.assign({}, b.dir[actor], { move: objs[0] });   // walk up to it
      } else if (/\b(throw|threw|toss|tossed|fling|flung|drop|dropped|hurl|hurled)\b/i.test(src2)) {
        const to = m.find(nm => isObj(nm) && /puddle|pond|water|pool|river/i.test(nm)) || null;
        b.throw = { obj: objs.find(nm => nm !== to) || objs[0], actor: actor, to: to };
        if (to) { b.dir = Object.assign({}, b.dir);
          b.dir[actor] = Object.assign({}, b.dir[actor], { move: to }); }   // face the target
      } else if (/\b(carr\w*|held|hold\w*|keeps?|carried)\b/i.test(src2)) {
        const mv = m.find(nm => isObj(nm) && /puddle|pond|water|pool/i.test(nm)) || objs[0];
        b.dir = Object.assign({}, b.dir);
        b.dir[actor] = Object.assign({}, b.dir[actor], { action: 'carrywalk', move: mv });
      }
    }
    m.forEach(n => { if (ON_STAGE.indexOf(n) < 0) ON_STAGE.push(n); });
    if (ON_STAGE.length > 6) ON_STAGE = ON_STAGE.slice(ON_STAGE.length - 6);
    return b;
  }

  function write(text) {
    ON_STAGE = [];
    CAST = detectCast(text);                    // who is in this story, decided once
    CAST_SET = new Set(CAST.map(c => c.toLowerCase()));

    // Now decide what each name IS. "Coco the little white rabbit" makes Coco a
    // small white rabbit; "Mia and Leo" describes nothing, so both stay exactly
    // the human characters they have always been.
    const allToks = tokens(text);
    HINTS = {};
    // "Coco was a rabbit" / "a rabbit named Coco": stated anywhere in the story,
    // true for every mention of that name - and never for anybody else.
    const stated = statedSpecies(allToks);
    // Things the story introduces but never names - "a giant magic carrot".
    const claimed = new Set(stated.claim);
    stated.names.forEach(nm => {
      if (CAST.indexOf(nm) < 0 && !CAST_SET.has(nm.toLowerCase())) { CAST.push(nm); CAST_SET.add(nm.toLowerCase()); }
    });
    CAST.forEach(n => {
      const L = n.toLowerCase();
      // A title line - "Aarav, Coco and Leo set out" - mentions the name with no
      // description after it, so keep looking until a line actually describes
      // somebody: "Coco the little white rabbit" is the line that counts.
      for (let k = 0; k < allToks.length; k++) {
        if (allToks[k].lower !== L) continue;
        const d = describeFrom(allToks, k, claimed);
        if (d.species) { HINTS[n] = d; claimed.add(d.at); break; }
      }
    });
    // A capitalised species word in a title line - "The Little Rabbit, the Boy
    // and the Friendly Lion" - must not join the cast as a second character when
    // that species already belongs to a named friend elsewhere in the story.
    const claimedLow = new Set(); claimed.forEach(k => claimedLow.add(allToks[k].lower));
    const ownedSpecies = nm => { const L = nm.toLowerCase();
      return L === 'scene' || (claimedLow.has(L) && !!(speciesOf(L) || objectOf(L))); };
    if (CAST.some(ownedSpecies)) {
      CAST = CAST.filter(nm => !ownedSpecies(nm));
      CAST_SET = new Set(CAST.map(n => n.toLowerCase()));
    }
    ENTITIES = findEntities(allToks, CAST_SET, claimed);
    ENTITIES.forEach(e => { HINTS[e.name] = e.hint; });
    Object.keys(stated.hints).forEach(nm => { if (!HINTS[nm]) HINTS[nm] = stated.hints[nm]; });
    // A PROP is something the story mentions in passing - "a tiny yellow
    // butterfly flew past". A CAST member is somebody the story names. The
    // renderer lets props leave the stage once the story has moved on, but a
    // character stays: Max must not walk off just because one sentence happens
    // not to mention him.
    PROPS = new Set(ENTITIES.map(e => e.name));

    const scenes = [];
    let cur = null;
    const startScene = bg => { cur = { bg, beats: [] }; scenes.push(cur); };
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const chatty = lines.some(l => /^[^:"]{1,20}:\s*\S/.test(l));

    if (chatty) {                                   // "Name: words" format
      for (const l of lines) {
        let m = l.match(/^scene:\s*(\w+)/i);
        if (m) { startScene(m[1].toLowerCase()); continue; }
        if (!cur) startScene('park');
        m = l.match(/^([^:]{1,20}):\s*(.+)$/);
        const said = namesIn(l).concat(entitiesIn(l));
        const raw = m ? m[1].trim() : 'Narrator';
        cur.beats.push(beat(raw === 'Narrator' ? 'Narrator' : canon(raw), m ? m[2].trim() : l, said, l));
      }
    } else {                                        // normal story sentences
      const sentences = splitSentences(text);
      let last = null, prev = null, lastQuote = null;
      for (const s of sentences) {
        const p = placeOf(stripDescribedHouse(s.replace(/["“][^"”]*["”]/g, '')));
        if (p && (!cur || p !== cur.bg)) startScene(p);
        if (!cur) startScene('park');
        const S = s.trim();
        // "…" said Mia.  The sentence after a quote may be the tag naming the
        // speaker - but only when it cannot stand alone as a new action.
        // "said Mia" and "Mia said" are tags; "Max laughed." is a sentence of
        // its own and used to steal the previous quote's speaker.
        const tagVerbFirst = new RegExp('^(' + ANY_SPEECH + ')\\b', 'i').test(S);
        const tagNameFirst = new RegExp("^[A-Za-z][A-Za-z']*\\s+(" + PURE_SPEECH + ')\\b', 'i').test(S);
        if (lastQuote && (tagVerbFirst || tagNameFirst) && !/["\u201c]/.test(s)) {
          const nm = namesIn(s)[0];
          if (nm) {
            lastQuote.who = nm; prev = last; last = nm;
            // Sentences are split AFTER a closing quote, so `"Look!" said Coco`
            // arrives as two pieces and the speaker was not yet known when the
            // beat was built. Add them now and work out the direction again.
            if (lastQuote.mentioned.indexOf(nm) < 0) lastQuote.mentioned.push(nm);
            const d = direct(lastQuote.say, lastQuote.say, nm, lastQuote.mentioned, ON_STAGE);
            lastQuote.dir = d.dir; lastQuote.focus = d.beatDir.focus; lastQuote.float = d.beatDir.float;
          }
          lastQuote = null; continue;
        }
        const q = s.match(/["\u201c]([^"\u201d]+)["\u201d]/);
        const outside = s.replace(/["\u201c][^"\u201d]*["\u201d]/g, '');
        const names = namesIn(outside);      // who is speaking: only names OUTSIDE the quote
        const present = namesIn(s).concat(entitiesIn(s));   // who appears at all, including inside "Look, Leo!"
        if (q) {
          let who = names[0] || (prev && prev !== last ? prev : last) || 'Narrator';
          prev = last; last = who;
          lastQuote = beat(who, q[1].trim(), present, s); cur.beats.push(lastQuote);
        } else {
          if (names.length) { prev = last; last = names[0]; }
          cur.beats.push(beat('Narrator', s.trim(), present, s)); lastQuote = null;
        }
      }
    }
    // The cast is everyone who speaks OR is mentioned, so a story told in plain
    // prose still puts its characters on the stage instead of an empty background.
    const cast = [];
    scenes.forEach(sc => sc.beats.forEach(b => {
      [b.who].concat(b.mentioned || []).forEach(nm => {
        if (nm && nm !== 'Narrator' && !cast.includes(nm)) cast.push(nm);
      });
    }));
    return {
      title: text.trim().split(/\s+/).slice(0, 5).join(' '),
      characters: cast.map(n => ({ name: n, hint: HINTS[n] || null, prop: PROPS.has(n) || undefined })),
      scenes
    };
  }
  return { write };
})();
