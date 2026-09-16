/**
 * ==============================================================================
 * BLOCK DASH - Core Game Engine
 * "One button. One endless level. No excuses."
 *
 * Handles: Canvas scaling, Delta-Time loop, FSM state transitions,
 *          Verlet/Euler player physics, constraint-aware procedural generation,
 *          AABB collision detection, visual effects, and HUD synchronization.
 * ==============================================================================
 */

import { CONFIG } from './config.js';
import { audio } from './audio.js';
import { roastEngine } from './roast.js';
import { leaderboard } from './leaderboard.js';

// --- Game State Enum ---
export const GameState = Object.freeze({
  BOOT: 'BOOT',
  MENU: 'MENU',
  READY: 'READY',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  DEAD: 'DEAD',
});

class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Internal logical coordinate system
    this.virtualWidth = CONFIG.CANVAS.WIDTH;
    this.virtualHeight = CONFIG.CANVAS.HEIGHT;
    this.scale = 1;
    this.dpr = window.devicePixelRatio || 1;

    // State & Timing
    this.state = GameState.BOOT;
    this.lastTime = 0;
    this.deltaTime = 0;
    this.sessionAttempts = 0;

    // Run Telemetry
    this.score = 0;
    this.distance = 0;
    this.currentSpeed = CONFIG.SPEED.INITIAL;
    this.survivalTime = 0;
    this.obstacleCounter = 0;
    this.lastKillerType = 'single-spike';

    // Player Entity
    this.player = {
      x: CONFIG.PLAYER.START_X,
      y: CONFIG.PLAYER.START_Y,
      w: CONFIG.PLAYER.WIDTH,
      h: CONFIG.PLAYER.HEIGHT,
      vy: 0,
      rotation: 0,
      isGrounded: true,
      trail: [],
    };

    // World & Environment
    this.groundY = CONFIG.CANVAS.GROUND_Y;
    this.obstacles = [];
    this.particles = [];
    this.bgStars = [];
    this.groundOffset = 0;

    // Screen Shake
    this.shakeTime = 0;
    this.shakeDuration = 0;
    this.shakeIntensity = 0;

    // Jump Physics Trajectory Pre-calculations
    this.jumpRiseTime = -CONFIG.PLAYER.JUMP_FORCE / CONFIG.PLAYER.GRAVITY;
    this.jumpMaxHeight = (CONFIG.PLAYER.JUMP_FORCE ** 2) / (2 * CONFIG.PLAYER.GRAVITY);
    this.jumpAirTime = 2 * this.jumpRiseTime;

    // Procedural Spawning Anchor
    this.nextSpawnX = this.virtualWidth + 100;

    // DOM UI Elements
    this.dom = {
      hud: document.getElementById('game-hud'),
      hudScore: document.getElementById('hud-score'),
      hudPb: document.getElementById('hud-pb'),
      hudSpeedFill: document.getElementById('hud-speed-fill'),
      menuOverlay: document.getElementById('menu-overlay'),
      readyOverlay: document.getElementById('ready-overlay'),
      pauseOverlay: document.getElementById('pause-overlay'),
      deathOverlay: document.getElementById('death-overlay'),
      leaderboardOverlay: document.getElementById('leaderboard-overlay'),
      deathScore: document.getElementById('death-score'),
      deathPb: document.getElementById('death-pb'),
      deathRank: document.getElementById('death-rank'),
      roastCat: document.getElementById('roast-cat'),
      roastMsg: document.getElementById('roast-msg'),
      memeBadge: document.getElementById('meme-badge'),
      memeText: document.getElementById('meme-text'),
      leaderboardRows: document.getElementById('leaderboard-rows'),
      playerNameInput: document.getElementById('player-name-input'),
      btnSaveName: document.getElementById('btn-save-name'),
      scanlineLayer: document.getElementById('scanline-layer'),
      audioIconWaves: document.getElementById('audio-icon-waves'),
    };

    this.init();
  }

  /**
   * Initializes the engine, builds background particles, binds events, and enters MENU state.
   */
  init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Generate static stars for parallax backdrop
    for (let i = 0; i < 45; i++) {
      this.bgStars.push({
        x: Math.random() * this.virtualWidth,
        y: Math.random() * (this.groundY - 60),
        size: Math.random() * 2 + 1,
        speedFactor: Math.random() * 0.3 + 0.1,
        alpha: Math.random() * 0.6 + 0.2
      });
    }

    this.bindInputs();
    this.bindButtons();

    // Setup initial HUD personal best
    this.dom.hudPb.textContent = leaderboard.getPersonalBest();
    this.dom.playerNameInput.value = leaderboard.playerName;

    this.setState(GameState.MENU);

    // Launch Delta-Time Game Loop
    requestAnimationFrame((time) => this.loop(time));
  }

  /**
   * High-DPI & Responsive Aspect-Ratio Canvas Resizer
   */
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

    // Hide all overlays by default
    this.dom.menuOverlay.classList.add('hidden');
    this.dom.readyOverlay.classList.add('hidden');
    this.dom.pauseOverlay.classList.add('hidden');
    this.dom.deathOverlay.classList.add('hidden');
    this.dom.leaderboardOverlay.classList.add('hidden');
    this.dom.hud.classList.add('hidden');

    switch (newState) {
      case GameState.MENU:
        this.dom.menuOverlay.classList.remove('hidden');
        this.resetWorld();
        break;

      case GameState.READY:
        this.dom.readyOverlay.classList.remove('hidden');
        this.dom.hud.classList.remove('hidden');
        this.resetWorld();
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

  /**
   * Resets world entities, player physics, score, and obstacle arrays for a fresh run.
   */
  resetWorld() {
    this.player.x = CONFIG.PLAYER.START_X;
    this.player.y = this.groundY - CONFIG.PLAYER.HEIGHT;
    this.player.vy = 0;
    this.player.rotation = 0;
    this.player.isGrounded = true;
    this.player.trail = [];

    this.obstacles = [];
    this.particles = [];
    this.score = 0;
    this.distance = 0;
    this.survivalTime = 0;
    this.obstacleCounter = 0;
    this.currentSpeed = CONFIG.SPEED.INITIAL;
    this.nextSpawnX = this.virtualWidth + 120;

    this.dom.hudScore.textContent = '0';
    this.dom.hudPb.textContent = leaderboard.getPersonalBest();
    this.dom.hudSpeedFill.style.width = '10%';
  }

  /**
   * Action: Player Jump / Action Input Trigger
   */
  handleAction() {
    audio.init();

    if (this.state === GameState.MENU) {
      this.setState(GameState.PLAYING);
      this.triggerJump();
      return;
    }

    if (this.state === GameState.READY) {
      this.setState(GameState.PLAYING);
      this.triggerJump();
      return;
    }

    if (this.state === GameState.PLAYING) {
      this.triggerJump();
      return;
    }

    if (this.state === GameState.DEAD) {
      this.sessionAttempts++;
      this.setState(GameState.PLAYING);
      this.triggerJump();
      return;
    }
  }

  /**
   * Applies vertical jump impulse and spawns kick-up dust particles
   */
  triggerJump() {
    if (!this.player.isGrounded) return;

    this.player.vy = CONFIG.PLAYER.JUMP_FORCE;
    this.player.isGrounded = false;
    audio.playJump();

    // Trigger micro-shake on jump
    this.addScreenShake(CONFIG.VISUALS.SHAKE_INTENSITY_JUMP, CONFIG.VISUALS.SHAKE_DURATION_JUMP);

    // Spawn dust particles at base
    for (let i = 0; i < CONFIG.VISUALS.PARTICLE_COUNT_JUMP; i++) {
      this.particles.push({
        x: this.player.x + Math.random() * this.player.w,
        y: this.groundY - 2,
        vx: (Math.random() - 0.7) * 90 - 40,
        vy: -Math.random() * 80 - 20,
        size: Math.random() * 4 + 2,
        color: 'rgba(255, 159, 28, 0.6)',
        alpha: 1,
        life: 0.25,
        maxLife: 0.25
      });
    }
  }

  /**
   * Adds screen shake offset
   */
  addScreenShake(intensity, duration) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTime = duration;
  }

  /**
   * Handles collision / player death event
   */
  async handleDeath() {
    audio.playDeath();
    this.addScreenShake(CONFIG.VISUALS.SHAKE_INTENSITY_DEATH, CONFIG.VISUALS.SHAKE_DURATION_DEATH);

    // Shatter Player into debris particles
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

    // Submit score & evaluate ranking
    const finalScore = Math.floor(this.score);
    const pbBefore = leaderboard.getPersonalBest();
    const result = await leaderboard.submitScore(finalScore, this.survivalTime);

    if (result.isNewPB) {
      audio.playNewPB();
    }

    // Generate Roast
    const roast = roastEngine.generateRoast({
      score: finalScore,
      personalBest: pbBefore,
      isNewPB: result.isNewPB,
      survivalTime: this.survivalTime,
      obstacleIndex: this.obstacleCounter,
      killerType: this.lastKillerType,
      attemptNumber: this.sessionAttempts
    });

    // Populate Death Overlay DOM
    this.dom.deathScore.textContent = finalScore;
    this.dom.deathPb.textContent = result.pb;
    this.dom.deathRank.textContent = result.globalRank;
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
   * CONSTRAINT-AWARE PROCEDURAL OBSTACLE GENERATOR
   *
   * Mathematical Principle:
   * Max jump reach at current speed = currentSpeed * t_air.
   * Minimum safe gap = (currentSpeed * t_air) + player_width + safety_buffer.
   *
   * Patterns are chosen with dynamic difficulty weights, and mathematically
   * validated to ensure the jump is ALWAYS fair and physically possible.
   * ============================================================================
   */
  updateProceduralGeneration() {
    while (this.nextSpawnX < this.virtualWidth + 300) {
      const pattern = this.selectWeightedPattern();
      this.spawnPattern(pattern, this.nextSpawnX);

      // Calculate safe gap based on speed and obstacle complexity
      const minSafeGap = (this.currentSpeed * this.jumpAirTime) * 0.72 +
                         CONFIG.PLAYER.WIDTH +
                         CONFIG.OBSTACLES.SAFETY_BUFFER;

      // Spacing slightly tightens as difficulty increases, but never breaches safe threshold
      const spacingVariance = Math.max(80, 240 - (this.score / 20));
      const nextGap = minSafeGap + Math.random() * spacingVariance;

      this.nextSpawnX += pattern.totalWidth + nextGap;
    }
  }

  /**
   * Weighted Pattern Selector (Dynamic Difficulty Curves)
   */
  selectWeightedPattern() {
    const s = this.score;

    // Weight distribution shifts as score advances
    let weights;
    if (s < 300) {
      weights = { single: 65, double: 25, block: 10, step: 0, triple: 0, barrier: 0 };
    } else if (s < 1000) {
      weights = { single: 40, double: 30, block: 15, step: 10, triple: 5, barrier: 0 };
    } else if (s < 2500) {
      weights = { single: 25, double: 30, block: 20, step: 15, triple: 7, barrier: 3 };
    } else {
      weights = { single: 15, double: 25, block: 20, step: 20, triple: 12, barrier: 8 };
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
      case 'step':
        return {
          type: 'step-hazard',
          totalWidth: 84,
          elements: [
            { type: 'block', xOffset: 0, w: 36, h: 32 },
            { type: 'spike', xOffset: 48, w: 36, h: 36 }
          ]
        };
      case 'barrier':
        return {
          type: 'high-barrier',
          totalWidth: 44,
          elements: [
            { type: 'barrier', xOffset: 0, w: 44, h: 180, yOffset: 120 }
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
      const obsY = el.yOffset
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

  /**
   * ============================================================================
   * AABB COLLISION DETECTION SYSTEM
   *
   * Axis-Aligned Bounding Box with inward hitbox padding for fair "coyote margin".
   * ============================================================================
   */
  checkCollisions() {
    const pad = CONFIG.PLAYER.HITBOX_PADDING;
    const px = this.player.x + pad;
    const py = this.player.y + pad;
    const pw = this.player.w - (pad * 2);
    const ph = this.player.h - (pad * 2);

    for (const obs of this.obstacles) {
      // For triangle spikes, narrow the top hitbox slightly for extra fairness
      const obsPadX = obs.type === 'spike' ? 6 : 2;
      const obsPadY = obs.type === 'spike' ? 6 : 2;

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
    // Screen Shake Decay
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
    }

    if (this.state !== GameState.PLAYING) {
      // Update background particles even when paused/menu for alive atmosphere
      this.updateParticles(dt);
      return;
    }

    this.survivalTime += dt;

    // Smooth speed acceleration curve
    this.currentSpeed = CONFIG.SPEED.INITIAL +
      (CONFIG.SPEED.MAX - CONFIG.SPEED.INITIAL) * (1 - Math.exp(-this.score / 3200));

    // Distance & Score Increment
    const moveStep = this.currentSpeed * dt;
    this.distance += moveStep;
    this.score = this.distance / 12;

    // Speed indicator percentage
    const speedPercent = Math.min(100, Math.round(((this.currentSpeed - CONFIG.SPEED.INITIAL) / (CONFIG.SPEED.MAX - CONFIG.SPEED.INITIAL)) * 100));
    this.dom.hudScore.textContent = Math.floor(this.score);
    this.dom.hudSpeedFill.style.width = `${Math.max(10, speedPercent)}%`;

    // High score audio cue
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

      // Mid-air cube rotation
      this.player.rotation += (CONFIG.PLAYER.ROTATION_SPEED * dt) * (Math.PI / 180);

      // Ground collision resolution
      if (this.player.y + this.player.h >= this.groundY) {
        this.player.y = this.groundY - this.player.h;
        this.player.vy = 0;
        this.player.isGrounded = true;
        this.player.rotation = 0; // Snap cleanly to ground plane
        audio.playLand();
      }
    }

    // Motion Blur Trail Tracking
    this.player.trail.unshift({
      x: this.player.x,
      y: this.player.y,
      rotation: this.player.rotation,
      alpha: 0.5
    });
    if (this.player.trail.length > CONFIG.VISUALS.TRAIL_MAX_LENGTH) {
      this.player.trail.pop();
    }

    // --- Scroll Obstacles ---
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= moveStep;

      // Remove off-screen obstacles
      if (obs.x + obs.w < -60) {
        this.obstacles.splice(i, 1);
      }
    }
    this.nextSpawnX -= moveStep;

    // --- Procedural Generation Trigger ---
    this.updateProceduralGeneration();

    // --- Ground Grid Scroll ---
    this.groundOffset = (this.groundOffset + moveStep) % 40;

    // --- Collision Detection ---
    this.checkCollisions();

    // --- Particles & FX ---
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

    // Apply Screen Shake
    if (this.shakeTime > 0) {
      const shakeProgress = this.shakeTime / this.shakeDuration;
      const curIntensity = this.shakeIntensity * shakeProgress;
      const offsetX = (Math.random() - 0.5) * 2 * curIntensity;
      const offsetY = (Math.random() - 0.5) * 2 * curIntensity;
      this.ctx.translate(offsetX, offsetY);
    }

    // 1. Clear & Backdrop
    this.ctx.fillStyle = CONFIG.COLORS.BG_DARK;
    this.ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);

    // 2. Parallax Stars
    for (const star of this.bgStars) {
      const scrollX = (star.x - (this.distance * star.speedFactor)) % this.virtualWidth;
      const finalX = scrollX < 0 ? scrollX + this.virtualWidth : scrollX;
      this.ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
      this.ctx.fillRect(finalX, star.y, star.size, star.size);
    }

    // 3. Ground & Scrolling Grid
    this.renderGround();

    // 4. Obstacles
    this.renderObstacles();

    // 5. Particles
    this.renderParticles();

    // 6. Player (if not dead)
    if (this.state !== GameState.DEAD) {
      this.renderPlayer();
    }

    this.ctx.restore();
  }

  renderGround() {
    // Ground Body
    this.ctx.fillStyle = CONFIG.COLORS.GROUND_BODY;
    this.ctx.fillRect(0, this.groundY, this.virtualWidth, CONFIG.CANVAS.GROUND_HEIGHT);

    // Top Glowing Surface Line
    this.ctx.fillStyle = CONFIG.COLORS.GROUND_SURFACE;
    this.ctx.fillRect(0, this.groundY, this.virtualWidth, 4);

    // Subtle Ground Grid Lines
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
        // Red Triangle Hazard
        this.ctx.fillStyle = CONFIG.COLORS.HAZARD_SPIKE;
        this.ctx.beginPath();
        this.ctx.moveTo(obs.x + obs.w / 2, obs.y);
        this.ctx.lineTo(obs.x + obs.w, obs.y + obs.h);
        this.ctx.lineTo(obs.x, obs.y + obs.h);
        this.ctx.closePath();
        this.ctx.fill();

        // Inner highlight edge
        this.ctx.strokeStyle = '#ff6b8b';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();

      } else if (obs.type === 'block') {
        // Solid Hazard Block
        this.ctx.fillStyle = CONFIG.COLORS.HAZARD_BLOCK;
        this.ctx.fillRect(obs.x, obs.y, obs.w, obs.h);

        this.ctx.strokeStyle = '#ff6b8b';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(obs.x + 1, obs.y + 1, obs.w - 2, obs.h - 2);

        // Center Warning Icon
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(obs.x + obs.w / 2 - 2, obs.y + 10, 4, obs.h - 20);

      } else if (obs.type === 'barrier') {
        // High Ceiling Hazard
        this.ctx.fillStyle = '#9e0026';
        this.ctx.fillRect(obs.x, 0, obs.w, obs.y);
        this.ctx.fillStyle = CONFIG.COLORS.HAZARD_SPIKE;
        this.ctx.fillRect(obs.x, obs.y - 6, obs.w, 6);
      }
    }
  }

  renderPlayer() {
    // Render Fading Motion Trail
    for (let i = 0; i < this.player.trail.length; i++) {
      const t = this.player.trail[i];
      const alpha = (1 - (i / this.player.trail.length)) * 0.3;
      this.ctx.save();
      this.ctx.translate(t.x + this.player.w / 2, t.y + this.player.h / 2);
      this.ctx.rotate(t.rotation);
      this.ctx.fillStyle = `rgba(255, 159, 28, ${alpha})`;
      this.ctx.fillRect(-this.player.w / 2, -this.player.h / 2, this.player.w, this.player.h);
      this.ctx.restore();
    }

    // Render Main Cube
    this.ctx.save();
    this.ctx.translate(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2);
    this.ctx.rotate(this.player.rotation);

    // Glowing Body
    this.ctx.fillStyle = CONFIG.COLORS.PLAYER;
    this.ctx.fillRect(-this.player.w / 2, -this.player.h / 2, this.player.w, this.player.h);

    // Sharp Accent Border
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(-this.player.w / 2 + 1, -this.player.h / 2 + 1, this.player.w - 2, this.player.h - 2);

    // Eye / Visor (Arcade Personality)
    this.ctx.fillStyle = CONFIG.COLORS.PLAYER_EYE;
    this.ctx.fillRect(2, -8, 10, 8);

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

  /**
   * Main Delta-Time Loop
   */
  loop(currentTime) {
    if (!this.lastTime) this.lastTime = currentTime;

    // Delta time in seconds (clamped to prevent frame burst on tab switch)
    const rawDt = (currentTime - this.lastTime) / 1000;
    this.deltaTime = Math.min(rawDt, 0.1);
    this.lastTime = currentTime;

    this.update(this.deltaTime);
    this.render();

    requestAnimationFrame((time) => this.loop(time));
  }

  /**
   * Event Bindings
   */
  bindInputs() {
    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      // Space or ArrowUp or W: Jump/Action
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        this.handleAction();
      }

      // R: Instant Retry
      if (e.code === 'KeyR') {
        e.preventDefault();
        audio.playClick();
        this.setState(GameState.PLAYING);
        this.triggerJump();
      }

      // P or Escape: Pause / Resume
      if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        audio.playClick();
        if (this.state === GameState.PLAYING) {
          this.setState(GameState.PAUSED);
        } else if (this.state === GameState.PAUSED) {
          this.setState(GameState.PLAYING);
        }
      }

      // M: Sound Toggle
      if (e.code === 'KeyM') {
        this.toggleSound();
      }

      // F: Fullscreen Toggle
      if (e.code === 'KeyF') {
        this.toggleFullscreen();
      }
    });

    // Touch & Pointer Controls on Canvas
    const canvasWrap = document.getElementById('game-wrapper');
    canvasWrap.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.ui-overlay') && !e.target.closest('#ready-overlay')) {
        return; // Don't trigger jump when clicking overlay buttons
      }
      e.preventDefault();
      this.handleAction();
    });
  }

  bindButtons() {
    // Menu Buttons
    document.getElementById('btn-play').addEventListener('click', () => {
      audio.playClick();
      this.setState(GameState.PLAYING);
      this.triggerJump();
    });

    document.getElementById('btn-open-leaderboard').addEventListener('click', () => {
      this.openLeaderboard();
    });

    // Pause Buttons
    document.getElementById('btn-resume').addEventListener('click', () => {
      audio.playClick();
      this.setState(GameState.PLAYING);
    });
    document.getElementById('btn-pause-restart').addEventListener('click', () => {
      audio.playClick();
      this.setState(GameState.PLAYING);
      this.triggerJump();
    });
    document.getElementById('btn-pause-menu').addEventListener('click', () => {
      audio.playClick();
      this.setState(GameState.MENU);
    });

    // Death Buttons
    document.getElementById('btn-retry').addEventListener('click', () => {
      audio.playClick();
      this.setState(GameState.PLAYING);
      this.triggerJump();
    });
    document.getElementById('btn-death-leaderboard').addEventListener('click', () => {
      this.openLeaderboard();
    });
    document.getElementById('btn-death-menu').addEventListener('click', () => {
      audio.playClick();
      this.setState(GameState.MENU);
    });

    // Leaderboard Modal
    document.getElementById('btn-close-leaderboard').addEventListener('click', () => {
      audio.playClick();
      this.dom.leaderboardOverlay.classList.add('hidden');
    });

    this.dom.btnSaveName.addEventListener('click', async () => {
      audio.playClick();
      const updated = await leaderboard.setPlayerName(this.dom.playerNameInput.value);
      this.dom.playerNameInput.value = updated;
      await this.refreshLeaderboardView();
    });

    // Top Controls
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

  async openLeaderboard() {
    audio.playClick();
    this.dom.leaderboardOverlay.classList.remove('hidden');
    await this.refreshLeaderboardView();
  }

  async refreshLeaderboardView() {
    this.dom.leaderboardRows.innerHTML = '<div class="leaderboard-row" style="justify-content: center; color: var(--text-muted);">Loading rankings...</div>';
    const rows = await leaderboard.fetchTopScores(10);
    this.dom.leaderboardRows.innerHTML = '';

    rows.forEach((r) => {
      const div = document.createElement('div');
      div.className = `leaderboard-row ${r.isCurrentPlayer ? 'current-player' : ''}`;
      
      let rankClass = '';
      if (r.rank === 1) rankClass = 'gold';
      else if (r.rank === 2) rankClass = 'silver';
      else if (r.rank === 3) rankClass = 'bronze';

      div.innerHTML = `
        <div class="rank-col ${rankClass}">#${r.rank}</div>
        <div class="name-col">${this._escapeHtml(r.name)}</div>
        <div class="score-col">${r.score.toLocaleString()}</div>
      `;
      this.dom.leaderboardRows.appendChild(div);
    });
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
