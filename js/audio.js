/**
 * BLOCK DASH - Procedural Web Audio API Sound & Music Synthesizer
 *
 * Provides zero-asset, zero-latency procedural sound effects AND an endless
 * dynamic synthwave arcade soundtrack generated in real-time via Web Audio API oscillators.
 */

import { CONFIG } from './config.js';

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.initialized = false;

    // Music Sequencer State
    this.musicPlaying = false;
    this.musicStep = 0;
    this.musicTimer = null;
    this.tempo = 132; // BPM
  }

  /**
   * Initializes the AudioContext upon first user gesture.
   */
  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(CONFIG.AUDIO.MASTER_VOLUME, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX Bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(CONFIG.AUDIO.SFX_VOLUME, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Music Bus
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(CONFIG.AUDIO.MUSIC_VOLUME, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  resume() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : CONFIG.AUDIO.MASTER_VOLUME,
        this.ctx.currentTime
      );
    }
    return this.isMuted;
  }

  setMasterVolume(val) {
    if (this.masterGain && this.ctx) {
      CONFIG.AUDIO.MASTER_VOLUME = val;
      if (!this.isMuted) {
        this.masterGain.gain.setValueAtTime(val, this.ctx.currentTime);
      }
    }
  }

  setSFXVolume(val) {
    if (this.sfxGain && this.ctx) {
      CONFIG.AUDIO.SFX_VOLUME = val;
      this.sfxGain.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }

  setMusicVolume(val) {
    if (this.musicGain && this.ctx) {
      CONFIG.AUDIO.MUSIC_VOLUME = val;
      this.musicGain.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }

  // =========================================================================
  // CINEMATIC & INTRO SOUND EFFECTS
  // =========================================================================

  /**
   * Massive Cinematic BOOOOM on Intro Click: Sub-bass drop + stereo impact crunch
   */
  playCinematicBoom() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;

    // 1. Sub-Bass Sine Drop (150Hz -> 28Hz)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(28, now + 1.2);

    subGain.gain.setValueAtTime(0.7 * CONFIG.AUDIO.SFX_VOLUME, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);

    subOsc.start(now);
    subOsc.stop(now + 1.9);

    // 2. Distorted Crash Noise
    const bufferSize = this.ctx.sampleRate * 0.8;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + 0.8);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5 * CONFIG.AUDIO.SFX_VOLUME, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + 0.85);

    // 3. Cyber Lead Risers
    const leadOsc = this.ctx.createOscillator();
    const leadGain = this.ctx.createGain();
    leadOsc.type = 'sawtooth';
    leadOsc.frequency.setValueAtTime(110, now);
    leadOsc.frequency.exponentialRampToValueAtTime(880, now + 0.4);

    leadGain.gain.setValueAtTime(0.25 * CONFIG.AUDIO.SFX_VOLUME, now);
    leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    leadOsc.connect(leadGain);
    leadGain.connect(this.sfxGain);

    leadOsc.start(now);
    leadOsc.stop(now + 0.52);
  }

  /**
   * Heavy Ground Slam Thud when cube impacts the ground in intro
   */
  playSlam() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.25);

    gain.gain.setValueAtTime(0.5 * CONFIG.AUDIO.SFX_VOLUME, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.32);
  }

  // =========================================================================
  // DYNAMIC PROCEDURAL SYNTHWAVE SOUNDTRACK
  // =========================================================================

  /**
   * Starts the procedural synthwave arcade background soundtrack
   */
  startThemeMusic() {
    if (this.musicPlaying || !this.initialized) return;
    this.musicPlaying = true;
    this.musicStep = 0;

    const stepInterval = (60 / this.tempo) / 4; // 16th notes
    this.musicTimer = setInterval(() => {
      this._playMusicStep();
    }, stepInterval * 1000);
  }

  stopThemeMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  _playMusicStep() {
    if (this.isMuted || !this.ctx || !this.musicPlaying) return;
    const now = this.ctx.currentTime;
    const step = this.musicStep % 32;

    // Bassline note progression: [D2, D2, F2, D2, G2, D2, A#1, C2]
    const bassNotes = [73.42, 73.42, 87.31, 73.42, 98.0, 73.42, 58.27, 65.41];
    const currentBass = bassNotes[Math.floor(step / 4) % bassNotes.length];

    // 1. Synthwave Rolling Bass (every 8th note)
    if (step % 2 === 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(currentBass, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.exponentialRampToValueAtTime(140, now + 0.14);

      gain.gain.setValueAtTime(0.22 * CONFIG.AUDIO.MUSIC_VOLUME, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(now);
      osc.stop(now + 0.16);
    }

    // 2. Electro Hi-Hat Tick (every off-beat 16th note)
    if (step % 2 === 1) {
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.04, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7000, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08 * CONFIG.AUDIO.MUSIC_VOLUME, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      noise.start(now);
      noise.stop(now + 0.04);
    }

    // 3. Neon Lead Arpeggio Melody (Every 4th step on upbeat measures)
    if (step % 4 === 0) {
      const melodyNotes = [293.66, 349.23, 440.0, 523.25, 440.0, 392.0, 349.23, 293.66]; // D4, F4, A4, C5, A4, G4, F4, D4
      const noteIdx = (Math.floor(step / 4) + (step % 8)) % melodyNotes.length;
      const freq = melodyNotes[noteIdx];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.12 * CONFIG.AUDIO.MUSIC_VOLUME, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(now);
      osc.stop(now + 0.24);
    }

    this.musicStep++;
  }

  // =========================================================================
  // GAMEPLAY SOUND FX
  // =========================================================================

  playJump() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    const now = this.ctx.currentTime;

    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.12);

    gain.gain.setValueAtTime(0.18 * CONFIG.AUDIO.SFX_VOLUME, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  playLand() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const now = this.ctx.currentTime;

    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

    gain.gain.setValueAtTime(0.15 * CONFIG.AUDIO.SFX_VOLUME, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  playSquash() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    const now = this.ctx.currentTime;

    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);

    gain.gain.setValueAtTime(0.15 * CONFIG.AUDIO.SFX_VOLUME, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.11);
  }

  playDash() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.18;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.18);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25 * CONFIG.AUDIO.SFX_VOLUME, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + 0.19);

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.12);

    oscGain.gain.setValueAtTime(0.15 * CONFIG.AUDIO.SFX_VOLUME, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  playDashReady() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const now = this.ctx.currentTime;

    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.setValueAtTime(1600, now + 0.04);

    gain.gain.setValueAtTime(0.08 * CONFIG.AUDIO.SFX_VOLUME, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  playDeath() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.35;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.35);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35 * CONFIG.AUDIO.SFX_VOLUME, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + 0.36);

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);

    oscGain.gain.setValueAtTime(0.25 * CONFIG.AUDIO.SFX_VOLUME, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  playScoreDing() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const now = this.ctx.currentTime;

    osc.frequency.setValueAtTime(987.77, now);
    gain.gain.setValueAtTime(0.2 * CONFIG.AUDIO.SFX_VOLUME, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  playNewPB() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const notes = [440, 554.37, 659.25, 880];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.22 * CONFIG.AUDIO.SFX_VOLUME, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
  }

  playClick() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const now = this.ctx.currentTime;

    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

    gain.gain.setValueAtTime(0.12 * CONFIG.AUDIO.SFX_VOLUME, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }
}

export const audio = new SoundEngine();
