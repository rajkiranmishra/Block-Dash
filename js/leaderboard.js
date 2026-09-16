/**
 * BLOCK DASH - Global Leaderboard & Identity Manager
 *
 * Supports Supabase Anonymous Authentication and Row Level Security (RLS).
 * Includes robust offline fallback to localStorage so gameplay never crashes without network.
 */

import { CONFIG } from './config.js';

class LeaderboardManager {
  constructor() {
    this.client = null;
    this.userId = null;
    this.playerName = localStorage.getItem('blockdash_player_name') || this._generateDefaultName();
    this.personalBest = parseInt(localStorage.getItem('blockdash_pb') || '0', 10);
    this.gamesPlayed = parseInt(localStorage.getItem('blockdash_games_played') || '0', 10);
    this.isOnline = false;

    this._initSupabase();
  }

  /**
   * Initializes Supabase client if public credentials are provided in CONFIG.
   */
  async _initSupabase() {
    if (!CONFIG.SUPABASE.URL || !CONFIG.SUPABASE.ANON_KEY) {
      console.log('ℹ️ Supabase credentials not set in config.js. Using offline localStorage mode.');
      return;
    }

    if (typeof window.supabase === 'undefined') {
      console.warn('⚠️ Supabase JS SDK not loaded. Operating in offline localStorage mode.');
      return;
    }

    try {
      this.client = window.supabase.createClient(
        CONFIG.SUPABASE.URL,
        CONFIG.SUPABASE.ANON_KEY
      );

      // Sign in anonymously to obtain a persistent session ID
      const { data: sessionData, error: sessionErr } = await this.client.auth.getSession();
      
      if (!sessionData?.session) {
        const { data: authData, error: authErr } = await this.client.auth.signInAnonymously();
        if (authErr) throw authErr;
        this.userId = authData.user?.id;
      } else {
        this.userId = sessionData.session.user.id;
      }

      this.isOnline = true;
      console.log('✅ Supabase connected anonymously. User ID:', this.userId);
      await this.syncPlayerProfile();
    } catch (err) {
      console.warn('⚠️ Supabase connection failed. Falling back to localStorage:', err.message);
      this.isOnline = false;
    }
  }

  _generateDefaultName() {
    const tag = Math.floor(1000 + Math.random() * 9000);
    const defaultName = `Runner_${tag}`;
    localStorage.setItem('blockdash_player_name', defaultName);
    return defaultName;
  }

  /**
   * Updates player display name locally and on Supabase.
   */
  async setPlayerName(name) {
    const clean = (name || '').trim().replace(/[^a-zA-Z0-9_\- ]/g, '').slice(0, 16);
    if (!clean) return this.playerName;

    this.playerName = clean;
    localStorage.setItem('blockdash_player_name', clean);

    if (this.isOnline && this.client && this.userId) {
      try {
        await this.client
          .from('leaderboard')
          .upsert({
            user_id: this.userId,
            display_name: this.playerName,
            score: this.personalBest,
            games_played: this.gamesPlayed,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
      } catch (err) {
        console.warn('Failed to sync player name to Supabase:', err);
      }
    }
    return this.playerName;
  }

  /**
   * Retrieves player's personal best.
   */
  getPersonalBest() {
    return this.personalBest;
  }

  /**
   * Evaluates end-of-run score against personal best and submits if new high.
   *
   * @param {number} score - Achieved score
   * @param {number} survivalSeconds - Duration of the run in seconds
   * @returns {Promise<{ isNewPB: boolean, pb: number, globalRank: string }>}
   */
  async submitScore(score, survivalSeconds) {
    this.gamesPlayed++;
    localStorage.setItem('blockdash_games_played', this.gamesPlayed.toString());

    // Basic anti-cheat client sanity check: maximum theoretical score rate is ~450 pts/10s at max speed
    const maxTheoreticalScore = Math.max(500, survivalSeconds * 120 + 200);
    if (score > maxTheoreticalScore && survivalSeconds < 5) {
      console.warn('⚠️ Score sanity check failed. Score exceeds theoretical rate limit.');
      return { isNewPB: false, pb: this.personalBest, globalRank: '#---' };
    }

    let isNewPB = false;
    if (score > this.personalBest) {
      this.personalBest = score;
      localStorage.setItem('blockdash_pb', score.toString());
      isNewPB = true;
    }

    let globalRank = '#1';

    // Submit to Supabase if connected
    if (this.isOnline && this.client && this.userId) {
      try {
        await this.client
          .from('leaderboard')
          .upsert({
            user_id: this.userId,
            display_name: this.playerName,
            score: this.personalBest,
            games_played: this.gamesPlayed,
            max_survival_time: survivalSeconds,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });

        // Query current rank
        const { count, error } = await this.client
          .from('leaderboard')
          .select('*', { count: 'exact', head: true })
          .gt('score', this.personalBest);

        if (!error && count !== null) {
          globalRank = `#${count + 1}`;
        }
      } catch (err) {
        console.warn('Leaderboard score upload error:', err);
      }
    }

    return {
      isNewPB,
      pb: this.personalBest,
      globalRank: this.isOnline ? globalRank : '#LOCAL'
    };
  }

  /**
   * Fetches the top global leaderboard players and current player's rank.
   */
  async fetchTopScores(limit = 10) {
    if (!this.isOnline || !this.client) {
      return this._getOfflineLeaderboard();
    }

    try {
      const { data, error } = await this.client
        .from('leaderboard')
        .select('display_name, score, games_played, user_id')
        .order('score', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((row, idx) => ({
        rank: idx + 1,
        name: row.display_name || 'Anonymous',
        score: row.score || 0,
        isCurrentPlayer: row.user_id === this.userId
      }));
    } catch (err) {
      console.warn('Error fetching leaderboard:', err);
      return this._getOfflineLeaderboard();
    }
  }

  /**
   * Syncs existing profile data from remote database if present.
   */
  async syncPlayerProfile() {
    if (!this.isOnline || !this.client || !this.userId) return;
    try {
      const { data, error } = await this.client
        .from('leaderboard')
        .select('display_name, score, games_played')
        .eq('user_id', this.userId)
        .maybeSingle();

      if (!error && data) {
        if (data.score > this.personalBest) {
          this.personalBest = data.score;
          localStorage.setItem('blockdash_pb', this.personalBest.toString());
        }
        if (data.display_name) {
          this.playerName = data.display_name;
          localStorage.setItem('blockdash_player_name', this.playerName);
        }
      }
    } catch (e) {
      console.warn('Profile sync failed:', e);
    }
  }

  _getOfflineLeaderboard() {
    // Return mock rankings with the player's local PB embedded
    const mockList = [
      { rank: 1, name: 'VoidWalker', score: 14920, isCurrentPlayer: false },
      { rank: 2, name: 'CyberDash', score: 11450, isCurrentPlayer: false },
      { rank: 3, name: 'NeonPulse', score: 9820, isCurrentPlayer: false },
      { rank: 4, name: 'RageQuitter', score: 7640, isCurrentPlayer: false },
      { rank: 5, name: 'ZeroDelay', score: 5310, isCurrentPlayer: false },
    ];

    // Insert current player into mock list based on PB
    const current = {
      rank: 0,
      name: `${this.playerName} (YOU)`,
      score: this.personalBest,
      isCurrentPlayer: true
    };

    const combined = [...mockList, current].sort((a, b) => b.score - a.score);
    return combined.slice(0, 10).map((item, idx) => ({ ...item, rank: idx + 1 }));
  }
}

export const leaderboard = new LeaderboardManager();
