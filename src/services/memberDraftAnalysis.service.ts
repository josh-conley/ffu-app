import type { LeagueTier, DraftData, DraftPick, UserInfo } from '../types';
import { getUserInfoBySleeperId } from '../config/constants';
import { draftAnalysisService } from './draftAnalysis.service';

export interface MemberDraftProfile {
  userId: string;
  userInfo: UserInfo;
  historicalDrafts: HistoricalDraft[];
  behavioralPatterns: BehavioralPatterns;
  contextualTendencies: ContextualTendencies;
  predictiveModel: PredictiveModel;
}

export interface HistoricalDraft {
  year: string;
  league: LeagueTier;
  draftPosition: number;
  totalTeams: number;
  picks: EnhancedDraftPick[];
  strategy: DraftStrategy;
  performance: DraftPerformance;
}

export interface EnhancedDraftPick {
  round: number;
  pickNumber: number;
  draftSlot: number;
  player: string;
  position: string;
  team: string;
  adpAtTime?: number;
  valueScore?: number; // positive = value pick, negative = reach
  rosterContext: RosterContext;
  boardContext: BoardContext;
}

export interface RosterContext {
  positionCounts: Record<string, number>;
  majorNeeds: string[];
  depthNeeds: string[];
}

export interface BoardContext {
  positionsAvailable: Record<string, number>;
  recentPositionRun?: string;
  scarcityAlerts: string[];
}

export interface DraftStrategy {
  earlyRoundApproach: 'RB_HEAVY' | 'WR_HEAVY' | 'BALANCED' | 'ZERO_RB' | 'HERO_RB';
  qbTiming: 'EARLY' | 'MID' | 'LATE' | 'VERY_LATE';
  teTiming: 'EARLY' | 'MID' | 'LATE' | 'STREAM';
  riskTolerance: 'HIGH' | 'MEDIUM' | 'LOW';
  valueFocus: 'REACH_HEAVY' | 'BALANCED' | 'VALUE_FOCUSED';
}

export interface DraftPerformance {
  valuePickCount: number;
  reachCount: number;
  averageValueScore: number;
  strategicCoherence: number; // 0-100, how consistent was the strategy
}

export interface BehavioralPatterns {
  positionTimingPreferences: Record<string, RoundDistribution>;
  valueTendencies: ValueTendencies;
  adaptationPatterns: AdaptationPatterns;
  consistencyMetrics: ConsistencyMetrics;
}

export interface RoundDistribution {
  rounds: Record<number, number>; // round -> probability
  averageRound: number;
  standardDeviation: number;
  earliestRound: number;
  latestRound: number;
}

export interface ValueTendencies {
  averageValueScore: number;
  reachFrequency: number; // percentage of picks that were reaches
  valuePickFrequency: number; // percentage of picks that were values
  positionReachTendencies: Record<string, number>; // which positions they reach for most
}

export interface AdaptationPatterns {
  draftPositionAdaptation: Record<string, number>; // early/mid/late draft position -> strategy shift score
  scarcityResponse: ScarcityResponse;
  boardFlowAdaptation: number; // 0-100, how much they adapt to board vs stick to plan
}

export interface ScarcityResponse {
  positionRunReaction: Record<string, number>; // position -> panic pick probability
  waitVsPanicThreshold: Record<string, number>; // position -> threshold for panicking
}

export interface ConsistencyMetrics {
  strategicConsistency: number; // 0-100, how consistent their strategy is across years
  timingConsistency: Record<string, number>; // position -> timing consistency score
  adaptabilityScore: number; // 0-100, how well they adapt to different situations
}

export interface ContextualTendencies {
  roundSpecificPatterns: Record<number, RoundPattern>; // round -> typical behavior
  draftPositionPatterns: Record<string, PositionPattern>; // early/mid/late -> behavior
  situationalPreferences: SituationalPreferences;
}

export interface RoundPattern {
  positionPreferences: Record<string, number>; // position -> selection probability
  valueThreshold: number; // how much value needed to deviate from preference
  typicalStrategy: string;
}

export interface PositionPattern {
  strategyShift: string;
  positionPriorities: string[];
  riskTolerance: number;
}

export interface SituationalPreferences {
  whenBehindOnPosition: Record<string, 'PANIC' | 'WAIT' | 'ADAPT'>; // how they react to being behind on a position
  whenAheadOnPosition: Record<string, 'CONTINUE' | 'DIVERSIFY' | 'VALUE_HUNT'>; // how they react to being ahead
  lateRoundBehavior: 'SAFE_DEPTH' | 'HIGH_UPSIDE' | 'BALANCED';
}

export interface PredictiveModel {
  baselineProbabilities: Record<string, Record<number, number>>; // position -> round -> probability
  contextualAdjustments: ContextualAdjustments;
  decisionTree: DecisionNode[];
}

export interface ContextualAdjustments {
  draftPositionMultipliers: Record<string, Record<string, number>>; // draft position -> position -> multiplier
  rosterStateMultipliers: Record<string, Record<string, number>>; // roster need level -> position -> multiplier
  boardStateMultipliers: Record<string, Record<string, number>>; // scarcity level -> position -> multiplier
}

export interface DecisionNode {
  condition: DecisionCondition;
  outcome: DecisionOutcome;
  confidence: number;
}

export interface DecisionCondition {
  round?: number | [number, number]; // specific round or range
  draftPosition?: 'EARLY' | 'MID' | 'LATE';
  rosterNeeds?: string[];
  boardState?: string[];
  previousPicks?: string[]; // recent position pattern
}

export interface DecisionOutcome {
  preferredPositions: string[];
  avoidedPositions?: string[];
  valueThreshold?: number; // minimum value score to consider
  fallbackBehavior: 'BEST_AVAILABLE' | 'NEED_BASED' | 'VALUE_HUNT';
}

export class MemberDraftAnalysisService {
  private memberProfiles: Map<string, MemberDraftProfile> = new Map();
  private cachedAnalysis: Map<string, any> = new Map();

