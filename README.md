# BLOCK DASH

> **"One button. One endless level. No excuses."**

An arcade runner built with vanilla web technologies, delta-time physics, constraint-aware procedural generation, a context-aware AI roast engine, and global Supabase leaderboards.

---

## 🎮 Live Demo & Gameplay

- **Demo URL**: [https://rajkiranmishra.github.io/block-dash/](https://rajkiranmishra.github.io/block-dash/) *(Deploy via GitHub Pages)*
- **Local Dev Server**: `http://localhost:3000`

---

## ⚡ Key Features

1. **One-Button Gameplay**: Jump, avoid hazards, and survive as the game accelerates.
2. **Delta-Time Physics Engine**: Consistent physics and speeds across 60Hz, 90Hz, 120Hz, and 144Hz displays.
3. **Constraint-Aware Procedural Generation**: Obstacle patterns are generated dynamically and mathematically validated against jump trajectory reachability ($t_{\text{air}} \approx 0.74\text{s}$, $h_{\text{max}} \approx 145\text{px}$) so every run is difficult yet 100% fair.
4. **Context-Aware Roast Engine**: Post-death failure analysis tracks survival time, distance from personal best, repeat deaths to specific obstacles, and rage streaks to deliver sarcastic critiques.
5. **Zero-Dependency Web Audio API Synthesizer**: Procedural sound generation without heavy `.mp3` dependencies or network load lag.
6. **Global Leaderboard & Anonymous Auth**: Powered by Supabase PostgreSQL with Row Level Security (RLS) policies and offline `localStorage` fallback.
7. **Instant Retry Loop**: Instant reset on `Space`, `Tap`, or `R` in <16ms.

---

## 🕹️ Controls

| Action | Desktop Controls | Mobile / Tablet |
| :--- | :--- | :--- |
| **Jump / Start** | `Space`, `ArrowUp`, `W`, Left Mouse Click | Tap anywhere on screen |
| **Instant Retry** | `Space`, `R`, Left Mouse Click | Tap "RETRY NOW" or tap screen |
| **Pause / Resume** | `P`, `Escape` | Tap Pause button |
| **Toggle Mute** | `M` or Speaker Icon | Tap Speaker Icon |
| **Toggle CRT Scanlines** | CRT Monitor Icon | Tap CRT Monitor Icon |
| **Fullscreen** | `F` or Fullscreen Icon | Tap Fullscreen Icon |

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, ES6 JavaScript (Modules), HTML Canvas 2D
- **Audio**: Web Audio API (Native browser oscillator and noise synthesis)
- **Backend & Database**: Supabase PostgreSQL (Anonymous Auth + RLS)
- **Deployment**: GitHub Pages (Subpath compatible)

---

## 🚀 Local Development Setup

No complex build steps or node modules required!

1. **Clone the repository**:
   ```bash
   git clone https://github.com/rajkiranmishra/Block-Dash.git
   cd Block-Dash
   ```

2. **Start a local development server**:
   Using Node http-server:
   ```bash
   npx http-server . -p 3000 -c-1
   ```
   Or using Python:
   ```bash
   python3 -m http.server 3000
   ```

3. **Open in browser**:
   Navigate to `http://localhost:3000`

4. **Run Automated Test Suite**:
   ```bash
   node test/math_and_physics_test.js
   ```

---

## 🗄️ Supabase Leaderboard Setup (Optional)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in Supabase and paste the contents of [`supabase_schema.sql`](file:///Users/rajkiranmishra/Block-Dash/supabase_schema.sql).
3. In [`js/config.js`](file:///Users/rajkiranmishra/Block-Dash/js/config.js), add your Supabase Project URL and Public Anon Key:
   ```javascript
   SUPABASE: {
     URL: 'https://your-project.supabase.co',
     ANON_KEY: 'your-public-anon-key'
   }
   ```
4. If left blank, the game seamlessly operates in offline mode using `localStorage`.

---

## 📦 GitHub Pages Deployment

1. Commit and push your code to your GitHub repository:
   ```bash
   git add .
   git commit -m "feat: complete production-ready Block Dash arcade engine"
   git push origin main
   ```
2. In your GitHub repository, go to **Settings** $\to$ **Pages**.
3. Under **Build and deployment** $\to$ **Source**, select `Deploy from a branch`.
4. Choose the `main` branch and `/ (root)` folder, then click **Save**.
5. Your game will be live at `https://<username>.github.io/Block-Dash/`!

---

## 📚 Deep-Dive Educational Guide

For complete mathematical derivations, physics formulas, procedural generation algorithms, and 20+ interview/viva questions with answers, see [PROJECT_GUIDE.md](file:///Users/rajkiranmishra/Block-Dash/PROJECT_GUIDE.md).

---

## 📜 License
MIT License. Built for arcade enthusiasts and engineering pair-programming.
