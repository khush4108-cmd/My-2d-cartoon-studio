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
    'Max picked up the giant red apple and held it in his paws.',
    'Coco laughed and jumped with joy.',
    'scene: street',
    'Coco and Max ran through the busy street.',
    'Max carried the red apple beside a big brown mud puddle.',
    'Max: Look at this big mud puddle!',
    'Max threw the apple into the mud puddle! Splash!',
    'Coco: Oh no! The apple is stuck in the mud puddle!',
    'scene: room',
    'They walked inside the warm house. Knock knock!',
    'Max: Safe at last. Good work, Coco.',
    'Coco smiled warmly and waved goodbye.',
    'scene: night',
    'At night Coco stood under the moon and the stars.',
    'Coco: Good night, Max. Good night, friends.',
    'Max: Good night, Coco. See you tomorrow!',
  ].join('\n');
  // Second shipped example: a human boy, a rabbit and a four-legged lion,
  // so the studio is exercised with mixed kinds AND a quadruped on stage.
  const EXAMPLE2 = [
    'scene: park',
    'Aarav, Coco and Leo set out on a new adventure.',
    'Aarav the boy walked into the sunny park.',
    'Coco the little white rabbit hopped out from behind a tree.',
    'Leo the friendly lion padded along the grass.',
    'Aarav: Hello! My name is Aarav. Who are you?',
    'Coco: My name is Coco. I am looking for my friend.',
    'Leo: I am Leo the lion. I will help you look.',
    'scene: street',
    'A red apple lay under the tree by the busy street.',
    'Aarav, Coco and Leo walked down the street together.',
    'Coco: Look! That apple is exactly what we need!',
    'Aarav picked up the red apple and held it in his hand.',
    'Leo: Good find, Aarav! Let us share it together.',
    'scene: room',
    'Aarav, Coco and Leo sat inside the warm house to rest.',
    'Coco: Friends always share.',
    'All three friends laugh happily.',
    'scene: night',
    'At night Aarav, Coco and Leo stood under the moon and the stars.',
    'Leo: Good night, little friends. See you tomorrow!',
    'Aarav: Good night, Leo! Good night, Coco!',
  ].join('\n');
  // Third shipped example: "Bunty and the Lost Baby Bird" - the first full
  // movie story. Exercises a human boy, the new chick species and a bird,
  // with the mother bird acting (hugging, flying) without any dialogue.
  const EXAMPLE3 = [
    'scene: park',
    'Bunty the boy walked happily through his sunny garden.',
    'Chickie the tiny baby chick cried under the rose bush.',
    'Chickie: Help! Where is my mommy?',
    'Bunty: Oh! Hello, little one. Why are you crying?',
    'Chickie: I cannot find my mommy. I am lost!',
    'Bunty: Do not worry. I will help you find her.',
    'scene: park',
    'Bunty gently looked around the garden. He checked behind the bushes and under the trees.',
    'Bunty: Do you remember where you last saw your mommy?',
    'Chickie: We were near the big tree. Then the wind blew, and I fell down.',
    'Bunty: Then let us go to the big tree together!',
    'Chickie: I am scared.',
    'Bunty: Stay close to me. Everything will be okay.',
    'scene: park',
    'Bunty and Chickie reached the big tree. Suddenly they heard a loud chirping sound from above.',
    'Chickie: Look! My mommy! I am here!',
    'Mimi the big blue bird flew down joyfully and landed beside her baby.',
    'Bunty: Your little one is safe with you now!',
    'Chickie: I missed you so much!',
    'Mimi lovingly hugged her little baby with her wings.',
    'scene: park',
    'Chickie: Thank you, Bunty! You are my best friend!',
    'Bunty: You are welcome! Friends always help each other.',
    'Mimi and her baby returned safely to their nest. Bunty walked home feeling happy.',
    'Bunty: What a wonderful day! It feels so good to help someone!',
    'And from that day, Bunty and Chickie became special friends.',
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
      // unlock() must run INSIDE this click tick for iOS Safari; loading the
      // recorded voices is async, so the picture starts once they are ready
      // (or immediately with the built-in voice if there are none).
      if (window.CartoonAudio && CartoonAudio.unlock) CartoonAudio.unlock();
      const voicesReady = (window.CartoonAudio && CartoonAudio.loadVoices)
        ? CartoonAudio.loadVoices('voices/bunty/manifest.json') : Promise.resolve(0);
      voicesReady.catch(function () {}).then(function () {
        try {
          if (window.CartoonAudio && CartoonAudio.stamp) CartoonAudio.stamp(script);
          playSound(script);                    // sound first, then the picture
          Renderer.play(script, $('stage'));
        } catch (e) { fail('Something went wrong: ' + e.message); }
      });
    } catch (e) { fail('Something went wrong: ' + e.message); }
  }

  const make$ = $('make'); if (make$) make$.addEventListener('click', make);
  const ex$ = $('example'); if (ex$) ex$.addEventListener('click', () => { const t = $('story'); if (t) { t.value = EXAMPLE; t.focus(); } });
  const ex2$ = $('example2'); if (ex2$) ex2$.addEventListener('click', () => { const t = $('story'); if (t) { t.value = EXAMPLE2; t.focus(); } });
  const ex3$ = $('example3'); if (ex3$) ex3$.addEventListener('click', () => { const t = $('story'); if (t) { t.value = EXAMPLE3; t.focus(); } });
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
    // Warm the recorded voice clips in the background so the first press of
    // "Make my cartoon" never has to wait for them.
    if (window.CartoonAudio && CartoonAudio.loadVoices) CartoonAudio.loadVoices('voices/bunty/manifest.json');
  } catch (e) { fail('Start-up problem: ' + e.message); }
})();
