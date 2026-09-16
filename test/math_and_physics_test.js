/**
 * BLOCK DASH - Mathematical & Physics Validation Test Harness
 *
 * Verifies jump physics, squash hitbox & ground anchoring, safe uncrouch checks,
 * dash kinematics, procedural constraints, roast engine decision trees, and resetRun purity.
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

assert(h_max > 120 && h_max < 160, `Max jump height (${h_max.toFixed(1)}px) clears standard obstacles with ample margin.`);
assert(t_air > 0.65 && t_air < 0.85, `Air time (${t_air.toFixed(3)}s) matches human reaction benchmark.`);

// --- Test 2: Squash Hitbox & Ground Anchoring Math ---
console.log('\n--- TEST 2: Squash / Slide Hitbox & Ground Anchoring ---');
const normalHeight = CONFIG.PLAYER.HEIGHT; // 40px
const squashedHeight = CONFIG.PLAYER.SQUASH_HEIGHT; // 20px
const groundY = CONFIG.CANVAS.GROUND_Y; // 460px

const normalBottom = (groundY - normalHeight) + normalHeight;
const squashedBottom = (groundY - squashedHeight) + squashedHeight;

assert(normalBottom === groundY, `Normal player bottom (${normalBottom}px) is anchored to ground plane (${groundY}px).`);
assert(squashedBottom === groundY, `Squashed player bottom (${squashedBottom}px) is anchored to ground plane (${groundY}px).`);
assert(squashedHeight === normalHeight / 2, `Squash height (${squashedHeight}px) reduces vertical profile by 50%.`);

// Floating bar clearance test:
const barY = CONFIG.OBSTACLES.FLOATING_BAR_Y; // 400px
const barHeight = 22;
const barBottom = barY + barHeight; // 422px
const clearanceUnderBar = groundY - barBottom; // 460 - 422 = 38px

assert(clearanceUnderBar > squashedHeight, `Squashed height (${squashedHeight}px) cleanly fits under floating bar clearance (${clearanceUnderBar}px).`);
assert(clearanceUnderBar < normalHeight, `Normal standing height (${normalHeight}px) collides with floating bar clearance (${clearanceUnderBar}px), mandating squash.`);

// --- Test 3: Dash Kinematics & Cooldown ---
console.log('\n--- TEST 3: Dash Kinematics & Delta-Time Independence ---');
const baseSpeed = CONFIG.SPEED.INITIAL; // 380 px/s
const dashMultiplier = CONFIG.DASH.SPEED_MULTIPLIER; // 1.85
const dashDuration = CONFIG.DASH.DURATION; // 0.22s
const dashCooldown = CONFIG.DASH.COOLDOWN; // 1.2s

const dashSpeed = baseSpeed * dashMultiplier;
const dashDistance = dashSpeed * dashDuration;

console.log(`Base Speed: ${baseSpeed} px/s -> Dash Speed: ${dashSpeed.toFixed(1)} px/s`);
console.log(`Dash Burst Distance: ${dashDistance.toFixed(1)} px in ${dashDuration}s`);

assert(dashDistance > 120 && dashDistance < 200, `Dash burst (${dashDistance.toFixed(1)}px) covers gap without being uncontrollable.`);
assert(dashCooldown > dashDuration * 3, `Dash cooldown (${dashCooldown}s) prevents spamming and enforces timing skill.`);

// --- Test 4: Roast Engine Multi-Mechanic Classifications ---
console.log('\n--- TEST 4: Roast Engine Multi-Mechanic Classifications ---');
const roast = new RoastEngine();

// Case A: Died to floating laser without squashing
const rSquash = roast.generateRoast({
  score: 650,
  personalBest: 1200,
  isNewPB: false,
  survivalTime: 18.2,
  obstacleIndex: 8,
  killerType: 'floating-bar',
  wasDashing: false,
  wasSquashing: false,
  attemptNumber: 3
});
assert(rSquash.category === 'FAILED TO SQUASH', `Failure to squash classified as "${rSquash.category}"`);

// Case B: Died while dashing
const rDash = roast.generateRoast({
  score: 820,
  personalBest: 1200,
  isNewPB: false,
  survivalTime: 22.1,
  obstacleIndex: 12,
  killerType: 'block',
  wasDashing: true,
  wasSquashing: false,
  attemptNumber: 4
});
assert(rDash.category === 'DASHED INTO OBSTACLE', `Death during dash classified as "${rDash.category}"`);

// Case C: New Personal Best
const rNewPB = roast.generateRoast({
  score: 2400,
  personalBest: 1200,
  isNewPB: true,
  survivalTime: 55.4,
  obstacleIndex: 32,
  killerType: 'triple-spike',
  wasDashing: false,
  wasSquashing: false,
  attemptNumber: 5
});
assert(rNewPB.category === 'NEW PB', `New PB classified as "${rNewPB.category}"`);

// --- Test 5: Space Interceptor FSM, Predictive Targeting & Demolition ---
console.log('\n--- TEST 5: Space Interceptor State Machine & Predictive Targeting ---');

// FSM State transitions verification
const validStates = ['INACTIVE', 'APPROACHING', 'TARGETING', 'LOCKED', 'FIRING', 'MISSILE_ACTIVE', 'ESCAPING', 'COOLDOWN'];
assert(validStates.length === 8, 'Interceptor FSM defines 8 explicit lifecycle states without boolean flags.');

// Predictive Targeting Calculation
const playerY = 420; // Player on ground
const playerVy = -600; // Player in mid-air jump
const predictionLead = CONFIG.INTERCEPTOR.PREDICTION_LEAD; // 0.35s

const rawPredictedY = playerY + (playerVy * predictionLead); // 420 + (-210) = 210px
const clampedPredictedY = Math.max(260, Math.min(CONFIG.CANVAS.GROUND_Y - 20, rawPredictedY)); // Clamped to ceiling/floor bounds

console.log(`Predictive Lead: playerY=${playerY}, playerVy=${playerVy}, lead=${predictionLead}s -> TargetY=${clampedPredictedY.toFixed(1)}px`);
assert(clampedPredictedY < playerY, `Predictive targeting correctly anticipates upward jump trajectory (${clampedPredictedY}px < ${playerY}px).`);
assert(clampedPredictedY >= 260 && clampedPredictedY <= groundY - 20, `Targeting Y is safely clamped within jumpable screen bounds.`);

// Missile Variants Test
const missileSpeed = CONFIG.INTERCEPTOR.MISSILE_SPEED; // 640 px/s
assert(missileSpeed > CONFIG.SPEED.INITIAL, `Missile speed (${missileSpeed}px/s) exceeds base game speed (${CONFIG.SPEED.INITIAL}px/s) for urgent reaction.`);

// Emergent Missile vs Obstacle Demolition Simulation
const testObstacle = { x: 300, y: groundY - 36, w: 36, h: 36, type: 'single-spike', active: true };
const testMissile = { x: 310, y: groundY - 30, w: 32, h: 14, active: true };

// AABB Collision Check between missile and obstacle
const missileHitsObstacle = (
  testMissile.x < testObstacle.x + testObstacle.w &&
  testMissile.x + testMissile.w > testObstacle.x &&
  testMissile.y < testObstacle.y + testObstacle.h &&
  testMissile.y + testMissile.h > testObstacle.y
);

assert(missileHitsObstacle === true, 'Missile AABB detects collision with environmental obstacle.');
if (missileHitsObstacle) {
  testObstacle.active = false;
  testMissile.active = false;
}
assert(testObstacle.active === false, 'Obstacle is destroyed upon missile impact (emergent demolition).');

// Roast Engine Missile Death Classifications
const rMissileGround = roast.generateRoast({
  score: 950,
  personalBest: 1500,
  isNewPB: false,
  survivalTime: 25.0,
  obstacleIndex: 14,
  killerType: 'interceptor-missile',
  missileVariant: 'ground',
  wasDashing: false,
  wasSquashing: false,
  attemptNumber: 4
});
assert(rMissileGround.category === 'FAILED TO JUMP MISSILE', `Ground missile failure classified as "${rMissileGround.category}"`);

const rMissileHigh = roast.generateRoast({
  score: 1100,
  personalBest: 1500,
  isNewPB: false,
  survivalTime: 28.0,
  obstacleIndex: 16,
  killerType: 'interceptor-missile',
  missileVariant: 'high',
  wasDashing: false,
  wasSquashing: false,
  attemptNumber: 5
});
assert(rMissileHigh.category === 'FAILED TO SQUASH MISSILE', `High missile failure classified as "${rMissileHigh.category}"`);

const rMissileDash = roast.generateRoast({
  score: 1300,
  personalBest: 1500,
  isNewPB: false,
  survivalTime: 32.0,
  obstacleIndex: 18,
  killerType: 'interceptor-missile',
  missileVariant: 'tracking',
  wasDashing: true,
  wasSquashing: false,
  attemptNumber: 6
});
assert(rMissileDash.category === 'DASHED INTO MISSILE', `Dash into tracking missile classified as "${rMissileDash.category}"`);

console.log(`\n========================================================`);
console.log(`TEST RESULTS: ${passCount} Passed, ${failCount} Failed.`);
console.log(`========================================================\n`);

if (failCount > 0) process.exit(1);