  // Define the 12 Premier League members we want to analyze
  private readonly PREMIER_MEMBERS = [
    '84006772809285632',   // JoshC94 - The Minutemen
    '331590801261883392',  // TheMurdockle - The Stallions
    '399297882890440704',  // TCoolDaGoat - Circle City Phantoms
    '399322397750124544',  // Jacamart
    '465884883869233152',  // CamDelphia
    '467553389673181184',  // ExtremeSolution - Shton's Strikers
    '470715135581745152',  // Pressthecot - Pottsville Maroons
    '507633950666584064',  // DavrilOfKurth - El Guapo Puto
    '508719015656099840',  // Jamauro - Team Pancake
    '527884868880531456',  // ItsAllOgre - Johnkshire Cats
    '710981985102802944',  // GooberX
    '727368657923063808',  // Haunter151 - Fort Wayne Banana Bread
  ];

  /**
   * Generate comprehensive member-specific draft profiles
   */
  async generateMemberProfiles(): Promise<MemberDraftProfile[]> {
    const cacheKey = 'memberProfiles';
    if (this.cachedAnalysis.has(cacheKey)) {
      return this.cachedAnalysis.get(cacheKey);
    }

    const allDrafts = await draftAnalysisService.loadAllHistoricalDraftData();
    const profiles: MemberDraftProfile[] = [];

    for (const userId of this.PREMIER_MEMBERS) {
      const userInfo = getUserInfoBySleeperId(userId);
      if (!userInfo) continue;

      // Extract this member's historical drafts
      const historicalDrafts = await this.extractMemberDrafts(userId, allDrafts);
      
      if (historicalDrafts.length === 0) continue; // Skip if no draft data

      // Analyze behavioral patterns
      const behavioralPatterns = this.analyzeBehavioralPatterns(historicalDrafts);
      
      // Extract contextual tendencies
      const contextualTendencies = this.analyzeContextualTendencies(historicalDrafts);
      
      // Build predictive model
      const predictiveModel = this.buildPredictiveModel(behavioralPatterns, contextualTendencies, historicalDrafts);

      const profile: MemberDraftProfile = {
        userId,
        userInfo: {
          userId,
          ffuUserId: userId,
          teamName: userInfo.teamName || 'Unknown',
          abbreviation: userInfo.abbreviation || 'UNK'
        },
        historicalDrafts,
        behavioralPatterns,
        contextualTendencies,
        predictiveModel
      };

      profiles.push(profile);
      this.memberProfiles.set(userId, profile);
    }

    this.cachedAnalysis.set(cacheKey, profiles);
    return profiles;
  }

  /**
   * Extract and analyze all historical draft data for a specific member
   */
  private async extractMemberDrafts(userId: string, allDrafts: DraftData[]): Promise<HistoricalDraft[]> {
    const historicalDrafts: HistoricalDraft[] = [];

    for (const draftData of allDrafts) {
      // Only analyze Premier league drafts
      if (draftData.league !== 'premier' as LeagueTier) continue;

      const memberPicks = draftData.picks
        .filter(pick => pick.pickedBy === userId)
        .sort((a, b) => a.pickNumber - b.pickNumber);

      if (memberPicks.length === 0) continue;

      const draftPosition = draftData.draftOrder[userId];
      if (!draftPosition) continue;

      // Enhance picks with context and value analysis
      const enhancedPicks = await this.enhanceDraftPicks(memberPicks, draftData);

      // Analyze draft strategy
      const strategy = this.analyzeDraftStrategy(enhancedPicks);

      // Calculate draft performance
      const performance = this.calculateDraftPerformance(enhancedPicks);

      historicalDrafts.push({
        year: draftData.year,
        league: draftData.league,
        draftPosition,
        totalTeams: Object.keys(draftData.draftOrder).length,
        picks: enhancedPicks,
        strategy,
        performance
      });
    }

    return historicalDrafts;
  }

  /**
   * Enhance draft picks with contextual information and value scoring
   */
  private async enhanceDraftPicks(picks: DraftPick[], draftData: DraftData): Promise<EnhancedDraftPick[]> {
    const enhancedPicks: EnhancedDraftPick[] = [];

    for (let i = 0; i < picks.length; i++) {
      const pick = picks[i];
      const previousPicks = picks.slice(0, i);
      
      // Calculate roster context at time of pick
      const rosterContext = this.calculateRosterContext(previousPicks);
      
      // Calculate board context at time of pick
      const boardContext = this.calculateBoardContext(pick, draftData);

      // Estimate value score (would need historical ADP data for accuracy)  
      const valueScore = this.estimateValueScore();

      enhancedPicks.push({
        round: pick.round,
        pickNumber: pick.pickNumber,
        draftSlot: pick.draftSlot,
        player: pick.playerInfo.name,
        position: pick.playerInfo.position,
        team: pick.playerInfo.team!,
        adpAtTime: undefined, // Would need historical ADP data
        valueScore,
        rosterContext,
        boardContext
      });
    }

    return enhancedPicks;
  }

  /**
   * Calculate roster context at the time of a pick
   */
  private calculateRosterContext(previousPicks: DraftPick[]): RosterContext {
    const positionCounts: Record<string, number> = {};
    
    for (const pick of previousPicks) {
      const position = pick.playerInfo.position;
      positionCounts[position] = (positionCounts[position] || 0) + 1;
    }

    // Determine major needs based on typical roster construction
    const majorNeeds: string[] = [];
    const depthNeeds: string[] = [];

    // Standard needs: 1QB, 2-3RB, 3-4WR, 1-2TE, 1DEF
    if ((positionCounts.QB || 0) === 0) majorNeeds.push('QB');
    if ((positionCounts.RB || 0) < 2) majorNeeds.push('RB');
    if ((positionCounts.WR || 0) < 3) majorNeeds.push('WR');
    if ((positionCounts.TE || 0) === 0) majorNeeds.push('TE');
    if ((positionCounts.DEF || 0) === 0 && previousPicks.length > 10) majorNeeds.push('DEF');

    // Depth needs
    if ((positionCounts.RB || 0) < 4) depthNeeds.push('RB');
    if ((positionCounts.WR || 0) < 5) depthNeeds.push('WR');
    if ((positionCounts.TE || 0) < 2) depthNeeds.push('TE');

    return {
      positionCounts,
      majorNeeds,
      depthNeeds
    };
  }

