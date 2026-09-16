/**
 * BLOCK DASH - Central Configuration & Tunable Parameters
 *
 * All core constants, physics parameters, colors, and game rules are defined here.
 * Keeping these centralized allows rapid gameplay tuning and mathematical validation.
 */

export const CONFIG = {
  // --- Virtual Coordinate Space (16:9 Aspect Ratio) ---
  // The internal rendering engine always operates on this fixed coordinate space.
  // The canvas automatically scales to fit the player's viewport while preserving this ratio.
  CANVAS: {
    WIDTH: 960,
    HEIGHT: 540,
    GROUND_Y: 460,       // Y coordinate of the ground plane
    GROUND_HEIGHT: 80,    // Height of the ground floor
  },

  // --- Core Player Physics ---
  // All units are expressed in pixels per second or pixels per second squared.
  PLAYER: {
    WIDTH: 40,
    HEIGHT: 40,
    START_X: 120,        // Fixed horizontal position of player on screen
    START_Y: 420,        // Starting Y position (sitting exactly on ground: 460 - 40)
    GRAVITY: 2100,       // Gravitational acceleration (px/s^2)
    JUMP_FORCE: -780,    // Initial vertical velocity on jump impulse (px/s)
    MAX_FALL_SPEED: 1200,// Terminal velocity to prevent tunneling through ground (px/s)
    ROTATION_SPEED: 420, // Degrees per second rotation while in mid-air
    HITBOX_PADDING: 4,   // Inward padding (pixels) for forgiving, fair collision detection
  },

  // --- Speed & Dynamic Difficulty Curve ---
  // Horizontal speed increases smoothly as score increases.
  SPEED: {
    INITIAL: 380,        // Starting horizontal scrolling speed (px/s)
    MAX: 760,            // Maximum scrolling speed (px/s)
    ACCELERATION: 1.8,   // Speed increase rate per 100 points
  },

  // --- Obstacle Generation & Mathematical Constraints ---
  OBSTACLES: {
    MIN_SPAWN_X_OFFSET: 100, // Spawn offset ahead of the right canvas boundary
    SAFETY_BUFFER: 60,       // Extra reaction distance buffer in px beyond minimum jump arc
    BASE_WIDTH: 40,
    BASE_HEIGHT: 40,
    TALL_HEIGHT: 80,
    MAX_CONSECUTIVE_HAZARDS: 3,
  },

  // --- Visual & Particle Effects ---
  VISUALS: {
    SHAKE_DURATION_DEATH: 0.45,  // Seconds of screen shake upon death
    SHAKE_INTENSITY_DEATH: 14,   // Max pixel offset during death shake
    SHAKE_DURATION_JUMP: 0.08,   // Micro-shake on jump for impact feel
    SHAKE_INTENSITY_JUMP: 2,
    PARTICLE_COUNT_DEATH: 32,    // Shatter particles generated when player dies
    PARTICLE_COUNT_JUMP: 8,      // Dust particles kicked up on jump
    TRAIL_MAX_LENGTH: 8,         // Length of motion blur trail behind player
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
    HAZARD_SPIKE: '#ff2a55',
    HAZARD_BLOCK: '#e63946',
    HAZARD_GLOW: 'rgba(255, 42, 85, 0.4)',
    TEXT_LIGHT: '#f3f4f6',
    TEXT_MUTED: '#8892b0',
    ACCENT_AMBER: '#ff9f1c',
    ACCENT_CYAN: '#00f5d4',
  },

  // --- Supabase Default Config (Browser Safe) ---
  SUPABASE: {
    URL: '',      // Populate with Supabase Project URL
    ANON_KEY: '', // Populate with public anon-key (safe for frontend)
  },
};
