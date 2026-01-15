/**
 * AudioSystem - Procedural electronic music and sound effects
 * Inspired by The Knick (Cliff Martinez) and sci-fi laboratory aesthetics
 */

export default class AudioSystem {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.isPlaying = false;
    this.currentNotes = [];
    this.arpeggiator = null;
    this.bassline = null;
    this.pad = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Master gain
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.audioContext.destination);

      // Music channel
      this.musicGain = this.audioContext.createGain();
      this.musicGain.gain.value = 0.3;
      this.musicGain.connect(this.masterGain);

      // SFX channel
      this.sfxGain = this.audioContext.createGain();
      this.sfxGain.gain.value = 0.6;
      this.sfxGain.connect(this.masterGain);

      // Create reverb for atmosphere
      this.reverb = await this.createReverb();

      this.initialized = true;
      console.log('Audio system initialized');
    } catch (e) {
      console.warn('Audio system failed to initialize:', e);
    }
  }

  async createReverb() {
    const convolver = this.audioContext.createConvolver();
    const length = this.audioContext.sampleRate * 2;
    const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }

    convolver.buffer = impulse;
    return convolver;
  }

  // Resume audio context (required after user interaction)
  async resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  // ==================== MUSIC SYSTEM ====================

  startMusic() {
    if (!this.initialized || this.isPlaying) return;
    this.isPlaying = true;

    // The Knick-inspired electronic ambient
    this.startPad();
    this.startArpeggiator();
    this.startBassline();
    this.startPulse();
  }

  stopMusic() {
    this.isPlaying = false;
    // Oscillators will stop on their own when isPlaying becomes false
  }

  startPad() {
    // Ambient pad - warm analog-style
    const playPad = () => {
      if (!this.isPlaying) return;

      const now = this.audioContext.currentTime;

      // Chord notes (minor 7th for mysterious vibe)
      const chords = [
        [130.81, 155.56, 196.00, 233.08], // Cm7
        [116.54, 138.59, 174.61, 207.65], // Bbm7
        [103.83, 123.47, 155.56, 185.00], // Abm7
        [123.47, 146.83, 185.00, 220.00]  // Bm7
      ];

      const chord = chords[Math.floor(Math.random() * chords.length)];

      chord.forEach((freq, i) => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.value = freq;

        filter.type = 'lowpass';
        filter.frequency.value = 800;
        filter.Q.value = 1;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 2);
        gain.gain.linearRampToValueAtTime(0.06, now + 6);
        gain.gain.linearRampToValueAtTime(0, now + 8);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(now);
        osc.stop(now + 8);
      });

      setTimeout(playPad, 7000);
    };

    playPad();
  }

  startArpeggiator() {
    // The Knick-style pulsing arpeggio
    const notes = [261.63, 311.13, 392.00, 466.16, 523.25, 466.16, 392.00, 311.13];
    let noteIndex = 0;

    const playArp = () => {
      if (!this.isPlaying) return;

      const now = this.audioContext.currentTime;
      const freq = notes[noteIndex];

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.value = freq;

      filter.type = 'lowpass';
      filter.frequency.value = 2000;
      filter.Q.value = 5;

      // Pulsing envelope
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.reverb);
      this.reverb.connect(this.musicGain);

      osc.start(now);
      osc.stop(now + 0.35);

      noteIndex = (noteIndex + 1) % notes.length;

      // Slight timing variations for human feel
      const nextTime = 180 + Math.random() * 40;
      setTimeout(playArp, nextTime);
    };

    setTimeout(playArp, 2000);
  }

  startBassline() {
    // Deep sub bass pulse
    const bassNotes = [65.41, 58.27, 51.91, 61.74]; // C2, Bb1, Ab1, B1
    let bassIndex = 0;

    const playBass = () => {
      if (!this.isPlaying) return;

      const now = this.audioContext.currentTime;
      const freq = bassNotes[bassIndex];

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.value = freq;

      filter.type = 'lowpass';
      filter.frequency.value = 200;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.1);
      gain.gain.linearRampToValueAtTime(0.15, now + 1.5);
      gain.gain.linearRampToValueAtTime(0, now + 2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(now);
      osc.stop(now + 2.1);

      bassIndex = (bassIndex + 1) % bassNotes.length;
      setTimeout(playBass, 2000);
    };

    setTimeout(playBass, 500);
  }

  startPulse() {
    // Subtle rhythmic pulse like a heartbeat/machine
    const playPulse = () => {
      if (!this.isPlaying) return;

      const now = this.audioContext.currentTime;

      // Create noise burst
      const bufferSize = this.audioContext.sampleRate * 0.1;
      const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.audioContext.createBufferSource();
      noise.buffer = buffer;

      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 100;
      filter.Q.value = 10;

      const gain = this.audioContext.createGain();
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      noise.start(now);
      noise.stop(now + 0.1);

      setTimeout(playPulse, 500);
    };

    setTimeout(playPulse, 1000);
  }

  // ==================== SOUND EFFECTS ====================

  // UI Sounds
  playClick() {
    if (!this.initialized) return;
    this.resume();

    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  playHover() {
    if (!this.initialized) return;
    this.resume();

    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.value = 1200;

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Game Event Sounds
  playPurchase() {
    if (!this.initialized) return;
    this.resume();

    const now = this.audioContext.currentTime;

    // Cash register / purchase sound
    [800, 1000, 1200].forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const startTime = now + i * 0.08;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startTime);
      osc.stop(startTime + 0.15);
    });
  }

  playHire() {
    if (!this.initialized) return;
    this.resume();

    const now = this.audioContext.currentTime;

    // Welcoming chime
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

    notes.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;

      const startTime = now + i * 0.1;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  }

  playExperimentStart() {
    if (!this.initialized) return;
    this.resume();

    const now = this.audioContext.currentTime;

    // Powering up sound
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.5);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(2000, now + 0.5);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.6);
  }

  playExperimentProgress() {
    if (!this.initialized) return;
    this.resume();

    const now = this.audioContext.currentTime;

    // Bubbling/processing sound
    for (let i = 0; i < 3; i++) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.value = 300 + Math.random() * 400;

      const startTime = now + i * 0.05;
      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startTime);
      osc.stop(startTime + 0.1);
    }
  }

  playExperimentComplete() {
    if (!this.initialized) return;
    this.resume();

    const now = this.audioContext.currentTime;

    // Success fanfare
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const startTime = now + i * 0.12;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.6);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startTime);
      osc.stop(startTime + 0.7);
    });

    // Add shimmer
    this.playShimmer(now + 0.3);
  }

  playExperimentFail() {
    if (!this.initialized) return;
    this.resume();

    const now = this.audioContext.currentTime;

    // Descending tones
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.4);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  playResearchUnlock() {
    if (!this.initialized) return;
    this.resume();

    const now = this.audioContext.currentTime;

    // Magical discovery sound
    const notes = [392.00, 493.88, 587.33, 783.99, 987.77]; // G4, B4, D5, G5, B5

    notes.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.value = freq;

      filter.type = 'highpass';
      filter.frequency.value = 500;

      const startTime = now + i * 0.08;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.8);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.reverb);
      this.reverb.connect(this.sfxGain);

      osc.start(startTime);
      osc.stop(startTime + 0.9);
    });

    this.playShimmer(now + 0.2);
  }

  playLevelUp() {
    if (!this.initialized) return;
    this.resume();

    const now = this.audioContext.currentTime;

    // Triumphant ascending arpeggio
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];

    notes.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'square';
      osc.frequency.value = freq;

      const startTime = now + i * 0.07;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  }

  playNotification() {
    if (!this.initialized) return;
    this.resume();

    const now = this.audioContext.currentTime;

    // Gentle ping
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1100, now + 0.1);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  playShimmer(startTime) {
    // Sparkle effect
    for (let i = 0; i < 8; i++) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.value = 2000 + Math.random() * 3000;

      const time = startTime + i * 0.05;
      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(time);
      osc.stop(time + 0.2);
    }
  }

  playEquipmentUpgrade() {
    if (!this.initialized) return;
    this.resume();

    const now = this.audioContext.currentTime;

    // Mechanical upgrade sound
    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc1.type = 'square';
    osc1.frequency.setValueAtTime(200, now);
    osc1.frequency.exponentialRampToValueAtTime(800, now + 0.3);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(150, now);
    osc2.frequency.exponentialRampToValueAtTime(600, now + 0.3);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);

    // Success chime at the end
    setTimeout(() => this.playClick(), 350);
  }

  // Volume controls
  setMasterVolume(value) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, value));
    }
  }

  setMusicVolume(value) {
    if (this.musicGain) {
      this.musicGain.gain.value = Math.max(0, Math.min(1, value));
    }
  }

  setSFXVolume(value) {
    if (this.sfxGain) {
      this.sfxGain.gain.value = Math.max(0, Math.min(1, value));
    }
  }

  toggleMusic() {
    if (this.isPlaying) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
    return this.isPlaying;
  }
}

// Singleton instance
export const audioSystem = new AudioSystem();
