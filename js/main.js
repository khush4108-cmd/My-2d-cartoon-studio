// The conductor: when you press the button, it runs the writer, shows the script and plays the cartoon.
(function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const fail = msg => (window.showError ? window.showError(msg) : alert(msg));
  const NEED = { ScriptFormat: 'js/script-format.js', WriterFree: 'js/writer-free.js',
                 ArtPaths: 'js/art-paths.js', ArtRig: 'js/art-rig.js', Characters: 'js/characters.js',
                 Acting: 'js/acting.js', Scenes: 'js/scenes.js', Renderer: 'js/renderer.js' };
  // The shipped example story: four scenes, two premium animal characters,
  // dialogue, sound effects and a night ending. One tap loads it.
  const EXAMPLE = [
    'scene: park',
    'Coco the little white rabbit hopped to the sunny meadow.',
    'Max the brown squirrel ran over with his big bushy tail.',
    'Coco: Max! Max! Come out and play!',
    'Max: Coco! What a surprise! I found a giant red apple!',
    'Coco laughed and jumped with joy.',
    'scene: street',
    'Coco and Max ran through the busy street toward the wooden house.',
    'Max: Look! The apple is right there under the old tree!',
    'Coco looked surprised and stared at the little apple.',
    'Boing! Max jumped too far and dropped the apple. Crash! It fell into a mud puddle!',
    'Coco: Oh no! Quick, catch it!',
    'scene: room',
    'They carried the muddy apple inside the warm house. Knock knock!',
    'Max: Safe at last. Good work, Coco.',
    'Coco smiled warmly and waved goodbye.',
    'scene: night',
    'At night Coco stood under the moon and the stars.',
    'Coco: Good night, Max. Good night, friends.',
    'Max: Good night, Coco. See you tomorrow!'
  ].join('\n');
  const missing = () => Object.keys(NEED).filter(k => !window[k]).map(k => NEED[k]);
  let current = null;

  // --- Sound -------------------------------------------------------------
  // Sound is OPTIONAL. If js/audio.js is missing, or the browser refuses audio,
  // the picture must still play - so nothing here is allowed to throw.
  function soundNote() {
    const n = $('soundnote'); if (!n) return;
    if (!window.CartoonAudio) { n.textContent = 'Sound is unavailable: js/audio.js did not load.'; return; }
    const s = CartoonAudio.state();
    if (!s.webAudio) n.textContent = 'This browser cannot make sound effects.';
    else if (!s.speech) n.textContent = 'Effects and ambience on. This browser has no built-in voice for the lines.';
    else if (s.muted) n.textContent = 'Sound is off.';
    else n.textContent = 'Sound ready. If it stays silent, check the iPad volume and mute switch.';
  }
  function playSound(script) {
    if (!window.CartoonAudio) return;
    try {
      CartoonAudio.stop();
      // unlock() has to run INSIDE the button click, otherwise iOS Safari leaves
      // the AudioContext suspended and you hear nothing at all.
      CartoonAudio.unlock();
      CartoonAudio.start(script, performance.now());
    } catch (e) { /* a sound problem must never stop the picture */ }
    soundNote();
  }

  function showScript(script) {
    let html = '<p><b>' + esc(script.title) + '…</b> Characters: ' +
      (script.characters.map(c => esc(c.name)).join(', ') || 'only a narrator') + '</p>';
    script.scenes.forEach((sc, i) => {
      html += '<div class="scene"><h2>Scene ' + (i + 1) + ': ' + esc(sc.bg) + '</h2>';
      sc.beats.forEach(b => {
        html += '<div class="beat"><span class="who">' + esc(b.who) + '</span><span class="tag">' + b.emotion + '</span>' +
          (b.action !== 'none' ? '<span class="tag">' + b.action + '</span>' : '') +
          (b.sfx ? '<span class="tag">sound: ' + b.sfx + '</span>' : '') + '<br>' + esc(b.say) + '</div>';
      });
      html += '</div>';
    });
    $('result').innerHTML = html;
  }

  function make() {
    try {
      const errs = $('errors'); if (errs) { errs.textContent = ''; errs.className = ''; }
      const m = missing();
      if (m.length) return fail('These files did not load, so the app cannot start: ' + m.join(', ') + '. Check they are in your GitHub repo with exactly these names.');
      if (!$('stage')) return fail('Your index.html is the old version. Please replace it with the new index.html.');
      const story = $('story').value.trim();
      if (!story) return fail('Please type a story first.');
      const script = WriterFree.write(story);
      const problems = ScriptFormat.validate(script);
      if (problems.length) return fail(problems.join(' '));
      current = script;
      showScript(script);
      playSound(script);                    // sound first, then the picture
      Renderer.play(script, $('stage'));
    } catch (e) { fail('Something went wrong: ' + e.message); }
  }

  const make$ = $('make'); if (make$) make$.addEventListener('click', make);
  const ex$ = $('example'); if (ex$) ex$.addEventListener('click', () => { const t = $('story'); if (t) { t.value = EXAMPLE; t.focus(); } });
  const rep = $('replay');
  if (rep) rep.addEventListener('click', () => { try { if (current) { playSound(current); Renderer.play(current, $('stage')); } } catch (e) { fail(e.message); } });

  // --- sound controls: mute button + volume slider ------------------------
  const muteBtn = $('mute'), volSlider = $('volume');
  if (muteBtn) muteBtn.addEventListener('click', () => {
    if (!window.CartoonAudio) return;
    const nowMuted = CartoonAudio.setMuted(!CartoonAudio.state().muted);
    muteBtn.setAttribute('aria-pressed', nowMuted ? 'true' : 'false');
    muteBtn.textContent = nowMuted ? '🔇 Sound off' : '🔊 Sound on';
    soundNote();
  });
  if (volSlider) volSlider.addEventListener('input', () => {
    if (window.CartoonAudio) CartoonAudio.setVolume(Number(volSlider.value) / 100);
  });
  // honour the slider's starting position even before the first click
  if (window.CartoonAudio && volSlider) CartoonAudio.setVolume(Number(volSlider.value) / 100);
  soundNote();

  try {                       // start-up check + a preview picture on the stage
    const m = missing();
    if (m.length) fail('These files did not load: ' + m.join(', ') + '.');
    else if (!$('stage') || !rep) fail('Your index.html is the old version. Please replace it with the new index.html.');
    else Scenes.draw($('stage').getContext('2d'), 'park', 0);
  } catch (e) { fail('Start-up problem: ' + e.message); }
})();
