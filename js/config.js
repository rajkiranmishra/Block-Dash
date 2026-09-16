/**
 * BLOCK DASH - Central Configuration & Tunable Parameters
 *
 * All core constants, physics parameters, colors, and game rules are defined here.
 * Keeping these centralized allows rapid gameplay tuning and mathematical validation.
 */

export const CONFIG = {
  // --- Virtual Coordinate Space (16:9 Aspect Ratio) ---
  CANVAS: {
    WIDTH: 960,
    HEIGHT: 540,
    GROUND_Y: 460,       // Y coordinate of the ground plane
    GROUND_HEIGHT: 80,    // Height of the ground floor
  },

  // --- Core Player Physics & Dimensions ---
  PLAYER: {
    WIDTH: 40,
    HEIGHT: 40,
    START_X: 120,        // Fixed horizontal position of player on screen
    START_Y: 420,        // Starting Y position (sitting on ground: 460 - 40)
    GRAVITY: 2100,       // Gravitational acceleration (px/s^2)
    JUMP_FORCE: -780,    // Initial vertical velocity on jump impulse (px/s)
    MAX_FALL_SPEED: 1200,// Terminal velocity to prevent tunneling (px/s)
    ROTATION_SPEED: 420, // Degrees per second rotation while in mid-air
    HITBOX_PADDING: 4,   // Inward padding (pixels) for fair collision detection
    
    // Squash / Slide parameters
    SQUASH_HEIGHT: 20,   // Height when squashing/sliding under obstacles
    SQUASH_WIDTH: 50,    // Slightly wider footprint during squash for visual weight
  },

  // --- Dash Ability Parameters ---
  DASH: {
    DURATION: 0.22,         // Dash burst duration in seconds
    SPEED_MULTIPLIER: 1.85, // Velocity multiplier during dash
    COOLDOWN: 1.2,          // Dash cooldown in seconds
  },

  // --- Speed & Dynamic Difficulty Curve ---
  SPEED: {
    INITIAL: 380,        // Starting horizontal scrolling speed (px/s)
    MAX: 780,            // Maximum scrolling speed (px/s)
    ACCELERATION: 1.8,   // Speed increase rate per 100 points
  },

  // --- Obstacle Generation & Mathematical Constraints ---
  OBSTACLES: {
    MIN_SPAWN_X_OFFSET: 120, // Spawn offset ahead of the right canvas boundary
    SAFETY_BUFFER: 65,       // Extra reaction distance buffer in px beyond minimum jump arc
    BASE_WIDTH: 40,
    BASE_HEIGHT: 40,
    FLOATING_BAR_Y: 400,     // Y coordinate for floating bars (clearance ~60px from ground: 460-400=60px; requires squash height 20px)
    FLOATING_CROSS_Y: 395,   // Y coordinate for floating hazard crosses
  },

  // --- Visual & Particle Effects ---
  VISUALS: {
    SHAKE_DURATION_DEATH: 0.45,  // Seconds of screen shake upon death
    SHAKE_INTENSITY_DEATH: 14,   // Max pixel offset during death shake
    SHAKE_DURATION_JUMP: 0.08,   // Micro-shake on jump for impact feel
    SHAKE_INTENSITY_JUMP: 2,
    SHAKE_DURATION_DASH: 0.12,   // Micro-shake on dash
    SHAKE_INTENSITY_DASH: 4,
    PARTICLE_COUNT_DEATH: 32,    // Shatter particles generated when player dies
    PARTICLE_COUNT_JUMP: 8,      // Dust particles kicked up on jump
    PARTICLE_COUNT_SQUASH: 5,    // Dust particles kicked up when sliding
    PARTICLE_COUNT_DASH: 12,     // Jet particles on dash
    TRAIL_MAX_LENGTH: 10,        // Length of motion blur trail behind player
  },

  // --- Audio Parameters ---
  AUDIO: {
    MASTER_VOLUME: 0.7,
    SFX_VOLUME: 0.8,
    MUSIC_VOLUME: 0.4,
  },

  // --- Color Palette (Dark Arcade Theme) ---
  COLORS: {
    BG_DARK: '#0b0c10',
    BG_GRID: '#14161f',
    GROUND_SURFACE: '#ff9f1c',
    GROUND_BODY: '#191b26',
    PLAYER: '#ff9f1c',
    PLAYER_EYE: '#0b0c10',
    PLAYER_TRAIL: 'rgba(255, 159, 28, 0.25)',
    PLAYER_DASH_TRAIL: 'rgba(0, 245, 212, 0.4)',
    HAZARD_SPIKE: '#ff2a55',
    HAZARD_BLOCK: '#e63946',
    HAZARD_AIR: '#ff007f',
    HAZARD_LASER: '#00f5d4',
    HAZARD_GLOW: 'rgba(255, 42, 85, 0.4)',
    TEXT_LIGHT: '#f3f4f6',
    TEXT_MUTED: '#8892b0',
    ACCENT_AMBER: '#ff9f1c',
    ACCENT_CYAN: '#00f5d4',
    ACCENT_PINK: '#ff007f',
  },

  // --- Supabase Default Config (Browser Safe) ---
  SUPABASE: {
    URL: '',      // Populate with Supabase Project URL
    ANON_KEY: '', // Populate with public anon-key (safe for frontend)
  },
};
