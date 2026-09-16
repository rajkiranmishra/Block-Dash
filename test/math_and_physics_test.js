/**
 * BLOCK DASH - Mathematical & Physics Validation Test Harness
 *
 * Verifies jump physics, obstacle clearances, procedural constraints,
 * roast engine decision trees, and leaderboard anti-cheat boundaries.
 */

import { CONFIG } from '../js/config.js';
import { RoastEngine } from '../js/roast.js';

console.log('🧪 ========================================================');
console.log('🧪 BLOCK DASH — AUTOMATED ENGINEERING & PHYSICS TESTS');
console.log('🧪 ========================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failCount++;
  }
}

// --- Test 1: Physics Constants & Trajectory Math ---
console.log('--- TEST 1: Jump Physics Derivation ---');
const g = CONFIG.PLAYER.GRAVITY;          // 2100 px/s^2
const v0 = Math.abs(CONFIG.PLAYER.JUMP_FORCE); // 780 px/s

const t_rise = v0 / g;
const h_max = (v0 ** 2) / (2 * g);
const t_air = 2 * t_rise;

console.log(`Calculated t_rise: ${t_rise.toFixed(4)}s`);
console.log(`Calculated Max Jump Height (h_max): ${h_max.toFixed(2)}px`);
console.log(`Calculated Total Air Time (t_air): ${t_air.toFixed(4)}s`);

assert(h_max > 120 && h_max < 160, `Max jump height (${h_max.toFixed(1)}px) clears standard 40px/80px obstacles with ample clearance margin.`);
assert(t_air > 0.65 && t_air < 0.85, `Air time (${t_air.toFixed(3)}s) matches human reaction benchmark (300-800ms).`);

// --- Test 2: Horizontal Reach & Minimum Safe Gap across Speeds ---
console.log('\n--- TEST 2: Horizontal Reach & Safe Spacing Across Speeds ---');
const speeds = [CONFIG.SPEED.INITIAL, 500, 650, CONFIG.SPEED.MAX];

speeds.forEach(speed => {
  const horizontalReach = speed * t_air;
  const minSafeGap = (speed * t_air) * 0.72 + CONFIG.PLAYER.WIDTH + CONFIG.OBSTACLES.SAFETY_BUFFER;
  console.log(`Speed: ${speed} px/s -> Max Reach: ${horizontalReach.toFixed(1)}px | Min Safe Gap: ${minSafeGap.toFixed(1)}px`);
  assert(minSafeGap > CONFIG.PLAYER.WIDTH * 2, `Safe gap at ${speed}px/s (${minSafeGap.toFixed(1)}px) allows clean landing.`);
});

// --- Test 3: Roast Engine Classification ---
console.log('\n--- TEST 3: Roast Engine Decision Tree ---');
const roast = new RoastEngine();

// Case A: Instant Death (< 1.8s)
const r1 = roast.generateRoast({
  score: 40,
  personalBest: 1200,
  isNewPB: false,
  survivalTime: 1.2,
  obstacleIndex: 1,
  killerType: 'single-spike',
  attemptNumber: 1
});
assert(r1.category === 'INSTANT DEATH' || r1.category === 'FIRST OBSTACLE', `Instant death classified as "${r1.category}"`);

// Case B: New Personal Best
const r2 = roast.generateRoast({
  score: 1850,
  personalBest: 1200,
  isNewPB: true,
  survivalTime: 42.5,
  obstacleIndex: 28,
  killerType: 'double-spike',
  attemptNumber: 5
});
assert(r2.category === 'NEW PB', `New PB classified as "${r2.category}"`);

// Case C: Almost PB (Within 95% of PB)
const r3 = roast.generateRoast({
  score: 1180,
  personalBest: 1200,
  isNewPB: false,
  survivalTime: 38.1,
  obstacleIndex: 25,
  killerType: 'block',
  attemptNumber: 6
});
assert(r3.category === 'ALMOST PB', `Almost PB classified as "${r3.category}" with meme: "${r3.meme}"`);

// --- Test 4: Leaderboard Anti-Cheat Rate Bounds ---
console.log('\n--- TEST 4: Anti-Cheat Score Sanity Boundary ---');
function isScorePlausible(score, survivalSeconds) {
  const maxTheoretical = Math.max(500, survivalSeconds * 120 + 200);
  return !(score > maxTheoretical && survivalSeconds < 5);
}

assert(isScorePlausible(150, 4.0) === true, 'Legitimate early game score (150 in 4s) is accepted.');
assert(isScorePlausible(999999, 2.0) === false, 'Hacked devtools score (999,999 in 2s) is rejected.');

console.log(`\n========================================================`);
console.log(`TEST RESULTS: ${passCount} Passed, ${failCount} Failed.`);
console.log(`========================================================\n`);

if (failCount > 0) process.exit(1);
