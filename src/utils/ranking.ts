import type { EnhancedSeasonStandings } from '../types';
import { isNFLWeekComplete } from './nfl-schedule';

export interface RankingTiebreakers {
  pointsFor: number;
  pointsAgainst: number;
  wins: number;
  losses: number;
  ties?: number;
}

/**
 * Get head-to-head record between two teams for current season only
 */
function getHeadToHeadRecord(
  team1Id: string,
  team2Id: string,
  matchupsByWeek?: Record<number, any[]>,
  year?: string
): { team1Wins: number; team2Wins: number; totalGames: number } {
  if (!matchupsByWeek || year !== '2025') {
    return { team1Wins: 0, team2Wins: 0, totalGames: 0 };
  }

  let team1Wins = 0;
  let team2Wins = 0;
  let totalGames = 0;

  Object.entries(matchupsByWeek).forEach(([weekStr, matchups]) => {
    const week = parseInt(weekStr);

    // Only count completed weeks for active season
    if (!isNFLWeekComplete(week)) {
      return;
    }

    matchups.forEach(matchup => {
      if ((matchup.winner === team1Id && matchup.loser === team2Id) ||
          (matchup.winner === team2Id && matchup.loser === team1Id)) {
        totalGames++;
        if (matchup.winner === team1Id) {
          team1Wins++;
        } else if (matchup.winner === team2Id) {
          team2Wins++;
        }
      }
    });
  });

  return { team1Wins, team2Wins, totalGames };
}

/**
 * Calculate rankings for standings with proper tie handling
 * For active seasons, uses head-to-head records as tiebreakers
 * For historical seasons, this shouldn't be called as they have final rankings
 */
export function calculateRankings(
  standings: EnhancedSeasonStandings[],
  matchupsByWeek?: Record<number, any[]>,
  year?: string
): EnhancedSeasonStandings[] {
  // Sort standings with head-to-head tiebreakers for active season
  const sortedStandings = [...standings].sort((a, b) => {
    const aTotalGames = a.wins + a.losses + (a.ties || 0);
    const bTotalGames = b.wins + b.losses + (b.ties || 0);

    // Calculate win percentages (ties count as 0.5 wins)
    const aWinPct = aTotalGames > 0 ? (a.wins + (a.ties || 0) * 0.5) / aTotalGames : 0;
    const bWinPct = bTotalGames > 0 ? (b.wins + (b.ties || 0) * 0.5) / bTotalGames : 0;

    // 1. Primary: Win percentage
    if (aWinPct !== bWinPct) {
      return bWinPct - aWinPct;
    }

    // 2. Tiebreaker for active season: Head-to-head record
    if (year === '2025' && matchupsByWeek) {
      const h2h = getHeadToHeadRecord(a.userId, b.userId, matchupsByWeek, year);
      if (h2h.totalGames > 0) {
        if (h2h.team1Wins !== h2h.team2Wins) {
          return h2h.team2Wins - h2h.team1Wins; // Team with more head-to-head wins ranks higher
        }
      }
    }

    // 3. Secondary tiebreaker: Points for (higher is better)
    if (a.pointsFor !== b.pointsFor) {
      return b.pointsFor - a.pointsFor;
    }

    // 4. If still tied, maintain original order (stable sort)
    return 0;
  });

  // Assign ranks, allowing for ties
  const rankedStandings: EnhancedSeasonStandings[] = [];
  let currentRank = 1;

  for (let i = 0; i < sortedStandings.length; i++) {
    const currentStanding = sortedStandings[i];

    // Check if this team is tied with the previous team
    if (i > 0) {
      const prevStanding = sortedStandings[i - 1];

      // Calculate win percentages for comparison (ties count as 0.5 wins)
      const currentTotalGames = currentStanding.wins + currentStanding.losses + (currentStanding.ties || 0);
      const prevTotalGames = prevStanding.wins + prevStanding.losses + (prevStanding.ties || 0);
      const currentWinPct = currentTotalGames > 0 ? (currentStanding.wins + (currentStanding.ties || 0) * 0.5) / currentTotalGames : 0;
      const prevWinPct = prevTotalGames > 0 ? (prevStanding.wins + (prevStanding.ties || 0) * 0.5) / prevTotalGames : 0;

      // Check if not tied with previous team
      let isNotTied = currentWinPct !== prevWinPct;

      // For active season, also check head-to-head and points for
      if (!isNotTied && year === '2025' && matchupsByWeek) {
        const h2h = getHeadToHeadRecord(currentStanding.userId, prevStanding.userId, matchupsByWeek, year);
        if (h2h.totalGames > 0 && h2h.team1Wins !== h2h.team2Wins) {
          isNotTied = true;
        } else if (currentStanding.pointsFor !== prevStanding.pointsFor) {
          isNotTied = true;
        }
      } else if (!isNotTied && currentStanding.pointsFor !== prevStanding.pointsFor) {
        isNotTied = true;
      }

      if (isNotTied) {
        currentRank = i + 1;
      }
      // If still tied, keep the same rank as previous team
    }

    rankedStandings.push({
      ...currentStanding,
      rank: currentRank
    });
  }

  return rankedStandings;
}

/**
 * Check if two teams are tied based on standard tiebreaker criteria
 */
export function areTeamsTied(teamA: RankingTiebreakers, teamB: RankingTiebreakers): boolean {
  const aTotalGames = teamA.wins + teamA.losses + (teamA.ties || 0);
  const bTotalGames = teamB.wins + teamB.losses + (teamB.ties || 0);
  const aWinPct = aTotalGames > 0 ? (teamA.wins + (teamA.ties || 0) * 0.5) / aTotalGames : 0;
  const bWinPct = bTotalGames > 0 ? (teamB.wins + (teamB.ties || 0) * 0.5) / bTotalGames : 0;

  return (
    aWinPct === bWinPct &&
    teamA.pointsFor === teamB.pointsFor &&
    teamA.pointsAgainst === teamB.pointsAgainst
  );
}

/**
 * Get the display rank for a team (handles ties by showing the same rank)
 */
export function getDisplayRank(rank: number): string {
  return `#${rank}`;
}