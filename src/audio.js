// 全部用 WebAudio 合成的音效和背景小调
let ac = null, master = null, musicGain = null, muted = false, timer = null;

export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination);
  musicGain = ac.createGain(); musicGain.gain.value = 0.5; musicGain.connect(master);
  startMusic();
}
export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.55;
  return muted;
}

function tone(f, d = 0.12, type = 'sine', v = 0.2, when = 0, slide = 0, out = master) {
  if (!ac) return;
  const t0 = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t0 + d);
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + d);
  o.connect(g).connect(out); o.start(t0); o.stop(t0 + d + 0.03);
}
let nbuf = null;
function noise(d = 0.1, v = 0.2, freq = 2000, type = 'bandpass', when = 0) {
  if (!ac) return;
  if (!nbuf) { nbuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const a = nbuf.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1; }
  const t0 = ac.currentTime + when, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = nbuf; f.type = type; f.frequency.value = freq;
  g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(0.0008, t0 + d);
  s.connect(f).connect(g).connect(master); s.start(t0, Math.random() * 0.5, d + 0.05);
}

const PENTA = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880];
let lastClack = 0;
export const sfx = {
  click: () => tone(700, 0.06, 'triangle', 0.15),
  count: () => tone(523, 0.16, 'triangle', 0.25),
  go: () => { tone(784, 0.3, 'triangle', 0.28); tone(1047, 0.35, 'triangle', 0.2, 0.05); },
  chant: (i) => tone([392, 440, 494, 587, 523, 659][i], 0.2, 'square', 0.1),
  stare: () => { tone(160, 0.45, 'sawtooth', 0.16, 0, 0.6); noise(0.2, 0.12, 500, 'lowpass'); },
  whoosh: () => noise(0.22, 0.14, 1400),
  pop: () => { tone(420, 0.2, 'sine', 0.22, 0, 0.35); noise(0.12, 0.1, 900); },
  hit: () => { tone(150, 0.25, 'square', 0.2, 0, 0.5); noise(0.15, 0.2, 600, 'lowpass'); },
  buzz: () => { tone(120, 0.3, 'sawtooth', 0.18); tone(127, 0.3, 'sawtooth', 0.18); },
  ding: () => { tone(1047, 0.25, 'sine', 0.22); tone(1568, 0.4, 'sine', 0.16, 0.07); },
  note: (i) => tone(PENTA[i % PENTA.length] * 2, 0.3, 'triangle', 0.22),
  jump: () => tone(330, 0.16, 'sine', 0.18, 0, 2),
  land: () => noise(0.06, 0.12, 300, 'lowpass'),
  tick: () => { noise(0.05, 0.22, 2600, 'highpass'); tone(200, 0.05, 'sine', 0.1); },
  flick: () => { noise(0.05, 0.2, 3000, 'highpass'); tone(900, 0.07, 'triangle', 0.15, 0, 0.5); },
  clack: (v = 0.5) => {
    if (!ac || ac.currentTime - lastClack < 0.03) return; lastClack = ac.currentTime;
    tone(2400, 0.035, 'sine', 0.3 * v); tone(3600, 0.02, 'triangle', 0.2 * v); noise(0.02, 0.15 * v, 5000, 'highpass');
  },
  win: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.28, 'triangle', 0.24, i * 0.11)),
  lose: () => [440, 392, 330, 262].forEach((f, i) => tone(f, 0.38, 'sawtooth', 0.12, i * 0.2, 0.94)),
};

// 背景：一段五声音阶小调，循环
const MEL = [5, -1, 4, 5, 7, -1, 5, 4, 2, -1, 4, 2, 0, -1, -1, -1, 2, -1, 4, 5, 4, 2, 0, -1, 2, 4, 2, 0, 1, -1, -1, -1];
const BASS = [0, 0, 3, 3, 1, 1, 0, 0];
function startMusic() {
  let step = 0, next = ac.currentTime + 0.3;
  const beat = 0.27;
  timer = setInterval(() => {
    while (next < ac.currentTime + 0.4) {
      const when = next - ac.currentTime, n = MEL[step % MEL.length];
      if (n >= 0) tone(PENTA[n] * 2, beat * 1.7, 'triangle', 0.07, when, 0, musicGain);
      if (step % 4 === 0) tone(PENTA[BASS[(step / 4) % BASS.length | 0]] / 2, beat * 3.5, 'sine', 0.12, when, 0, musicGain);
      if (step % 2 === 1) tone(PENTA[[2, 4, 3, 4][(step >> 1) % 4]], beat, 'sine', 0.035, when, 0, musicGain);
      step++; next += beat;
    }
  }, 120);
}