  /**
   * Calculate board context at the time of a pick
   */
  private calculateBoardContext(pick: DraftPick, draftData: DraftData): BoardContext {
    // Get all picks before this one to understand board state
    const previousPicks = draftData.picks
      .filter(p => p.pickNumber < pick.pickNumber)
      .sort((a, b) => a.pickNumber - b.pickNumber);

    const positionsAvailable: Record<string, number> = {};
    
    // This is a simplified calculation - in reality we'd need to track
    // the actual available player pool
    const recentPicks = previousPicks.slice(-6); // Last 6 picks
    const positionCounts: Record<string, number> = {};
    
    for (const recentPick of recentPicks) {
      const position = recentPick.playerInfo.position;
      positionCounts[position] = (positionCounts[position] || 0) + 1;
    }

    // Identify position runs
    let recentPositionRun: string | undefined;
    const lastThreePicks = recentPicks.slice(-3);
    if (lastThreePicks.length === 3) {
      const lastThreePositions = lastThreePicks.map(p => p.playerInfo.position);
      const uniquePositions = [...new Set(lastThreePositions)];
      if (uniquePositions.length === 1) {
        recentPositionRun = uniquePositions[0];
      }
    }

    // Identify scarcity alerts (simplified)
    const scarcityAlerts: string[] = [];
    for (const [position, count] of Object.entries(positionCounts)) {
      if (count >= 3) {
        scarcityAlerts.push(position);
      }
    }

    return {
      positionsAvailable,
      recentPositionRun,
      scarcityAlerts
    };
  }

  /**
   * Estimate value score for a pick (simplified without historical ADP)
   */
  private estimateValueScore(): number {
    // This is a placeholder - in a real implementation, we'd compare
    // to historical ADP data to determine if this was a reach or value
    // For now, return a random score to indicate the concept
    return Math.random() * 20 - 10; // -10 to +10 scale
  }

  /**
   * Analyze the overall draft strategy from enhanced picks
   */
  private analyzeDraftStrategy(picks: EnhancedDraftPick[]): DraftStrategy {
    const firstSixRounds = picks.filter(p => p.round <= 6);
    const rbCount = firstSixRounds.filter(p => p.position === 'RB').length;
    const wrCount = firstSixRounds.filter(p => p.position === 'WR').length;
    
    const qbPick = picks.find(p => p.position === 'QB');
    const tePick = picks.find(p => p.position === 'TE');

    // Determine early round approach
    let earlyRoundApproach: DraftStrategy['earlyRoundApproach'] = 'BALANCED';
    if (rbCount >= 3 && rbCount > wrCount) {
      earlyRoundApproach = 'RB_HEAVY';
    } else if (wrCount >= 3 && wrCount > rbCount) {
      earlyRoundApproach = 'WR_HEAVY';
    } else if (rbCount === 0 && wrCount >= 2) {
      earlyRoundApproach = 'ZERO_RB';
    } else if (rbCount === 1 && wrCount >= 3) {
      earlyRoundApproach = 'HERO_RB';
    }

    // Determine QB timing
    let qbTiming: DraftStrategy['qbTiming'] = 'VERY_LATE';
    if (qbPick) {
      if (qbPick.round <= 3) qbTiming = 'EARLY';
      else if (qbPick.round <= 6) qbTiming = 'MID';
      else if (qbPick.round <= 10) qbTiming = 'LATE';
    }

    // Determine TE timing
    let teTiming: DraftStrategy['teTiming'] = 'STREAM';
    if (tePick) {
      if (tePick.round <= 3) teTiming = 'EARLY';
      else if (tePick.round <= 8) teTiming = 'MID';
      else teTiming = 'LATE';
    }

    // Calculate risk tolerance based on value scores
    const averageValueScore = picks.reduce((sum, pick) => sum + (pick.valueScore || 0), 0) / picks.length;
    let riskTolerance: DraftStrategy['riskTolerance'] = 'MEDIUM';
    if (averageValueScore < -3) riskTolerance = 'HIGH'; // Reaches frequently
    else if (averageValueScore > 3) riskTolerance = 'LOW'; // Value focused

    // Determine value focus
    let valueFocus: DraftStrategy['valueFocus'] = 'BALANCED';
    const reachCount = picks.filter(p => (p.valueScore || 0) < -2).length;
    const valueCount = picks.filter(p => (p.valueScore || 0) > 2).length;
    
    if (reachCount > valueCount * 1.5) {
      valueFocus = 'REACH_HEAVY';
    } else if (valueCount > reachCount * 1.5) {
      valueFocus = 'VALUE_FOCUSED';
    }

    return {
      earlyRoundApproach,
      qbTiming,
      teTiming,
      riskTolerance,
      valueFocus
    };
  }

  /**
   * Calculate draft performance metrics
   */
  private calculateDraftPerformance(picks: EnhancedDraftPick[]): DraftPerformance {
    const valuePickCount = picks.filter(p => (p.valueScore || 0) > 2).length;
    const reachCount = picks.filter(p => (p.valueScore || 0) < -2).length;
    const averageValueScore = picks.reduce((sum, pick) => sum + (pick.valueScore || 0), 0) / picks.length;

    // Calculate strategic coherence (simplified)
    let strategicCoherence = 75; // Base score
    // This would be more sophisticated in a real implementation

    return {
      valuePickCount,
      reachCount,
      averageValueScore,
      strategicCoherence
    };
  }

  /**
   * Analyze behavioral patterns across all historical drafts
   */
  private analyzeBehavioralPatterns(historicalDrafts: HistoricalDraft[]): BehavioralPatterns {
    const positions = ['QB', 'RB', 'WR', 'TE', 'DEF'];
    const positionTimingPreferences: Record<string, RoundDistribution> = {};

    // Deep analysis of position timing preferences
    for (const position of positions) {
      const picks = historicalDrafts.flatMap(draft => 
        draft.picks.filter(pick => pick.position === position)
      );

      if (picks.length > 0) {
        const rounds = picks.map(pick => pick.round);
        const roundCounts: Record<number, number> = {};
        
        for (const round of rounds) {
          roundCounts[round] = (roundCounts[round] || 0) + 1;
        }

        // Convert to probabilities
        const roundProbs: Record<number, number> = {};
        for (const [round, count] of Object.entries(roundCounts)) {
          roundProbs[parseInt(round)] = count / picks.length;
        }

        const averageRound = rounds.reduce((sum, round) => sum + round, 0) / rounds.length;
        const variance = rounds.reduce((sum, round) => sum + Math.pow(round - averageRound, 2), 0) / rounds.length;
        const standardDeviation = Math.sqrt(variance);

        positionTimingPreferences[position] = {
          rounds: roundProbs,
          averageRound,
          standardDeviation,
          earliestRound: Math.min(...rounds),
          latestRound: Math.max(...rounds)
        };
      }
    }

    // Analyze value tendencies
    const valueTendencies = this.analyzeValueTendencies(historicalDrafts);

    // Analyze adaptation patterns
    const adaptationPatterns = this.analyzeAdaptationPatterns(historicalDrafts);

    // Calculate consistency metrics
    const consistencyMetrics = this.calculateConsistencyMetrics(historicalDrafts, positionTimingPreferences);

    return {
      positionTimingPreferences,
      valueTendencies,
      adaptationPatterns,
      consistencyMetrics
    };
  }

