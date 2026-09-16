/**
 * BLOCK DASH - Context-Aware Roast & Meme Criticism Engine
 *
 * Analyzes run performance, failure telemetry, survival duration, and historical deaths
 * to generate hilarious, sarcastic, and contextually accurate post-death reactions.
 */

export class RoastEngine {
  constructor() {
    this.recentRoasts = []; // LRU queue of recent roast IDs
    this.maxHistory = 15;
    this.deathCountToObstacle = {
      'single-spike': 0,
      'double-spike': 0,
      'triple-spike': 0,
      'block': 0,
      'floating-cross': 0,
      'floating-bar': 0,
      'energy-gate': 0,
      'high-barrier': 0,
      'step-hazard': 0,
      'interceptor-missile': 0,
      'default': 0
    };
    this.consecutiveFastDeaths = 0;
  }

  resetHistory() {
    this.deathCountToObstacle = {
      'single-spike': 0,
      'double-spike': 0,
      'triple-spike': 0,
      'block': 0,
      'floating-cross': 0,
      'floating-bar': 0,
      'energy-gate': 0,
      'high-barrier': 0,
      'step-hazard': 0,
      'interceptor-missile': 0,
      'default': 0
    };
    this.consecutiveFastDeaths = 0;
  }

  /**
   * Evaluates telemetry and returns category, roast message, and optional meme badge.
   */
  generateRoast(data) {
    const {
      score,
      personalBest,
      isNewPB,
      survivalTime,
      obstacleIndex,
      killerType = 'single-spike',
      missileVariant = null,
      wasDashing = false,
      wasSquashing = false,
      attemptNumber
    } = data;

    const cleanType = this.deathCountToObstacle[killerType] !== undefined ? killerType : 'default';
    this.deathCountToObstacle[cleanType]++;
    const killCount = this.deathCountToObstacle[cleanType];

    if (survivalTime < 3.5) {
      this.consecutiveFastDeaths++;
    } else {
      this.consecutiveFastDeaths = Math.max(0, this.consecutiveFastDeaths - 1);
    }

    let category = 'NORMAL_DEATH';
    let meme = null;

    // --- Decision Tree Classification ---
    if (isNewPB && score > 200) {
      category = 'NEW_PB';
    } else if (cleanType === 'interceptor-missile') {
      if (wasDashing) {
        category = 'DASHED_INTO_MISSILE';
        meme = 'Dashed directly into a guided warhead at Mach 2.';
      } else if (missileVariant === 'high' && !wasSquashing) {
        category = 'FAILED_TO_SQUASH_MISSILE';
        meme = 'Target was head-height. Down arrow was right there.';
      } else if (missileVariant === 'ground') {
        category = 'FAILED_TO_JUMP_MISSILE';
        meme = 'Ground missile delivered directly to your base.';
      } else if (killCount >= 3) {
        category = 'REPEATED_MISSILE_DEATH';
        meme = `The Space Interceptor has shot you down ${killCount} times.`;
      } else {
        category = 'MISSILE_DEATH';
        meme = 'Air superiority established by the Hunter Drone.';
      }
    } else if (wasDashing) {
      category = 'DASHED_INTO_OBSTACLE';
      meme = 'Accelerated directly into oblivion at 1.85x speed.';
    } else if ((cleanType === 'floating-bar' || cleanType === 'floating-cross') && !wasSquashing) {
      category = 'FAILED_TO_SQUASH';
      meme = 'Press DOWN/S to squash. It was literally right there.';
    } else if (cleanType === 'floating-cross' || cleanType === 'floating-bar') {
      category = 'FAILED_AIR_OBSTACLE';
      meme = 'Gravity was innocent. The flying hazard was not.';
    } else if (personalBest > 500 && score >= personalBest * 0.94 && score < personalBest) {
      category = 'ALMOST_PB';
      const diff = Math.round(personalBest - score);
      if (diff <= 50) {
        meme = `${diff} points away. That's going to hurt later.`;
      }
    } else if (obstacleIndex <= 1 && survivalTime < 2.8) {
      category = 'FIRST_OBSTACLE';
      meme = `Survived ${survivalTime.toFixed(1)}s — long enough to load the font.`;
    } else if (survivalTime < 1.8) {
      category = 'INSTANT_DEATH';
      meme = `RIP Player: 2026 – 2026.`;
    } else if (this.consecutiveFastDeaths >= 3) {
      category = 'RAGE_STREAK';
      meme = `${this.consecutiveFastDeaths} speedruns directly into the floor.`;
    } else if (killCount >= 4) {
      category = 'REPEAT_FAILURE';
      const obstacleName = this._getObstacleDisplayName(cleanType);
      meme = `${obstacleName} has killed you ${killCount} times. Strong commitment to failure.`;
    } else if (score < 250) {
      category = 'LOW_SCORE';
    } else if (score > 3500) {
      category = 'HIGH_SCORE';
    }

    const text = this._selectMessage(category, { score, personalBest, killCount, cleanType });

    return {
      category: this._formatCategoryLabel(category),
      text,
      meme
    };
  }

