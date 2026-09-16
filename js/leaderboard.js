/**
 * ==============================================================================
 * BLOCK DASH - Local Player Records & Statistics Manager
 *
 * Fully offline, zero-network records system.
 * Wraps StorageManager to provide clean synchronous access to Personal Bests,
 * lifetime attempt statistics, survival records, and local score evaluation.
 * ==============================================================================
 */

import { storage } from './storage.js';

class RecordsManager {
  constructor() {
    this.storage = storage;
  }

  get playerName() {
    return this.storage.getPlayerName();
  }

  get personalBest() {
    return this.storage.getBestScore();
  }

  get gamesPlayed() {
    return this.storage.getAttempts();
  }

  getPersonalBest() {
    return this.storage.getBestScore();
  }

  setPlayerName(name) {
    return this.storage.setPlayerName(name);
  }

  /**
   * Submits a run score. Returns whether a new personal best was achieved.
   *
   * @param {number} score
   * @param {number} survivalSeconds
   * @param {number} demolitions
   * @returns {{ isNewPB: boolean, pb: number, attempts: number }}
   */
  submitScore(score, survivalSeconds = 0, demolitions = 0) {
    const attempts = this.storage.incrementAttempts();
    const result = this.storage.saveBestScore(score);
    this.storage.recordRun(score, survivalSeconds, demolitions);

    return {
      isNewPB: result.isNewPB,
      pb: result.currentBest,
      attempts
    };
  }

  /**
   * Returns localized player records and milestone statistics.
   */
  getRecordStats() {
    const stats = this.storage.getStats();
    return {
      personalBest: stats.bestScore,
      totalAttempts: stats.attempts,
      maxSurvivalTime: stats.maxSurvivalTime,
      totalDemolitions: stats.totalDemolitions,
      totalScoreAccumulated: stats.totalScoreAccumulated,
      playerName: this.storage.getPlayerName(),
    };
  }
}

export const leaderboard = new RecordsManager();
export const records = leaderboard;
