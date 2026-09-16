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
18. [VIVA QUESTIONS & TECHNICAL ANSWERS (Professor Mode)](#18-viva-questions--technical-answers-professor-mode)

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
2. **Floating Laser Bars & Crosses**: Suspended at $y=400$ ($38\text{px}$ ground clearance). Requires **SQUASH** ($h=20\text{px}$).
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

## 18. VIVA QUESTIONS & TECHNICAL ANSWERS (Professor Mode)

### Q1: Why did Retry previously resume near the death position?
- **Simple Answer**: The retry button changed the game state to Playing but forgot to reset the obstacle list, speed, score, and player position.
- **Technical Answer**: The FSM transitioned from `DEAD` to `PLAYING` without executing the per-run state reinitialization routine (`resetRun()`). As a result, the `obstacles` array, `distance`, `currentSpeed`, and `nextSpawnX` retained their end-of-run values, causing the player to immediately collide with active hazards at high speeds.

---

### Q2: What variables must be reset between game runs vs. persisted?
- **Simple Answer**: The player position, speed, score, obstacles, and particles must reset. Personal best, username, audio preferences, and global ranking must stay saved.
- **Technical Answer**: Per-run transient state ($x, y, v_y, \text{isSquashing}, \text{isDashing}, \text{score}, \text{speed}, \text{obstacles}, \text{particles}, \text{interceptorState}, \text{missiles}$) must be re-instantiated. Persistent session state ($\text{personalBest}, \text{playerName}, \text{audioMuteState}, \text{sessionAttempts}, \text{authToken}$) is stored in closure memory and `localStorage` and must never be cleared across runs.

---

### Q3: How does the Squash hitbox work, and why is the bottom of the player anchored?
- **Simple Answer**: When you squash, the cube gets cut in half from the top down so its feet stay on the floor.
- **Technical Answer**: The player's bounding box height is reduced from $40\text{px}$ to $20\text{px}$. To prevent the player from floating in mid-air, we anchor the Y coordinate to the ground surface: $y = y_{\text{ground}} - h$. The bottom edge $y + h \equiv y_{\text{ground}}$ remains constant, maintaining continuous ground collision contact.

---

### Q4: How do you prevent the block from expanding inside an obstacle?
- **Simple Answer**: When you let go of the squash key, the game checks if there is a hazard above your head. If there is, you stay squashed until you slide out from under it.
- **Technical Answer**: When `endSquash()` fires, `hasOverheadObstacle()` tests a hypothetical full-size AABB ($40\text{px} \times 40\text{px}$) against all active obstacles. If an intersection is detected, `player.wantsToUnsquash = true` defers expansion until the frame where `hasOverheadObstacle() === false`.

---

### Q5: How does Dash work, and why does it need a cooldown?
- **Simple Answer**: Dash gives you a quick speed burst to cross dangerous gaps, but has a cooldown so you cannot spam it to bypass the game.
- **Technical Answer**: Dash multiplies effective scrolling speed by $1.85\times$ for $0.22\text{s}$ using delta-time integration. A $1.2\text{s}$ cooldown timer prevents trivialization of reaction windows, converting the ability into a high-risk, high-reward tactical choice.

---

### Q6: How is Dash made independent of monitor refresh rate?
- **Simple Answer**: We use delta-time timers instead of counting frames.
- **Technical Answer**: Dash duration and cooldown decrement by $\Delta t$ ($\text{seconds per frame}$) rather than a fixed frame count. At 60Hz ($\Delta t \approx 0.0166\text{s}$) or 144Hz ($\Delta t \approx 0.0069\text{s}$), the physical duration remains exactly $0.22\text{s}$ and $1.2\text{s}$.

---

### Q7: How does procedural generation validate multi-action obstacle combinations?
- **Simple Answer**: The game calculates the exact distance needed to jump, squash, or dash, and guarantees that consecutive obstacles always leave enough room to react and transition.
- **Technical Answer**: Kinematic formulas compute minimum spatial separation:
  $$S_{\text{safe}} = (v_{\text{speed}} \cdot t_{\text{air}} \cdot 0.70) + w_{\text{player}} + \text{Buffer}$$
  If a pattern introduces an overhead floating bar immediately after a high jump before the player can land ($t < t_{\text{air}}$), the generator rejects the combination via rejection sampling and chooses a valid sequence.

---

### Q8: Why separate hardware keys from gameplay actions in the input system?
- **Simple Answer**: It allows desktop keys, mouse clicks, and mobile touch buttons to control the same game actions without duplicating code.
- **Technical Answer**: The Action Pattern establishes an abstraction layer between input sources (Keyboard events, Pointer events, Touch coordinates) and gameplay state handlers (`triggerJump()`, `startSquash()`, `triggerDash()`), allowing seamless cross-platform input mapping and testability.

---

### Q9: Why does the Space Interceptor use predictive targeting instead of perfect homing?
- **Simple Answer**: Perfect homing missiles follow you no matter what you do, which makes dodging impossible in a 2D running game. Predictive targeting calculates where you will be, so smart players can fake out the drone and dodge.
- **Technical Answer**: In a constrained 2D plane, continuous homing removes player agency because changing position does not create an evasion vector. Predictive targeting ($y_{\text{target}} = y_{\text{pos}} + v_y \cdot t_{\text{lead}}$) locks trajectory before launch, rewarding players who recognize the telegraph and intentionally bait the targeting reticle into bad angles.

---

### Q10: How is the Interceptor implemented without messy boolean flags?
- **Simple Answer**: We use a clear 8-state machine where the drone can only be in one state at a time (Approaching, Targeting, Locked, Firing, Escaping, etc.).
- **Technical Answer**: The interceptor lifecycle is governed by an explicit Finite State Machine (FSM) enum (`INACTIVE`, `APPROACHING`, `TARGETING`, `LOCKED`, `FIRING`, `MISSILE_ACTIVE`, `ESCAPING`, `COOLDOWN`). Each state has strictly defined enter/update/exit transitions driven by delta-time timers, eliminating race conditions and state desynchronization.

---

### Q11: How does the Event Director prevent impossible hazard combinations?
- **Simple Answer**: The game director tells the ground obstacle spawner to take a break while the interceptor is attacking, so you don't get trapped by three hazards at once.
- **Technical Answer**: The `EventDirector` coordinates with the procedural generator. During active interceptor phases, complex multi-action hazard generation is throttled, permitting only low-density ground hazards. Furthermore, a $4.5\text{s}$ post-escape recovery window prevents immediate high-density obstacle bursts.

---

### Q12: How does emergent missile-obstacle demolition work, and why is it good game design?
- **Simple Answer**: If you dodge a missile, it can crash into a spike ahead of you and blow it up, giving you extra points.
- **Technical Answer**: Missiles maintain active AABB collision checks against the obstacle collection. On intersection, both the missile and target obstacle detonate, granting $+150$ bonus points. This transforms the missile from a pure threat into a tactical risk/reward tool for skilled players.

---

### Q13: How does the game render the Space Interceptor without 3D library performance overhead?
- **Simple Answer**: It draws the futuristic spaceship directly on the 2D canvas with crisp geometric vector paths, glowing engine trails, and targeting lasers at a buttery 60+ FPS.
- **Technical Answer**: The craft is rendered procedurally via Canvas 2D path transforms (`ctx.save()`, `ctx.beginPath()`, `ctx.lineTo()`, `ctx.arc()`, `ctx.restore()`) using hardware-accelerated 2D canvas blending. This delivers high-fidelity futuristic visuals with zero WebGL draw-call or memory overhead.

---

### Q14: How does the Interactive Tutorial teach players without walls of text?
- **Simple Answer**: It drops the player into a holographic matrix with one action at a time (Jump $\to$ Squash $\to$ Dash). If you make a mistake, it rewinds the obstacle like a glitch without killing you so you can try again immediately.
- **Technical Answer**: The tutorial runs on a dedicated sub-state machine (`BOOT`, `JUMP`, `SQUASH`, `DASH`, `COMBO`, `COMPLETE`) with holographic obstacle spawns moving at a calibrated $300\,\text{px/s}$. A collision triggers a non-lethal `REWIND` sub-state that applies a chromatic aberration glitch effect, rewinds obstacle position via linear interpolation, and resets player orientation without death screen disruption.

---

### Q15: How does the game guarantee offline persistence without crashing in private browsing mode?
- **Simple Answer**: We wrap `localStorage` in a safe Storage Manager that catches errors and uses an in-memory Map fallback if the browser blocks cookies or storage.
- **Technical Answer**: The `StorageManager` executes a pre-flight probe (`_checkStorageAvailability()`). All read/write operations (`_rawGet`, `_rawSet`) are shielded in `try/catch` blocks. If `localStorage` is disabled or throws a `QuotaExceededError`, operations divert to an in-memory `Map()`. Data inputs undergo strict type coercion (`_parseNonNegativeInt`, `_parseBool`), preventing `NaN` or `null` corruption.

---

### Q16: How does the tutorial seamlessly transition into the live endless run?
- **Simple Answer**: When you clear the final combo stage, the holographic grid fades away and the cube transitions directly into the endless runner without loading screens.
- **Technical Answer**: Stage 5 triggers a dematerialization phase (`dematerializeAlpha` fading over $1.6\,\text{s}$), sets `tutorialSeen = true` in storage, plays a resonant harmonic chord, and calls `startNewRun()` directly while preserving spatial cube position.

