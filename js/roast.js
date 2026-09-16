/**
 * BLOCK DASH - Context-Aware Roast & Meme Criticism Engine
 *
 * Analyzes run performance, failure telemetry, survival duration, and historical deaths
 * to generate hilarious, sarcastic, and contextually accurate post-death reactions.
 */

export class RoastEngine {
  constructor() {
    this.recentRoasts = []; // LRU queue of recent roast IDs to prevent repetitive lines
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
      'default': 0
    };
    this.consecutiveFastDeaths = 0;
  }

  /**
   * Resets session counters if needed.
   */
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
      'default': 0
    };
    this.consecutiveFastDeaths = 0;
  }

  /**
   * Evaluates telemetry and returns a category, roast message, and optional meme badge.
   *
   * @param {Object} data
   * @param {number} data.score - Final run score
   * @param {number} data.personalBest - Previous Personal Best before this run
   * @param {boolean} data.isNewPB - Whether this run beat the PB
   * @param {number} data.survivalTime - Seconds survived in this run
   * @param {number} data.obstacleIndex - Which obstacle number killed the player (1 = first)
   * @param {string} data.killerType - Type of obstacle that caused the death
   * @param {boolean} data.wasDashing - Whether the player was dashing during impact
   * @param {boolean} data.wasSquashing - Whether the player was squashing during impact
   * @param {number} data.attemptNumber - Total attempts in current session
   * @returns {{ category: string, text: string, meme: string|null }}
   */
  generateRoast(data) {
    const {
      score,
      personalBest,
      isNewPB,
      survivalTime,
      obstacleIndex,
      killerType = 'single-spike',
      wasDashing = false,
      wasSquashing = false,
      attemptNumber
    } = data;

    // Track obstacle-specific kill counts
    const cleanType = this.deathCountToObstacle[killerType] !== undefined ? killerType : 'default';
    this.deathCountToObstacle[cleanType]++;
    const killCount = this.deathCountToObstacle[cleanType];

    // Track rage/fast deaths
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

    // Select non-repeating message for this category
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
      case 'high-barrier': return 'The Overhead Crusher';
      case 'step-hazard': return 'The Step Pit';
      default: return 'That Hazard';
    }
  }

  _formatCategoryLabel(cat) {
    return cat.replace(/_/g, ' ');
  }

  _selectMessage(category, context) {
    const bank = ROAST_DATABASE[category] || ROAST_DATABASE.NORMAL_DEATH;
    
    // Filter out messages shown recently
    const available = bank.filter((msg, idx) => !this.recentRoasts.includes(`${category}_${idx}`));
    const pool = available.length > 0 ? available : bank;

    const chosen = pool[Math.floor(Math.random() * pool.length)];
    const chosenIdx = bank.indexOf(chosen);

    // Track in LRU queue
    this.recentRoasts.push(`${category}_${chosenIdx}`);
    if (this.recentRoasts.length > this.maxHistory) {
      this.recentRoasts.shift();
    }

    return chosen;
  }
}

/**
 * Curated Database of Contextual Roasts.
 * Sarcastic, funny, arcade-oriented, strictly focused on gameplay failures.
 */
const ROAST_DATABASE = {
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
    "Legend says obstacle number two is actually really cool.",
    "That first jump is mathematically guaranteed to be free. And yet."
  ],
  FAILED_TO_SQUASH: [
    "You are literally a shape-shifter with ONE transformation: flat.",
    "Down arrow / S key exists. It was waiting for you.",
    "A cube with too much pride to duck. Tragic.",
    "The laser gave you a very aggressive haircut.",
    "Squashing was optional. Survival was not."
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
    "Dash button activated. Target: Immediate death.",
    "Fastest delivery of a cube into a hazard recorded today.",
    "You dashed with supreme confidence and zero clearance."
  ],
  REPEAT_FAILURE: [
    "At this point, that exact hazard is beginning to recognize you.",
    "Excellent. Same mistake. Strong commitment.",
    "That obstacle has a higher K/D ratio against you than a Dark Souls boss.",
    "It's not personal. The hazard is just doing its 9-to-5.",
    "Definition of insanity: doing the exact same move and expecting to survive."
  ],
  ALMOST_PB: [
    "Two points away. That's going to keep you awake tonight.",
    "You were inches from glory, then gravity remembered you.",
    "So close to a new best. Tragic.",
    "Your personal best breathed a sigh of relief.",
    "Heartbreak in neon orange."
  ],
  NEW_PB: [
    "Wait. You're actually getting competent. That's inconvenient.",
    "New Personal Best! The game is officially displeased.",
    "Fine, take your record. Don't let it get to your head.",
    "Look at you, pressing buttons with purpose.",
    "New record achieved! Now do it at twice the speed."
  ],
  RAGE_STREAK: [
    "Your keyboard is begging for mercy.",
    "Breathing is free. Take one before hitting retry.",
    "Spamming retry won't make the hazard softer.",
    "Rage is not a valid physics modifier.",
    "Calm hands, frantic failure."
  ],
  LOW_SCORE: [
    "Your reaction time just filed for early retirement.",
    "Gravity: 1. You: 0.",
    "The block goes OVER the spike or UNDER the bar.",
    "Are you playing with oven mitts?",
    "A gallant effort by the floor to stop your descent."
  ],
  HIGH_SCORE: [
    "You survived long enough for the game to actually respect you. Almost.",
    "A respectable run. The hazards had to work overtime for that one.",
    "High velocity, high tension, catastrophic conclusion.",
    "Top-tier reflexes right up until that tragic miscalculation."
  ],
  NORMAL_DEATH: [
    "A bold strategy, but colliding with danger remains fatal.",
    "The cube has shattered. Physics remains undefeated.",
    "That jump had optimism, but zero clearance.",
    "You jumped. Just in the wrong dimension.",
    "Hit retry. Let's pretend that didn't happen."
  ]
};

export const roastEngine = new RoastEngine();
