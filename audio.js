/* =========================================================================
   慢骑 · 海岸环境声
   全部用 Web Audio 现场合成：浪声 + 暖色和声垫 + 偶尔的风铃
   不加载任何外部音频文件
   ========================================================================= */
(function () {
  'use strict';

  let ctx = null;
  let master = null;
  let padFilter = null;
  let padGain = null;
  let voices = [];
  let chimeTimer = null;
  let chordTimer = null;
  let chordIndex = 0;
  let playing = false;
  let enabled = true;
  let volume = 0.55;
  const listeners = new Set();

  const CHORDS = [
    [130.81, 164.81, 196.00, 246.94], // Cmaj7
    [110.00, 130.81, 164.81, 196.00], // Am7
    [87.31, 110.00, 130.81, 164.81],  // Fmaj7
    [98.00, 123.47, 146.83, 196.00]   // G
  ];
  const CHIME_NOTES = [523.25, 587.33, 659.25, 783.99, 880.00];

  function state() {
    return { playing: playing, enabled: enabled, volume: volume };
  }
  function emit() {
    const s = state();
    listeners.forEach(function (fn) { try { fn(s); } catch (e) {} });
  }

  function makeNoise(seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.4;
    }
    return buf;
  }

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
    } catch (e) {
      return false;
    }

    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    /* --- 浪声：低频棕噪声 --- */
    const surf = ctx.createBufferSource();
    surf.buffer = makeNoise(4);
    surf.loop = true;
    const surfLP = ctx.createBiquadFilter();
    surfLP.type = 'lowpass';
    surfLP.frequency.value = 460;
    surfLP.Q.value = 0.5;
    const surfGain = ctx.createGain();
    surfGain.gain.value = 0.55;
    surf.connect(surfLP);
    surfLP.connect(surfGain);
    surfGain.connect(master);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.065;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 190;
    lfo.connect(lfoGain);
    lfoGain.connect(surfLP.frequency);
    lfo.start();
    surf.start();

    /* --- 岸边细浪：高频薄薄一层 --- */
    const foam = ctx.createBufferSource();
    foam.buffer = surf.buffer;
    foam.loop = true;
    const foamHP = ctx.createBiquadFilter();
    foamHP.type = 'highpass';
    foamHP.frequency.value = 2600;
    const foamGain = ctx.createGain();
    foamGain.gain.value = 0.045;
    foam.connect(foamHP);
    foamHP.connect(foamGain);
    foamGain.connect(master);
    foam.start();

    /* --- 和声垫 --- */
    padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 1050;
    padFilter.Q.value = 0.4;
    padGain = ctx.createGain();
    padGain.gain.value = 0.5;
    padFilter.connect(padGain);
    padGain.connect(master);

    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.value = CHORDS[0][i];
      osc.detune.value = (i % 2 ? 4 : -4);
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.055 : 0.042;
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan) {
        pan.pan.value = -0.55 + i * 0.36;
        osc.connect(g);
        g.connect(pan);
        pan.connect(padFilter);
      } else {
        osc.connect(g);
        g.connect(padFilter);
      }
      osc.start();
      voices.push({ osc: osc, gain: g });
    }

    /* 低音 */
    const bass = ctx.createOscillator();
    bass.type = 'sine';
    bass.frequency.value = 65.41;
    const bassGain = ctx.createGain();
    bassGain.gain.value = 0.05;
    bass.connect(bassGain);
    bassGain.connect(master);
    bass.start();
    voices.push({ osc: bass, gain: bassGain, bass: true });

    return true;
  }

  function chime() {
    if (!ctx || !playing) return;
    const note = CHIME_NOTES[Math.floor(Math.random() * CHIME_NOTES.length)];
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = note;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.09, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) {
      pan.pan.value = Math.random() * 1.2 - 0.6;
      osc.connect(g);
      g.connect(pan);
      pan.connect(master);
    } else {
      osc.connect(g);
      g.connect(master);
    }
    osc.start(now);
    osc.stop(now + 3);
    chimeTimer = setTimeout(chime, 8500 + Math.random() * 7500);
  }

  function nextChord() {
    if (!ctx || !playing) return;
    chordIndex = (chordIndex + 1) % CHORDS.length;
    const now = ctx.currentTime;
    const chord = CHORDS[chordIndex];
    voices.forEach(function (v, i) {
      if (v.bass) {
        v.osc.frequency.setTargetAtTime(chord[0] / 2, now, 1.6);
      } else {
        v.osc.frequency.setTargetAtTime(chord[i], now, 1.6);
      }
    });
    chordTimer = setTimeout(nextChord, 7600);
  }

  const Audio = {
    get state() { return state(); },

    onChange: function (fn) {
      listeners.add(fn);
      fn(state());
      return function () { listeners.delete(fn); };
    },

    setEnabled: function (on) {
      enabled = !!on;
      if (!enabled) Audio.stop(0.8);
      emit();
    },

    setVolume: function (v) {
      volume = Math.max(0, Math.min(1, Number(v) || 0));
      if (master) master.gain.setTargetAtTime(volume * 0.85, ctx.currentTime, 0.15);
      emit();
    },

    start: function () {
      if (!enabled) return;
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
      if (!playing) {
        const now = ctx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
        master.gain.setTargetAtTime(volume * 0.85, now, 1.1);
        playing = true;
        if (chimeTimer) clearTimeout(chimeTimer);
        if (chordTimer) clearTimeout(chordTimer);
        chimeTimer = setTimeout(chime, 6000);
        chordTimer = setTimeout(nextChord, 7600);
        emit();
      }
      emit();
    },

    stop: function (fadeSeconds) {
      if (!ctx || !playing) {
        playing = false;
        emit();
        return;
      }
      const now = ctx.currentTime;
      const fade = typeof fadeSeconds === 'number' ? fadeSeconds : 1.2;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
      master.gain.setTargetAtTime(0.0001, now, fade / 2.2);
      playing = false;
      if (chimeTimer) { clearTimeout(chimeTimer); chimeTimer = null; }
      if (chordTimer) { clearTimeout(chordTimer); chordTimer = null; }
      emit();
    },

    resumeIfNeeded: function () {
      if (ctx && ctx.state === 'suspended' && playing) ctx.resume();
    }
  };

  window.SlowRideAudio = Audio;
})();
