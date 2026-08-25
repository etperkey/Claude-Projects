// Web Audio API procedural 8-bit sounds — no external files needed

let ctx = null;
let enabled = true;

export function initAudio() {
  // Create on first user interaction to comply with autoplay policy
  document.addEventListener('click', initContext, { once: true });
  document.addEventListener('keydown', initContext, { once: true });
}

function initContext() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    enabled = false;
  }
}

function ensureContext() {
  if (!ctx) initContext();
  if (!ctx) return false;
  if (ctx.state === 'suspended') ctx.resume();
  return true;
}

export function playSound(type) {
  if (!enabled || !ensureContext()) return;

  switch (type) {
    case 'click': playClick(); break;
    case 'feed': playFeed(); break;
    case 'mutate': playMutate(); break;
    case 'mutation': playMutationJingle(); break;
    case 'recruit': playRecruit(); break;
    case 'rest': playRest(); break;
    case 'damage': playDamage(); break;
    case 'warning': playWarning(); break;
    case 'death': playDeath(); break;
    case 'win': playWin(); break;
    case 'start': playStart(); break;
    case 'fail': playFail(); break;
  }
}

// --- Sound generators ---

function playClick() {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(800, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);
  g.gain.setValueAtTime(0.1, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
  o.connect(g).connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.05);
}

function playFeed() {
  const notes = [523, 659, 784]; // C5, E5, G5
  notes.forEach((freq, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.06);
    g.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.1);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime + i * 0.06);
    o.stop(ctx.currentTime + i * 0.06 + 0.1);
  });
}

function playMutate() {
  // Wobbly ascending tone
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(200, ctx.currentTime);
  o.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.2);
  // Add vibrato
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 20;
  lfoGain.gain.value = 30;
  lfo.connect(lfoGain).connect(o.frequency);
  lfo.start();
  lfo.stop(ctx.currentTime + 0.25);
  g.gain.setValueAtTime(0.08, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  o.connect(g).connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.25);
}

function playMutationJingle() {
  // Triumphant ascending arpeggio
  const notes = [392, 494, 587, 784]; // G4, B4, D5, G5
  notes.forEach((freq, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
    g.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.15);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime + i * 0.08);
    o.stop(ctx.currentTime + i * 0.08 + 0.15);
  });
}

function playRecruit() {
  // Friendly blip
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(440, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
  g.gain.setValueAtTime(0.1, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  o.connect(g).connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.15);
}

function playRest() {
  // Soft descending tone
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(440, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.3);
  g.gain.setValueAtTime(0.06, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  o.connect(g).connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.3);
}

function playDamage() {
  // Noise burst
  const bufferSize = ctx.sampleRate * 0.1;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.08, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  noise.connect(g).connect(ctx.destination);
  noise.start();
}

function playWarning() {
  // Two-tone alert
  for (let i = 0; i < 2; i++) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(i === 0 ? 880 : 660, ctx.currentTime + i * 0.15);
    g.gain.setValueAtTime(0.06, ctx.currentTime + i * 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.1);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime + i * 0.15);
    o.stop(ctx.currentTime + i * 0.15 + 0.1);
  }
}

function playDeath() {
  // Descending doom
  const notes = [440, 330, 220, 110];
  notes.forEach((freq, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.2);
    g.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.25);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime + i * 0.2);
    o.stop(ctx.currentTime + i * 0.2 + 0.25);
  });
}

function playWin() {
  // Victory fanfare
  const notes = [523, 659, 784, 1047, 784, 1047]; // C E G C' G C'
  notes.forEach((freq, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
    g.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.2);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime + i * 0.12);
    o.stop(ctx.currentTime + i * 0.12 + 0.2);
  });
}

function playStart() {
  // Boot-up jingle
  const notes = [262, 330, 392, 523]; // C D# G C
  notes.forEach((freq, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
    g.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.15);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime + i * 0.1);
    o.stop(ctx.currentTime + i * 0.1 + 0.15);
  });
}

function playFail() {
  // Sad buzz
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(150, ctx.currentTime);
  o.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.15);
  g.gain.setValueAtTime(0.08, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  o.connect(g).connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.15);
}
