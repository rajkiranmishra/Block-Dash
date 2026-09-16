# BLOCK DASH — Engineering & Architectural Deep-Dive Guide
> **Tagline**: *"One button. One endless level. No excuses."*  
> **Course / Engineering Reference**: Master Guide & Viva Prep

---

## Table of Contents
1. [Core Philosophy & Architecture](#1-core-philosophy--architecture)
2. [Delta-Time & The Game Loop System](#2-delta-time--the-game-loop-system)
3. [Player Jump & Constant Acceleration Physics](#3-player-jump--constant-acceleration-physics)
4. [AABB Collision Detection & Hitbox Padding](#4-aabb-collision-detection--hitbox-padding)
5. [Constraint-Aware Procedural Generation & Reachability Math](#5-constraint-aware-procedural-generation--reachability-math)
6. [Dynamic Difficulty Scaling Curves](#6-dynamic-difficulty-scaling-curves)
7. [Context-Aware Roast & Meme Criticism Engine](#7-context-aware-roast--meme-criticism-engine)
8. [Supabase Identity, Leaderboards & Row Level Security (RLS)](#8-supabase-identity-leaderboards--row-level-security-rls)
9. [Zero-Dependency Web Audio API Sound Synthesizer](#9-zero-dependency-web-audio-api-sound-synthesizer)
10. [VIVA QUESTIONS & TECHNICAL ANSWERS (Professor Mode)](#10-viva-questions--technical-answers-professor-mode)

---

## 1. Core Philosophy & Architecture

```
                    ┌────────────────────────────┐
                    │      PLAYER INPUT          │
                    │ (Space / Tap / Click / R)  │
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
│ vy += g * dt │          │ Jump Math &  │          │ Forgiving    │
│ y += vy * dt │          │ Safe Gaps    │          │ Coyote Margin│
└───────┬──────┘          └───────┬──────┘          └───────┬──────┘
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  ▼
                    ┌────────────────────────────┐
                    │   2D CANVAS BATCH RENDER   │
                    │  Retina DPI Scaling (16:9) │
                    └────────────────────────────┘
```

The game is designed with **zero runtime overhead**, using pure vanilla HTML5, CSS3, and ES6 JavaScript. This eliminates framework bloat, guarantees 120+ FPS canvas rendering across all modern displays, and makes every mathematical equation transparent.

---

## 2. Delta-Time & The Game Loop System

### Purpose
To ensure that gameplay, player physics, and obstacle scrolling run at the **exact same physical speed** regardless of whether the user plays on a 60 Hz, 90 Hz, 120 Hz, or 144 Hz display.

### Relevant File & Functions
- **File**: [`js/game.js`](file:///Users/rajkiranmishra/Block-Dash/js/game.js)
- **Functions**: `loop(currentTime)`, `update(dt)`

### Algorithm & Formula
$$\Delta t = \min\left(\frac{t_{\text{current}} - t_{\text{last}}}{1000}, 0.1\right)$$

- We measure elapsed time since the previous frame in seconds.
- We **clamp** $\Delta t$ to a maximum of $0.1\text{s}$ (100ms) to prevent the *"Spiral of Death"* — an issue where switching browser tabs causes a massive $\Delta t$ surge, teleporting the player directly through the floor or into obstacles.

### Why Not `setInterval` or `setTimeout`?
- `setInterval` is bound to the JavaScript event loop and timer resolution, leading to stutter, dropped frames, and unsynchronized screen refreshes.
- `requestAnimationFrame` tells the browser to execute the update immediately before the next display V-Sync refresh cycle, saving battery and eliminating screen tearing.

---

## 3. Player Jump & Constant Acceleration Physics

### Purpose
Simulates gravity and instantaneous vertical impulse to produce a snappy, satisfying parabolic jump arc.

### Relevant File & Functions
- **File**: [`js/game.js`](file:///Users/rajkiranmishra/Block-Dash/js/game.js), [`js/config.js`](file:///Users/rajkiranmishra/Block-Dash/js/config.js)
- **Functions**: `triggerJump()`, `update(dt)`

### Physical Equations of Motion (Euler Integration)
$$v_y(t + \Delta t) = \min(v_y(t) + g \cdot \Delta t, v_{\text{terminal}})$$
$$y(t + \Delta t) = y(t) + v_y(t) \cdot \Delta t$$

Where:
- $g = 2100\,\text{px/s}^2$ (Gravitational Acceleration)
- $v_{\text{jump}} = -780\,\text{px/s}$ (Upward Jump Impulse)
- $v_{\text{terminal}} = 1200\,\text{px/s}$ (Terminal Velocity)

### Key Mathematical Derivations
1. **Rise Time to Peak**:
   $$t_{\text{rise}} = \frac{|v_{\text{jump}}|}{g} = \frac{780}{2100} \approx 0.3714\,\text{s}$$
2. **Maximum Jump Height ($h_{\text{max}}$)**:
   $$h_{\text{max}} = \frac{v_{\text{jump}}^2}{2g} = \frac{780^2}{2 \times 2100} = \frac{608400}{4200} \approx 144.86\,\text{px}$$
3. **Total Air Time ($t_{\text{air}}$)**:
   $$t_{\text{air}} = 2 \times t_{\text{rise}} \approx 0.7429\,\text{s}$$

---

## 4. AABB Collision Detection & Hitbox Padding

### Purpose
To detect physical overlap between the player cube and ground hazards with maximum computational efficiency.

### Relevant File & Functions
- **File**: [`js/game.js`](file:///Users/rajkiranmishra/Block-Dash/js/game.js)
- **Function**: `checkCollisions()`

### How AABB (Axis-Aligned Bounding Box) Works
Two rectangles $A$ and $B$ overlap if and only if they overlap on both the X-axis and Y-axis simultaneously:
$$\text{Overlap} \iff (A_x < B_x + B_w) \land (A_x + A_w > B_x) \land (A_y < B_y + B_h) \land (A_y + A_h > B_y)$$

### The "Coyote Margin" / Hitbox Inset
Standard pixel-exact bounding boxes feel unfair to players because human visual perception perceives clipping the outer edge of a corner as a "near-miss" rather than a true collision.
- We apply an **inward hitbox padding** ($4\text{px}$ on the player, $6\text{px}$ on triangular spikes).
- This ensures close calls feel thrilling and fair, while genuine mistakes remain fatal.

---

## 5. Constraint-Aware Procedural Generation & Reachability Math

### Purpose
To generate endless, non-repeating obstacle combinations while ensuring that **every single jump is mathematically possible**.

### Philosophy
> *"The game is allowed to hate you. The game is not allowed to cheat."*

### Reachability Formula
At scrolling speed $v_{\text{speed}}$, the player's maximum horizontal distance traversed during a single jump is:
$$D_{\text{reach}} = v_{\text{speed}} \cdot t_{\text{air}}$$

The **Minimum Safe Gap** between two consecutive hazards is:
$$\text{MinSafeGap} = (v_{\text{speed}} \cdot t_{\text{air}} \cdot 0.72) + w_{\text{player}} + \text{SafetyBuffer}$$

If the generator randomly selects a pattern, it guarantees that the distance to the next hazard is never less than $\text{MinSafeGap}$.

---

## 6. Dynamic Difficulty Scaling Curves

### Speed Acceleration Formula
Rather than unbounded linear growth, speed scales smoothly using an exponential decay curve:
$$v(s) = v_{\text{initial}} + (v_{\text{max}} - v_{\text{initial}}) \cdot \left(1 - e^{-s / 3200}\right)$$

Where $s$ is the player's current score.

```
Speed (px/s)
 760 ┼──────────────────────────────────── MAX SPEED
     │                              ╭─────
     │                        ╭─────
     │                  ╭─────
 380 ┼────────────╭─────                   INITIAL SPEED
     └────────────┬─────────────┬─────────► Score
     0           1000          3000
```

---

## 7. Context-Aware Roast & Meme Criticism Engine

### Purpose
To replace generic "Game Over" screens with a sarcastic, context-aware AI critique of the player's specific failure.

### Relevant File
- **File**: [`js/roast.js`](file:///Users/rajkiranmishra/Block-Dash/js/roast.js)

### Classification Decision Tree
```
                         ┌───────────────────────┐
                         │      PLAYER DIES      │
                         └───────────┬───────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
        Is score > PB?                         survivalTime < 1.8s?
         ├── YES ──► [NEW_PB]                   ├── YES ──► [INSTANT_DEATH]
         └── NO                                 └── NO
                 │                                       │
                 ▼                                       ▼
        score >= 0.94 * PB?                    obstacleIndex <= 1?
         ├── YES ──► [ALMOST_PB]                ├── YES ──► [FIRST_OBSTACLE]
         └── NO                                 └── NO
                 │                                       │
                 ▼                                       ▼
        killCount(type) >= 4?                  consecutiveFastDeaths >= 3?
         ├── YES ──► [REPEAT_FAILURE]           ├── YES ──► [RAGE_STREAK]
         └── NO ──► [NORMAL_DEATH]              └── NO ──► [NORMAL_DEATH]
```

### Anti-Repetition Buffer
An LRU (Least Recently Used) queue tracks the last 12 roast IDs. When selecting a line from a category pool, recently shown lines are filtered out to ensure variety across rapid retries.

---

## 8. Supabase Identity, Leaderboards & Row Level Security (RLS)

### Authentication & Storage
- **Anonymous Authentication**: `supabase.auth.signInAnonymously()` creates a persistent UUID in browser `localStorage` without requiring email passwords.
- **Row Level Security (RLS)**: Enforces that players can only `INSERT` and `UPDATE` records where `auth.uid() = user_id`.

### Anti-Cheat Strategy & Heuristics
1. **Frontend Sanity Check**: `score <= survivalTime * 120 + 200`. Discards artificially injected memory scores.
2. **PostgreSQL Check Constraints**: Validates score ranges and sanitizes display names to alphanumeric callsigns.
3. **Graceful Degradation**: If Supabase is unconfigured or the network drops, the game switches seamlessly to `localStorage` without error.

---

## 9. Zero-Dependency Web Audio API Sound Synthesizer

### Purpose
Generates procedural sound waves in real-time via the browser's native `AudioContext`.

### Why This Beats Static Audio Files:
1. **Zero Asset 404s**: No missing `.mp3` or `.wav` network errors.
2. **Zero Audio Latency**: Synthesized instantaneously without decoding lag.
3. **Dynamic Pitch Modulation**: Frequencies can slide dynamically based on gameplay velocity.

---

## 10. VIVA QUESTIONS & TECHNICAL ANSWERS (Professor Mode)

### Q1: What is `requestAnimationFrame`, and why is it superior to `setInterval`?
- **Simple Answer**: `requestAnimationFrame` tells the browser to update the screen right before drawing the next frame, making the game smooth and saving battery.
- **Technical Answer**: `requestAnimationFrame` synchronizes the game loop with the display's native refresh rate (V-Sync). Unlike `setInterval`, which fires on a crude timer regardless of display hardware and can cause dropped frames or stutter, `rAF` automatically pauses when the tab is minimized, preventing background CPU exhaustion and memory buildup.

---

### Q2: Why is Delta-Time necessary in game physics?
- **Simple Answer**: Without delta-time, the game runs twice as fast on a 120 Hz monitor as it does on a 60 Hz monitor.
- **Technical Answer**: Delta-time ($\Delta t$) is the elapsed time between the current frame and the previous frame in seconds. By multiplying acceleration and velocity by $\Delta t$, we convert per-frame calculations into time-integrated physical units ($\text{pixels}/\text{second}$ and $\text{pixels}/\text{second}^2$), making movement completely frame-rate independent.

---

### Q3: How does AABB collision detection work, and what is its computational complexity?
- **Simple Answer**: It checks if two non-rotated boxes overlap horizontally and vertically.
- **Technical Answer**: Axis-Aligned Bounding Box (AABB) checks four planar inequality conditions:
  $$A_x < B_x + B_w \land A_x + A_w > B_x \land A_y < B_y + B_h \land A_y + A_h > B_y$$
  Because our game entities are aligned with the coordinate axes (no free-form polygon rotations on hitboxes), this runs in $O(1)$ constant time per obstacle, and $O(N)$ for $N$ on-screen obstacles.

---

### Q4: How do you mathematically guarantee that procedural obstacle generation never creates an impossible jump?
- **Simple Answer**: We calculate how high and far the cube can jump, and make sure the gap between hazards is always larger than the minimum landing space.
- **Technical Answer**: We solve the kinematic trajectory equations for our constant gravity model ($g$) and jump impulse ($v_0$). Air time is $t_{\text{air}} = \frac{2|v_0|}{g}$. Horizontal reach is $D = v_{\text{speed}} \cdot t_{\text{air}}$. The procedural generator enforces that the spacing between consecutive obstacles $S \ge D \times 0.72 + w_{\text{player}} + \text{Buffer}$. Any generated pattern that violates this inequality is rejected before spawning.

---

### Q5: Why can't a static website hosted on GitHub Pages maintain a secure global leaderboard by itself?
- **Simple Answer**: GitHub Pages is purely static hosting (HTML/CSS/JS files) and has no backend server or database to store and verify scores from other players.
- **Technical Answer**: GitHub Pages serves static client-side files over HTTP with no persistent writeable database or server-side execution environment. To maintain a global leaderboard, clients must communicate with a remote database service (like Supabase PostgreSQL) via authenticated API calls.

---

### Q6: What is the difference between Authentication and Authorization in Supabase?
- **Simple Answer**: Authentication proves *who you are*. Authorization decides *what you are allowed to do*.
- **Technical Answer**: Authentication verifies identity (e.g., generating an anonymous or email JWT token with a unique `auth.uid()`). Authorization is enforced via PostgreSQL Row Level Security (RLS) policies, which evaluate the user's JWT claims to determine whether they have permission to `SELECT`, `INSERT`, `UPDATE`, or `DELETE` specific rows.

---

### Q7: Why must the Supabase `service_role` key never appear in frontend code?
- **Simple Answer**: Because anyone could open DevTools, copy the key, and delete the entire database.
- **Technical Answer**: The `service_role` key bypasses all PostgreSQL Row Level Security (RLS) policies and grants full superuser administrative access. Frontend JavaScript is completely visible to client browsers; only the public `anon` key (which is restricted by RLS) may be exposed.

---

### Q8: What is a Finite State Machine (FSM), and why is it cleaner than boolean flags?
- **Simple Answer**: An FSM ensures the game can only be in one distinct mode at a time (like Playing, Paused, or Dead) instead of having a mess of `isDead`, `isPaused`, `isPlaying` variables.
- **Technical Answer**: An FSM is a mathematical model of computation consisting of a defined set of discrete states, an initial state, and transition rules. It guarantees state exclusivity ($S \in \{\text{BOOT}, \text{MENU}, \text{READY}, \text{PLAYING}, \text{PAUSED}, \text{DEAD}\}$), eliminating conflicting impossible states (e.g., `isPlaying === true && isDead === true`).
