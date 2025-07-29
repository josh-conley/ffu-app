import type { LeagueTier, DraftData, DraftPick, UserInfo } from '../types';
import { dataService } from './data.service';
import { AVAILABLE_YEARS } from '../constants/leagues';
import { LEAGUES, getUserInfoBySleeperId } from '../config/constants';

export interface DrafterProfile {
  userId: string;
  userInfo: UserInfo;
  drafts: DraftSummary[];
  positionTiming: PositionTimingStats;
  consistencyMetrics: ConsistencyMetrics;
  rosterConstruction: RosterConstructionStats;
}

export interface DraftSummary {
  year: string;
  league: LeagueTier;
  draftPosition: number;
  picks: DraftPick[];
  firstPositionPicks: Record<string, number>; // position -> round number
  rosterByRound10: Record<string, number>; // position -> count
}

export interface PositionTimingStats {
  averageFirstPick: Record<string, number>; // position -> average round
  standardDeviation: Record<string, number>; // position -> consistency measure
  earliestPick: Record<string, number>; // position -> earliest round ever
  latestPick: Record<string, number>; // position -> latest round ever
}

export interface ConsistencyMetrics {
  overallConsistencyScore: number; // 0-100, higher = more consistent
  positionConsistency: Record<string, number>; // position -> consistency score
  strategyEvolution: StrategyEvolution[];
}

export interface StrategyEvolution {
  year: string;
  strategy: 'RB_HEAVY' | 'WR_HEAVY' | 'BALANCED' | 'ZERO_RB' | 'HERO_RB' | 'LATE_QB' | 'EARLY_QB';
  confidence: number; // 0-1
}

export interface RosterConstructionStats {
  averageByPosition: Record<string, number>; // position -> average count by round 10
  mostCommonConstruction: string; // e.g., "3RB-4WR-1TE"
  rosterPatterns: RosterPattern[];
}

export interface RosterPattern {
  pattern: string; // e.g., "2RB-3WR-1QB"
  frequency: number; // how often this pattern occurs
  years: string[];
}

export interface LeagueTrends {
  year: string;
  league: LeagueTier;
  positionADP: Record<string, number[]>; // position -> array of pick numbers
  positionRuns: PositionRun[];
  earlyRoundTrends: EarlyRoundTrend[];
}

export interface PositionRun {
  position: string;
  startPick: number;
  endPick: number;
  pickCount: number;
  round: number;
}

export interface EarlyRoundTrend {
  round: number;
  positionDistribution: Record<string, number>; // position -> percentage
  mostPopularPick: string; // position
}

export interface FullDraftTrend {
  round: number;
  positionDistribution: Record<string, number>; // position -> percentage
  mostPopularPick: string; // position
  totalPicks: number;
}

export interface ComprehensiveLeagueTrends extends LeagueTrends {
  fullDraftTrends: FullDraftTrend[]; // All rounds analysis
  earlyRoundFocus: EarlyRoundTrend[]; // Rounds 1-6 only
}

export interface DraftHeatMapData {
  round: number;
  pick: number;
  position: string;
  frequency: number; // 0-1, how often this position is picked here
}

export class DraftAnalysisService {
  private cachedAnalysis: Map<string, any> = new Map();

  /**
   * Load and aggregate all historical draft data
   */
  async loadAllHistoricalDraftData(): Promise<DraftData[]> {
    const allDrafts: DraftData[] = [];
    
    for (const league of LEAGUES) {
      if (AVAILABLE_YEARS.includes(league.year as any)) {
        try {
          const historicalData = await dataService.loadHistoricalLeagueData(league.tier, league.year);
          if (historicalData?.draftData) {
            allDrafts.push(historicalData.draftData);
          }
        } catch (error) {
          console.warn(`Failed to load draft data for ${league.tier} ${league.year}:`, error);
        }
      }
    }
    
    return allDrafts;
  }

