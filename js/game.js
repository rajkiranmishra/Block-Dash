/**
 * ==============================================================================
 * BLOCK DASH - Core Game Engine
 * "One button. One endless level. No excuses."
 *
 * Advanced Gameplay Systems:
 * - Space Interceptor Hunter Drone Encounter & Predictive Targeting
 * - Multi-Variant Missiles (Ground, High Laser, Tracking)
 * - Missile vs World Emergent Obstacle Demolition (+150 Bonus)
 * - Event Director with Spawning Safety & Recovery Breather Windows
 * - 3D Starfield Warp & Hyperspace Camera Projection
 * - Delta-Time Euler Physics, Jump, Squash/Slide & Dash Burst
 * - Constraint-Aware Procedural Generation & Multi-Mechanic Fairness
 * - AABB Collision Detection with Coyote Insets
 * ==============================================================================
 */

import { CONFIG } from './config.js';
import { storage } from './storage.js';
import { audio } from './audio.js';
import { roastEngine } from './roast.js';
import { leaderboard, records } from './leaderboard.js';
import { InputManager, InputActions } from './input.js';

// --- Game State Enum ---
export const GameState = Object.freeze({
  INTRO_IDLE: 'INTRO_IDLE',
  INTRO_WARP: 'INTRO_WARP',
  INTRO_SLAM: 'INTRO_SLAM',
  MENU: 'MENU',
  TUTORIAL: 'TUTORIAL',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  DEAD: 'DEAD',
});

// --- Space Interceptor State Enum ---
export const InterceptorState = Object.freeze({
  INACTIVE: 'INACTIVE',
  APPROACHING: 'APPROACHING',
  TARGETING: 'TARGETING',
  LOCKED: 'LOCKED',
  FIRING: 'FIRING',
  MISSILE_ACTIVE: 'MISSILE_ACTIVE',
  ESCAPING: 'ESCAPING',
  COOLDOWN: 'COOLDOWN',
});

