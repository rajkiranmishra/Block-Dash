# BLOCK DASH

> **"One button. One endless level. No excuses."**

An arcade runner built with vanilla web technologies, delta-time physics, block squash & dash mechanics, mid-air hazards, constraint-aware procedural generation, an interactive 3D holographic training simulation, a context-aware AI roast engine, and fault-tolerant local storage persistence.

---

## 🎮 Live Demo & Gameplay

- **Local Dev Server**: `http://localhost:3000`
- **Demo URL**: [https://rajkiranmishra.github.io/Block-Dash/](https://rajkiranmishra.github.io/Block-Dash/) *(Deploy via GitHub Pages)*

---

## ⚡ Core Mechanics

1. **JUMP**: Leap over ground spikes, solid blocks, step hazards, and low-skimming interceptor ground missiles.
2. **SQUASH / SLIDE**: Compress to $50\%$ height with ground anchoring to slide under floating laser bars and high-altitude interceptor missiles. Includes safe uncrouch checks so you never expand into an obstacle.
3. **DASH**: Controlled $1.85\times$ speed burst for $0.22\text{s}$ with a $1.2\text{s}$ tactical cooldown to cross wide hazard gaps, energy gates, or out-maneuver tracking missiles.
4. **INTERACTIVE 3D HOLOGRAPHIC TRAINING MATRIX**: A hands-on tutorial simulation that teaches Jump, Squash, and Dash one by one with holographic obstacles. Includes non-lethal rewind glitch retries on error and a seamless dematerialization transition directly into live gameplay.
5. **SPACE INTERCEPTOR ENCOUNTER**: An original hunter drone with an 8-stage Finite State Machine (`APPROACHING` $\to$ `TARGETING` $\to$ `LOCKED` $\to$ `FIRING` $\to$ `ESCAPING`). Uses kinematic predictive targeting ($y = y_0 + v_y \cdot t_{\text{lead}}$) so skilled players can bait and manipulate the drone's firing vector.
6. **EMERGENT OBSTACLE DEMOLITION**: Missiles that miss the player collide with downstream spikes and blocks, detonating them and awarding $+150$ demolition bonus points.
7. **EVENT DIRECTOR & FAIRNESS**: Throttles procedural hazard generation during active interceptor encounters and enforces a $4.5\text{s}$ post-escape breather window.
8. **DEFENSIVE LOCAL STORAGE**: Zero-backend, privacy-friendly persistence for Personal Best, run attempts, callsign, and lifetime records that never crashes even in incognito mode or when storage quotas are exceeded.
9. **Context-Aware Roast Engine**: Post-death critique analyzing survival time, obstacle type, and missed squash/dash/jump opportunities against drones and lasers.

---

## 🕹️ Controls

| Action | Desktop Controls | Mobile / Tablet Controls |
| :--- | :--- | :--- |
| **JUMP** | <kbd>SPACE</kbd>, <kbd>W</kbd>, <kbd>↑</kbd>, Left Click | Tap upper/left screen area |
| **SQUASH / SLIDE** | Hold <kbd>S</kbd> or <kbd>↓</kbd> | Hold lower-left screen area |
| **DASH** | <kbd>SHIFT</kbd> or <kbd>X</kbd> | Tap right screen area (⚡ DASH) |
| **INSTANT RETRY** | <kbd>SPACE</kbd>, <kbd>R</kbd>, Left Click | Tap "RETRY NOW" or tap screen |
| **SKIP TUTORIAL** | <kbd>ESC</kbd> or Click "SKIP TRAINING" | Tap "SKIP TRAINING ✕" |
| **PAUSE / RESUME** | <kbd>P</kbd> or <kbd>ESC</kbd> | Tap Pause |
| **TOGGLE SOUND** | <kbd>M</kbd> or Speaker Icon | Tap Speaker Icon |
| **FULLSCREEN** | <kbd>F</kbd> or Fullscreen Icon | Tap Fullscreen Icon |

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, ES6 JavaScript (Modules), HTML Canvas 2D
- **Audio**: Zero-dependency Web Audio API procedural synthesis
- **Storage**: Defensive `StorageManager` with memory Map fallback
- **Deployment**: GitHub Pages (Subpath compatible)

---

## 🚀 Local Development Setup

1. **Start the local development server**:
   ```bash
   npx http-server . -p 3000 -c-1
   ```
2. **Open in browser**:
   Navigate to `http://localhost:3000`
3. **Run Automated Test Suite**:
   ```bash
   node test/math_and_physics_test.js
   ```

---

## 📚 Deep-Dive Educational Guide

For complete mathematical derivations, physics formulas, procedural generation algorithms, and 20+ interview/viva questions with answers, see [PROJECT_GUIDE.md](PROJECT_GUIDE.md).

---

## 📜 License
MIT License. Built for arcade enthusiasts and engineering pair-programming.
