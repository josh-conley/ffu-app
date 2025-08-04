import { getPlayoffWeeks } from './era-detection';
import type { LeagueTier } from '../types';

export interface IndexedMatchup {
  year: string;
  league: LeagueTier;
  week: number;
  winner: string;
  loser: string;
  winnerScore: number;
  loserScore: number;
  winnerInfo: any;
  loserInfo: any;
  isPlayoff: boolean;
  placementType?: string;
}

export interface HeadToHeadIndex {
  [player1Id: string]: {
    [player2Id: string]: IndexedMatchup[];
  };
}

/**
 * Create an indexed lookup of all head-to-head matchups for fast retrieval
 */
export function createHeadToHeadIndex(allMatchupData: {
  year: string;
  league: LeagueTier;
  week: number;
  matchups: any[];
}[]): HeadToHeadIndex {
  const index: HeadToHeadIndex = {};
  
  // Process all matchup data
  allMatchupData.forEach(({ year, league, week, matchups }) => {
    const playoffWeeks = getPlayoffWeeks(year);
    const isPlayoffWeek = playoffWeeks.includes(week);
    
    matchups.forEach(matchup => {
      const { winner, loser, winnerScore, loserScore, winnerInfo, loserInfo, placementType } = matchup;
      
      if (!winner || !loser) return; // Skip invalid matchups
      
      const indexedMatchup: IndexedMatchup = {
        year,
        league,
        week,
        winner,
        loser,
        winnerScore,
        loserScore,
        winnerInfo,
        loserInfo,
        isPlayoff: isPlayoffWeek,
        placementType
      };
      
      // Index in both directions for fast lookup
      // Player 1 vs Player 2
      if (!index[winner]) index[winner] = {};
      if (!index[winner][loser]) index[winner][loser] = [];
      index[winner][loser].push(indexedMatchup);
      
      // Player 2 vs Player 1 (same matchup from other perspective)
      if (!index[loser]) index[loser] = {};
      if (!index[loser][winner]) index[loser][winner] = [];
      index[loser][winner].push(indexedMatchup);
    });
  });
  
  return index;
}

/**
 * Get head-to-head matchups between two players from the index
 */
export function getHeadToHeadMatchups(
  index: HeadToHeadIndex,
  player1Id: string,
  player2Id: string
): IndexedMatchup[] {
  if (!index[player1Id] || !index[player1Id][player2Id]) {
    return [];
  }
  
  // Return unique matchups (deduplicated since we index in both directions)
  const matchups = index[player1Id][player2Id];
  const uniqueMatchups = new Map<string, IndexedMatchup>();
  
  matchups.forEach(matchup => {
    // Create unique key based on year, league, week
    const key = `${matchup.year}-${matchup.league}-${matchup.week}`;
    if (!uniqueMatchups.has(key)) {
      uniqueMatchups.set(key, matchup);
    }
  });
  
  // Sort by year and week (most recent first)
  return Array.from(uniqueMatchups.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year.localeCompare(a.year);
    return b.week - a.week;
  });
}

/**
 * Calculate head-to-head statistics from matchups
 */
export function calculateHeadToHeadStats(matchups: IndexedMatchup[], player1Id: string, player2Id: string) {
  const player1Wins = matchups.filter(m => m.winner === player1Id).length;
  const player2Wins = matchups.filter(m => m.winner === player2Id).length;
  const totalGames = matchups.length;
  
  const player1Scores = matchups.map(m => 
    m.winner === player1Id ? m.winnerScore : m.loserScore
  );
  const player2Scores = matchups.map(m => 
    m.winner === player2Id ? m.winnerScore : m.loserScore
  );
  
  const player1AvgScore = player1Scores.length > 0 
    ? player1Scores.reduce((sum, score) => sum + score, 0) / player1Scores.length 
    : 0;
  const player2AvgScore = player2Scores.length > 0 
    ? player2Scores.reduce((sum, score) => sum + score, 0) / player2Scores.length 
    : 0;
  
  return {
    player1Wins,
    player2Wins,
    totalGames,
    player1AvgScore,
    player2AvgScore
  };
}