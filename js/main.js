// The conductor: when you press the button, it runs the writer, shows the script and plays the cartoon.
(function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const fail = msg => (window.showError ? window.showError(msg) : alert(msg));
  const NEED = { ScriptFormat: 'js/script-format.js', WriterFree: 'js/writer-free.js', Characters: 'js/characters.js',
                 Acting: 'js/acting.js', Scenes: 'js/scenes.js', Renderer: 'js/renderer.js' };
  const missing = () => Object.keys(NEED).filter(k => !window[k]).map(k => NEED[k]);
  let current = null;

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
      Renderer.play(script, $('stage'));
    } catch (e) { fail('Something went wrong: ' + e.message); }
  }

  const make$ = $('make'); if (make$) make$.addEventListener('click', make);
  const rep = $('replay');
  if (rep) rep.addEventListener('click', () => { try { if (current) Renderer.play(current, $('stage')); } catch (e) { fail(e.message); } });

  try {                       // start-up check + a preview picture on the stage
    const m = missing();
    if (m.length) fail('These files did not load: ' + m.join(', ') + '.');
    else if (!$('stage') || !rep) fail('Your index.html is the old version. Please replace it with the new index.html.');
    else Scenes.draw($('stage').getContext('2d'), 'park', 0);
  } catch (e) { fail('Start-up problem: ' + e.message); }
})();
