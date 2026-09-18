/**
 * BLOCK DASH - Procedural Web Audio API Sound & Music Synthesizer
 *
 * Provides zero-asset procedural sound effects, dynamic synthwave music,
 * and radar/targeting audio cues for the Space Interceptor encounter.
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

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(CONFIG.AUDIO.MASTER_VOLUME, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(CONFIG.AUDIO.SFX_VOLUME, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

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
  // SPACE INTERCEPTOR AUDIO CUES
  // =========================================================================

  /**
   * Targeting Radar Beep: Pulses as the interceptor calculates lock
   */
  playTargetBeep(freq = 880, isLocked = false) {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = isLocked ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(freq, now);

    const duration = isLocked ? 0.22 : 0.08;
    const vol = (isLocked ? 0.28 : 0.16) * CONFIG.AUDIO.SFX_VOLUME;

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  /**
   * Jet Turbine Flyby / Approach / Escape
   */
  playJetFlyby() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.8);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.8);

    gain.gain.setValueAtTime(0.25 * CONFIG.AUDIO.SFX_VOLUME, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.85);
  }

  /**
   * Missile Launch: Propellant Ignition Blast
   */
  playMissileLaunch() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;

    // Fast rocket roar
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.3);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4 * CONFIG.AUDIO.SFX_VOLUME, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + 0.32);

    // Initial mechanical snap
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.12);

    oscGain.gain.setValueAtTime(0.2 * CONFIG.AUDIO.SFX_VOLUME, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  /**
   * Missile Explosion / Obstacle Demolition Crunch
   */
  playMissileExplosion() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.45;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.45);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.55 * CONFIG.AUDIO.SFX_VOLUME, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + 0.46);

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

    oscGain.gain.setValueAtTime(0.4 * CONFIG.AUDIO.SFX_VOLUME, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  // =========================================================================
  // CINEMATIC & GAMEPLAY FX
  // =========================================================================

  playCinematicBoom() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;

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

    const bufferSize = this.ctx.sampleRate * 0.8;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

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
  }

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

  startThemeMusic() {
    if (this.musicPlaying || !this.initialized) return;
    this.musicPlaying = true;
    this.musicStep = 0;

    const stepInterval = (60 / this.tempo) / 4;
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

    const bassNotes = [73.42, 73.42, 87.31, 73.42, 98.0, 73.42, 58.27, 65.41];
    const currentBass = bassNotes[Math.floor(step / 4) % bassNotes.length];

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

    if (step % 4 === 0) {
      const melodyNotes = [293.66, 349.23, 440.0, 523.25, 440.0, 392.0, 349.23, 293.66];
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

  playJump() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'square';
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
    const now = this.ctx.currentTime;

    osc.type = 'sine';
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
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
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
    const now = this.ctx.currentTime;

    osc.type = 'sine';
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
    this.playPhysicalImpactCrack(false);
  }

  /**
   * Physical Obstacle Death: Impact Thud -> Crack Snap -> Shatter Crumble
   */
  playPhysicalImpactCrack(isHeavy = false) {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;

    // 1. Heavy Impact Thud
    const thudOsc = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thudOsc.type = isHeavy ? 'triangle' : 'sine';
    const startFreq = isHeavy ? 180 : 240;
    thudOsc.frequency.setValueAtTime(startFreq, now);
    thudOsc.frequency.exponentialRampToValueAtTime(35, now + 0.18);

    thudGain.gain.setValueAtTime((isHeavy ? 0.5 : 0.4) * CONFIG.AUDIO.SFX_VOLUME, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    thudOsc.connect(thudGain);
    thudGain.connect(this.sfxGain);
    thudOsc.start(now);
    thudOsc.stop(now + 0.22);

    // 2. Sharp Crack Snap (Highpass Noise Burst)
    const crackSize = Math.floor(this.ctx.sampleRate * 0.12);
    const crackBuffer = this.ctx.createBuffer(1, crackSize, this.ctx.sampleRate);
    const crackData = crackBuffer.getChannelData(0);
    for (let i = 0; i < crackSize; i++) crackData[i] = Math.random() * 2 - 1;

    const crackSource = this.ctx.createBufferSource();
    crackSource.buffer = crackBuffer;

    const crackFilter = this.ctx.createBiquadFilter();
    crackFilter.type = 'highpass';
    crackFilter.frequency.setValueAtTime(isHeavy ? 1800 : 2600, now + 0.04);
    crackFilter.Q.setValueAtTime(3.5, now);

    const crackGain = this.ctx.createGain();
    crackGain.gain.setValueAtTime(0.001, now);
    crackGain.gain.setValueAtTime(0.45 * CONFIG.AUDIO.SFX_VOLUME, now + 0.04);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    crackSource.connect(crackFilter);
    crackFilter.connect(crackGain);
    crackGain.connect(this.sfxGain);
    crackSource.start(now + 0.04);
    crackSource.stop(now + 0.18);

    // 3. Shatter & Crumble Noise Tail
    const crumbleSize = Math.floor(this.ctx.sampleRate * 0.4);
    const crumbleBuffer = this.ctx.createBuffer(1, crumbleSize, this.ctx.sampleRate);
    const crumbleData = crumbleBuffer.getChannelData(0);
    for (let i = 0; i < crumbleSize; i++) crumbleData[i] = Math.random() * 2 - 1;

    const crumbleSource = this.ctx.createBufferSource();
    crumbleSource.buffer = crumbleBuffer;

    const crumbleFilter = this.ctx.createBiquadFilter();
    crumbleFilter.type = 'lowpass';
    crumbleFilter.frequency.setValueAtTime(900, now + 0.12);
    crumbleFilter.frequency.exponentialRampToValueAtTime(80, now + 0.48);

    const crumbleGain = this.ctx.createGain();
    crumbleGain.gain.setValueAtTime(0.001, now);
    crumbleGain.gain.setValueAtTime(0.35 * CONFIG.AUDIO.SFX_VOLUME, now + 0.12);
    crumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    crumbleSource.connect(crumbleFilter);
    crumbleFilter.connect(crumbleGain);
    crumbleGain.connect(this.sfxGain);
    crumbleSource.start(now + 0.12);
    crumbleSource.stop(now + 0.52);
  }

  /**
   * Energy Hazard Death: High-Voltage Zap -> Glitch Disintegration
   */
  playEnergyDeath() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;

    // 1. High Frequency Electrical Zap (Descending FM Sweep)
    const zapOsc = this.ctx.createOscillator();
    const zapGain = this.ctx.createGain();
    zapOsc.type = 'sawtooth';
    zapOsc.frequency.setValueAtTime(1400, now);
    zapOsc.frequency.exponentialRampToValueAtTime(80, now + 0.32);

    const zapFilter = this.ctx.createBiquadFilter();
    zapFilter.type = 'bandpass';
    zapFilter.frequency.setValueAtTime(2200, now);
    zapFilter.frequency.exponentialRampToValueAtTime(400, now + 0.32);
    zapFilter.Q.setValueAtTime(4.0, now);

    zapGain.gain.setValueAtTime(0.5 * CONFIG.AUDIO.SFX_VOLUME, now);
    zapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    zapOsc.connect(zapFilter);
    zapFilter.connect(zapGain);
    zapGain.connect(this.sfxGain);
    zapOsc.start(now);
    zapOsc.stop(now + 0.36);

    // 2. Glitch Pulse Arcs
    const glitchOsc = this.ctx.createOscillator();
    const glitchGain = this.ctx.createGain();
    glitchOsc.type = 'square';
    glitchOsc.frequency.setValueAtTime(220, now);
    glitchOsc.frequency.setValueAtTime(880, now + 0.08);
    glitchOsc.frequency.setValueAtTime(330, now + 0.16);
    glitchOsc.frequency.setValueAtTime(110, now + 0.24);

    glitchGain.gain.setValueAtTime(0.3 * CONFIG.AUDIO.SFX_VOLUME, now);
    glitchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    glitchOsc.connect(glitchGain);
    glitchGain.connect(this.sfxGain);
    glitchOsc.start(now);
    glitchOsc.stop(now + 0.42);
  }

  /**
   * Missile Direct Hit: Massive Sub-Bass Blast & Shatter Crunch
   */
  playMissileDirectHit() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;

    // 1. Sub-Bass Punch
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(120, now);
    subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.45);

    subGain.gain.setValueAtTime(0.7 * CONFIG.AUDIO.SFX_VOLUME, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 0.52);

    // 2. Dual Noise Blast
    const blastSize = Math.floor(this.ctx.sampleRate * 0.55);
    const blastBuffer = this.ctx.createBuffer(1, blastSize, this.ctx.sampleRate);
    const blastData = blastBuffer.getChannelData(0);
    for (let i = 0; i < blastSize; i++) blastData[i] = Math.random() * 2 - 1;

    const blastSource = this.ctx.createBufferSource();
    blastSource.buffer = blastBuffer;

    const blastFilter = this.ctx.createBiquadFilter();
    blastFilter.type = 'lowpass';
    blastFilter.frequency.setValueAtTime(2000, now);
    blastFilter.frequency.exponentialRampToValueAtTime(60, now + 0.55);

    const blastGain = this.ctx.createGain();
    blastGain.gain.setValueAtTime(0.65 * CONFIG.AUDIO.SFX_VOLUME, now);
    blastGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    blastSource.connect(blastFilter);
    blastFilter.connect(blastGain);
    blastGain.connect(this.sfxGain);
    blastSource.start(now);
    blastSource.stop(now + 0.58);
  }

  playScoreDing() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
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

  // =========================================================================
  // INTERACTIVE 3D TUTORIAL / TRAINING SIMULATION SOUNDS
  // =========================================================================

  /**
   * High-tech step progression chime.
   */
  playTutorialStep() {
    if (this.isMuted || !this.ctx) return;
    this.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    gain.gain.setValueAtTime(0.25 * CONFIG.AUDIO.SFX_VOLUME, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * Ascending harmonic confirmation chime (C-E-G triad).
   */
  playTutorialSuccess() {
    if (this.isMuted || !this.ctx) return;
    this.resume();
    const now = this.ctx.currentTime;
    const triad = [523.25, 659.25, 783.99]; // C5, E5, G5

    triad.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.06;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.24 * CONFIG.AUDIO.SFX_VOLUME, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  /**
   * Gentle holographic glitch / rewind on training mistake.
   */
  playTutorialGlitch() {
    if (this.isMuted || !this.ctx) return;
    this.resume();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.linearRampToValueAtTime(120, now + 0.15);

    gain.gain.setValueAtTime(0.18 * CONFIG.AUDIO.SFX_VOLUME, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Resonant hyper-drive simulation completion chord + sub-bass pulse.
   */
  playTutorialComplete() {
    if (this.isMuted || !this.ctx) return;
    this.resume();
    const now = this.ctx.currentTime;
    const freqs = [329.63, 493.88, 659.25, 987.77]; // E major 7th

    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.07;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.6);

      gain.gain.setValueAtTime(0.22 * CONFIG.AUDIO.SFX_VOLUME, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.85);
    });

    // Sub-bass sweep
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(140, now);
    sub.frequency.exponentialRampToValueAtTime(40, now + 0.7);

    subGain.gain.setValueAtTime(0.35 * CONFIG.AUDIO.SFX_VOLUME, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(now);
    sub.stop(now + 0.75);
  }

  /**
   * Triumphant Victory Arpeggio when the player scores a NEW PERSONAL BEST.
   */
  playNewPersonalBest() {
    if (this.isMuted || !this.ctx) return;
    this.resume();
    const now = this.ctx.currentTime;
    const arpeggio = [440, 554.37, 659.25, 880, 1108.73]; // A major triumphant run

    arpeggio.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.07;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.3 * CONFIG.AUDIO.SFX_VOLUME, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  /**
   * Safe Resume Countdown Audio Cue (3, 2, 1, GO!)
   */
  playCountdownTick(isFinal = false) {
    if (this.isMuted || !this.ctx) return;
    this.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isFinal ? 'triangle' : 'sine';
    const freq = isFinal ? 880 : 520;
    osc.frequency.setValueAtTime(freq, now);
    if (isFinal) {
      osc.frequency.exponentialRampToValueAtTime(1040, now + 0.22);
    }

    const vol = (isFinal ? 0.35 : 0.22) * CONFIG.AUDIO.SFX_VOLUME;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinal ? 0.28 : 0.16));

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + (isFinal ? 0.3 : 0.18));
  }
}

export const audio = new SoundEngine();

