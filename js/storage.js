/**
 * ==============================================================================
 * BLOCK DASH - Local Storage & Persistence Manager
 *
 * Provides ultra-robust, defensive client-side persistence for Personal Best,
 * attempts, tutorial status, user settings, and player statistics.
 *
 * Guaranteed to never crash even if:
 * - Cookies/Storage are blocked by browser privacy settings
 * - Storage is full (QuotaExceededError)
 * - Stored data is corrupted, negative, non-numeric, or null
 * - In incognito / iframe sandboxed environments
 * ==============================================================================
 */

export class StorageManager {
  constructor() {
    this.memoryFallback = new Map();
    this.isStorageAvailable = this._checkStorageAvailability();

    // Default In-Memory State
    this.defaults = {
      bestScore: 0,
      attempts: 0,
      tutorialSeen: false,
      musicEnabled: true,
      sfxEnabled: true,
      masterVolume: 0.7,
      musicVolume: 0.4,
      sfxVolume: 0.8,
      accentColor: '#ff9f1c',
      reducedMotion: false,
      introSeen: false,
      playerName: 'Player 1',
      stats: {
        maxSurvivalTime: 0,
        totalDemolitions: 0,
        totalObstaclesCleared: 0,
        totalScoreAccumulated: 0,
      }
    };

    // Keys mapping
    this.KEYS = {
      BEST_SCORE: 'blockdash_best_score',
      LEGACY_PB: 'blockdash_pb',
      ATTEMPTS: 'blockdash_attempts',
      LEGACY_GAMES: 'blockdash_games_played',
      TUTORIAL_SEEN: 'blockdash_tutorial_seen',
      SETTINGS: 'blockdash_settings',
      PLAYER_NAME: 'blockdash_player_name',
      STATS: 'blockdash_stats',
      INTRO_SEEN: 'blockdash_intro_seen',
    };

    // Pre-cache memory copy for instantaneous synchronous reads
    this.cache = this._loadAllFromStorage();
  }