  /**
   * Generate comprehensive drafter profiles for all users
   */
  async generateDrafterProfiles(): Promise<DrafterProfile[]> {
    const cacheKey = 'drafterProfiles';
    if (this.cachedAnalysis.has(cacheKey)) {
      return this.cachedAnalysis.get(cacheKey);
    }

    const allDrafts = await this.loadAllHistoricalDraftData();
    const drafterMap = new Map<string, DraftSummary[]>();

    // Group drafts by drafter
    for (const draftData of allDrafts) {
      for (const pick of draftData.picks) {
        const userId = pick.pickedBy;
        if (!drafterMap.has(userId)) {
          drafterMap.set(userId, []);
        }

        // Find or create draft summary for this drafter/year/league
        let draftSummary = drafterMap.get(userId)!.find(
          d => d.year === draftData.year && d.league === draftData.league
        );

        if (!draftSummary) {
          const draftPosition = draftData.draftOrder[userId] || 0;
          draftSummary = {
            year: draftData.year,
            league: draftData.league,
            draftPosition,
            picks: [],
            firstPositionPicks: {},
            rosterByRound10: {}
          };
          drafterMap.get(userId)!.push(draftSummary);
        }

        draftSummary.picks.push(pick);
      }
    }

    // Generate profiles for each drafter
    const profiles: DrafterProfile[] = [];
    
    for (const [userId, drafts] of drafterMap.entries()) {
      const userInfo = getUserInfoBySleeperId(userId);
      if (!userInfo) continue;

      // Calculate position timing and roster construction for each draft
      for (const draft of drafts) {
        this.calculateDraftMetrics(draft);
      }

      const profile: DrafterProfile = {
        userId,
        userInfo: {
          userId,
          teamName: userInfo.teamName,
          abbreviation: userInfo.abbreviation
        },
        drafts,
        positionTiming: this.calculatePositionTiming(drafts),
        consistencyMetrics: this.calculateConsistencyMetrics(drafts),
        rosterConstruction: this.calculateRosterConstruction(drafts)
      };

      profiles.push(profile);
    }

    this.cachedAnalysis.set(cacheKey, profiles);
    return profiles;
  }

  /**
   * Calculate draft metrics for a single draft summary
   */
  private calculateDraftMetrics(draft: DraftSummary): void {
    const sortedPicks = draft.picks.sort((a, b) => a.pickNumber - b.pickNumber);
    
    // Track first pick by position
    for (const pick of sortedPicks) {
      const position = pick.playerInfo.position;
      if (!draft.firstPositionPicks[position]) {
        draft.firstPositionPicks[position] = pick.round;
      }
    }

    // Count roster composition by round 10
    draft.rosterByRound10 = {};
    for (const pick of sortedPicks) {
      if (pick.round <= 10) {
        const position = pick.playerInfo.position;
        draft.rosterByRound10[position] = (draft.rosterByRound10[position] || 0) + 1;
      }
    }
  }

  /**
   * Calculate position timing statistics for a drafter
   */
  private calculatePositionTiming(drafts: DraftSummary[]): PositionTimingStats {
    const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
    const positionPicks: Record<string, number[]> = {};
    
    // Collect all first picks by position across drafts
    for (const position of positions) {
      positionPicks[position] = [];
      for (const draft of drafts) {
        if (draft.firstPositionPicks[position]) {
          positionPicks[position].push(draft.firstPositionPicks[position]);
        }
      }
    }

    const averageFirstPick: Record<string, number> = {};
    const standardDeviation: Record<string, number> = {};
    const earliestPick: Record<string, number> = {};
    const latestPick: Record<string, number> = {};

    for (const position of positions) {
      const picks = positionPicks[position];
      if (picks.length === 0) continue;

      averageFirstPick[position] = picks.reduce((sum, pick) => sum + pick, 0) / picks.length;
      earliestPick[position] = Math.min(...picks);
      latestPick[position] = Math.max(...picks);

      // Calculate standard deviation
      const mean = averageFirstPick[position];
      const variance = picks.reduce((sum, pick) => sum + Math.pow(pick - mean, 2), 0) / picks.length;
      standardDeviation[position] = Math.sqrt(variance);
    }

    return {
      averageFirstPick,
      standardDeviation,
      earliestPick,
      latestPick
    };
  }

