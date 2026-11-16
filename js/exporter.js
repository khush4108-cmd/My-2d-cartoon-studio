// EXPORT: renders the timeline frame-by-frame and records it into a real video file
// (MP4 where the browser supports it, otherwise WebM). Sound is mixed in live.
window.Exporter = (function () {
  const FPS = 30;

  function mime(withAudio) {
    if (!window.MediaRecorder) return null;
    const list = withAudio === false
      ? ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
      : ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4',
         'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    for (const m of list) if (MediaRecorder.isTypeSupported(m)) return m;
    return '';
  }

  /**
   * renderToVideo(script, { onProgress, realtime, onStart })
   *  realtime=true -> plays at normal speed (sound is audible while it records)
   *  realtime=false -> renders as fast as the machine allows
   */
  function renderToVideo(script, opts) {
    const o = opts || {};
    return new Promise((resolve, reject) => {
      const canvas = document.getElementById('stage') || document.createElement('canvas');
      canvas.width = Renderer.W; canvas.height = Renderer.H;
      const useReal = o.realtime !== false;                       // real-time = sound included
      const type = mime(useReal);
      if (!type) return reject(new Error('This browser cannot record video. Try Chrome or Safari (latest).'));

      let tl;
      try { tl = Renderer.build(script); } catch (e) { return reject(e); }
      if (window.Sound) Sound.init();

      const stream = canvas.captureStream(FPS);
      if (useReal && window.Sound && Sound.stream) {
        try {
          Sound.stream.getAudioTracks().forEach(tr => stream.addTrack(tr));
        } catch (e) { /* video only */ }
      }
      const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 6000000, audioBitsPerSecond: 128000 });
      const chunks = [];
      rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onerror = e => reject(e.error || new Error('Recording failed'));
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: type.split(';')[0] });
        const ext = type.indexOf('mp4') >= 0 ? 'mp4' : 'webm';
        resolve({ blob, ext, mimeType: type });
      };
      rec.start(250);

      const total = tl.total;
      let t = 0, last = performance.now(), spoken = null;
      // silence the on-screen player while exporting
      if (window.Renderer && typeof Renderer.stop === 'function') Renderer.stop();
      if (window.Sound && useReal) Sound.musicStart(o.mood || 'happy');
      if (window.Sound && !useReal) Sound.muted = true;             // fast mode = silent video

      function finish() {
        try { rec.stop(); } catch (e) { reject(e); return; }
        setTimeout(() => { stream.getTracks().forEach(tr => tr.stop()); }, 250);
        if (window.Sound) { Sound.fadeOut(); Sound.muted = false; }
      }

      function frame(now) {
        const dt = (now - last) / 1000; last = now;
        t = useReal ? t + Math.min(0.12, dt) : Math.min(total, t + 1 / FPS);
        let cur = null;
        try { cur = Renderer.drawFrame(canvas, tl, t); } catch (e) { return reject(e); }
        if (useReal && window.Sound && cur && cur.beat) {
          const b = cur.beat;
          if (spoken !== b) {
            spoken = b;
            const pitch = b.who === 'Narrator' ? 1.0 : 0.8 + ((String(b.who).charCodeAt(0) || 5) % 9) * 0.08;
            Sound.speak(b.say, { when: Sound.now() + 0.05, pitch, rate: 3.4, voice: b.who, maxDur: b.dur * 0.96 });
            if (b.sfx) Sound.play(b.sfx, Sound.now() + 0.05);
          }
        }
        if (o.onProgress) o.onProgress(Math.min(1, t / total));
        if (t >= total) { finish(); return; }
        if (useReal) requestAnimationFrame(frame);
        else setTimeout(() => frame(performance.now()), 1000 / FPS);
      }
      if (o.onStart) o.onStart();
      requestAnimationFrame(frame);
    });
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 4000);
  }

  // Web Share (works nicely on phones: save to Gallery / send to WhatsApp)
  async function share(blob, filename, title) {
    try {
      const file = new File([blob], filename, { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: title || filename });
        return true;
      }
    } catch (e) { /* user cancelled or unsupported */ }
    return false;
  }

  return { renderToVideo, download, share, mime };
})();
