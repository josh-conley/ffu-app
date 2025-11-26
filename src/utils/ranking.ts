import type { EnhancedSeasonStandings } from '../types';
import { isNFLWeekComplete } from './nfl-schedule';
import { isActiveYear, getDisplayTeamName } from '../config/constants';

export interface RankingTiebreakers {
  pointsFor: number;
  pointsAgainst: number;
  wins: number;
  losses: number;
  ties?: number;
}

export interface TeamH2HSummary {
  teamName: string;
  userId: string;
  h2hWinPct: number;
  h2hRecord: string; // e.g., "3-2"
  pointsFor: number;
  isCurrentTeam: boolean;
  isBumpedThirdLeader?: boolean; // True if this team is the bumped 3rd division leader
}

export interface TiebreakerLayer {
  context: 'division-leaders' | 'wild-card';
  h2hRecords: string[]; // Individual matchup records for current team
  allTeamsH2H?: TeamH2HSummary[]; // Summary of all tied teams' H2H records
  tiedRecord?: string; // The overall record all teams are tied at (e.g., "6-6")
  h2hWinPct?: number;
  usesPointsFor: boolean;
  pointsFor?: number;
  hasBumpedThirdLeader?: boolean; // True if a 3rd division leader was bumped to 6th in this group
  bumpedThirdLeaderName?: string; // Name of the bumped 3rd leader (for display)
}

export interface TiebreakerInfo {
  layers: TiebreakerLayer[]; // Multiple tiebreaker contexts
}

export interface DivisionGroup {
  division: number;
  name: string;
  standings: EnhancedSeasonStandings[];
  leader?: EnhancedSeasonStandings; // Division leader (best record in division)
}

/**
 * Get head-to-head record between two teams for current season only
 */