  /**
   * Calculate consistency metrics for a drafter
   */
  private calculateConsistencyMetrics(drafts: DraftSummary[]): ConsistencyMetrics {
    const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
    const positionConsistency: Record<string, number> = {};
    
    // Calculate consistency score for each position (lower std dev = higher consistency)
    for (const position of positions) {
      const picks: number[] = [];
      for (const draft of drafts) {
        if (draft.firstPositionPicks[position]) {
          picks.push(draft.firstPositionPicks[position]);
        }
      }
      
      if (picks.length >= 2) {
        const mean = picks.reduce((sum, pick) => sum + pick, 0) / picks.length;
        const variance = picks.reduce((sum, pick) => sum + Math.pow(pick - mean, 2), 0) / picks.length;
        const stdDev = Math.sqrt(variance);
        // Convert to 0-100 scale (lower std dev = higher score)
        positionConsistency[position] = Math.max(0, 100 - (stdDev * 20));
      } else {
        positionConsistency[position] = 0; // Not enough data
      }
    }

    // Overall consistency is average of position consistencies
    const scores = Object.values(positionConsistency).filter(score => score > 0);
    const overallConsistencyScore = scores.length > 0 
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
      : 0;

    // Strategy evolution analysis
    const strategyEvolution = this.analyzeStrategyEvolution(drafts);

    return {
      overallConsistencyScore,
      positionConsistency,
      strategyEvolution
    };
  }

  /**
   * Analyze how a drafter's strategy has evolved over time
   */
  private analyzeStrategyEvolution(drafts: DraftSummary[]): StrategyEvolution[] {
    const evolution: StrategyEvolution[] = [];
    
    for (const draft of drafts.sort((a, b) => a.year.localeCompare(b.year))) {
      const firstFiveRounds = draft.picks
        .filter(pick => pick.round <= 5)
        .sort((a, b) => a.pickNumber - b.pickNumber);
      
      const rbCount = firstFiveRounds.filter(pick => pick.playerInfo.position === 'RB').length;
      const wrCount = firstFiveRounds.filter(pick => pick.playerInfo.position === 'WR').length;
      const qbRound = draft.firstPositionPicks['QB'] || 99;
      
      let strategy: StrategyEvolution['strategy'] = 'BALANCED';
      let confidence = 0.5;
      
      if (rbCount >= 3 && rbCount > wrCount) {
        strategy = 'RB_HEAVY';
        confidence = 0.8;
      } else if (wrCount >= 3 && wrCount > rbCount) {
        strategy = 'WR_HEAVY';
        confidence = 0.8;
      } else if (rbCount === 0 && wrCount >= 2) {
        strategy = 'ZERO_RB';
        confidence = 0.9;
      } else if (rbCount === 1 && wrCount >= 3) {
        strategy = 'HERO_RB';
        confidence = 0.7;
      }
      
      if (qbRound <= 3) {
        strategy = 'EARLY_QB';
        confidence = 0.9;
      } else if (qbRound >= 8) {
        strategy = 'LATE_QB';
        confidence = 0.8;
      }
      
      evolution.push({
        year: draft.year,
        strategy,
        confidence
      });
    }
    
    return evolution;
  }

  /**
   * Calculate roster construction statistics
   */
  private calculateRosterConstruction(drafts: DraftSummary[]): RosterConstructionStats {
    const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
    const averageByPosition: Record<string, number> = {};
    const patterns: Map<string, { frequency: number; years: string[] }> = new Map();
    
    // Calculate averages
    for (const position of positions) {
      const counts: number[] = [];
      for (const draft of drafts) {
        counts.push(draft.rosterByRound10[position] || 0);
      }
      averageByPosition[position] = counts.length > 0 
        ? counts.reduce((sum, count) => sum + count, 0) / counts.length 
        : 0;
    }
    
    // Track roster patterns
    for (const draft of drafts) {
      const pattern = this.generateRosterPattern(draft.rosterByRound10);
      if (!patterns.has(pattern)) {
        patterns.set(pattern, { frequency: 0, years: [] });
      }
      patterns.get(pattern)!.frequency++;
      patterns.get(pattern)!.years.push(draft.year);
    }
    
    // Find most common construction
    let mostCommonConstruction = '';
    let maxFrequency = 0;
    for (const [pattern, data] of patterns.entries()) {
      if (data.frequency > maxFrequency) {
        maxFrequency = data.frequency;
        mostCommonConstruction = pattern;
      }
    }
    
    const rosterPatterns: RosterPattern[] = Array.from(patterns.entries())
      .map(([pattern, data]) => ({
        pattern,
        frequency: data.frequency / drafts.length,
        years: data.years
      }))
      .sort((a, b) => b.frequency - a.frequency);
    
    return {
      averageByPosition,
      mostCommonConstruction,
      rosterPatterns
    };
  }