  /**
   * Tests whether localStorage is accessible without throwing DOMException.
   */
  _checkStorageAvailability() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      const testKey = '__blockdash_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      console.warn('⚠️ Local storage unavailable (private browsing/storage blocked). Using volatile in-memory fallback.');
      return false;
    }
  }

  /**
   * Safe raw getItem with fallback.
   */
  _rawGet(key) {
    if (this.isStorageAvailable) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        return this.memoryFallback.get(key) || null;
      }
    }
    return this.memoryFallback.get(key) || null;
  }

  /**
   * Safe raw setItem with fallback.
   */
  _rawSet(key, value) {
    if (this.isStorageAvailable) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch (e) {
        // Storage quota exceeded or disabled mid-session
      }
    }
    this.memoryFallback.set(key, value);
  }

  /**
   * Validates and parses integer >= 0.
   */
  _parseNonNegativeInt(val, defaultVal = 0) {
    if (val === null || val === undefined || val === '') return defaultVal;
    const num = Number(val);
    if (Number.isNaN(num) || !Number.isFinite(num) || num < 0) {
      return defaultVal;
    }
    return Math.floor(num);
  }

  /**
   * Validates and parses boolean.
   */
  _parseBool(val, defaultVal = false) {
    if (val === null || val === undefined) return defaultVal;
    if (val === 'true' || val === true || val === '1' || val === 1) return true;
    if (val === 'false' || val === false || val === '0' || val === 0) return false;
    return defaultVal;
  }

  /**
   * Loads and validates all persisted fields into in-memory cache.
   */
  _loadAllFromStorage() {
    // 1. Best Score (Check primary key, then fallback to legacy key if migrating)
    const rawBest = this._rawGet(this.KEYS.BEST_SCORE) || this._rawGet(this.KEYS.LEGACY_PB);
    const bestScore = this._parseNonNegativeInt(rawBest, this.defaults.bestScore);

    // 2. Attempts (Check primary key, then legacy key)
    const rawAttempts = this._rawGet(this.KEYS.ATTEMPTS) || this._rawGet(this.KEYS.LEGACY_GAMES);
    const attempts = this._parseNonNegativeInt(rawAttempts, this.defaults.attempts);

    // 3. Tutorial Seen
    const rawTutorial = this._rawGet(this.KEYS.TUTORIAL_SEEN);
    const tutorialSeen = this._parseBool(rawTutorial, this.defaults.tutorialSeen);

    // 4. Player Name
    const rawName = this._rawGet(this.KEYS.PLAYER_NAME);
    const playerName = (rawName && typeof rawName === 'string' && rawName.trim().length > 0)
      ? rawName.trim().slice(0, 16)
      : this.defaults.playerName;

    // 5. Settings Object
    let settings = { ...this.defaults };
    try {
      const rawSettings = this._rawGet(this.KEYS.SETTINGS);
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (parsed && typeof parsed === 'object') {
          settings.masterVolume = typeof parsed.masterVolume === 'number' ? Math.max(0, Math.min(1, parsed.masterVolume)) : this.defaults.masterVolume;
          settings.musicVolume = typeof parsed.musicVolume === 'number' ? Math.max(0, Math.min(1, parsed.musicVolume)) : this.defaults.musicVolume;
          settings.sfxVolume = typeof parsed.sfxVolume === 'number' ? Math.max(0, Math.min(1, parsed.sfxVolume)) : this.defaults.sfxVolume;
          settings.accentColor = typeof parsed.accentColor === 'string' && parsed.accentColor.startsWith('#') ? parsed.accentColor : this.defaults.accentColor;
          settings.reducedMotion = Boolean(parsed.reducedMotion);
        }
      }
    } catch (e) {
      // Corrupted JSON - reset to defaults
    }

    // 6. Stats Object
    let stats = { ...this.defaults.stats };
    try {
      const rawStats = this._rawGet(this.KEYS.STATS);
      if (rawStats) {
        const parsed = JSON.parse(rawStats);
        if (parsed && typeof parsed === 'object') {
          stats.maxSurvivalTime = this._parseNonNegativeInt(parsed.maxSurvivalTime, 0);
          stats.totalDemolitions = this._parseNonNegativeInt(parsed.totalDemolitions, 0);
          stats.totalObstaclesCleared = this._parseNonNegativeInt(parsed.totalObstaclesCleared, 0);
          stats.totalScoreAccumulated = this._parseNonNegativeInt(parsed.totalScoreAccumulated, 0);
        }
      }
    } catch (e) {
      // Corrupted JSON
    }

    return {
      bestScore,
      attempts,
      tutorialSeen,
      playerName,
      settings,
      stats,
    };
  }

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  /**
   * Returns player's local personal best.
   */
  getBestScore() {
    return this.cache.bestScore;
  }

  /**
   * Validates and parses float/number >= 0.
   */
  _parseNonNegativeNumber(val, defaultVal = 0) {
    if (val === null || val === undefined || val === '') return defaultVal;
    const num = Number(val);
    if (Number.isNaN(num) || !Number.isFinite(num) || num < 0) {
      return defaultVal;
    }
    return num;
  }

  /**
   * Evaluates end-of-run score. Updates and persists if a new high score is achieved.
   *
   * @param {number} score
   * @returns {{ isNewPB: boolean, previousBest: number, currentBest: number, best: number }}
   */
  saveBestScore(score) {
    const validScore = this._parseNonNegativeInt(score, 0);
    const previousBest = this.cache.bestScore;
    let isNewPB = false;

    if (validScore > previousBest) {
      this.cache.bestScore = validScore;
      this._rawSet(this.KEYS.BEST_SCORE, validScore.toString());
      this._rawSet(this.KEYS.LEGACY_PB, validScore.toString());
      isNewPB = true;
    }

    return {
      isNewPB,
      previousBest,
      currentBest: this.cache.bestScore,
      best: this.cache.bestScore,
    };
  }

  /**
   * Returns the total run attempts recorded on this device.
   */
  getAttempts() {
    return this.cache.attempts;
  }

  /**
   * Increments and saves total run attempts.
   */
  incrementAttempts() {
    this.cache.attempts++;
    this._rawSet(this.KEYS.ATTEMPTS, this.cache.attempts.toString());
    this._rawSet(this.KEYS.LEGACY_GAMES, this.cache.attempts.toString());
    return this.cache.attempts;
  }

  /**
   * Returns whether the player has completed or skipped the first-time tutorial.
   */
  hasSeenTutorial() {
    return this.cache.tutorialSeen;
  }

  /**
   * Marks the tutorial as completed or skipped.
   */
  markTutorialSeen(seen = true) {
    this.cache.tutorialSeen = Boolean(seen);
    this._rawSet(this.KEYS.TUTORIAL_SEEN, seen ? 'true' : 'false');
  }

  /**
   * Resets tutorial status so it will prompt again.
   */
  resetTutorialStatus() {
    this.markTutorialSeen(false);
  }

  /**
   * Returns current user settings.
   */
  getSettings() {
    return { ...this.cache.settings };
  }

  /**
   * Updates and saves user settings.
   */
  saveSettings(newSettings) {
    this.cache.settings = { ...this.cache.settings, ...newSettings };
    try {
      this._rawSet(this.KEYS.SETTINGS, JSON.stringify(this.cache.settings));
    } catch (e) {
      // Quota limit
    }
  }

  /**
   * Records lifetime statistics for a completed run.
   */
  recordRun(score, survivalTime, demolitions = 0) {
    const validScore = this._parseNonNegativeInt(score, 0);
    const validSurvival = this._parseNonNegativeNumber(survivalTime, 0);
    const validDemos = this._parseNonNegativeInt(demolitions, 0);

    this.cache.stats.totalScoreAccumulated += validScore;
    this.cache.stats.totalDemolitions += validDemos;
    if (validSurvival > this.cache.stats.maxSurvivalTime) {
      this.cache.stats.maxSurvivalTime = validSurvival;
    }

    try {
      this._rawSet(this.KEYS.STATS, JSON.stringify(this.cache.stats));
    } catch (e) {}
  }

  /**
   * Increments obstacle demolition counter.
   */
  recordDemolition() {
    this.cache.stats.totalDemolitions++;
    try {
      this._rawSet(this.KEYS.STATS, JSON.stringify(this.cache.stats));
    } catch (e) {}
  }

  /**
   * Returns lifetime statistics.
   */
  getStats() {
    return {
      ...this.cache.stats,
      longestSurvival: this.cache.stats.maxSurvivalTime,
      missileDemolitions: this.cache.stats.totalDemolitions,
      totalRuns: this.cache.attempts,
      personalBest: this.cache.bestScore,
      bestScore: this.cache.bestScore,
      attempts: this.cache.attempts,
    };
  }

  /**
   * Returns the player's callsign / name.
   */
  getPlayerName() {
    return this.cache.playerName;
  }

  /**
   * Sets player callsign / name locally.
   */
  setPlayerName(name) {
    const clean = (name || '').trim().replace(/[^a-zA-Z0-9_\- ]/g, '').slice(0, 16);
    this.cache.playerName = clean || this.defaults.playerName;
    this._rawSet(this.KEYS.PLAYER_NAME, this.cache.playerName);
    return this.cache.playerName;
  }
}

export const storage = new StorageManager();
