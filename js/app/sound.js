// Tap sounds, synthesised with Web Audio (no audio files to load).
// Modelled on short UI clicks: a band-passed noise transient plus a
// tiny sine "body", decaying in 5–25 ms.
const Sound = (() => {
  let ctx = null, master = null, noise = null;
  let enabled = true;
  try { enabled = localStorage.getItem('puzzleGym.sound') !== 'off'; } catch (e) {}

  function ensure() {
    if (!enabled) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      const len = Math.floor(ctx.sampleRate * 0.12);
      noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // One click: freq = body pitch, decay = seconds to fade, opts tune the mix
  function click(freq, decay, o = {}) {
    const c = ensure(); if (!c) return;
    const t = c.currentTime + (o.delay || 0);
    const gain = o.gain ?? 1;
    // noise transient
    if ((o.noise ?? 0.6) > 0) {
      const src = c.createBufferSource(); src.buffer = noise;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass';
      bp.frequency.value = o.noiseFreq || freq * 1.5; bp.Q.value = o.q || 1.2;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime((o.noise ?? 0.6) * gain, t + 0.001);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay * 0.8);
      src.connect(bp).connect(g).connect(master);
      src.start(t); src.stop(t + decay + 0.02);
    }
    // tonal body
    if ((o.tone ?? 0.5) > 0) {
      const osc = c.createOscillator(); osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * (o.bend || 0.7), t + decay);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime((o.tone ?? 0.5) * gain, t + 0.0015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay * 1.6);
      osc.connect(g).connect(master);
      osc.start(t); osc.stop(t + decay * 2 + 0.03);
    }
  }
  function chime(freqs, step = 0.07, dur = 0.35, gain = 0.25) {
    freqs.forEach((f, i) => click(f, dur, { delay: i * step, noise: 0.08, tone: gain, bend: 0.995, noiseFreq: 5000 }));
  }
  function buzz() { navigator.vibrate && enabled && navigator.vibrate(6); }

  const presets = {
    tap:    () => { click(2100, 0.008, { noise: 0.5, tone: 0.35 }); buzz(); },          // cell action
    select: () => { click(800, 0.02, { noise: 0.35, tone: 0.45, noiseFreq: 2400 }); },   // pills, tabs, buttons
    toggle: () => { click(4700, 0.016, { noise: 0.3, tone: 0.18, bend: 0.9 }); },        // helper chips
    soft:   () => { click(1000, 0.01, { noise: 0.35, tone: 0.3 }); },                    // undo, back
    thud:   () => { click(260, 0.03, { noise: 0.2, tone: 0.7, bend: 0.8, noiseFreq: 600 }); },
    error:  () => { click(240, 0.04, { noise: 0.25, tone: 0.6, bend: 0.75, noiseFreq: 500 }); click(180, 0.05, { delay: 0.07, noise: 0.2, tone: 0.55, bend: 0.75, noiseFreq: 400 }); navigator.vibrate && enabled && navigator.vibrate([10, 40, 10]); },
    hint:   () => chime([880, 1320], 0.06, 0.18, 0.2),
    win:    () => { chime([784, 988, 1175, 1568], 0.085, 0.5, 0.22); navigator.vibrate && enabled && navigator.vibrate([12, 60, 12, 60, 24]); },
  };

  return {
    // step: Zip path movement, pitch rises as the path fills the board
    step(progress = 0) { click(1300 + progress * 900, 0.007, { noise: 0.4, tone: 0.3 }); },
    play(name) { try { presets[name] && presets[name](); } catch (e) {} },
    get enabled() { return enabled; },
    setEnabled(v) { enabled = v; try { localStorage.setItem('puzzleGym.sound', v ? 'on' : 'off'); } catch (e) {} if (v) presets.select(); },
    unlock() { if (enabled) ensure(); },
  };
})();