  /**
   * Analyze value picking tendencies
   */
  private analyzeValueTendencies(historicalDrafts: HistoricalDraft[]): ValueTendencies {
    const allPicks = historicalDrafts.flatMap(draft => draft.picks);
    const validValuePicks = allPicks.filter(pick => pick.valueScore !== undefined);

    if (validValuePicks.length === 0) {
      return {
        averageValueScore: 0,
        reachFrequency: 0,
        valuePickFrequency: 0,
        positionReachTendencies: {}
      };
    }

    const averageValueScore = validValuePicks.reduce((sum, pick) => sum + (pick.valueScore || 0), 0) / validValuePicks.length;
    const reachCount = validValuePicks.filter(pick => (pick.valueScore || 0) < -2).length;
    const valueCount = validValuePicks.filter(pick => (pick.valueScore || 0) > 2).length;
    
    const reachFrequency = (reachCount / validValuePicks.length) * 100;
    const valuePickFrequency = (valueCount / validValuePicks.length) * 100;

    // Analyze reach tendencies by position
    const positionReachTendencies: Record<string, number> = {};
    const positions = ['QB', 'RB', 'WR', 'TE', 'DEF'];

    for (const position of positions) {
      const positionPicks = validValuePicks.filter(pick => pick.position === position);
      if (positionPicks.length > 0) {
        const positionReaches = positionPicks.filter(pick => (pick.valueScore || 0) < -2).length;
        positionReachTendencies[position] = (positionReaches / positionPicks.length) * 100;
      }
    }

    return {
      averageValueScore,
      reachFrequency,
      valuePickFrequency,
      positionReachTendencies
    };
  }

  /**
   * Analyze adaptation patterns
   */
  private analyzeAdaptationPatterns(historicalDrafts: HistoricalDraft[]): AdaptationPatterns {
    // Analyze draft position adaptation
    const draftPositionAdaptation: Record<string, number> = {};
    const earlyDrafts = historicalDrafts.filter(draft => draft.draftPosition <= 4);
    const midDrafts = historicalDrafts.filter(draft => draft.draftPosition >= 5 && draft.draftPosition <= 8);
    const lateDrafts = historicalDrafts.filter(draft => draft.draftPosition >= 9);

    // Calculate strategy variation scores for different draft positions
    draftPositionAdaptation['early'] = this.calculateStrategyVariation(earlyDrafts);
    draftPositionAdaptation['mid'] = this.calculateStrategyVariation(midDrafts);
    draftPositionAdaptation['late'] = this.calculateStrategyVariation(lateDrafts);

    // Analyze scarcity response
    const scarcityResponse = this.analyzeScarcityResponse(historicalDrafts);

    // Calculate board flow adaptation
    const boardFlowAdaptation = this.calculateBoardFlowAdaptation(historicalDrafts);

    return {
      draftPositionAdaptation,
      scarcityResponse,
      boardFlowAdaptation
    };
  }

  /**
   * Calculate strategy variation for draft position groups
   */
  private calculateStrategyVariation(drafts: HistoricalDraft[]): number {
    if (drafts.length <= 1) return 0;

    const strategies = drafts.map(draft => draft.strategy);
    let variationScore = 0;

    // Compare strategies for variation (simplified)
    for (let i = 0; i < strategies.length; i++) {
      for (let j = i + 1; j < strategies.length; j++) {
        const strategy1 = strategies[i];
        const strategy2 = strategies[j];

        let differences = 0;
        if (strategy1.earlyRoundApproach !== strategy2.earlyRoundApproach) differences++;
        if (strategy1.qbTiming !== strategy2.qbTiming) differences++;
        if (strategy1.teTiming !== strategy2.teTiming) differences++;
        if (strategy1.riskTolerance !== strategy2.riskTolerance) differences++;

        variationScore += differences / 4; // Normalize to 0-1
      }
    }

    return variationScore / ((strategies.length * (strategies.length - 1)) / 2) * 100;
  }

  /**
   * Analyze how the member responds to position scarcity
   */
  private analyzeScarcityResponse(historicalDrafts: HistoricalDraft[]): ScarcityResponse {
    const positionRunReaction: Record<string, number> = {};
    const waitVsPanicThreshold: Record<string, number> = {};
    const positions = ['QB', 'RB', 'WR', 'TE'];

    for (const position of positions) {
      let panicPicks = 0;
      let totalScarcityOpportunities = 0;

      for (const draft of historicalDrafts) {
        for (const pick of draft.picks) {
          // Check if this pick was made during a scarcity situation
          if (pick.boardContext.recentPositionRun === position || 
              pick.boardContext.scarcityAlerts.includes(position)) {
            totalScarcityOpportunities++;
            
            // Check if they picked the scarce position (panic pick)
            if (pick.position === position) {
              panicPicks++;
            }
          }
        }
      }

      if (totalScarcityOpportunities > 0) {
        positionRunReaction[position] = (panicPicks / totalScarcityOpportunities) * 100;
        waitVsPanicThreshold[position] = 50; // Simplified threshold
      }
    }

    return {
      positionRunReaction,
      waitVsPanicThreshold
    };
  }

  /**
   * Calculate board flow adaptation score
   */
  private calculateBoardFlowAdaptation(historicalDrafts: HistoricalDraft[]): number {
    // Analyze how much they deviate from typical patterns based on board flow
    let adaptationInstances = 0;
    let totalOpportunities = 0;

    for (const draft of historicalDrafts) {
      for (let i = 1; i < draft.picks.length; i++) {
        const pick = draft.picks[i];
        
        // Simplified: if they deviated from their typical position timing due to board state
        totalOpportunities++;
        
        // This would be more sophisticated in practice, comparing to their baseline patterns
        if (pick.boardContext.scarcityAlerts.length > 0) {
          adaptationInstances++;
        }
      }
    }

    return totalOpportunities > 0 ? (adaptationInstances / totalOpportunities) * 100 : 50;
  }

