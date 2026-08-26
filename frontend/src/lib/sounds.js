// Tiny synthesized paper sounds (Web Audio, no files, very subtle)
let ctx = null;
const getCtx = () => {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  }
  if (ctx && ctx.state === "suspended") ctx.resume();
  return ctx;
};

// short filtered noise burst = page flick
export const playPageFlip = () => {
  const c = getCtx();
  if (!c) return;
  const dur = 0.18;
  const buffer = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    const env = Math.sin(Math.PI * Math.min(1, t * 1.6)) * (1 - t * 0.55);
    data[i] = (Math.random() * 2 - 1) * env * 0.6;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2600;
  bp.Q.value = 0.7;
  const gain = c.createGain();
  gain.gain.value = 0.16;
  src.connect(bp); bp.connect(gain); gain.connect(c.destination);
  src.start();
};

// even softer, shorter = pencil tick on hover
let lastTick = 0;
export const playPaperTick = () => {
  const now = Date.now();
  if (now - lastTick < 160) return; // rate limit
  lastTick = now;
  const c = getCtx();
  if (!c) return;
  const dur = 0.05;
  const buffer = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * (1 - t) * 0.5;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 3800;
  const gain = c.createGain();
  gain.gain.value = 0.05;
  src.connect(hp); hp.connect(gain); gain.connect(c.destination);
  src.start();
};