export function getHeadToHeadRecord(
  team1Id: string,
  team2Id: string,
  matchupsByWeek?: Record<number, any[]>,
  year?: string
): { team1Wins: number; team2Wins: number; totalGames: number } {
  if (!matchupsByWeek || !year || !isActiveYear(year)) {
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
 * Compare two teams by record, using tiebreakers
 */
function compareTeamRecords(
  a: EnhancedSeasonStandings,
  b: EnhancedSeasonStandings,
  matchupsByWeek?: Record<number, any[]>,
  year?: string
): number {
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
  if (year && isActiveYear(year) && matchupsByWeek) {
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
}

/**
 * Calculate rankings for standings with proper tie handling
 * For leagues with divisions (Sleeper era):
 *   - Top 2 division leaders get seeds 1-2
 *   - Remaining teams (including 3rd+ division leaders) get seeds 3-12 by record
 * For leagues without divisions (ESPN era):
 *   - All teams ranked by record
 */
export function calculateRankings(
  standings: EnhancedSeasonStandings[],
  matchupsByWeek?: Record<number, any[]>,
  year?: string
): EnhancedSeasonStandings[] {
  // Check if we have divisions
  const hasDivisions = standings.some(s => s.division !== undefined && s.division !== null);

  if (!hasDivisions) {
    // No divisions: rank all teams by record
    return rankByRecord(standings, matchupsByWeek, year);
  }

  // With divisions: special ranking logic
  return rankWithDivisions(standings, matchupsByWeek, year);
}

/**
 * Sort standings handling multi-way ties properly
 * When teams are in a 3+ way tie with equal aggregate H2H, use points for
 */
function sortWithTiebreakers(
  standings: EnhancedSeasonStandings[],
  matchupsByWeek?: Record<number, any[]>,
  year?: string
): EnhancedSeasonStandings[] {
  // Group teams by win percentage
  const winPctGroups = new Map<number, EnhancedSeasonStandings[]>();

  standings.forEach(standing => {
    const totalGames = standing.wins + standing.losses + (standing.ties || 0);
    const winPct = totalGames > 0 ? Math.round((standing.wins + (standing.ties || 0) * 0.5) / totalGames * 10000) / 10000 : 0;

    if (!winPctGroups.has(winPct)) {
      winPctGroups.set(winPct, []);
    }
    winPctGroups.get(winPct)!.push(standing);
  });

  // Sort each group appropriately
  const sortedGroups: EnhancedSeasonStandings[][] = [];

  winPctGroups.forEach((group) => {
    if (group.length === 1) {
      // No tie, just add the single team
      sortedGroups.push(group);
    } else if (group.length === 2) {
      // 2-way tie, use normal comparison (H2H then points)
      sortedGroups.push(group.sort((a, b) => compareTeamRecords(a, b, matchupsByWeek, year)));
    } else {
      // 3+ way tie, check if aggregate H2H is tied
      const aggregateH2H = checkAggregateH2H(group, matchupsByWeek, year);

      if (aggregateH2H.isTied) {
        // All teams have equal aggregate H2H win%, sort by points for
        sortedGroups.push(group.sort((a, b) => b.pointsFor - a.pointsFor));
      } else {
        // Aggregate H2H distinguishes teams, sort by H2H win% then points for
        sortedGroups.push(group.sort((a, b) => {
          const aH2hWinPct = aggregateH2H.winPcts?.get(a.userId) ?? 0;
          const bH2hWinPct = aggregateH2H.winPcts?.get(b.userId) ?? 0;

          if (aH2hWinPct !== bH2hWinPct) {
            return bH2hWinPct - aH2hWinPct; // Higher H2H win% ranks better
          }

          // If H2H win% is equal, use points for
          return b.pointsFor - a.pointsFor;
        }));
      }
    }
  });

  // Sort groups by win percentage (descending) and flatten
  return sortedGroups
    .sort((a, b) => {
      const aWinPct = getWinPct(a[0]);
      const bWinPct = getWinPct(b[0]);
      return bWinPct - aWinPct;
    })
    .flat();
}

/**
 * Calculate win percentage for a team
 */
function getWinPct(standing: EnhancedSeasonStandings): number {
  const totalGames = standing.wins + standing.losses + (standing.ties || 0);
  return totalGames > 0 ? (standing.wins + (standing.ties || 0) * 0.5) / totalGames : 0;
}

/**
 * Check if teams in a multi-way tie have equal aggregate H2H records
 * Returns true if all teams have the same H2H win percentage against the group
 */
function checkAggregateH2H(
  tiedTeams: EnhancedSeasonStandings[],
  matchupsByWeek?: Record<number, any[]>,
  year?: string
): { isTied: boolean; records: Map<string, number>; winPcts?: Map<string, number> } {
  if (!matchupsByWeek || !year || !isActiveYear(year)) {
    return { isTied: true, records: new Map() };
  }

  // Calculate H2H wins and losses for each team against all other tied teams
  const h2hWins = new Map<string, number>();
  const h2hLosses = new Map<string, number>();
  const h2hWinPcts = new Map<string, number>();

  tiedTeams.forEach(team => {
    let wins = 0;
    let losses = 0;
    tiedTeams.forEach(opponent => {
      if (team.userId !== opponent.userId) {
        const h2h = getHeadToHeadRecord(team.userId, opponent.userId, matchupsByWeek, year);
        wins += h2h.team1Wins;
        losses += h2h.team2Wins;
      }
    });
    h2hWins.set(team.userId, wins);
    h2hLosses.set(team.userId, losses);

    // Calculate win percentage
    const totalGames = wins + losses;
    const winPct = totalGames > 0 ? wins / totalGames : 0;
    h2hWinPcts.set(team.userId, winPct);
  });

  // Check if all teams have the same H2H win percentage
  const winPctValues = Array.from(h2hWinPcts.values());
  const allEqual = winPctValues.every(pct => pct === winPctValues[0]);

  return { isTied: allEqual, records: h2hWins, winPcts: h2hWinPcts };
}

/**
 * Rank teams by record (no division logic)
 */
function rankByRecord(
  standings: EnhancedSeasonStandings[],
  matchupsByWeek?: Record<number, any[]>,
  year?: string
): EnhancedSeasonStandings[] {
  // Sort by record, handling multi-way ties
  const sortedStandings = sortWithTiebreakers(standings, matchupsByWeek, year);

  // Assign ranks, allowing for ties
  return assignRanks(sortedStandings, matchupsByWeek, year);
}

/**
 * Rank teams with division logic:
 * - Top 2 division leaders get seeds 1-2
 * - Remaining teams get seeds 3+ by record
 */
function rankWithDivisions(
  standings: EnhancedSeasonStandings[],
  matchupsByWeek?: Record<number, any[]>,
  year?: string
): EnhancedSeasonStandings[] {
  // Group by division
  const divisionMap = new Map<number, EnhancedSeasonStandings[]>();
  standings.forEach(standing => {
    const division = standing.division ?? 0;
    if (!divisionMap.has(division)) {
      divisionMap.set(division, []);
    }
    divisionMap.get(division)!.push(standing);
  });

  // Find division leaders (best record in each division)
  const divisionLeaders: EnhancedSeasonStandings[] = [];
  divisionMap.forEach(divisionTeams => {
    // Sort teams within division by record using proper tiebreakers
    const sortedDivision = sortWithTiebreakers(divisionTeams, matchupsByWeek, year);
    // First team is the division leader
    if (sortedDivision.length > 0) {
      divisionLeaders.push(sortedDivision[0]);
    }
  });

  // Sort division leaders by record using proper tiebreakers
  const sortedDivisionLeaders = sortWithTiebreakers(divisionLeaders, matchupsByWeek, year);

  // Top 2 division leaders get seeds 1-2
  const top2Leaders = sortedDivisionLeaders.slice(0, 2);
  const thirdLeader = sortedDivisionLeaders[2]; // 3rd division leader (if exists)

  // Everyone else (non-top-2-leaders)
  const divisionLeaderIds = new Set(top2Leaders.map(leader => leader.userId));
  const otherTeams = standings.filter(standing => !divisionLeaderIds.has(standing.userId));

  // Sort other teams by record using proper tiebreakers
  const sortedOtherTeams = sortWithTiebreakers(otherTeams, matchupsByWeek, year);

  // Combine: top 2 leaders first, then everyone else
  let finalOrder = [...top2Leaders, ...sortedOtherTeams];

  // Special case: If 3rd division leader is ranked 7th or worse, bump them to 6th
  if (thirdLeader) {
    const thirdLeaderIndex = finalOrder.findIndex(team => team.userId === thirdLeader.userId);

    if (thirdLeaderIndex >= 6) { // 7th position or worse (0-indexed, so 6+)
      // Remove 3rd leader from their current position
      finalOrder.splice(thirdLeaderIndex, 1);
      // Insert at position 6 (6th seed, index 5) and mark as bumped
      const bumpedLeader = { ...thirdLeader, isThirdDivisionLeaderBumped: true };
      finalOrder.splice(5, 0, bumpedLeader);
    }
  }

  // Assign ranks
  return assignRanks(finalOrder, matchupsByWeek, year);
}

/**
 * Assign rank numbers to sorted standings, allowing for ties
 */
function assignRanks(
  sortedStandings: EnhancedSeasonStandings[],
  matchupsByWeek?: Record<number, any[]>,
  year?: string
): EnhancedSeasonStandings[] {
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
      if (!isNotTied && year && isActiveYear(year) && matchupsByWeek) {
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

/**
 * Identify division leaders and top 2 division leaders
 * Used to determine tiebreaker context
 */
export function identifyDivisionLeaders(
  standings: EnhancedSeasonStandings[],
  matchupsByWeek?: Record<number, any[]>,
  year?: string
): {
  top2Leaders: Set<string>;
  allLeaders: Set<string>;
  firstDivisionLeader?: string;
  secondDivisionLeader?: string;
  thirdDivisionLeader?: string;
} {
  // Group by division
  const divisionMap = new Map<number, EnhancedSeasonStandings[]>();
  standings.forEach(standing => {
    const division = standing.division ?? 0;
    if (!divisionMap.has(division)) {
      divisionMap.set(division, []);
    }
    divisionMap.get(division)!.push(standing);
  });

  // Find division leaders (best record in each division)
  const divisionLeaders: EnhancedSeasonStandings[] = [];
  divisionMap.forEach(divisionTeams => {
    const sortedDivision = sortWithTiebreakers(divisionTeams, matchupsByWeek, year);
    if (sortedDivision.length > 0) {
      divisionLeaders.push(sortedDivision[0]);
    }
  });

  // Sort division leaders by record
  const sortedDivisionLeaders = sortWithTiebreakers(divisionLeaders, matchupsByWeek, year);

  // Top 2 leaders
  const top2Leaders = sortedDivisionLeaders.slice(0, 2);

  return {
    top2Leaders: new Set(top2Leaders.map(leader => leader.userId)),
    allLeaders: new Set(divisionLeaders.map(leader => leader.userId)),
    firstDivisionLeader: sortedDivisionLeaders[0]?.userId,
    secondDivisionLeader: sortedDivisionLeaders[1]?.userId,
    thirdDivisionLeader: sortedDivisionLeaders[2]?.userId
  };
}

/**
 * Get tiebreaker information for a team to display in tooltips
 * Returns null if team is not tied with any other teams
 * Two-tier approach:
 *  1. Division leaders (seeds 1-2): show tiebreakers vs other division leaders
 *  2. Everyone else (seeds 3-12): show tiebreakers vs all other non-leaders, regardless of division
 */
export function getTiebreakerInfo(
  standings: EnhancedSeasonStandings[],
  currentIndex: number,
  matchupsByWeek?: Record<number, any[]>,
  year?: string
): TiebreakerInfo | null {
  if (!year || !isActiveYear(year) || !matchupsByWeek) {
    return null;
  }

  const currentStanding = standings[currentIndex];
  const currentWinPct = getWinPct(currentStanding);

  // Check if we have divisions
  const hasDivisions = standings.some(s => s.division !== undefined && s.division !== null);

  if (!hasDivisions) {
    // No divisions: compare with all teams at same win percentage
    const tiedTeams = standings.filter((standing, idx) =>
      idx !== currentIndex && getWinPct(standing) === currentWinPct
    );

    if (tiedTeams.length === 0) return null;

    const layer = buildTiebreakerLayer(currentStanding, tiedTeams, matchupsByWeek, year, 'wild-card');
    return layer ? { layers: [layer] } : null;
  }

  // With divisions: two-tier approach with potential multiple layers
  const leaders = identifyDivisionLeaders(standings, matchupsByWeek, year);
  const isCurrentTeamTop2Leader = leaders.top2Leaders.has(currentStanding.userId);
  const isCurrentTeamDivisionLeader = leaders.allLeaders.has(currentStanding.userId);

  const layers: TiebreakerLayer[] = [];

  // Check if team is a division leader (any rank)
  if (isCurrentTeamDivisionLeader) {
    // First, check against all other division leaders with same record
    const otherDivisionLeadersTied = standings.filter((standing, idx) =>
      idx !== currentIndex &&
      leaders.allLeaders.has(standing.userId) &&
      getWinPct(standing) === currentWinPct
    );

    if (otherDivisionLeadersTied.length > 0) {
      // Show how this team ranks among division leaders
      const layer = buildTiebreakerLayer(currentStanding, otherDivisionLeadersTied, matchupsByWeek, year, 'division-leaders');
      if (layer) layers.push(layer);
    }
  }

  // If not a top 2 leader, also check against seeds 3-12 pool
  if (!isCurrentTeamTop2Leader) {
    let otherNonTop2Tied = standings.filter((standing, idx) =>
      idx !== currentIndex &&
      !leaders.top2Leaders.has(standing.userId) &&
      getWinPct(standing) === currentWinPct
    );

    // Check if there's a bumped 3rd division leader in this group
    const bumpedThirdLeader = otherNonTop2Tied.find(s => s.isThirdDivisionLeaderBumped);
    const isCurrentTeamBumpedLeader = currentStanding.isThirdDivisionLeaderBumped;

    // If current team IS the bumped 3rd leader, only show division tiebreaker
    if (isCurrentTeamBumpedLeader) {
      const divisionTeamsTied = otherNonTop2Tied.filter(s => s.division === currentStanding.division);
      if (divisionTeamsTied.length > 0) {
        const divisionLayer = buildTiebreakerLayer(
          currentStanding,
          divisionTeamsTied,
          matchupsByWeek,
          year,
          'division-leaders'
        );
        if (divisionLayer) layers.push(divisionLayer);
      }
      // Don't show cross-division layer for the bumped leader
      return layers.length > 0 ? { layers } : null;
    }

    // If current team is in same division as bumped 3rd leader, show division tiebreaker first
    if (bumpedThirdLeader && currentStanding.division === bumpedThirdLeader.division) {
      // Layer 1: Show division-only tiebreaker to explain who won the division
      const divisionTeamsTied = otherNonTop2Tied.filter(s => s.division === currentStanding.division);
      if (divisionTeamsTied.length > 0) {
        const divisionLayer = buildTiebreakerLayer(
          currentStanding,
          divisionTeamsTied,
          matchupsByWeek,
          year,
          'division-leaders' // Mark as division-specific
        );
        if (divisionLayer) layers.push(divisionLayer);
      }
    }

    // Layer 2 (or only layer): Cross-division tiebreaker
    // Always show all tied teams (including bumped 3rd leader if present)
    if (otherNonTop2Tied.length > 0) {
      const layer = buildTiebreakerLayer(currentStanding, otherNonTop2Tied, matchupsByWeek, year, 'wild-card');
      if (layer) layers.push(layer);
    }
  }

  return layers.length > 0 ? { layers } : null;
}

/**
 * Build a single tiebreaker layer from a list of tied teams
 */
function buildTiebreakerLayer(
  currentStanding: EnhancedSeasonStandings,
  tiedTeams: EnhancedSeasonStandings[],
  matchupsByWeek: Record<number, any[]>,
  year: string,
  context: 'division-leaders' | 'wild-card'
): TiebreakerLayer | null {
  if (tiedTeams.length === 0) return null;

  // Check if there's a bumped 3rd division leader in this group
  const allTeamsInGroup = [currentStanding, ...tiedTeams];
  const bumpedLeader = allTeamsInGroup.find(t => t.isThirdDivisionLeaderBumped);
  const hasBumpedThirdLeader = !!bumpedLeader;
  const bumpedThirdLeaderName = bumpedLeader
    ? getDisplayTeamName(bumpedLeader.userId, bumpedLeader.userInfo.teamName, year)
    : undefined;

  // Build individual H2H records against each tied team
  const h2hRecords: string[] = [];
  let totalGames = 0;

  tiedTeams.forEach(tiedTeam => {
    const h2h = getHeadToHeadRecord(currentStanding.userId, tiedTeam.userId, matchupsByWeek, year);
    totalGames += h2h.totalGames;

    if (h2h.totalGames > 0) {
      const teamName = getDisplayTeamName(tiedTeam.userId, tiedTeam.userInfo.teamName, year);
      h2hRecords.push(`${h2h.team1Wins}-${h2h.team2Wins} vs ${teamName}`);
    }
  });

  if (h2hRecords.length > 0) {
    // Check aggregate H2H among all tied teams (including current team)
    const allTiedTeams = [currentStanding, ...tiedTeams];
    const aggregateH2H = checkAggregateH2H(allTiedTeams, matchupsByWeek, year);
    const currentH2hWinPct = aggregateH2H.winPcts?.get(currentStanding.userId) ?? 0;

    // Get the tied record (e.g., "6-6")
    const tiedRecord = `${currentStanding.wins}-${currentStanding.losses}${currentStanding.ties ? `-${currentStanding.ties}` : ''}`;

    // Build summary of all teams' H2H records for display
    const allTeamsH2H: TeamH2HSummary[] = allTiedTeams
      .map(team => {
        const teamWinPct = aggregateH2H.winPcts?.get(team.userId) ?? 0;
        const teamWins = aggregateH2H.records?.get(team.userId) ?? 0;

        // Calculate losses from win percentage and wins
        let teamLosses = 0;
        if (teamWinPct < 1 && teamWins > 0) {
          teamLosses = Math.round(teamWins / teamWinPct - teamWins);
        } else if (teamWinPct === 0) {
          // Count losses directly for 0% win rate
          let losses = 0;
          allTiedTeams.forEach(opponent => {
            if (team.userId !== opponent.userId) {
              const h2h = getHeadToHeadRecord(team.userId, opponent.userId, matchupsByWeek, year);
              losses += h2h.team2Wins;
            }
          });
          teamLosses = losses;
        }

        return {
          teamName: getDisplayTeamName(team.userId, team.userInfo.teamName, year),
          userId: team.userId,
          h2hWinPct: teamWinPct,
          h2hRecord: `${teamWins}-${teamLosses}`,
          pointsFor: team.pointsFor,
          isCurrentTeam: team.userId === currentStanding.userId,
          isBumpedThirdLeader: team.isThirdDivisionLeaderBumped
        };
      })
      .sort((a, b) => {
        // Sort by H2H win% desc, then points for desc
        if (a.h2hWinPct !== b.h2hWinPct) return b.h2hWinPct - a.h2hWinPct;
        return b.pointsFor - a.pointsFor;
      });

    if (aggregateH2H.isTied) {
      // All teams have equal H2H win% against each other, use points for
      return {
        context,
        h2hRecords,
        allTeamsH2H,
        tiedRecord,
        h2hWinPct: currentH2hWinPct,
        usesPointsFor: true,
        pointsFor: currentStanding.pointsFor,
        hasBumpedThirdLeader,
        bumpedThirdLeaderName
      };
    } else {
      // H2H distinguishes some teams, but check if current team is tied with anyone
      // Check if any other team has the same H2H win% as current team
      const teamsWithSameH2hWinPct = allTiedTeams.filter(team => {
        const teamWinPct = aggregateH2H.winPcts?.get(team.userId) ?? 0;
        return team.userId !== currentStanding.userId && teamWinPct === currentH2hWinPct;
      });

      if (teamsWithSameH2hWinPct.length > 0) {
        // Current team is tied with at least one other team on H2H win%, use points for
        return {
          context,
          h2hRecords,
          allTeamsH2H,
          tiedRecord,
          h2hWinPct: currentH2hWinPct,
          usesPointsFor: true,
          pointsFor: currentStanding.pointsFor,
          hasBumpedThirdLeader,
          bumpedThirdLeaderName
        };
      } else {
        // Current team's H2H win% is unique, don't use points for
        return {
          context,
          h2hRecords,
          allTeamsH2H,
          tiedRecord,
          h2hWinPct: currentH2hWinPct,
          usesPointsFor: false,
          hasBumpedThirdLeader,
          bumpedThirdLeaderName
        };
      }
    }
  }

  // No H2H games played, use points for as tiebreaker
  return { context, h2hRecords: [], usesPointsFor: true, pointsFor: currentStanding.pointsFor };
}

/**
 * Get division name for display
 */
export function getDivisionName(divisionNumber: number, customNames?: Record<number, string>): string {
  // Use custom name if provided, otherwise default to "Division N"
  if (customNames && customNames[divisionNumber]) {
    return customNames[divisionNumber];
  }

  const divisionNames: Record<number, string> = {
    1: 'Division 1',
    2: 'Division 2',
    3: 'Division 3',
    4: 'Division 4'
  };
  return divisionNames[divisionNumber] || `Division ${divisionNumber}`;
}

/**
 * Group standings by division (Sleeper era only, 2021+)
 * Returns null if no division data is present
 * Identifies division leaders (best record in each division)
 */
export function groupStandingsByDivision(
  standings: EnhancedSeasonStandings[],
  divisionNames?: Record<number, string>
): DivisionGroup[] | null {
  // Check if any standings have division data
  const hasDivisions = standings.some(s => s.division !== undefined && s.division !== null);

  if (!hasDivisions) {
    return null; // No divisions, return null to indicate single-table display
  }

  // Group by division
  const divisionMap = new Map<number, EnhancedSeasonStandings[]>();

  standings.forEach(standing => {
    const division = standing.division ?? 0; // Default to 0 if undefined
    if (!divisionMap.has(division)) {
      divisionMap.set(division, []);
    }
    divisionMap.get(division)!.push(standing);
  });

  // Convert to array and sort divisions
  const divisions = Array.from(divisionMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([division, divisionStandings]) => {
      // Sort teams within division by overall rank for display
      const sortedByRank = [...divisionStandings].sort((a, b) => a.rank - b.rank);
      const leader = sortedByRank[0];

      return {
        division,
        name: getDivisionName(division, divisionNames),
        standings: sortedByRank, // Use sorted standings for display
        leader
      };
    });

  return divisions;
}