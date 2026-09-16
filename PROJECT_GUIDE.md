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
8. [AABB Collision Detection & Hitbox Padding](#8-aabb-collision-detection--hitbox-padding)
9. [Decoupled Action Input Architecture](#9-decoupled-action-input-architecture)
10. [Context-Aware Roast & Meme Criticism Engine](#10-context-aware-roast--meme-criticism-engine)
11. [Supabase Identity, Leaderboards & Row Level Security (RLS)](#11-supabase-identity-leaderboards--row-level-security-rls)
12. [Zero-Dependency Web Audio API Sound Synthesizer](#12-zero-dependency-web-audio-api-sound-synthesizer)
13. [VIVA QUESTIONS & TECHNICAL ANSWERS (Professor Mode)](#13-viva-questions--technical-answers-professor-mode)

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

## 8. AABB Collision Detection & Hitbox Padding

$$\text{Overlap} \iff (A_x < B_x + B_w) \land (A_x + A_w > B_x) \land (A_y < B_y + B_h) \land (A_y + A_h > B_y)$$

With $4\text{px}$ inward coyote padding on the player and $6\text{px}$ on triangular hazards.

---

## 9. Decoupled Action Input Architecture

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

## 10. Context-Aware Roast & Meme Criticism Engine

Analyzes telemetry to categorize deaths:
- `FAILED_TO_SQUASH`: Hit by floating laser without squashing.
- `DASHED_INTO_OBSTACLE`: Died while `isDashing === true`.
- `FIRST_OBSTACLE`: Died on obstacle #1.
- `REPEAT_FAILURE`: 4+ deaths to the same obstacle type.
- `ALMOST_PB`: Reached within $94\%$ of PB.

---

## 11. Supabase Identity, Leaderboards & Row Level Security (RLS)

- Anonymous authentication via `supabase.auth.signInAnonymously()`.
- RLS policy: users can only write to rows where `auth.uid() = user_id`.
- Anti-cheat sanity check: `score <= survivalTime * 120 + 200`.

---

## 12. Zero-Dependency Web Audio API Sound Synthesizer

Native Web Audio API oscillators synthesize:
- `playJump()`: Upward square frequency sweep (180Hz $\to$ 480Hz).
- `playLand()`: Low-frequency sine thud (90Hz $\to$ 30Hz).
- `playSquash()`: Downward friction slide whoosh (220Hz $\to$ 80Hz).
- `playDash()`: Sonic bandpass noise jet burst + pitch sweep.
- `playDashReady()`: High-pitch harmonic chirp.
- `playDeath()`: White-noise explosion + bitcrush crunch.

---

## 13. VIVA QUESTIONS & TECHNICAL ANSWERS (Professor Mode)

### Q1: Why did Retry previously resume near the death position?
- **Simple Answer**: The retry button changed the game state to Playing but forgot to reset the obstacle list, speed, score, and player position.
- **Technical Answer**: The FSM transitioned from `DEAD` to `PLAYING` without executing the per-run state reinitialization routine (`resetRun()`). As a result, the `obstacles` array, `distance`, `currentSpeed`, and `nextSpawnX` retained their end-of-run values, causing the player to immediately collide with active hazards at high speeds.

---

### Q2: What variables must be reset between game runs vs. persisted?
- **Simple Answer**: The player position, speed, score, obstacles, and particles must reset. Personal best, username, audio preferences, and global ranking must stay saved.
- **Technical Answer**: Per-run transient state ($x, y, v_y, \text{isSquashing}, \text{isDashing}, \text{score}, \text{speed}, \text{obstacles}, \text{particles}$) must be re-instantiated. Persistent session state ($\text{personalBest}, \text{playerName}, \text{audioMuteState}, \text{sessionAttempts}, \text{authToken}$) is stored in closure memory and `localStorage` and must never be cleared across runs.

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