  /**
   * Generate a roster pattern string from position counts
   */
  private generateRosterPattern(rosterByRound10: Record<string, number>): string {
    const positions = ['QB', 'RB', 'WR', 'TE'];
    const pattern = positions
      .filter(pos => (rosterByRound10[pos] || 0) > 0)
      .map(pos => `${rosterByRound10[pos]}${pos}`)
      .join('-');
    return pattern || 'UNKNOWN';
  }

  /**
   * Generate comprehensive league-wide trend analysis
   */
  async generateLeagueTrends(): Promise<ComprehensiveLeagueTrends[]> {
    const cacheKey = 'leagueTrends';
    if (this.cachedAnalysis.has(cacheKey)) {
      return this.cachedAnalysis.get(cacheKey);
    }

    const allDrafts = await this.loadAllHistoricalDraftData();
    const trends: ComprehensiveLeagueTrends[] = [];

    for (const draftData of allDrafts) {
      const positionADP: Record<string, number[]> = {};
      const roundData: Record<number, Record<string, number>> = {};
      
      // Collect position data
      for (const pick of draftData.picks) {
        const position = pick.playerInfo.position;
        if (!positionADP[position]) {
          positionADP[position] = [];
        }
        positionADP[position].push(pick.pickNumber);
        
        // Track round data for all rounds
        if (!roundData[pick.round]) {
          roundData[pick.round] = {};
        }
        roundData[pick.round][position] = (roundData[pick.round][position] || 0) + 1;
      }

      // Calculate position runs
      const positionRuns = this.identifyPositionRuns(draftData.picks);
      
      // Calculate full draft trends (all rounds)
      const fullDraftTrends: FullDraftTrend[] = [];
      const earlyRoundTrends: EarlyRoundTrend[] = [];
      
      for (const [round, positions] of Object.entries(roundData)) {
        const roundNum = parseInt(round);
        const total = Object.values(positions).reduce((sum, count) => sum + count, 0);
        const positionDistribution: Record<string, number> = {};
        let mostPopularPick = '';
        let maxCount = 0;
        
        for (const [position, count] of Object.entries(positions)) {
          positionDistribution[position] = count / total * 100;
          if (count > maxCount) {
            maxCount = count;
            mostPopularPick = position;
          }
        }
        
        // Full draft trends (all rounds)
        fullDraftTrends.push({
          round: roundNum,
          positionDistribution,
          mostPopularPick,
          totalPicks: total
        });
        
        // Early round focus (rounds 1-6 only)
        if (roundNum <= 6) {
          earlyRoundTrends.push({
            round: roundNum,
            positionDistribution,
            mostPopularPick
          });
        }
      }

      trends.push({
        year: draftData.year,
        league: draftData.league,
        positionADP,
        positionRuns,
        earlyRoundTrends: earlyRoundTrends.sort((a, b) => a.round - b.round),
        earlyRoundFocus: earlyRoundTrends.sort((a, b) => a.round - b.round),
        fullDraftTrends: fullDraftTrends.sort((a, b) => a.round - b.round)
      });
    }

    this.cachedAnalysis.set(cacheKey, trends);
    return trends;
  }

  /**
   * Identify position runs in a draft (3+ consecutive picks of same position)
   */
  private identifyPositionRuns(picks: DraftPick[]): PositionRun[] {
    const sortedPicks = picks.sort((a, b) => a.pickNumber - b.pickNumber);
    const runs: PositionRun[] = [];
    let currentRun: PositionRun | null = null;
    
    for (const pick of sortedPicks) {
      const position = pick.playerInfo.position;
      
      if (currentRun && currentRun.position === position && pick.pickNumber === currentRun.endPick + 1) {
        // Continue the run
        currentRun.endPick = pick.pickNumber;
        currentRun.pickCount++;
      } else {
        // Start a new run (only if we have at least 3 consecutive picks)
        if (currentRun && currentRun.pickCount >= 3) {
          runs.push(currentRun);
        }
        
        currentRun = {
          position,
          startPick: pick.pickNumber,
          endPick: pick.pickNumber,
          pickCount: 1,
          round: pick.round
        };
      }
    }
    
    // Don't forget the last run
    if (currentRun && currentRun.pickCount >= 3) {
      runs.push(currentRun);
    }
    
    return runs;
  }

