# BLOCK DASH

> **"One button. One endless level. No excuses."**

An arcade runner built with vanilla web technologies, delta-time physics, block squash & dash mechanics, mid-air hazards, constraint-aware procedural generation, a context-aware AI roast engine, and global Supabase leaderboards.

---

## 🎮 Live Demo & Gameplay

- **Local Dev Server**: `http://localhost:3000`
- **Demo URL**: [https://rajkiranmishra.github.io/block-dash/](https://rajkiranmishra.github.io/block-dash/) *(Deploy via GitHub Pages)*

---

## ⚡ Core Mechanics

1. **JUMP**: Leap over ground spikes, solid blocks, and step hazards.
2. **SQUASH / SLIDE**: Compress to $50\%$ height with ground anchoring to slide under floating laser bars and overhead crosses. Includes safe uncrouch checks so you never expand into an obstacle.
3. **DASH**: Controlled $1.85\times$ speed burst for $0.22\text{s}$ with a $1.2\text{s}$ tactical cooldown to cross wide hazard gaps and energy gates.
4. **Bug-Free Instant Retry**: Full run state reset (<16ms) restarts the game fresh from the beginning every single time.
5. **Procedural Multi-Mechanic Difficulty**: Dynamic progression introducing mechanics gradually (Jump $\to$ Squash $\to$ Dash $\to$ Combinations) with mathematical reachability guarantees.
6. **Context-Aware Roast Engine**: Post-death critique analyzing survival time, obstacle type, and missed squash/dash opportunities.

---

## 🕹️ Controls

| Action | Desktop Controls | Mobile / Tablet Controls |
| :--- | :--- | :--- |
| **JUMP** | <kbd>SPACE</kbd>, <kbd>W</kbd>, <kbd>↑</kbd>, Left Click | Tap upper/left screen area |
| **SQUASH / SLIDE** | Hold <kbd>S</kbd> or <kbd>↓</kbd> | Hold lower-left screen area |
| **DASH** | <kbd>SHIFT</kbd> or <kbd>X</kbd> | Tap right screen area (⚡ DASH) |
| **INSTANT RETRY** | <kbd>SPACE</kbd>, <kbd>R</kbd>, Left Click | Tap "RETRY NOW" or tap screen |
| **PAUSE / RESUME** | <kbd>P</kbd> or <kbd>ESC</kbd> | Tap Pause |
| **TOGGLE SOUND** | <kbd>M</kbd> or Speaker Icon | Tap Speaker Icon |
| **FULLSCREEN** | <kbd>F</kbd> or Fullscreen Icon | Tap Fullscreen Icon |

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, ES6 JavaScript (Modules), HTML Canvas 2D
- **Audio**: Zero-dependency Web Audio API procedural synthesis
- **Backend & Database**: Supabase PostgreSQL (Anonymous Auth + RLS)
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

For complete mathematical derivations, physics formulas, procedural generation algorithms, and 20+ interview/viva questions with answers, see [PROJECT_GUIDE.md](file:///Users/rajkiranmishra/Block-Dash/PROJECT_GUIDE.md).

---

## 📜 License
MIT License. Built for arcade enthusiasts and engineering pair-programming.
