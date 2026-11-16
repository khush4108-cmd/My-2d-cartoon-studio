// What a cartoon script looks like, and a friendly checker for it.
window.ScriptFormat = (function () {
  const BG_ALIASES = {
    park: 'park', garden: 'park', playground: 'park', forest: 'jungle', woods: 'jungle', jungle: 'jungle',
    room: 'room', house: 'room', home: 'room', kitchen: 'room', indoor: 'room',
    night: 'night', moon: 'night', dark: 'night', stars: 'night',
    beach: 'beach', sea: 'beach', ocean: 'beach', island: 'beach', sand: 'beach',
    street: 'street', city: 'street', road: 'street', shop: 'street', market: 'street',
    school: 'school', class: 'school', classroom: 'school', college: 'school'
  };
  const PROPS = ['can', 'bomb', 'bone', 'pie', 'flower', 'hammer', 'rock', 'piano', 'cake', 'shoe', 'banana', 'ball', 'bucket', 'fish'];

  // read the lists live from Acting (file load order must not matter)
  const EMO_FALLBACK = ['neutral', 'happy', 'excited', 'sad', 'angry', 'confused', 'surprised', 'scared', 'smug', 'sleepy', 'dizzy', 'love', 'determined'];
  const ACT_FALLBACK = ['none', 'walk', 'run', 'jump', 'wave', 'point', 'shrug', 'dance', 'spin', 'sneak', 'panic', 'fall', 'clap', 'think', 'cower', 'pounce'];
  const emos = () => (window.Acting && Acting.EMOTIONS) || EMO_FALLBACK;
  const acts = () => (window.Acting && Acting.ACTIONS) || ACT_FALLBACK;

  const bgOf = v => BG_ALIASES[String(v || '').toLowerCase().trim()] || null;

  function normalize(script) {
    script.title = script.title || 'My Cartoon';
    script.characters = script.characters || [];
    (script.scenes || []).forEach(sc => {
      sc.bg = bgOf(sc.bg) || 'park';
      (sc.beats || []).forEach(b => {
        b.who = (b.who || 'Narrator').trim();
        b.say = (b.say || '').trim() || '...';
        b.emotion = emos().includes(b.emotion) ? b.emotion : 'neutral';
        b.action = acts().includes(b.action) ? b.action : 'none';
        if (b.prop && !PROPS.includes(b.prop)) b.prop = null;
      });
    });
    return script;
  }

  function validate(script) {
    const out = [];
    if (!script || !Array.isArray(script.scenes) || !script.scenes.length) return ['The script has no scenes.'];
    script.scenes.forEach((sc, i) => {
      if (!sc.beats || !sc.beats.length) out.push('Scene ' + (i + 1) + ' has no lines.');
    });
    return out;
  }

  const api = { BG_ALIASES, PROPS, bgOf, normalize, validate };
  Object.defineProperty(api, 'EMOTIONS', { get: emos, enumerable: true });
  Object.defineProperty(api, 'ACTIONS', { get: acts, enumerable: true });
  return api;
})();