  /**
   * Calculate consistency metrics
   */
  private calculateConsistencyMetrics(
    historicalDrafts: HistoricalDraft[], 
    positionTimingPreferences: Record<string, RoundDistribution>
  ): ConsistencyMetrics {
    // Calculate strategic consistency across drafts
    const strategies = historicalDrafts.map(draft => draft.strategy);
    const strategicConsistency = this.calculateStrategicConsistency(strategies);

    // Calculate timing consistency for each position
    const timingConsistency: Record<string, number> = {};
    for (const [position, timing] of Object.entries(positionTimingPreferences)) {
      // Lower standard deviation = higher consistency
      const consistencyScore = Math.max(0, 100 - (timing.standardDeviation * 15));
      timingConsistency[position] = consistencyScore;
    }

    // Calculate adaptability score
    const adaptabilityScore = this.calculateAdaptabilityScore(historicalDrafts);

    return {
      strategicConsistency,
      timingConsistency,
      adaptabilityScore
    };
  }

  /**
   * Calculate strategic consistency across drafts
   */
  private calculateStrategicConsistency(strategies: DraftStrategy[]): number {
    if (strategies.length <= 1) return 100;

    let consistencySum = 0;
    let comparisons = 0;

    for (let i = 0; i < strategies.length; i++) {
      for (let j = i + 1; j < strategies.length; j++) {
        const strategy1 = strategies[i];
        const strategy2 = strategies[j];

        let matches = 0;
        if (strategy1.earlyRoundApproach === strategy2.earlyRoundApproach) matches++;
        if (strategy1.qbTiming === strategy2.qbTiming) matches++;
        if (strategy1.teTiming === strategy2.teTiming) matches++;
        if (strategy1.riskTolerance === strategy2.riskTolerance) matches++;
        if (strategy1.valueFocus === strategy2.valueFocus) matches++;

        consistencySum += matches / 5 * 100;
        comparisons++;
      }
    }

    return comparisons > 0 ? consistencySum / comparisons : 100;
  }

  /**
   * Calculate adaptability score
   */
  private calculateAdaptabilityScore(historicalDrafts: HistoricalDraft[]): number {
    // Measure how well they adapted to different draft positions and board states
    let adaptabilityScore = 50; // Base score

    // Bonus for having drafts from different positions
    const draftPositions = new Set(historicalDrafts.map(draft => Math.ceil(draft.draftPosition / 4)));
    adaptabilityScore += draftPositions.size * 10;

    // Bonus for strategy variation when appropriate
    const strategicVariation = this.calculateStrategyVariation(historicalDrafts);
    if (strategicVariation > 30 && strategicVariation < 70) {
      adaptabilityScore += 20; // Goldilocks zone of adaptation
    }

    return Math.min(100, adaptabilityScore);
  }

  /**
   * Analyze contextual tendencies
   */
  private analyzeContextualTendencies(historicalDrafts: HistoricalDraft[]): ContextualTendencies {
    // Analyze round-specific patterns
    const roundSpecificPatterns = this.analyzeRoundSpecificPatterns(historicalDrafts);
    
    // Analyze draft position patterns
    const draftPositionPatterns = this.analyzeDraftPositionPatterns(historicalDrafts);
    
    // Analyze situational preferences
    const situationalPreferences = this.analyzeSituationalPreferences(historicalDrafts);

    return {
      roundSpecificPatterns,
      draftPositionPatterns,
      situationalPreferences
    };
  }

  /**
   * Analyze patterns for specific rounds (especially rounds 1-10)
   */
  private analyzeRoundSpecificPatterns(historicalDrafts: HistoricalDraft[]): Record<number, RoundPattern> {
    const roundPatterns: Record<number, RoundPattern> = {};

    for (let round = 1; round <= 15; round++) {
      const roundPicks = historicalDrafts.flatMap(draft => 
        draft.picks.filter(pick => pick.round === round)
      );

      if (roundPicks.length === 0) continue;

      // Calculate position preferences for this round
      const positionCounts: Record<string, number> = {};
      for (const pick of roundPicks) {
        positionCounts[pick.position] = (positionCounts[pick.position] || 0) + 1;
      }

      const positionPreferences: Record<string, number> = {};
      for (const [position, count] of Object.entries(positionCounts)) {
        positionPreferences[position] = (count / roundPicks.length) * 100;
      }

      // Calculate average value threshold for this round
      const validValuePicks = roundPicks.filter(pick => pick.valueScore !== undefined);
      const valueThreshold = validValuePicks.length > 0
        ? validValuePicks.reduce((sum, pick) => sum + (pick.valueScore || 0), 0) / validValuePicks.length
        : 0;

      // Determine typical strategy for this round
      const mostCommonPosition = Object.entries(positionPreferences)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'UNKNOWN';

      let typicalStrategy = 'POSITIONAL_NEED';
      if (round <= 6 && (mostCommonPosition === 'RB' || mostCommonPosition === 'WR')) {
        typicalStrategy = 'SKILL_POSITION_FOCUS';
      } else if (round <= 3 && mostCommonPosition === 'QB') {
        typicalStrategy = 'EARLY_QB';
      } else if (round >= 11) {
        typicalStrategy = 'DEPTH_AND_SPECIALS';
      }

      roundPatterns[round] = {
        positionPreferences,
        valueThreshold,
        typicalStrategy
      };
    }

    return roundPatterns;
  }

