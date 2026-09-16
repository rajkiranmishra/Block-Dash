# BLOCK DASH — System Architecture & Technical Specifications

> **System Overview**: High-Performance, Zero-Dependency HTML5 Canvas Arcade Engine with Delta-Time Physics, Squash & Dash Mechanics, Mid-Air Hazards, Space Interceptor Encounter Director, Predictive Targeting, Context-Aware Failure Analytics, Interactive 3D Holographic Training Simulation, and Defensive Client-Side Storage.

---

## 1. System Component Diagram

```mermaid
graph TD
    subgraph Browser Client [Client Runtime]
        HTML[index.html: Canvas, HUD, 3D Tutorial HUD & Modals]
        CSS[css/style.css: Arcade Styling, CRT, Hologram Glows]
        
        subgraph Input Layer [Action Input Layer]
            INP[bindActionInputs: Keyboard + Mobile Touch Zones]
        end

        subgraph Engine Modules [ES6 Modular Engine]
            CFG[js/config.js: Tunable Constants & Tutorial Settings]
            AUD[js/audio.js: Web Audio Synth: Jump, Dash, Missiles, Tutorial Chimes]
            ROAST[js/roast.js: Multi-Mechanic Roast Engine]
            STRG[js/storage.js: Defensive Local Persistence & Stats Layer]
            LDR[js/leaderboard.js: Local Records Wrapper]
            
            subgraph Game Engine [js/game.js Core]
                DIR[Event Director: Pacing & Safety]
                FSM[Game FSM: Intro, Menu, Tutorial, Play, Dead]
                PHYS[Delta-Time Euler Physics & Jump/Squash/Dash]
                TUT[Interactive 3D Holographic Training Simulation]
                INT[Space Interceptor FSM & Predictive Targeting]
                PROC[Procedural Generator & Rejection Sampling]
                COLL[AABB Collision & Environmental Demolition]
            end
        end
    end

    HTML --> INP
    INP --> FSM
    CSS --> HTML
    CFG --> Game Engine
    CFG --> STRG
    CFG --> AUD
    AUD --> Game Engine
    ROAST --> Game Engine
    STRG --> LDR
    STRG --> Game Engine
    LDR --> Game Engine
```

---

## 2. Finite State Machines (FSM)

### A. Game Level FSM
```mermaid
stateDiagram-v2
    [*] --> INTRO_IDLE: Click to Enter
    INTRO_IDLE --> INTRO_WARP: Trigger Starfield Warp
    INTRO_WARP --> INTRO_SLAM: Block Spins In
    INTRO_SLAM --> MENU: Ground Slammed
    MENU --> TUTORIAL: First Launch / Training Sim Click
    TUTORIAL --> PLAYING: Complete / Skip Training
    MENU --> PLAYING: startNewRun() (Repeat Player)
    PLAYING --> PAUSED: Press P / ESC
    PAUSED --> PLAYING: Press Resume / P
    PAUSED --> MENU: Return to Menu
    PLAYING --> DEAD: AABB Hazard / Missile Collision
    DEAD --> PLAYING: startNewRun() (Instant Retry <16ms)
    DEAD --> MENU: Return to Menu
```

### B. Interactive 3D Tutorial Lifecycle
```mermaid
stateDiagram-v2
    [*] --> STEP_0_BOOT: Calibration & Neural Link
    STEP_0_BOOT --> STEP_1_JUMP: Motor Calibration (1.4s)
    STEP_1_JUMP --> STEP_2_SQUASH: Cleared Spike Cleanly
    STEP_2_SQUASH --> STEP_3_DASH: Cleared Overhead Laser
    STEP_3_DASH --> STEP_4_COMBO: Cleared Double Spike
    STEP_4_COMBO --> STEP_5_COMPLETE: Cleared Sequential Course
    STEP_5_COMPLETE --> PLAYING: Dematerialize & Launch Live Run
```

### B. Space Interceptor Sub-FSM
```mermaid
stateDiagram-v2
    [*] --> INACTIVE
    INACTIVE --> APPROACHING: Score >= 500 & Cooldown Elapsed
    APPROACHING --> TARGETING: Approach Timer (1.4s)
    TARGETING --> LOCKED: Targeting Timer (1.8s)
    LOCKED --> FIRING: Locked Timer (0.45s)
    FIRING --> MISSILE_ACTIVE: Spawn Missile
    MISSILE_ACTIVE --> ESCAPING: Rocket Launched
    ESCAPING --> COOLDOWN: Escape Fly-Out (1.2s)
    COOLDOWN --> INACTIVE: Cooldown Elapsed (26s)
```

---

## 3. Entity & Hazard Architecture

| Entity | Dimensions ($w \times h$) | Hitbox Padding | Required Mechanic | Visual Characteristics |
| :--- | :--- | :--- | :--- | :--- |
| **Player Cube** | $40\text{px} \times 40\text{px}$ (Normal)<br>$50\text{px} \times 20\text{px}$ (Squashed) | $4\text{px}$ inset | Movement Base | Neon amber `#ff9f1c`, visor eye, cyan dash trail. |
| **Space Interceptor** | $64\text{px} \times 32\text{px}$ | N/A (Sky-Bound) | **DODGE / BAIT** | Dark stealth hull `#1c2030`, cyan plasma engines, crimson laser emitter. |
| **Ground Missile** | $32\text{px} \times 14\text{px}$ ($y \approx 425$) | $3\text{px}$ inset | **JUMP** | Low-skimming kinetic rocket with particle exhaust. |
| **High Missile** | $32\text{px} \times 14\text{px}$ ($y \approx 390$) | $3\text{px}$ inset | **SQUASH / SLIDE** | Head-height guided missile requiring ducking slide. |
| **Tracking Missile**| $32\text{px} \times 14\text{px}$ | $3\text{px}$ inset | **DASH / TIMING** | Semi-guided seeker that locks trajectory after $0.35\text{s}$. |
| **Single Spike** | $36\text{px} \times 36\text{px}$ | $6\text{px}$ inset | **JUMP** | Crimson hazard `#ff2a55`, glowing top crest. |
| **Double Spike** | $72\text{px} \times 36\text{px}$ | $6\text{px}$ inset | **JUMP** | Two adjacent spikes requiring precise peak jump. |
| **Floating Laser Bar** | $90\text{px} \times 22\text{px}$ ($y=400$) | $3\text{px}$ inset | **SQUASH** | Neon pink/cyan overhead laser requiring slide. |
| **Floating Crosses** | $26\text{px} \times 26\text{px}$ ($y=395$) | $4\text{px}$ inset | **SQUASH / PRECISION** | Dual mid-air spinning hazard crosses. |
| **Energy Gate** | $32\text{px} \times 60\text{px}$ | $3\text{px}$ inset | **DASH / TIMING** | Tall vertical energy barrier requiring burst dash. |
| **Block Hazard** | $40\text{px} \times 42\text{px}$ | $2\text{px}$ inset | **JUMP** | Solid barrier `#e63946` with warning icon. |