  /**
   * Generate draft heat map data for visualization
   */
  async generateDraftHeatMap(): Promise<DraftHeatMapData[]> {
    const cacheKey = 'draftHeatMap';
    if (this.cachedAnalysis.has(cacheKey)) {
      return this.cachedAnalysis.get(cacheKey);
    }

    const allDrafts = await this.loadAllHistoricalDraftData();
    const heatMapData: DraftHeatMapData[] = [];
    const pickPositionCounts: Map<string, Map<string, number>> = new Map(); // "round-pick" -> position -> count
    const totalDrafts = allDrafts.length;

    for (const draftData of allDrafts) {
      for (const pick of draftData.picks) {
        if (pick.round <= 15) { // Only consider first 15 rounds for heat map
          const key = `${pick.round}-${pick.draftSlot}`;
          const position = pick.playerInfo.position;
          
          if (!pickPositionCounts.has(key)) {
            pickPositionCounts.set(key, new Map());
          }
          
          const positionMap = pickPositionCounts.get(key)!;
          positionMap.set(position, (positionMap.get(position) || 0) + 1);
        }
      }
    }

    // Convert to heat map data
    for (const [key, positionMap] of pickPositionCounts.entries()) {
      const [round, pick] = key.split('-').map(Number);
      
      for (const [position, count] of positionMap.entries()) {
        heatMapData.push({
          round,
          pick,
          position,
          frequency: count / totalDrafts
        });
      }
    }

    this.cachedAnalysis.set(cacheKey, heatMapData);
    return heatMapData;
  }

  /**
   * Clear the analysis cache
   */
  clearCache(): void {
    this.cachedAnalysis.clear();
  }

  /**
   * Get a specific drafter's profile
   */
  async getDrafterProfile(userId: string): Promise<DrafterProfile | null> {
    const profiles = await this.generateDrafterProfiles();
    return profiles.find(profile => profile.userId === userId) || null;
  }

  /**
   * Get comparative analysis between drafters
   */
  async compareDrafters(userIds: string[]): Promise<{
    comparison: Record<string, DrafterProfile>;
    similarities: Record<string, number>; // userId pair -> similarity score
  }> {
    const profiles = await this.generateDrafterProfiles();
    const comparison: Record<string, DrafterProfile> = {};
    const similarities: Record<string, number> = {};

    for (const userId of userIds) {
      const profile = profiles.find(p => p.userId === userId);
      if (profile) {
        comparison[userId] = profile;
      }
    }

    // Calculate similarity scores between all pairs
    for (let i = 0; i < userIds.length; i++) {
      for (let j = i + 1; j < userIds.length; j++) {
        const user1 = comparison[userIds[i]];
        const user2 = comparison[userIds[j]];
        
        if (user1 && user2) {
          const similarity = this.calculateDrafterSimilarity(user1, user2);
          similarities[`${userIds[i]}-${userIds[j]}`] = similarity;
        }
      }
    }

    return { comparison, similarities };
  }

  /**
   * Calculate similarity score between two drafters (0-100)
   */
  private calculateDrafterSimilarity(drafter1: DrafterProfile, drafter2: DrafterProfile): number {
    const positions = ['QB', 'RB', 'WR', 'TE'];
    let totalSimilarity = 0;
    let comparisons = 0;

    // Compare position timing
    for (const position of positions) {
      const avg1 = drafter1.positionTiming.averageFirstPick[position];
      const avg2 = drafter2.positionTiming.averageFirstPick[position];
      
      if (avg1 && avg2) {
        const difference = Math.abs(avg1 - avg2);
        const similarity = Math.max(0, 100 - (difference * 10)); // Penalize round differences
        totalSimilarity += similarity;
        comparisons++;
      }
    }

    // Compare roster construction
    for (const position of positions) {
      const avg1 = drafter1.rosterConstruction.averageByPosition[position] || 0;
      const avg2 = drafter2.rosterConstruction.averageByPosition[position] || 0;
      
      const difference = Math.abs(avg1 - avg2);
      const similarity = Math.max(0, 100 - (difference * 25)); // Penalize count differences
      totalSimilarity += similarity;
      comparisons++;
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }
}

export const draftAnalysisService = new DraftAnalysisService();