  _getObstacleDisplayName(type) {
    switch (type) {
      case 'single-spike': return 'Kevin the Spike';
      case 'double-spike': return 'The Twin Spikes';
      case 'triple-spike': return 'The Spike Trio';
      case 'block': return 'The Brick Wall';
      case 'floating-bar': return 'The Overhead Laser';
      case 'floating-cross': return 'The Floating Crosses';
      case 'energy-gate': return 'The Energy Gate';
      case 'interceptor-missile': return 'The Space Interceptor';
      case 'step-hazard': return 'The Step Pit';
      default: return 'That Hazard';
    }
  }

  _formatCategoryLabel(cat) {
    return cat.replace(/_/g, ' ');
  }

  _selectMessage(category, context) {
    const bank = ROAST_DATABASE[category] || ROAST_DATABASE.NORMAL_DEATH;
    
    const available = bank.filter((msg, idx) => !this.recentRoasts.includes(`${category}_${idx}`));
    const pool = available.length > 0 ? available : bank;

    const chosen = pool[Math.floor(Math.random() * pool.length)];
    const chosenIdx = bank.indexOf(chosen);

    this.recentRoasts.push(`${category}_${chosenIdx}`);
    if (this.recentRoasts.length > this.maxHistory) {
      this.recentRoasts.shift();
    }

    return chosen;
  }
}

/**
 * Curated Database of Contextual Roasts.
 */
const ROAST_DATABASE = {
  MISSILE_DEATH: [
    "Missile: 1. You: not enough.",
    "Air superiority has been firmly established by the Hunter Drone.",
    "Target lock acquired. Target destroyed. Clean military efficiency.",
    "You were given a radar warning, a laser guide, and an audio beep. And yet.",
    "The interceptor logged your flight path and found it predictable."
  ],
  FAILED_TO_JUMP_MISSILE: [
    "Ground missile incoming! Have you considered the JUMP button?",
    "That missile was skimming the floor. You could have hopped right over it.",
    "The missile had no vertical clearance. You had full vertical clearance."
  ],
  FAILED_TO_SQUASH_MISSILE: [
    "High missile passed right at cube-height. Ducking is free.",
    "Squash slide under the missile was the intended assignment.",
    "A clean headshot from the Interceptor. You stood tall to the end."
  ],
  DASHED_INTO_MISSILE: [
    "You saw an active guided missile and accelerated directly into it.",
    "Dash was intended for EVASION, not head-on collision.",
    "Fastest delivery of a cube into a high-explosive warhead recorded today."
  ],
  REPEATED_MISSILE_DEATH: [
    "The Space Interceptor is racking up quite a killstreak against you.",
    "The drone pilot is getting a medal for this performance.",
    "Same targeting laser, same missile, exact same result."
  ],
  INSTANT_DEATH: [
    "You had one button. One.",
    "Did you blink or did your fingers go on strike?",
    "We have confirmed the keyboard works. Investigation into reflexes continues.",
    "Your survival time is measured in picoseconds.",
    "The obstacle didn't even have time to render a shadow.",
    "Speedrun any% to the game over screen achieved."
  ],
  FIRST_OBSTACLE: [
    "One obstacle. ONE.",
    "That was obstacle number one. The tutorial is calling.",
    "The first spike sends its warmest regards.",
    "You didn't even let the background music build up tension.",
    "Legend says obstacle number two is actually really cool."
  ],
  FAILED_TO_SQUASH: [
    "You are literally a shape-shifter with ONE transformation: flat.",
    "Down arrow / S key exists. It was waiting for you.",
    "A cube with too much pride to duck. Tragic.",
    "The laser gave you a very aggressive haircut."
  ],
  FAILED_AIR_OBSTACLE: [
    "Gravity wasn't even responsible for that one.",
    "Mid-air hazard: 1. Your spatial awareness: 0.",
    "Look up. There's a whole world of danger up there.",
    "Floating hazards don't move. You drove right into it."
  ],
  DASHED_INTO_OBSTACLE: [
    "You saw danger and chose to accelerate into it.",
    "Speed wasn't the problem. The concrete wall was.",
    "Dash button activated. Target: Immediate death."
  ],
  REPEAT_FAILURE: [
    "At this point, that exact hazard is beginning to recognize you.",
    "Excellent. Same mistake. Strong commitment.",
    "That obstacle has a higher K/D ratio against you than a Dark Souls boss."
  ],
  ALMOST_PB: [
    "Two points away. That's going to keep you awake tonight.",
    "You were inches from glory, then gravity remembered you.",
    "So close to a new best. Tragic.",
    "Heartbreak in neon orange."
  ],
  NEW_PB: [
    "Wait. You're actually getting competent. That's inconvenient.",
    "New Personal Best! The game is officially displeased.",
    "Fine, take your record. Don't let it get to your head."
  ],
  RAGE_STREAK: [
    "Your keyboard is begging for mercy.",
    "Breathing is free. Take one before hitting retry.",
    "Spamming retry won't make the hazard softer."
  ],
  LOW_SCORE: [
    "Your reaction time just filed for early retirement.",
    "Gravity: 1. You: 0.",
    "Are you playing with oven mitts?"
  ],
  HIGH_SCORE: [
    "You survived long enough for the game to actually respect you. Almost.",
    "A respectable run. The hazards had to work overtime for that one.",
    "High velocity, high tension, catastrophic conclusion."
  ],
  NORMAL_DEATH: [
    "A bold strategy, but colliding with danger remains fatal.",
    "The cube has shattered. Physics remains undefeated.",
    "Hit retry. Let's pretend that didn't happen."
  ]
};

export const roastEngine = new RoastEngine();