  /**
   * Analyze patterns based on draft position (early, mid, late)
   */
  private analyzeDraftPositionPatterns(historicalDrafts: HistoricalDraft[]): Record<string, PositionPattern> {
    const draftPositionPatterns: Record<string, PositionPattern> = {};
    
    const positionGroups = {
      'early': historicalDrafts.filter(draft => draft.draftPosition <= 4),
      'mid': historicalDrafts.filter(draft => draft.draftPosition >= 5 && draft.draftPosition <= 8),
      'late': historicalDrafts.filter(draft => draft.draftPosition >= 9)
    };

    for (const [positionGroup, drafts] of Object.entries(positionGroups)) {
      if (drafts.length === 0) continue;

      // Analyze strategy shifts for different draft positions
      const strategies = drafts.map(draft => draft.strategy);
      const mostCommonEarlyApproach = this.getMostCommonValue(strategies.map(s => s.earlyRoundApproach));
      const mostCommonQBTiming = this.getMostCommonValue(strategies.map(s => s.qbTiming));

      let strategyShift = 'CONSISTENT';
      if (positionGroup === 'early' && mostCommonEarlyApproach === 'RB_HEAVY') {
        strategyShift = 'CAPITALIZE_ON_ELITE_RBS';
      } else if (positionGroup === 'late' && mostCommonEarlyApproach === 'WR_HEAVY') {
        strategyShift = 'CAPITALIZE_ON_WR_VALUE';
      } else if (mostCommonQBTiming === 'EARLY') {
        strategyShift = 'SECURE_PREMIUM_QB';
      }

      // Determine position priorities for this draft position
      const firstFourRoundPicks = drafts.flatMap(draft => 
        draft.picks.filter(pick => pick.round <= 4)
      );
      
      const positionCounts: Record<string, number> = {};
      for (const pick of firstFourRoundPicks) {
        positionCounts[pick.position] = (positionCounts[pick.position] || 0) + 1;
      }

      const positionPriorities = Object.entries(positionCounts)
        .sort(([,a], [,b]) => b - a)
        .map(([position]) => position);

      // Calculate risk tolerance for this draft position
      const riskScores = drafts.map(draft => draft.performance.averageValueScore);
      const averageRiskScore = riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length;
      const riskTolerance = Math.abs(averageRiskScore) > 2 ? Math.abs(averageRiskScore) * 10 : 50;

      draftPositionPatterns[positionGroup] = {
        strategyShift,
        positionPriorities,
        riskTolerance: Math.min(100, riskTolerance)
      };
    }

    return draftPositionPatterns;
  }

  /**
   * Analyze situational preferences
   */
  private analyzeSituationalPreferences(historicalDrafts: HistoricalDraft[]): SituationalPreferences {
    const whenBehindOnPosition: Record<string, 'PANIC' | 'WAIT' | 'ADAPT'> = {};
    const whenAheadOnPosition: Record<string, 'CONTINUE' | 'DIVERSIFY' | 'VALUE_HUNT'> = {};
    
    const positions = ['QB', 'RB', 'WR', 'TE'];

    for (const position of positions) {
      // Analyze behavior when behind on a position
      let panicCount = 0;
      let waitCount = 0;
      let adaptCount = 0;
      let behindSituations = 0;

      for (const draft of historicalDrafts) {
        for (let i = 0; i < draft.picks.length; i++) {
          const pick = draft.picks[i];
          const rosterContext = pick.rosterContext;

          // Check if they were behind on this position
          if (rosterContext.majorNeeds.includes(position)) {
            behindSituations++;

            if (pick.position === position) {
              if (pick.boardContext.scarcityAlerts.includes(position)) {
                panicCount++;
              } else {
                adaptCount++;
              }
            } else {
              waitCount++;
            }
          }
        }
      }

      if (behindSituations > 0) {
        if (panicCount > waitCount && panicCount > adaptCount) {
          whenBehindOnPosition[position] = 'PANIC';
        } else if (waitCount > panicCount && waitCount > adaptCount) {
          whenBehindOnPosition[position] = 'WAIT';
        } else {
          whenBehindOnPosition[position] = 'ADAPT';
        }
      }

      // Analyze behavior when ahead on a position
      let continueCount = 0;
      let diversifyCount = 0;
      let valueHuntCount = 0;
      let aheadSituations = 0;

      for (const draft of historicalDrafts) {
        for (let i = 0; i < draft.picks.length; i++) {
          const pick = draft.picks[i];
          const rosterContext = pick.rosterContext;

          // Check if they were ahead on this position (had adequate depth)
          const positionCount = rosterContext.positionCounts[position] || 0;
          if (positionCount >= 2 && !rosterContext.majorNeeds.includes(position)) {
            aheadSituations++;

            if (pick.position === position) {
              continueCount++;
            } else if (pick.valueScore && pick.valueScore > 2) {
              valueHuntCount++;
            } else {
              diversifyCount++;
            }
          }
        }
      }

      if (aheadSituations > 0) {
        if (continueCount > diversifyCount && continueCount > valueHuntCount) {
          whenAheadOnPosition[position] = 'CONTINUE';
        } else if (valueHuntCount > continueCount && valueHuntCount > diversifyCount) {
          whenAheadOnPosition[position] = 'VALUE_HUNT';
        } else {
          whenAheadOnPosition[position] = 'DIVERSIFY';
        }
      }
    }

    // Analyze late round behavior
    const lateRoundPicks = historicalDrafts.flatMap(draft => 
      draft.picks.filter(pick => pick.round >= 11)
    );

    let safeDepthCount = 0;
    let highUpsideCount = 0;

    for (const pick of lateRoundPicks) {
      if (pick.valueScore && pick.valueScore < -1) {
        highUpsideCount++; // Reaches for upside
      } else {
        safeDepthCount++; // Safe, value-based picks
      }
    }

    let lateRoundBehavior: SituationalPreferences['lateRoundBehavior'] = 'BALANCED';
    if (safeDepthCount > highUpsideCount * 1.5) {
      lateRoundBehavior = 'SAFE_DEPTH';
    } else if (highUpsideCount > safeDepthCount * 1.5) {
      lateRoundBehavior = 'HIGH_UPSIDE';
    }

    return {
      whenBehindOnPosition,
      whenAheadOnPosition,
      lateRoundBehavior
    };
  }

  /**
   * Get most common value from an array
   */
  private getMostCommonValue<T>(values: T[]): T | undefined {
    if (values.length === 0) return undefined;

    const counts = new Map<T, number>();
    for (const value of values) {
      counts.set(value, (counts.get(value) || 0) + 1);
    }

    let maxCount = 0;
    let mostCommon: T | undefined;

    for (const [value, count] of counts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = value;
      }
    }

