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
    'anything are around as ask asked asking at away back bad be bear beautiful became because become been before ' +
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
    'minute mirror miss missed mitt moment money monkey month moon morning most mother mouse mouth move moved much ' +
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
    'giant huge enormous tiny little big small long short tall wide narrow round square'
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
  function placeOf(t) {
    for (const k in PLACES) if (PLACES[k].test(t)) return k;
    return null;
  }

  // ---------- who is actually in this story? -------------------------------
  // Split the text into words, remembering for each one how it is capitalised,
  // whether it opens a sentence, and whether it sits inside "quotes".
  function tokens(text) {
    const out = [], re = /[A-Za-z][A-Za-z']*/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const before = text.slice(0, m.index).replace(/\s+$/, '');
      const after = text.slice(m.index + m[0].length).replace(/^\s+/, '');
      out.push({
        w: m[0], lower: m[0].toLowerCase(),
        caps: /^[A-Z][a-z]/.test(m[0]),
        allcaps: m[0].length > 1 && /^[A-Z]+$/.test(m[0]),
        initial: before === '' || /[.!?:"\u201d]$/.test(before),
        inQuote: /["\u201c][^"\u201d]*$/.test(before),
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

  let CAST = [], CAST_SET = new Set();
  function canon(w) {                                   // map any spelling to the cast form
    const s = String(w || '').trim();
    const hit = CAST.find(c => c.toLowerCase() === s.toLowerCase());
    return hit || s;
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
  function beat(who, say, mentioned) {
    return { who, say, emotion: emotionOf(say), action: actionOf(say), sfx: sfxOf(say), mentioned: mentioned || [] };
  }

  function write(text) {
    CAST = detectCast(text);                    // who is in this story, decided once
    CAST_SET = new Set(CAST.map(c => c.toLowerCase()));

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
        const said = namesIn(l);
        const raw = m ? m[1].trim() : 'Narrator';
        cur.beats.push(beat(raw === 'Narrator' ? 'Narrator' : canon(raw), m ? m[2].trim() : l, said));
      }
    } else {                                        // normal story sentences
      const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.!?\u201d"])\s+/);
      let last = null, prev = null, lastQuote = null;
      for (const s of sentences) {
        const p = placeOf(s.replace(/["\u201c][^"\u201d]*["\u201d]/g, ''));
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
          const nm = namesIn(s)[0]; if (nm) { lastQuote.who = nm; prev = last; last = nm; }
          lastQuote = null; continue;
        }
        const q = s.match(/["\u201c]([^"\u201d]+)["\u201d]/);
        const outside = s.replace(/["\u201c][^"\u201d]*["\u201d]/g, '');
        const names = namesIn(outside);      // who is speaking: only names OUTSIDE the quote
        const present = namesIn(s);          // who appears at all, including inside "Look, Leo!"
        if (q) {
          let who = names[0] || (prev && prev !== last ? prev : last) || 'Narrator';
          prev = last; last = who;
          lastQuote = beat(who, q[1].trim(), present); cur.beats.push(lastQuote);
        } else {
          if (names.length) { prev = last; last = names[0]; }
          cur.beats.push(beat('Narrator', s.trim(), present)); lastQuote = null;
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
      characters: cast.map(n => ({ name: n })),
      scenes
    };
  }
  return { write };
})();
