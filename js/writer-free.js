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
  function namesIn(t) {
    return (t.match(/\b[A-Z][a-z]{2,}\b/g) || []).filter(n => !STOP.has(n));
  }
  function beat(who, say) {
    return { who, say, emotion: emotionOf(say), action: actionOf(say), sfx: sfxOf(say) };
  }

  function write(text) {
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
        cur.beats.push(m ? beat(m[1].trim(), m[2].trim()) : beat('Narrator', l));
      }
    } else {                                        // normal story sentences
      const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.!?”"])\s+/);
      let last = null, prev = null, lastQuote = null;
      const VERB = /^(?:[A-Z][a-z]+\s+)?(said|asked|shouted|laughed|replied|cried|whispered|yelled|giggled|called)\b/;
      for (const s of sentences) {
        const p = placeOf(s.replace(/["“][^"”]*["”]/g, ''));
        if (p && (!cur || p !== cur.bg)) startScene(p);
        if (!cur) startScene('park');
        if (lastQuote && VERB.test(s.trim()) && !/["“]/.test(s)) {          // "..." said Mia.
          const nm = namesIn(s)[0]; if (nm) { lastQuote.who = nm; prev = last; last = nm; }
          lastQuote = null; continue;
        }
        const q = s.match(/["“]([^"”]+)["”]/);
        const outside = s.replace(/["“][^"”]*["”]/g, '');
        const names = namesIn(outside);
        if (q) {
          let who = names[0] || (prev && prev !== last ? prev : last) || 'Narrator';
          prev = last; last = who;
          lastQuote = beat(who, q[1].trim()); cur.beats.push(lastQuote);
        } else {
          if (names.length) { prev = last; last = names[0]; }
          cur.beats.push(beat('Narrator', s.trim())); lastQuote = null;
        }
      }
    }
    const cast = [];
    scenes.forEach(sc => sc.beats.forEach(b => {
      if (b.who !== 'Narrator' && !cast.includes(b.who)) cast.push(b.who);
    }));
    return {
      title: text.trim().split(/\s+/).slice(0, 5).join(' '),
      characters: cast.map(n => ({ name: n })),
      scenes
    };
  }
  return { write };
})();
