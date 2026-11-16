// The conductor: story in -> script -> animation -> video file out.
(function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const fail = msg => (window.showError ? window.showError(msg) : alert(msg));
  const NEED = { ScriptFormat: 'js/script-format.js', WriterFree: 'js/writer-free.js', Characters: 'js/characters.js',
    Acting: 'js/acting.js', Scenes: 'js/scenes.js', Sound: 'js/sound.js', Renderer: 'js/renderer.js', Exporter: 'js/exporter.js' };
  const missing = () => Object.keys(NEED).filter(k => !window[k]).map(k => NEED[k]);
  const MOODS = ['happy', 'happy', 'adventure', 'wild', 'happy', 'sneaky', 'sad'];
  let current = null, lastName = null;

  function moodOf(script) {
    let score = 0, n = 0;
    script.scenes.forEach(sc => sc.beats.forEach(b => {
      n++;
      if (b.emotion === 'scared' || b.emotion === 'angry') score -= 1;
      if (b.emotion === 'happy' || b.emotion === 'excited') score += 1;
      if (sc.bg === 'jungle') score += 0.5;
    }));
    const k = score / Math.max(1, n);
    if (k < -0.3) return 'sneaky';
    if (k > 0.45) return 'wild';
    return MOODS[(script.scenes.length + n) % 3 === 1 ? 1 : 0];
  }

  function showScript(script) {
    let html = '<p class="cast"><b>' + esc(script.title) + '</b><br>Cast: ' +
      (script.characters.map(c => '<span class="chip">' + esc(c.name) + (c.look && c.look.build ? ' <i>(' + c.look.build + ')</i>' : '') + '</span>').join(' ') || 'only a narrator') + '</p>';
    script.scenes.forEach((sc, i) => {
      html += '<div class="scene"><h2>Scene ' + (i + 1) + ': ' + esc(sc.bg) + '</h2>';
      sc.beats.forEach(b => {
        html += '<div class="beat"><span class="who">' + esc(b.who) + '</span>' +
          '<span class="tag">' + esc(b.emotion) + '</span>' +
          (b.action !== 'none' ? '<span class="tag">' + esc(b.action) + '</span>' : '') +
          (b.prop ? '<span class="tag">prop: ' + esc(b.prop) + '</span>' : '') +
          (b.sfx ? '<span class="tag sfx">sound: ' + esc(b.sfx) + '</span>' : '') +
          '<br>' + esc(b.say) + '</div>';
      });
      html += '</div>';
    });
    $('result').innerHTML = html;
  }

  function scriptFromStory() {
    const errs = $('errors'); if (errs) { errs.textContent = ''; errs.className = ''; }
    const m = missing();
    if (m.length) throw new Error('These files did not load: ' + m.join(', '));
    const story = $('story').value.trim();
    if (!story) throw new Error('Please type a story first (or press a ready-made story button).');
    const script = WriterFree.write(story);
    const problems = ScriptFormat.validate(script);
    if (problems.length) throw new Error(problems.join(' '));
    return script;
  }

  function playCurrent(sound) {
    if (!current) return;
    if (window.Sound && sound) Sound.init();
    Renderer.play(current, $('stage'), { sound: !!sound, mood: moodOf(current) });
  }

  function make() {
    try {
      current = scriptFromStory();
      showScript(current);
      const name = (current.characters[0] && current.characters[0].name) || 'toon';
      lastName = name.toLowerCase() + '-cartoon';
      playCurrent(!($('silent') && $('silent').checked));
    } catch (e) { fail(e.message); }
  }

  // ---------- export ----------
  function exportVideo() {
    const btn = $('export'), bar = $('bar'), status = $('status');
    if (!current) { try { current = scriptFromStory(); showScript(current); } catch (e) { return fail(e.message); } }
    if (btn.disabled) return;
    btn.disabled = true; btn.textContent = 'Recording…';
    bar.style.width = '0%'; status.textContent = 'Recording the cartoon — keep this tab open.';
    Renderer.stop();
    const realtime = !($('fast') && $('fast').checked);
    if (window.Sound && realtime) Sound.init();
    if (!realtime) status.textContent = 'Rendering quickly (this version is silent)…';
    Exporter.renderToVideo(current, {
      realtime,
      mood: moodOf(current),
      onProgress: p => { bar.style.width = Math.round(p * 100) + '%'; },
      onStart: () => { }
    }).then(res => {
      btn.disabled = false; btn.textContent = '⬇ Save video';
      bar.style.width = '100%';
      const name = (lastName || 'my-cartoon') + '.' + res.ext;
      const mb = (res.blob.size / 1048576).toFixed(1);
      status.textContent = 'Video ready: ' + name + ' (' + mb + ' MB)';
      Exporter.download(res.blob, name);
      const shareBtn = $('share');
      if (shareBtn) {
        shareBtn.hidden = false;
        shareBtn.onclick = () => Exporter.share(res.blob, name, current.title).then(ok => {
          if (!ok) status.textContent = 'Sharing is not available here — use the downloaded file.';
        });
      }
      const preview = $('preview');
      if (preview) {
        const url = URL.createObjectURL(res.blob);
        preview.src = url; preview.hidden = false;
        preview.load();
      }
      if (window.Sound) Sound.fadeOut();
    }).catch(err => {
      btn.disabled = false; btn.textContent = '⬇ Save video (MP4)';
      bar.style.width = '0%';
      status.textContent = '';
      fail('Video export failed: ' + err.message);
    });
  }

  // ---------- ready-made slapstick stories (one tap demo) ----------
  const IDEAS = {
    jungle: 'Scene: jungle\nNarrator: Deep in the jungle, Tom is chasing Jerry again.\nTom: Come back here, you little mouse! (angry, run)\nJerry: Catch me if you can! (smug, run)\nNarrator: Jerry hides behind a big banana tree.\nTom: Where did he go? (confused)\nNarrator: A coconut falls on Tom\'s head.\nTom: Oww! That was not funny! (angry)\nJerry: Ha ha ha! (happy, dance)\nNarrator: Tom picks up a giant hammer.\nTom: Now I will get you! (determined, pounce)\nNarrator: Jerry slips on a banana peel and runs away.\nJerry: Wheee! See you later, Tom! (excited, run)\nTom: I will get you tomorrow! (angry)',
    park: 'Mia and Leo walked into the park. "Look, a giant duck!" said Mia. "Oh no, it is chasing us!" shouted Leo. They ran past the pond and Leo fell into the mud. "Ha ha, you look funny!" laughed Mia. At night they went home to the house. "That was the best day ever," said Leo.',
    chase: 'Scene: street\nNarrator: A hot day on the street. A dog steals a bone from a big cat.\nBruno: That bone is mine! (angry, run)\nSheru: Too slow, big guy! (smug, run)\nNarrator: Bruno crashes into a fruit shop.\nBruno: Oh no, not the bananas! (scared)\nSheru: Ha ha! You look like a fruit salad! (happy, laugh)\nNarrator: A bucket of water falls on Sheru.\nSheru: Brrr! I am all wet! (surprised)\nBruno: Now who is funny? (smug)\nNarrator: They both slip on the wet road.\nBruno: Let us share the bone. (happy)\nSheru: Best idea ever! (excited, dance)'
  };

  // ---------- wiring ----------
  const make$ = $('make'); if (make$) make$.addEventListener('click', make);
  const rep = $('replay'); if (rep) rep.addEventListener('click', () => { try { playCurrent(!($('silent') && $('silent').checked)); } catch (e) { fail(e.message); } });
  const exp = $('export'); if (exp) exp.addEventListener('click', exportVideo);
  const sil = $('silent'); if (sil) sil.addEventListener('change', () => { if (sil.checked) { Renderer.stop(); if (window.Sound) Sound.fadeOut(); } });
  document.querySelectorAll('[data-story]').forEach(b => b.addEventListener('click', () => {
    $('story').value = IDEAS[b.getAttribute('data-story')];
    make();
    $('stage').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));

  // glossary panel
  if (window.Glossary && $('glossary')) {
    $('glossary').innerHTML = Glossary.map(g => '<dt>' + esc(g[0]) + '</dt><dd>' + esc(g[1]) + '</dd>').join('');
  }

  try {
    const m = missing();
    if (m.length) fail('These files did not load: ' + m.join(', ') + '.');
    else if (!$('stage') || !rep) fail('Your index.html is the old version. Please replace it with the new index.html.');
    else Scenes.draw($('stage').getContext('2d'), 'jungle', 0);
  } catch (e) { fail('Start-up problem: ' + e.message); }
})();
