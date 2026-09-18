# BLOCK DASH — Engineering & Architectural Deep-Dive Guide
> **Tagline**: *"One button. One endless level. No excuses."*  
> **Course / Engineering Reference**: Master Guide & Viva Prep

---

## Table of Contents
1. [Core Philosophy & Architecture](#1-core-philosophy--architecture)
2. [Run Reset System & Lifecycle Purity (Retry Bug Resolution)](#2-run-reset-system--lifecycle-purity-retry-bug-resolution)
3. [Delta-Time & The Game Loop System](#3-delta-time--the-game-loop-system)
4. [Player Jump & Constant Acceleration Physics](#4-player-jump--constant-acceleration-physics)
5. [Block Squash / Slide Mechanic & Safe Expansion](#5-block-squash--slide-mechanic--safe-expansion)
6. [Dash Mechanic, Kinematics & Cooldown Balancing](#6-dash-mechanic-kinematics--cooldown-balancing)
7. [Mid-Air Obstacles & Multi-Mechanic Procedural Generation](#7-mid-air-obstacles--multi-mechanic-procedural-generation)
8. [Space Interceptor Encounter System & Finite State Machine](#8-space-interceptor-encounter-system--finite-state-machine)
9. [Predictive Targeting Kinematics vs Pure Homing](#9-predictive-targeting-kinematics-vs-pure-homing)
10. [Missile Variants & World Environmental Demolition](#10-missile-variants--world-environmental-demolition)
11. [Event Director Architecture & Safety Spacing](#11-event-director-architecture--safety-spacing)
12. [AABB Collision Detection & Hitbox Padding](#12-aabb-collision-detection--hitbox-padding)
13. [Decoupled Action Input Architecture](#13-decoupled-action-input-architecture)
14. [Context-Aware Roast & Meme Criticism Engine](#14-context-aware-roast--meme-criticism-engine)
15. [Interactive 3D Holographic Training Simulation ("Neural Matrix")](#15-interactive-3d-holographic-training-simulation-neural-matrix)
16. [Defensive Local Storage & Personal Best Architecture](#16-defensive-local-storage--personal-best-architecture)
17. [Zero-Dependency Web Audio API Sound Synthesizer](#17-zero-dependency-web-audio-api-sound-synthesizer)
18. [Responsive & Adaptive Interface System (Desktop vs Mobile)](#18-responsive--adaptive-interface-system-desktop-vs-mobile)
19. [VIVA QUESTIONS & TECHNICAL ANSWERS (Professor Mode)](#19-viva-questions--technical-answers-professor-mode)

---

## 1. Core Philosophy & Architecture

```
                    ┌────────────────────────────┐
                    │      PLAYER INPUT          │
                    │ Jump / Squash / Dash / R   │
                    └─────────────┬──────────────┘
                                  │
                                  ▼
                    ┌────────────────────────────┐
                    │    ACTION INPUT MANAGER    │
                    │ Maps Keys/Touch to Actions │
                    └─────────────┬──────────────┘
                                  │
                                  ▼
                    ┌────────────────────────────┐
                    │    FINITE STATE MACHINE    │
                    │   MENU ──► PLAY ──► DEAD   │
                    └─────────────┬──────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│ DELTA-TIME   │          │ PROCEDURAL   │          │ AABB COLLIDE │
│ PHYSICS      │          │ GENERATOR    │          │ & PARTICLES  │
│ Jump, Squash │          │ Mid-Air Bars │          │ Forgiving    │
│ & Dash Burst │          │ Multi-Actions│          │ Coyote Margin│
└───────┬──────┘          └───────┬──────┘          └───────┬──────┘
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  ▼
                    ┌────────────────────────────┐
                    │   2D CANVAS BATCH RENDER   │
                    │  Retina DPI Scaling (16:9) │
                    └────────────────────────────┘
```

The game is designed with **zero runtime overhead**, using pure vanilla HTML5, CSS3, and ES6 JavaScript.

---

## 2. Run Reset System & Lifecycle Purity (Retry Bug Resolution)

### Root Cause of the Previous Retry Bug
When a player died and pressed **RETRY** (or <kbd>SPACE</kbd> / <kbd>R</kbd>), the state machine transitioned from `DEAD` directly to `PLAYING` without executing a complete world reset.
- As a result:
  1. `this.obstacles` was not cleared, leaving existing hazards right at the player's position.
  2. `this.distance` and `this.score` were not zeroed.
  3. `this.currentSpeed` was not restored to `CONFIG.SPEED.INITIAL`, trapping the player in high late-game velocities.
  4. `this.nextSpawnX` remained offset, creating broken or instant obstacle collisions.

### Centralized Resolution: `resetRun()` & `startNewRun()`
We established a strict per-run reset boundary:

```javascript
resetRun() {
  // 1. Reset Player Physics & Dimensions
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

  // 2. Clear Active Entities
  this.obstacles = [];
  this.particles = [];
  this.groundOffset = 0;
  this.nextSpawnX = this.virtualWidth + 140;

  // 3. Reset Run Telemetry
  this.score = 0;
  this.distance = 0;
  this.survivalTime = 0;
  this.obstacleCounter = 0;
  this.currentSpeed = CONFIG.SPEED.INITIAL;
}
```

Whenever entering `PLAYING` from `MENU`, `READY`, or `DEAD`, `startNewRun()` is executed unconditionally, guaranteeing 100% state purity.

---

## 3. Delta-Time & The Game Loop System

### Purpose
To guarantee that movement, jumping, squashing, and dashing behave identically across 60Hz, 90Hz, 120Hz, and 144Hz displays.

### Formula
$$\Delta t = \min\left(\frac{t_{\text{current}} - t_{\text{last}}}{1000}, 0.1\right)$$

---

## 4. Player Jump & Constant Acceleration Physics

- Gravitational Acceleration: $g = 2100\,\text{px/s}^2$
- Jump Impulse: $v_{\text{jump}} = -780\,\text{px/s}$
- Peak Rise Time: $t_{\text{rise}} = \frac{|v_{\text{jump}}|}{g} \approx 0.3714\,\text{s}$
- Max Jump Height: $h_{\text{max}} = \frac{v_{\text{jump}}^2}{2g} \approx 144.86\,\text{px}$
- Total Air Time: $t_{\text{air}} = 2 \cdot t_{\text{rise}} \approx 0.7429\,\text{s}$

---

## 5. Block Squash / Slide Mechanic & Safe Expansion

### Hitbox Modification & Ground Anchoring
When squashing (<kbd>S</kbd>, <kbd>↓</kbd>, or lower touch screen):
- Height compresses from $40\text{px}$ to $20\text{px}$ ($50\%$ reduction).
- Width widens from $40\text{px}$ to $50\text{px}$ for tactile physical weight.
- **Ground Anchoring Math**:
  $$y = y_{\text{ground}} - h_{\text{squash}} = 460 - 20 = 440\,\text{px}$$
  The bottom edge ($y + h = 460\,\text{px}$) remains firmly pinned to the ground surface.

### Safe Uncrouch / Expansion Check (Anti-Clipping)
If the player releases the squash key while still sliding beneath a floating laser bar:
1. `hasOverheadObstacle()` tests if a $40\text{px}$ tall box at the current X position would intersect any active obstacle.
2. If blocked, `player.wantsToUnsquash = true` keeps the block squashed.
3. The instant the overhead hazard scrolls past, the block smoothly expands to full size without clipping.

---

## 6. Dash Mechanic, Kinematics & Cooldown Balancing

### Physics & Delta-Time Integration
Dash provides a brief, controlled forward acceleration burst:
- Duration: $t_{\text{dash}} = 0.22\,\text{s}$
- Speed Multiplier: $1.85\times$
- Cooldown: $t_{\text{cooldown}} = 1.2\,\text{s}$

$$\text{Effective Speed} = \begin{cases} v_{\text{current}} \cdot 1.85 & \text{if dashing} \\ v_{\text{current}} & \text{otherwise} \end{cases}$$

$$\Delta x = \text{Effective Speed} \cdot \Delta t$$

### Visual & Audio Feedback
- Neon cyan motion trail during dash.
- Forward horizontal stretch ($w \to 50\text{px}$).
- Jet particle exhaust.
- Cooldown meter on HUD with glowing ready state and chirp audio cue.

---

## 7. Mid-Air Obstacles & Multi-Mechanic Procedural Generation

### Obstacle Families
1. **Ground Spikes & Blocks**: Require **JUMP**.
2. **Floating Laser Bars & Crosses**: Suspended at $y=410$ / $y=408$ ($28\text{px}$ ground clearance). Requires **SQUASH** ($h=20\text{px}$).
3. **Energy Gates & Wide Pits**: Require **DASH** or **JUMP + DASH**.

### Progressive Difficulty Pacing
- **Score 0 – 350 (Phase 1)**: Ground Hazards only $\to$ Teaches Jump.
- **Score 350 – 900 (Phase 2)**: Introduces Floating Bars and Crosses $\to$ Teaches Squash.
- **Score 900 – 1800 (Phase 3)**: Introduces Energy Gates $\to$ Teaches Dash.
- **Score 1800+ (Phase 4)**: High-Tension Multi-Mechanic Chains (Jump $\to$ Squash $\to$ Dash).

---

---

## 8. Space Interceptor Encounter System & Finite State Machine

```
   ┌────────────────────────────────────────────────────────┐
   │             SPACE INTERCEPTOR FSM LIFECYCLE            │
   └───────────────────────────┬────────────────────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │   INACTIVE   │ (Waiting for Event Director eligibility)
                        └──────┬───────┘
                               │ Score >= 500 & Cooldown Elapsed
                               ▼
                        ┌──────────────┐
                        │ APPROACHING  │ (Fly-in from top right, radar warning chime)
                        └──────┬───────┘
                               │ Approach timer reaches 1.4s
                               ▼
                        ┌──────────────┐
                        │  TARGETING   │ (Predictive laser reticle tracks lead pos)
                        └──────┬───────┘
                               │ Targeting timer reaches 1.8s
                               ▼
                        ┌──────────────┐
                        │    LOCKED    │ (Laser locks static red, high-pitch lock tone)
                        └──────┬───────┘
                               │ Locked timer reaches 0.45s
                               ▼
                        ┌──────────────┐
                        │    FIRING    │ (Missile spawns, propulsion muzzle flash)
                        └──────┬───────┘
                               │ Missile launched
                               ▼
                        ┌──────────────┐
                        │MISSILE_ACTIVE│ (Missile travels leftwards at 640px/s)
                        └──────┬───────┘
                               │ Interceptor hyper-drives off screen (1.2s)
                               ▼
                        ┌──────────────┐
                        │   ESCAPING   │ (Exits top-left with cyan thruster exhaust)
                        └──────┬───────┘
                               │ Escape complete
                               ▼
                        ┌──────────────┐
                        │   COOLDOWN   │ (Enforces 26s cooldown + 4.5s breather)
                        └──────┬───────┘
                               │ Cooldown elapsed
                               ▼
                        ┌──────────────┐
                        │   INACTIVE   │
                        └──────────────┘
```

The Space Interceptor is an original, futuristic hunter drone constructed with an angular stealth silhouette, cyan plasma thrusters, and a pulsed crimson targeting emitter.

---

## 9. Predictive Targeting Kinematics vs Pure Homing

### The Inherent Flaw of Pure Homing
In a 2D single-lane auto-runner, a pure homing projectile that continuously turns toward the player's current coordinate creates mathematically unsolvable scenarios:
- If the player jumps, the missile turns upward.
- If the player squashes, the missile descends.
- The player has no physical dimension in which to step aside, making evasion feel like an arbitrary coin toss.

### The Predictive Targeting Formula
Instead of tracking the player's *current* position, the interceptor's onboard targeting computer estimates the player's *future intercept point* using lead-time kinematics:

$$y_{\text{target}} = y_{\text{player}} + (v_{y,\text{player}} \cdot t_{\text{lead}})$$

Where:
- $y_{\text{player}}$ = Player current vertical coordinate
- $v_{y,\text{player}}$ = Player vertical velocity (negative when rising, positive when falling)
- $t_{\text{lead}} = 0.35\,\text{s}$ (configurable in `CONFIG.INTERCEPTOR.PREDICTION_LEAD`)
- Clamped: $y_{\text{clamped}} = \max\left(260, \min(y_{\text{ground}} - 20, y_{\text{target}})\right)$

### Tactical Player Baiting & Exploitation
Because targeting locks $0.45\,\text{s}$ before firing, a skilled player can:
1. **Bait a High Lock**: Jump early during the `TARGETING` phase $\to$ Reticle locks high in mid-air $\to$ Player lands and slides safely underneath.
2. **Bait a Ground Lock**: Stay grounded during `TARGETING` $\to$ Reticle locks on the floor $\to$ Player jumps cleanly over the incoming ground rocket.

This shifts the gameplay from random panic to **observation $\to$ prediction $\to$ manipulation $\to$ execution**.

---

## 10. Missile Variants & World Environmental Demolition

### Multi-Variant Missile Types

| Missile Variant | Trajectory & Behavior | Intended Player Reaction | Difficulty Tier |
| :--- | :--- | :--- | :--- |
| **Ground Skimmer** | Fires directly along ground plane ($y \approx 425\,\text{px}$) at $640\,\text{px/s}$. | **JUMP** | Mid-game ($\text{Score} \ge 500$) |
| **High Barrier** | Fires at standing cube height ($y \approx 390\,\text{px}$) at $640\,\text{px/s}$. | **SQUASH / SLIDE** | Hard ($\text{Score} \ge 1100$) |
| **Tracking Seeker** | Nudges vertical angle toward player for first $0.35\,\text{s}$, then locks trajectory. | **DASH** / Precision Timing | Hell ($\text{Score} \ge 1800$) |

### Emergent Missile-World Interactions (Obstacle Demolition)
Missiles are dual-purpose entities: they are both lethal hazards to the player and high-yield explosive projectiles in the game world.
- If an active missile passes the player without colliding, its bounding box continues into the obstacle array.
- When an AABB overlap occurs between `missile` and `obstacle`:
  1. The obstacle is instantly shattered (`obstacle.active = false`).
  2. A vibrant particle shockwave and sound FX trigger.
  3. The player is awarded $+150$ **Obstacle Demolition Points** with a celebratory float text (`+150 DEMOLITION`).
  
Skilled speedrunners can intentionally bait interceptor missiles into clearing dense spike clusters ahead of them.

---

## 11. Event Director Architecture & Safety Spacing

To ensure the game remains brutally hard but **100% fair**, the `EventDirector` governs encounters through strict safety rules:

1. **Eligibility Filter**:
   - `score >= CONFIG.INTERCEPTOR.MIN_SCORE_FOR_EVENT` ($500\,\text{pts}$)
   - `cooldownTimer <= 0` ($26\,\text{s}$ base interval)
   - `player.isGrounded === true` (encounters never start while the player is in panic mid-air)
2. **Procedural Hazard Suppression**:
   - While the Interceptor is in `APPROACHING`, `TARGETING`, `LOCKED`, or `FIRING`, the procedural generator suspends multi-action hazard clusters, spawning only sparse single spikes or open ground.
   - Prevents impossible combinations (e.g., ground spike + floating laser + missile + gate in the same $0.5\text{s}$ window).
3. **Recovery Breather Window**:
   - After the Interceptor escapes, a $4.5\,\text{s}$ recovery window prevents dense hazard generation, allowing the player to regain rhythm.

---

## 12. AABB Collision Detection & Hitbox Padding

$$\text{Overlap} \iff (A_x < B_x + B_w) \land (A_x + A_w > B_x) \land (A_y < B_y + B_h) \land (A_y + A_h > B_y)$$

With $4\text{px}$ inward coyote padding on the player, $6\text{px}$ on triangular hazards, and $3\text{px}$ on interceptor missiles.

---

## 13. Decoupled Action Input Architecture

Physical hardware events are decoupled from gameplay logic via an Action Layer:
```
Keyboard (Space, W, Up)   ──┐
Mouse (Left Click)        ──┼──► Action: JUMP
Mobile (Upper Touch Zone) ──┘

Keyboard (S, Down)        ──┐
Mobile (Lower Touch Zone) ──┴──► Action: SQUASH (Held)

Keyboard (Shift, X)       ──┐
Mobile (Right Touch Zone) ──┴──► Action: DASH (Triggered)
```

---

## 14. Context-Aware Roast & Meme Criticism Engine

Analyzes telemetry to categorize deaths:
- `MISSILE_DEATH`: Shot down by standard hunter drone missile.
- `FAILED_TO_JUMP_MISSILE`: Hit by ground missile while standing.
- `FAILED_TO_SQUASH_MISSILE`: Hit by high missile while standing.
- `DASHED_INTO_MISSILE`: Dashed head-on into an incoming missile warhead.
- `REPEATED_MISSILE_DEATH`: 3+ deaths to the Space Interceptor.
- `FAILED_TO_SQUASH`: Hit by floating laser without squashing.
- `DASHED_INTO_OBSTACLE`: Died while `isDashing === true`.
- `FIRST_OBSTACLE`: Died on obstacle #1.
- `REPEAT_FAILURE`: 4+ deaths to the same obstacle type.
- `ALMOST_PB`: Reached within $94\%$ of PB.

---

## 15. Interactive 3D Holographic Training Simulation ("Neural Matrix")

```
   ┌────────────────────────────────────────────────────────┐
   │             NEURAL TRAINING SIMULATION STAGES          │
   └───────────────────────────┬────────────────────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │ STEP 0: BOOT │ (Calibration & Neural Link initialization)
                        └──────┬───────┘
                               │ Auto-advances after 1.4s
                               ▼
                        ┌──────────────┐
                        │ STEP 1: JUMP │ (Holographic spike approach at 300px/s)
                        └──────┬───────┘
                               │ Clear spike cleanly (Rewinds on error)
                               ▼
                        ┌──────────────┐
                        │STEP 2: SQUASH│ (Low-altitude overhead beam floating at y=410)
                        └──────┬───────┘
                               │ Slide underneath cleanly (Rewinds on uncrouch)
                               ▼
                        ┌──────────────┐
                        │ STEP 3: DASH │ (Double hazard field requiring hyper-burst)
                        └──────┬───────┘
                               │ Clear hazard with dash (Rewinds on early dash)
                               ▼
                        ┌──────────────┐
                        │STEP 4: COMBO │ (Sequential jump -> squash -> dash course)
                        └──────┬───────┘
                               │ All 3 hazards cleared sequentially
                               ▼
                        ┌──────────────┐
                        │STEP 5: LAUNCH│ (Dematerializes grid & smoothly launches live run)
                        └──────────────┘
```

### Architectural Highlights
1. **Zero Text Walls**: Players learn by hands-on movement.
2. **Rewind-on-Mistake Glitch**: If the player hits a training hazard, a cybernetic chromatic aberration glitch triggers, the obstacle smoothly rewinds back to starting position via easing interpolation, and the player is safely reset without dying or losing momentum.
3. **3D Holographic Horizon Floor**: Rendered via 2D Canvas matrix perspective projections with cyan `#00f5d4` fanning perspective lines and moving transverse grid lines.
4. **Seamless Dematerialization**: Upon clearing the combo course, the holographic grid dissolves into glowing neon cubes, and the player cube seamlessly transitions into the live endless run at full speed.
5. **Auto-Routing**: Automatically guides first-time pilots on their initial click of `PLAY NOW`, can be skipped instantly with <kbd>ESC</kbd> or `SKIP TRAINING ✕`, and is replayable at any time from the Main Menu (`TRAINING SIM`).

---

## 16. Defensive Local Storage & Personal Best Architecture

### Zero-Backend Philosophy
BLOCK DASH is fully self-contained and does not require external cloud servers, Supabase, Firebase, or user registration.

### Guaranteed Fault-Tolerant Resilience
The `StorageManager` (`js/storage.js`) protects against all browser edge cases:
- **Private / Incognito Browsing**: If `localStorage` throws `DOMException` or security errors, the engine seamlessly falls back to an in-memory `Map()`.
- **Corrupted or Negative Data**: Uses strict numeric sanitizer `_parseNonNegativeInt(val, defaultVal)`.
- **Storage Quota Exceeded**: Silently catches `QuotaExceededError` without interrupting gameplay.
- **Data Model**:
  - `blockdash_best_score`: Highest personal best score.
  - `blockdash_attempts`: Total run attempts launched.
  - `blockdash_tutorial_seen`: Boolean flag indicating completion or skip.
  - `blockdash_player_name`: Local pilot callsign (up to 16 alphanumeric characters).
  - `blockdash_stats`: Comprehensive lifetime telemetry (max survival time, missile demolitions, total score).
  - `blockdash_settings`: Master, music, SFX volumes, neon accent color.

---

## 17. Zero-Dependency Web Audio API Sound Synthesizer

Native Web Audio API oscillators synthesize:
- `playJump()`: Upward square frequency sweep (180Hz $\to$ 480Hz).
- `playLand()`: Low-frequency sine thud (90Hz $\to$ 30Hz).
- `playSquash()`: Downward friction slide whoosh (220Hz $\to$ 80Hz).
- `playDash()`: Sonic bandpass noise jet burst + pitch sweep.
- `playDashReady()`: High-pitch harmonic chirp.
- `playDeath()`: White-noise explosion + bitcrush crunch.
- `playTargetBeep(pitch)`: Progressive radar ping (440Hz $\to$ 880Hz).
- `playJetFlyby()`: High-speed Doppler swept lowpass filtered drone whoosh.
- `playMissileLaunch()`: High-pressure pneumatic ignition rocket pulse.
- `playMissileExplosion()`: Explosive resonant sub-bass blast.
- `playTutorialStep()`: High-tech progression chime ($587\text{Hz} \to 880\text{Hz}$).
- `playTutorialSuccess()`: Ascending harmonic C-E-G triad ($523\text{Hz} \to 659\text{Hz} \to 784\text{Hz}$).
- `playTutorialGlitch()`: Soft sawtooth pitch-bend glitch on training mistake.
- `playTutorialComplete()`: Resonant E major 7th chord + sub-bass pulse.
- `playNewPersonalBest()`: Triumphant victory arpeggio ($440\text{Hz} \to 1108\text{Hz}$).

---

## 18. Responsive & Adaptive Interface System (Desktop vs Mobile)

### Core Architectural Rule: One Engine, Two Adaptive Experiences
There is **only ONE source of truth** for physics, jumping, squashing, dashing, collision detection, procedural obstacle generation, scoring, difficulty curves, tutorial progression, space interceptor events, missiles, roasts, and local storage.

```
                     ┌────────────────────────────────────────┐
                     │          BLOCK DASH GAME ENGINE        │
                     │  (Physics, Obstacles, Scores, Jet, AI) │
                     └───────────────────▲────────────────────┘
                                         │
                         Unified Game Actions API
                 (jump, squash, dash, pause, retry)
                                         │
                     ┌───────────────────┴────────────────────┐
                     │              INPUT MANAGER             │
                     └─────────▲────────────────────▲─────────┘
                               │                    │
                  ┌────────────┴────────┐   ┌───────┴────────────┐
                  │    Desktop Input    │   │    Mobile Touch    │
                  │ (Keyboard, Mouse)   │   │(Tap, Squash, Dash) │
                  └─────────────────────┘   └────────────────────┘

                     ┌────────────────────────────────────────┐
                     │               UI MANAGER               │
                     └─────────┬────────────────────┬─────────┘
                               │                    │
                  ┌────────────┴────────┐   ┌───────┴────────────┐
                  │     Desktop UI      │   │     Mobile UI      │
                  │ (Cinematic, Detailed│   │(Minimal, Thumb-    │
                  │  HUD, Key Hints)    │   │ friendly, Landscape│
                  └─────────────────────┘   └────────────────────┘
```

### Feature-Based Interface Mode Detection
Rather than error-prone User-Agent regex sniffing, BLOCK DASH detects device modes using web platform capabilities:
```javascript
const prefersMobileUI = 
  window.matchMedia('(max-width: 768px)').matches ||
  window.matchMedia('(pointer: coarse)').matches;
```
When active, the engine sets `document.body.classList.add('mobile-ui')` or `desktop-ui`.

### Input Abstraction Layer (`InputManager`)
Physical inputs from keyboard, mouse, and pointer events are translated into semantic actions:
- **JUMP**: <kbd>SPACE</kbd>, <kbd>W</kbd>, <kbd>↑</kbd>, Left-Click, or Tap on the upper/mid play area.
- **SQUASH**: <kbd>S</kbd>, <kbd>↓</kbd>, or Hold on the bottom-left `▼ SQUASH` button (releases immediately on pointer up/leave/cancel).
- **DASH**: <kbd>SHIFT</kbd>, <kbd>X</kbd>, or Tap on the bottom-right `⚡ DASH` button.
- **RETRY**: <kbd>R</kbd>, <kbd>SPACE</kbd> (when dead), or Tap on the mobile `[ RETRY NOW ]` button.
- **PAUSE**: <kbd>ESC</kbd>, <kbd>P</kbd>.

### Mobile Touch Ergonomics & Ground Hazard Clearance
1. **The Ground Hazard Safe Zone Rule**: "THE UI MAY NEVER HIDE THE DANGER."
   - Ground obstacles (spikes at $y = 424$, blocks at $y = 420$, low missiles at $y = 442$) move across the screen along the ground line at $y = 460$.
   - Mobile buttons (`.touch-zone-squash` and `.touch-zone-dash`) are designed with lightweight, translucent wireframes (`opacity: 0.40`, `rgba(10, 14, 24, 0.40)`) and tucked into the absolute bottom corners.
   - Generous invisible touch hit targets ($\ge 76\text{px} \times 70\text{px}$ via `::before` pseudo-elements) allow effortless thumb interaction while keeping the visible button compact ($56\text{px} \times 44\text{px}$).
   - The entire run trajectory and ground hazard approach path remains 100% visible and unoccluded.
2. **Large Tap Jump Zone**: Covers the top 75% of the viewport with a tactile expanding neon ripple (`.touch-ripple`).
3. **Bottom-Left Hold Squash Zone**: Compact translucent pill button with squash hold safety (`pointerdown` enables squash; `pointerup`, `pointercancel`, `pointerleave`, or `releaseAllHolds()` immediately unsquashes).
4. **Bottom-Right Tap Dash Button**: Dedicated button with a circular SVG progress ring tracking cooldown ($1.2\text{s}$), dimming when cooling down, and pulsing when ready.
5. **Multitouch Safety**: Independent pointer IDs allow simultaneous actions (holding Squash with left thumb while tapping Dash with right thumb).

### Orientation Handling, Auto-Start, and Safe Resume Countdown
BLOCK DASH enforces landscape orientation for active gameplay while keeping menus, settings, and pilot records accessible in portrait:
1. **Starting in Portrait**: If a player taps `PLAY` or `TRAINING SIM` in portrait mode on mobile, the game registers a pending start (`pendingGameStart`) and displays the Cyberpunk `#rotate-prompt` (`↻ ROTATE YOUR PHONE - LANDSCAPE RECOMMENDED`). Physics is not ticked in the background.
2. **Auto-Start on Rotation**: As soon as the user rotates into landscape, the orientation listener detects the change, automatically dismisses the prompt, and launches the game/tutorial without requiring a second tap.
3. **Orientation Change During Active Gameplay**: If the device is flipped to portrait during an active run, the engine pauses delta-time updates, releases any active squash hold, and displays `GAME PAUSED // ROTATE TO CONTINUE`.
4. **Safe Resume Countdown**: Returning to landscape does not unpause instantly into an obstacle. Instead, the game presents a frozen countdown overlay (`READY... 3... 2... 1... GO!`) with audio beeps and pulsating numerals. During this countdown, physics and obstacle movements remain strictly frozen. Once the countdown completes, gameplay resumes smoothly with score, distance, player coordinates, and obstacles 100% preserved.

### Safe-Area Inset Support
All mobile HUD elements, top control bars, and touch buttons incorporate CSS safe-area insets:
`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`, `env(safe-area-inset-left)`, `env(safe-area-inset-right)` to avoid notches and home indicators.

### Visual Tuning on Mobile
To maintain locked 60+ FPS on mobile hardware:
- Background warp stars: 65 on mobile vs 120 on desktop.
- Screen shake intensity: scaled by $0.65\times$ on mobile to prevent disorientation while holding the device.
- Core physics, collision math, obstacle speeds, and jump trajectories remain 100% identical.

---

## 19. VIVA QUESTIONS & TECHNICAL ANSWERS (Professor Mode)

### Q1: Why did you not create separate mobile and desktop games?
- **Answer**: Creating separate games (`mobileGame.js` vs `desktopGame.js`) violates DRY (Don't Repeat Yourself) principles, leads to fragmented physics bugs, doubles maintenance overhead, and creates inconsistent difficulty rules. A unified game engine ensures identical gameplay mechanics while allowing the presentation and input layers to adapt dynamically.

---

### Q2: What is responsive design?
- **Answer**: Responsive design is an approach where visual layouts, typography, and UI elements scale and reposition fluidly across different viewport dimensions and screen resolutions using CSS media queries, flexbox, grid, and relative units (`clamp()`, `%`, `vh`, `vw`).

---

### Q3: What is adaptive UI?
- **Answer**: Adaptive UI goes beyond visual scaling by altering the layout structure, input mechanisms, and information density based on the capabilities of the device (e.g., displaying touch buttons and simplified HUD on coarse pointer mobile screens while rendering keyboard badges and detailed telemetry meters on desktop).

---

### Q4: What is the difference between responsive UI and game logic?
- **Answer**: Game logic is the mathematical simulation of the world (player acceleration, delta-time physics, AABB collisions, procedural hazards, scoring), which must remain completely deterministic and resolution-independent. Responsive UI is the visual presentation layer (canvas scaling, HUD layout, button sizing) that adapts to the physical display without influencing the physics space.

---

### Q5: How do keyboard and touch input control the same player?
- **Answer**: Both hardware inputs pass through a centralized `InputManager`. A keyboard press (<kbd>SPACE</kbd>) and a touchscreen tap on the upper play area emit the exact same semantic `JUMP` action, invoking the engine's `triggerJump()` method.

---

### Q6: What is input abstraction?
- **Answer**: Input abstraction is a software design pattern that decouples physical hardware signals (key codes, mouse buttons, touch coordinates) from gameplay logic. The engine responds exclusively to semantic intentions (`JUMP`, `SQUASH`, `DASH`, `RETRY`), making the core game completely agnostic to the input hardware.

---

### Q7: Why should physics not depend on screen resolution?
- **Answer**: If physics calculations used raw screen pixels, players on high-resolution screens (4K) would fall slower or travel different distances than players on mobile phones (720p). By locking the internal coordinate space to a virtual resolution ($960 \times 540$) with delta-time Euler integration, jump height and obstacle speeds are identical on every screen.

---

### Q8: How do you detect mobile interfaces?
- **Answer**: We use feature-based CSS/JS media queries checking pointer precision and viewport bounds: `window.matchMedia('(max-width: 768px), (pointer: coarse)').matches` alongside touch capability detection (`'ontouchstart' in window`).

---

### Q9: Why should you avoid relying only on user-agent detection?
- **Answer**: User-agent strings are easily spoofed, inconsistent across browsers, fail on hybrid devices (like touchscreen laptops and iPad split screens), and do not directly measure whether the user is interacting via mouse or finger touch. Feature detection directly queries actual input capabilities.

---

### Q10: Why is landscape preferred for BLOCK DASH?
- **Answer**: BLOCK DASH is a horizontal side-scrolling runner where obstacles travel from right to left. A landscape aspect ratio provides a wider horizontal field of view, giving players the necessary reaction window ($0.70\text{s}-1.0\text{s}$) to perceive and clear fast-moving hazards.

---

### Q11: How does the game handle device rotation?
- **Answer**: If a mobile player rotates to portrait during active gameplay, the engine displays a `#rotate-prompt` overlay and pauses delta-time updates (freezing the simulation). Rotating back to landscape hides the prompt, resizes the canvas, and resumes gameplay smoothly without resetting score or player position.

---

### Q12: What is CSS media query?
- **Answer**: A CSS media query is a stylesheet rule (`@media (...)`) that applies specific CSS styles only when the browser environment matches specified criteria, such as viewport width (`max-width: 768px`), pointer precision (`pointer: coarse`), or motion preferences (`prefers-reduced-motion`).

---

### Q13: What is pointer: coarse?
- **Answer**: `pointer: coarse` is a CSS media feature that evaluates to true when the primary pointing device has limited accuracy, such as a human finger on a touchscreen, as opposed to `pointer: fine` for a high-precision mouse or stylus.

---

### Q14: What are safe-area insets?
- **Answer**: Safe-area insets (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`, etc.) are CSS environment variables provided by mobile operating systems that define the non-obstructed rectangular area of the display, preventing UI buttons from being clipped by hardware camera notches or home gesture bars.

---

### Q15: Why are mobile buttons larger?
- **Answer**: Mobile touch interaction relies on thumbs and fingers, which lack the sub-pixel precision of a mouse cursor. Following mobile ergonomics (Fitts's Law and Apple/Google Human Interface Guidelines), interactive touch targets must be at least $44\text{px} - 58\text{px}$ to prevent missed inputs during fast gameplay.

---

### Q16: Why are some visual effects reduced on mobile?
- **Answer**: Mobile GPUs have thermal, battery, and fill-rate constraints. Reducing decorative background star counts (65 vs 120) and particle counts conserves GPU fill-rate, ensuring frame times never exceed $16.6\text{ms}$ ($60\text{ FPS}$).

---

### Q17: Does reducing visual effects change gameplay difficulty?
- **Answer**: **NO**. Visual tuning modifies only background aesthetics (star counts, particle life, screen shake amplitude). All physical player attributes (jump velocity, gravity, hitbox sizes, squash clearance, dash multipliers, obstacle speeds, and procedural spacing) remain 100% identical.

---