    return mostCommon;
  }

  /**
   * Build predictive model from patterns and tendencies
   */
  private buildPredictiveModel(
    behavioralPatterns: BehavioralPatterns, 
    contextualTendencies: ContextualTendencies,
    historicalDrafts: HistoricalDraft[]
  ): PredictiveModel {
    // Extract baseline probabilities from behavioral patterns
    const baselineProbabilities: Record<string, Record<number, number>> = {};
    
    for (const [position, timing] of Object.entries(behavioralPatterns.positionTimingPreferences)) {
      baselineProbabilities[position] = timing.rounds;
    }

    // Build contextual adjustments
    const contextualAdjustments = this.buildContextualAdjustments(
      contextualTendencies, 
      historicalDrafts
    );

    // Build decision tree for complex scenarios
    const decisionTree = this.buildDecisionTree(contextualTendencies, behavioralPatterns);

    return {
      baselineProbabilities,
      contextualAdjustments,
      decisionTree
    };
  }

  /**
   * Build contextual adjustments for different scenarios
   */
  private buildContextualAdjustments(
    contextualTendencies: ContextualTendencies,
    historicalDrafts: HistoricalDraft[]
  ): ContextualAdjustments {
    // Draft position multipliers
    const draftPositionMultipliers: Record<string, Record<string, number>> = {
      early: {},
      mid: {},
      late: {}
    };

    // Calculate how draft position affects position preferences
    for (const [positionGroup, pattern] of Object.entries(contextualTendencies.draftPositionPatterns)) {
      for (const position of pattern.positionPriorities) {
        const index = pattern.positionPriorities.indexOf(position);
        // Higher priority positions get higher multipliers
        const multiplier = Math.max(0.5, 2.0 - (index * 0.3));
        draftPositionMultipliers[positionGroup][position] = multiplier;
      }
    }

    // Roster state multipliers
    const rosterStateMultipliers: Record<string, Record<string, number>> = {
      desperate: {}, // When really behind on a position
      need: {},      // When need a position but not desperate
      satisfied: {}, // When position need is met
      deep: {}       // When deep at a position
    };

    // Analyze how roster needs affect position selection
    for (const draft of historicalDrafts) {
      for (const pick of draft.picks) {
        const rosterContext = pick.rosterContext;
        
        // Determine need level for picked position
        let needLevel = 'satisfied';
        if (rosterContext.majorNeeds.includes(pick.position)) {
          const positionCount = rosterContext.positionCounts[pick.position] || 0;
          needLevel = positionCount === 0 ? 'desperate' : 'need';
        } else if (rosterContext.depthNeeds.includes(pick.position)) {
          needLevel = 'satisfied';
        } else {
          needLevel = 'deep';
        }

        // Increment selection count for this need level and position
        if (!rosterStateMultipliers[needLevel][pick.position]) {
          rosterStateMultipliers[needLevel][pick.position] = 0;
        }
        rosterStateMultipliers[needLevel][pick.position]++;
      }
    }

    // Convert counts to multipliers
    const totalPicks = historicalDrafts.reduce((sum, draft) => sum + draft.picks.length, 0);
    for (const [needLevel, positions] of Object.entries(rosterStateMultipliers)) {
      for (const [position, count] of Object.entries(positions)) {
        const frequency = count / totalPicks;
        // Convert frequency to multiplier (higher frequency = higher multiplier)
        rosterStateMultipliers[needLevel][position] = Math.max(0.1, frequency * 10);
      }
    }

    // Board state multipliers
    const boardStateMultipliers: Record<string, Record<string, number>> = {
      run_active: {},    // During a position run
      scarcity_high: {}, // When position is getting scarce
      normal: {}         // Normal board state
    };

    // Analyze how board scarcity affects selections
    for (const draft of historicalDrafts) {
      for (const pick of draft.picks) {
        let boardState = 'normal';
        if (pick.boardContext.recentPositionRun) {
          boardState = 'run_active';
        } else if (pick.boardContext.scarcityAlerts.length > 0) {
          boardState = 'scarcity_high';
        }

        if (!boardStateMultipliers[boardState][pick.position]) {
          boardStateMultipliers[boardState][pick.position] = 0;
        }
        boardStateMultipliers[boardState][pick.position]++;
      }
    }

    // Convert to multipliers
    for (const [boardState, positions] of Object.entries(boardStateMultipliers)) {
      const stateTotal = Object.values(positions).reduce((sum, count) => sum + count, 0);
      if (stateTotal > 0) {
        for (const [position, count] of Object.entries(positions)) {
          boardStateMultipliers[boardState][position] = (count / stateTotal) * 4; // Scale to meaningful multiplier
        }
      }
    }

    return {
      draftPositionMultipliers,
      rosterStateMultipliers,
      boardStateMultipliers
    };
  }

  /**
   * Build decision tree for complex draft scenarios
   */
  private buildDecisionTree(
    contextualTendencies: ContextualTendencies,
    behavioralPatterns: BehavioralPatterns
  ): DecisionNode[] {
    const decisionTree: DecisionNode[] = [];

    // Early round decision nodes (rounds 1-6)
    for (let round = 1; round <= 6; round++) {
      const roundPattern = contextualTendencies.roundSpecificPatterns[round];
      if (!roundPattern) continue;

      // Create decision node for this round
      const sortedPositions = Object.entries(roundPattern.positionPreferences)
        .sort(([, a], [, b]) => b - a)
        .map(([position]) => position);

      decisionTree.push({
        condition: {
          round: round
        },
        outcome: {
          preferredPositions: sortedPositions.slice(0, 3), // Top 3 preferred positions
          valueThreshold: roundPattern.valueThreshold,
          fallbackBehavior: 'BEST_AVAILABLE'
        },
        confidence: Math.min(0.9, sortedPositions.length > 0 ? roundPattern.positionPreferences[sortedPositions[0]] / 100 : 0.5)
      });
    }

    // QB timing decision nodes
    const qbTiming = behavioralPatterns.positionTimingPreferences.QB;
    if (qbTiming) {
      const preferredQBRound = qbTiming.averageRound;
      
      decisionTree.push({
        condition: {
          round: [Math.floor(preferredQBRound) - 1, Math.ceil(preferredQBRound) + 1],
          rosterNeeds: ['QB']
        },
        outcome: {
          preferredPositions: ['QB'],
          fallbackBehavior: 'NEED_BASED'
        },
        confidence: Math.max(0.3, 1.0 - (qbTiming.standardDeviation / 10))
      });
    }

    // Position scarcity response nodes
    for (const [position, reactionProbability] of Object.entries(behavioralPatterns.adaptationPatterns.scarcityResponse.positionRunReaction)) {
      const probability = typeof reactionProbability === 'number' ? reactionProbability : 0;
      if (probability > 30) { // Only for positions they tend to panic for
        decisionTree.push({
          condition: {
            boardState: [`${position}_RUN`],
            rosterNeeds: [position]
          },
          outcome: {
            preferredPositions: [position],
            fallbackBehavior: 'NEED_BASED'
          },
          confidence: probability / 100
        });
      }
    }

    // Value hunting nodes for late rounds
    decisionTree.push({
      condition: {
        round: [11, 15]
      },
      outcome: {
        preferredPositions: [],
        valueThreshold: 2.0, // Only pick if good value
        fallbackBehavior: contextualTendencies.situationalPreferences.lateRoundBehavior === 'HIGH_UPSIDE' ? 'VALUE_HUNT' : 'BEST_AVAILABLE'
      },
      confidence: 0.7
    });

    return decisionTree;
  }

  /**
   * Predict the most likely pick for a member in a given situation
   */
  predictMemberPick(
    userId: string,
    currentRoster: { position: string; round: number }[],
    availablePlayers: { position: string; adpRank: number }[],
    currentRound: number,
    draftPosition: number,
    boardContext: { positionRuns?: string[]; scarcityAlerts?: string[] } = {}
  ): { position: string; confidence: number } | null {
    if (!this.memberProfiles.has(userId)) {
      return null;
    }

    const profile = this.memberProfiles.get(userId)!;
    const model = profile.predictiveModel;
    
    // Calculate roster needs
    const positionCounts = currentRoster.reduce((counts, pick) => {
      counts[pick.position] = (counts[pick.position] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const majorNeeds: string[] = [];
    if ((positionCounts.QB || 0) === 0) majorNeeds.push('QB');
    if ((positionCounts.RB || 0) < 2) majorNeeds.push('RB');
    if ((positionCounts.WR || 0) < 3) majorNeeds.push('WR');
    if ((positionCounts.TE || 0) === 0) majorNeeds.push('TE');
    if ((positionCounts.DEF || 0) === 0 && currentRound > 10) majorNeeds.push('DEF');

    // Get available positions
    const availablePositions = [...new Set(availablePlayers.map(p => p.position))];

    // Calculate base probabilities for each available position
    const positionProbabilities: Record<string, number> = {};

    for (const position of availablePositions) {
      // Start with baseline probability
      const baselineProbability = model.baselineProbabilities[position]?.[currentRound] || 0.01;
      let adjustedProbability = baselineProbability;

      // Apply draft position adjustments
      const draftPositionGroup = draftPosition <= 4 ? 'early' : draftPosition <= 8 ? 'mid' : 'late';
      const draftPositionMultiplier = model.contextualAdjustments.draftPositionMultipliers[draftPositionGroup]?.[position] || 1.0;
      adjustedProbability *= draftPositionMultiplier;

      // Apply roster need adjustments
      let needLevel = 'satisfied';
      if (majorNeeds.includes(position)) {
        const positionCount = positionCounts[position] || 0;
        needLevel = positionCount === 0 ? 'desperate' : 'need';
      } else if ((positionCounts[position] || 0) >= 3) {
        needLevel = 'deep';
      }

      const rosterStateMultiplier = model.contextualAdjustments.rosterStateMultipliers[needLevel]?.[position] || 1.0;
      adjustedProbability *= rosterStateMultiplier;

      // Apply board state adjustments
      let boardState = 'normal';
      if (boardContext.positionRuns?.includes(position)) {
        boardState = 'run_active';
      } else if (boardContext.scarcityAlerts?.includes(position)) {
        boardState = 'scarcity_high';
      }

      const boardStateMultiplier = model.contextualAdjustments.boardStateMultipliers[boardState]?.[position] || 1.0;
      adjustedProbability *= boardStateMultiplier;

      // Check decision tree for overrides
      for (const node of model.decisionTree) {
        if (this.matchesDecisionCondition(node.condition, currentRound, draftPositionGroup, majorNeeds, boardContext)) {
          if (node.outcome.preferredPositions.includes(position)) {
            adjustedProbability *= (1 + node.confidence);
          }
        }
      }

      positionProbabilities[position] = Math.max(0.001, adjustedProbability);
    }

    // Find the most likely position
    const sortedPositions = Object.entries(positionProbabilities)
      .sort(([, a], [, b]) => b - a);

    if (sortedPositions.length === 0) {
      return null;
    }

    const [topPosition, topProbability] = sortedPositions[0];
    const totalProbability = Object.values(positionProbabilities).reduce((sum, prob) => sum + prob, 0);
    const confidence = totalProbability > 0 ? topProbability / totalProbability : 0;

    return {
      position: topPosition,
      confidence: Math.min(0.95, confidence)
    };
  }

  /**
   * Check if current situation matches a decision condition
   */
  private matchesDecisionCondition(
    condition: DecisionCondition,
    currentRound: number,
    draftPositionGroup: string,
    majorNeeds: string[],
    boardContext: { positionRuns?: string[]; scarcityAlerts?: string[] }
  ): boolean {
    // Check round condition
    if (condition.round !== undefined) {
      if (Array.isArray(condition.round)) {
        if (currentRound < condition.round[0] || currentRound > condition.round[1]) {
          return false;
        }
      } else if (currentRound !== condition.round) {
        return false;
      }
    }

    // Check draft position condition
    if (condition.draftPosition && condition.draftPosition !== draftPositionGroup.toUpperCase()) {
      return false;
    }

    // Check roster needs condition
    if (condition.rosterNeeds && !condition.rosterNeeds.some(need => majorNeeds.includes(need))) {
      return false;
    }

    // Check board state condition
    if (condition.boardState) {
      const hasMatchingBoardState = condition.boardState.some(state => {
        if (state.includes('_RUN')) {
          const position = state.replace('_RUN', '');
          return boardContext.positionRuns?.includes(position);
        }
        if (state.includes('_SCARCITY')) {
          const position = state.replace('_SCARCITY', '');
          return boardContext.scarcityAlerts?.includes(position);
        }
        return false;
      });

      if (!hasMatchingBoardState) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get a specific member's profile
   */
  async getMemberProfile(userId: string): Promise<MemberDraftProfile | null> {
    if (this.memberProfiles.has(userId)) {
      return this.memberProfiles.get(userId)!;
    }

    // Generate all profiles if not cached
    const profiles = await this.generateMemberProfiles();
    return profiles.find(p => p.userId === userId) || null;
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.cachedAnalysis.clear();
    this.memberProfiles.clear();
  }
}

export const memberDraftAnalysisService = new MemberDraftAnalysisService();