class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Centralized Input Manager
    this.inputManager = new InputManager();

    // Internal logical coordinate system (16:9)
    this.virtualWidth = CONFIG.CANVAS.WIDTH;
    this.virtualHeight = CONFIG.CANVAS.HEIGHT;
    this.groundY = CONFIG.CANVAS.GROUND_Y;
    this.scale = 1;
    this.dpr = window.devicePixelRatio || 1;

    // State & Timing
    this.state = GameState.INTRO_IDLE;
    this.lastTime = 0;
    this.deltaTime = 0;
    this.sessionAttempts = 0;
    this.demolitionCount = 0;
    this.isOrientationPaused = false;

    // Intro Cinematic Variables
    this.introTimer = 0;
    this.introCube = {
      x: this.virtualWidth / 2,
      y: this.virtualHeight / 2 - 20,
      z: 0.05,
      size: 40,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      scale: 0.05,
      opacity: 0,
    };

    // 3D Starfield Array
    this.warpStars = [];
    this.numWarpStars = this.inputManager.isMobile() ? 65 : 120;

    // Per-Run Telemetry & Metrics
    this.score = 0;
    this.distance = 0;
    this.currentSpeed = CONFIG.SPEED.INITIAL;
    this.survivalTime = 0;
    this.obstacleCounter = 0;
    this.lastKillerType = 'single-spike';
    this.lastMissileVariant = null;
    this.lastMilestone = 0;

    // --- Interactive 3D Holographic Training Simulation State ---
    this.tutorial = {
      active: false,
      isReplay: false,
      step: 0, // 0: BOOT, 1: JUMP, 2: SQUASH, 3: DASH, 4: COMBO, 5: COMPLETE
      stepTimer: 0,
      directive: '',
      tip: '',
      subState: 'APPROACH', // 'APPROACH', 'CLEAR', 'REWIND', 'ADVANCE'
      rewindTimer: 0,
      successTimer: 0,
      simGridZ: 0,
      glitchAlpha: 0,
      dematerializeAlpha: 0,
      trainingObstacles: [],
    };

    // Player Entity
    this.player = {
      x: CONFIG.PLAYER.START_X,
      y: CONFIG.PLAYER.START_Y,
      w: CONFIG.PLAYER.WIDTH,
      h: CONFIG.PLAYER.HEIGHT,
      vy: 0,
      rotation: 0,
      isGrounded: true,
      isSquashing: false,
      wantsToUnsquash: false,
      isDashing: false,
      dashTimer: 0,
      dashCooldownTimer: 0,
      trail: [],
    };

    // --- Space Interceptor & Event Director ---
    this.interceptor = {
      state: InterceptorState.INACTIVE,
      x: this.virtualWidth + 100,
      y: 120,
      targetX: 740,
      targetY: 160,
      w: 68,
      h: 32,
      timer: 0,
      beepTimer: 0,
      beepInterval: 0.38,
      missileType: 'ground',
      aimX: 0,
      aimY: 0,
      isLocked: false,
      thrusterPulse: 0,
    };

    this.eventDirector = {
      cooldownTimer: CONFIG.INTERCEPTOR.EVENT_COOLDOWN_BASE,
      recoveryTimer: 0,
      isEventActive: false,
      encounterCount: 0,
    };

    this.missiles = [];
    this.floatingTexts = [];

    // World & Environment
    this.obstacles = [];
    this.particles = [];
    this.groundOffset = 0;
    this.nextSpawnX = this.virtualWidth + 140;

    // Screen Shake
    this.shakeTime = 0;
    this.shakeDuration = 0;
    this.shakeIntensity = 0;

    // Jump Trajectory Math
    this.jumpRiseTime = -CONFIG.PLAYER.JUMP_FORCE / CONFIG.PLAYER.GRAVITY;
    this.jumpMaxHeight = (CONFIG.PLAYER.JUMP_FORCE ** 2) / (2 * CONFIG.PLAYER.GRAVITY);
    this.jumpAirTime = 2 * this.jumpRiseTime;

    // Input Action Tracker
    this.inputs = {
      jump: false,
      squash: false,
      dash: false,
    };

    // DOM UI Elements Cache
    this.dom = {
      hud: document.getElementById('game-hud'),
      hudScore: document.getElementById('hud-score'),
      hudPb: document.getElementById('hud-pb'),
      hudSpeedFill: document.getElementById('hud-speed-fill'),
      hudDashFill: document.getElementById('hud-dash-fill'),
      touchDashZone: document.getElementById('touch-dash-zone'),
      dashCircleFill: document.getElementById('dash-circle-fill'),
      rotatePrompt: document.getElementById('rotate-prompt'),
      introPrompt: document.querySelector('.intro-prompt'),
      tutorialHud: document.getElementById('tutorial-hud'),
      tutorialStepTag: document.getElementById('tutorial-step-tag'),
      tutorialDirective: document.getElementById('tutorial-directive'),
      tutorialTip: document.getElementById('tutorial-tip'),
      btnSkipTutorial: document.getElementById('btn-skip-tutorial'),
      introOverlay: document.getElementById('intro-overlay'),
      menuOverlay: document.getElementById('menu-overlay'),
      settingsOverlay: document.getElementById('settings-overlay'),
      pauseOverlay: document.getElementById('pause-overlay'),
      deathOverlay: document.getElementById('death-overlay'),
      recordsOverlay: document.getElementById('records-overlay'),
      newPbBanner: document.getElementById('new-pb-banner'),
      deathScore: document.getElementById('death-score'),
      deathPb: document.getElementById('death-pb'),
      deathAttempts: document.getElementById('death-attempts'),
      roastCat: document.getElementById('roast-cat'),
      roastMsg: document.getElementById('roast-msg'),
      memeBadge: document.getElementById('meme-badge'),
      memeText: document.getElementById('meme-text'),
      recPb: document.getElementById('rec-pb'),
      recAttempts: document.getElementById('rec-attempts'),
      recSurvival: document.getElementById('rec-survival'),
      recDemolitions: document.getElementById('rec-demolitions'),
      playerNameInput: document.getElementById('player-name-input'),
      btnSaveName: document.getElementById('btn-save-name'),
      scanlineLayer: document.getElementById('scanline-layer'),
      audioIconWaves: document.getElementById('audio-icon-waves'),
      sliderMasterVol: document.getElementById('slider-master-vol'),
      sliderMusicVol: document.getElementById('slider-music-vol'),
      sliderSfxVol: document.getElementById('slider-sfx-vol'),
      btnResetTutorial: document.getElementById('btn-reset-tutorial'),
    };

    this.init();
  }

  /**
   * Initializes canvas, generates 3D stars, binds action inputs, and starts loop.
   */
  init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.checkOrientation();
    });
    window.addEventListener('orientationchange', () => {
      this.resizeCanvas();
      this.checkOrientation();
    });

    for (let i = 0; i < this.numWarpStars; i++) {
      this.warpStars.push({
        x: (Math.random() - 0.5) * this.virtualWidth * 2,
        y: (Math.random() - 0.5) * this.virtualHeight * 2,
        z: Math.random() * 1000 + 10,
        origZ: Math.random() * 1000 + 10,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.7 + 0.3
      });
    }

    this.bindActionInputs();
    this.bindUIButtons();

    this.inputManager.onModeChange((mode) => {
      this.handleUIModeChange(mode);
    });
    this.handleUIModeChange(this.inputManager.uiMode);

    this.dom.hudPb.textContent = storage.getBestScore();
    this.dom.playerNameInput.value = storage.getPlayerName();

    this.setState(GameState.INTRO_IDLE);

    requestAnimationFrame((time) => this.loop(time));
  }

  handleUIModeChange(mode) {
    if (this.dom.introPrompt) {
      this.dom.introPrompt.textContent = mode === 'mobile' ? '[ TAP TO ENTER ]' : '[ CLICK TO ENTER ]';
    }
    if (this.state === GameState.TUTORIAL) {
      this.updateTutorialDirectiveText();
    }
  }

  checkOrientation() {
    if (typeof window === 'undefined') return;
    const isPortrait = window.innerHeight > window.innerWidth;
    const isMobile = this.inputManager.isMobile();

    if (isMobile && isPortrait && (this.state === GameState.PLAYING || this.state === GameState.TUTORIAL)) {
      if (!this.isOrientationPaused) {
        this.isOrientationPaused = true;
        if (this.dom.rotatePrompt) {
          this.dom.rotatePrompt.classList.remove('hidden');
        }
      }
    } else {
      if (this.isOrientationPaused) {
        this.isOrientationPaused = false;
        if (this.dom.rotatePrompt) {
          this.dom.rotatePrompt.classList.add('hidden');
        }
        this.resizeCanvas();
      }
    }
  }

  resizeCanvas() {
    const wrapper = document.getElementById('game-wrapper');
    const rect = wrapper.getBoundingClientRect();

    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.virtualWidth * this.dpr;
    this.canvas.height = this.virtualHeight * this.dpr;

    this.scale = rect.width / this.virtualWidth;
    this.ctx.resetTransform();
    this.ctx.scale(this.dpr, this.dpr);
  }

  /**
   * Finite State Machine Manager
   */
  setState(newState) {
    if (this.state === newState) return;
    this.state = newState;

    this.dom.introOverlay.classList.add('hidden');
    this.dom.menuOverlay.classList.add('hidden');
    this.dom.settingsOverlay.classList.add('hidden');
    this.dom.pauseOverlay.classList.add('hidden');
    this.dom.deathOverlay.classList.add('hidden');
    this.dom.recordsOverlay.classList.add('hidden');
    this.dom.tutorialHud.classList.add('hidden');
    this.dom.hud.classList.add('hidden');

    switch (newState) {
      case GameState.INTRO_IDLE:
        this.dom.introOverlay.classList.remove('hidden');
        this.resetRun();
        break;

      case GameState.INTRO_WARP:
        this.introTimer = 0;
        break;

      case GameState.INTRO_SLAM:
        break;

      case GameState.MENU:
        this.dom.menuOverlay.classList.remove('hidden');
        this.resetRun();
        break;

      case GameState.TUTORIAL:
        this.dom.tutorialHud.classList.remove('hidden');
        break;

      case GameState.PLAYING:
        this.dom.hud.classList.remove('hidden');
        break;

      case GameState.PAUSED:
        this.dom.hud.classList.remove('hidden');
        this.dom.pauseOverlay.classList.remove('hidden');
        break;

      case GameState.DEAD:
        this.dom.hud.classList.remove('hidden');
        this.dom.deathOverlay.classList.remove('hidden');
        this.handleDeath();
        break;
    }
  }

  startCinematicEntrance() {
    audio.init();
    audio.playCinematicBoom();
    audio.startThemeMusic();
    this.setState(GameState.INTRO_WARP);
  }

  /**
   * Centralized Run Reset System: 100% clean state reinitialization
   */
  resetRun() {
    this.player.x = CONFIG.PLAYER.START_X;
    this.player.w = CONFIG.PLAYER.WIDTH;
    this.player.h = CONFIG.PLAYER.HEIGHT;
    this.player.y = this.groundY - CONFIG.PLAYER.HEIGHT;
    this.player.vy = 0;
    this.player.rotation = 0;
    this.player.isGrounded = true;
    this.player.isSquashing = false;
    this.player.wantsToUnsquash = false;
    this.player.isDashing = false;
    this.player.dashTimer = 0;
    this.player.dashCooldownTimer = 0;
    this.player.trail = [];

    // Reset Interceptor & Missiles
    this.interceptor.state = InterceptorState.INACTIVE;
    this.interceptor.x = this.virtualWidth + 120;
    this.interceptor.y = 120;
    this.interceptor.timer = 0;
    this.interceptor.isLocked = false;
    this.missiles = [];
    this.floatingTexts = [];

    this.eventDirector.cooldownTimer = CONFIG.INTERCEPTOR.EVENT_COOLDOWN_BASE;
    this.eventDirector.recoveryTimer = 0;
    this.eventDirector.isEventActive = false;

    this.obstacles = [];
    this.particles = [];
    this.groundOffset = 0;
    this.nextSpawnX = this.virtualWidth + 140;

    this.score = 0;
    this.distance = 0;
    this.survivalTime = 0;
    this.obstacleCounter = 0;
    this.currentSpeed = CONFIG.SPEED.INITIAL;
    this.lastMilestone = 0;
    this.lastMissileVariant = null;
    this.shakeTime = 0;
    this.shakeDuration = 0;

    this.dom.hudScore.textContent = '0';
    this.dom.hudPb.textContent = storage.getBestScore();
    this.dom.hudSpeedFill.style.width = '10%';
    this.dom.hudDashFill.style.width = '100%';
    this.dom.hudDashFill.className = 'dash-fill ready';

    if (this.dom.touchDashZone) {
      this.dom.touchDashZone.classList.remove('cooldown');
      this.dom.touchDashZone.classList.add('ready');
    }
    if (this.dom.dashCircleFill) {
      this.dom.dashCircleFill.setAttribute('stroke-dasharray', '100, 100');
    }
  }

  startNewRun() {
    audio.init();
    this.sessionAttempts++;
    storage.incrementAttempts();
    this.resetRun();
    this.setState(GameState.PLAYING);
    this.executeJumpImpulse();
  }

  handlePlayClick() {
    audio.init();
    audio.playClick();
    if (!storage.hasSeenTutorial()) {
      this.startTutorial(false);
    } else {
      this.startNewRun();
    }
  }

  triggerJump() {
    audio.init();

    if (this.state === GameState.INTRO_IDLE) {
      this.startCinematicEntrance();
      return;
    }

    if (this.state === GameState.MENU) {
      this.handlePlayClick();
      return;
    }

    if (this.state === GameState.DEAD) {
      this.startNewRun();
      return;
    }

    if (this.state === GameState.PLAYING || this.state === GameState.TUTORIAL) {
      this.executeJumpImpulse();
    }
  }

  executeJumpImpulse() {
    if (this.player.isSquashing) return;
    if (!this.player.isGrounded) return;

    this.player.vy = CONFIG.PLAYER.JUMP_FORCE;
    this.player.isGrounded = false;
    audio.playJump();

    this.addScreenShake(CONFIG.VISUALS.SHAKE_INTENSITY_JUMP, CONFIG.VISUALS.SHAKE_DURATION_JUMP);

    for (let i = 0; i < CONFIG.VISUALS.PARTICLE_COUNT_JUMP; i++) {
      this.particles.push({
        x: this.player.x + Math.random() * this.player.w,
        y: this.groundY - 2,
        vx: (Math.random() - 0.7) * 90 - 40,
        vy: -Math.random() * 80 - 20,
        size: Math.random() * 4 + 2,
        color: CONFIG.COLORS.PLAYER,
        alpha: 1,
        life: 0.25,
        maxLife: 0.25
      });
    }
  }

  startSquash() {
    if (this.state !== GameState.PLAYING && this.state !== GameState.TUTORIAL) return;
    if (this.player.isSquashing) return;

    this.player.isSquashing = true;
    this.player.wantsToUnsquash = false;
    audio.playSquash();

    this.player.h = CONFIG.PLAYER.SQUASH_HEIGHT;
    this.player.w = CONFIG.PLAYER.SQUASH_WIDTH;

    if (this.player.isGrounded) {
      this.player.y = this.groundY - this.player.h;
    }

    for (let i = 0; i < CONFIG.VISUALS.PARTICLE_COUNT_SQUASH; i++) {
      this.particles.push({
        x: this.player.x + Math.random() * this.player.w,
        y: this.groundY - 2,
        vx: (Math.random() - 0.9) * 120 - 30,
        vy: -Math.random() * 40 - 10,
        size: Math.random() * 3 + 2,
        color: CONFIG.COLORS.PLAYER,
        alpha: 0.8,
        life: 0.2,
        maxLife: 0.2
      });
    }
  }

  endSquash() {
    if (!this.player.isSquashing) return;

    if (this.hasOverheadObstacle()) {
      this.player.wantsToUnsquash = true;
      return;
    }

    this.performSafeUnsquash();
  }

  hasOverheadObstacle() {
    const normalH = CONFIG.PLAYER.HEIGHT;
    const normalW = CONFIG.PLAYER.WIDTH;
    const testY = this.groundY - normalH;
    const testX = this.player.x;

    for (const obs of this.obstacles) {
      if (
        testX < obs.x + obs.w &&
        testX + normalW > obs.x &&
        testY < obs.y + obs.h &&
        testY + normalH > obs.y
      ) {
        return true;
      }
    }
    return false;
  }

  performSafeUnsquash() {
    this.player.isSquashing = false;
    this.player.wantsToUnsquash = false;
    this.player.h = CONFIG.PLAYER.HEIGHT;
    this.player.w = CONFIG.PLAYER.WIDTH;

    if (this.player.isGrounded) {
      this.player.y = this.groundY - this.player.h;
    }
  }

  triggerDash() {
    if (this.state !== GameState.PLAYING && this.state !== GameState.TUTORIAL) return;
    if (this.player.isDashing || this.player.dashCooldownTimer > 0) return;

    this.player.isDashing = true;
    this.player.dashTimer = CONFIG.DASH.DURATION;
    this.player.dashCooldownTimer = CONFIG.DASH.COOLDOWN;
    audio.playDash();

    this.addScreenShake(CONFIG.VISUALS.SHAKE_INTENSITY_DASH, CONFIG.VISUALS.SHAKE_DURATION_DASH);

    for (let i = 0; i < CONFIG.VISUALS.PARTICLE_COUNT_DASH; i++) {
      this.particles.push({
        x: this.player.x - 5,
        y: this.player.y + Math.random() * this.player.h,
        vx: -Math.random() * 280 - 100,
        vy: (Math.random() - 0.5) * 60,
        size: Math.random() * 5 + 3,
        color: CONFIG.COLORS.ACCENT_CYAN,
        alpha: 1,
        life: 0.35,
        maxLife: 0.35
      });
    }
  }

  addScreenShake(intensity, duration) {
    const scale = (this.inputManager && this.inputManager.isMobile()) ? 0.65 : 1.0;
    this.shakeIntensity = intensity * scale;
    this.shakeDuration = duration;
    this.shakeTime = duration;
  }

  async handleDeath() {
    audio.playDeath();
    this.addScreenShake(CONFIG.VISUALS.SHAKE_INTENSITY_DEATH, CONFIG.VISUALS.SHAKE_DURATION_DEATH);

    for (let i = 0; i < CONFIG.VISUALS.PARTICLE_COUNT_DEATH; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 320 + 80;
      this.particles.push({
        x: this.player.x + this.player.w / 2,
        y: this.player.y + this.player.h / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        size: Math.random() * 8 + 4,
        color: Math.random() > 0.4 ? CONFIG.COLORS.PLAYER : CONFIG.COLORS.HAZARD_SPIKE,
        alpha: 1,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 720,
        life: 0.8,
        maxLife: 0.8
      });
    }

    const finalScore = Math.floor(this.score);
    const pbBefore = storage.getBestScore();
    const result = await leaderboard.submitScore(finalScore, this.survivalTime);
    const totalAttempts = storage.getAttempts();

    if (result.isNewPB) {
      audio.playNewPersonalBest();
      this.dom.newPbBanner.classList.remove('hidden');
    } else {
      this.dom.newPbBanner.classList.add('hidden');
    }

    const roast = roastEngine.generateRoast({
      score: finalScore,
      personalBest: pbBefore,
      isNewPB: result.isNewPB,
      survivalTime: this.survivalTime,
      obstacleIndex: this.obstacleCounter,
      killerType: this.lastKillerType,
      missileVariant: this.lastMissileVariant,
      wasDashing: this.player.isDashing,
      wasSquashing: this.player.isSquashing,
      attemptNumber: totalAttempts
    });

    this.dom.deathScore.textContent = finalScore.toLocaleString();
    this.dom.deathPb.textContent = result.pb.toLocaleString();
    this.dom.deathAttempts.textContent = totalAttempts.toLocaleString();
    this.dom.hudPb.textContent = result.pb.toLocaleString();
    this.dom.roastCat.textContent = roast.category;
    this.dom.roastMsg.textContent = `"${roast.text}"`;

    if (roast.meme) {
      this.dom.memeBadge.classList.remove('hidden');
      this.dom.memeText.textContent = roast.meme;
    } else {
      this.dom.memeBadge.classList.add('hidden');
    }
  }

  /**
   * ============================================================================
   * SPACE INTERCEPTOR ENCOUNTER & EVENT DIRECTOR
   * ============================================================================
   */
  updateEventDirector(dt) {
    // 1. Manage Cooldown & Recovery
    if (this.eventDirector.recoveryTimer > 0) {
      this.eventDirector.recoveryTimer -= dt;
    }

    if (!this.eventDirector.isEventActive) {
      this.eventDirector.cooldownTimer -= dt;

      // Check encounter eligibility
      if (
        this.score >= CONFIG.INTERCEPTOR.MIN_SCORE_FOR_EVENT &&
        this.eventDirector.cooldownTimer <= 0 &&
        this.eventDirector.recoveryTimer <= 0
      ) {
        this.triggerInterceptorEncounter();
      }
    }

    // 2. Interceptor State Machine
    this.updateInterceptor(dt);
    this.updateMissiles(dt);
  }

  triggerInterceptorEncounter() {
    this.eventDirector.isEventActive = true;
    this.eventDirector.encounterCount++;
    const jet = this.interceptor;

    jet.state = InterceptorState.APPROACHING;
    jet.x = this.virtualWidth + 120;
    jet.y = 80;
    jet.timer = 0;
    jet.isLocked = false;

    // Pick missile variant based on progression
    if (this.score < 900) {
      jet.missileType = 'ground'; // Early encounter: ground missile (teaches JUMP)
    } else if (this.score < 1800) {
      jet.missileType = Math.random() > 0.4 ? 'high' : 'ground'; // Teaches SQUASH
    } else {
      const variants = ['ground', 'high', 'tracking'];
      jet.missileType = variants[Math.floor(Math.random() * variants.length)];
    }

    audio.playJetFlyby();
  }

  updateInterceptor(dt) {
    const jet = this.interceptor;
    if (jet.state === InterceptorState.INACTIVE) return;

    jet.timer += dt;
    jet.thrusterPulse = (jet.thrusterPulse + dt * 12) % (Math.PI * 2);

    switch (jet.state) {
      case InterceptorState.APPROACHING: {
        // Fly smoothly in from top-right towards hover station
        const progress = Math.min(1, jet.timer / CONFIG.INTERCEPTOR.APPROACH_DURATION);
        jet.x = (this.virtualWidth + 120) + (jet.targetX - (this.virtualWidth + 120)) * Math.sin(progress * Math.PI * 0.5);
        jet.y = 80 + (jet.targetY - 80) * Math.sin(progress * Math.PI * 0.5);

        if (progress >= 1) {
          jet.state = InterceptorState.TARGETING;
          jet.timer = 0;
          jet.beepTimer = 0;
          jet.beepInterval = 0.42;
        }
        break;
      }

      case InterceptorState.TARGETING: {
        // Hover and predict player position
        jet.y = jet.targetY + Math.sin(jet.timer * 4) * 8;

        // Predictive Targeting Calculation:
        // Aim point depends on missile type
        if (jet.missileType === 'ground') {
          jet.aimX = this.player.x + 30;
          jet.aimY = this.groundY - 18; // Skims floor -> Must Jump
        } else if (jet.missileType === 'high') {
          jet.aimX = this.player.x + 30;
          jet.aimY = this.groundY - 36; // Head-height -> Must Squash
        } else {
          // Tracking: aims at dynamic player centroid
          jet.aimX = this.player.x + 20;
          jet.aimY = this.player.y + this.player.h / 2;
        }

        // Radar Beeping cadence accelerates as lock approaches
        jet.beepTimer += dt;
        if (jet.beepTimer >= jet.beepInterval) {
          jet.beepTimer = 0;
          const progress = jet.timer / CONFIG.INTERCEPTOR.TARGETING_DURATION;
          jet.beepInterval = Math.max(0.12, 0.42 - progress * 0.3);
          const freq = 750 + progress * 550;
          audio.playTargetBeep(freq, false);
        }

        if (jet.timer >= CONFIG.INTERCEPTOR.TARGETING_DURATION) {
          jet.state = InterceptorState.LOCKED;
          jet.timer = 0;
          jet.isLocked = true;
          audio.playTargetBeep(1480, true); // Solid lock tone
        }
        break;
      }

      case InterceptorState.LOCKED: {
        // Final locked hold right before firing
        jet.y = jet.targetY + Math.sin(jet.timer * 4) * 6;

        if (jet.timer >= CONFIG.INTERCEPTOR.LOCKED_DURATION) {
          this.fireMissile();
          jet.state = InterceptorState.FIRING;
          jet.timer = 0;
        }
        break;
      }

      case InterceptorState.FIRING: {
        // Recoil kickback on launch
        jet.x = jet.targetX + Math.sin(jet.timer * Math.PI) * 15;

        if (jet.timer >= 0.3) {
          jet.state = InterceptorState.ESCAPING;
          jet.timer = 0;
          audio.playJetFlyby();
        }
        break;
      }

      case InterceptorState.ESCAPING: {
        // Hyper-drive acceleration off the top-left/top-right
        const progress = Math.min(1, jet.timer / CONFIG.INTERCEPTOR.ESCAPE_DURATION);
        jet.x += dt * 700;
        jet.y -= dt * 350;

        // Exhaust plume particles
        if (Math.random() < 0.7) {
          this.particles.push({
            x: jet.x - 20,
            y: jet.y + jet.h / 2,
            vx: -Math.random() * 300 - 150,
            vy: (Math.random() - 0.5) * 50,
            size: Math.random() * 6 + 3,
            color: CONFIG.COLORS.INTERCEPTOR_THRUST,
            alpha: 1,
            life: 0.3,
            maxLife: 0.3
          });
        }

        if (progress >= 1 || jet.x > this.virtualWidth + 200) {
          jet.state = InterceptorState.COOLDOWN;
          this.eventDirector.isEventActive = false;
          this.eventDirector.cooldownTimer = CONFIG.INTERCEPTOR.EVENT_COOLDOWN_BASE;
          this.eventDirector.recoveryTimer = CONFIG.INTERCEPTOR.RECOVERY_WINDOW;
        }
        break;
      }

      case InterceptorState.COOLDOWN: {
        jet.state = InterceptorState.INACTIVE;
        break;
      }
    }
  }

  fireMissile() {
    const jet = this.interceptor;
    audio.playMissileLaunch();
    this.addScreenShake(3, 0.1);

    // Calculate initial velocity vector towards locked aim point
    const startX = jet.x - 10;
    const startY = jet.y + jet.h / 2;

    const dx = jet.aimX - startX;
    const dy = jet.aimY - startY;
    const angle = Math.atan2(dy, dx);

    const speed = CONFIG.INTERCEPTOR.MISSILE_SPEED;

    this.missiles.push({
      x: startX,
      y: startY,
      w: 32,
      h: 12,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      type: jet.missileType,
      targetY: jet.aimY,
      angle: angle,
      trackingTimer: 0.45,
      active: true,
      lifetime: 3.5,
    });
  }

  updateMissiles(dt) {
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.lifetime -= dt;

      // Tracking steering (limited homing)
      if (m.type === 'tracking' && m.trackingTimer > 0) {
        m.trackingTimer -= dt;
        const desiredDy = (this.player.y + this.player.h / 2) - m.y;
        m.vy += Math.sign(desiredDy) * 450 * dt;
        m.angle = Math.atan2(m.vy, m.vx);
      }

      m.x += m.vx * dt;
      m.y += m.vy * dt;

      // Spawn Missile Flame Trail
      if (Math.random() < 0.8) {
        this.particles.push({
          x: m.x + m.w,
          y: m.y + m.h / 2,
          vx: Math.random() * 80 + 40,
          vy: (Math.random() - 0.5) * 30,
          size: Math.random() * 4 + 2,
          color: Math.random() > 0.4 ? CONFIG.COLORS.HAZARD_SPIKE : '#ffaa00',
          alpha: 1,
          life: 0.2,
          maxLife: 0.2
        });
      }

      // --- 1. Collision with Player ---
      const pad = CONFIG.INTERCEPTOR.MISSILE_HITBOX_PADDING;
      const mx = m.x + pad;
      const my = m.y + pad;
      const mw = m.w - pad * 2;
      const mh = m.h - pad * 2;

      const px = this.player.x + CONFIG.PLAYER.HITBOX_PADDING;
      const py = this.player.y + CONFIG.PLAYER.HITBOX_PADDING;
      const pw = this.player.w - CONFIG.PLAYER.HITBOX_PADDING * 2;
      const ph = this.player.h - CONFIG.PLAYER.HITBOX_PADDING * 2;

      if (px < mx + mw && px + pw > mx && py < my + mh && py + ph > my) {
        this.lastKillerType = 'interceptor-missile';
        this.lastMissileVariant = m.type;
        this.explodeMissile(m);
        this.missiles.splice(i, 1);
        this.setState(GameState.DEAD);
        return;
      }

      // --- 2. Missile vs World (Emergent Obstacle Demolition) ---
      let hitObstacle = false;
      for (let j = this.obstacles.length - 1; j >= 0; j--) {
        const obs = this.obstacles[j];
        if (
          mx < obs.x + obs.w &&
          mx + mw > obs.x &&
          my < obs.y + obs.h &&
          my + mh > obs.y
        ) {
          // Obstacle Destroyed!
          this.explodeObstacle(obs);
          this.obstacles.splice(j, 1);
          hitObstacle = true;

          // Demolition Bonus & Statistics Tracking
          this.score += 150;
          this.demolitionCount++;
          storage.recordDemolition();

          this.floatingTexts.push({
            text: '+150 DEMOLITION',
            x: obs.x,
            y: obs.y - 15,
            alpha: 1,
            color: CONFIG.COLORS.ACCENT_CYAN,
            life: 0.9,
            maxLife: 0.9
          });
          break;
        }
      }

      if (hitObstacle) {
        this.explodeMissile(m);
        this.missiles.splice(i, 1);
        continue;
      }

      // Ground Impact or Off-Screen Expiry
      if (m.y + m.h >= this.groundY || m.x < -60 || m.lifetime <= 0) {
        this.explodeMissile(m);
        this.missiles.splice(i, 1);
      }
    }

    // Update Floating Demolition Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= dt * 35;
      ft.life -= dt;
      ft.alpha = Math.max(0, ft.life / ft.maxLife);
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  explodeMissile(m) {
    audio.playMissileExplosion();
    this.addScreenShake(CONFIG.VISUALS.SHAKE_INTENSITY_MISSILE, CONFIG.VISUALS.SHAKE_DURATION_MISSILE);

    for (let i = 0; i < CONFIG.VISUALS.PARTICLE_COUNT_EXPLOSION; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 240 + 60;
      this.particles.push({
        x: m.x,
        y: m.y + m.h / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        size: Math.random() * 6 + 3,
        color: Math.random() > 0.4 ? CONFIG.COLORS.HAZARD_SPIKE : '#ffcc00',
        alpha: 1,
        life: 0.45,
        maxLife: 0.45
      });
    }
  }

  explodeObstacle(obs) {
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 200 + 50;
      this.particles.push({
        x: obs.x + obs.w / 2,
        y: obs.y + obs.h / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        size: Math.random() * 5 + 3,
        color: obs.type === 'spike' ? CONFIG.COLORS.HAZARD_SPIKE : CONFIG.COLORS.HAZARD_BLOCK,
        alpha: 1,
        life: 0.5,
        maxLife: 0.5
      });
    }
  }

  /**
   * Constraint-Aware Procedural Generation (Modulates during special events)
   */
  updateProceduralGeneration() {
    // If Interceptor event is active or during recovery window, spawn sparse single hazards to avoid unfair clutter
    const isSpecialEvent = this.eventDirector.isEventActive || this.eventDirector.recoveryTimer > 0;

    while (this.nextSpawnX < this.virtualWidth + 300) {
      let pattern;
      if (isSpecialEvent) {
        // Spawn gentle breather single spike with wide gap
        pattern = this.getPatternData('single');
      } else {
        pattern = this.selectWeightedPattern();
      }

      this.spawnPattern(pattern, this.nextSpawnX);

      const minSafeGap = (this.currentSpeed * this.jumpAirTime) * 0.70 +
                         CONFIG.PLAYER.WIDTH +
                         CONFIG.OBSTACLES.SAFETY_BUFFER;

      const baseVariance = isSpecialEvent ? 320 : 240;
      const spacingVariance = Math.max(90, baseVariance - (this.score / 18));
      const nextGap = minSafeGap + Math.random() * spacingVariance;

      this.nextSpawnX += pattern.totalWidth + nextGap;
    }
  }

  selectWeightedPattern() {
    const s = this.score;

    let weights;
    if (s < 350) {
      weights = { single: 60, double: 25, block: 15, floating_bar: 0, floating_cross: 0, energy_gate: 0, step: 0, triple: 0 };
    } else if (s < 900) {
      weights = { single: 30, double: 20, block: 15, floating_bar: 20, floating_cross: 10, energy_gate: 0, step: 5, triple: 0 };
    } else if (s < 1800) {
      weights = { single: 15, double: 15, block: 15, floating_bar: 20, floating_cross: 15, energy_gate: 10, step: 10, triple: 5 };
    } else {
      weights = { single: 10, double: 15, block: 15, floating_bar: 18, floating_cross: 16, energy_gate: 12, step: 14, triple: 10 };
    }

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    let rand = Math.random() * totalWeight;

    for (const [key, weight] of Object.entries(weights)) {
      if (rand < weight) return this.getPatternData(key);
      rand -= weight;
    }

    return this.getPatternData('single');
  }

  getPatternData(key) {
    switch (key) {
      case 'double':
        return {
          type: 'double-spike',
          totalWidth: 72,
          elements: [
            { type: 'spike', xOffset: 0, w: 36, h: 36 },
            { type: 'spike', xOffset: 36, w: 36, h: 36 }
          ]
        };
      case 'triple':
        return {
          type: 'triple-spike',
          totalWidth: 108,
          elements: [
            { type: 'spike', xOffset: 0, w: 36, h: 36 },
            { type: 'spike', xOffset: 36, w: 36, h: 36 },
            { type: 'spike', xOffset: 72, w: 36, h: 36 }
          ]
        };
      case 'block':
        return {
          type: 'block',
          totalWidth: 40,
          elements: [
            { type: 'block', xOffset: 0, w: 40, h: 42 }
          ]
        };
      case 'floating_bar':
        return {
          type: 'floating-bar',
          totalWidth: 90,
          elements: [
            { type: 'floating_bar', xOffset: 0, w: 90, h: 22, yOffset: CONFIG.OBSTACLES.FLOATING_BAR_Y }
          ]
        };
      case 'floating_cross':
        return {
          type: 'floating-cross',
          totalWidth: 80,
          elements: [
            { type: 'floating_cross', xOffset: 0, w: 26, h: 26, yOffset: CONFIG.OBSTACLES.FLOATING_CROSS_Y },
            { type: 'floating_cross', xOffset: 45, w: 26, h: 26, yOffset: CONFIG.OBSTACLES.FLOATING_CROSS_Y }
          ]
        };
      case 'energy_gate':
        return {
          type: 'energy-gate',
          totalWidth: 32,
          elements: [
            { type: 'energy_gate', xOffset: 0, w: 32, h: 60, yOffset: this.groundY - 60 }
          ]
        };
      case 'step':
        return {
          type: 'step-hazard',
          totalWidth: 84,
          elements: [
            { type: 'block', xOffset: 0, w: 36, h: 32 },
            { type: 'spike', xOffset: 48, w: 36, h: 36 }
          ]
        };
      case 'single':
      default:
        return {
          type: 'single-spike',
          totalWidth: 36,
          elements: [
            { type: 'spike', xOffset: 0, w: 36, h: 36 }
          ]
        };
    }
  }

  spawnPattern(pattern, baseX) {
    this.obstacleCounter++;
    for (const el of pattern.elements) {
      const obsY = el.yOffset !== undefined
        ? el.yOffset
        : this.groundY - el.h;

      this.obstacles.push({
        x: baseX + el.xOffset,
        y: obsY,
        w: el.w,
        h: el.h,
        type: el.type,
        parentPatternType: pattern.type,
        cleared: false
      });
    }
  }

  checkCollisions() {
    const pad = CONFIG.PLAYER.HITBOX_PADDING;
    const px = this.player.x + pad;
    const py = this.player.y + pad;
    const pw = this.player.w - (pad * 2);
    const ph = this.player.h - (pad * 2);

    for (const obs of this.obstacles) {
      let obsPadX = 3;
      let obsPadY = 3;

      if (obs.type === 'spike') {
        obsPadX = 6;
        obsPadY = 6;
      } else if (obs.type === 'floating_cross') {
        obsPadX = 4;
        obsPadY = 4;
      }

      const ox = obs.x + obsPadX;
      const oy = obs.y + obsPadY;
      const ow = obs.w - (obsPadX * 2);
      const oh = obs.h - (obsPadY * 2);

      if (px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy) {
        this.lastKillerType = obs.parentPatternType || 'single-spike';
        this.setState(GameState.DEAD);
        return true;
      }
    }
    return false;
  }

  /**
   * Main Delta-Time Physics & Entity Update
   */
  update(dt) {
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
    }

    // --- INTRO CINEMATIC UPDATE ---
    if (this.state === GameState.INTRO_IDLE) {
      for (const s of this.warpStars) {
        s.z -= 15 * dt;
        if (s.z <= 1) s.z = s.origZ;
      }
      this.updateParticles(dt);
      return;
    }

    if (this.state === GameState.INTRO_WARP) {
      this.introTimer += dt;
      const warpSpeed = 1200 * (this.introTimer / 1.4);
      for (const s of this.warpStars) {
        s.z -= warpSpeed * dt;
        if (s.z <= 1) s.z = s.origZ;
      }

      this.introCube.rotX += 2.8 * dt;
      this.introCube.rotY += 3.5 * dt;
      this.introCube.rotZ += 1.8 * dt;

      if (this.introTimer < 1.2) {
        const progress = this.introTimer / 1.2;
        this.introCube.scale = 0.05 + Math.sin(progress * Math.PI * 0.5) * 1.35;
        this.introCube.opacity = Math.min(1, progress * 1.5);
      } else {
        this.setState(GameState.INTRO_SLAM);
        this.introTimer = 0;
      }

      this.updateParticles(dt);
      return;
    }

    if (this.state === GameState.INTRO_SLAM) {
      this.introTimer += dt;
      const slamDuration = 0.8;
      const progress = Math.min(1, this.introTimer / slamDuration);

      this.player.x = -60 + progress * (CONFIG.PLAYER.START_X + 60);

      const dropProgress = Math.min(1, progress * 1.4);
      this.player.y = 100 + Math.pow(dropProgress, 2) * (this.groundY - CONFIG.PLAYER.HEIGHT - 100);

      if (Math.random() < 0.8) {
        this.particles.push({
          x: this.player.x + Math.random() * this.player.w,
          y: this.player.y + Math.random() * this.player.h,
          vx: -Math.random() * 120 - 40,
          vy: (Math.random() - 0.5) * 40,
          size: Math.random() * 4 + 2,
          color: CONFIG.COLORS.PLAYER,
          alpha: 0.9,
          life: 0.35,
          maxLife: 0.35
        });
      }

      if (this.introTimer >= 0.75 && !this.introSlamTriggered) {
        this.introSlamTriggered = true;
        this.player.y = this.groundY - CONFIG.PLAYER.HEIGHT;
        this.player.x = CONFIG.PLAYER.START_X;
        audio.playSlam();
        this.addScreenShake(16, 0.45);

        for (let i = 0; i < 28; i++) {
          const angle = Math.random() * Math.PI;
          const speed = Math.random() * 260 + 60;
          this.particles.push({
            x: this.player.x + this.player.w / 2,
            y: this.groundY,
            vx: (Math.random() - 0.5) * 380,
            vy: -Math.sin(angle) * speed,
            size: Math.random() * 6 + 3,
            color: Math.random() > 0.3 ? CONFIG.COLORS.PLAYER : '#ffffff',
            alpha: 1,
            life: 0.6,
            maxLife: 0.6
          });
        }
      }

      if (this.introTimer >= 1.0) {
        this.introSlamTriggered = false;
        this.setState(GameState.MENU);
      }

      this.updateParticles(dt);
      return;
    }

    if (this.state === GameState.MENU) {
      this.updateParticles(dt);
      return;
    }

    if (this.state === GameState.TUTORIAL) {
      this.updateTutorial(dt);
      return;
    }

    if (this.state !== GameState.PLAYING) {
      this.updateParticles(dt);
      return;
    }

    this.survivalTime += dt;

    // --- Dash Timer & Cooldown Update ---
    if (this.player.isDashing) {
      this.player.dashTimer -= dt;
      if (this.player.dashTimer <= 0) {
        this.player.isDashing = false;
      }
    }

    if (this.player.dashCooldownTimer > 0) {
      const prevTimer = this.player.dashCooldownTimer;
      this.player.dashCooldownTimer = Math.max(0, this.player.dashCooldownTimer - dt);

      if (prevTimer > 0 && this.player.dashCooldownTimer === 0) {
        audio.playDashReady();
        if (this.dom.hudDashFill) this.dom.hudDashFill.className = 'dash-fill ready';
        if (this.dom.touchDashZone) {
          this.dom.touchDashZone.classList.remove('cooldown');
          this.dom.touchDashZone.classList.add('ready');
        }
      }

      const cooldownPercent = ((CONFIG.DASH.COOLDOWN - this.player.dashCooldownTimer) / CONFIG.DASH.COOLDOWN) * 100;
      if (this.dom.hudDashFill) {
        this.dom.hudDashFill.style.width = `${cooldownPercent}%`;
        if (this.player.dashCooldownTimer > 0) {
          this.dom.hudDashFill.className = 'dash-fill cooldown';
        }
      }
      if (this.dom.touchDashZone && this.player.dashCooldownTimer > 0) {
        this.dom.touchDashZone.classList.add('cooldown');
        this.dom.touchDashZone.classList.remove('ready');
      }
      if (this.dom.dashCircleFill) {
        this.dom.dashCircleFill.setAttribute('stroke-dasharray', `${Math.floor(cooldownPercent)}, 100`);
      }
    } else {
      if (this.dom.hudDashFill) {
        this.dom.hudDashFill.style.width = '100%';
        this.dom.hudDashFill.className = 'dash-fill ready';
      }
      if (this.dom.touchDashZone) {
        this.dom.touchDashZone.classList.remove('cooldown');
        this.dom.touchDashZone.classList.add('ready');
      }
      if (this.dom.dashCircleFill) {
        this.dom.dashCircleFill.setAttribute('stroke-dasharray', '100, 100');
      }
    }

    // --- Safe Unsquash Check ---
    if (this.player.wantsToUnsquash) {
      if (!this.hasOverheadObstacle()) {
        this.performSafeUnsquash();
      }
    }

    // Speed Acceleration Curve
    this.currentSpeed = CONFIG.SPEED.INITIAL +
      (CONFIG.SPEED.MAX - CONFIG.SPEED.INITIAL) * (1 - Math.exp(-this.score / 3200));

    const effectiveSpeed = this.player.isDashing
      ? this.currentSpeed * CONFIG.DASH.SPEED_MULTIPLIER
      : this.currentSpeed;

    const moveStep = effectiveSpeed * dt;
    this.distance += moveStep;
    this.score = this.distance / 12;

    const speedPercent = Math.min(100, Math.round(((this.currentSpeed - CONFIG.SPEED.INITIAL) / (CONFIG.SPEED.MAX - CONFIG.SPEED.INITIAL)) * 100));
    this.dom.hudScore.textContent = Math.floor(this.score);
    this.dom.hudSpeedFill.style.width = `${Math.max(10, speedPercent)}%`;

    const currentScoreInt = Math.floor(this.score);
    if (currentScoreInt > 0 && currentScoreInt % 500 === 0 && currentScoreInt !== this.lastMilestone) {
      this.lastMilestone = currentScoreInt;
      audio.playScoreDing();
    }

    // --- Player Physics ---
    if (!this.player.isGrounded) {
      this.player.vy += CONFIG.PLAYER.GRAVITY * dt;
      this.player.vy = Math.min(this.player.vy, CONFIG.PLAYER.MAX_FALL_SPEED);
      this.player.y += this.player.vy * dt;

      if (!this.player.isSquashing) {
        this.player.rotation += (CONFIG.PLAYER.ROTATION_SPEED * dt) * (Math.PI / 180);
      }

      if (this.player.y + this.player.h >= this.groundY) {
        this.player.y = this.groundY - this.player.h;
        this.player.vy = 0;
        this.player.isGrounded = true;
        this.player.rotation = 0;
        audio.playLand();
      }
    } else {
      this.player.y = this.groundY - this.player.h;
    }

    // Motion Trail Tracking
    this.player.trail.unshift({
      x: this.player.x,
      y: this.player.y,
      w: this.player.w,
      h: this.player.h,
      rotation: this.player.rotation,
      isDashing: this.player.isDashing,
      alpha: 0.6
    });
    if (this.player.trail.length > CONFIG.VISUALS.TRAIL_MAX_LENGTH) {
      this.player.trail.pop();
    }

    // --- Scroll Obstacles ---
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= moveStep;

      if (obs.x + obs.w < -80) {
        this.obstacles.splice(i, 1);
      }
    }
    this.nextSpawnX -= moveStep;

    this.updateProceduralGeneration();
    this.updateEventDirector(dt); // Space Interceptor Encounter Director
    this.groundOffset = (this.groundOffset + moveStep) % 40;
    this.checkCollisions();
    this.updateParticles(dt);
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += (p.vx || 0) * dt;
      p.y += (p.vy || 0) * dt;
      if (p.rotation !== undefined) {
        p.rotation += (p.rotSpeed || 0) * dt;
      }
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * ============================================================================
   * RENDERER (Canvas 2D Batch Pipeline)
   * ============================================================================
   */
  render() {
    this.ctx.save();

    if (this.shakeTime > 0) {
      const shakeProgress = this.shakeTime / this.shakeDuration;
      const curIntensity = this.shakeIntensity * shakeProgress;
      const offsetX = (Math.random() - 0.5) * 2 * curIntensity;
      const offsetY = (Math.random() - 0.5) * 2 * curIntensity;
      this.ctx.translate(offsetX, offsetY);
    }

    // 1. Dark Space Backdrop
    this.ctx.fillStyle = CONFIG.COLORS.BG_DARK;
    this.ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);

    // 2. Render 3D Starfield / Warp Effects
    if (this.state === GameState.INTRO_IDLE || this.state === GameState.INTRO_WARP) {
      this.render3DStarfield();
      if (this.state === GameState.INTRO_WARP) {
        this.render3DRotatingCube();
      }
      this.ctx.restore();
      return;
    }

    // 2b. Render Interactive 3D Tutorial Matrix
    if (this.state === GameState.TUTORIAL) {
      this.renderTutorial();
      this.ctx.restore();
      return;
    }

    // 3. Normal Star Backdrop
    this.render2DStars();

    // 4. Ground Plane
    this.renderGround();

    // 5. Obstacles
    if (this.state === GameState.PLAYING || this.state === GameState.DEAD || this.state === GameState.PAUSED) {
      this.renderObstacles();
      this.renderInterceptor();
      this.renderMissiles();
      this.renderFloatingTexts();
    }

    // 6. Particles
    this.renderParticles();

    // 7. Player Cube
    if (this.state !== GameState.DEAD) {
      this.renderPlayer();
    }

    this.ctx.restore();
  }

  render3DStarfield() {
    const cx = this.virtualWidth / 2;
    const cy = this.virtualHeight / 2;
    const fov = 320;

    for (const s of this.warpStars) {
      const k = fov / Math.max(1, s.z);
      const px = cx + s.x * k;
      const py = cy + s.y * k;

      if (px >= 0 && px < this.virtualWidth && py >= 0 && py < this.virtualHeight) {
        const starSize = Math.max(1, s.size * k * 0.8);
        const alpha = Math.min(1, Math.max(0.1, (1000 - s.z) / 1000));

        if (this.state === GameState.INTRO_WARP) {
          const prevK = fov / Math.max(1, s.z + 45);
          const ppx = cx + s.x * prevK;
          const ppy = cy + s.y * prevK;

          this.ctx.strokeStyle = `rgba(0, 245, 212, ${alpha * 0.8})`;
          this.ctx.lineWidth = starSize;
          this.ctx.beginPath();
          this.ctx.moveTo(ppx, ppy);
          this.ctx.lineTo(px, py);
          this.ctx.stroke();
        } else {
          this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * s.alpha})`;
          this.ctx.beginPath();
          this.ctx.arc(px, py, starSize / 2, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }
  }

  render3DRotatingCube() {
    const c = this.introCube;
    const cx = this.virtualWidth / 2;
    const cy = this.virtualHeight / 2;

    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.scale(c.scale, c.scale);
    this.ctx.globalAlpha = c.opacity;

    const s = c.size;

    const vertices = [
      [-s, -s, -s],
      [ s, -s, -s],
      [ s,  s, -s],
      [-s,  s, -s],
      [-s, -s,  s],
      [ s, -s,  s],
      [ s,  s,  s],
      [-s,  s,  s]
    ];

    const cosX = Math.cos(c.rotX), sinX = Math.sin(c.rotX);
    const cosY = Math.cos(c.rotY), sinY = Math.sin(c.rotY);
    const cosZ = Math.cos(c.rotZ), sinZ = Math.sin(c.rotZ);

    const proj = vertices.map(([x, y, z]) => {
      let x1 = x * cosY + z * sinY;
      let z1 = -x * sinY + z * cosY;
      let y2 = y * cosX - z1 * sinX;
      let z2 = y * sinX + z1 * cosX;
      let x3 = x1 * cosZ - y2 * sinZ;
      let y3 = x1 * sinZ + y2 * cosZ;
      return [x3, y3, z2];
    });

    const faces = [
      [0, 1, 2, 3, CONFIG.COLORS.PLAYER],
      [5, 4, 7, 6, '#ff8000'],
      [4, 0, 3, 7, '#cc6600'],
      [1, 5, 6, 2, '#ffaa33'],
      [4, 5, 1, 0, '#ffbb44'],
      [3, 2, 6, 7, '#994400'],
    ];

    faces.map(f => {
      const avgZ = (proj[f[0]][2] + proj[f[1]][2] + proj[f[2]][2] + proj[f[3]][2]) / 4;
      return { face: f, z: avgZ };
    }).sort((a, b) => a.z - b.z).forEach(({ face }) => {
      this.ctx.fillStyle = face[4];
      this.ctx.beginPath();
      this.ctx.moveTo(proj[face[0]][0], proj[face[0]][1]);
      this.ctx.lineTo(proj[face[1]][0], proj[face[1]][1]);
      this.ctx.lineTo(proj[face[2]][0], proj[face[2]][1]);
      this.ctx.lineTo(proj[face[3]][0], proj[face[3]][1]);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    });

    this.ctx.restore();
  }

  render2DStars() {
    for (let i = 0; i < 45; i++) {
      const star = this.warpStars[i % this.warpStars.length];
      const scrollX = (star.x - (this.distance * 0.15)) % this.virtualWidth;
      const finalX = scrollX < 0 ? scrollX + this.virtualWidth : scrollX;
      const finalY = (star.y + this.virtualHeight / 2) % (this.groundY - 60);

      this.ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha * 0.6})`;
      this.ctx.fillRect(finalX, Math.abs(finalY), star.size, star.size);
    }
  }

  renderGround() {
    this.ctx.fillStyle = CONFIG.COLORS.GROUND_BODY;
    this.ctx.fillRect(0, this.groundY, this.virtualWidth, CONFIG.CANVAS.GROUND_HEIGHT);

    this.ctx.fillStyle = CONFIG.COLORS.GROUND_SURFACE;
    this.ctx.fillRect(0, this.groundY, this.virtualWidth, 4);

    this.ctx.strokeStyle = 'rgba(255, 159, 28, 0.15)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    for (let x = -this.groundOffset; x < this.virtualWidth; x += 40) {
      this.ctx.moveTo(x, this.groundY);
      this.ctx.lineTo(x, this.virtualHeight);
    }
    this.ctx.stroke();
  }

  renderObstacles() {
    for (const obs of this.obstacles) {
      if (obs.type === 'spike') {
        this.ctx.fillStyle = CONFIG.COLORS.HAZARD_SPIKE;
        this.ctx.beginPath();
        this.ctx.moveTo(obs.x + obs.w / 2, obs.y);
        this.ctx.lineTo(obs.x + obs.w, obs.y + obs.h);
        this.ctx.lineTo(obs.x, obs.y + obs.h);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.strokeStyle = '#ff6b8b';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();

      } else if (obs.type === 'block') {
        this.ctx.fillStyle = CONFIG.COLORS.HAZARD_BLOCK;
        this.ctx.fillRect(obs.x, obs.y, obs.w, obs.h);

        this.ctx.strokeStyle = '#ff6b8b';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(obs.x + 1, obs.y + 1, obs.w - 2, obs.h - 2);

        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(obs.x + obs.w / 2 - 2, obs.y + 10, 4, obs.h - 20);

      } else if (obs.type === 'floating_bar') {
        this.ctx.fillStyle = CONFIG.COLORS.HAZARD_AIR;
        this.ctx.fillRect(obs.x, obs.y, obs.w, obs.h);

        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

        this.ctx.fillStyle = '#00f5d4';
        this.ctx.fillRect(obs.x + 4, obs.y + obs.h / 2 - 2, obs.w - 8, 4);

      } else if (obs.type === 'floating_cross') {
        this.ctx.save();
        this.ctx.translate(obs.x + obs.w / 2, obs.y + obs.h / 2);
        this.ctx.strokeStyle = CONFIG.COLORS.HAZARD_AIR;
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(-obs.w / 2, -obs.h / 2);
        this.ctx.lineTo(obs.w / 2, obs.h / 2);
        this.ctx.moveTo(obs.w / 2, -obs.h / 2);
        this.ctx.lineTo(-obs.w / 2, obs.h / 2);
        this.ctx.stroke();
        this.ctx.restore();

      } else if (obs.type === 'energy_gate') {
        this.ctx.fillStyle = 'rgba(0, 245, 212, 0.25)';
        this.ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        this.ctx.strokeStyle = CONFIG.COLORS.ACCENT_CYAN;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(obs.x + 4, obs.y + 4, obs.w - 8, 4);
        this.ctx.fillRect(obs.x + 4, obs.y + obs.h - 8, obs.w - 8, 4);
      }
    }
  }

  /**
   * Space Interceptor Hunter Drone Renderer
   */
  renderInterceptor() {
    const jet = this.interceptor;
    if (jet.state === InterceptorState.INACTIVE) return;

    this.ctx.save();
    this.ctx.translate(jet.x, jet.y);

    // 1. Sleek Angular Fuselage
    this.ctx.fillStyle = CONFIG.COLORS.INTERCEPTOR_HULL;
    this.ctx.beginPath();
    this.ctx.moveTo(jet.w, jet.h / 2);              // Nose
    this.ctx.lineTo(jet.w * 0.4, 0);                 // Top Wingtip
    this.ctx.lineTo(0, jet.h * 0.2);                 // Top Engine
    this.ctx.lineTo(0, jet.h * 0.8);                 // Bottom Engine
    this.ctx.lineTo(jet.w * 0.4, jet.h);             // Bottom Wingtip
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.strokeStyle = jet.isLocked ? CONFIG.COLORS.HAZARD_SPIKE : CONFIG.COLORS.ACCENT_CYAN;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // 2. Glowing Visor / Cockpit Sensor Eye
    this.ctx.fillStyle = jet.isLocked ? '#ff0033' : CONFIG.COLORS.INTERCEPTOR_ACCENT;
    this.ctx.fillRect(jet.w * 0.5, jet.h / 2 - 3, 14, 6);

    // 3. Engine Thruster Plume
    const thrusterLength = 16 + Math.sin(jet.thrusterPulse) * 8;
    this.ctx.fillStyle = CONFIG.COLORS.INTERCEPTOR_THRUST;
    this.ctx.beginPath();
    this.ctx.moveTo(0, jet.h * 0.3);
    this.ctx.lineTo(-thrusterLength, jet.h / 2);
    this.ctx.lineTo(0, jet.h * 0.7);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();

    // --- 4. Laser Targeting Line & Reticle Overlay ---
    if (jet.state === InterceptorState.TARGETING || jet.state === InterceptorState.LOCKED) {
      this.ctx.save();

      // Pulsing laser guide
      const laserAlpha = jet.isLocked ? 0.9 : 0.4 + Math.sin(jet.timer * 16) * 0.25;
      this.ctx.strokeStyle = jet.isLocked ? 'rgba(255, 42, 85, 0.9)' : `rgba(255, 42, 85, ${laserAlpha})`;
      this.ctx.lineWidth = jet.isLocked ? 2.5 : 1.5;
      this.ctx.setLineDash(jet.isLocked ? [] : [6, 4]);

      this.ctx.beginPath();
      this.ctx.moveTo(jet.x - 4, jet.y + jet.h / 2);
      this.ctx.lineTo(jet.aimX, jet.aimY);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      // Target Reticle (Crosshair)
      this.ctx.translate(jet.aimX, jet.aimY);
      const reticleRadius = jet.isLocked ? 14 : 18 + Math.sin(jet.timer * 14) * 4;

      this.ctx.strokeStyle = jet.isLocked ? '#ff0033' : CONFIG.COLORS.TARGET_RETICLE;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, reticleRadius, 0, Math.PI * 2);
      this.ctx.stroke();

      // Crosshair notches
      this.ctx.beginPath();
      this.ctx.moveTo(-reticleRadius - 4, 0);
      this.ctx.lineTo(-reticleRadius + 4, 0);
      this.ctx.moveTo(reticleRadius - 4, 0);
      this.ctx.lineTo(reticleRadius + 4, 0);
      this.ctx.moveTo(0, -reticleRadius - 4);
      this.ctx.lineTo(0, -reticleRadius + 4);
      this.ctx.moveTo(0, reticleRadius - 4);
      this.ctx.lineTo(0, reticleRadius + 4);
      this.ctx.stroke();

      // "LOCK" Warning Text
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 10px JetBrains Mono';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(jet.isLocked ? 'TARGET LOCKED' : 'LOCKING...', 0, -reticleRadius - 8);

      this.ctx.restore();
    }
  }

  renderMissiles() {
    for (const m of this.missiles) {
      this.ctx.save();
      this.ctx.translate(m.x + m.w / 2, m.y + m.h / 2);
      this.ctx.rotate(m.angle);

      // Missile Body
      this.ctx.fillStyle = CONFIG.COLORS.HAZARD_SPIKE;
      this.ctx.fillRect(-m.w / 2, -m.h / 2, m.w - 6, m.h);

      // Pointed Warhead
      this.ctx.fillStyle = '#ffaa00';
      this.ctx.beginPath();
      this.ctx.moveTo(m.w / 2 - 6, -m.h / 2);
      this.ctx.lineTo(m.w / 2, 0);
      this.ctx.lineTo(m.w / 2 - 6, m.h / 2);
      this.ctx.closePath();
      this.ctx.fill();

      // Fins
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(-m.w / 2, -m.h / 2 - 4, 6, 4);
      this.ctx.fillRect(-m.w / 2, m.h / 2, 6, 4);

      this.ctx.restore();
    }
  }

  renderFloatingTexts() {
    for (const ft of this.floatingTexts) {
      this.ctx.save();
      this.ctx.globalAlpha = ft.alpha;
      this.ctx.fillStyle = ft.color;
      this.ctx.font = 'bold 13px JetBrains Mono';
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = ft.color;
      this.ctx.shadowBlur = 10;
      this.ctx.fillText(ft.text, ft.x, ft.y);
      this.ctx.restore();
    }
  }

  renderPlayer() {
    for (let i = 0; i < this.player.trail.length; i++) {
      const t = this.player.trail[i];
      const alpha = (1 - (i / this.player.trail.length)) * 0.35;
      this.ctx.save();
      this.ctx.translate(t.x + t.w / 2, t.y + t.h / 2);
      this.ctx.rotate(t.rotation);
      this.ctx.fillStyle = t.isDashing
        ? `rgba(0, 245, 212, ${alpha})`
        : `rgba(255, 159, 28, ${alpha})`;
      this.ctx.fillRect(-t.w / 2, -t.h / 2, t.w, t.h);
      this.ctx.restore();
    }

    this.ctx.save();
    this.ctx.translate(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2);
    this.ctx.rotate(this.player.rotation);

    this.ctx.fillStyle = this.player.isDashing ? CONFIG.COLORS.ACCENT_CYAN : CONFIG.COLORS.PLAYER;
    this.ctx.fillRect(-this.player.w / 2, -this.player.h / 2, this.player.w, this.player.h);

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(-this.player.w / 2 + 1, -this.player.h / 2 + 1, this.player.w - 2, this.player.h - 2);

    this.ctx.fillStyle = CONFIG.COLORS.PLAYER_EYE;
    if (this.player.isSquashing) {
      this.ctx.fillRect(2, -3, 12, 4);
    } else {
      this.ctx.fillRect(2, -8, 10, 8);
    }

    this.ctx.restore();
  }

  renderParticles() {
    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha;
      if (p.rotation !== undefined) {
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rotation * Math.PI / 180);
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }
  }

  loop(currentTime) {
    if (!this.lastTime) this.lastTime = currentTime;

    const rawDt = (currentTime - this.lastTime) / 1000;
    this.deltaTime = Math.min(rawDt, 0.1);
    this.lastTime = currentTime;

    this.update(this.deltaTime);
    this.render();

    requestAnimationFrame((time) => this.loop(time));
  }

  /**
   * ============================================================================
   * INTERACTIVE 3D HOLOGRAPHIC TRAINING SIMULATION ("NEURAL MATRIX")
   * ============================================================================
   */
  startTutorial(isReplay = false) {
    audio.init();
    this.resetRun();
    this.tutorial.active = true;
    this.tutorial.isReplay = isReplay;
    this.tutorial.step = 0;
    this.tutorial.stepTimer = 0;
    this.tutorial.subState = 'APPROACH';
    this.tutorial.rewindTimer = 0;
    this.tutorial.successTimer = 0;
    this.tutorial.glitchAlpha = 0;
    this.tutorial.dematerializeAlpha = 0;
    this.tutorial.simGridZ = 0;
    this.tutorial.trainingObstacles = [];

    this.setState(GameState.TUTORIAL);
    this.loadTutorialStep(0);
  }

  skipTutorial() {
    audio.init();
    audio.playClick();
    storage.markTutorialSeen();
    this.tutorial.active = false;
    if (this.tutorial.isReplay) {
      this.setState(GameState.MENU);
    } else {
      this.startNewRun();
    }
  }

  getTutorialDirective(stepIndex) {
    const isMob = this.inputManager && this.inputManager.isMobile();
    switch (stepIndex) {
      case 0:
        return 'NEURAL LINK CONNECTED';
      case 1:
        return isMob ? 'TAP PLAY AREA TO JUMP' : 'TAP SPACE / CLICK TO JUMP';
      case 2:
        return isMob ? 'HOLD ▼ SQUASH TO SLIDE' : 'HOLD S / ↓ TO SQUASH & DUCK';
      case 3:
        return isMob ? 'TAP ⚡ DASH TO BURST' : 'PRESS SHIFT / X TO DASH';
      case 4:
        return isMob ? 'CHAIN ACTIONS // TAP, HOLD, DASH' : 'CHAIN ACTIONS // JUMP, SQUASH, DASH';
      case 5:
        return 'SIMULATION COMPLETED';
      default:
        return '';
    }
  }

  updateTutorialDirectiveText() {
    if (this.state === GameState.TUTORIAL && this.dom.tutorialDirective) {
      this.dom.tutorialDirective.textContent = this.getTutorialDirective(this.tutorial.step);
    }
  }

  loadTutorialStep(stepIndex) {
    this.tutorial.step = stepIndex;
    this.tutorial.stepTimer = 0;
    this.tutorial.subState = 'APPROACH';
    this.tutorial.rewindTimer = 0;
    this.tutorial.successTimer = 0;
    this.tutorial.glitchAlpha = 0;
    this.tutorial.trainingObstacles = [];

    // Reset player position safely on ground
    this.player.x = CONFIG.PLAYER.START_X;
    this.player.y = this.groundY - CONFIG.PLAYER.HEIGHT;
    this.player.w = CONFIG.PLAYER.WIDTH;
    this.player.h = CONFIG.PLAYER.HEIGHT;
    this.player.vy = 0;
    this.player.rotation = 0;
    this.player.isGrounded = true;
    this.player.isSquashing = false;
    this.player.wantsToUnsquash = false;
    this.player.isDashing = false;
    this.player.dashCooldownTimer = 0;

    this.dom.tutorialDirective.textContent = this.getTutorialDirective(stepIndex);

    switch (stepIndex) {
      case 0: // BOOT
        this.dom.tutorialStepTag.textContent = 'CALIBRATION // INITIALIZING';
        this.dom.tutorialTip.textContent = 'Synchronizing motor controls. Prepare for tactical movement training...';
        audio.playTutorialStep();
        break;

      case 1: // JUMP
        this.dom.tutorialStepTag.textContent = 'STEP 1 OF 3 // THE LEAP';
        this.dom.tutorialTip.textContent = 'Time your leap to clear the holographic spike cleanly.';
        audio.playTutorialStep();
        this.spawnTutorialObstacle('spike', this.virtualWidth + 140, this.groundY - 36, 36, 36);
        break;

      case 2: // SQUASH
        this.dom.tutorialStepTag.textContent = 'STEP 2 OF 3 // SQUASH & DUCK';
        this.dom.tutorialTip.textContent = 'Compress your chassis to slide safely under low-altitude laser bars.';
        audio.playTutorialStep();
        this.spawnTutorialObstacle('floating_bar', this.virtualWidth + 140, this.groundY - 50, 120, 22);
        break;

      case 3: // DASH
        this.dom.tutorialStepTag.textContent = 'STEP 3 OF 3 // HYPER DASH';
        this.dom.tutorialTip.textContent = 'Trigger thruster burst for high-velocity clearance across hazard fields.';
        audio.playTutorialStep();
        this.spawnTutorialObstacle('double-spike', this.virtualWidth + 140, this.groundY - 36, 72, 36);
        break;

      case 4: // COMBO
        this.dom.tutorialStepTag.textContent = 'FINAL EVALUATION // COMBAT REFLEX';
        this.dom.tutorialTip.textContent = 'Execute sequential maneuvers through the obstacle simulation grid.';
        audio.playTutorialStep();
        this.spawnTutorialObstacle('spike', this.virtualWidth + 140, this.groundY - 36, 36, 36);
        this.spawnTutorialObstacle('floating_bar', this.virtualWidth + 440, this.groundY - 50, 110, 22);
        this.spawnTutorialObstacle('double-spike', this.virtualWidth + 760, this.groundY - 36, 72, 36);
        break;

      case 5: // COMPLETE
        this.dom.tutorialStepTag.textContent = 'TRAINING COMPLETE // COMBAT READY';
        this.dom.tutorialTip.textContent = 'Dematerializing matrix. Transferring to live combat sector...';
        storage.markTutorialSeen();
        audio.playTutorialComplete();
        this.tutorial.dematerializeAlpha = 1;
        break;
    }
  }

  spawnTutorialObstacle(type, x, y, w, h) {
    this.tutorial.trainingObstacles.push({
      type,
      initialX: x,
      currentX: x,
      x,
      y,
      w,
      h,
      cleared: false,
    });
  }

  updateTutorial(dt) {
    this.tutorial.stepTimer += dt;
    this.tutorial.simGridZ = (this.tutorial.simGridZ + dt * 180) % 60;

    if (this.tutorial.glitchAlpha > 0) {
      this.tutorial.glitchAlpha = Math.max(0, this.tutorial.glitchAlpha - dt * 2.5);
    }

    // Step 0: Initial boot countdown
    if (this.tutorial.step === 0) {
      if (this.tutorial.stepTimer >= 1.4) {
        this.loadTutorialStep(1);
      }
      this.updatePlayerPhysicsAndMovement(dt, 0);
      this.updateParticles(dt);
      return;
    }

    // Step 5: Dematerialization and launch
    if (this.tutorial.step === 5) {
      this.tutorial.dematerializeAlpha = Math.max(0, 1 - (this.tutorial.stepTimer / 1.6));
      this.updatePlayerPhysicsAndMovement(dt, CONFIG.TUTORIAL.TRAINING_SPEED * 1.4);
      this.updateParticles(dt);

      if (this.tutorial.stepTimer >= 1.6) {
        this.tutorial.active = false;
        if (this.tutorial.isReplay) {
          this.setState(GameState.MENU);
        } else {
          this.startNewRun();
        }
      }
      return;
    }

    // Handle Sub-States (APPROACH, REWIND, CLEAR)
    if (this.tutorial.subState === 'REWIND') {
      this.tutorial.rewindTimer += dt;
      const progress = Math.min(1, this.tutorial.rewindTimer / CONFIG.TUTORIAL.REWIND_DURATION);

      for (const obs of this.tutorial.trainingObstacles) {
        obs.x = obs.currentX + (obs.initialX - obs.currentX) * progress;
      }

      if (progress >= 1) {
        this.tutorial.subState = 'APPROACH';
        this.tutorial.rewindTimer = 0;
        this.player.isSquashing = false;
        this.player.h = CONFIG.PLAYER.HEIGHT;
        this.player.w = CONFIG.PLAYER.WIDTH;
        this.player.y = this.groundY - CONFIG.PLAYER.HEIGHT;
        this.player.vy = 0;
        this.player.isGrounded = true;
      }

      this.updateParticles(dt);
      return;
    }

    if (this.tutorial.subState === 'CLEAR') {
      this.tutorial.successTimer += dt;
      this.updatePlayerPhysicsAndMovement(dt, CONFIG.TUTORIAL.TRAINING_SPEED);
      this.updateParticles(dt);

      if (this.tutorial.successTimer >= CONFIG.TUTORIAL.SUCCESS_PAUSE) {
        this.loadTutorialStep(this.tutorial.step + 1);
      }
      return;
    }

    // Standard Tutorial Movement & Obstacle Progression
    const trainingSpeed = CONFIG.TUTORIAL.TRAINING_SPEED;
    const moveStep = trainingSpeed * dt;

    this.updatePlayerPhysicsAndMovement(dt, trainingSpeed);

    let allCleared = true;
    for (const obs of this.tutorial.trainingObstacles) {
      obs.x -= moveStep;

      // Check if cleared player safely
      if (!obs.cleared && obs.x + obs.w < this.player.x) {
        obs.cleared = true;
        audio.playTutorialSuccess();
      }

      if (!obs.cleared) {
        allCleared = false;
      }
    }

    // Check collision with training obstacles
    if (this.checkTutorialCollisions()) {
      this.triggerTutorialMistake();
      return;
    }

    if (allCleared && this.tutorial.trainingObstacles.length > 0) {
      this.tutorial.subState = 'CLEAR';
      this.tutorial.successTimer = 0;
    }

    this.updateParticles(dt);
  }

  updatePlayerPhysicsAndMovement(dt, speed) {
    // Dash timers
    if (this.player.isDashing) {
      this.player.dashTimer -= dt;
      if (this.player.dashTimer <= 0) {
        this.player.isDashing = false;
      }
    }
    if (this.player.dashCooldownTimer > 0) {
      this.player.dashCooldownTimer = Math.max(0, this.player.dashCooldownTimer - dt);
    }

    // Safe unsquash
    if (this.player.wantsToUnsquash) {
      this.performSafeUnsquash();
    }

    // Gravity & Grounding
    if (!this.player.isGrounded) {
      this.player.vy += CONFIG.PLAYER.GRAVITY * dt;
      this.player.vy = Math.min(this.player.vy, CONFIG.PLAYER.MAX_FALL_SPEED);
      this.player.y += this.player.vy * dt;

      if (!this.player.isSquashing) {
        this.player.rotation += (CONFIG.PLAYER.ROTATION_SPEED * dt) * (Math.PI / 180);
      }

      if (this.player.y + this.player.h >= this.groundY) {
        this.player.y = this.groundY - this.player.h;
        this.player.vy = 0;
        this.player.isGrounded = true;
        this.player.rotation = 0;
        audio.playLand();
      }
    } else {
      this.player.y = this.groundY - this.player.h;
    }

    // Player motion trail
    this.player.trail.unshift({
      x: this.player.x,
      y: this.player.y,
      w: this.player.w,
      h: this.player.h,
      rotation: this.player.rotation,
      isDashing: this.player.isDashing,
      alpha: 0.6
    });
    if (this.player.trail.length > CONFIG.VISUALS.TRAIL_MAX_LENGTH) {
      this.player.trail.pop();
    }
  }

  checkTutorialCollisions() {
    const pad = CONFIG.PLAYER.HITBOX_PADDING;
    const px = this.player.x + pad;
    const py = this.player.y + pad;
    const pw = this.player.w - (pad * 2);
    const ph = this.player.h - (pad * 2);

    for (const obs of this.tutorial.trainingObstacles) {
      let obsPadX = 3;
      let obsPadY = 3;

      if (obs.type === 'spike' || obs.type === 'double-spike') {
        obsPadX = 6;
        obsPadY = 6;
      }

      const ox = obs.x + obsPadX;
      const oy = obs.y + obsPadY;
      const ow = obs.w - (obsPadX * 2);
      const oh = obs.h - (obsPadY * 2);

      if (px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy) {
        return true;
      }
    }
    return false;
  }

  triggerTutorialMistake() {
    audio.playTutorialGlitch();
    this.addScreenShake(6, 0.25);
    this.tutorial.subState = 'REWIND';
    this.tutorial.rewindTimer = 0;
    this.tutorial.glitchAlpha = 1;

    for (const obs of this.tutorial.trainingObstacles) {
      obs.currentX = obs.x;
      obs.cleared = false;
    }

    for (let i = 0; i < 16; i++) {
      this.particles.push({
        x: this.player.x + Math.random() * this.player.w,
        y: this.player.y + Math.random() * this.player.h,
        vx: (Math.random() - 0.5) * 160,
        vy: (Math.random() - 0.5) * 160,
        size: Math.random() * 4 + 2,
        color: CONFIG.COLORS.ACCENT_CYAN,
        alpha: 0.9,
        life: 0.35,
        maxLife: 0.35
      });
    }
  }

  renderTutorial() {
    this.render2DStars();
    this.renderHolographicGrid();
    this.renderGround();
    this.renderTutorialObstacles();
    this.renderParticles();
    this.renderPlayer();
    if (this.tutorial.glitchAlpha > 0) {
      this.renderTutorialGlitch();
    }
  }

  renderHolographicGrid() {
    const horizonY = this.groundY - 140;
    const vpX = this.virtualWidth / 2;
    const numLines = 14;

    this.ctx.save();
    this.ctx.strokeStyle = CONFIG.COLORS.ACCENT_CYAN;
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = 0.22;

    // Perspective lines fan out to ground
    for (let i = 0; i <= numLines; i++) {
      const bottomX = (this.virtualWidth / numLines) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(vpX, horizonY);
      this.ctx.lineTo(bottomX, this.groundY);
      this.ctx.stroke();
    }

    // Transverse holographic scan lines scrolling forward
    const gridSpacing = 24;
    for (let yOffset = 0; yOffset < (this.groundY - horizonY); yOffset += gridSpacing) {
      const scrollY = (yOffset + this.tutorial.simGridZ) % (this.groundY - horizonY);
      const currentY = horizonY + scrollY;
      const progress = scrollY / (this.groundY - horizonY);
      const leftX = vpX - (vpX * progress);
      const rightX = vpX + ((this.virtualWidth - vpX) * progress);

      this.ctx.globalAlpha = 0.08 + progress * 0.25;
      this.ctx.beginPath();
      this.ctx.moveTo(leftX, currentY);
      this.ctx.lineTo(rightX, currentY);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  renderTutorialObstacles() {
    for (const obs of this.tutorial.trainingObstacles) {
      this.ctx.save();
      this.ctx.strokeStyle = CONFIG.COLORS.ACCENT_CYAN;
      this.ctx.shadowColor = CONFIG.COLORS.ACCENT_CYAN;
      this.ctx.shadowBlur = 8;

      if (obs.type === 'spike' || obs.type === 'double-spike') {
        const spikeCount = obs.type === 'double-spike' ? 2 : 1;
        const singleW = obs.w / spikeCount;

        for (let s = 0; s < spikeCount; s++) {
          const sx = obs.x + s * singleW;
          this.ctx.fillStyle = 'rgba(0, 245, 212, 0.25)';
          this.ctx.beginPath();
          this.ctx.moveTo(sx + singleW / 2, obs.y);
          this.ctx.lineTo(sx + singleW, obs.y + obs.h);
          this.ctx.lineTo(sx, obs.y + obs.h);
          this.ctx.closePath();
          this.ctx.fill();

          this.ctx.lineWidth = 2;
          this.ctx.stroke();
        }
      } else if (obs.type === 'floating_bar') {
        this.ctx.fillStyle = 'rgba(0, 245, 212, 0.3)';
        this.ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(obs.x + 6, obs.y + obs.h / 2 - 2, obs.w - 12, 4);
      }

      this.ctx.restore();
    }
  }

  renderTutorialGlitch() {
    this.ctx.save();
    this.ctx.globalAlpha = this.tutorial.glitchAlpha * 0.45;
    this.ctx.fillStyle = CONFIG.COLORS.ACCENT_CYAN;

    for (let i = 0; i < 6; i++) {
      const y = Math.random() * this.virtualHeight;
      const h = Math.random() * 12 + 4;
      const offsetX = (Math.random() - 0.5) * 40;
      this.ctx.fillRect(offsetX, y, this.virtualWidth, h);
    }
    this.ctx.restore();
  }

  bindActionInputs() {
    this.inputManager.onJump(() => {
      if (this.state === GameState.INTRO_IDLE) {
        this.startCinematicEntrance();
      } else if (this.state === GameState.PLAYING || this.state === GameState.TUTORIAL) {
        this.inputs.jump = true;
        this.triggerJump();
      }
    });

    this.inputManager.onSquashStart(() => {
      if (this.state === GameState.PLAYING || this.state === GameState.TUTORIAL) {
        this.inputs.squash = true;
        this.startSquash();
      }
    });

    this.inputManager.onSquashEnd(() => {
      this.inputs.squash = false;
      if (this.state === GameState.PLAYING || this.state === GameState.TUTORIAL) {
        this.endSquash();
      }
    });

    this.inputManager.onDash(() => {
      if (this.state === GameState.PLAYING || this.state === GameState.TUTORIAL) {
        this.inputs.dash = true;
        this.triggerDash();
      }
    });

    this.inputManager.onRetry(() => {
      if (this.state === GameState.DEAD) {
        audio.playClick();
        this.startNewRun();
      }
    });

    this.inputManager.onPause(() => {
      audio.playClick();
      if (this.state === GameState.TUTORIAL) {
        this.skipTutorial();
      } else if (this.state === GameState.PLAYING) {
        this.setState(GameState.PAUSED);
      } else if (this.state === GameState.PAUSED) {
        this.setState(GameState.PLAYING);
      }
    });

    this.inputManager.onSoundToggle(() => {
      this.toggleSound();
    });

    this.inputManager.onFullscreenToggle(() => {
      this.toggleFullscreen();
    });
  }

  bindUIButtons() {
    document.getElementById('intro-overlay').addEventListener('click', () => {
      this.startCinematicEntrance();
    });

    document.getElementById('btn-play').addEventListener('click', () => {
      this.handlePlayClick();
    });

    document.getElementById('btn-open-records').addEventListener('click', () => {
      this.openRecords();
    });

    document.getElementById('btn-open-tutorial').addEventListener('click', () => {
      this.startTutorial(true);
    });

    document.getElementById('btn-open-settings').addEventListener('click', () => {
      audio.playClick();
      this.dom.settingsOverlay.classList.remove('hidden');
    });

    document.getElementById('btn-skip-tutorial').addEventListener('click', () => {
      this.skipTutorial();
    });

    document.getElementById('btn-close-settings').addEventListener('click', () => {
      audio.playClick();
      this.dom.settingsOverlay.classList.add('hidden');
    });
    document.getElementById('btn-save-settings').addEventListener('click', () => {
      audio.playClick();
      this.dom.settingsOverlay.classList.add('hidden');
    });

    if (this.dom.btnResetTutorial) {
      this.dom.btnResetTutorial.addEventListener('click', () => {
        audio.playClick();
        storage.resetTutorialStatus();
        this.dom.btnResetTutorial.textContent = 'RESET! (READY)';
        setTimeout(() => {
          if (this.dom.btnResetTutorial) this.dom.btnResetTutorial.textContent = 'RESET TRAINING';
        }, 1500);
      });
    }

    this.dom.sliderMasterVol.addEventListener('input', (e) => {
      audio.setMasterVolume(parseFloat(e.target.value));
    });
    this.dom.sliderMusicVol.addEventListener('input', (e) => {
      audio.setMusicVolume(parseFloat(e.target.value));
    });
    this.dom.sliderSfxVol.addEventListener('input', (e) => {
      audio.setSFXVolume(parseFloat(e.target.value));
    });

    document.querySelectorAll('.color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        audio.playClick();
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        const color = dot.getAttribute('data-color');
        CONFIG.COLORS.PLAYER = color;
        CONFIG.COLORS.GROUND_SURFACE = color;
        CONFIG.COLORS.ACCENT_AMBER = color;
      });
    });

    document.getElementById('btn-resume').addEventListener('click', () => {
      audio.playClick();
      this.setState(GameState.PLAYING);
    });
    document.getElementById('btn-pause-restart').addEventListener('click', () => {
      audio.playClick();
      this.startNewRun();
    });
    document.getElementById('btn-pause-menu').addEventListener('click', () => {
      audio.playClick();
      this.setState(GameState.MENU);
    });

    document.getElementById('btn-retry').addEventListener('click', () => {
      audio.playClick();
      this.startNewRun();
    });
    document.getElementById('btn-death-records').addEventListener('click', () => {
      this.openRecords();
    });
    document.getElementById('btn-death-menu').addEventListener('click', () => {
      audio.playClick();
      this.setState(GameState.MENU);
    });

    document.getElementById('btn-close-records').addEventListener('click', () => {
      audio.playClick();
      this.dom.recordsOverlay.classList.add('hidden');
    });

    this.dom.btnSaveName.addEventListener('click', () => {
      audio.playClick();
      const updated = storage.setPlayerName(this.dom.playerNameInput.value);
      this.dom.playerNameInput.value = updated;
      this.refreshRecordsView();
    });

    document.getElementById('btn-toggle-sound').addEventListener('click', () => this.toggleSound());
    document.getElementById('btn-toggle-crt').addEventListener('click', () => {
      audio.playClick();
      this.dom.scanlineLayer.classList.toggle('hidden');
    });
    document.getElementById('btn-toggle-fullscreen').addEventListener('click', () => this.toggleFullscreen());
  }

  toggleSound() {
    audio.init();
    const isMuted = audio.toggleMute();
    audio.playClick();
    this.dom.audioIconWaves.style.display = isMuted ? 'none' : 'block';
  }

  toggleFullscreen() {
    audio.playClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  openRecords() {
    audio.playClick();
    this.dom.recordsOverlay.classList.remove('hidden');
    this.refreshRecordsView();
  }

  refreshRecordsView() {
    const stats = storage.getStats();
    this.dom.recPb.textContent = stats.personalBest.toLocaleString();
    this.dom.recAttempts.textContent = stats.totalRuns.toLocaleString();
    this.dom.recSurvival.textContent = `${stats.longestSurvival.toFixed(1)}s`;
    this.dom.recDemolitions.textContent = stats.missileDemolitions.toLocaleString();
    this.dom.playerNameInput.value = storage.getPlayerName();
  }

  _escapeHtml(str) {
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
  }
}

// Instantiate engine when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.blockDash = new GameEngine();
});
