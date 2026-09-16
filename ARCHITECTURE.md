# BLOCK DASH — System Architecture & Technical Specifications

> **System Overview**: High-Performance, Zero-Dependency HTML5 Canvas Arcade Engine with Delta-Time Physics, Squash & Dash Mechanics, Mid-Air Hazards, Procedural Generation, Context-Aware Failure Analytics, and Supabase RLS Backend.

---

## 1. System Component Diagram

```mermaid
graph TD
    subgraph Browser Client [Client Runtime]
        HTML[index.html: Canvas, HUD & Touch Zones]
        CSS[css/style.css: Arcade Styling & CRT]
        
        subgraph Input Layer [Action Input Layer]
            INP[bindActionInputs: Keyboard + Touch Zones]
        end

        subgraph Engine Modules [ES6 Modular Engine]
            CFG[js/config.js: Tunable Constants]
            AUD[js/audio.js: Web Audio Synthesizer: Jump, Squash, Dash, Death]
            ROAST[js/roast.js: Multi-Mechanic Roast Engine]
            LDR[js/leaderboard.js: Identity & Auth]
            GAME[js/game.js: FSM, Jump/Squash/Dash Physics, AABB, Procedural]
        end
    end

    subgraph Backend Infrastructure [Cloud Database]
        SB[(Supabase PostgreSQL)]
        RLS[Row Level Security Engine]
        AUTH[Anonymous Auth Service]
    end

    HTML --> INP
    INP --> GAME
    CSS --> HTML
    CFG --> GAME
    CFG --> LDR
    CFG --> AUD
    AUD --> GAME
    ROAST --> GAME
    LDR --> GAME
    LDR <--> AUTH
    LDR <--> RLS
    RLS <--> SB
```

---

## 2. Finite State Machine (FSM) Lifecycle

```mermaid
stateDiagram-v2
    [*] --> BOOT
    BOOT --> MENU: Assets Initialized
    MENU --> PLAYING: startNewRun()
    READY --> PLAYING: startNewRun()
    PLAYING --> PAUSED: Press P / ESC
    PAUSED --> PLAYING: Press Resume / P
    PAUSED --> MENU: Return to Menu
    PLAYING --> DEAD: AABB Hazard Collision
    DEAD --> PLAYING: startNewRun() (Instant Retry <16ms)
    DEAD --> MENU: Return to Menu
```

---

## 3. Entity & Hazard Architecture

| Entity | Dimensions ($w \times h$) | Hitbox Padding | Required Mechanic | Visual Characteristics |
| :--- | :--- | :--- | :--- | :--- |
| **Player Cube** | $40\text{px} \times 40\text{px}$ (Normal)<br>$50\text{px} \times 20\text{px}$ (Squashed) | $4\text{px}$ inset | Movement Base | Neon amber `#ff9f1c`, visor eye, cyan dash trail. |
| **Single Spike** | $36\text{px} \times 36\text{px}$ | $6\text{px}$ inset | **JUMP** | Crimson hazard `#ff2a55`, glowing top crest. |
| **Double Spike** | $72\text{px} \times 36\text{px}$ | $6\text{px}$ inset | **JUMP** | Two adjacent spikes requiring precise peak jump. |
| **Floating Laser Bar** | $90\text{px} \times 22\text{px}$ ($y=400$) | $3\text{px}$ inset | **SQUASH** | Neon pink/cyan overhead laser requiring slide. |
| **Floating Crosses** | $26\text{px} \times 26\text{px}$ ($y=395$) | $4\text{px}$ inset | **SQUASH / PRECISION** | Dual mid-air spinning hazard crosses. |
| **Energy Gate** | $32\text{px} \times 60\text{px}$ | $3\text{px}$ inset | **DASH / TIMING** | Tall vertical energy barrier requiring burst dash. |
| **Block Hazard** | $40\text{px} \times 42\text{px}$ | $2\text{px}$ inset | **JUMP** | Solid barrier `#e63946` with warning icon. |
