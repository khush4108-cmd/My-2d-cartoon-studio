// The free writer: turns your story into a script using simple rules. No downloads, no AI, instant.
// It understands: normal story sentences, "Name: words" dialogue, "Scene: jungle", and (hints).
window.WriterFree = (function () {
  const PLACES = [
    ['night', /\b(night|moon|stars|midnight|dark|bedtime)\b/i],
    ['jungle', /\b(jungle|forest|woods|tree|vines|monkey|lion|tiger|banana|safari|island)\b/i],
    ['beach', /\b(beach|sea|ocean|sand|wave|sail|boat|island)\b/i],
    ['school', /\b(school|class|teacher|homework|exam|pencil)\b/i],
    ['street', /\b(street|city|road|shop|market|car|bus|traffic)\b/i],
    ['room', /\b(room|house|home|kitchen|bedroom|sofa|tv|table)\b/i],
    ['park', /\b(park|garden|playground|pond|grass|swing|bench)\b/i]
  ];
  const STOP = new Set(('The A An And But Then When One Once After Before They She He It Its His Her Their Him Them We Us You Your I My Me ' +
    'Suddenly Later Soon Now What Why How Who Where Oh Wow Hello Hi Hey Yes No Okay OK Narrator Scene That This There Here Let Look So If Not ' +
    'At In On To Of For With From Was Were Are Is Am Be Been Being Had Has Have Do Does Did Will Would Could Should Can May Might Must Just Very ' +
    'Really Too Also Still Even Only Again All Some Any Every Each Both More Most Much Many Few Little Big Small Good Bad Oh Ah Ha Hmm Well Please Thanks Sorry').split(' '));

  const EMO_RULES = [
    ['angry', /\b(angry|mad|furious|grr|stop it|idiot|stupid|hate|fight|yell(?:s|ed)? at)\b/i],
    ['scared', /\b(help|run|monster|scary|scared|afraid|ghost|chase|chasing|oh no|danger|scream|yikes)\b/i],
    ['sad', /\b(sad|cry|crying|tears|sorry|miss|alone|lost|hurt|sigh)\b/i],
    ['surprised', /\b(wow|whoa|amazing|unbelievable|incredible|giant|huge|what the|no way)\b/i],
    ['excited', /\b(yay|hurray|hooray|awesome|let'?s go|party|candy|ice cream|prize|win|won)\b/i],
    ['smug', /\b(easy|i knew|told you|of course|obviously|heh)\b/i],
    ['confused', /(\?\s*$|\b(huh|what\?|where|why|confused|strange|weird)\b)/i],
    ['determined', /\b(i will|i'?ll get|watch this|ready|charge|attack|catch)\b/i],
    ['love', /\b(love|sweet|cute|aww|darling|beautiful)\b/i],
    ['dizzy', /\b(dizzy|spinning|woozy)\b/i],
    ['sleepy', /\b(sleep|tired|yawn|nap|bed)\b/i],
    ['happy', /\b(ha ?ha|hehe|funny|joke|laugh|happy|smile|grin|giggle|happy)\b/i]
  ];
  const ACTION_RULES = [
    ['pounce', /\b(jump(?:s|ed)? on|pounce|grab|attack|lunge)\b/i],
    ['run', /\b(ran|run|runs|running|sprint|dash|escape|flee|chase|chases|chasing|hurry)\b/i],
    ['fall', /\b(fell|fall|falls|falling|slip|slipped|trip|tripped|crash(?:es|ed)?|tumble|slam)\b/i],
    ['jump', /\b(jump|jumps|jumped|leap|leaps|hop|hops|bounce)\b/i],
    ['dance', /\b(dance|dances|dancing|party|celebrat|sing)\b/i],
    ['sneak', /\b(sneak|sneaks|creep|creeps|quietly|tiptoe)\b/i],
    ['cower', /\b(hide|hides|hid|cower|shiver|trembl)\b/i],
    ['panic', /\b(panic|help)\b/i],
    ['clap', /\b(clap|applaud|cheer)\b/i],
    ['wave', /\b(hello|hi there|wave|waves|waved|goodbye|bye|greet)\b/i],
    ['point', /\b(look at|see that|there it|point|points)\b/i],
    ['think', /\b(think|thinks|wonder|hmm|idea|plan)\b/i],
    ['shrug', /\b(shrug|dunno|no idea|whatever)\b/i],
    ['spin', /\b(spin|spins|twirl|whirl)\b/i],
    ['walk', /\b(walk|walks|walked|stroll|went|goes|enter|arrive|step)\b/i]
  ];
  const PROP_RULES = [
    ['pie', /\b(pie|cake|cream|doughnut|donut|pizza)\b/i],
    ['bomb', /\b(bomb|dynamite|explos|tnt)\b/i],
    ['bone', /\b(bone|sausage|stick)\b/i],
    ['hammer', /\b(hammer|mallet|bat|club|pan)\b/i],
    ['piano', /\b(piano|anvil|safe|weight)\b/i],
    ['banana', /\b(banana)\b/i],
    ['flower', /\b(flower|rose|bouquet)\b/i],
    ['ball', /\b(ball|football|cricket)\b/i],
    ['bucket', /\b(bucket|water|paint)\b/i],
    ['fish', /\b(fish|fishbone)\b/i],
    ['shoe', /\b(shoe|slipper|boot)\b/i]
  ];
  const SFX_OF_ACTION = { run: 'whoosh', jump: 'boing', fall: 'slideWhistle', pounce: 'swoosh', dance: 'pop',
    panic: 'boing', spin: 'whoosh', clap: 'ding', cower: 'heartbeat', sneak: 'tick', think: 'ding', wave: 'birds' };
  const SFX_RULES = [
    ['crash', /\b(crash|slam|bang|wall|bump|smash)\b/i],
    ['bonk', /\b(bonk|hit|hits|knock(?:ed)? on the head|hammer|bonked)\b/i],
    ['splat', /\b(splat|mud|splash|wet|paint)\b/i],
    ['drum', /\b(tada|drum|rimshot)\b/i],
    ['door', /\b(door|knock|gate|gate)\b/i],
    ['engine', /\b(car|truck|engine|vroom)\b/i],
    ['boo', /\b(boo|hiss|growl|roar)\b/i],
    ['swoosh', /\b(swoosh|swipe|whizz|zoom)\b/i]
  ];

  const test = (rules, t) => { for (const [k, re] of rules) if (re.test(t)) return k; return null; };
  const emotionOf = t => test(EMO_RULES, t) || (/!/.test(t) ? 'excited' : 'neutral');
  const actionOf = t => test(ACTION_RULES, t) || 'none';
  const propOf = t => test(PROP_RULES, t);
  function sfxOf(t, action) {
    const direct = test(SFX_RULES, t);
    if (direct) return direct;
    return SFX_OF_ACTION[action] || null;
  }
  const placeOf = t => { for (const [k, re] of PLACES) if (re.test(t)) return k; return null; };

  function namesIn(t) {
    const found = (t.match(/\b[A-Z][a-z]{2,}\b/g) || []).filter(n => !STOP.has(n));
    return [...new Set(found)];
  }
  const PRONOUN = /\b(he|she|they|it|his|her|their)\b/i;

  function makeBeat(who, say, extra) {
    const action = actionOf(say), emo = emotionOf(say);
    const b = { who, say: say.trim(), emotion: emo, action, sfx: sfxOf(say, action) };
    const prop = propOf(say);
    if (prop && (action === 'pounce' || action === 'run' || action === 'fall' || /throw|throw|hold|eat|throw/i.test(say))) b.prop = prop;
    if (extra) Object.assign(b, extra);
    return b;
  }

  // build the cast: each name gets a look seed + build hints from the words around it
  function castOf(scenes, text) {
    const names = [];
    scenes.forEach(sc => sc.beats.forEach(b => { if (b.who !== 'Narrator' && !names.includes(b.who)) names.push(b.who); }));
    const lower = text.toLowerCase();
    return names.map(n => {
      const ln = n.toLowerCase();
      const hint = {};
      // look hints only from the words describing this character IN the script
      const desc = scenes.flatMap(sc => sc.beats.filter(b => b.who === n).map(b => b.say)).join(' ').toLowerCase();
      // "Tom is a big bear", "Jerry looks tiny" -> only with a describing verb close by
      const after = t => new RegExp('\\b' + ln + '\\b(?:\\s+is|\\s+was|\\s+are|\\s+were|\\s+looks|\\s+looked|\\s+seems|\\s+gets|\\s+got)'
        + '(?:\\s+(?:a|an|the|so|very|really|quite))?(?:\\s+\\w+)?\\s+(' + t + ')\\b').test(lower);
      if (after('strong|buff|muscular|huge') || /\b(big|huge|strong|buff|muscular|giant)\b/.test(desc)) hint.build = 'buff';
      else if (after('fat|chubby|round|plump') || /\b(fat|chubby|round|plump)\b/.test(desc)) hint.build = 'chubby';
      else if (after('kid|child|small|tiny|baby') || /\b(kid|child|tiny|baby)\b/.test(desc)) hint.build = 'kid';
      else if (after('tall|giant|lanky') || /\b(tall|lanky)\b/.test(desc)) hint.build = 'tall';
      if (/^(mom|mum|mother|aunty|lady|miss)$/.test(ln)) hint.build = 'adult';
      if (after('hat|cap|helmet') || /\b(hat|cap)\b/.test(desc)) hint.hat = 1;
      if (/\b(king|queen|princess|prince|crown)\b/.test(ln)) hint.hat = 2;
      if (after('glasses|spectacles|nerd') || /\b(glasses|spectacles|nerd)\b/.test(desc)) hint.glasses = true;
      if (after('beard|moustache|mustache|pirate|old') || /\b(beard|moustache|mustache|pirate)\b/.test(desc)) hint.beard = true;
      if (after('cape|superhero|hero|super') || /\b(cape|superhero|hero)\b/.test(desc)) hint.cape = true;
      return { name: n, look: hint };
    });
  }

  const TITLE_RULES = [
    [/\b(jungle|forest|monkey|lion|tiger)\b/i, 'Jungle Chase'],
    [/\b(beach|sea|ocean|island|boat)\b/i, 'Beach Adventure'],
    [/\b(school|teacher|class|homework)\b/i, 'School Days'],
    [/\b(night|moon|stars|ghost|dark)\b/i, 'A Night Story'],
    [/\b(race|run|chase|fast|speed)\b/i, 'The Big Chase'],
    [/\b(park|garden|pond|duck)\b/i, 'A Day in the Park'],
    [/\b(food|pie|cake|cook|pizza|eat)\b/i, 'Yummy Trouble'],
    [/\b(dog|cat|bone|mouse|puppy)\b/i, 'Pet Trouble']
  ];
  function titleOf(text) {
    const body = text.replace(/^\s*scene\s*:.*$/gim, '').trim();
    for (const [re, name] of TITLE_RULES) if (re.test(body)) return name;
    const first = body.split(/[.!?\n]/)[0].replace(/^[^:]{1,20}:\s*/, '').trim();
    const t = first.split(/\s+/).slice(0, 7).join(' ');
    return t ? t.replace(/^["“]|["”]$/g, '') : 'My Cartoon';
  }

  function write(raw) {
    const text = String(raw || '').replace(/\r/g, '');
    const scenes = [];
    let cur = null;
    const startScene = bg => { cur = { bg, beats: [] }; scenes.push(cur); };
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const chatty = lines.some(l => /^\**\s*[A-Za-z][\w .'-]{0,18}\s*(\([^)]*\))?\s*:\s*\S/.test(l));

    if (chatty) {                                        // "Name: words" script format
      for (const rawLine of lines) {
        const line = rawLine.replace(/^[-*•]\s*/, '').replace(/\*\*/g, '');
        let m = line.match(/^scene\s*:\s*([\w ]+)/i);
        if (m) { startScene(m[1].toLowerCase().trim().split(/\s+/)[0]); continue; }
        if (/^title\s*:/i.test(line)) continue;
        if (!cur) startScene('park');
        m = line.match(/^([A-Za-z][\w .'-]{0,18}?)\s*(?:\(([^)]*)\))?\s*:\s*([\s\S]+)$/);
        if (m) {
          const who = m[1].trim();
          let hint = (m[2] || '').toLowerCase();
          let say = m[3].trim();
          const tail = say.match(/\(([^)]*)\)\s*$/);          // "Tom: Run! (angry, run)"
          if (tail) { hint += ' ' + tail[1].toLowerCase(); say = say.replace(/\s*\([^)]*\)\s*$/, '').trim(); }
          const b = makeBeat(who, say);
          hint.split(/[,;|]/).map(x => x.trim()).forEach(word => {
            if (ScriptFormat.EMOTIONS.includes(word)) b.emotion = word;
            if (ScriptFormat.ACTIONS.includes(word)) b.action = word;
            if (ScriptFormat.PROPS.includes(word)) b.prop = word;
          });
          if (b.action !== 'none' && !b.sfx) b.sfx = SFX_OF_ACTION[b.action] || b.sfx;
          cur.beats.push(b);
        } else cur.beats.push(makeBeat('Narrator', line.replace(/\s*\([^)]*\)\s*$/, '')));
      }
    } else {                                             // normal story sentences
      const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.!?”"])\s+/);
      let last = null, prev = null, lastBeat = null;
      const VERB = /^(?:[A-Z][a-z]+\s+)?(said|asked|shouted|laughed|replied|cried|whispered|yelled|giggled|called|screamed)\b/;
      for (const s of sentences) {
        const nonQuote = s.replace(/["“][^"”]*["”]/g, '');
        const p = placeOf(nonQuote);
        if (p && (!cur || p !== cur.bg)) startScene(p);
        if (!cur) startScene('park');
        if (lastBeat && VERB.test(s.trim()) && !/["“]/.test(s)) {   // "...", said Mia.
          const nm = namesIn(nonQuote)[0];
          if (nm) { lastBeat.who = nm; prev = last; last = nm; }
          lastBeat = null; continue;
        }
        const q = s.match(/["“]([^"”]+)["”]/);
        const names = namesIn(nonQuote);
        if (q) {
          let who = names[0] || (prev && prev !== last ? prev : last) || 'Narrator';
          prev = last; last = who;
          lastBeat = makeBeat(who, q[1].trim());
          cur.beats.push(lastBeat);
          // slapstick reaction: somebody laughs at the victim
          if (/\b(fell|fall|hit|bonk|splat|mud|pie|crash|bonked)\b/i.test(q[1]) && names.length > 1) {
            cur.beats.push(makeBeat(names[1], 'Ha ha ha!', { emotion: 'happy', action: 'clap', laugh: true }));
          }
        } else {
          if (names.length) { prev = last; last = names[0]; }
          const b = makeBeat('Narrator', s.trim());
          if (PRONOUN.test(s) && !names.length && last) b.who = 'Narrator';
          cur.beats.push(b);
          lastBeat = null;
        }
      }
    }

    // merge tiny scenes, drop empty ones
    const clean = scenes.filter(sc => sc.beats.length);
    const usedNames = [];
    clean.forEach(sc => sc.beats.forEach(b => { if (b.who !== 'Narrator') usedNames.push(b.who); }));
    // a spoken line with no name at all becomes a narrator line
    clean.forEach(sc => sc.beats.forEach(b => { if (!usedNames.length && b.who !== 'Narrator') b.who = 'Narrator'; }));
    clean.forEach(sc => sc.beats.forEach(b => {
      if (b.who !== 'Narrator' && !usedNames.includes(b.who)) usedNames.push(b.who);
    }));
    // slapstick rhythm: if a beat has a crash/boing, make the next line a reaction
    clean.forEach(sc => {
      const out = [];
      sc.beats.forEach((b, i) => {
        out.push(b);
        const next = sc.beats[i + 1];
        if (b.sfx === 'crash' && next && next.who === b.who && !next.laugh) {
          const other = clean.flatMap(s => s.beats.map(x => x.who)).find(w => w !== b.who && w !== 'Narrator');
          if (other) out.push({ who: other, say: 'Ha ha ha!', emotion: 'happy', action: 'clap', sfx: null, laugh: true });
        }
      });
      sc.beats = out;
    });

    const cast = castOf(clean, text);
    const script = { title: titleOf(text), characters: cast, scenes: clean };
    return ScriptFormat.normalize(script);
  }

  return { write, emotionOf, actionOf, propOf, placeOf };
})();
